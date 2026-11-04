import React, { useMemo, useState } from "react";
import { useApp } from "../store/store";
import { AUD, qtyText } from "../lib/domain";
import { Button, Card, DataTable, Select } from "../design-system/components.js";
import HistoryNotice from "./HistoryNotice";
import ProductFilter from "./ProductFilter";
import DateRangeFields from "./DateRange";

const REPORTS = [
  "Item movement — out and still to go",
  "Product sales by customer",
  "Sales by suburb",
  "Driver delivery counts",
] as const;
type ReportName = (typeof REPORTS)[number];

export default function Reports() {
  const { orders, orderItems, customers, products, suburbs, team } = useApp();
  const [report, setReport] = useState<ReportName>(REPORTS[0]);
  const [range, setRange] = useState("This month");
  const [custom, setCustom] = useState({ from: "", to: "" });
  /* Empty means everything. One product narrows every report to that product,
     which is what the quarry question actually is: not "how did we go", but
     "how much 20mm is going out this week and do I need another load in". */
  const [productId, setProductId] = useState("");

  const rangeStart = useMemo(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    if (range === "This week") d.setDate(d.getDate() - ((d.getDay() + 6) % 7));
    else if (range === "This month") d.setDate(1);
    else if (range === "All time") return new Date(0);
    else if (range === "Custom range") return custom.from ? new Date(custom.from + "T00:00:00") : new Date(0);
    return d;
  }, [range, custom]);
  /* Exclusive end. Only a custom range has one — the presets all run to now. */
  const rangeEnd = useMemo(
    () => (range === "Custom range" && custom.to ? new Date(custom.to + "T00:00:00").getTime() + 86_400_000 : Infinity),
    [range, custom]
  );
  const inRange = (t: number) => t >= rangeStart.getTime() && t < rangeEnd;

  const live = orders.filter((o) => !o.deleted_at && o.kind !== "master" && inRange(new Date(o.placed_at).getTime()));

  const productName = products.find((p) => p.id === productId)?.name;
  const keeps = (pid: string | null) => !productId || pid === productId;

  const { cols, rows, footnote } = useMemo(() => {
    /* What has left the yard against what is still booked to leave it. The
       other reports look backwards from when an order was taken; this one is
       keyed on the delivery date, because a load booked for Thursday is the
       thing that decides whether a quarry truck is ordered on Wednesday. */
    if (report === "Item movement — out and still to go") {
      const today = new Date().toISOString().slice(0, 10);
      const agg: Record<
        string,
        { product: string; unit: string; gone: number; toGo: number; orders: Set<string>; revenue: number }
      > = {};
      orders.forEach((o) => {
        if (o.deleted_at || o.kind === "master") return;
        const when = o.delivery_date || o.placed_at.slice(0, 10);
        const upcoming = when >= today && o.status !== "delivered" && o.status !== "cancelled";
        if (o.status === "cancelled") return;
        /* The range is on the delivery date here, both columns. The yard
           asked for exactly this: "we very rarely need the full total of an
           item going out; much more useful to filter by the specific dates
           products are going out." A preset still lets every future booking
           through — there is no end to "this month" when asking what is still
           to go — but a custom range bounds both ends, so "what is booked for
           Thursday" is one question. */
        const t = new Date(when + "T00:00:00").getTime();
        if (range === "Custom range" ? !inRange(t) : !upcoming && t < rangeStart.getTime()) return;
        (orderItems[o.id] || []).forEach((i) => {
          const p = products.find((x) => x.id === i.product_id);
          if (!p || !keeps(p.id) || Number(i.qty) <= 0) return;
          const a = (agg[p.id] = agg[p.id] || {
            product: p.name,
            unit: p.unit,
            gone: 0,
            toGo: 0,
            orders: new Set<string>(),
            revenue: 0,
          });
          if (upcoming) a.toGo += Number(i.qty);
          else a.gone += Number(i.qty);
          a.orders.add(o.id);
          a.revenue += Number(i.line_total);
        });
      });
      return {
        cols: [
          { key: "product", header: "Product" },
          { key: "gone", header: "Gone out", numeric: true, align: "right", width: 130 },
          { key: "toGo", header: "Still to go", numeric: true, align: "right", width: 130 },
          { key: "orders", header: "Orders", numeric: true, align: "right", width: 90 },
          { key: "revenue", header: "Revenue", numeric: true, align: "right", width: 130 },
        ],
        rows: Object.values(agg)
          /* Sorted by what is still coming, not by what has been — the top of
             this list is the reorder list. */
          .sort((a, b) => b.toGo - a.toGo || b.gone - a.gone)
          .map((a) => ({
            product: a.product,
            gone: a.gone ? qtyText(a.gone, a.unit) : "—",
            toGo: a.toGo ? qtyText(a.toGo, a.unit) : "—",
            orders: String(a.orders.size),
            revenue: AUD(a.revenue),
          })),
        footnote:
          range === "Custom range"
            ? "Both columns are bounded by the delivery dates in your range: Gone out is what was delivered inside it, Still to go is what is booked inside it and not yet delivered."
            : "Gone out is everything delivered in the range. Still to go is every order booked for today or later that has not been delivered yet — counted however far ahead they are booked. Pick Custom range to bound both columns by delivery date.",
      };
    }

    if (report === "Product sales by customer") {
      const agg: Record<string, { customer: string; product: string; unit: string; qty: number; orders: Set<string>; revenue: number }> = {};
      live.forEach((o) => {
        const cName = customers.find((c) => c.id === o.customer_id)?.name || o.walk_in_name || "Walk-in";
        (orderItems[o.id] || []).forEach((i) => {
          const p = products.find((x) => x.id === i.product_id);
          if (!p || !keeps(p.id) || Number(i.qty) <= 0) return;
          const key = cName + "|" + p.id;
          const a = (agg[key] = agg[key] || { customer: cName, product: p.name, unit: p.unit, qty: 0, orders: new Set(), revenue: 0 });
          a.qty += Number(i.qty);
          a.orders.add(o.id);
          a.revenue += Number(i.line_total);
        });
      });
      return {
        cols: [
          { key: "customer", header: "Customer" },
          { key: "product", header: "Product" },
          { key: "qty", header: "Qty", numeric: true, align: "right", width: 100 },
          { key: "orders", header: "Orders", numeric: true, align: "right", width: 90 },
          { key: "revenue", header: "Revenue", numeric: true, align: "right", width: 130 },
        ],
        rows: Object.values(agg)
          .sort((a, b) => b.revenue - a.revenue)
          .map((a) => ({ customer: a.customer, product: a.product, qty: qtyText(a.qty, a.unit), orders: String(a.orders.size), revenue: AUD(a.revenue) })),
        footnote: "",
      };
    }

    if (report === "Sales by suburb") {
      const agg: Record<string, { suburb: string; orders: number; revenue: number }> = {};
      live.forEach((o) => {
        const items = (orderItems[o.id] || []).filter((i) => keeps(i.product_id));
        /* Filtered to one product, a suburb that never ordered it should not
           show up with a delivery fee and no goods against it. */
        if (productId && items.length === 0) return;
        const name = suburbs.find((s) => s.id === o.suburb_id)?.name || "Pickup / no suburb";
        const a = (agg[name] = agg[name] || { suburb: name, orders: 0, revenue: 0 });
        a.orders += 1;
        a.revenue += items.reduce((s, i) => s + Number(i.line_total), 0) + (productId ? 0 : Number(o.delivery_fee || 0));
      });
      return {
        cols: [
          { key: "suburb", header: "Suburb" },
          { key: "orders", header: "Orders", numeric: true, align: "right", width: 100 },
          { key: "revenue", header: "Revenue", numeric: true, align: "right", width: 130 },
        ],
        rows: Object.values(agg)
          .sort((a, b) => b.revenue - a.revenue)
          .map((a) => ({ suburb: a.suburb, orders: String(a.orders), revenue: AUD(a.revenue) })),
        footnote: productId ? "Delivery fees are left out when a single product is selected — the fee belongs to the order, not to the item." : "",
      };
    }

    // Driver delivery counts
    const agg: Record<string, { driver: string; jobs: number; delivered: number }> = {};
    live.forEach((o) => {
      if (!o.driver_id) return;
      if (productId && !(orderItems[o.id] || []).some((i) => keeps(i.product_id))) return;
      const name = team.find((t) => t.id === o.driver_id)?.name || "—";
      const a = (agg[name] = agg[name] || { driver: name, jobs: 0, delivered: 0 });
      a.jobs += 1;
      if (o.status === "delivered") a.delivered += 1;
    });
    return {
      cols: [
        { key: "driver", header: "Driver" },
        { key: "jobs", header: "Assigned", numeric: true, align: "right", width: 110 },
        { key: "delivered", header: "Delivered", numeric: true, align: "right", width: 110 },
      ],
      rows: Object.values(agg)
        .sort((a, b) => b.jobs - a.jobs)
        .map((a) => ({ driver: a.driver, jobs: String(a.jobs), delivered: String(a.delivered) })),
      footnote: "",
    };
  }, [report, live, orders, orderItems, customers, products, suburbs, team, productId, rangeStart, rangeEnd, range]);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      <HistoryNotice what="These reports" />
      <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
        <Select
          size="sm"
          options={REPORTS as unknown as string[]}
          value={report}
          onChange={(e: any) => setReport(e.target.value as ReportName)}
          style={{ width: 270, flexShrink: 0 }}
        />
        <Select size="sm" options={["Today", "This week", "This month", "All time", "Custom range"]} value={range} onChange={(e: any) => setRange(e.target.value)} style={{ width: 140, flexShrink: 0 }} />
        {range === "Custom range" && <DateRangeFields from={custom.from} to={custom.to} onChange={setCustom} />}
        <div style={{ flex: "1 1 220px", minWidth: 200 }}>
          <ProductFilter value={productId} onChange={setProductId} />
        </div>
        <Button
          variant="outline"
          size="sm"
          iconLeft="download"
          onClick={() => {
            const header = cols.map((c: any) => c.header).join(",");
            const body = rows.map((r: any) => cols.map((c: any) => `"${String(r[c.key]).replace(/"/g, '""')}"`).join(",")).join("\n");
            const blob = new Blob([header + "\n" + body], { type: "text/csv" });
            const a = document.createElement("a");
            a.href = URL.createObjectURL(blob);
            a.download = (report + (productName ? " " + productName : "")).toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") + ".csv";
            a.click();
          }}
        >
          Export CSV
        </Button>
      </div>
      {footnote && <div style={{ fontSize: 11.5, color: "var(--text-faint)", textWrap: "pretty" as any }}>{footnote}</div>}
      <Card padding="none">
        <div style={{ overflowX: "auto" }}>
          <DataTable
            columns={cols}
            rows={rows}
            dense
            emptyMessage={productName ? `No ${productName} moved in this range` : "Nothing in this range yet"}
          />
        </div>
      </Card>
    </div>
  );
}
