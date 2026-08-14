import React, { useMemo, useState } from "react";
import { useApp } from "../store/store";
import { useUi } from "../store/ui";
import {
  AUD,
  AUD0,
  deliverySortKey,
  feeOf,
  goodsOf,
  LANES,
  orderTotal,
  placedText,
  shortDate,
  suburbRate,
} from "../lib/domain";
import type { Order, OrderStatus } from "../lib/types";
import { assignCrew, moveOrder } from "../data/api";
import { Card, DataTable, Icon, Input, OrderCard, Select, Tabs, Button } from "../design-system/components.js";

export default function Board() {
  const ui = useUi();
  const { orders, orderItems, suburbs, customers, trucks, team } = useApp();
  const [view, setView] = useState<"kanban" | "list">("kanban");
  const [query, setQuery] = useState("");
  const [dragging, setDragging] = useState<{ id: string; from: OrderStatus } | null>(null);
  const [assignTruck, setAssignTruck] = useState<string>("");
  const [assignDriver, setAssignDriver] = useState<string>("");

  const live = useMemo(
    () => orders.filter((o) => !o.deleted_at && o.kind !== "master" && o.status !== "cancelled" && o.status !== "ready_for_pickup"),
    [orders]
  );

  const masters = useMemo(() => new Map(orders.filter((o) => o.kind === "master").map((o) => [o.id, o])), [orders]);
  const customerOf = (o: Order) => customers.find((c) => c.id === o.customer_id);
  const truckLabel = (id: string | null) => {
    const t = trucks.find((x) => x.id === id);
    return t ? `${t.rego}` : undefined;
  };
  const driverLabel = (id: string | null) => team.find((x) => x.id === id)?.name;

  const q = query.trim().toLowerCase();
  const matches = (o: Order) => {
    if (!q) return true;
    const c = customerOf(o);
    const hay = [
      o.order_number,
      c?.name,
      o.walk_in_name,
      o.po_number,
      ...(c?.contacts.map((ct) => `${ct.name} ${ct.phone || ""}`) || []),
    ]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();
    return hay.includes(q);
  };

  const totalOf = (o: Order) => orderTotal(o, orderItems[o.id] || [], suburbs);

  let boardCount = 0;
  let boardValue = 0;

  const lanes = LANES.map((lane) => {
    const cards = live
      .filter((o) => o.status === lane.id && matches(o))
      .sort((a, b) => deliverySortKey(a) - deliverySortKey(b));
    const value = cards.reduce((s, c) => s + totalOf(c), 0);
    boardCount += cards.length;
    boardValue += value;
    const unassigned = lane.id === "loading" ? cards.filter((c) => !(c.truck_id && c.driver_id)).length : 0;
    return { ...lane, cards, value, unassigned };
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
    { key: "stage", header: "Stage", width: 150 },
    { key: "number", header: "Order", mono: true, width: 150 },
    { key: "customer", header: "Customer" },
    { key: "window", header: "Window", muted: true, width: 180 },
    { key: "truck", header: "Truck", muted: true, width: 150 },
    { key: "total", header: "Total", numeric: true, align: "right", width: 110 },
  ];
  const boardRows = lanes.flatMap((lane) =>
    lane.cards.map((c) => ({
      _order: c,
      stage: lane.title,
      number: c.order_number,
      customer: customerOf(c)?.name || c.walk_in_name || "Walk-in",
      window: `${shortDate(c.delivery_date)} · ${c.delivery_window || ""}`,
      truck: truckLabel(c.truck_id) || "Unassigned",
      total: AUD(totalOf(c)),
    }))
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
            placeholder="Order no, customer, PO, phone"
            value={query}
            onChange={(e: any) => setQuery(e.target.value)}
          />
        </div>
        <Select size="sm" options={["Today", "This week", "This month", "All time"]} value="All time" onChange={() => {}} style={{ width: 130, flexShrink: 0 }} />
        <Select
          size="sm"
          options={["Delivery time — oldest first", "Placed — newest first", "Value — highest first"]}
          value="Delivery time — oldest first"
          onChange={() => {}}
          style={{ width: 240, flexShrink: 0 }}
        />
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
                style={{ flex: "1 1 320px", minWidth: 320, maxWidth: 420, display: "flex", flexDirection: "column", minHeight: 0 }}
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
                    return (
                      <div
                        key={o.id}
                        draggable
                        onDragStart={() => setDragging({ id: o.id, from: lane.id })}
                        onDragEnd={() => setDragging(null)}
                        style={{
                          cursor: "grab",
                          opacity: dragging && dragging.id === o.id ? 0.35 : 1,
                          borderRadius: 10,
                          padding: isSplit ? "8px 0 0" : 0,
                          background: isSplit ? "var(--om-split-bg)" : "transparent",
                          borderTop: `1px solid ${isSplit ? "var(--om-split-border)" : "transparent"}`,
                          borderBottom: `1px solid ${isSplit ? "var(--om-split-border)" : "transparent"}`,
                        }}
                      >
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
                      </div>
                    );
                  })}
                  {lane.cards.length === 0 && (
                    <div style={{ padding: "28px 12px", textAlign: "center", fontSize: 12, color: "var(--text-faint)" }}>
                      Nothing in this stage. Drag a card here.
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {view === "list" && (
        <Card padding="none">
          <div style={{ overflowX: "auto" }}>
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
                options={team.filter((t) => t.role === "driver").map((t) => ({ value: t.id, label: t.name }))}
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
