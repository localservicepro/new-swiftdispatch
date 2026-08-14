import React, { useMemo, useState } from "react";
import { useApp } from "../store/store";
import { AUD, qtyText } from "../lib/domain";
import { Button, Card, DataTable, Select } from "../design-system/components.js";

export default function Reports() {
  const { orders, orderItems, customers, products, suburbs, team } = useApp();
  const [report, setReport] = useState("Product sales by customer");
  const [range, setRange] = useState("This month");

  const rangeStart = useMemo(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    if (range === "This week") d.setDate(d.getDate() - ((d.getDay() + 6) % 7));
    else if (range === "This month") d.setDate(1);
    else if (range === "All time") return new Date(0);
    return d;
  }, [range]);

  const live = orders.filter((o) => !o.deleted_at && o.kind !== "master" && new Date(o.placed_at) >= rangeStart);

  const { cols, rows } = useMemo(() => {
    if (report === "Product sales by customer") {
      const agg: Record<string, { customer: string; product: string; unit: string; qty: number; orders: Set<string>; revenue: number }> = {};
      live.forEach((o) => {
        const cName = customers.find((c) => c.id === o.customer_id)?.name || o.walk_in_name || "Walk-in";
        (orderItems[o.id] || []).forEach((i) => {
          const p = products.find((x) => x.id === i.product_id);
          if (!p || Number(i.qty) <= 0) return;
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
      };
    }
    if (report === "Sales by suburb") {
      const agg: Record<string, { suburb: string; orders: number; revenue: number }> = {};
      live.forEach((o) => {
        const name = suburbs.find((s) => s.id === o.suburb_id)?.name || "Pickup / no suburb";
        const a = (agg[name] = agg[name] || { suburb: name, orders: 0, revenue: 0 });
        a.orders += 1;
        a.revenue += (orderItems[o.id] || []).reduce((s, i) => s + Number(i.line_total), 0) + Number(o.delivery_fee || 0);
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
      };
    }
    // Driver delivery counts
    const agg: Record<string, { driver: string; jobs: number; delivered: number }> = {};
    live.forEach((o) => {
      if (!o.driver_id) return;
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
    };
  }, [report, live, orderItems, customers, products, suburbs, team]);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
        <Select
          size="sm"
          options={["Product sales by customer", "Sales by suburb", "Driver delivery counts"]}
          value={report}
          onChange={(e: any) => setReport(e.target.value)}
          style={{ width: 260, flexShrink: 0 }}
        />
        <Select size="sm" options={["Today", "This week", "This month", "All time"]} value={range} onChange={(e: any) => setRange(e.target.value)} style={{ width: 150, flexShrink: 0 }} />
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
            a.download = report.toLowerCase().replace(/ /g, "-") + ".csv";
            a.click();
          }}
        >
          Export CSV
        </Button>
      </div>
      <Card padding="none">
        <div style={{ overflowX: "auto" }}>
          <DataTable columns={cols} rows={rows} dense emptyMessage="Nothing in this range yet" />
        </div>
      </Card>
    </div>
  );
}
