import React, { useEffect, useMemo, useState } from "react";
import { useApp } from "../store/store";
import { useUi } from "../store/ui";
import {
  AUD,
  CLASS_STYLE,
  customerBadgeType,
  deliverySortKey,
  goodsOf,
  itemsText,
  orderTotal,
  placedText,
  shortDate,
} from "../lib/domain";
import { PAYMENT_METHOD_LABEL, type Order, type OrderStatus } from "../lib/types";
import { deleteOrder } from "../data/api";
import { Button, Card, DataTable, Icon, Input, Select } from "../design-system/components.js";
import HistoryNotice from "./HistoryNotice";
import { GoodsCell, NotesCell } from "./OrderLines";
import Confirm from "./Confirm";
import { useViewport } from "../lib/viewport";

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

const SORTS = ["Delivery — soonest first", "Delivery — latest first", "Placed — newest first"] as const;
type Sort = (typeof SORTS)[number];

const PAGE_SIZES = [100, 250, 500];

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
  const { tight } = useViewport();
  const { orders, orderItems, suburbs, customers, products, paySettings } = useApp();
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("All statuses");
  const [period, setPeriod] = useState<Period>("All time");
  const [sort, setSort] = useState<Sort>(SORTS[2]);
  const [pageSize, setPageSize] = useState(PAGE_SIZES[0]);
  const [page, setPage] = useState(1);
  const [confirmDelete, setConfirmDelete] = useState<Order | null>(null);

  const custById = useMemo(() => new Map(customers.map((c) => [c.id, c])), [customers]);
  const productById = useMemo(() => new Map(products.map((p) => [p.id, p])), [products]);
  const suburbById = useMemo(() => new Map(suburbs.map((s) => [s.id, s])), [suburbs]);

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

  /* Order number, customer, walk-in name, PO, delivery address and every
     contact phone, lowered and joined once. Typing then costs one substring
     test per order.

     The address is in there because half the time an order is remembered by
     where it went rather than who ordered it — "the one out on Reserve Road" —
     and until now that was the one thing the search could not find. */
  const haystack = useMemo(() => {
    const m = new Map<string, string>();
    for (const o of orders) {
      const c = o.customer_id ? custById.get(o.customer_id) : undefined;
      const sub = o.suburb_id ? suburbById.get(o.suburb_id) : undefined;
      let s = `${o.order_number} ${c?.name || ""} ${o.walk_in_name || ""} ${o.po_number || ""} ${o.street || ""} ${sub?.name || ""} ${sub?.postcode || ""}`;
      if (c?.contacts?.length) for (const ct of c.contacts) if (ct.phone) s += ` ${ct.phone}`;
      m.set(o.id, s.toLowerCase());
    }
    return m;
  }, [orders, custById, suburbById]);

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
    /* Newest first, by when it was taken. An order somebody has just written up
       is the one they are looking for — sorting by delivery date put it
       wherever its date fell, which on a Friday afternoon is halfway down next
       week. Both delivery sorts are still a click away. */
    if (sort === "Placed — newest first") out.sort((a, b) => Date.parse(b.placed_at) - Date.parse(a.placed_at));
    else if (sort === "Delivery — latest first") out.sort((a, b) => deliverySortKey(b) - deliverySortKey(a));
    else out.sort((a, b) => deliverySortKey(a) - deliverySortKey(b));
    return out;
  }, [orders, statusFilter, inPeriod, query, haystack, sort]);

  const pageCount = Math.max(1, Math.ceil(matched.length / pageSize));
  /* Filters narrowing under your feet should not leave you on a page that no
     longer exists. */
  useEffect(() => setPage(1), [query, statusFilter, period, pageSize, sort]);
  const current = Math.min(page, pageCount);
  const from = (current - 1) * pageSize;
  const shown = useMemo(() => matched.slice(from, from + pageSize), [matched, from, pageSize]);

  /* Anything written up in the last few minutes gets a mark, so whoever just
     took the order can see it landed rather than going hunting for it. */
  const freshAfter = Date.now() - 10 * 60 * 1000;

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
        /* A master holds no line items of its own — the goods are on its splits
           (house rule), so that is where the summary has to read from. */
        const items = isMaster ? splits.flatMap((x) => orderItems[x.id] || []) : orderItems[o.id] || [];
        const cls = customerBadgeType(c);
        const fresh = Date.parse(o.placed_at) > freshAfter;
        return {
          _order: o,
          active:
            o.order_number === ui.lastOpenedOrder ? (
              <span style={{ display: "inline-block", width: 6, height: 6, borderRadius: 3, background: "var(--brand-primary)" }} />
            ) : fresh ? (
              <span title="Written up in the last few minutes" style={{ display: "inline-block", width: 6, height: 6, borderRadius: 3, background: "var(--feedback-success)" }} />
            ) : null,
          number: isMaster ? "MO — " + o.order_number : o.order_number,
          customer: (
            <span style={{ display: "flex", alignItems: "center", gap: 6, minWidth: 0 }} title={`${CLASS_STYLE[cls].label} customer`}>
              <span style={{ width: 3, alignSelf: "stretch", minHeight: 14, borderRadius: 2, flexShrink: 0, background: CLASS_STYLE[cls].colour }} />
              <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {c?.name || o.walk_in_name || "Walk-in"}
              </span>
            </span>
          ),
          goods: <GoodsCell text={itemsText(items, productById)} count={items.length} />,
          notes: <NotesCell delivery={o.delivery_notes} order={o.order_notes} />,
          window: `${shortDate(o.delivery_date)} · ${isMaster ? "split" : o.delivery_window || ""}`,
          placed: placedText(o.placed_at),
          status: STATUS_LABEL[o.status],
          payment: o.payment_status[0].toUpperCase() + o.payment_status.slice(1),
          settles: o.payment_method ? PAYMENT_METHOD_LABEL[o.payment_method] || o.payment_method : "—",
          total: AUD(total),
          remove: (
            <span
              onClick={(e) => {
                e.stopPropagation();
                setConfirmDelete(o);
              }}
              title={`Delete ${o.order_number}`}
              style={{
                cursor: "pointer",
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                width: 22,
                height: 22,
                borderRadius: 5,
                color: "var(--text-faint)",
              }}
            >
              <Icon name="trash-2" size={12} />
            </span>
          ),
        };
      }),
    [shown, custById, productById, splitsByParent, orderItems, suburbs, paySettings, ui.lastOpenedOrder, freshAfter]
  );

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
        <div style={{ flex: "1 1 260px", minWidth: 200 }}>
          <Input
            size="sm"
            icon="search"
            placeholder="Order no, customer, address, PO, phone"
            value={query}
            onChange={(e: any) => setQuery(e.target.value)}
          />
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
        <Select
          size="sm"
          options={SORTS as unknown as string[]}
          value={sort}
          onChange={(e: any) => setSort(e.target.value as Sort)}
          style={{ width: 200, flexShrink: 0 }}
        />
        <Button variant="ghost" size="sm" iconLeft="download">
          Export
        </Button>
      </div>
      <HistoryNotice what="This list and its counts" />
      <div style={{ fontSize: 12, color: "var(--text-faint)" }}>
        Click any row to open it in the side panel — the list stays where it is.
      </div>
      <Card padding="none">
        <div style={{ overflowX: "auto" }}>
          <DataTable
            /* Split-screen drops the columns you can read off the order itself
               once it is open — when it was placed, and how it is being paid —
               and keeps the goods and the notes, which are the reason the list
               is worth reading at all. */
            columns={[
              { key: "active", header: "", width: 18 },
              { key: "number", header: "Order", mono: true, width: tight ? 128 : 150 },
              { key: "customer", header: "Customer", width: tight ? 130 : 170 },
              /* Given a floor rather than left to take the remainder: squeezed
                 into whatever is left of a split-screen pane it clamps to
                 three words a line, which is not a list of goods. The table
                 scrolls sideways instead — which it already did. */
              { key: "goods", header: "Goods", width: tight ? 200 : undefined },
              { key: "notes", header: "Notes", width: tight ? 150 : 190 },
              { key: "window", header: "Delivery window", muted: true, width: tight ? 130 : 165 },
              ...(tight ? [] : [{ key: "placed", header: "Placed", muted: true, width: 145 }]),
              { key: "status", header: "Status", width: tight ? 100 : 120 },
              ...(tight ? [] : [{ key: "payment", header: "Payment", width: 105 }]),
              ...(tight ? [] : [{ key: "settles", header: "Settles", muted: true, width: 110 }]),
              { key: "total", header: "Total", numeric: true, align: "right", width: 105 },
              { key: "remove", header: "", width: 34 },
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

      {confirmDelete && (
        <Confirm
          title={`Delete ${confirmDelete.kind === "master" ? "MO — " : ""}${confirmDelete.order_number}?`}
          confirmLabel="Delete order"
          onClose={() => setConfirmDelete(null)}
          onConfirm={() => {
            deleteOrder(confirmDelete.id);
            if (ui.selectedOrderId === confirmDelete.id || ui.drawerMasterId === confirmDelete.id)
              ui.set({ drawerOpen: false });
            setConfirmDelete(null);
          }}
        >
          It comes off this list, off the dispatch board and out of every total.{" "}
          {confirmDelete.kind === "master" && (splitsByParent.get(confirmDelete.id) || []).length > 0
            ? `The ${(splitsByParent.get(confirmDelete.id) || []).length} deliveries under it go with it. `
            : ""}
          The record itself is kept rather than destroyed, so anything already printed or sent to MYOB still reads.
        </Confirm>
      )}
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
        <Button variant="ghost" size="sm" iconLeft="arrow-left" disabled={page <= 1} onClick={() => onPage(page - 1)}>
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
