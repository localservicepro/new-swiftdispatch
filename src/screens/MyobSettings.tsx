/* Settings › Integrations › MYOB.

   The office sets this up once: which company file, which income account, job
   and tax code, whether a sale lands as an order or an invoice, what date it
   carries, and — the part they care most about — exactly how the line reads.
   The description preview below is rendered by the same code that builds the
   payload, so what they see here is what MYOB gets. */

import React, { useEffect, useMemo, useState } from "react";
import { useApp } from "../store/store";
import {
  authorizeMyob,
  myobAuthUrl,
  myobCompanyFiles,
  myobCredentialState,
  myobLookup,
  patchMyobSettings,
  saveMyobCredentials,
  testMyob,
  type MyobCredentialState,
  type MyobLookupItem,
} from "../data/myob";
import {
  DEFAULT_MYOB_SETTINGS,
  DELIVERY_STATUS_OPTIONS,
  DESCRIPTION_TOKENS,
  previewDescription,
  type MyobSettings as MyobSettingsRow,
} from "../lib/myob";
import { AUD, orderTotal } from "../lib/domain";
import type { Order } from "../lib/types";
import { Alert, Badge, Button, Card, Icon, Input, Select, Switch, Textarea } from "../design-system/components.js";

const SAMPLE_ORDER = {
  id: "sample",
  order_number: "331515",
  kind: "standard",
  status: "delivered",
  method: "delivery",
  street: "245 Springvale Road",
  suburb_id: null,
  delivery_fee: 45,
  fee_source: "manual",
  delivery_date: new Date().toISOString().slice(0, 10),
  placed_at: new Date().toISOString(),
  po_number: "AU46-340237.212",
  order_notes: "Leave beside the shed",
  adjustment_type: null,
  adjustment_value: null,
  fuel_surcharge: 5,
  walk_in_name: null,
  customer_id: null,
} as unknown as Order;

export default function MyobSettings({ onSaved }: { onSaved: (msg: string) => void }) {
  const { myob, orders, orderItems, products, suburbs, customers, paySettings } = useApp();
  const s: MyobSettingsRow = { ...DEFAULT_MYOB_SETTINGS, ...(myob || {}) };

  const [creds, setCreds] = useState<MyobCredentialState | null>(null);
  const [credDraft, setCredDraft] = useState<Record<string, string>>({});
  const [files, setFiles] = useState<{ id: string; name: string }[] | null>(null);
  const [lists, setLists] = useState<Record<string, MyobLookupItem[]>>({});
  const [busy, setBusy] = useState<string | null>(null);
  const [problem, setProblem] = useState<string | null>(null);
  const [checks, setChecks] = useState<{ label: string; ok: boolean; detail: string }[] | null>(null);
  const [cfUser, setCfUser] = useState("");
  const [cfPass, setCfPass] = useState("");
  const [authCode, setAuthCode] = useState("");

  useEffect(() => {
    myobCredentialState().then(setCreds).catch(() => setCreds(null));
  }, []);

  const run = async (key: string, fn: () => Promise<void>) => {
    setBusy(key);
    setProblem(null);
    try {
      await fn();
    } catch (e) {
      setProblem(String((e as Error).message));
    } finally {
      setBusy(null);
    }
  };

  /* Preview off the most recent real delivery when there is one — a template
     that reads well against invented data and badly against theirs is no use. */
  const sample = useMemo(() => {
    const real = [...orders]
      .filter((o) => o.kind !== "master" && (orderItems[o.id] || []).length > 0)
      .sort((a, b) => b.placed_at.localeCompare(a.placed_at))[0];
    const order = real || SAMPLE_ORDER;
    const items = real
      ? orderItems[real.id]
      : [{ id: "s1", order_id: "sample", product_id: "sp", variant_id: null, description: null, qty: 4, unit_price: 68, line_total: 272 }];
    const prods = real
      ? products
      : [{ id: "sp", sku: "SAND-WB", name: "White brick sand", category_id: null, unit: "m³", fractional: null, kind: "single", price: 68, stock: 10, image_url: null, active: true }];
    return {
      order,
      items: items as any,
      products: prods as any,
      suburbs,
      customer: real ? customers.find((c) => c.id === real.customer_id) : ({ name: "Surrey Hills Nursery", account_number: "10428" } as any),
      paySettings,
      settings: s,
      real: !!real,
    };
  }, [orders, orderItems, products, suburbs, customers, paySettings, myob]);

  const previewLine = previewDescription(sample as any);
  const previewTotal = sample.real
    ? orderTotal(sample.order, sample.items, suburbs, paySettings)
    : 322;

  const connected = !!creds?.hasKey && !!creds?.hasRefreshToken;
  const optionsFrom = (rows: MyobLookupItem[] | undefined) =>
    (rows || []).map((r) => ({ value: r.code, label: r.code + (r.label ? " — " + r.label : "") }));

  const loadList = (kind: "accounts" | "jobs" | "taxcodes") =>
    run(kind, async () => {
      const { items } = await myobLookup(kind, s.company_file_id);
      setLists((l) => ({ ...l, [kind]: items }));
    });

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      {problem && (
        <Alert tone="danger" title="MYOB could not do that" icon="circle-alert">
          {problem}
        </Alert>
      )}

      <Card padding="none">
        <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap", padding: "13px 16px", borderBottom: "1px solid var(--border-subtle)" }}>
          <Icon name="file-text" size={15} color="var(--brand-secondary)" />
          <div style={{ flex: "1 1 220px", minWidth: 0 }}>
            <div style={{ fontSize: 14, fontWeight: 600, color: "var(--text-primary)" }}>MYOB AccountRight</div>
            <div style={{ fontSize: 11, color: "var(--text-faint)" }}>
              Raises the sale in your company file so nobody re-keys a delivery twice
            </div>
          </div>
          <Badge tone={connected ? "success" : "neutral"} icon={connected ? "badge-check" : "circle"}>
            {connected ? "Signed in" : "Not connected"}
          </Badge>
          <Switch
            checked={s.enabled}
            onChange={(v: boolean) => patchMyobSettings({ enabled: v })}
            label={s.enabled ? "On" : "Off"}
          />
        </div>

        <div style={{ padding: "14px 16px", display: "flex", flexDirection: "column", gap: 14 }}>
          {/* ---- connection ---- */}
          <Section title="Connection" hint="From your MYOB developer key at my.myob.com.au/api">
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(220px,1fr))", gap: 10 }}>
              <Input
                size="sm"
                label="API key (client ID)"
                value={credDraft.client_id ?? creds?.clientId ?? ""}
                onChange={(e: any) => setCredDraft((d) => ({ ...d, client_id: e.target.value }))}
              />
              <Input
                size="sm"
                type="password"
                label={creds?.hasKey ? "API secret — stored" : "API secret"}
                value={credDraft.client_secret ?? ""}
                placeholder={creds?.hasKey ? "•••••••• leave blank to keep" : ""}
                onChange={(e: any) => setCredDraft((d) => ({ ...d, client_secret: e.target.value }))}
              />
              <Input
                size="sm"
                label="Redirect URI"
                value={credDraft.redirect_uri ?? creds?.redirectUri ?? ""}
                placeholder="https://…  exactly as registered"
                onChange={(e: any) => setCredDraft((d) => ({ ...d, redirect_uri: e.target.value }))}
              />
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(220px,1fr))", gap: 10 }}>
              <Input size="sm" label="Company file user name" value={cfUser} onChange={(e: any) => setCfUser(e.target.value)} />
              <Input
                size="sm"
                type="password"
                label={creds?.hasCompanyFileLogin ? "Company file password — stored" : "Company file password"}
                value={cfPass}
                onChange={(e: any) => setCfPass(e.target.value)}
              />
            </div>
            <div style={{ fontSize: 11, color: "var(--text-faint)", textWrap: "pretty" as any }}>
              The company file login is the one you type when opening the file in AccountRight. Leave the password blank
              if the file has none — the user name still has to match.
            </div>

            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              <Button
                variant="secondary"
                size="sm"
                iconLeft="file-check"
                disabled={busy === "creds"}
                onClick={() =>
                  run("creds", async () => {
                    const patch: Record<string, string> = { ...credDraft };
                    if (cfUser) patch.cf_token = btoa(`${cfUser}:${cfPass}`);
                    await saveMyobCredentials(patch);
                    setCredDraft({});
                    setCfPass("");
                    setCreds(await myobCredentialState());
                    onSaved("MYOB credentials saved");
                  })
                }
              >
                Save credentials
              </Button>
              {creds?.clientId && (creds?.redirectUri || credDraft.redirect_uri) && (
                <Button
                  variant="outline"
                  size="sm"
                  iconLeft="external-link"
                  onClick={() =>
                    window.open(myobAuthUrl(creds.clientId!, credDraft.redirect_uri || creds.redirectUri!), "_blank")
                  }
                >
                  Sign in to MYOB
                </Button>
              )}
            </div>

            {creds?.hasKey && !creds?.hasRefreshToken && (
              <div style={{ display: "flex", alignItems: "flex-end", gap: 8, flexWrap: "wrap" }}>
                <div style={{ flex: "1 1 240px", minWidth: 200 }}>
                  <Input
                    size="sm"
                    label="Authorisation code from MYOB"
                    value={authCode}
                    onChange={(e: any) => setAuthCode(e.target.value)}
                    placeholder="Paste the code MYOB sent back"
                  />
                </div>
                <Button
                  variant="primary"
                  size="sm"
                  iconLeft="key-round"
                  disabled={!authCode || busy === "auth"}
                  onClick={() =>
                    run("auth", async () => {
                      await authorizeMyob(authCode, credDraft.redirect_uri || creds?.redirectUri || undefined);
                      setAuthCode("");
                      setCreds(await myobCredentialState());
                      onSaved("Signed in to MYOB");
                    })
                  }
                >
                  Finish sign-in
                </Button>
              </div>
            )}
          </Section>

          {/* ---- company file ---- */}
          <Section title="Company file" hint="Which file the sales land in">
            <div style={{ display: "flex", alignItems: "flex-end", gap: 8, flexWrap: "wrap" }}>
              <div style={{ flex: "1 1 260px", minWidth: 200 }}>
                <Select
                  size="sm"
                  label="Company file"
                  options={(files || (s.company_file_id ? [{ id: s.company_file_id, name: s.company_file_name || s.company_file_id }] : [])).map((f) => ({
                    value: f.id,
                    label: f.name,
                  }))}
                  value={s.company_file_id || ""}
                  onChange={(e: any) => {
                    const f = (files || []).find((x) => x.id === e.target.value);
                    patchMyobSettings({ company_file_id: e.target.value || null, company_file_name: f?.name || null });
                  }}
                  allowUnset
                />
              </div>
              <Button
                variant="outline"
                size="sm"
                iconLeft="repeat"
                disabled={busy === "files"}
                onClick={() => run("files", async () => setFiles((await myobCompanyFiles()).files))}
              >
                {busy === "files" ? "Fetching…" : "Fetch files"}
              </Button>
            </div>
          </Section>

          {/* ---- coding ---- */}
          <Section title="Coding" hint="The account, job and tax code every line carries">
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(210px,1fr))", gap: 10 }}>
              <CodeField
                label="Income account"
                value={s.account_code || ""}
                options={optionsFrom(lists.accounts)}
                loading={busy === "accounts"}
                onLoad={() => loadList("accounts")}
                onChange={(v) => patchMyobSettings({ account_code: v || null, account_uid: null })}
              />
              <CodeField
                label="Job"
                value={s.job_code || ""}
                options={optionsFrom(lists.jobs)}
                loading={busy === "jobs"}
                onLoad={() => loadList("jobs")}
                onChange={(v) => patchMyobSettings({ job_code: v || null, job_uid: null })}
              />
              <CodeField
                label="Tax code"
                value={s.tax_code || ""}
                options={optionsFrom(lists.taxcodes)}
                loading={busy === "taxcodes"}
                onLoad={() => loadList("taxcodes")}
                onChange={(v) => patchMyobSettings({ tax_code: v || null, tax_code_uid: null })}
              />
            </div>
            <Switch
              checked={s.is_tax_inclusive}
              onChange={(v: boolean) => patchMyobSettings({ is_tax_inclusive: v })}
              label="Amounts include tax"
            />
            <div style={{ fontSize: 11, color: "var(--text-faint)", textWrap: "pretty" as any }}>
              {s.is_tax_inclusive
                ? `The ${AUD(previewTotal)} on the order goes across as the tax-inclusive line total, matching the docket.`
                : `MYOB will add ${s.tax_code || "tax"} on top of ${AUD(previewTotal)}, so the sale will read higher than the docket.`}
            </div>
          </Section>

          {/* ---- document ---- */}
          <Section title="Document" hint="What kind of sale, and what date it carries">
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(210px,1fr))", gap: 10 }}>
              <Select
                size="sm"
                label="Raise as"
                options={[
                  { value: "invoice", label: "Invoice — a finished sale" },
                  { value: "order", label: "Order — one line per delivery, invoiced later" },
                ]}
                value={s.push_as}
                onChange={(e: any) => patchMyobSettings({ push_as: e.target.value })}
              />
              <Select
                size="sm"
                label="Sale layout"
                options={[
                  { value: "Professional", label: "Professional" },
                  { value: "Service", label: "Service" },
                  { value: "Item", label: "Item" },
                ]}
                value={s.sale_layout}
                onChange={(e: any) => patchMyobSettings({ sale_layout: e.target.value })}
              />
              <Select
                size="sm"
                label="Delivery status"
                options={DELIVERY_STATUS_OPTIONS}
                value={s.delivery_status}
                onChange={(e: any) => patchMyobSettings({ delivery_status: e.target.value })}
              />
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(210px,1fr))", gap: 10 }}>
              <Select
                size="sm"
                label="Line date"
                options={[
                  { value: "delivery", label: "The delivery date" },
                  { value: "placed", label: "The date the order was placed" },
                ]}
                value={s.line_date_rule}
                onChange={(e: any) => patchMyobSettings({ line_date_rule: e.target.value })}
              />
              <Select
                size="sm"
                label="Sale date"
                options={[
                  { value: "delivery", label: "The delivery date" },
                  { value: "placed", label: "The date the order was placed" },
                  { value: "month_end", label: "End of the delivery month" },
                ]}
                value={s.header_date_rule}
                onChange={(e: any) => patchMyobSettings({ header_date_rule: e.target.value })}
              />
            </div>
            {s.push_as === "order" && (
              <Alert tone="info" title="Deliveries stack on one open order">
                A push looks for an open MYOB order on that customer's card and adds this delivery to it as another
                line, the same as picking Use Sale in AccountRight. If there isn't one it starts a new order. Convert it
                to an invoice in MYOB when the month closes.
              </Alert>
            )}
          </Section>

          {/* ---- description ---- */}
          <Section title="How the line reads" hint="The description accounts reconcile against the docket">
            <Textarea
              size="sm"
              label="Line description"
              value={s.description_template}
              onChange={(v: any) => patchMyobSettings({ description_template: typeof v === "string" ? v : v.target.value })}
              rows={2}
            />
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: 6,
                padding: "10px 12px",
                borderRadius: 8,
                background: "var(--surface-raised)",
                border: "1px solid var(--border-subtle)",
              }}
            >
              <div style={{ fontSize: 10, textTransform: "uppercase", letterSpacing: ".09em", color: "var(--text-faint)" }}>
                {sample.real ? "Preview — your most recent order" : "Preview — sample order"}
              </div>
              <div style={{ display: "flex", alignItems: "baseline", gap: 10, flexWrap: "wrap" }}>
                <span style={{ flex: "1 1 240px", minWidth: 0, fontFamily: "'JetBrains Mono',monospace", fontSize: 12, color: "var(--text-primary)", textWrap: "pretty" as any }}>
                  {previewLine || "— the template renders empty —"}
                </span>
                <span className="tabular" style={{ fontSize: 13, fontWeight: 600, color: "var(--text-primary)" }}>
                  {AUD(previewTotal)}
                </span>
              </div>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(230px,1fr))", gap: 4 }}>
              {DESCRIPTION_TOKENS.map((t) => (
                <div key={t.token} style={{ display: "flex", gap: 6, fontSize: 11, alignItems: "baseline" }}>
                  <code
                    onClick={() => patchMyobSettings({ description_template: s.description_template + t.token })}
                    title="Click to append"
                    style={{ cursor: "pointer", flexShrink: 0, fontFamily: "'JetBrains Mono',monospace", color: "var(--brand-primary)" }}
                  >
                    {t.token}
                  </code>
                  <span style={{ color: "var(--text-faint)", minWidth: 0, textWrap: "pretty" as any }}>{t.what}</span>
                </div>
              ))}
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(210px,1fr))", gap: 10 }}>
              <Input
                size="sm"
                label="Word for a delivery"
                value={s.delivery_word}
                onChange={(e: any) => patchMyobSettings({ delivery_word: e.target.value })}
              />
              <Input
                size="sm"
                label="Word for a yard pickup"
                value={s.pickup_word}
                onChange={(e: any) => patchMyobSettings({ pickup_word: e.target.value })}
              />
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(210px,1fr))", gap: 10 }}>
              <Input
                size="sm"
                label="Journal memo"
                value={s.journal_memo_template}
                onChange={(e: any) => patchMyobSettings({ journal_memo_template: e.target.value })}
              />
              <Input
                size="sm"
                label="Comment on the sale"
                value={s.terms_note || ""}
                placeholder="Optional — printed under the lines"
                onChange={(e: any) => patchMyobSettings({ terms_note: e.target.value || null })}
              />
            </div>
          </Section>

          {/* ---- automation & test ---- */}
          <Section title="Sending" hint="">
            <Switch
              checked={s.auto_push}
              onChange={(v: boolean) => patchMyobSettings({ auto_push: v })}
              label="Send a sale to MYOB as soon as it is finished"
            />
            <div style={{ fontSize: 11, color: "var(--text-faint)", textWrap: "pretty" as any }}>
              Finished means the goods have left the yard: a delivery once it is marked delivered, a pickup once it is
              collected, a yard sale the moment it is rung up. You can send any order by hand from its drawer at any
              time, whatever stage it is at.
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
              <span style={{ fontSize: 11, color: "var(--text-faint)" }}>
                {s.last_pushed_at ? "Last sent " + new Date(s.last_pushed_at).toLocaleString("en-AU") : "Nothing sent yet"}
              </span>
              <div style={{ flex: 1 }} />
              <Button
                variant="ghost"
                size="sm"
                iconLeft="repeat"
                disabled={busy === "test"}
                onClick={() =>
                  run("test", async () => {
                    const r = await testMyob();
                    setChecks(r.checks);
                    if (r.ok) onSaved("MYOB answered — the account, job and tax code all resolve");
                  })
                }
              >
                {busy === "test" ? "Testing…" : "Test connection"}
              </Button>
            </div>
            {checks && (
              <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                {checks.map((c) => (
                  <div key={c.label} style={{ display: "flex", alignItems: "baseline", gap: 7, fontSize: 12 }}>
                    <Icon
                      name={c.ok ? "badge-check" : "circle-alert"}
                      size={12}
                      color={c.ok ? "var(--feedback-success)" : "var(--feedback-danger)"}
                    />
                    <span style={{ color: "var(--text-primary)" }}>{c.label}</span>
                    <span style={{ minWidth: 0, color: "var(--text-faint)", textWrap: "pretty" as any }}>{c.detail}</span>
                  </div>
                ))}
              </div>
            )}
          </Section>
        </div>
      </Card>
    </div>
  );
}

function Section({ title, hint, children }: { title: string; hint: string; children: React.ReactNode }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 9, paddingTop: 4, borderTop: "1px solid var(--border-subtle)" }}>
      <div>
        <div style={{ fontSize: 12, fontWeight: 600, color: "var(--text-primary)" }}>{title}</div>
        {hint && <div style={{ fontSize: 11, color: "var(--text-faint)" }}>{hint}</div>}
      </div>
      {children}
    </div>
  );
}

/* A code the office already knows can simply be typed; the picker is there for
   when they don't, and only calls MYOB when asked. */
function CodeField({
  label,
  value,
  options,
  loading,
  onLoad,
  onChange,
}: {
  label: string;
  value: string;
  options: { value: string; label: string }[];
  loading: boolean;
  onLoad: () => void;
  onChange: (v: string) => void;
}) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
      {options.length ? (
        <Select size="sm" label={label} options={options} value={value} onChange={(e: any) => onChange(e.target.value)} allowUnset />
      ) : (
        <Input size="sm" label={label} value={value} onChange={(e: any) => onChange(e.target.value)} />
      )}
      <span
        onClick={loading ? undefined : onLoad}
        style={{ cursor: loading ? "default" : "pointer", fontSize: 10, color: "var(--brand-primary)" }}
      >
        {loading ? "Loading from MYOB…" : options.length ? "Refresh from MYOB" : "Pick from MYOB"}
      </span>
    </div>
  );
}
