import React from "react";
import { useApp } from "../store/store";
import { useUi, nextStatusOptions } from "../store/ui";
import {
  AUD,
  adjustmentOf,
  feeOf,
  resolvedSuburbFee,
  goodsOf,
  orderTotal,
  placedText,
  STATUS_ACCENT,
  suburbRate,
  qtyText,
  unitFor,
  dmy,
  isoFromDmy,
} from "../lib/domain";
import { PAYMENT_TYPE_LABEL, type Order } from "../lib/types";
import {
  addOrderItem,
  copyToAllSplits,
  markProcessed,
  moveOrder,
  patchOrder,
  patchSplit,
  printReceipt,
  removeOrderItem,
  resetSplitToMaster,
  setOrderItemQty,
  setOrderItemQtyTo,
  deleteOrder,
} from "../data/api";
import {
  AddressBlock,
  Alert,
  Badge,
  Button,
  Card,
  Icon,
  Input,
  PaymentSummary,
  Select,
  StatusBadge,
  Tabs,
  Textarea,
} from "../design-system/components.js";
import AddressSearch from "./AddressSearch";
import MyobPushButton from "./MyobPushButton";
import ProductSearchAdd from "./ProductSearchAdd";
import { PickerField } from "./DateWindowPicker";
import Confirm from "./Confirm";

export default function OrderDrawer() {
  const ui = useUi();
  const [confirmDelete, setConfirmDelete] = React.useState(false);

  /* Escape closes it. In a split-screen window the drawer covers the whole
     pane, so without this the only way out is to find the x or to click a strip
     of scrim that may not be there. */
  const drawerOpen = ui.drawerOpen;
  React.useEffect(() => {
    if (!drawerOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") ui.set({ drawerOpen: false });
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [drawerOpen]);
  const { orders, orderItems, suburbs, customers, trucks, team, paySettings } = useApp();

  const open = ui.drawerOpen;
  const sel = ui.selectedOrderId ? orders.find((o) => o.id === ui.selectedOrderId) : null;
  const master = ui.drawerMasterId ? orders.find((o) => o.id === ui.drawerMasterId) : null;
  const isMaster = !sel && !!master;
  const focus = sel || master;

  const splits = master ? orders.filter((o) => o.parent_order_id === master.id && !o.deleted_at) : [];
  const customer = focus ? customers.find((c) => c.id === focus.customer_id) : null;

  const totalOf = (o: Order) => orderTotal(o, orderItems[o.id] || [], suburbs, paySettings);
  const combined = master ? splits.reduce((s, x) => s + totalOf(x), 0) + goodsOf(orderItems[master.id] || []) : 0;

  const validTabs = isMaster ? ["splits", "items", "delivery", "payment"] : ["items", "delivery", "payment"];
  const tab = validTabs.includes(ui.drawerTab) ? ui.drawerTab : validTabs[0];

  const suburbName = (id: string | null) => suburbs.find((s) => s.id === id)?.name || "";
  const truckOptions = trucks.map((t) => ({ value: t.id, label: t.rego + " — " + t.type }));
  const driverOptions = team.filter((t) => t.role === "driver").map((t) => ({ value: t.id, label: t.name }));
  const suburbOptions = suburbs.filter((s) => s.active).map((s) => ({ value: s.id, label: s.name }));
  const { products } = useApp();

  const editTarget = sel || (isMaster ? master : null);
  const items = editTarget ? orderItems[editTarget.id] || [] : [];

  const feeNote = (o: Order) => {
    const rate = suburbRate(o.suburb_id, suburbs);
    const name = suburbName(o.suburb_id);
    if (!o.suburb_id) return "No suburb resolved — the delivery fee cannot be calculated.";
    if (rate.inactive) return `${name} is switched off in Suburbs, so no rate applies.`;
    if (o.fee_source === "suburb") {
      const r = resolvedSuburbFee(o.suburb_id, suburbs, paySettings);
      return r.markup > 0
        ? `From the ${name} rate (${AUD(r.base)}) + ${AUD(r.markup)} markup.`
        : `From the ${name} suburb rate (${AUD(r.base)}).`;
    }
    return `Set by hand — no longer tracking the ${name} rate of ${AUD(rate.fee)}.`;
  };

  const paymentSummaryProps = (o: Order) => {
    const its = orderItems[o.id] || [];
    return {
      lines: [
        { label: "Goods", value: AUD(goodsOf(its)) },
        {
          label:
            o.method === "delivery"
              ? "Delivery — " + (suburbName(o.suburb_id) || "no suburb")
              : "Pickup — no delivery fee",
          value: AUD(o.method === "delivery" ? feeOf(o, suburbs, paySettings) : 0),
        },
        ...(o.method === "delivery" && Number(o.fuel_surcharge) > 0
          ? [{ label: "Fuel surcharge", value: AUD(Number(o.fuel_surcharge)) }]
          : []),
        ...(() => {
          const adj = adjustmentOf(o, goodsOf(its));
          if (!adj) return [];
          return [
            {
              label:
                (o.adjustment_type === "percent" ? `Adjustment — ${Math.abs(Number(o.adjustment_value))}% ` : "Adjustment — ") +
                /* "Amendment", not "surcharge" — the fuel and card surcharges
                   are different things and sharing the word sent people looking
                   for a setting that was not involved. */
                (adj < 0 ? "discount" : "amendment"),
              value: (adj < 0 ? "−" : "+") + AUD(Math.abs(adj)),
              negative: adj < 0,
            },
          ];
        })(),
        { label: "Includes GST", value: AUD(totalOf(o) / 11) },
      ],
      total: AUD(totalOf(o)),
      paymentStatus: o.payment_status,
      paymentType: o.payment_type ? PAYMENT_TYPE_LABEL[o.payment_type] : undefined,
      paymentTypeSource: o.payment_type_overridden ? "override" : "customer",
      paymentMethod: o.payment_method ? o.payment_method.replace(/_/g, " ") : undefined,
      statementEligible: !!o.payment_type && o.payment_type !== "prepaid",
    };
  };

  const masterSummaryProps = master
    ? {
        lines: splits
          .map((s) => ({ label: "Split " + s.order_number.slice(-1), value: AUD(totalOf(s)) }))
          .concat(
            (orderItems[master.id] || []).map((i) => ({
              label: i.description || "Adjustment",
              value: (Number(i.line_total) < 0 ? "−" : "") + AUD(Math.abs(Number(i.line_total))),
              negative: Number(i.line_total) < 0,
            })) as any
          )
          .concat([{ label: "Includes GST", value: AUD(combined / 11) }]),
        total: AUD(combined),
        paymentStatus: master.payment_status,
        paymentType: master.payment_type ? PAYMENT_TYPE_LABEL[master.payment_type] : undefined,
        paymentTypeSource: "customer",
        paymentMethod: master.payment_method ? master.payment_method.replace(/_/g, " ") : undefined,
        statementEligible: !!master.payment_type && master.payment_type !== "prepaid",
      }
    : null;

  return (
    <>
      {open && (
        <div
          onClick={() => ui.set({ drawerOpen: false })}
          title="Click anywhere to close"
          style={{
            position: "absolute",
            inset: 0,
            zIndex: 14,
            background: "var(--om-scrim)",
            backdropFilter: "blur(10px) saturate(140%)",
            cursor: "pointer",
          }}
        />
      )}
      <div
        style={{
          position: "absolute",
          top: 0,
          right: 0,
          bottom: 0,
          zIndex: 15,
          width: "min(680px,100%)",
          background: "var(--surface-card)",
          borderLeft: "1px solid var(--border-default)",
          boxShadow: "var(--om-overlay-shadow)",
          display: "flex",
          flexDirection: "column",
          transform: `translateX(${open ? "0%" : "105%"})`,
          transition: "transform 320ms cubic-bezier(.16,1,.3,1)",
        }}
      >
        {focus && (
          <>
            <div
              style={{
                flexShrink: 0,
                padding: "14px 16px",
                borderBottom: "1px solid var(--border-subtle)",
                display: "flex",
                alignItems: "flex-start",
                gap: 12,
              }}
            >
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                  <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 15, fontWeight: 600, color: "var(--text-primary)" }}>
                    {isMaster ? "MO — " + focus.order_number : focus.order_number}
                  </span>
                  <StatusBadge kind="order" value={focus.status} />
                  <StatusBadge kind="payment" value={focus.payment_status} />
                </div>
                <div style={{ fontSize: 13, color: "var(--text-muted)", marginTop: 4 }}>
                  {(customer?.name || focus.walk_in_name || "Walk-in") +
                    (customer ? " · Acct " + customer.account_number : "") +
                    " · placed " +
                    placedText(focus.placed_at)}
                </div>
              </div>
              <div
                onClick={() => ui.set({ drawerOpen: false })}
                title="Close"
                style={{
                  cursor: "pointer",
                  width: 30,
                  height: 30,
                  flexShrink: 0,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  borderRadius: 6,
                  border: "1px solid var(--border-subtle)",
                  color: "var(--text-muted)",
                }}
              >
                <Icon name="x" size={15} />
              </div>
            </div>

            <div style={{ flexShrink: 0, padding: "10px 16px", borderBottom: "1px solid var(--border-subtle)", display: "flex", flexDirection: "column", gap: 10 }}>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                <Button variant="secondary" size="sm" iconLeft="printer" onClick={() => printReceipt(focus.id)}>
                  {isMaster && splits.length > 1 ? `Print ${splits.length} invoices` : "Print receipt"}
                </Button>
                {isMaster && splits.length > 1 && (
                  <Button variant="outline" size="sm" iconLeft="printer" onClick={() => printReceipt(focus.id, "combined")}>
                    Print as one invoice
                  </Button>
                )}
                <Button variant="outline" size="sm" iconLeft="file-text" onClick={() => markProcessed(focus.id)}>
                  {isMaster && splits.length > 1 ? `Run sheets — ${splits.length}` : "Run sheet"}
                </Button>
                <div style={{ flex: 1 }} />
                <Button variant="ghost" size="sm" iconLeft="trash-2" onClick={() => setConfirmDelete(true)}>
                  Delete
                </Button>
              </div>
              {/* Keyed so the doc-type choice and the re-send confirmation reset
                  when the drawer swaps to a different order. */}
              {!isMaster && sel && <MyobPushButton key={sel.id} order={sel} />}
            </div>

            <div style={{ flex: 1, overflowY: "auto", padding: 16, display: "flex", flexDirection: "column", gap: 12 }}>
              {focus.processed_at && (
                <Alert tone="warning" title="Already printed" icon="printer-check">
                  Run sheet already printed for this order at {placedText(focus.processed_at)}. Check with the yard
                  before printing again.
                </Alert>
              )}

              <Tabs
                items={(isMaster ? [{ id: "splits", label: "Splits", count: splits.length }] : []).concat([
                  { id: "items", label: "Items", count: items.length } as any,
                  { id: "delivery", label: "Delivery" } as any,
                  { id: "payment", label: "Payment" } as any,
                ])}
                activeId={tab}
                onSelect={(id: string) => ui.set({ drawerTab: id })}
                variant="underline"
              />

              {tab === "splits" && master && (
                <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                    <Button variant="outline" size="sm" iconLeft="map-pin" onClick={() => copyToAllSplits(master.id, "address")}>
                      Same address for all
                    </Button>
                    <Button variant="outline" size="sm" iconLeft="calendar" onClick={() => copyToAllSplits(master.id, "schedule")}>
                      Same date &amp; time for all
                    </Button>
                    <span className="tabular" style={{ marginLeft: "auto", fontSize: 13, color: "var(--text-primary)", fontWeight: 600 }}>
                      {AUD(combined)} combined
                    </span>
                  </div>

                  {splits.map((s) => {
                    const overridden = Object.keys(s.overrides || {}).length > 0;
                    const rate = suburbRate(s.suburb_id, suburbs);
                    const sItems = orderItems[s.id] || [];
                    return (
                      <Card key={s.id} padding="default" accent={STATUS_ACCENT[s.status]}>
                        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                          <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                            <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 13, fontWeight: 600, color: "var(--text-primary)" }}>
                              {s.order_number}
                            </span>
                            <Badge tone={overridden ? "warning" : "neutral"} outline>
                              {overridden ? "Overridden from master" : "Reading master"}
                            </Badge>
                            <span className="tabular" style={{ marginLeft: "auto", fontSize: 14, fontWeight: 600, color: "var(--text-primary)" }}>
                              {AUD(totalOf(s))}
                            </span>
                          </div>

                          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(150px,1fr))", gap: 8 }}>
                            <Select
                              size="sm"
                              label="Status"
                              options={nextStatusOptions}
                              value={s.status}
                              onChange={(e: any) => patchSplit(s.id, { status: e.target.value }, "status")}
                            />
                            <PickerField
                              label="Date"
                              icon="calendar"
                              value={dmy(s.delivery_date)}
                              onClick={() =>
                                ui.set({
                                  picker: {
                                    kind: "date",
                                    current: dmy(s.delivery_date),
                                    onPick: (v) => {
                                      const iso = isoFromDmy(v);
                                      if (iso) patchSplit(s.id, { delivery_date: iso }, "schedule");
                                    },
                                  },
                                })
                              }
                            />
                            <PickerField
                              label="Window"
                              icon="clock"
                              value={s.delivery_window || "Not set"}
                              onClick={() =>
                                ui.set({
                                  picker: {
                                    kind: "window",
                                    current: s.delivery_window || "",
                                    onPick: (v) => patchSplit(s.id, { delivery_window: v }, "schedule"),
                                  },
                                })
                              }
                            />
                          </div>

                          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(150px,1fr))", gap: 8 }}>
                            <Select
                              size="sm"
                              label="Truck"
                              options={truckOptions}
                              value={s.truck_id || ""}
                              onChange={(e: any) => patchSplit(s.id, { truck_id: e.target.value || null }, "assignment")}
                              allowUnset
                            />
                            <Select
                              size="sm"
                              label="Driver"
                              options={driverOptions}
                              value={s.driver_id || ""}
                              onChange={(e: any) => patchSplit(s.id, { driver_id: e.target.value || null }, "assignment")}
                              allowUnset
                            />
                          </div>

                          <AddressBlock
                            label="Delivery address"
                            street={s.street}
                            suburb={suburbName(s.suburb_id)}
                            postcode={rate.postcode}
                            suburbId={rate.id}
                            deliveryFee={AUD(feeOf(s, suburbs, paySettings))}
                            deliveryFeeSource={s.fee_source}
                            source="split"
                            verified
                            onOpenMap={() =>
                              window.open(
                                "https://www.google.com/maps/search/" +
                                  encodeURIComponent(`${s.street || ""} ${suburbName(s.suburb_id)} ${rate.state} ${rate.postcode}`),
                                "_blank"
                              )
                            }
                            onChange={() => {}}
                          />

                          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(150px,1fr))", gap: 8, alignItems: "end" }}>
                            <Select
                              size="sm"
                              label="Suburb"
                              options={suburbOptions}
                              value={s.suburb_id || ""}
                              onChange={(e: any) => {
                                const r = resolvedSuburbFee(e.target.value, suburbs, paySettings);
                                patchSplit(s.id, { suburb_id: e.target.value || null, delivery_fee: r.total, fee_source: "suburb" }, "address");
                              }}
                            />
                            <Input
                              size="sm"
                              label="Delivery fee"
                              value={String(feeOf(s, suburbs, paySettings).toFixed(2))}
                              onChange={(e: any) =>
                                patchSplit(s.id, { delivery_fee: Number(e.target.value) || 0, fee_source: "manual" }, "address")
                              }
                              suffix="AUD"
                            />
                          </div>
                          <div style={{ fontSize: 11, color: "var(--text-faint)" }}>{feeNote(s)}</div>

                          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                            <div style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: ".09em", color: "var(--text-faint)" }}>
                              Items on this split
                            </div>
                            {sItems.map((it) => {
                              const p = products.find((x) => x.id === it.product_id);
                              return (
                                <div key={it.id} style={{ display: "flex", alignItems: "center", gap: 8, padding: "6px 8px", borderRadius: 6, background: "var(--surface-raised)" }}>
                                  <span style={{ flex: 1, minWidth: 0, fontSize: 12, color: "var(--text-body)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                                    {p?.name || it.description}
                                  </span>
                                  <QtyBtn label="−" onClick={() => setOrderItemQty(s.id, it.id, -1)} />
                                  <QtyField
                                    qty={Number(it.qty)}
                                    unit={p?.unit || "each"}
                                    divisible={unitFor(p).divisible}
                                    onCommit={(n) => setOrderItemQtyTo(s.id, it.id, n)}
                                  />
                                  <QtyBtn label="+" onClick={() => setOrderItemQty(s.id, it.id, 1)} />
                                  <span className="tabular" style={{ width: 80, textAlign: "right", fontSize: 12, fontWeight: 600, color: "var(--text-primary)" }}>
                                    {AUD(Number(it.line_total))}
                                  </span>
                                  <div
                                    onClick={() => removeOrderItem(s.id, it.id)}
                                    title="Remove line"
                                    style={qtyBtnStyle}
                                  >
                                    <Icon name="trash-2" size={11} />
                                  </div>
                                </div>
                              );
                            })}
                            <ProductSearchAdd onAdd={(pid) => addOrderItem(s.id, pid)} placeholder="Add a product to this split" />
                            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: "var(--text-faint)" }}>
                              <span>
                                Goods {AUD(goodsOf(sItems))} · delivery {AUD(feeOf(s, suburbs, paySettings))}
                              </span>
                              <span className="tabular" style={{ color: "var(--text-primary)", fontWeight: 600 }}>
                                {AUD(totalOf(s))}
                              </span>
                            </div>
                          </div>

                          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                            <Button variant="ghost" size="sm" iconLeft="printer" onClick={() => printReceipt(s.id)}>
                              Print this split
                            </Button>
                            <Button variant="ghost" size="sm" iconLeft="repeat" onClick={() => resetSplitToMaster(s.id)}>
                              Reset to master
                            </Button>
                          </div>
                        </div>
                      </Card>
                    );
                  })}

                  <Alert tone="info" title="Overrides are explicit">
                    A split starts by reading the master's address, fee and schedule. The moment you change one here it
                    is marked as overridden and stops tracking the master, so the two can never disagree silently.
                  </Alert>
                </div>
              )}

              {tab === "items" && editTarget && (
                <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                  <Card title="Line items" subtitle="Edit quantities here — the statement reads these rows" padding="default">
                    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                      {items.map((it) => {
                        const p = products.find((x) => x.id === it.product_id);
                        return (
                          <div key={it.id} style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 10px", borderRadius: 8, background: "var(--surface-raised)" }}>
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <div style={{ fontSize: 13, color: "var(--text-primary)", fontWeight: 500, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                                {p?.name || it.description}
                              </div>
                              <div className="tabular" style={{ fontSize: 11, color: "var(--text-faint)" }}>
                                {(p?.sku || "—") + " · " + AUD(Number(it.unit_price)) + " per " + (p?.unit || "each")}
                              </div>
                            </div>
                            <div style={{ display: "flex", alignItems: "center", gap: 3, flexShrink: 0 }}>
                              <QtyBtn label="−" onClick={() => setOrderItemQty(editTarget.id, it.id, -1)} size={24} />
                              {/* Type it. The +/- buttons move by the unit's own
                                  increment — a quarter of a cubic metre — which
                                  is fine for a nudge and hopeless for going from
                                  4 to 11, or for the third of a metre a customer
                                  actually asked for. */}
                              <QtyField
                                qty={Number(it.qty)}
                                unit={p?.unit || "each"}
                                divisible={unitFor(p).divisible}
                                width={62}
                                onCommit={(n) => setOrderItemQtyTo(editTarget.id, it.id, n)}
                              />
                              <QtyBtn label="+" onClick={() => setOrderItemQty(editTarget.id, it.id, 1)} size={24} />
                              <div onClick={() => removeOrderItem(editTarget.id, it.id)} title="Remove line" style={{ ...qtyBtnStyle, width: 24, height: 24 }}>
                                <Icon name="trash-2" size={12} />
                              </div>
                            </div>
                            <span className="tabular" style={{ width: 84, textAlign: "right", fontSize: 13, fontWeight: 600, color: Number(it.line_total) < 0 ? "var(--feedback-success)" : "var(--text-primary)", flexShrink: 0 }}>
                              {(Number(it.line_total) < 0 ? "−" : "") + AUD(Math.abs(Number(it.line_total)))}
                            </span>
                          </div>
                        );
                      })}

                      <ProductSearchAdd onAdd={(pid) => addOrderItem(editTarget.id, pid)} label="Add a product" />

                      <div style={{ display: "flex", flexDirection: "column", gap: 5, paddingTop: 8, borderTop: "1px solid var(--border-subtle)" }}>
                        <Row label="Goods" value={AUD(goodsOf(items))} />
                        <Row label="Delivery" value={AUD(editTarget.method === "delivery" ? feeOf(editTarget, suburbs, paySettings) : 0)} />
                        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 14, fontWeight: 600, paddingTop: 4 }}>
                          <span style={{ color: "var(--text-primary)" }}>Total incl. GST</span>
                          <span className="tabular" style={{ color: "var(--text-primary)" }}>
                            {AUD(totalOf(editTarget))}
                          </span>
                        </div>
                      </div>
                    </div>
                  </Card>

                  <Card title="Notes" padding="default">
                    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                      <Textarea
                        size="sm"
                        label="Order notes"
                        value={editTarget.order_notes || ""}
                        onChange={(v: any) => patchOrder(editTarget.id, { order_notes: typeof v === "string" ? v : v.target.value })}
                        placeholder="Commercial notes — statements, PO references"
                      />
                      <Textarea
                        size="sm"
                        label="Delivery notes for the driver"
                        value={editTarget.delivery_notes || ""}
                        onChange={(v: any) => patchOrder(editTarget.id, { delivery_notes: typeof v === "string" ? v : v.target.value })}
                        placeholder="Gate codes, drop points — reaches the driver"
                      />
                    </div>
                  </Card>
                </div>
              )}

              {tab === "delivery" && editTarget && (
                <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                  <Card title="Stage & crew" padding="default">
                    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                      <Select
                        size="sm"
                        label="Stage"
                        options={nextStatusOptions}
                        value={editTarget.status}
                        onChange={(e: any) => moveOrder(editTarget.id, e.target.value)}
                      />
                      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(150px,1fr))", gap: 8 }}>
                        <Select
                          size="sm"
                          label="Truck"
                          options={truckOptions}
                          value={editTarget.truck_id || ""}
                          onChange={(e: any) => patchOrder(editTarget.id, { truck_id: e.target.value || null })}
                          allowUnset
                        />
                        <Select
                          size="sm"
                          label="Driver"
                          options={driverOptions}
                          value={editTarget.driver_id || ""}
                          onChange={(e: any) => patchOrder(editTarget.id, { driver_id: e.target.value || null })}
                          allowUnset
                        />
                      </div>
                    </div>
                  </Card>

                  <Card title="Delivery" padding="default">
                    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                      <Tabs
                        items={[
                          { id: "delivery", label: "Delivery", icon: "truck" },
                          { id: "pickup", label: "Pickup", icon: "shopping-bag" },
                        ]}
                        activeId={editTarget.method}
                        onSelect={(id: string) => patchOrder(editTarget.id, { method: id as any })}
                        variant="segmented"
                        fullWidth
                      />
                      {/* The same calendar and the same window list the order
                          was taken on. This was a pair of text boxes whose value
                          was rebuilt from the stored date on every keystroke, so
                          typing a new date undid itself one character in and the
                          date could not, in practice, be changed at all. */}
                      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(150px,1fr))", gap: 8 }}>
                        <PickerField
                          label="Date"
                          icon="calendar"
                          value={dmy(editTarget.delivery_date) || "Not scheduled"}
                          onClick={() =>
                            ui.set({
                              picker: {
                                kind: "date",
                                current: dmy(editTarget.delivery_date),
                                onPick: (v) => {
                                  const iso = isoFromDmy(v);
                                  if (iso) patchOrder(editTarget.id, { delivery_date: iso });
                                },
                              },
                            })
                          }
                        />
                        <PickerField
                          label={editTarget.method === "delivery" ? "Delivery window" : "Pickup window"}
                          icon="clock"
                          value={editTarget.delivery_window || "Not set"}
                          onClick={() =>
                            ui.set({
                              picker: {
                                kind: "window",
                                current: editTarget.delivery_window || "",
                                onPick: (v) => patchOrder(editTarget.id, { delivery_window: v }),
                              },
                            })
                          }
                        />
                      </div>
                      {editTarget.method === "delivery" && (
                        <>
                          <AddressBlock
                            label="Delivery address"
                            street={editTarget.street}
                            suburb={suburbName(editTarget.suburb_id)}
                            postcode={suburbRate(editTarget.suburb_id, suburbs).postcode}
                            suburbId={suburbRate(editTarget.suburb_id, suburbs).id}
                            deliveryFee={AUD(feeOf(editTarget, suburbs, paySettings))}
                            deliveryFeeSource={editTarget.fee_source}
                            source="manual"
                            verified
                            onOpenMap={() =>
                              window.open(
                                "https://www.google.com/maps/search/" +
                                  encodeURIComponent(
                                    `${editTarget.street || ""} ${suburbName(editTarget.suburb_id)} VIC ${suburbRate(editTarget.suburb_id, suburbs).postcode}`
                                  ),
                                "_blank"
                              )
                            }
                            onChange={() => {}}
                          />
                          <AddressSearch
                            street={editTarget.street || ""}
                            suburbName={suburbName(editTarget.suburb_id)}
                            suburbs={suburbs}
                            onStreet={(v) => patchOrder(editTarget.id, { street: v })}
                            onResolved={({ street, suburb }) => {
                              if (suburb) {
                                const r = resolvedSuburbFee(suburb.id, suburbs, paySettings);
                                patchOrder(editTarget.id, { street, suburb_id: suburb.id, delivery_fee: r.total, fee_source: "suburb" });
                              } else {
                                patchOrder(editTarget.id, { street, suburb_id: null });
                              }
                            }}
                          />
                          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(150px,1fr))", gap: 8 }}>
                            <Select
                              size="sm"
                              label="Suburb"
                              options={suburbOptions}
                              value={editTarget.suburb_id || ""}
                              onChange={(e: any) => {
                                const r = resolvedSuburbFee(e.target.value, suburbs, paySettings);
                                patchOrder(editTarget.id, { suburb_id: e.target.value || null, delivery_fee: r.total, fee_source: "suburb" });
                              }}
                              allowUnset
                            />
                            <Input
                              size="sm"
                              label="Delivery fee"
                              value={feeOf(editTarget, suburbs, paySettings).toFixed(2)}
                              onChange={(e: any) => patchOrder(editTarget.id, { delivery_fee: Number(e.target.value) || 0, fee_source: "manual" })}
                              suffix="AUD"
                            />
                          </div>
                          <div
                            style={{
                              fontSize: 11,
                              color:
                                !editTarget.suburb_id || suburbRate(editTarget.suburb_id, suburbs).inactive
                                  ? "var(--feedback-danger)"
                                  : "var(--text-faint)",
                            }}
                          >
                            {feeNote(editTarget)}
                          </div>
                        </>
                      )}
                    </div>
                  </Card>
                </div>
              )}

              {tab === "payment" && (
                <>
                  {isMaster && masterSummaryProps && <PaymentSummary {...masterSummaryProps} />}
                  {!isMaster && sel && <PaymentSummary {...paymentSummaryProps(sel)} />}
                </>
              )}
            </div>
          </>
        )}
      </div>

      {confirmDelete && focus && (
        <Confirm
          title={`Delete ${isMaster ? "MO — " : ""}${focus.order_number}?`}
          confirmLabel="Delete order"
          onClose={() => setConfirmDelete(false)}
          onConfirm={() => {
            deleteOrder(focus.id);
            setConfirmDelete(false);
            ui.set({ drawerOpen: false });
          }}
        >
          It comes off the orders list, off the dispatch board and out of every total.{" "}
          {isMaster && splits.length > 0 ? `The ${splits.length} deliveries under it go with it. ` : ""}
          The record itself is kept rather than destroyed, so anything already printed or sent to MYOB still reads.
        </Confirm>
      )}
    </>
  );
}

const qtyBtnStyle: React.CSSProperties = {
  cursor: "pointer",
  width: 22,
  height: 22,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  borderRadius: 5,
  border: "1px solid var(--border-default)",
  color: "var(--text-muted)",
  fontSize: 12,
  flexShrink: 0,
};

function QtyBtn({ label, onClick, size = 22 }: { label: string; onClick: () => void; size?: number }) {
  return (
    <div onClick={onClick} style={{ ...qtyBtnStyle, width: size, height: size }}>
      {label}
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12 }}>
      <span style={{ color: "var(--text-muted)" }}>{label}</span>
      <span className="tabular" style={{ color: "var(--text-primary)" }}>
        {value}
      </span>
    </div>
  );
}

/* A quantity you can type. Kept verbatim while the field has focus — you cannot
   type "0.5" without passing through "" and "0." — and committed on blur or
   Enter. Leaving it empty, or on zero, takes the line off the order, which is
   the same thing holding "−" down used to do and is worth being able to say in
   one go. */
function QtyField({
  qty,
  unit,
  divisible,
  width = 56,
  onCommit,
}: {
  qty: number;
  unit: string;
  divisible: boolean;
  width?: number;
  onCommit: (n: number) => void;
}) {
  const shown = () => String(Number(qty.toFixed(3)));
  const [draft, setDraft] = React.useState<string | null>(null);
  const value = draft === null ? shown() : draft;

  const commit = () => {
    if (draft === null) return;
    const n = parseFloat(draft);
    setDraft(null);
    if (draft.trim() === "" || isNaN(n)) return;
    if (Math.abs(n - qty) < 0.0005) return;
    onCommit(n);
  };

  return (
    <div
      title={divisible ? `Type any amount in ${unit}` : `Sold by the ${unit} — whole numbers`}
      style={{
        display: "flex",
        alignItems: "center",
        gap: 3,
        flexShrink: 0,
        height: 24,
        padding: "0 5px",
        borderRadius: 6,
        border: "1px solid var(--border-default)",
        background: "var(--surface-input)",
      }}
    >
      <input
        value={value}
        inputMode="decimal"
        onChange={(e) => setDraft(e.target.value.replace(/[^0-9.]/g, "").replace(/(\..*)\./g, "$1"))}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === "Enter") (e.target as HTMLInputElement).blur();
          if (e.key === "Escape") setDraft(null);
        }}
        style={{
          width,
          border: "none",
          outline: "none",
          background: "transparent",
          textAlign: "right",
          fontFamily: "inherit",
          fontSize: 12,
          fontVariantNumeric: "tabular-nums",
          color: "var(--text-primary)",
        }}
      />
      <span style={{ fontSize: 10, color: "var(--text-faint)" }}>{unit}</span>
    </div>
  );
}
