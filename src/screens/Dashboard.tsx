import React, { useMemo, useState } from "react";
import { useApp } from "../store/store";
import { useUi } from "../store/ui";
import { AUD0, deliverySortKey, orderTotal, qtyText, shortDate, unitPrice } from "../lib/domain";
import { Alert, Card, DataTable, Select, StatCard, Tabs } from "../design-system/components.js";

export default function Dashboard() {
  const ui = useUi();
  const { orders, orderItems, suburbs, customers, products, specials, trucks, categories } = useApp();
  const [period, setPeriod] = useState<"today" | "week" | "month">("today");
  const [metric, setMetric] = useState<"qty" | "revenue">("qty");
  const [analyticsCat, setAnalyticsCat] = useState("All categories");

  const now = new Date();
  const startOf = (p: typeof period) => {
    const d = new Date(now);
    d.setHours(0, 0, 0, 0);
    if (p === "week") d.setDate(d.getDate() - ((d.getDay() + 6) % 7));
    if (p === "month") d.setDate(1);
    return d;
  };
  const rangeStart = startOf(period);

  const live = useMemo(() => orders.filter((o) => !o.deleted_at && o.kind !== "master"), [orders]);
  const inRange = live.filter((o) => new Date(o.placed_at) >= rangeStart);
  const revenue = inRange.reduce((s, o) => s + orderTotal(o, orderItems[o.id] || [], suburbs), 0);
  const onRoad = live.filter((o) => o.status === "en_route" || o.status === "loading").length;
  const unpaid = live
    .filter((o) => o.payment_status === "invoiced" || o.payment_status === "pending")
    .reduce((s, o) => s + orderTotal(o, orderItems[o.id] || [], suburbs), 0);

  const catName = (id: string | null) => categories.find((c) => c.id === id)?.name || "—";

  /* Product movement over the period, from real order lines. */
  const movement = useMemo(() => {
    const byProduct: Record<string, { qty: number; revenue: number }> = {};
    inRange.forEach((o) => {
      (orderItems[o.id] || []).forEach((i) => {
        if (!i.product_id || Number(i.qty) <= 0) return;
        const b = (byProduct[i.product_id] = byProduct[i.product_id] || { qty: 0, revenue: 0 });
        b.qty += Number(i.qty);
        b.revenue += Number(i.line_total);
      });
    });
    return products
      .filter((p) => analyticsCat === "All categories" || catName(p.category_id) === analyticsCat)
      .map((p) => ({ p, q: byProduct[p.id]?.qty || 0, revenue: byProduct[p.id]?.revenue || 0 }))
      .filter((r) => r.q > 0)
      .sort((a, b) => (metric === "qty" ? (a.p.unit === b.p.unit ? b.q - a.q : b.revenue - a.revenue) : b.revenue - a.revenue));
  }, [inRange, orderItems, products, analyticsCat, metric]);

  const maxPerUnit: Record<string, number> = {};
  movement.forEach((r) => (maxPerUnit[r.p.unit] = Math.max(maxPerUnit[r.p.unit] || 0, r.q)));
  const movedMax = movement.reduce((m, r) => Math.max(m, r.revenue), 0) || 1;
  const movedRevenue = movement.reduce((s, r) => s + r.revenue, 0);
  const unitTotals = [...new Set(movement.map((r) => r.p.unit))].map((u) =>
    qtyText(movement.filter((r) => r.p.unit === u).reduce((s, r) => s + r.q, 0), u)
  );

  const catTotals = [...new Set(products.map((p) => catName(p.category_id)))]
    .map((name) => {
      const rows = movement.filter((r) => catName(r.p.category_id) === name);
      const units = [...new Set(rows.map((r) => r.p.unit))]
        .map((u) => qtyText(rows.filter((r) => r.p.unit === u).reduce((s, r) => s + r.q, 0), u))
        .join(" · ");
      return { name, revenue: rows.reduce((s, r) => s + r.revenue, 0), units };
    })
    .filter((c) => c.revenue > 0)
    .sort((a, b) => b.revenue - a.revenue);
  const catRevTotal = catTotals.reduce((s, c) => s + c.revenue, 0) || 1;

  const stockRows = movement
    .map((r) => ({ r, days: r.q > 0 ? Number(r.p.stock) / (r.q / (period === "today" ? 1 : period === "week" ? 3 : 9)) : Infinity }))
    .sort((x, y) => x.days - y.days)
    .slice(0, 6)
    .map(({ r, days }) => ({
      name: r.p.name,
      moved: qtyText(r.q, r.p.unit),
      stock: qtyText(Number(r.p.stock), r.p.unit),
      cover: Number(r.p.stock) === 0 ? "Out of stock" : days < 1 ? "Under a day" : Math.round(days) + (Math.round(days) === 1 ? " day" : " days"),
    }));

  /* Today's run — deliveries in time order. */
  const runRows = live
    .filter((o) => o.method === "delivery" && !["delivered", "cancelled"].includes(o.status))
    .sort((a, b) => deliverySortKey(a) - deliverySortKey(b))
    .slice(0, 8)
    .map((o) => ({
      _order: o,
      time: o.delivery_window || "—",
      number: o.order_number,
      customer: customers.find((c) => c.id === o.customer_id)?.name || o.walk_in_name || "Walk-in",
      suburb: suburbs.find((s) => s.id === o.suburb_id)?.name || "—",
      truck: trucks.find((t) => t.id === o.truck_id)?.rego || "Unassigned",
      total: AUD0(orderTotal(o, orderItems[o.id] || [], suburbs)),
    }));

  /* Needs attention — real conditions, computed live. */
  const noBilling = live.filter(
    (o) => customers.find((c) => c.id === o.customer_id)?.billing === "account" && !o.payment_type
  ).length;
  const noSuburb = live.filter((o) => o.method === "delivery" && !o.suburb_id && !["delivered", "cancelled"].includes(o.status)).length;
  const failedPayments = live.filter((o) => o.payment_status === "failed").length;
  const stopCreditOpen = live.filter((o) => {
    const c = customers.find((x) => x.id === o.customer_id);
    return c && c.billing === "account" && (c.stop_credit || Number(c.balance) > Number(c.credit_limit)) && !["delivered", "cancelled"].includes(o.status);
  }).length;
  const splitsWaiting = live.filter((o) => o.kind === "split" && o.status === "loading" && !(o.truck_id && o.driver_id)).length;

  const attnRows = [
    { what: "Account orders with no billing relationship", count: String(noBilling) },
    { what: "Addresses with no resolved suburb", count: String(noSuburb) },
    { what: "Failed card payments", count: String(failedPayments) },
    { what: "Customers on stop credit with open orders", count: String(stopCreditOpen) },
    { what: "Splits waiting on truck assignment", count: String(splitsWaiting) },
  ];

  const periodLabel = period === "today" ? "Today" : period === "week" ? "This week" : "This month";
  void unitPrice;
  void specials;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12, maxWidth: 1400 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
        <Tabs
          items={[
            { id: "today", label: "Today" },
            { id: "week", label: "This week" },
            { id: "month", label: "This month" },
          ]}
          activeId={period}
          onSelect={setPeriod}
          variant="segmented"
          style={{ width: 300, flexShrink: 0 }}
        />
        <div style={{ fontSize: 12, color: "var(--text-faint)", flex: "1 1 200px", minWidth: 0 }}>
          {inRange.length} orders placed {periodLabel.toLowerCase()}
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(170px,1fr))", gap: 10 }}>
        <StatCard label="Orders" value={String(inRange.length)} icon="shopping-cart" tone="neutral" />
        <StatCard label="Revenue" value={AUD0(revenue)} icon="dollar-sign" tone="success" />
        <StatCard label="Avg order" value={inRange.length ? AUD0(revenue / inRange.length) : "$0"} icon="chart-column" tone="neutral" />
        <StatCard label="Lines moved" value={String(movement.length)} icon="package" tone="info" />
        <StatCard label="On the road" value={String(onRoad)} icon="truck" tone="info" />
        <StatCard label="Unpaid" value={AUD0(unpaid)} icon="wallet" tone="danger" />
      </div>

      <Card
        title="Product movement"
        subtitle={
          metric === "qty"
            ? `What left the yard ${periodLabel.toLowerCase()} — bars compare within each unit, since a tonne is not a cubic metre`
            : `What left the yard ${periodLabel.toLowerCase()}, biggest earner first`
        }
        padding="default"
        style={{ minWidth: 0 }}
      >
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
            <Tabs
              items={[
                { id: "qty", label: "By quantity" },
                { id: "revenue", label: "By revenue" },
              ]}
              activeId={metric}
              onSelect={setMetric}
              variant="segmented"
              style={{ width: 220, flexShrink: 0 }}
            />
            <Select
              size="sm"
              options={["All categories", ...categories.map((c) => c.name)]}
              value={analyticsCat}
              onChange={(e: any) => setAnalyticsCat(e.target.value)}
              style={{ width: 180, flexShrink: 0 }}
            />
            <div style={{ flex: 1 }} />
            <div style={{ display: "flex", alignItems: "baseline", gap: 6 }}>
              <span className="tabular" style={{ fontSize: 18, fontWeight: 600, color: "var(--text-primary)" }}>
                {AUD0(movedRevenue)}
              </span>
              <span style={{ fontSize: 12, color: "var(--text-faint)" }}>
                {unitTotals.length ? unitTotals.join(" · ") : "nothing"}
              </span>
            </div>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
            {movement.map((m) => {
              const pct = Math.max(
                2,
                Math.round((metric === "qty" ? m.q / (maxPerUnit[m.p.unit] || 1) : m.revenue / movedMax) * 100)
              );
              return (
                <div
                  key={m.p.id}
                  style={{ display: "grid", gridTemplateColumns: "minmax(0,1.4fr) minmax(90px,0.5fr) minmax(0,2fr) minmax(80px,auto)", gap: 10, alignItems: "center" }}
                >
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontSize: 13, color: "var(--text-primary)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {m.p.name}
                    </div>
                    <div style={{ fontSize: 11, color: "var(--text-faint)" }}>{catName(m.p.category_id)}</div>
                  </div>
                  <span className="tabular" style={{ fontSize: 12, color: "var(--text-muted)", textAlign: "right", whiteSpace: "nowrap" }}>
                    {qtyText(m.q, m.p.unit)}
                  </span>
                  <div style={{ height: 8, borderRadius: 9999, background: "var(--bg-sunken)", overflow: "hidden" }}>
                    <div
                      style={{
                        height: "100%",
                        width: pct + "%",
                        background: Number(m.p.stock) < m.q ? "var(--feedback-warning)" : "var(--brand-primary)",
                        borderRadius: 9999,
                      }}
                    />
                  </div>
                  <span className="tabular" style={{ fontSize: 13, fontWeight: 600, color: "var(--text-primary)", textAlign: "right", whiteSpace: "nowrap" }}>
                    {AUD0(m.revenue)}
                  </span>
                </div>
              );
            })}
            {movement.length === 0 && (
              <div style={{ padding: "20px 8px", textAlign: "center", fontSize: 12, color: "var(--text-faint)" }}>
                Nothing moved in {analyticsCat} over this period.
              </div>
            )}
          </div>
        </div>
      </Card>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(300px,1fr))", gap: 12, alignItems: "start" }}>
        <Card title="By category" subtitle={unitTotals.join(" · ") + " moved"} padding="default" style={{ minWidth: 0 }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 9 }}>
            {catTotals.map((c) => (
              <div key={c.name} style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                <div style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
                  <span style={{ fontSize: 12, color: "var(--text-primary)" }}>{c.name}</span>
                  <span style={{ fontSize: 11, color: "var(--text-faint)" }}>{c.units}</span>
                  <span className="tabular" style={{ marginLeft: "auto", fontSize: 12, fontWeight: 600, color: "var(--text-primary)" }}>
                    {AUD0(c.revenue)}
                  </span>
                  <span className="tabular" style={{ fontSize: 11, color: "var(--text-faint)", width: 38, textAlign: "right" }}>
                    {Math.round((c.revenue / catRevTotal) * 100)}%
                  </span>
                </div>
                <div style={{ height: 6, borderRadius: 9999, background: "var(--bg-sunken)", overflow: "hidden" }}>
                  <div style={{ height: "100%", width: Math.max(2, Math.round((c.revenue / catRevTotal) * 100)) + "%", background: "var(--brand-primary)", borderRadius: 9999 }} />
                </div>
              </div>
            ))}
            {catTotals.length === 0 && (
              <div style={{ padding: "16px 8px", textAlign: "center", fontSize: 12, color: "var(--text-faint)" }}>
                Nothing moved yet in this period.
              </div>
            )}
          </div>
        </Card>

        <Card title="Stock to watch" subtitle="On hand against what this period moved" padding="none" style={{ minWidth: 0 }}>
          <div style={{ overflowX: "auto" }}>
            <DataTable
              columns={[
                { key: "name", header: "Product" },
                { key: "moved", header: "Moved", numeric: true, align: "right", width: 110 },
                { key: "stock", header: "On hand", numeric: true, align: "right", width: 110 },
                { key: "cover", header: "Cover", width: 110 },
              ]}
              rows={stockRows}
              dense
              emptyMessage="Nothing moved yet"
            />
          </div>
        </Card>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(340px,1fr))", gap: 12, alignItems: "start" }}>
        <Card title="Today's run" subtitle="Every open delivery, in time order" padding="none" style={{ minWidth: 0 }}>
          <div style={{ overflowX: "auto" }}>
            <DataTable
              columns={[
                { key: "time", header: "Window", width: 130 },
                { key: "number", header: "Order", mono: true, width: 140 },
                { key: "customer", header: "Customer" },
                { key: "suburb", header: "Suburb", muted: true, width: 130 },
                { key: "truck", header: "Truck", muted: true, width: 150 },
                { key: "total", header: "Total", numeric: true, align: "right", width: 110 },
              ]}
              rows={runRows}
              dense
              onRowClick={(row: any) =>
                ui.openOrderDrawer(row._order.kind === "split" ? null : row._order.id, row._order.kind === "split" ? row._order.parent_order_id : null)
              }
              emptyMessage="No open deliveries"
            />
          </div>
        </Card>
        <div style={{ display: "flex", flexDirection: "column", gap: 12, minWidth: 0 }}>
          {noBilling > 0 && (
            <Alert tone="danger" title={`${noBilling} account order${noBilling === 1 ? " has" : "s have"} no billing relationship`}>
              They will not appear on this month's statements until it is set. Open the list to fix them.
            </Alert>
          )}
          <Card title="Needs attention" padding="none">
            <div style={{ overflowX: "auto" }}>
              <DataTable
                columns={[
                  { key: "what", header: "Issue" },
                  { key: "count", header: "Count", numeric: true, align: "right", width: 80 },
                ]}
                rows={attnRows}
                dense
              />
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}

void shortDate;
