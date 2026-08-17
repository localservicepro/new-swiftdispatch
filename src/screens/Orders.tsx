import React, { useEffect, useMemo, useState } from "react";
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

const PERIODS = ["Today", "This week", "This month", "All time"] as const;
type Period = (typeof PERIODS)[number];

const PAGE_SIZES = [50, 100, 250];

/* The yard has ten thousand orders and adds a few dozen a day, so this screen
   is built around three rules that only start to matter at that size:

   nothing scans a list inside a loop — customers and splits are looked up
   through maps built once per load, not with .find() per row;

   the search text for an order is assembled once and reused on every
   keystroke, rather than re-joined for all ten thousand;

   and only the rows on screen are turned into cells. Sorting and filtering
   still run over everything, which is fast — it was the per-row work and the
   ten thousand <tr>s that made it crawl. */

export default function Orders() {
  const ui = useUi();
  const { orders, orderItems, suburbs, customers, paySettings } = useApp();
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("All statuses");
  const [period, setPeriod] = useState<Period>("All time");
  const [pageSize, setPageSize] = useState(PAGE_SIZES[0]);
  const [page, setPage] = useState(1);

  const custById = useMemo(() => new Map(customers.map((c) => [c.id, c])), [customers]);

  const splitsByParent = useMemo(() => {
    const m = new Map<string, Order[]>();
    for (const o of orders) {
      if (o.kind !== "split" || o.deleted_at || !o.parent_order_id) continue;
      const list = m.get(o.parent_order_id);
      if (list) list.push(o);
      else m.set(o.parent_order_id, [o]);
    }
    return m;
  }, [orders]);

  /* Order number, customer, walk-in name, PO and every contact phone, lowered
     and joined once. Typing then costs one substring test per order. */
  const haystack = useMemo(() => {
    const m = new Map<string, string>();
    for (const o of orders) {
      const c = o.customer_id ? custById.get(o.customer_id) : undefined;
      let s = `${o.order_number} ${c?.name || ""} ${o.walk_in_name || ""} ${o.po_number || ""}`;
      if (c?.contacts?.length) for (const ct of c.contacts) if (ct.phone) s += ` ${ct.phone}`;
      m.set(o.id, s.toLowerCase());
    }
    return m;
  }, [orders, custById]);

  const inPeriod = useMemo(() => {
    if (period === "All time") return () => true;
    const now = new Date();
    const start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    if (period === "This week") start.setDate(start.getDate() - start.getDay());
    if (period === "This month") start.setDate(1);
    const end = new Date(start);
    if (period === "Today") end.setDate(end.getDate() + 1);
    if (period === "This week") end.setDate(end.getDate() + 7);
    if (period === "This month") end.setMonth(end.getMonth() + 1);
    const from = start.getTime();
    const to = end.getTime();
    return (o: Order) => {
      /* An order with no delivery date yet is placed somewhere, and that is the
         date it belongs under. */
      const t = o.delivery_date ? new Date(o.delivery_date + "T00:00:00").getTime() : new Date(o.placed_at).getTime();
      return t >= from && t < to;
    };
  }, [period]);

  const matched = useMemo(() => {
    const q = query.trim().toLowerCase();
    const out: Order[] = [];
    for (const o of orders) {
      if (o.deleted_at || o.kind === "split") continue;
      if (statusFilter !== "All statuses" && STATUS_LABEL[o.status] !== statusFilter) continue;
      if (!inPeriod(o)) continue;
      if (q && !haystack.get(o.id)?.includes(q)) continue;
      out.push(o);
    }
    /* Newest delivery first. Ascending was right when the list was a single
       day's work; over four years of history it opens on 2021. */
    out.sort((a, b) => deliverySortKey(b) - deliverySortKey(a));
    return out;
  }, [orders, statusFilter, inPeriod, query, haystack]);

  const pageCount = Math.max(1, Math.ceil(matched.length / pageSize));
  /* Filters narrowing under your feet should not leave you on a page that no
     longer exists. */
  useEffect(() => setPage(1), [query, statusFilter, period, pageSize]);
  const current = Math.min(page, pageCount);
  const from = (current - 1) * pageSize;
  const shown = useMemo(() => matched.slice(from, from + pageSize), [matched, from, pageSize]);

  const rows = useMemo(
    () =>
      shown.map((o) => {
        const c = o.customer_id ? custById.get(o.customer_id) : undefined;
        const isMaster = o.kind === "master";
        const splits = isMaster ? splitsByParent.get(o.id) || [] : [];
        const total = isMaster
          ? splits.reduce((s, x) => s + orderTotal(x, orderItems[x.id] || [], suburbs, paySettings), 0) +
            goodsOf(orderItems[o.id] || [])
          : orderTotal(o, orderItems[o.id] || [], suburbs, paySettings);
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
      }),
    [shown, custById, splitsByParent, orderItems, suburbs, paySettings, ui.lastOpenedOrder]
  );

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
        <Select
          size="sm"
          options={PERIODS as unknown as string[]}
          value={period}
          onChange={(e: any) => setPeriod(e.target.value as Period)}
          style={{ width: 140, flexShrink: 0 }}
        />
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
        <Pager
          total={matched.length}
          from={from}
          shown={shown.length}
          page={current}
          pageCount={pageCount}
          pageSize={pageSize}
          onPage={setPage}
          onPageSize={setPageSize}
        />
      </Card>
    </div>
  );
}

function Pager({
  total,
  from,
  shown,
  page,
  pageCount,
  pageSize,
  onPage,
  onPageSize,
}: {
  total: number;
  from: number;
  shown: number;
  page: number;
  pageCount: number;
  pageSize: number;
  onPage: (n: number) => void;
  onPageSize: (n: number) => void;
}) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 10,
        flexWrap: "wrap",
        padding: "10px 14px",
        borderTop: "1px solid var(--border-subtle)",
      }}
    >
      <span className="tabular" style={{ fontSize: 12, color: "var(--text-faint)" }}>
        {total === 0 ? "No orders" : `${(from + 1).toLocaleString()}–${(from + shown).toLocaleString()} of ${total.toLocaleString()}`}
      </span>
      <div style={{ flex: 1 }} />
      <Select
        size="sm"
        options={PAGE_SIZES.map((n) => `${n} per page`)}
        value={`${pageSize} per page`}
        onChange={(e: any) => onPageSize(Number(String(e.target.value).split(" ")[0]))}
        style={{ width: 130, flexShrink: 0 }}
      />
      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
        <Button variant="ghost" size="sm" iconLeft="chevron-left" disabled={page <= 1} onClick={() => onPage(page - 1)}>
          Previous
        </Button>
        <span className="tabular" style={{ fontSize: 12, color: "var(--text-faint)", minWidth: 88, textAlign: "center" }}>
          Page {page.toLocaleString()} of {pageCount.toLocaleString()}
        </span>
        <Button variant="ghost" size="sm" iconRight="chevron-right" disabled={page >= pageCount} onClick={() => onPage(page + 1)}>
          Next
        </Button>
      </div>
    </div>
  );
}
