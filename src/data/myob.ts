/* Client side of the MYOB bridge. Settings live in a plain table the app reads
   and writes directly; anything needing the client secret goes through the
   myob-push edge function, which is the only thing holding it. */

import { supabase } from "../lib/supabase";
import { persist, useApp } from "../store/store";
import { buildPushRequest, type BuildContext, type MyobPushRequest, type MyobSettings } from "../lib/myob";
import type { Order } from "../lib/types";

const S = () => useApp.getState();

export interface MyobLookupItem {
  uid: string;
  code: string;
  label: string;
}

export interface MyobCredentialState {
  hasKey: boolean;
  hasRefreshToken: boolean;
  hasCompanyFileLogin: boolean;
  redirectUri: string | null;
  clientId: string | null;
}

async function call<T>(body: Record<string, unknown>): Promise<T> {
  const { data, error } = await supabase.functions.invoke("myob-push", { body });
  if (error) {
    /* The function reports the real MYOB message in the body; invoke() only
       surfaces the status, so dig the detail out before it is lost. */
    const detail = await readFunctionError(error);
    throw new Error(detail || error.message);
  }
  if (data && typeof data === "object" && "error" in (data as any)) throw new Error(String((data as any).error));
  return data as T;
}

async function readFunctionError(error: any): Promise<string | null> {
  try {
    const body = await error?.context?.json?.();
    if (body?.error) return String(body.error);
  } catch { /* fall through to the generic message */ }
  return null;
}

/* ---------- settings ---------- */

export async function loadMyobSettings(): Promise<MyobSettings | null> {
  const { data, error } = await supabase.from("myob_settings").select("*").eq("id", true).maybeSingle();
  if (error) return null;
  return (data as MyobSettings) || null;
}

export function patchMyobSettings(patch: Partial<MyobSettings>) {
  useApp.setState((s) => ({ myob: s.myob ? { ...s.myob, ...patch } : (patch as MyobSettings) }));
  persist(supabase.from("myob_settings").update(patch).eq("id", true), "the MYOB settings");
}

/* ---------- connection ---------- */

export const saveMyobCredentials = (creds: {
  client_id?: string;
  client_secret?: string;
  refresh_token?: string;
  cf_token?: string;
  redirect_uri?: string;
}) => call<{ ok: true }>({ action: "save_credentials", ...creds });

export const myobCredentialState = () => call<MyobCredentialState>({ action: "credential_state" });

export const authorizeMyob = (code: string, redirect_uri?: string) =>
  call<{ ok: true }>({ action: "authorize", code, redirect_uri });

export const myobCompanyFiles = () => call<{ files: { id: string; name: string }[] }>({ action: "company_files" });

export const myobLookup = (kind: "accounts" | "jobs" | "taxcodes", company_file_id?: string | null) =>
  call<{ items: MyobLookupItem[] }>({ action: "lookup", kind, company_file_id });

export const testMyob = () =>
  call<{ ok: boolean; checks: { label: string; ok: boolean; detail: string }[] }>({ action: "test" });

/* MYOB will only hand back an authorisation code to a URI registered against
   the developer key, so the office pastes theirs in and we build the link. */
export const myobAuthUrl = (clientId: string, redirectUri: string) =>
  "https://secure.myob.com/oauth2/account/authorize/?" +
  new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: "code",
    scope: "CompanyFile",
  }).toString();

/* ---------- pushing ---------- */

export interface PushResult {
  orderId: string;
  ok: boolean;
  number?: string;
  uid?: string;
  error?: string;
}

export async function pushOrdersToMyob(contexts: BuildContext[]): Promise<PushResult[]> {
  const requests: MyobPushRequest[] = contexts.map(buildPushRequest);
  if (!requests.length) return [];
  const app = S();

  let results: PushResult[];
  try {
    results = (await call<{ results: PushResult[] }>({ action: "push", requests })).results;
  } catch (e) {
    const message = String((e as Error).message);
    app.toast({ tone: "danger", title: "MYOB push failed", description: message });
    /* Nothing reached MYOB, so record why on each order rather than leaving the
       drawer showing a hopeful "not pushed yet". */
    useApp.setState((s) => ({
      orders: s.orders.map((o) =>
        requests.some((r) => r.orderId === o.id) ? { ...o, myob_error: message } : o
      ),
    }));
    return requests.map((r) => ({ orderId: r.orderId, ok: false, error: message }));
  }

  const now = new Date().toISOString();
  useApp.setState((s) => ({
    orders: s.orders.map((o) => {
      const r = results.find((x) => x.orderId === o.id);
      if (!r) return o;
      return r.ok
        ? ({ ...o, myob_uid: r.uid || null, myob_number: r.number || null, myob_pushed_at: now, myob_error: null } as Order)
        : ({ ...o, myob_error: r.error || "MYOB refused the sale." } as Order);
    }),
  }));

  const sent = results.filter((r) => r.ok);
  const failed = results.filter((r) => !r.ok);
  if (sent.length)
    app.toast({
      tone: "success",
      title: sent.length === 1 ? `Sent to MYOB as ${sent[0].number || "a new sale"}` : `${sent.length} orders sent to MYOB`,
      description: failed.length ? `${failed.length} could not be sent — see the order for why.` : undefined,
    });
  if (failed.length && !sent.length)
    app.toast({ tone: "danger", title: "MYOB would not take it", description: failed[0].error });
  return results;
}

/* Assemble the context a push needs from whatever the store already holds. */
export function pushContextFor(order: Order): BuildContext | null {
  const s = S();
  if (!s.myob) return null;
  return {
    order,
    items: s.orderItems[order.id] || [],
    products: s.products,
    suburbs: s.suburbs,
    customer: s.customers.find((c) => c.id === order.customer_id),
    paySettings: s.paySettings,
    settings: s.myob,
  };
}
