/* MYOB AccountRight bridge.

   Everything that needs a secret lives here: the OAuth2 refresh dance, the
   company-file token, and the actual writes to api.myob.com. The browser sends
   a request that has already been costed and worded by src/lib/myob.ts and
   never sees the client secret or the refresh token.

   Endpoints used (AccountRight API v2):
     POST https://secure.myob.com/oauth2/v1/authorize/   token + refresh
     GET  https://api.myob.com/accountright/             company file list
     GET  .../{cf}/GeneralLedger/{Account,Job,TaxCode}   code -> UID lookups
     GET  .../{cf}/Contact/Customer                      customer -> UID
     POST .../{cf}/Sale/{Invoice|Order}/{layout}         create a sale
     PUT  .../{cf}/Sale/Order/{layout}/{uid}             append a line to an
                                                         open order ("Use Sale")

   Company-file calls carry four headers: a bearer token, the developer key as
   x-myobapi-key, x-myobapi-version: v2, and the base64 company-file login as
   x-myobapi-cftoken. */

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";

const TOKEN_URL = "https://secure.myob.com/oauth2/v1/authorize/";
const API_ROOT = "https://api.myob.com/accountright";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const admin = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  { auth: { persistSession: false } },
);

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...CORS, "Content-Type": "application/json" } });

class MyobError extends Error {
  constructor(message: string, readonly status = 400) {
    super(message);
  }
}

interface Credentials {
  client_id: string | null;
  client_secret: string | null;
  refresh_token: string | null;
  access_token: string | null;
  access_token_expires_at: string | null;
  cf_token: string | null;
  redirect_uri: string | null;
}

async function loadCredentials(): Promise<Credentials> {
  const { data, error } = await admin.from("myob_credentials").select("*").eq("id", true).maybeSingle();
  if (error) throw new MyobError(`Could not read the stored MYOB credentials: ${error.message}`, 500);
  if (!data) throw new MyobError("MYOB has not been connected yet — add the developer key in Settings › Integrations.");
  return data as Credentials;
}

/* MYOB rotates the refresh token on every exchange, so the new one is written
   back immediately. Losing it means re-authorising by hand. */
async function exchange(creds: Credentials, form: Record<string, string>) {
  const res = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: creds.client_id || "",
      client_secret: creds.client_secret || "",
      ...form,
    }),
  });
  const text = await res.text();
  if (!res.ok) throw new MyobError(`MYOB refused the sign-in (${res.status}): ${text.slice(0, 400)}`, 502);
  const body = JSON.parse(text) as { access_token: string; refresh_token: string; expires_in: number };
  const expiresAt = new Date(Date.now() + (Number(body.expires_in) || 1200) * 1000).toISOString();
  await admin
    .from("myob_credentials")
    .update({
      access_token: body.access_token,
      refresh_token: body.refresh_token || creds.refresh_token,
      access_token_expires_at: expiresAt,
      updated_at: new Date().toISOString(),
    })
    .eq("id", true);
  return { ...creds, access_token: body.access_token, refresh_token: body.refresh_token || creds.refresh_token, access_token_expires_at: expiresAt };
}

async function accessToken(creds: Credentials): Promise<Credentials> {
  if (!creds.client_id || !creds.client_secret)
    throw new MyobError("No MYOB developer key stored — add the API key and secret in Settings › Integrations.");
  const expires = creds.access_token_expires_at ? Date.parse(creds.access_token_expires_at) : 0;
  /* A minute of headroom: a token that expires mid-flight fails the push, not
     the refresh, and a failed push is the one thing this integration exists to
     avoid. */
  if (creds.access_token && expires > Date.now() + 60_000) return creds;
  if (!creds.refresh_token)
    throw new MyobError("MYOB sign-in has expired — reconnect in Settings › Integrations.");
  return exchange(creds, { refresh_token: creds.refresh_token, grant_type: "refresh_token" });
}

function cfHeaders(creds: Credentials) {
  return {
    Authorization: `Bearer ${creds.access_token}`,
    "x-myobapi-key": creds.client_id || "",
    "x-myobapi-version": "v2",
    "x-myobapi-cftoken": creds.cf_token || "",
    "Content-Type": "application/json",
    Accept: "application/json",
  };
}

async function myobFetch(creds: Credentials, url: string, init: RequestInit = {}) {
  const res = await fetch(url, { ...init, headers: { ...cfHeaders(creds), ...(init.headers || {}) } });
  if (res.status === 401)
    throw new MyobError("MYOB rejected the company-file login — check the file's user name and password.", 401);
  if (!res.ok) {
    const text = await res.text();
    let detail = text.slice(0, 600);
    try {
      const parsed = JSON.parse(text);
      const errs = parsed?.Errors || parsed?.errors;
      if (Array.isArray(errs) && errs.length)
        detail = errs.map((e: any) => [e.Name, e.Message, e.AdditionalDetails].filter(Boolean).join(": ")).join(" | ");
    } catch { /* keep the raw text */ }
    throw new MyobError(`MYOB returned ${res.status}: ${detail}`, 502);
  }
  if (res.status === 204) return { body: null, location: res.headers.get("Location") };
  const text = await res.text();
  return { body: text ? JSON.parse(text) : null, location: res.headers.get("Location") };
}

const cfBase = (cfId: string) => `${API_ROOT}/${cfId}`;

/* ---------- lookups ---------- */

const LOOKUPS: Record<string, { path: string; code: string; label: string }> = {
  accounts: { path: "GeneralLedger/Account", code: "DisplayID", label: "Name" },
  jobs: { path: "GeneralLedger/Job", code: "Number", label: "Name" },
  taxcodes: { path: "GeneralLedger/TaxCode", code: "Code", label: "Description" },
};

async function lookup(creds: Credentials, cfId: string, kind: string) {
  const meta = LOOKUPS[kind];
  if (!meta) throw new MyobError(`Unknown lookup "${kind}".`);
  const { body } = await myobFetch(creds, `${cfBase(cfId)}/${meta.path}?$top=1000`);
  const items = (body?.Items || []) as Record<string, unknown>[];
  return items.map((i) => ({
    uid: String(i.UID),
    code: String(i[meta.code] ?? ""),
    label: String(i[meta.label] ?? ""),
  }));
}

async function resolveByCode(
  creds: Credentials,
  cfId: string,
  kind: string,
  code: string | null,
  uid: string | null,
): Promise<string | null> {
  if (uid) return uid;
  if (!code) return null;
  const rows = await lookup(creds, cfId, kind);
  const hit = rows.find((r) => r.code.replace(/\s/g, "") === code.replace(/\s/g, ""));
  if (!hit) throw new MyobError(`No ${kind.replace(/s$/, "")} in the company file matches "${code}".`);
  return hit.uid;
}

const odataQuote = (s: string) => s.replace(/'/g, "''");

/* Customers are matched on the account number first — two "Smith"s are common,
   two account numbers are not — then on the exact company name. A near miss is
   left unresolved rather than guessed at: posting a sale to the wrong card is
   worse than not posting it. */
async function resolveCustomer(
  creds: Credentials,
  cfId: string,
  customer: { id: string | null; name: string; accountNumber: string | null; uid: string | null },
): Promise<string> {
  if (customer.uid) return customer.uid;
  const tries = [
    customer.accountNumber ? `DisplayID eq '${odataQuote(customer.accountNumber)}'` : null,
    `CompanyName eq '${odataQuote(customer.name)}'`,
    `LastName eq '${odataQuote(customer.name)}'`,
  ].filter(Boolean) as string[];

  for (const filter of tries) {
    const { body } = await myobFetch(creds, `${cfBase(cfId)}/Contact/Customer?$filter=${encodeURIComponent(filter)}`);
    const hit = (body?.Items || [])[0];
    if (hit?.UID) {
      if (customer.id) await admin.from("customers").update({ myob_uid: hit.UID }).eq("id", customer.id);
      return String(hit.UID);
    }
  }
  throw new MyobError(
    `No customer card in MYOB for "${customer.name}"${customer.accountNumber ? ` (account ${customer.accountNumber})` : ""}. Create the card in MYOB, then push again.`,
  );
}

/* ---------- pushing a sale ---------- */

interface PushLine {
  date: string;
  description: string;
  total: number;
}

interface PushRequest {
  orderId: string;
  orderNumber: string;
  docType: "order" | "invoice";
  layout: string;
  customer: { id: string | null; name: string; accountNumber: string | null; uid: string | null };
  date: string;
  poNumber: string | null;
  journalMemo: string;
  comment: string | null;
  isTaxInclusive: boolean;
  deliveryStatus: string;
  accountCode: string | null;
  accountUid: string | null;
  jobCode: string | null;
  jobUid: string | null;
  taxCode: string | null;
  taxCodeUid: string | null;
  lines: PushLine[];
}

const buildLine = (l: PushLine, accountUid: string, jobUid: string | null, taxUid: string | null) => ({
  Type: "Transaction",
  Date: l.date,
  Description: l.description,
  Account: { UID: accountUid },
  Total: Math.round(l.total * 100) / 100,
  ...(jobUid ? { Job: { UID: jobUid } } : {}),
  ...(taxUid ? { TaxCode: { UID: taxUid } } : {}),
});

/* The office keeps one open MYOB order per account and adds a line to it for
   every delivery in the month ("Use Sale" in the desktop client), converting it
   to an invoice at the end. Reproducing that means reading the open order back,
   appending, and PUTting the whole document with its RowVersion so MYOB can
   reject a concurrent edit rather than silently drop a line. */
async function appendToOpenOrder(
  creds: Credentials,
  cfId: string,
  req: PushRequest,
  customerUid: string,
  line: ReturnType<typeof buildLine>,
) {
  const filter = `Customer/UID eq guid'${customerUid}' and Status eq 'Open'`;
  const url = `${cfBase(cfId)}/Sale/Order/${req.layout}?$filter=${encodeURIComponent(filter)}&$orderby=Date desc`;
  const { body } = await myobFetch(creds, url);
  const open = (body?.Items || [])[0];
  if (!open) return null;

  const already = (open.Lines || []).some((l: any) => String(l.Description || "").startsWith(req.orderNumber));
  if (already)
    throw new MyobError(
      `Order ${req.orderNumber} is already a line on MYOB order ${open.Number}. Remove it there first if you meant to re-push it.`,
    );

  const doc = { ...open, Lines: [...(open.Lines || []), line] };
  await myobFetch(creds, `${cfBase(cfId)}/Sale/Order/${req.layout}/${open.UID}`, {
    method: "PUT",
    body: JSON.stringify(doc),
  });
  return { uid: String(open.UID), number: String(open.Number || ""), appended: true };
}

async function push(creds: Credentials, cfId: string, req: PushRequest) {
  const customerUid = await resolveCustomer(creds, cfId, req.customer);
  const accountUid = await resolveByCode(creds, cfId, "accounts", req.accountCode, req.accountUid);
  if (!accountUid) throw new MyobError("No income account is set for MYOB pushes.");
  const jobUid = await resolveByCode(creds, cfId, "jobs", req.jobCode, req.jobUid);
  const taxUid = await resolveByCode(creds, cfId, "taxcodes", req.taxCode, req.taxCodeUid);

  const lines = req.lines.map((l) => buildLine(l, accountUid, jobUid, taxUid));

  if (req.docType === "order") {
    const appended = await appendToOpenOrder(creds, cfId, req, customerUid, lines[0]);
    if (appended) return appended;
  }

  const doc = {
    Date: req.date,
    Customer: { UID: customerUid },
    ...(req.poNumber ? { CustomerPurchaseOrderNumber: req.poNumber } : {}),
    Lines: lines,
    IsTaxInclusive: req.isTaxInclusive,
    JournalMemo: req.journalMemo.slice(0, 255),
    DeliveryStatus: req.deliveryStatus,
    ...(req.comment ? { Comment: req.comment } : {}),
  };

  const kind = req.docType === "order" ? "Order" : "Invoice";
  const { location } = await myobFetch(creds, `${cfBase(cfId)}/Sale/${kind}/${req.layout}`, {
    method: "POST",
    body: JSON.stringify(doc),
  });
  if (!location) throw new MyobError("MYOB accepted the sale but did not say where it filed it.");

  /* The POST only hands back a URL; the human-readable invoice number needs one
     more read, and that number is what the office quotes on the phone. */
  const { body: created } = await myobFetch(creds, location);
  return { uid: String(created?.UID || location.split("/").pop()), number: String(created?.Number || ""), appended: false };
}

/* ---------- request handling ---------- */

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  if (req.method !== "POST") return json({ error: "POST only" }, 405);

  let payload: any;
  try {
    payload = await req.json();
  } catch {
    return json({ error: "Expected a JSON body." }, 400);
  }

  try {
    const action = String(payload.action || "");

    if (action === "save_credentials") {
      const patch: Record<string, unknown> = { updated_at: new Date().toISOString() };
      for (const k of ["client_id", "client_secret", "refresh_token", "cf_token", "redirect_uri"]) {
        if (payload[k] !== undefined && payload[k] !== "") patch[k] = payload[k];
      }
      /* A new key pair invalidates whatever access token we were holding. */
      if ("client_id" in patch || "client_secret" in patch || "refresh_token" in patch) {
        patch.access_token = null;
        patch.access_token_expires_at = null;
      }
      const { error } = await admin.from("myob_credentials").upsert({ id: true, ...patch });
      if (error) throw new MyobError(error.message, 500);
      return json({ ok: true });
    }

    if (action === "credential_state") {
      const c = await loadCredentials();
      /* Secrets never travel back to the browser — only whether they are set. */
      return json({
        hasKey: !!c.client_id && !!c.client_secret,
        hasRefreshToken: !!c.refresh_token,
        hasCompanyFileLogin: !!c.cf_token,
        redirectUri: c.redirect_uri,
        clientId: c.client_id,
      });
    }

    if (action === "authorize") {
      const creds = await loadCredentials();
      if (!payload.code) throw new MyobError("Paste the authorisation code from MYOB first.");
      await exchange(creds, {
        code: String(payload.code).trim(),
        redirect_uri: String(payload.redirect_uri || creds.redirect_uri || ""),
        scope: "CompanyFile",
        grant_type: "authorization_code",
      });
      return json({ ok: true });
    }

    if (action === "company_files") {
      const creds = await accessToken(await loadCredentials());
      const res = await fetch(API_ROOT, {
        headers: {
          Authorization: `Bearer ${creds.access_token}`,
          "x-myobapi-key": creds.client_id || "",
          "x-myobapi-version": "v2",
          Accept: "application/json",
        },
      });
      if (!res.ok) throw new MyobError(`MYOB returned ${res.status} listing company files.`, 502);
      const files = (await res.json()) as { Id: string; Name: string; Uri: string }[];
      return json({ files: files.map((f) => ({ id: f.Id, name: f.Name })) });
    }

    if (action === "lookup") {
      const creds = await accessToken(await loadCredentials());
      const { data: settings } = await admin.from("myob_settings").select("company_file_id").eq("id", true).maybeSingle();
      const cfId = payload.company_file_id || settings?.company_file_id;
      if (!cfId) throw new MyobError("Choose a company file first.");
      return json({ items: await lookup(creds, cfId, String(payload.kind)) });
    }

    if (action === "test") {
      const creds = await accessToken(await loadCredentials());
      const { data: settings } = await admin
        .from("myob_settings")
        .select("company_file_id, account_code, job_code, tax_code")
        .eq("id", true)
        .maybeSingle();
      if (!settings?.company_file_id) throw new MyobError("Choose a company file first.");
      const checks: { label: string; ok: boolean; detail: string }[] = [];
      for (const [kind, code, label] of [
        ["accounts", settings.account_code, "Income account"],
        ["jobs", settings.job_code, "Job"],
        ["taxcodes", settings.tax_code, "Tax code"],
      ] as const) {
        if (!code) {
          checks.push({ label, ok: false, detail: "not set" });
          continue;
        }
        try {
          await resolveByCode(creds, settings.company_file_id, kind, code, null);
          checks.push({ label, ok: true, detail: `${code} found` });
        } catch (e) {
          checks.push({ label, ok: false, detail: (e as Error).message });
        }
      }
      return json({ ok: checks.every((c) => c.ok), checks });
    }

    if (action === "push") {
      const creds = await accessToken(await loadCredentials());
      const { data: settings } = await admin
        .from("myob_settings")
        .select("company_file_id, enabled")
        .eq("id", true)
        .maybeSingle();
      if (!settings?.enabled) throw new MyobError("The MYOB connection is switched off.");
      if (!settings.company_file_id) throw new MyobError("Choose a company file first.");

      const requests = (Array.isArray(payload.requests) ? payload.requests : [payload.request]) as PushRequest[];
      const results: { orderId: string; ok: boolean; number?: string; uid?: string; error?: string }[] = [];

      /* Sequential on purpose: appending to one shared open order in parallel
         would have two pushes read the same RowVersion and one line would
         vanish. */
      for (const r of requests) {
        if (!r?.orderId) continue;
        try {
          const out = await push(creds, settings.company_file_id, r);
          await admin
            .from("orders")
            .update({
              myob_uid: out.uid,
              myob_doc_type: r.docType,
              myob_number: out.number,
              myob_pushed_at: new Date().toISOString(),
              myob_error: null,
            })
            .eq("id", r.orderId);
          results.push({ orderId: r.orderId, ok: true, number: out.number, uid: out.uid });
        } catch (e) {
          const message = (e as Error).message;
          await admin.from("orders").update({ myob_error: message }).eq("id", r.orderId);
          results.push({ orderId: r.orderId, ok: false, error: message });
        }
      }
      if (results.some((r) => r.ok))
        await admin.from("myob_settings").update({ last_pushed_at: new Date().toISOString() }).eq("id", true);
      return json({ results });
    }

    return json({ error: `Unknown action "${action}".` }, 400);
  } catch (e) {
    const err = e as MyobError;
    return json({ error: err.message || String(e) }, err.status || 500);
  }
});
