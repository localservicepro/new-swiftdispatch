import React, { useState } from "react";
import { useApp } from "../store/store";
import { useUi } from "../store/ui";
import { patchBusiness, patchEmailSetting, patchIntegration } from "../data/api";
import { Alert, Badge, Button, Card, Icon, Input, Switch, Tabs, Textarea } from "../design-system/components.js";
import MyobSettings from "./MyobSettings";

/* MYOB is not a generic connector — it has its own panel below, because the
   office configures the coding and the line wording, not just an API key. */
const INTEGRATION_META = [
  {
    key: "mycrmsim",
    name: "MyCRMSim",
    icon: "users",
    iconColor: "var(--brand-primary)",
    what: "Keeps customers and contacts in step with your CRM",
    accountLabel: "CRM workspace",
    connectHint: "Connect MyCRMSim to stop keeping two customer lists by hand.",
    syncLabel: "Two-way customer sync",
    syncHint: "New customers and contact changes flow both ways.",
    fields: [
      { label: "Workspace ID", key: "field_a" },
      { label: "API key", key: "field_b" },
    ],
    fieldHint: "Found under Settings › Developer in MyCRMSim.",
  },
  {
    key: "sheets",
    name: "Google Sheets",
    icon: "file-text",
    iconColor: "var(--feedback-success)",
    what: "Syncs orders to a spreadsheet automatically",
    accountLabel: "Google account",
    connectHint: "Connect a Google account to mirror orders into a sheet.",
    syncLabel: "Auto-sync orders",
    syncHint: "Runs whenever an order is created or updated.",
    fields: [
      { label: "Spreadsheet ID", key: "field_a" },
      { label: "Sheet tab name", key: "field_b" },
    ],
    fieldHint: "The spreadsheet ID sits in the Sheets URL between /d/ and /edit.",
  },
];

const EMAIL_META: Record<string, { label: string; hint: string }> = {
  confirm: { label: "Order confirmation", hint: "Sent when an order is created." },
  status: { label: "Delivery status update", hint: "Sent when an order goes en route." },
  receipt: { label: "Yard sale receipt", hint: "Emailed if the customer at the counter asks for one." },
  pin: { label: "Portal PIN", hint: "Sent when a customer resets their portal PIN." },
  statement: { label: "Monthly statement", hint: "Sent to the accounts contact on each account." },
};

export default function Settings() {
  const ui = useUi();
  const { business, integrations, emails, user, myob } = useApp();
  const [tab, setTab] = useState<"business" | "integrations" | "email">("business");
  const [saved, setSaved] = useState("");
  const [biz, setBiz] = useState<Record<string, string> | null>(null);

  if (!business) return null;
  const b = { ...business, ...(biz || {}) } as any;
  const setB = (patch: Record<string, string>) => setBiz((d) => ({ ...(d || {}), ...patch }));

  const connectedCount =
    integrations.filter((i) => i.key !== "myob" && i.connected).length + (myob?.enabled ? 1 : 0);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12, maxWidth: 1100 }}>
      <Tabs
        items={[
          { id: "business", label: "Business" },
          { id: "integrations", label: "Integrations", count: connectedCount },
          { id: "email", label: "Email" },
        ]}
        activeId={tab}
        onSelect={(id: string) => {
          setTab(id as any);
          setSaved("");
        }}
        variant="underline"
      />

      {saved && (
        <Alert tone="success" title={saved}>
          Nothing else changed.
        </Alert>
      )}

      {tab === "business" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <Card title="Business profile" subtitle="Printed on every docket, invoice and statement" padding="default">
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(240px,1fr))", gap: 10 }}>
                <Input label="Business name" value={b.name || ""} onChange={(e: any) => setB({ name: e.target.value })} />
                <Input label="Business email" value={b.email || ""} onChange={(e: any) => setB({ email: e.target.value })} />
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(240px,1fr))", gap: 10 }}>
                <Input label="Phone number" value={b.phone || ""} onChange={(e: any) => setB({ phone: e.target.value })} />
                <Input label="Website" value={b.website || ""} onChange={(e: any) => setB({ website: e.target.value })} />
              </div>
              <Textarea label="Business address" value={b.address || ""} onChange={(v: any) => setB({ address: typeof v === "string" ? v : v.target.value })} rows={3} />
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(200px,1fr))", gap: 10 }}>
                <Input label="ABN" value={b.abn || ""} onChange={(e: any) => setB({ abn: e.target.value })} />
                <Input label="Trading hours" value={b.hours || ""} onChange={(e: any) => setB({ hours: e.target.value })} />
              </div>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                <Button
                  variant="primary"
                  size="md"
                  iconLeft="file-check"
                  onClick={() => {
                    if (biz) patchBusiness(biz);
                    setBiz(null);
                    setSaved("Business information saved");
                  }}
                >
                  Save business information
                </Button>
              </div>
            </div>
          </Card>

          <Card title="Documents" subtitle="How order numbers and paperwork read" padding="default">
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(200px,1fr))", gap: 10 }}>
                <Input size="sm" label="Order number format" value={b.doc_format || ""} onChange={(e: any) => setB({ doc_format: e.target.value })} />
                <Input size="sm" label="Master order prefix" value={b.master_prefix || ""} onChange={(e: any) => setB({ master_prefix: e.target.value })} />
              </div>
              <div style={{ fontSize: 11, color: "var(--text-faint)", textWrap: "pretty" as any }}>
                A split order reads "{(b.master_prefix || "MO — ") + "ORD-531082"}" with children ORD-531082-A and -B.
              </div>
              <Switch
                checked={b.print_delivery_notes}
                onChange={(v: boolean) => {
                  setB({ print_delivery_notes: v as any });
                  patchBusiness({ print_delivery_notes: v });
                }}
                label="Print delivery notes on the run sheet"
              />
              <div style={{ fontSize: 11, color: "var(--text-faint)", textWrap: "pretty" as any }}>
                Gate codes and drop points reach the driver. Order notes stay on the invoice.
              </div>
            </div>
          </Card>

          <Card title="Statement payment details" subtitle="Printed at the foot of every statement" padding="default">
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(200px,1fr))", gap: 10 }}>
                <Input size="sm" label="Bank" value={b.bank_name || ""} placeholder="NAB" onChange={(e: any) => setB({ bank_name: e.target.value })} />
                <Input size="sm" label="Account name" value={b.bank_account_name || ""} onChange={(e: any) => setB({ bank_account_name: e.target.value })} />
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(200px,1fr))", gap: 10 }}>
                <Input size="sm" label="BSB" value={b.bank_bsb || ""} placeholder="083 153" onChange={(e: any) => setB({ bank_bsb: e.target.value })} />
                <Input size="sm" label="Account number" value={b.bank_account_no || ""} onChange={(e: any) => setB({ bank_account_no: e.target.value })} />
              </div>
              <Input
                size="sm"
                label="Payment reference note"
                value={b.payment_reference_note || ""}
                onChange={(e: any) => setB({ payment_reference_note: e.target.value })}
              />
              <Input
                size="sm"
                label="Card surcharge note"
                value={b.card_surcharge_note || ""}
                onChange={(e: any) => setB({ card_surcharge_note: e.target.value })}
              />
              <div style={{ fontSize: 11, color: "var(--text-faint)", textWrap: "pretty" as any }}>
                Leave a field blank and it drops off the statement rather than printing an empty label. Save with the
                button above.
              </div>
            </div>
          </Card>

          <Card title="Where the rest lives" padding="default">
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {[
                { label: "GST and rounding", why: "a payment rule — Payments › Settings", icon: "credit-card", go: "payments" },
                { label: "Statement run and terms", why: "Payments › Settings", icon: "file-text", go: "payments" },
                { label: "Team and access", why: "Operate › Team", icon: "users-round", go: "team" },
                { label: "Suburbs and delivery rates", why: "Operate › Suburbs", icon: "map-pin", go: "suburbs" },
              ].map((m) => (
                <div key={m.label} onClick={() => ui.navigateTo(m.go)} style={{ cursor: "pointer", display: "flex", alignItems: "center", gap: 9, padding: "8px 10px", borderRadius: 8, background: "var(--surface-raised)" }}>
                  <Icon name={m.icon} size={13} color="var(--text-faint)" />
                  <span style={{ fontSize: 13, color: "var(--text-primary)" }}>{m.label}</span>
                  <span style={{ flex: 1, minWidth: 0, fontSize: 11, color: "var(--text-faint)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{m.why}</span>
                  <Icon name="arrow-right" size={12} color="var(--brand-primary)" />
                </div>
              ))}
            </div>
          </Card>
        </div>
      )}

      {tab === "integrations" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <MyobSettings onSaved={setSaved} />
          {INTEGRATION_META.map((meta) => {
            const s = integrations.find((i) => i.key === meta.key);
            if (!s) return null;
            return (
              <Card key={meta.key} padding="none">
                <div style={{ display: "flex", flexDirection: "column" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap", padding: "13px 16px", borderBottom: "1px solid var(--border-subtle)" }}>
                    <Icon name={meta.icon} size={15} color={meta.iconColor} />
                    <div style={{ flex: "1 1 200px", minWidth: 0 }}>
                      <div style={{ fontSize: 14, fontWeight: 600, color: "var(--text-primary)" }}>{meta.name}</div>
                      <div style={{ fontSize: 11, color: "var(--text-faint)" }}>{meta.what}</div>
                    </div>
                    <Badge tone={s.connected ? "success" : "neutral"} icon={s.connected ? "badge-check" : "circle"}>
                      {s.connected ? "Connected" : "Not connected"}
                    </Badge>
                  </div>

                  <div style={{ padding: "14px 16px", display: "flex", flexDirection: "column", gap: 10 }}>
                    {s.connected ? (
                      <>
                        <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap", padding: "9px 11px", borderRadius: 8, background: "var(--surface-raised)" }}>
                          <div style={{ flex: "1 1 180px", minWidth: 0 }}>
                            <div style={{ fontSize: 12, fontWeight: 600, color: "var(--text-primary)" }}>{meta.accountLabel}</div>
                            <div style={{ fontSize: 11, color: "var(--text-faint)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{s.account || "—"}</div>
                          </div>
                          <Button variant="outline" size="sm" iconLeft="log-out" onClick={() => patchIntegration(meta.key, { connected: false, account: null, auto_sync: false })}>
                            Disconnect
                          </Button>
                        </div>

                        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(220px,1fr))", gap: 10 }}>
                          {meta.fields.map((fl) => (
                            <Input
                              key={fl.key}
                              size="sm"
                              label={fl.label}
                              value={(s as any)[fl.key] || ""}
                              onChange={(e: any) => patchIntegration(meta.key, { [fl.key]: e.target.value })}
                            />
                          ))}
                        </div>
                        {"fieldHint" in meta && meta.fieldHint && (
                          <div style={{ fontSize: 11, color: "var(--text-faint)" }}>{meta.fieldHint}</div>
                        )}

                        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 10, flexWrap: "wrap", paddingTop: 4, borderTop: "1px solid var(--border-subtle)" }}>
                          <div style={{ flex: "1 1 220px", minWidth: 0 }}>
                            <div style={{ fontSize: 13, color: "var(--text-primary)" }}>{meta.syncLabel}</div>
                            <div style={{ fontSize: 11, color: "var(--text-faint)", textWrap: "pretty" as any }}>{meta.syncHint}</div>
                          </div>
                          <Switch checked={s.auto_sync} onChange={(v: boolean) => patchIntegration(meta.key, { auto_sync: v })} />
                        </div>

                        <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                          <span style={{ fontSize: 11, color: "var(--text-faint)" }}>
                            {s.last_synced ? "Last synced " + new Date(s.last_synced).toLocaleString("en-AU") : "Never synced"}
                          </span>
                          <div style={{ flex: 1 }} />
                          <Button variant="ghost" size="sm" iconLeft="repeat" onClick={() => setSaved(meta.name + " responded — connection is good")}>
                            Test connection
                          </Button>
                          <Button variant="primary" size="sm" iconLeft="file-check" onClick={() => setSaved(meta.name + " settings saved")}>
                            Save settings
                          </Button>
                        </div>
                      </>
                    ) : (
                      <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                        <div style={{ flex: "1 1 220px", minWidth: 0, fontSize: 12, color: "var(--text-muted)", textWrap: "pretty" as any }}>{meta.connectHint}</div>
                        <Button
                          variant="secondary"
                          size="sm"
                          iconLeft="link"
                          onClick={() => patchIntegration(meta.key, { connected: true, account: user?.name || "connected" })}
                        >
                          Connect
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {tab === "email" && (
        <Card title="Transactional email" subtitle="Sent automatically — nothing here is marketing" padding="default">
          <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            {emails.map((e) => {
              const meta = EMAIL_META[e.key];
              return (
                <div key={e.key} style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 0", borderBottom: "1px solid var(--border-subtle)" }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13, color: "var(--text-primary)" }}>{meta?.label || e.key}</div>
                    <div style={{ fontSize: 11, color: "var(--text-faint)", textWrap: "pretty" as any }}>{meta?.hint}</div>
                  </div>
                  <Switch checked={e.enabled} onChange={(v: boolean) => patchEmailSetting(e.key, v)} />
                </div>
              );
            })}
          </div>
        </Card>
      )}
    </div>
  );
}
