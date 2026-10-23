import React, { useMemo, useState } from "react";
import { useApp } from "../store/store";
import { useUi } from "../store/ui";
import {
  AUD,
  AUD0,
  CLASS_STYLE,
  customerBadgeType,
  deliverySortKey,
  feeOf,
  goodsOf,
  LANES,
  orderTotal,
  placedText,
  qtyText,
  shortDate,
  suburbRate,
} from "../lib/domain";
import { PAYMENT_METHOD_LABEL, type Order, type OrderStatus } from "../lib/types";
import { assignCrew, moveOrder } from "../data/api";
import { Card, DataTable, Icon, Input, OrderCard, Select, Tabs, Button } from "../design-system/components.js";
import { GoodsCell, NotesCell } from "./OrderLines";
import { itemsText } from "../lib/domain";
import { useViewport } from "../lib/viewport";

/* Cards drawn per lane before "Show more". The stage counts in the headers are
   always the real ones — this only bounds how much of a lane becomes DOM. */
const LANE_PAGE = 100;

const PERIODS = ["Today", "This week", "This month", "All time"] as const;
type Period = (typeof PERIODS)[number];
const SORTS = ["Delivery time — oldest first", "Placed — newest first", "Value — highest first"] as const;
type SortBy = (typeof SORTS)[number];

const inPeriodFactory = (period: Period) => {
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
    const t = o.delivery_date ? new Date(o.delivery_date + "T00:00:00").getTime() : new Date(o.placed_at).getTime();
    return t >= from && t < to;
  };
};

export default function Board() {
  const ui = useUi();
  const { tight } = useViewport();
  const { orders, orderItems, suburbs, customers, trucks, team, products, paySettings } = useApp();
  const [view, setView] = useState<"kanban" | "list">("kanban");
  const [query, setQuery] = useState("");
  const [dragging, setDragging] = useState<{ id: string; from: OrderStatus } | null>(null);
  /* How many cards each lane is currently drawing. A busy Monday can put a few
     hundred orders in one stage, and every card is a fair amount of DOM. */
  const [shown, setShown] = useState<Partial<Record<OrderStatus, number>>>({});
  const [assignTruck, setAssignTruck] = useState<string>("");
  const [assignDriver, setAssignDriver] = useState<string>("");
  /* These two controls had been on the screen since the first build with
     handlers that did nothing. Wired now: the period narrows by delivery date
     (an order with no date yet goes under the day it was placed), the sort
     reorders every lane. */
  const [period, setPeriod] = useState<Period>("All time");
  const [sortBy, setSortBy] = useState<SortBy>(SORTS[0]);

  const live = useMemo(
    () => orders.filter((o) => !o.deleted_at && o.kind !== "master" && o.status !== "cancelled" && o.status !== "ready_for_pickup"),
    [orders]
  );

  const masters = useMemo(() => new Map(orders.filter((o) => o.kind === "master").map((o) => [o.id, o])), [orders]);
  const custById = useMemo(() => new Map(customers.map((c) => [c.id, c])), [customers]);
  const customerOf = (o: Order) => (o.customer_id ? custById.get(o.customer_id) : undefined);
  const truckLabel = (id: string | null) => {
    const t = trucks.find((x) => x.id === id);
    return t ? `${t.rego}` : undefined;
  };
  const driverLabel = (id: string | null) => team.find((x) => x.id === id)?.name;

  /* Who can be put on a run. Not only the drivers: several people at the yard
     work the office as an admin and take a truck out when it is busy, and the
     list that left them off meant those jobs showed as unassigned all day. A
     driver is still listed as a driver — the role is what they mostly do, not a
     rule about who may hold a delivery. */
  const crewOptions = useMemo(
    () =>
      team
        .filter((t) => t.active && t.role !== "super_admin")
        .concat(team.filter((t) => t.active && t.role === "super_admin"))
        .map((t) => ({ value: t.id, label: t.role === "driver" ? t.name : `${t.name} — ${t.role === "admin" ? "admin" : "super admin"}` })),
    [team]
  );

  const productById = useMemo(() => new Map(products.map((p) => [p.id, p])), [products]);
  const classOf = (o: Order) => customerBadgeType(customerOf(o));

  const q = query.trim().toLowerCase();
  const matches = (o: Order) => {
    if (!q) return true;
    const c = customerOf(o);
    const hay = [
      o.order_number,
      c?.name,
      o.walk_in_name,
      o.po_number,
      /* Dispatch knows a job by where it is going at least as often as by who
         ordered it, so the street and suburb are searchable too. */
      o.street,
      suburbs.find((s) => s.id === o.suburb_id)?.name,
      ...(c?.contacts.map((ct) => `${ct.name} ${ct.phone || ""}`) || []),
    ]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();
    return hay.includes(q);
  };

  const totalOf = (o: Order) => orderTotal(o, orderItems[o.id] || [], suburbs, paySettings);

  let boardCount = 0;
  let boardValue = 0;

  const inPeriod = useMemo(() => inPeriodFactory(period), [period]);
  const compare = (a: Order, b: Order) => {
    if (sortBy === "Placed — newest first") return Date.parse(b.placed_at) - Date.parse(a.placed_at);
    if (sortBy === "Value — highest first") return totalOf(b) - totalOf(a);
    return deliverySortKey(a) - deliverySortKey(b);
  };

  const lanes = LANES.map((lane) => {
    const all = live
      .filter((o) => lane.statuses.includes(o.status) && inPeriod(o) && matches(o))
      .sort(compare);
    const value = all.reduce((s, c) => s + totalOf(c), 0);
    boardCount += all.length;
    boardValue += value;
    const unassigned = lane.id === "loading" ? all.filter((c) => !(c.truck_id && c.driver_id)).length : 0;
    /* The lane header still counts the whole stage — what is capped is how much
       of it gets built into cards. A column is worked from the top, so the
       oldest delivery window is what wants to be on screen. */
    const cards = all.slice(0, shown[lane.id] || LANE_PAGE);
    return { ...lane, cards, total: all.length, value, unassigned };
  });

  const assignTarget = ui.assignFor ? orders.find((o) => o.id === ui.assignFor) : null;

  const addressOf = (o: Order) => {
    if (o.method !== "delivery") return o.street || "Yard collection";
    const r = suburbRate(o.suburb_id, suburbs);
    const suburbName = suburbs.find((s) => s.id === o.suburb_id)?.name || "";
    return `${o.street || ""}${suburbName ? ", " + suburbName + " " + r.state + " " + r.postcode : ""}`;
  };

  const cardProps = (o: Order, lane: OrderStatus) => {
    const c = customerOf(o);
    const items = orderItems[o.id] || [];
    const master = o.parent_order_id ? masters.get(o.parent_order_id) : null;
    return {
      orderNumber: o.order_number,
      isSplit: o.kind === "split",
      customerName: c?.name || o.walk_in_name || "Walk-in",
      contactName: undefined,
      customerType: c ? (c.billing === "account" ? "account" : c.tier === "Trade" ? "trade" : "residential") : "residential",
      status: lane,
      paymentStatus: o.payment_status,
      method: o.method,
      address: addressOf(o),
      window: `${shortDate(o.delivery_date)} · ${o.delivery_window || ""}`,
      placedAt: placedText(o.placed_at),
      total: AUD(totalOf(o)),
      itemCount: items.length,
      truck: truckLabel(o.truck_id),
      driver: driverLabel(o.driver_id),
      notes: o.delivery_notes || undefined,
      stopCredit: c ? c.stop_credit || Number(c.balance) > Number(c.credit_limit) && c.billing === "account" : false,
      processed: !!o.processed_at,
      assignable: lane === "loading" && !(o.truck_id && o.driver_id),
      onAssign: () => {
        ui.set({ assignFor: o.id });
        setAssignTruck(o.truck_id || "");
        setAssignDriver(o.driver_id || "");
      },
      onClick: () =>
        ui.openOrderDrawer(o.kind === "split" ? null : o.id, o.kind === "split" ? o.parent_order_id : null),
      _master: master,
    };
  };

  const boardCols = [
    { key: "stage", header: "Stage", width: tight ? 110 : 130 },
    { key: "number", header: "Order", mono: true, width: tight ? 125 : 140 },
    { key: "customer", header: "Customer", width: tight ? 135 : 180 },
    { key: "goods", header: "Goods", width: tight ? 200 : undefined },
    { key: "notes", header: "Notes", width: tight ? 150 : 200 },
    { key: "window", header: "Window", muted: true, width: tight ? 125 : 150 },
    ...(tight ? [] : [{ key: "truck", header: "Truck", muted: true, width: 120 }]),
    ...(tight ? [] : [{ key: "settles", header: "Settles", muted: true, width: 105 }]),
    { key: "total", header: "Total", numeric: true, align: "right", width: 105 },
  ];
  const boardRows = lanes.flatMap((lane) =>
    lane.cards.map((c) => {
      const items = orderItems[c.id] || [];
      const cls = classOf(c);
      return {
        _order: c,
        stage: lane.title,
        number: c.order_number,
        customer: (
          <span style={{ display: "flex", alignItems: "center", gap: 6, minWidth: 0 }}>
            <span style={{ width: 3, alignSelf: "stretch", minHeight: 14, borderRadius: 2, flexShrink: 0, background: CLASS_STYLE[cls].colour }} />
            <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {customerOf(c)?.name || c.walk_in_name || "Walk-in"}
            </span>
          </span>
        ),
        goods: <GoodsCell text={itemsText(items, productById)} count={items.length} />,
        notes: <NotesCell delivery={c.delivery_notes} order={c.order_notes} />,
        window: `${shortDate(c.delivery_date)} · ${c.delivery_window || ""}`,
        truck: truckLabel(c.truck_id) || "Unassigned",
        settles: c.payment_method ? PAYMENT_METHOD_LABEL[c.payment_method] || c.payment_method : "—",
        total: AUD(totalOf(c)),
      };
    })
  );

  /* Dispatch works accounts first, then trade — a card's colour is who it is
     for, which is the thing the column cannot tell you. */
  const legend = (
    <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
      {(["account", "trade", "residential"] as const).map((k) => (
        <span key={k} style={{ display: "inline-flex", alignItems: "center", gap: 5, fontSize: 11, color: "var(--text-faint)" }}>
          <span style={{ width: 9, height: 3, borderRadius: 2, background: CLASS_STYLE[k].colour }} />
          {CLASS_STYLE[k].label}
        </span>
      ))}
    </div>
  );

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12, height: "100%", minHeight: 0 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
        <Tabs
          items={[
            { id: "kanban", label: "Board", icon: "target" },
            { id: "list", label: "List", icon: "list-filter" },
          ]}
          activeId={view}
          onSelect={setView}
          variant="segmented"
          style={{ width: 160, flexShrink: 0 }}
        />
        <div style={{ flex: "1 1 220px", minWidth: 200 }}>
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
          options={PERIODS as unknown as string[]}
          value={period}
          onChange={(e: any) => setPeriod(e.target.value as Period)}
          style={{ width: 130, flexShrink: 0 }}
        />
        <Select
          size="sm"
          options={SORTS as unknown as string[]}
          value={sortBy}
          onChange={(e: any) => setSortBy(e.target.value as SortBy)}
          style={{ width: 240, flexShrink: 0 }}
        />
        {legend}
        <div style={{ display: "flex", alignItems: "center", gap: 12, fontSize: 12, color: "var(--text-muted)", marginLeft: "auto" }}>
          <span>
            <span className="tabular" style={{ color: "var(--text-primary)", fontWeight: 600 }}>
              {boardCount}
            </span>{" "}
            orders
          </span>
          <span>
            <span className="tabular" style={{ color: "var(--text-primary)", fontWeight: 600 }}>
              {AUD0(boardValue)}
            </span>
          </span>
        </div>
      </div>

      {view === "kanban" && (
        <div style={{ flex: 1, minHeight: 420, display: "flex", gap: 12, overflowX: "auto", overflowY: "hidden", paddingBottom: 8 }}>
          {lanes.map((lane) => {
            const over = dragging && dragging.from !== lane.id;
            return (
              <div
                key={lane.id}
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => {
                  e.preventDefault();
                  if (!dragging) return;
                  if (dragging.from !== lane.id) moveOrder(dragging.id, lane.id);
                  const moved = orders.find((o) => o.id === dragging.id);
                  setDragging(null);
                  if (lane.id === "loading" && moved && !(moved.truck_id && moved.driver_id)) {
                    ui.set({ assignFor: dragging.id });
                    setAssignTruck(moved.truck_id || "");
                    setAssignDriver(moved.driver_id || "");
                  }
                }}
                style={{
                  flex: tight ? "1 1 265px" : "1 1 320px",
                  minWidth: tight ? 265 : 320,
                  maxWidth: 420,
                  display: "flex",
                  flexDirection: "column",
                  minHeight: 0,
                }}
              >
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, padding: "0 4px 8px" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, minWidth: 0 }}>
                    <span style={{ width: 8, height: 8, borderRadius: 2, flexShrink: 0, background: lane.accent }} />
                    <span style={{ fontSize: 12, fontWeight: 600, color: "var(--text-primary)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                      {lane.title}
                    </span>
                    <span className="tabular" style={{ fontSize: 11, color: "var(--text-faint)", background: "var(--surface-raised)", borderRadius: 9999, padding: "1px 7px" }}>
                      {lane.cards.length}
                    </span>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 6, flexShrink: 0 }}>
                    {lane.unassigned > 0 && (
                      <span
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          gap: 4,
                          fontSize: 11,
                          fontWeight: 600,
                          padding: "2px 7px",
                          borderRadius: 9999,
                          whiteSpace: "nowrap",
                          background: "color-mix(in srgb, var(--feedback-warning) 12%, transparent)",
                          color: "var(--feedback-warning)",
                        }}
                      >
                        <Icon name="triangle-alert" size={10} />
                        {lane.unassigned} need a crew
                      </span>
                    )}
                    <span className="tabular" style={{ fontSize: 11, color: "var(--text-faint)" }}>
                      {AUD0(lane.value)}
                    </span>
                  </div>
                </div>
                <div
                  style={{
                    flex: 1,
                    minHeight: 0,
                    overflowY: "auto",
                    display: "flex",
                    flexDirection: "column",
                    gap: 8,
                    padding: 8,
                    borderRadius: 12,
                    background: over ? "var(--om-drop-bg)" : "var(--bg-sunken)",
                    border: `1px dashed ${over ? "var(--border-accent)" : "transparent"}`,
                  }}
                >
                  {over && (
                    <div
                      style={{
                        padding: 9,
                        borderRadius: 8,
                        border: "1px dashed var(--border-accent)",
                        background: "var(--om-drop-bg)",
                        fontSize: 11,
                        fontWeight: 600,
                        textAlign: "center",
                        color: "var(--brand-primary)",
                      }}
                    >
                      Drop to move to {lane.title}
                    </div>
                  )}
                  {lane.cards.map((o) => {
                    const p = cardProps(o, lane.id);
                    const isSplit = o.kind === "split";
                    const master = p._master;
                    const siblings = master ? live.filter((x) => x.parent_order_id === master.id) : [];
                    const combined = master
                      ? siblings.reduce((s, x) => s + totalOf(x), 0) +
                        goodsOf(orderItems[master.id] || [])
                      : 0;
                    const cls = classOf(o);
                    const rail = CLASS_STYLE[cls].colour;
                    const unconfirmed = o.status === "requested";
                    return (
                      <div
                        key={o.id}
                        draggable
                        onDragStart={() => setDragging({ id: o.id, from: lane.id })}
                        onDragEnd={() => setDragging(null)}
                        title={`${CLASS_STYLE[cls].label} customer`}
                        style={{
                          cursor: "grab",
                          opacity: dragging && dragging.id === o.id ? 0.35 : 1,
                          borderRadius: 10,
                          /* The colour is who the order is for. The lane already
                             says what stage it is at, so the one thing a column
                             cannot tell you is the one the card is coloured by:
                             accounts go out first, then trade. */
                          borderLeft: `3px solid ${rail}`,
                          paddingLeft: 5,
                          padding: isSplit ? "8px 0 0 5px" : "0 0 0 5px",
                          background: isSplit ? "var(--om-split-bg)" : "transparent",
                          borderTop: `1px solid ${isSplit ? "var(--om-split-border)" : "transparent"}`,
                          borderBottom: `1px solid ${isSplit ? "var(--om-split-border)" : "transparent"}`,
                        }}
                      >
                        {unconfirmed && (
                          <div
                            style={{
                              display: "flex",
                              alignItems: "center",
                              gap: 5,
                              padding: "0 10px 6px",
                              fontSize: 11,
                              color: "var(--attention)",
                            }}
                          >
                            <Icon name="circle-alert" size={11} />
                            Raised by the customer — not confirmed yet
                          </div>
                        )}
                        {isSplit && master && (
                          <div
                            onClick={(e) => {
                              e.stopPropagation();
                              ui.openOrderDrawer(null, master.id, "splits");
                            }}
                            style={{ cursor: "pointer", display: "flex", alignItems: "center", gap: 6, padding: "0 10px 7px" }}
                          >
                            <Icon name="git-branch" size={12} color="var(--brand-secondary)" />
                            <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 12, fontWeight: 600, color: "var(--brand-secondary)" }}>
                              {o.order_number.slice(-1)}
                            </span>
                            <span style={{ fontSize: 12, color: "var(--text-faint)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                              of MO — {master.order_number}
                            </span>
                            <span className="tabular" style={{ marginLeft: "auto", fontSize: 12, color: "var(--text-faint)" }}>
                              {AUD(combined)}
                            </span>
                          </div>
                        )}
                        <OrderCard {...p} />
                        {/* How the order settles, which the card itself has no
                            slot for and the yard asked to see at a glance. */}
                        {o.payment_method && (
                          <div
                            style={{
                              display: "flex",
                              alignItems: "center",
                              gap: 5,
                              padding: "4px 10px 2px",
                              fontSize: 11,
                              color: "var(--text-faint)",
                            }}
                          >
                            <Icon name="credit-card" size={11} />
                            {PAYMENT_METHOD_LABEL[o.payment_method] || o.payment_method}
                          </div>
                        )}
                      </div>
                    );
                  })}
                  {lane.cards.length === 0 && (
                    <div style={{ padding: "28px 12px", textAlign: "center", fontSize: 12, color: "var(--text-faint)" }}>
                      Nothing in this stage. Drag a card here.
                    </div>
                  )}
                  {lane.total > lane.cards.length && (
                    <div style={{ padding: "4px 10px 10px" }}>
                      <Button
                        variant="ghost"
                        size="sm"
                        fullWidth
                        iconLeft="chevron-down"
                        onClick={() => setShown((s) => ({ ...s, [lane.id]: lane.cards.length + LANE_PAGE }))}
                      >
                        Show {Math.min(LANE_PAGE, lane.total - lane.cards.length)} more of {lane.total}
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {view === "list" && (
        /* The board is a fixed-height workspace — the kanban needs that, so the
           root is height:100%. A Card dropped into it is a flex item with the
           usual flex-shrink of 1, so it shrank to whatever space was left and
           its own overflow:hidden quietly cut the table off: the rows were
           there, drawn, and unreachable.

           It now takes the leftover height deliberately and scrolls inside it,
           which also keeps the search and the stage counts above it on screen
           instead of scrolling them away. minHeight:0 is the part that makes a
           flex child allowed to be shorter than its contents at all. */
        <Card
          padding="none"
          className="board-list-card"
          style={{ flex: 1, minHeight: 0, display: "flex", flexDirection: "column" }}
        >
          <div className="table-scroll" style={{ flex: 1, minHeight: 0, overflow: "auto" }}>
            <DataTable
              columns={boardCols}
              rows={boardRows}
              dense
              onRowClick={(row: any) => {
                const o: Order = row._order;
                ui.openOrderDrawer(o.kind === "split" ? null : o.id, o.kind === "split" ? o.parent_order_id : null);
              }}
            />
          </div>
        </Card>
      )}

      {/* Assign truck & driver — explicit, Loading lane only; never a drag side effect */}
      {ui.assignFor && assignTarget && (
        <div
          onClick={() => ui.set({ assignFor: null })}
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 26,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: 24,
            background: "var(--om-scrim)",
            backdropFilter: "blur(10px) saturate(140%)",
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              width: "min(440px,100%)",
              borderRadius: 16,
              background: "var(--surface-card)",
              border: "1px solid var(--border-default)",
              boxShadow: "var(--om-overlay-shadow)",
              overflow: "hidden",
            }}
          >
            <div style={{ padding: 16, borderBottom: "1px solid var(--border-subtle)" }}>
              <div style={{ fontSize: 15, fontWeight: 600, color: "var(--text-primary)" }}>
                Assign a crew to {assignTarget.order_number}
              </div>
              <div style={{ fontSize: 12, color: "var(--text-faint)", marginTop: 3 }}>
                {customerOf(assignTarget)?.name || assignTarget.walk_in_name} · {shortDate(assignTarget.delivery_date)} ·{" "}
                {assignTarget.delivery_window}
              </div>
            </div>
            <div style={{ padding: 16, display: "flex", flexDirection: "column", gap: 10 }}>
              <Select
                size="md"
                label="Truck"
                options={trucks.map((t) => ({ value: t.id, label: `${t.rego} — ${t.type}` }))}
                value={assignTruck}
                onChange={(e: any) => setAssignTruck(e.target.value)}
                allowUnset
                required
              />
              <Select
                size="md"
                label="Driver"
                options={crewOptions}
                value={assignDriver}
                onChange={(e: any) => setAssignDriver(e.target.value)}
                allowUnset
                required
              />
              <div style={{ fontSize: 11, color: "var(--text-faint)", textWrap: "pretty" as any }}>
                Moving a card never assigns a crew on its own. Nothing is written until you confirm here.
              </div>
            </div>
            <div style={{ padding: "12px 16px", borderTop: "1px solid var(--border-subtle)", display: "flex", gap: 8, justifyContent: "flex-end" }}>
              <Button variant="ghost" size="md" onClick={() => ui.set({ assignFor: null })}>
                Not yet
              </Button>
              <Button
                variant="primary"
                size="md"
                iconLeft="check"
                disabled={!(assignTruck && assignDriver)}
                onClick={() => {
                  assignCrew(ui.assignFor!, assignTruck, assignDriver);
                  ui.set({ assignFor: null });
                }}
              >
                Assign crew
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

void feeOf;
