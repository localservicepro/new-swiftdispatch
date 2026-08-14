import React, { useMemo, useState } from "react";
import { useApp } from "../store/store";
import { useUi } from "../store/ui";
import { AUD, deliverySortKey, goodsOf, orderTotal, placedText, shortDate } from "../lib/domain";
import type { Order, OrderStatus } from "../lib/types";
import { Button, Card, DataTable, Input, Select } from "../design-system/components.js";

const STATUS_LABEL: Record<OrderStatus, string> = {
  requested: "Requested",
  preparing: "Preparing",
  loading: "Loading",
  en_route: "En route",
  delivered: "Delivered",
  on_hold: "On hold",
  cancelled: "Cancelled",
  ready_for_pickup: "Ready for pickup",
};

export default function Orders() {
  const ui = useUi();
  const { orders, orderItems, suburbs, customers } = useApp();
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("All statuses");

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase();
    const list = orders
      .filter((o) => !o.deleted_at && o.kind !== "split")
      .filter((o) => {
        if (statusFilter !== "All statuses" && STATUS_LABEL[o.status] !== statusFilter) return false;
        if (!q) return true;
        const c = customers.find((x) => x.id === o.customer_id);
        return [o.order_number, c?.name, o.walk_in_name, o.po_number, ...(c?.contacts.map((ct) => ct.phone || "") || [])]
          .filter(Boolean)
          .join(" ")
          .toLowerCase()
          .includes(q);
      })
      .sort((a, b) => deliverySortKey(a) - deliverySortKey(b));

    return list.map((o) => {
      const c = customers.find((x) => x.id === o.customer_id);
      const isMaster = o.kind === "master";
      const splits = isMaster ? orders.filter((x) => x.parent_order_id === o.id && !x.deleted_at) : [];
      const total = isMaster
        ? splits.reduce((s, x) => s + orderTotal(x, orderItems[x.id] || [], suburbs), 0) + goodsOf(orderItems[o.id] || [])
        : orderTotal(o, orderItems[o.id] || [], suburbs);
      return {
        _order: o,
        active:
          o.order_number === ui.lastOpenedOrder ? (
            <span style={{ display: "inline-block", width: 6, height: 6, borderRadius: 3, background: "var(--brand-primary)" }} />
          ) : null,
        number: isMaster ? "MO — " + o.order_number : o.order_number,
        customer: c?.name || o.walk_in_name || "Walk-in",
        type: c ? (c.billing === "account" ? "Account" : c.tier) : "Walk-in",
        window: `${shortDate(o.delivery_date)} · ${isMaster ? "split" : o.delivery_window || ""}`,
        placed: placedText(o.placed_at),
        status: STATUS_LABEL[o.status],
        payment: o.payment_status[0].toUpperCase() + o.payment_status.slice(1),
        total: AUD(total),
      };
    });
  }, [orders, orderItems, suburbs, customers, query, statusFilter, ui.lastOpenedOrder]);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
        <div style={{ flex: "1 1 260px", minWidth: 220 }}>
          <Input size="sm" icon="search" placeholder="Order no, customer, PO, phone" value={query} onChange={(e: any) => setQuery(e.target.value)} />
        </div>
        <Select
          size="sm"
          options={["All statuses", ...Object.values(STATUS_LABEL)]}
          value={statusFilter}
          onChange={(e: any) => setStatusFilter(e.target.value)}
          style={{ width: 170, flexShrink: 0 }}
        />
        <Select size="sm" options={["Today", "This week", "This month", "All time"]} value="All time" onChange={() => {}} style={{ width: 140, flexShrink: 0 }} />
        <Button variant="ghost" size="sm" iconLeft="download">
          Export
        </Button>
      </div>
      <div style={{ fontSize: 12, color: "var(--text-faint)" }}>
        Click any row to open it in the side panel — the list stays where it is.
      </div>
      <Card padding="none">
        <div style={{ overflowX: "auto" }}>
          <DataTable
            columns={[
              { key: "active", header: "", width: 18 },
              { key: "number", header: "Order", mono: true, width: 160 },
              { key: "customer", header: "Customer" },
              { key: "type", header: "Type", muted: true, width: 110 },
              { key: "window", header: "Delivery window", muted: true, width: 190 },
              { key: "placed", header: "Placed", muted: true, width: 150 },
              { key: "status", header: "Status", width: 130 },
              { key: "payment", header: "Payment", width: 110 },
              { key: "total", header: "Total", numeric: true, align: "right", width: 110 },
            ]}
            rows={rows}
            dense
            onRowClick={(row: any) => {
              const o: Order = row._order;
              ui.set({ lastOpenedOrder: o.order_number });
              ui.openOrderDrawer(o.kind === "master" ? null : o.id, o.kind === "master" ? o.id : null);
            }}
          />
        </div>
      </Card>
    </div>
  );
}
