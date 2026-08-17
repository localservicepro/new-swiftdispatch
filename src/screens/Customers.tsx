import React, { useState } from "react";
import { useApp } from "../store/store";
import { useUi } from "../store/ui";
import { AUD, AUD0, blockedState, customerBadgeType, dmy, orderTotal, suburbRate } from "../lib/domain";
import type { Customer } from "../lib/types";
import { applyCustomerImport, exportCustomersCsv, planCustomerImport, type ImportPlan } from "../data/customerIo";
import ImportPreview, { type PreviewRow } from "./ImportPreview";
import {
  addContact,
  addSite,
  createCustomer,
  generateStatement,
  genPin,
  monthLabel,
  patchCustomer,
  printStatement,
  removeContact,
  statementLines,
  statementMonths,
} from "../data/api";
import {
  AddressBlock,
  Alert,
  Badge,
  Button,
  Card,
  DataTable,
  Icon,
  Input,
  Select,
  StatCard,
  StatusBadge,
  Switch,
  Tabs,
} from "../design-system/components.js";

export default function Customers() {
  const ui = useUi();
  const app = useApp();
  const { customers, suburbs, orders, orderItems, statements, paySettings } = app;

  const [query, setQuery] = useState("");
  const fileRef = React.useRef<HTMLInputElement>(null);
  const [importPlan, setImportPlan] = useState<{ plan: ImportPlan; file: string } | null>(null);
  const [importing, setImporting] = useState(false);
  const [entityFilter, setEntityFilter] = useState("Everyone");
  const [billingFilter, setBillingFilter] = useState("All settlement");
  const [selected, setSelected] = useState<string[]>([]);
  const [newCustOpen, setNewCustOpen] = useState(false);
  const [statementModal, setStatementModal] = useState<{ month: string; scope: "all" | "delivered" } | null>(null);
  const [smsSent, setSmsSent] = useState<Record<string, string>>({});

  const cust = ui.custId ? customers.find((c) => c.id === ui.custId) || null : null;
  const cBlock = blockedState(cust);

  const q = query.trim().toLowerCase();
  const rows = customers
    .filter((c) => {
      if (entityFilter !== "Everyone" && c.entity !== entityFilter) return false;
      if (billingFilter === "Prepaid" && c.billing !== "prepaid") return false;
      if (billingFilter === "Account" && c.billing !== "account") return false;
      if (billingFilter === "Blocked only" && !blockedState(c).blocked) return false;
      if (!q) return true;
      return (c.name + " " + c.account_number + " " + c.contacts.map((x) => x.name + " " + (x.phone || "")).join(" "))
        .toLowerCase()
        .includes(q);
    })
    .map((c) => {
      const bl = blockedState(c);
      const ordersContact = c.contacts.find((x) => x.roles.includes("Orders")) || c.contacts[0];
      return {
        c,
        bl,
        contact: ordersContact?.name || "—",
        phone: ordersContact?.phone || "—",
        settle: c.billing === "account" ? `${c.terms_days} days account` : "Prepaid",
        credit: c.billing === "account" ? `${AUD0(Number(c.balance))} / ${AUD0(Number(c.credit_limit))}` : "—",
        state: bl.blocked ? "Blocked" : c.billing === "account" ? "Open" : "Prepaid",
        portal: c.billing !== "account" ? "—" : c.portal_enabled ? "Enabled" : "Off",
      };
    });

  const custOrders = cust ? orders.filter((o) => o.customer_id === cust.id && !o.deleted_at && o.kind !== "split") : [];
  const custStatements = cust ? statements.filter((s) => s.customer_id === cust.id) : [];

  const suburbName = (id: string | null) => suburbs.find((s) => s.id === id)?.name || "";

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      <Alert tone="info" title="Customer portal">
        Account customers can log in with a PIN to see their own orders and raise new ones. Orders they create land
        straight on the dispatch board.
      </Alert>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(190px,1fr))", gap: 10 }}>
        <StatCard label="Customers" value={String(customers.length)} icon="users" tone="neutral" />
        <StatCard label="On account" value={String(customers.filter((c) => c.billing === "account").length)} icon="credit-card" tone="info" />
        <StatCard label="Owing" value={AUD0(customers.reduce((t, c) => t + Number(c.balance), 0))} icon="wallet" tone="warning" />
        <StatCard label="Blocked" value={String(customers.filter((c) => blockedState(c).blocked).length)} icon="circle-alert" tone="danger" />
      </div>

      <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
        <div style={{ flex: "1 1 260px", minWidth: 220 }}>
          <Input size="sm" icon="search" placeholder="Name, trading name, contact, phone, account number" value={query} onChange={(e: any) => setQuery(e.target.value)} />
        </div>
        <Select size="sm" options={["Everyone", "Individual", "Sole trader", "Company"]} value={entityFilter} onChange={(e: any) => setEntityFilter(e.target.value)} style={{ width: 190, flexShrink: 0 }} />
        <Select size="sm" options={["All settlement", "Prepaid", "Account", "Blocked only"]} value={billingFilter} onChange={(e: any) => setBillingFilter(e.target.value)} style={{ width: 180, flexShrink: 0 }} />
        <Button variant="outline" size="sm" iconLeft="download" onClick={() => {
          const n = exportCustomersCsv();
          app.toast({ tone: "success", title: `${n} ${n === 1 ? "customer" : "customers"} exported`, description: "The file is also the template the importer reads." });
        }}>
          Export CSV
        </Button>
        <Button variant="outline" size="sm" iconLeft="upload" onClick={() => fileRef.current?.click()}>
          Import CSV
        </Button>
        <input
          ref={fileRef}
          type="file"
          accept=".csv,text/csv"
          style={{ display: "none" }}
          onChange={async (e) => {
            const file = e.target.files?.[0];
            e.target.value = "";
            if (!file) return;
            try {
              setImportPlan({ plan: planCustomerImport(await file.text()), file: file.name });
            } catch (err) {
              app.toast({ tone: "danger", title: "Could not read that file", description: String((err as Error).message) });
            }
          }}
        />
        <Button variant="primary" size="sm" iconLeft="plus" onClick={() => setNewCustOpen(true)}>
          Add customer
        </Button>
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap", padding: "8px 10px", borderRadius: 8, background: "var(--surface-raised)", border: "1px solid var(--border-subtle)" }}>
        <span style={{ fontSize: 12, color: "var(--text-muted)" }}>
          {selected.length ? `${selected.length} selected` : "Select account customers to enable the portal for a group at once."}
        </span>
        <div style={{ flex: 1 }} />
        <Button
          variant="outline"
          size="sm"
          iconLeft="key-round"
          disabled={selected.length === 0}
          onClick={() => {
            selected.forEach((id) => {
              const c = customers.find((x) => x.id === id);
              if (c && c.billing === "account")
                patchCustomer(id, { portal_enabled: true, portal_pin: c.portal_pin || genPin() });
            });
            setSelected([]);
          }}
        >
          Enable portal for selected
        </Button>
        <Button
          variant="ghost"
          size="sm"
          iconLeft="users"
          onClick={() =>
            customers
              .filter((c) => c.billing === "account")
              .forEach((c) => patchCustomer(c.id, { portal_enabled: true, portal_pin: c.portal_pin || genPin() }))
          }
        >
          Enable for all account customers
        </Button>
      </div>

      <div style={{ fontSize: 12, color: "var(--text-faint)", textWrap: "pretty" as any }}>
        Three separate things: <span style={{ color: "var(--text-muted)" }}>who they are</span> (a person or a business),{" "}
        <span style={{ color: "var(--text-muted)" }}>what they pay</span> (retail or trade pricing) and{" "}
        <span style={{ color: "var(--text-muted)" }}>how they settle</span> (prepaid, or an account with terms and a
        credit limit). A sole trader can be a person on trade pricing who prepays.
      </div>

      <Card padding="none">
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
            <thead>
              <tr style={{ borderBottom: "1px solid var(--border-subtle)" }}>
                <th style={{ width: 34, padding: "8px 6px" }} />
                {["Account", "Customer", "Who", "Pays", "Orders contact", "Phone", "Settles", "Credit used", "State", "Portal"].map((h, i) => (
                  <th key={h} style={{ textAlign: i === 7 ? "right" : "left", padding: "8px 10px", fontSize: 11, textTransform: "uppercase", letterSpacing: ".06em", color: "var(--text-faint)", whiteSpace: "nowrap" }}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map(({ c, contact, phone, settle, credit, state, portal }) => (
                <tr
                  key={c.id}
                  onClick={() => ui.set({ custId: c.id, custTab: "overview", drawerOpen: false })}
                  style={{ cursor: "pointer", borderBottom: "1px solid var(--border-subtle)" }}
                >
                  <td onClick={(e) => e.stopPropagation()} style={{ padding: "8px 6px", textAlign: "center" }}>
                    <input
                      type="checkbox"
                      checked={selected.includes(c.id)}
                      disabled={c.billing !== "account"}
                      onChange={(e) => setSelected(e.target.checked ? [...selected, c.id] : selected.filter((x) => x !== c.id))}
                      style={{ width: 15, height: 15, accentColor: "var(--brand-primary)" }}
                    />
                  </td>
                  <td style={{ padding: "8px 10px", fontFamily: "'JetBrains Mono',monospace", whiteSpace: "nowrap", color: "var(--text-primary)" }}>
                    <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
                      <span style={{ display: "inline-block", width: 6, height: 6, borderRadius: 3, background: cust?.id === c.id ? "var(--brand-primary)" : "transparent", flexShrink: 0 }} />
                      {c.account_number}
                    </span>
                  </td>
                  <td style={{ padding: "8px 10px", color: "var(--text-primary)" }}>{c.name}</td>
                  <td style={{ padding: "8px 10px", color: "var(--text-muted)", whiteSpace: "nowrap" }}>{c.entity}</td>
                  <td style={{ padding: "8px 10px", color: "var(--text-muted)", whiteSpace: "nowrap" }}>{c.tier}</td>
                  <td style={{ padding: "8px 10px", color: "var(--text-muted)", whiteSpace: "nowrap" }}>{contact}</td>
                  <td style={{ padding: "8px 10px", fontFamily: "'JetBrains Mono',monospace", color: "var(--text-muted)", whiteSpace: "nowrap" }}>{phone}</td>
                  <td style={{ padding: "8px 10px", color: "var(--text-muted)", whiteSpace: "nowrap" }}>{settle}</td>
                  <td style={{ padding: "8px 10px", textAlign: "right", fontFamily: "'JetBrains Mono',monospace", color: "var(--text-muted)", whiteSpace: "nowrap" }}>{credit}</td>
                  <td style={{ padding: "8px 10px", whiteSpace: "nowrap", color: state === "Blocked" ? "var(--feedback-danger)" : "var(--text-muted)" }}>{state}</td>
                  <td style={{ padding: "8px 10px", whiteSpace: "nowrap", color: portal === "Enabled" ? "var(--feedback-success)" : "var(--text-muted)" }}>{portal}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {rows.length === 0 && (
            <div style={{ padding: 24, textAlign: "center", fontSize: 12, color: "var(--text-faint)" }}>
              No customers match these filters.
            </div>
          )}
        </div>
      </Card>

      {/* Customer drawer */}
      <div
        onClick={() => ui.set({ custId: null })}
        style={{
          position: "fixed",
          inset: 0,
          zIndex: 14,
          background: "var(--om-scrim)",
          backdropFilter: "blur(10px) saturate(140%)",
          opacity: cust ? 1 : 0,
          pointerEvents: cust ? "auto" : "none",
          transition: "opacity 320ms cubic-bezier(.16,1,.3,1)",
        }}
      />
      <div
        style={{
          position: "fixed",
          top: 0,
          right: 0,
          bottom: 0,
          zIndex: 15,
          width: "min(700px,100%)",
          background: "var(--surface-card)",
          borderLeft: "1px solid var(--border-default)",
          boxShadow: "var(--om-overlay-shadow)",
          display: "flex",
          flexDirection: "column",
          transform: `translateX(${cust ? "0%" : "105%"})`,
          transition: "transform 320ms cubic-bezier(.16,1,.3,1)",
        }}
      >
        {cust && (
          <CustomerDrawer
            cust={cust}
            cBlock={cBlock}
            custOrders={custOrders.map((o) => ({
              number: (o.kind === "master" ? "MO — " : "") + o.order_number,
              date: dmy(o.placed_at.slice(0, 10)),
              status: o.status.replace(/_/g, " "),
              payment: o.payment_status,
              totalNum: orderTotal(o, orderItems[o.id] || [], suburbs, paySettings),
            }))}
            custStatements={custStatements}
            suburbName={suburbName}
            openStatement={() => setStatementModal({ month: statementMonths()[0].value, scope: "all" })}
            smsSent={smsSent[cust.id]}
            sendSms={() => setSmsSent((prev) => ({ ...prev, [cust.id]: "Sent to the contact's mobile just now." }))}
            onNewOrder={() => ui.startOrder(cust.id)}
            onClose={() => ui.set({ custId: null })}
          />
        )}
      </div>

      {importPlan && (
        <ImportPreview
          title="Import customers"
          fileName={importPlan.file}
          busy={importing}
          tiles={[
            { label: "New", value: importPlan.plan.creates, tone: "good" },
            { label: "Updated", value: importPlan.plan.updates, tone: "info" },
            { label: "Skipped", value: importPlan.plan.rejects, tone: "bad" },
            { label: "Warnings", value: importPlan.plan.warnings, tone: "warn" },
          ]}
          notes={
            importPlan.plan.unknownColumns.length
              ? [{ title: "Columns that were ignored", body: `${importPlan.plan.unknownColumns.join(", ")} — these do not match any customer field, so they were left alone.` }]
              : []
          }
          rows={importPlan.plan.rows.map<PreviewRow>((r) => ({
            line: r.line,
            action: r.action === "reject" ? "Skip" : r.action === "create" ? "New" : "Update",
            tone: r.action === "reject" ? "bad" : r.action === "create" ? "good" : "info",
            label: r.name,
            code: r.accountNumber || undefined,
            reason: r.reason,
            warnings: r.warnings,
          }))}
          footNote="Rows are matched on account number. A blank account number always makes a new customer."
          writeCount={importPlan.plan.creates + importPlan.plan.updates}
          onClose={() => setImportPlan(null)}
          onConfirm={async () => {
            setImporting(true);
            const r = await applyCustomerImport(importPlan.plan);
            setImporting(false);
            setImportPlan(null);
            if (r.failed.length)
              app.toast({ tone: "danger", title: "Import did not finish", description: r.failed[0].error });
            else
              app.toast({
                tone: "success",
                title: `${r.created} added, ${r.updated} updated`,
                description: importPlan.plan.rejects ? `${importPlan.plan.rejects} rows were skipped.` : undefined,
              });
          }}
        />
      )}

      {newCustOpen && <NewCustomerModal onClose={() => setNewCustOpen(false)} onCreated={(c) => ui.set({ custId: c.id, custTab: "overview" })} />}

      {statementModal && cust && (
        <StatementModal
          cust={cust}
          state={statementModal}
          setState={setStatementModal}
          onGenerate={() => {
            void generateStatement(cust, statementModal.month, statementModal.scope);
            setStatementModal(null);
          }}
          onPrint={() => {
            printStatement(cust.id, statementModal.month, statementModal.scope);
            setStatementModal(null);
          }}
        />
      )}
    </div>
  );
}

function CustomerDrawer(props: {
  cust: Customer;
  cBlock: { blocked: boolean; reason: string };
  custOrders: { number: string; date: string; status: string; payment: string; totalNum: number }[];
  custStatements: { id: string; ref: string; period_start: string; period_end: string; scope: string; status: string; amount: number }[];
  suburbName: (id: string | null) => string;
  openStatement: () => void;
  smsSent?: string;
  sendSms: () => void;
  onNewOrder: () => void;
  onClose: () => void;
}) {
  const ui = useUi();
  const app = useApp();
  const { cust, cBlock, custOrders, custStatements, suburbName } = props;
  const [siteAddOpen, setSiteAddOpen] = useState(false);
  const [newSite, setNewSite] = useState({ label: "", street: "", suburbId: "" });
  const [newContact, setNewContact] = useState({ name: "", phone: "", email: "", role: "Orders" });

  const tab = ui.custTab;
  const setTab = (id: string) => ui.set({ custTab: id });
  const billRate = suburbRate(cust.billing_suburb_id, app.suburbs);

  const lifetime = custOrders.reduce((t, o) => t + o.totalNum, 0);

  return (
    <>
      <div style={{ flexShrink: 0, padding: "14px 16px", borderBottom: "1px solid var(--border-subtle)", display: "flex", alignItems: "flex-start", gap: 12 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
            <span style={{ fontSize: 16, fontWeight: 600, color: "var(--text-primary)" }}>{cust.name}</span>
            <StatusBadge kind="customer" value={customerBadgeType(cust)} />
            {cBlock.blocked && (
              <Badge tone="danger" icon="circle-alert">
                Stop credit
              </Badge>
            )}
          </div>
          <div style={{ fontSize: 12, color: "var(--text-faint)", marginTop: 4 }}>
            Acct {cust.account_number} · {cust.entity} · {cust.tier} pricing ·{" "}
            {cust.billing === "account" ? `${cust.terms_days} days account` : "prepaid"} · customer since{" "}
            {dmy(cust.customer_since)}
          </div>
        </div>
        <div onClick={props.onClose} title="Close" style={{ cursor: "pointer", width: 30, height: 30, flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center", borderRadius: 6, border: "1px solid var(--border-subtle)", color: "var(--text-muted)" }}>
          <Icon name="x" size={15} />
        </div>
      </div>

      <div style={{ flexShrink: 0, padding: "10px 16px", borderBottom: "1px solid var(--border-subtle)", display: "flex", gap: 8, flexWrap: "wrap" }}>
        <Button variant="primary" size="sm" iconLeft="plus" disabled={cBlock.blocked} onClick={props.onNewOrder}>
          {cBlock.blocked ? "Ordering on hold" : "New order"}
        </Button>
        <Button variant="secondary" size="sm" iconLeft="file-text" disabled={cust.billing !== "account"} onClick={props.openStatement}>
          Generate statement
        </Button>
      </div>

      <div style={{ flex: 1, overflowY: "auto", padding: 16, display: "flex", flexDirection: "column", gap: 12 }}>
        {cBlock.blocked && (
          <Alert tone="danger" title="New orders are blocked" icon="circle-alert">
            {cBlock.reason}
          </Alert>
        )}

        <Tabs
          items={[
            { id: "overview", label: "Overview" },
            { id: "contacts", label: "Contacts", count: cust.contacts.length },
            { id: "orders", label: "Orders", count: custOrders.length },
            { id: "credit", label: cust.billing === "account" ? "Credit & statements" : "Credit" },
          ]}
          activeId={tab}
          onSelect={setTab}
          variant="underline"
        />

        {tab === "overview" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <Card title="How this customer is set up" padding="default">
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(200px,1fr))", gap: 10 }}>
                <Select size="sm" label="Who they are" options={["Individual", "Sole trader", "Company"]} value={cust.entity} onChange={(e: any) => patchCustomer(cust.id, { entity: e.target.value })} />
                <Select size="sm" label="What they pay" options={["Retail", "Trade"]} value={cust.tier} onChange={(e: any) => patchCustomer(cust.id, { tier: e.target.value })} />
                <Select
                  size="sm"
                  label="How they settle"
                  options={[
                    { value: "prepaid", label: "Prepaid" },
                    { value: "account", label: "Account" },
                  ]}
                  value={cust.billing}
                  onChange={(e: any) =>
                    patchCustomer(cust.id, {
                      billing: e.target.value,
                      terms_days: e.target.value === "account" ? cust.terms_days || 30 : null,
                    })
                  }
                />
              </div>
            </Card>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(280px,1fr))", gap: 12, alignItems: "start" }}>
              <Card title={cust.entity === "Individual" ? "Person" : "Business"} subtitle={cust.entity === "Individual" ? "No ABN held" : "ABN " + (cust.abn || "—")} padding="default">
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {[
                    { label: "Legal name", value: cust.name },
                    { label: "ABN", value: cust.abn || "—" },
                    { label: "Account number", value: cust.account_number },
                    { label: "Customer since", value: dmy(cust.customer_since) },
                  ].map((r) => (
                    <div key={r.label} style={{ display: "flex", justifyContent: "space-between", gap: 10, fontSize: 13 }}>
                      <span style={{ color: "var(--text-faint)" }}>{r.label}</span>
                      <span style={{ color: "var(--text-primary)", textAlign: "right" }}>{r.value}</span>
                    </div>
                  ))}
                </div>
              </Card>

              <AddressBlock
                label={cust.billing === "account" ? "Invoices go to" : "Billing address"}
                street={cust.billing_street || ""}
                suburb={suburbName(cust.billing_suburb_id)}
                postcode={billRate.postcode}
                suburbId={billRate.id}
                deliveryFee={AUD(billRate.fee)}
                deliveryFeeSource="suburb"
                source="customer"
                verified
                onOpenMap={() =>
                  window.open(
                    "https://www.google.com/maps/search/" +
                      encodeURIComponent(`${cust.billing_street || ""} ${suburbName(cust.billing_suburb_id)} VIC ${billRate.postcode}`),
                    "_blank"
                  )
                }
                onChange={() => {}}
              />
            </div>

            {cust.billing === "account" && (
              <Card title="Customer portal" subtitle="Log in with just a PIN — no password" padding="default">
                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
                    <div>
                      <div style={{ fontSize: 13, color: "var(--text-primary)" }}>Portal access</div>
                      <div style={{ fontSize: 11, color: "var(--text-faint)" }}>
                        {cust.portal_enabled ? "They can sign in now." : "Off. They cannot sign in until you turn this on."}
                      </div>
                    </div>
                    <Switch
                      checked={cust.portal_enabled}
                      onChange={(v: boolean) => patchCustomer(cust.id, { portal_enabled: v, portal_pin: v ? cust.portal_pin || genPin() : cust.portal_pin })}
                    />
                  </div>
                  {cust.portal_enabled && (
                    <>
                      <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 12px", borderRadius: 8, background: "var(--surface-raised)", border: "1px solid var(--border-subtle)" }}>
                        <div style={{ flex: 1 }}>
                          <div style={{ fontSize: 11, color: "var(--text-faint)" }}>Account number</div>
                          <div className="tabular" style={{ fontSize: 14, fontWeight: 600, color: "var(--text-primary)" }}>
                            {cust.account_number}
                          </div>
                        </div>
                        <div style={{ flex: 1 }}>
                          <div style={{ fontSize: 11, color: "var(--text-faint)" }}>PIN</div>
                          <div className="tabular" style={{ fontSize: 16, fontWeight: 700, letterSpacing: ".1em", color: "var(--brand-primary)" }}>
                            {cust.portal_pin || "—"}
                          </div>
                        </div>
                        <Button variant="outline" size="sm" iconLeft="repeat" onClick={() => patchCustomer(cust.id, { portal_enabled: true, portal_pin: genPin() })}>
                          New PIN
                        </Button>
                        <Button variant="secondary" size="sm" iconLeft="mail" onClick={props.sendSms}>
                          Send via SMS
                        </Button>
                      </div>
                      {props.smsSent && <div style={{ fontSize: 11, color: "var(--feedback-success)" }}>{props.smsSent}</div>}
                      <div style={{ fontSize: 11, color: "var(--text-faint)", textWrap: "pretty" as any }}>
                        Just the PIN — the portal only asks for that now, no account number to remember. A new PIN
                        retires the old one immediately.
                      </div>
                    </>
                  )}
                </div>
              </Card>
            )}

            <Card title="Delivery sites" subtitle="Where their goods actually go" padding="default">
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {cust.sites.map((s) => {
                  const r = suburbRate(s.suburb_id, app.suburbs);
                  return (
                    <div key={s.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "9px 10px", borderRadius: 8, background: "var(--surface-raised)" }}>
                      <Icon name="map-pin" size={13} color="var(--text-faint)" />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 13, color: "var(--text-primary)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                          {s.street}, {suburbName(s.suburb_id)} VIC {r.postcode}
                        </div>
                        <div style={{ fontSize: 11, color: "var(--text-faint)" }}>
                          {s.label} · delivery {AUD(r.fee)}
                        </div>
                      </div>
                      <a
                        href={"https://www.google.com/maps/search/" + encodeURIComponent(`${s.street} ${suburbName(s.suburb_id)} VIC ${r.postcode}`)}
                        target="_blank"
                        rel="noreferrer"
                        title="Open in Google Maps"
                        style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 11 }}
                      >
                        <Icon name="external-link" size={12} />
                        Map
                      </a>
                      {s.is_default && <Badge tone="neutral">Default</Badge>}
                    </div>
                  );
                })}
                {siteAddOpen && (
                  <div style={{ display: "flex", flexDirection: "column", gap: 8, padding: 10, borderRadius: 8, border: "1px dashed var(--border-accent)", background: "var(--om-inline-add-bg)" }}>
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(130px,1fr))", gap: 8 }}>
                      <Input size="sm" label="Label" value={newSite.label} onChange={(e: any) => setNewSite({ ...newSite, label: e.target.value })} placeholder="e.g. Back paddock" />
                      <Input size="sm" label="Street" value={newSite.street} onChange={(e: any) => setNewSite({ ...newSite, street: e.target.value })} placeholder="12 Reserve Rd" />
                    </div>
                    <Select
                      size="sm"
                      label="Suburb"
                      options={app.suburbs.filter((s) => s.active).map((s) => ({ value: s.id, label: s.name }))}
                      value={newSite.suburbId}
                      onChange={(e: any) => setNewSite({ ...newSite, suburbId: e.target.value })}
                      allowUnset
                      required
                    />
                    <div style={{ fontSize: 11, color: "var(--text-faint)" }}>
                      {newSite.suburbId
                        ? `Deliveries here cost ${AUD(suburbRate(newSite.suburbId, app.suburbs).fee)} from the ${suburbName(newSite.suburbId)} rate.`
                        : "Pick a suburb — the delivery fee comes from it, not from the street."}
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      iconLeft="map-pin"
                      disabled={!(newSite.street.trim() && newSite.suburbId)}
                      fullWidth
                      onClick={() => {
                        addSite(cust.id, {
                          label: newSite.label.trim() || `Site ${cust.sites.length + 1}`,
                          street: newSite.street.trim(),
                          suburb_id: newSite.suburbId,
                          is_default: cust.sites.length === 0,
                        });
                        setNewSite({ label: "", street: "", suburbId: "" });
                        setSiteAddOpen(false);
                      }}
                    >
                      Save this site
                    </Button>
                  </div>
                )}
                <div onClick={() => setSiteAddOpen(!siteAddOpen)} style={{ cursor: "pointer", fontSize: 12, color: "var(--brand-primary)" }}>
                  {siteAddOpen ? "Cancel" : "Add a site"}
                </div>
              </div>
            </Card>
          </div>
        )}

        {tab === "contacts" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {cust.entity === "Individual" && (
              <Alert tone="info" title="An individual has one contact">
                Switch "Who they are" to a business on the Overview tab if several people need to order or receive
                invoices.
              </Alert>
            )}
            <Card
              title="Contacts"
              subtitle={cust.entity === "Individual" ? "One person on the account" : `${cust.contacts.length} people can act on this account`}
              padding="default"
            >
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {cust.contacts.map((ct) => (
                  <div key={ct.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: 10, borderRadius: 8, background: "var(--surface-raised)", flexWrap: "wrap" }}>
                    <div style={{ flex: "1 1 160px", minWidth: 0 }}>
                      <div style={{ fontSize: 13, fontWeight: 500, color: "var(--text-primary)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {ct.name}
                      </div>
                      <div className="tabular" style={{ fontSize: 11, color: "var(--text-faint)" }}>
                        {(ct.phone || "—") + " · " + (ct.email || "no email")}
                      </div>
                    </div>
                    {ct.roles.map((r) => (
                      <Badge key={r} tone={r === "Accounts" ? "brand" : r === "Site" ? "neutral" : "info"} outline>
                        {r}
                      </Badge>
                    ))}
                    <div onClick={() => removeContact(cust.id, ct.id)} title="Remove contact" style={{ cursor: "pointer", width: 24, height: 24, flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center", borderRadius: 6, border: "1px solid var(--border-default)", color: "var(--text-muted)" }}>
                      <Icon name="trash-2" size={12} />
                    </div>
                  </div>
                ))}
                {cust.entity !== "Individual" && (
                  <div style={{ display: "flex", flexDirection: "column", gap: 8, padding: 10, borderRadius: 8, border: "1px dashed var(--border-default)" }}>
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(150px,1fr))", gap: 8 }}>
                      <Input size="sm" label="Name" value={newContact.name} onChange={(e: any) => setNewContact({ ...newContact, name: e.target.value })} placeholder="e.g. Marcus Hale" />
                      <Input size="sm" label="Phone (optional)" value={newContact.phone} onChange={(e: any) => setNewContact({ ...newContact, phone: e.target.value })} placeholder="0412 000 000" />
                    </div>
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(150px,1fr))", gap: 8, alignItems: "end" }}>
                      <Input size="sm" label="Email (optional)" value={newContact.email} onChange={(e: any) => setNewContact({ ...newContact, email: e.target.value })} placeholder="name@business.com.au" />
                      <Select size="sm" label="Role" options={["Orders", "Accounts", "Site"]} value={newContact.role} onChange={(e: any) => setNewContact({ ...newContact, role: e.target.value })} />
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      iconLeft="plus"
                      disabled={!newContact.name.trim()}
                      onClick={() => {
                        addContact(cust.id, {
                          name: newContact.name.trim(),
                          phone: newContact.phone.trim() || null,
                          email: newContact.email.trim() || null,
                          roles: [newContact.role],
                        });
                        setNewContact({ name: "", phone: "", email: "", role: "Orders" });
                      }}
                    >
                      Add contact
                    </Button>
                  </div>
                )}
              </div>
            </Card>
          </div>
        )}

        {tab === "orders" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <div style={{ display: "flex", gap: 14, flexWrap: "wrap", fontSize: 12, color: "var(--text-muted)" }}>
              <span>
                <span className="tabular" style={{ color: "var(--text-primary)", fontWeight: 600 }}>{custOrders.length}</span> orders
              </span>
              <span>
                <span className="tabular" style={{ color: "var(--text-primary)", fontWeight: 600 }}>{AUD0(lifetime)}</span> lifetime
              </span>
              <span>
                <span className="tabular" style={{ color: "var(--text-primary)", fontWeight: 600 }}>
                  {custOrders.length ? AUD0(lifetime / custOrders.length) : "$0"}
                </span>{" "}
                average
              </span>
            </div>
            <Card padding="none">
              <div style={{ overflowX: "auto" }}>
                <DataTable
                  columns={[
                    { key: "number", header: "Order", mono: true, width: 150 },
                    { key: "date", header: "Placed", muted: true, width: 120 },
                    { key: "status", header: "Status", width: 140 },
                    { key: "payment", header: "Payment", width: 110 },
                    { key: "total", header: "Total", numeric: true, align: "right", width: 110 },
                  ]}
                  rows={custOrders.map((o) => ({ ...o, total: AUD(o.totalNum) }))}
                  dense
                  emptyMessage="No orders yet"
                />
              </div>
            </Card>
          </div>
        )}

        {tab === "credit" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {cust.billing !== "account" && (
              <Alert tone="info" title="Prepaid — no credit to manage">
                They pay at the time of the order, so there is no limit, no balance and no statement. Move them to an
                account on the Overview tab to extend credit.
              </Alert>
            )}
            {cust.billing === "account" && (
              <>
                <Card title="Credit" subtitle={`Invoices due ${cust.terms_days} days from the statement date`} padding="default">
                  <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(150px,1fr))", gap: 10 }}>
                      <CreditTile label="Limit" value={AUD0(Number(cust.credit_limit))} />
                      <CreditTile label="Owing" value={AUD(Number(cust.balance))} />
                      <CreditTile
                        label="Available"
                        value={AUD(Math.max(0, Number(cust.credit_limit) - Number(cust.balance)))}
                        color={Number(cust.balance) > Number(cust.credit_limit) ? "var(--feedback-danger)" : "var(--feedback-success)"}
                      />
                    </div>

                    <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
                      <div style={{ height: 6, borderRadius: 9999, background: "var(--bg-sunken)", overflow: "hidden" }}>
                        <div
                          style={{
                            height: "100%",
                            width: cust.credit_limit ? Math.min(100, Math.round((Number(cust.balance) / Number(cust.credit_limit)) * 100)) + "%" : "0%",
                            background:
                              Number(cust.balance) > Number(cust.credit_limit)
                                ? "var(--feedback-danger)"
                                : Number(cust.balance) / (Number(cust.credit_limit) || 1) > 0.8
                                  ? "var(--feedback-warning)"
                                  : "var(--brand-primary)",
                          }}
                        />
                      </div>
                      <div style={{ fontSize: 11, color: "var(--text-faint)" }}>
                        {cust.credit_limit
                          ? Number(cust.balance) > Number(cust.credit_limit)
                            ? `Over the limit by ${AUD(Number(cust.balance) - Number(cust.credit_limit))}.`
                            : `${Math.round((Number(cust.balance) / Number(cust.credit_limit)) * 100)}% of the limit used.`
                          : "No limit set — any balance blocks new orders."}
                      </div>
                    </div>

                    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(160px,1fr))", gap: 10 }}>
                      <Input size="sm" label="Credit limit" value={Number(cust.credit_limit).toFixed(2)} onChange={(e: any) => patchCustomer(cust.id, { credit_limit: Number(e.target.value) || 0 })} suffix="AUD" />
                      <Select
                        size="sm"
                        label="Terms"
                        options={[
                          { value: "7", label: "7 days" },
                          { value: "14", label: "14 days" },
                          { value: "30", label: "30 days" },
                        ]}
                        value={String(cust.terms_days || 30)}
                        onChange={(e: any) => patchCustomer(cust.id, { terms_days: Number(e.target.value) })}
                      />
                    </div>

                    <div
                      style={{
                        display: "flex",
                        flexDirection: "column",
                        gap: 8,
                        padding: 10,
                        borderRadius: 8,
                        border: `1px solid ${cBlock.blocked ? "var(--feedback-danger)" : "var(--border-subtle)"}`,
                        background: cBlock.blocked ? "color-mix(in srgb, var(--feedback-danger) 8%, transparent)" : "var(--surface-raised)",
                      }}
                    >
                      <Switch checked={cust.stop_credit} onChange={(v: boolean) => patchCustomer(cust.id, { stop_credit: v })} label="Hold all new orders for this customer" />
                      <div style={{ fontSize: 12, color: "var(--text-muted)", textWrap: "pretty" as any }}>
                        {cust.stop_credit
                          ? "On — while this is on, no one can raise an order for them, including from the storefront."
                          : Number(cust.balance) > Number(cust.credit_limit)
                            ? "Already blocked automatically because the balance is over the limit. This switch holds them even after they pay."
                            : "Off. They can order up to the available credit; going over the limit blocks new orders on its own."}
                      </div>
                    </div>
                  </div>
                </Card>

                <Card title="Statements" subtitle="Issued on the 1st of each month" padding="default">
                  <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                    {custStatements.map((s) => (
                      <div key={s.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "9px 10px", borderRadius: 8, background: "var(--surface-raised)", flexWrap: "wrap" }}>
                        <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 12, color: "var(--text-primary)" }}>{s.ref}</span>
                        <span style={{ fontSize: 12, color: "var(--text-muted)" }}>
                          {dmy(s.period_start)} – {dmy(s.period_end)}
                          {s.scope === "delivered" ? " · delivered only" : ""}
                        </span>
                        <StatusBadge kind="payment" value={s.status} />
                        <span className="tabular" style={{ marginLeft: "auto", fontSize: 13, fontWeight: 600, color: "var(--text-primary)" }}>
                          {AUD(Number(s.amount))}
                        </span>
                        <Button
                          variant="ghost"
                          size="sm"
                          iconLeft="printer"
                          onClick={() => printStatement(cust.id, s.period_start.slice(0, 8) + "01", s.scope as "all" | "delivered")}
                        >
                          Print
                        </Button>
                      </div>
                    ))}
                    {custStatements.length === 0 && (
                      <div style={{ fontSize: 12, color: "var(--text-faint)" }}>No statements yet.</div>
                    )}
                    <Button variant="secondary" size="md" iconLeft="file-text" fullWidth onClick={props.openStatement}>
                      Generate statement to today
                    </Button>
                  </div>
                </Card>
              </>
            )}
          </div>
        )}
      </div>
    </>
  );
}

function CreditTile({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <div style={{ padding: 10, borderRadius: 8, background: "var(--surface-raised)" }}>
      <div style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: ".09em", color: "var(--text-faint)" }}>{label}</div>
      <div className="tabular" style={{ fontSize: 18, fontWeight: 600, color: color || "var(--text-primary)", marginTop: 3 }}>
        {value}
      </div>
    </div>
  );
}

function NewCustomerModal({ onClose, onCreated }: { onClose: () => void; onCreated: (c: Customer) => void }) {
  const app = useApp();
  const [n2, setN2] = useState({
    kind: "Company" as Customer["entity"],
    name: "",
    abn: "",
    contact: "",
    phone: "",
    email: "",
    tier: "Trade" as Customer["tier"],
    billing: "Account" as "Prepaid" | "Account",
    terms: "30",
    limit: "10000",
    street: "",
    suburbId: "",
  });
  const patch = (p: Partial<typeof n2>) => setN2((s) => ({ ...s, ...p }));
  const suburbName = (id: string) => app.suburbs.find((s) => s.id === id)?.name || "";

  return (
    <div
      onClick={onClose}
      style={{ position: "fixed", inset: 0, zIndex: 26, display: "flex", alignItems: "flex-start", justifyContent: "center", padding: 24, overflowY: "auto", background: "var(--om-scrim)", backdropFilter: "blur(10px) saturate(140%)" }}
    >
      <div onClick={(e) => e.stopPropagation()} style={{ width: "min(560px,100%)", borderRadius: 16, background: "var(--surface-card)", border: "1px solid var(--border-default)", boxShadow: "var(--om-overlay-shadow)", overflow: "hidden" }}>
        <div style={{ padding: 16, borderBottom: "1px solid var(--border-subtle)" }}>
          <div style={{ fontSize: 15, fontWeight: 600, color: "var(--text-primary)" }}>Add a customer</div>
          <div style={{ fontSize: 12, color: "var(--text-faint)", marginTop: 3 }}>
            {n2.kind === "Individual"
              ? "One person, one contact. Retail pricing and prepaid unless you say otherwise."
              : n2.kind === "Sole trader"
                ? "A person trading under their own name — they can hold trade pricing and an account."
                : "A business with several people who can order, and one place invoices go."}
          </div>
        </div>

        <div style={{ padding: 16, display: "flex", flexDirection: "column", gap: 12 }}>
          <Tabs
            items={[
              { id: "Individual", label: "A person", icon: "user" },
              { id: "Sole trader", label: "Sole trader", icon: "wrench" },
              { id: "Company", label: "Company", icon: "building-2" },
            ]}
            activeId={n2.kind}
            onSelect={(id: string) => patch({ kind: id as any, billing: id === "Individual" ? "Prepaid" : n2.billing })}
            variant="segmented"
            fullWidth
          />
          <Input size="md" label={n2.kind === "Company" ? "Business name" : "Full name"} value={n2.name} onChange={(e: any) => patch({ name: e.target.value })} placeholder={n2.kind === "Company" ? "e.g. Barwon Building Supplies" : "e.g. Dean Pearce"} />
          {n2.kind === "Company" && (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(160px,1fr))", gap: 10 }}>
              <Input size="sm" label="ABN (optional)" value={n2.abn} onChange={(e: any) => patch({ abn: e.target.value })} placeholder="00 000 000 000" />
              <Input size="sm" label="Person who orders" value={n2.contact} onChange={(e: any) => patch({ contact: e.target.value })} placeholder="Who to ask for" />
            </div>
          )}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(160px,1fr))", gap: 10 }}>
            <Input size="sm" label="Phone (optional)" value={n2.phone} onChange={(e: any) => patch({ phone: e.target.value })} placeholder="0412 000 000" />
            <Input size="sm" label="Email (optional)" value={n2.email} onChange={(e: any) => patch({ email: e.target.value })} placeholder="name@example.com.au" />
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(150px,1fr))", gap: 10 }}>
            <Select size="sm" label="What they pay" options={["Retail", "Trade"]} value={n2.tier} onChange={(e: any) => patch({ tier: e.target.value })} />
            <Select size="sm" label="How they settle" options={["Prepaid", "Account"]} value={n2.billing} onChange={(e: any) => patch({ billing: e.target.value })} />
          </div>
          {n2.billing === "Account" && (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(150px,1fr))", gap: 10 }}>
              <Select
                size="sm"
                label="Terms"
                options={[
                  { value: "7", label: "7 days" },
                  { value: "14", label: "14 days" },
                  { value: "30", label: "30 days" },
                ]}
                value={n2.terms}
                onChange={(e: any) => patch({ terms: e.target.value })}
              />
              <Input size="sm" label="Credit limit" value={n2.limit} onChange={(e: any) => patch({ limit: e.target.value.replace(/[^0-9.]/g, "") })} suffix="AUD" />
            </div>
          )}
          <div style={{ display: "flex", flexDirection: "column", gap: 9, padding: 10, borderRadius: 10, border: "1px solid var(--border-subtle)", background: "var(--bg-sunken)" }}>
            <div style={{ fontSize: 12, fontWeight: 600, color: "var(--text-primary)" }}>Delivery address</div>
            <div style={{ fontSize: 11, color: "var(--text-faint)", textWrap: "pretty" as any }}>
              Optional now — but until a suburb is on file no delivery fee can be worked out, so orders will ask for one.
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(140px,1fr))", gap: 8 }}>
              <Input size="sm" label="Street" value={n2.street} onChange={(e: any) => patch({ street: e.target.value })} placeholder="88 Barwon Heads Rd" />
              <Select
                size="sm"
                label="Suburb"
                options={app.suburbs.filter((s) => s.active).map((s) => ({ value: s.id, label: s.name }))}
                value={n2.suburbId}
                onChange={(e: any) => patch({ suburbId: e.target.value })}
                allowUnset
              />
            </div>
            <div style={{ fontSize: 11, color: "var(--text-faint)" }}>
              {n2.suburbId
                ? `Deliveries to ${suburbName(n2.suburbId)} cost ${AUD(suburbRate(n2.suburbId, app.suburbs).fee)}.`
                : "No suburb yet — you can add one from the customer's Overview tab later."}
            </div>
          </div>
        </div>

        <div style={{ padding: "12px 16px", borderTop: "1px solid var(--border-subtle)", display: "flex", gap: 8, justifyContent: "flex-end", flexWrap: "wrap" }}>
          <Button variant="ghost" size="md" onClick={onClose}>
            Cancel
          </Button>
          <Button
            variant="primary"
            size="md"
            iconLeft="check"
            disabled={!n2.name.trim()}
            onClick={() => {
              void createCustomer({
                kind: n2.kind,
                name: n2.name.trim(),
                abn: n2.abn.trim(),
                contact: n2.contact.trim(),
                phone: n2.phone.trim(),
                email: n2.email.trim(),
                tier: n2.tier,
                billing: n2.billing,
                termsDays: Number(n2.terms),
                limit: Number(n2.limit) || 0,
                street: n2.street.trim(),
                suburbId: n2.suburbId || null,
              }).then((c) => {
                if (c) onCreated(c);
              });
              onClose();
            }}
          >
            Add customer
          </Button>
        </div>
      </div>
    </div>
  );
}

function StatementModal({
  cust,
  state,
  setState,
  onGenerate,
  onPrint,
}: {
  cust: Customer;
  state: { month: string; scope: "all" | "delivered" };
  setState: (s: { month: string; scope: "all" | "delivered" } | null) => void;
  onGenerate: () => void;
  onPrint: () => void;
}) {
  const months = statementMonths();
  const periodLabel = monthLabel(state.month);
  const lineCount = statementLines(
    cust.id,
    state.month,
    (() => {
      const d = new Date(state.month + "T00:00:00");
      const end = new Date(d.getFullYear(), d.getMonth() + 1, 0);
      return `${end.getFullYear()}-${String(end.getMonth() + 1).padStart(2, "0")}-${String(end.getDate()).padStart(2, "0")}`;
    })(),
    state.scope
  ).length;

  return (
    <div
      onClick={() => setState(null)}
      style={{ position: "fixed", inset: 0, zIndex: 26, display: "flex", alignItems: "center", justifyContent: "center", padding: 24, background: "rgba(6,7,15,.72)", backdropFilter: "blur(10px) saturate(140%)" }}
    >
      <div onClick={(e) => e.stopPropagation()} style={{ width: "min(420px,100%)", borderRadius: 16, background: "var(--surface-card)", border: "1px solid var(--border-default)", boxShadow: "var(--shadow-overlay)", display: "flex", flexDirection: "column" }}>
        <div style={{ padding: 16, borderBottom: "1px solid var(--border-subtle)", display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 10 }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 15, fontWeight: 600, color: "var(--text-primary)" }}>Generate statement</div>
            <div style={{ fontSize: 12, color: "var(--text-faint)", marginTop: 3 }}>{cust.name}</div>
          </div>
          <div onClick={() => setState(null)} title="Close" style={{ cursor: "pointer", width: 26, height: 26, flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center", borderRadius: 6, border: "1px solid var(--border-subtle)", color: "var(--text-muted)" }}>
            <Icon name="x" size={14} />
          </div>
        </div>
        <div style={{ padding: 16, display: "flex", flexDirection: "column", gap: 14 }}>
          <div>
            <Select
              size="sm"
              label="Month"
              options={months}
              value={state.month}
              onChange={(e: any) => setState({ ...state, month: e.target.value })}
            />
          </div>
          <div>
            <div style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: ".09em", color: "var(--text-faint)", marginBottom: 6 }}>Orders to include</div>
            <Tabs
              items={[
                { id: "all", label: "All orders" },
                { id: "delivered", label: "Delivered only" },
              ]}
              activeId={state.scope}
              onSelect={(id: string) => setState({ ...state, scope: id as any })}
              variant="segmented"
            />
          </div>
          <div style={{ fontSize: 11, color: "var(--text-faint)", textWrap: "pretty" as any }}>
            {periodLabel} — {state.scope === "delivered" ? "delivered orders only" : "all orders"}.{" "}
            {lineCount ? `${lineCount} ${lineCount === 1 ? "entry" : "entries"} on the statement.` : "Nothing on the account that month."}
          </div>
        </div>
        <div style={{ padding: "12px 16px", borderTop: "1px solid var(--border-subtle)", display: "flex", gap: 8, justifyContent: "flex-end" }}>
          <Button variant="ghost" size="md" onClick={() => setState(null)}>
            Cancel
          </Button>
          <Button variant="secondary" size="md" iconLeft="file-text" onClick={onGenerate}>
            Generate
          </Button>
          <Button variant="primary" size="md" iconLeft="printer" onClick={onPrint}>
            Print statement
          </Button>
        </div>
      </div>
    </div>
  );
}

