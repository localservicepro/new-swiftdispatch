import React, { useMemo, useState } from "react";
import { useApp } from "../store/store";
import { useUi } from "../store/ui";
import { AUD, AUD0, dmy } from "../lib/domain";
import { PAYMENT_TYPE_LABEL, type Order } from "../lib/types";
import { patchPaySettings } from "../data/api";
import { pushContextFor, pushOrdersToMyob } from "../data/myob";
import { pushBlockers, readyForMyob, readyReason } from "../lib/myob";
import { Alert, Badge, Button, Card, DataTable, Input, Select, StatCard, Switch, Tabs } from "../design-system/components.js";

export default function Payments() {
  const app = useApp();
  const ui = useUi();
  const { payments, orders, customers, paySettings, statements, myob } = app;
  const [tab, setTab] = useState<"ledger" | "settings">("ledger");
  const [draft, setDraft] = useState<Record<string, any> | null>(null);

  const p = { ...(paySettings || {}), ...(draft || {}) } as any;
  const setPay = (patch: Record<string, any>) => setDraft((d) => ({ ...(d || {}), ...patch }));
  const dirty = !!draft && Object.keys(draft).some((k) => (paySettings as any)?.[k] !== draft[k]);

  const num = (v: any) => Number(v) || 0;

  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);
  const collectedToday = payments
    .filter((x) => x.status === "paid" && x.paid_at && new Date(x.paid_at) >= startOfToday)
    .reduce((s, x) => s + Number(x.amount), 0);
  const awaiting = payments.filter((x) => x.status === "pending").reduce((s, x) => s + Number(x.amount), 0);
  const failed = payments.filter((x) => x.status === "failed").reduce((s, x) => s + Number(x.amount), 0);
  const onStatement = payments.filter((x) => x.status === "invoiced").reduce((s, x) => s + Number(x.amount), 0);

  /* Both of these are looked up per row, and one of the counts below walks
     every order — with ten thousand of them against two and a half thousand
     customers that is tens of millions of comparisons a render. Two maps. */
  const orderById = useMemo(() => new Map(orders.map((o) => [o.id, o])), [orders]);
  const custById = useMemo(() => new Map(customers.map((c) => [c.id, c])), [customers]);

  const payRows = payments.map((x) => {
    const o = x.order_id ? orderById.get(x.order_id) : undefined;
    const c = x.customer_id ? custById.get(x.customer_id) : undefined;
    const blocked = c && c.billing === "account" && (c.stop_credit || Number(c.balance) > Number(c.credit_limit));
    return {
      date: dmy((x.paid_at || x.created_at).slice(0, 10)),
      order: o?.order_number || "—",
      customer: c?.name || "Walk-in",
      type: blocked ? "Stop credit" : o?.payment_type ? PAYMENT_TYPE_LABEL[o.payment_type] : c?.billing === "account" ? `${c.terms_days}-day account` : "Prepaid",
      method: x.method ? x.method.replace(/_/g, " ") : "— not set —",
      status: x.status[0].toUpperCase() + x.status.slice(1),
      amount: AUD(Number(x.amount)),
    };
  });

  const accountCustomers = customers.filter((c) => c.billing === "account");
  const eligibleOrders = orders.filter((o) => !o.deleted_at && o.payment_type && o.payment_type !== "prepaid");
  const yardOnAccount = eligibleOrders.filter((o) => o.kind === "yard_sale").length;
  const blockedNoRel = orders.filter(
    (o) => !o.deleted_at && !o.payment_type && (o.customer_id ? custById.get(o.customer_id)?.billing : null) === "account"
  ).length;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12, maxWidth: 1400 }}>
      <Tabs
        items={[
          { id: "ledger", label: "Ledger" },
          { id: "settings", label: "Settings" },
        ]}
        activeId={tab}
        onSelect={setTab}
        variant="underline"
      />

      {tab === "ledger" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(190px,1fr))", gap: 10 }}>
            <StatCard label="Collected today" value={AUD0(collectedToday)} icon="wallet" tone="success" />
            <StatCard label="Awaiting settlement" value={AUD0(awaiting)} icon="hourglass" tone="warning" />
            <StatCard label="Failed" value={AUD0(failed)} icon="circle-alert" tone="danger" />
            <StatCard label="On statement" value={AUD0(onStatement)} icon="file-text" tone="info" />
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(340px,1fr))", gap: 12, alignItems: "start" }}>
            <Card title="Payment ledger" padding="none" style={{ minWidth: 0 }}>
              <div style={{ overflowX: "auto" }}>
                <DataTable
                  columns={[
                    { key: "date", header: "Date", width: 110 },
                    { key: "order", header: "Order", mono: true, width: 150 },
                    { key: "customer", header: "Customer" },
                    { key: "type", header: "Billing relationship", width: 160 },
                    { key: "method", header: "Settled by", width: 140 },
                    { key: "status", header: "Status", width: 110 },
                    { key: "amount", header: "Amount", numeric: true, align: "right", width: 120 },
                  ]}
                  rows={payRows}
                  dense
                  emptyMessage="No payments yet"
                />
              </div>
            </Card>
            <div style={{ display: "flex", flexDirection: "column", gap: 12, minWidth: 0 }}>
              <Card title="Statement run" subtitle="Eligibility is derived from the billing relationship" padding="default">
                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  {[
                    { label: "Account customers", value: String(accountCustomers.length), color: "var(--text-primary)" },
                    { label: "Orders eligible", value: String(eligibleOrders.length), color: "var(--text-primary)" },
                    { label: "Yard sales on account", value: String(yardOnAccount), color: "var(--text-primary)" },
                    { label: "Blocked — no billing relationship", value: String(blockedNoRel), color: blockedNoRel ? "var(--attention)" : "var(--text-primary)" },
                  ].map((s) => (
                    <div key={s.label} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, fontSize: 13 }}>
                      <span style={{ color: "var(--text-muted)" }}>{s.label}</span>
                      <span className="tabular" style={{ fontWeight: 600, color: s.color }}>
                        {s.value}
                      </span>
                    </div>
                  ))}
                  <Button variant="primary" size="md" iconLeft="file-text" fullWidth>
                    Generate statements
                  </Button>
                  <div style={{ fontSize: 11, color: "var(--text-faint)" }}>{statements.length} statements issued so far.</div>
                </div>
              </Card>
              <MyobBatchCard />
            </div>
          </div>
        </div>
      )}

      {tab === "settings" && paySettings && (
        <div style={{ display: "flex", flexDirection: "column", gap: 12, maxWidth: 900 }}>
          <Card title="Tax" subtitle="Applies to every order and statement" padding="default">
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <Switch checked={p.gst_on} onChange={(v: boolean) => setPay({ gst_on: v })} label="Calculate GST on orders" />
              {p.gst_on && (
                <>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(180px,1fr))", gap: 10 }}>
                    <Input label="GST rate" value={String(p.gst_rate)} onChange={(e: any) => setPay({ gst_rate: e.target.value })} suffix="%" />
                    <Input label="Label on documents" value={p.gst_label} onChange={(e: any) => setPay({ gst_label: e.target.value })} />
                  </div>
                  <Switch checked={p.gst_inclusive} onChange={(v: boolean) => setPay({ gst_inclusive: v })} label="Show prices with GST included" />
                  <div style={{ fontSize: 12, color: "var(--text-faint)" }}>
                    {p.gst_inclusive
                      ? `Prices on the storefront, order screens and dockets already include ${p.gst_label}.`
                      : `${p.gst_label} is added at the total, so listed prices read lower than what is charged.`}
                  </div>
                </>
              )}
            </div>
          </Card>

          <Card title="Card payments" padding="default">
            <div style={{ display: "flex", flexDirection: "column", gap: 8, maxWidth: 340 }}>
              <Input label="Credit card surcharge" value={String(p.card_surcharge)} onChange={(e: any) => setPay({ card_surcharge: e.target.value })} suffix="%" />
              <div style={{ fontSize: 12, color: "var(--text-faint)" }}>
                Added to the total when the settlement method is a card.{" "}
                {num(p.card_surcharge) > 0
                  ? `A ${AUD(1000)} order settled by card would carry ${AUD((1000 * num(p.card_surcharge)) / 100)}.`
                  : "No surcharge at present."}
              </div>
            </div>
          </Card>

          <Card title="Delivery pricing" subtitle="Applied on top of the suburb rate on every delivery" padding="default">
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
                <span style={{ fontSize: 12, fontWeight: 500, color: "var(--text-muted)" }}>Markup type</span>
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                  {[
                    { id: "percent", label: "Percentage of the suburb rate" },
                    { id: "fixed", label: "Fixed amount per delivery" },
                  ].map((m) => {
                    const on = p.markup_type === m.id;
                    return (
                      <div
                        key={m.id}
                        onClick={() => setPay({ markup_type: m.id })}
                        style={{ cursor: "pointer", display: "flex", alignItems: "center", gap: 7, padding: "7px 12px", borderRadius: 6, border: `1px solid ${on ? "var(--border-accent)" : "var(--border-subtle)"}`, background: on ? "var(--surface-active)" : "transparent" }}
                      >
                        <span style={{ width: 14, height: 14, flexShrink: 0, borderRadius: "50%", border: `2px solid ${on ? "var(--brand-primary)" : "var(--border-strong)"}`, background: on ? "var(--brand-primary)" : "transparent" }} />
                        <span style={{ fontSize: 13, color: on ? "var(--text-primary)" : "var(--text-muted)" }}>{m.label}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(180px,1fr))", gap: 10 }}>
                <Input
                  label={p.markup_type === "percent" ? "Markup" : "Markup per delivery"}
                  value={String(p.markup_value)}
                  onChange={(e: any) => setPay({ markup_value: e.target.value })}
                  suffix={p.markup_type === "percent" ? "%" : "AUD"}
                />
                <Input label="Fuel surcharge" value={String(p.fuel_surcharge)} onChange={(e: any) => setPay({ fuel_surcharge: e.target.value })} suffix="AUD" />
              </div>
              <Alert tone="info" title="What a Belmont delivery costs now">
                {(() => {
                  const base = 45;
                  const mk = num(p.markup_value);
                  const fuel = num(p.fuel_surcharge);
                  const markup = p.markup_type === "percent" ? (base * mk) / 100 : mk;
                  return `Suburb rate ${AUD(base)} + markup ${AUD(markup)} + fuel ${AUD(fuel)} = ${AUD(base + markup + fuel)} on the order.`;
                })()}
              </Alert>
            </div>
          </Card>

          <Card title="Defaults" padding="default">
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(200px,1fr))", gap: 10 }}>
              <Select label="Currency" options={["AUD — Australian dollar", "NZD — New Zealand dollar"]} value={p.currency === "AUD" ? "AUD — Australian dollar" : p.currency} onChange={(e: any) => setPay({ currency: e.target.value.startsWith("AUD") ? "AUD" : "NZD" })} />
              <Input label="Fee for an unrated suburb" value={String(p.default_fee)} onChange={(e: any) => setPay({ default_fee: e.target.value })} suffix="AUD" />
            </div>
          </Card>

          <Card title="MYOB AccountRight" padding="default">
            <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
              <Badge tone={myob?.enabled ? "success" : "neutral"} icon={myob?.enabled ? "badge-check" : "circle"}>
                {myob?.enabled ? "On" : "Off"}
              </Badge>
              <span style={{ flex: "1 1 200px", minWidth: 0, fontSize: 13, color: "var(--text-muted)" }}>
                {myob?.enabled
                  ? `Sales go across as ${myob.push_as === "order" ? "orders" : "invoices"} on the ${myob.sale_layout} layout${
                      myob.auto_push ? ", automatically once delivered" : ", when you push them"
                    }.`
                  : "Switch it on in Settings › Integrations to stop re-keying deliveries."}
              </span>
              <Button variant="ghost" size="sm" iconLeft="external-link" onClick={() => ui.navigateTo("settings")}>
                Open integration settings
              </Button>
            </div>
          </Card>

          <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", flexWrap: "wrap" }}>
            <Button variant="ghost" size="md" onClick={() => setDraft(null)}>
              Cancel
            </Button>
            <Button
              variant="primary"
              size="md"
              iconLeft="file-check"
              disabled={!dirty}
              onClick={() => {
                if (draft) {
                  const clean = { ...draft };
                  ["gst_rate", "card_surcharge", "markup_value", "fuel_surcharge", "default_fee"].forEach((k) => {
                    if (k in clean) clean[k] = Number(clean[k]) || 0;
                  });
                  patchPaySettings(clean);
                }
                setDraft(null);
              }}
            >
              {dirty ? "Save settings" : "Saved"}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

/* Batch push: every delivered order that MYOB hasn't seen yet. Orders that
   can't go (no coding, nothing on them) are counted separately rather than
   quietly dropped from the batch — a batch that says "12 sent" while silently
   skipping four is how re-keying creeps back in. */
function MyobBatchCard() {
  const app = useApp();
  const ui = useUi();
  const { orders, myob } = app;
  const [busy, setBusy] = useState(false);

  const finished = orders.filter(readyForMyob);
  const contexts = finished.map((o: Order) => pushContextFor(o)).filter(Boolean) as NonNullable<
    ReturnType<typeof pushContextFor>
  >[];
  const ready = contexts.filter((c) => pushBlockers(c).length === 0);
  const held = contexts.length - ready.length;
  const off = !myob?.enabled;

  /* Spelled out because "3 orders" hides that two of them were counter sales
     nobody would think to look for under a delivery heading. */
  const mix = ready.reduce<Record<string, number>>((acc, c) => {
    const k = readyReason(c.order);
    acc[k] = (acc[k] || 0) + 1;
    return acc;
  }, {});
  const mixText = Object.entries(mix)
    .map(([k, n]) => `${n} ${k}`)
    .join(", ");

  return (
    <Card title="MYOB" subtitle="Batch push" padding="default">
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        <div style={{ fontSize: 13, color: "var(--text-muted)", textWrap: "pretty" as any }}>
          {off
            ? "The MYOB connection is switched off."
            : ready.length
              ? `${ready.length} finished ${ready.length === 1 ? "sale is" : "sales are"} ready to go across — ${mixText}.`
              : "Nothing finished is waiting — everything MYOB hasn't seen is still open."}
        </div>
        {!off && (
          <div style={{ fontSize: 11, color: "var(--text-faint)", textWrap: "pretty" as any }}>
            Counter sales and pickups count as finished the moment the goods leave the yard, so they don't have to be
            marked delivered first.
          </div>
        )}
        {!off && held > 0 && (
          <div style={{ fontSize: 11, color: "var(--attention)", textWrap: "pretty" as any }}>
            {held} held back — {pushBlockers(contexts.find((c) => pushBlockers(c).length > 0)!)[0]}
          </div>
        )}
        <Button
          variant="secondary"
          size="md"
          iconLeft="external-link"
          fullWidth
          disabled={busy || off || !ready.length}
          onClick={async () => {
            setBusy(true);
            try {
              await pushOrdersToMyob(ready);
            } finally {
              setBusy(false);
            }
          }}
        >
          {busy ? "Sending…" : off ? "Switch MYOB on first" : `Push ${ready.length || ""} to MYOB`.trim()}
        </Button>
        {off && (
          <Button variant="ghost" size="sm" iconLeft="settings" fullWidth onClick={() => ui.navigateTo("settings")}>
            Open MYOB settings
          </Button>
        )}
      </div>
    </Card>
  );
}
