import React from "react";
import { STATUS_ACCENT } from "../lib/domain";
import type { OrderStatus } from "../lib/types";
import { Icon, StatusBadge } from "../design-system/components.js";

/* The dispatch card, laid out for the yard.

   The design-system OrderCard gave the address eleven-point faint text and the
   goods a count — "3 items" — and spent a line on when the order was placed.
   The yard's words: the address and the products "are the most useful
   information on an order card; realistically these must be the largest and
   most visible", and the placed time "isn't needed now the delivery times work
   properly". The generated component cannot be edited, so the board draws its
   own card: the same frame, rail and badges, with the address and the goods
   given the room and the placed time gone. */

export interface BoardCardProps {
  orderNumber: string;
  isMaster?: boolean;
  isSplit?: boolean;
  customerName: string;
  classLabel: string;
  classColour: string;
  status: OrderStatus;
  paymentStatus: string;
  method: "delivery" | "pickup";
  address: string;
  window: string;
  goods: string[];
  total: string;
  truck?: string;
  driver?: string;
  notes?: string;
  settles?: string;
  backordered?: number;
  stopCredit?: boolean;
  processed?: boolean;
  assignable?: boolean;
  onAssign?: () => void;
  onClick?: () => void;
}

const GOODS_LINES = 4;

export default function BoardCard(p: BoardCardProps) {
  const [hover, setHover] = React.useState(false);
  const shownGoods = p.goods.slice(0, GOODS_LINES);
  const moreGoods = p.goods.length - shownGoods.length;
  const meta: React.CSSProperties = { display: "flex", gap: 5, alignItems: "center", fontSize: 11, color: "var(--text-faint)", lineHeight: 1.4 };

  return (
    <div
      onClick={p.onClick}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        position: "relative",
        padding: "9px 11px 9px 13px",
        background: hover ? "var(--surface-raised)" : "var(--surface-card)",
        border: `1px solid ${hover ? "var(--border-strong)" : "var(--border-subtle)"}`,
        borderRadius: "var(--radius-md)",
        cursor: p.onClick ? "pointer" : undefined,
        transition: "var(--transition-surface)",
      }}
    >
      <span style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: 2, borderRadius: "2px 0 0 2px", background: STATUS_ACCENT[p.status] || "var(--border-strong)" }} />

      {/* Order number, flags, fulfilment */}
      <div style={{ display: "flex", alignItems: "center", gap: 5, marginBottom: 4 }}>
        <span style={{ fontFamily: "var(--font-numeric)", fontSize: 11, fontWeight: 600, letterSpacing: "0.02em", color: "var(--text-primary)" }}>
          {p.isMaster ? "MO — " + p.orderNumber : p.orderNumber}
        </span>
        {p.isSplit && (
          <span style={{ fontSize: 9, fontWeight: 700, letterSpacing: ".08em", color: "var(--text-faint)", border: "1px solid var(--border-default)", borderRadius: 3, padding: "0 4px" }}>SPLIT</span>
        )}
        {p.processed && <Icon name="printer-check" size={12} color="var(--feedback-success)" title="Run sheet printed" />}
        <span style={{ flex: 1 }} />
        <StatusBadge kind="method" value={p.method} size="sm" />
      </div>

      {/* Who */}
      <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 6 }}>
        <span style={{ width: 8, height: 8, borderRadius: 2, flexShrink: 0, background: p.classColour }} title={p.classLabel} />
        <span style={{ fontSize: 12, fontWeight: 600, color: "var(--text-primary)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{p.customerName}</span>
        {p.stopCredit && <Icon name="octagon-alert" size={12} color="var(--attention)" title="Stop credit" />}
        <span style={{ marginLeft: "auto", fontSize: 10.5, fontWeight: 600, color: p.classColour, whiteSpace: "nowrap" }}>{p.classLabel}</span>
      </div>

      {/* Where — the biggest thing on the card */}
      <div style={{ display: "flex", gap: 6, alignItems: "flex-start", marginBottom: 6 }}>
        <Icon name="map-pin" size={13} color="var(--text-muted)" style={{ marginTop: 2, flexShrink: 0 }} />
        <span style={{ fontSize: 13.5, fontWeight: 600, lineHeight: 1.3, color: "var(--text-primary)", textWrap: "pretty" as any }}>{p.address}</span>
      </div>

      {/* What */}
      {p.goods.length > 0 ? (
        <div style={{ display: "flex", flexDirection: "column", gap: 2, marginBottom: 7, padding: "6px 8px", borderRadius: 6, background: "var(--bg-sunken)" }}>
          {shownGoods.map((g, i) => (
            <div key={i} style={{ fontSize: 12.5, lineHeight: 1.35, color: "var(--text-body)", display: "flex", gap: 6 }}>
              <span style={{ color: "var(--text-faint)", flexShrink: 0 }}>•</span>
              <span style={{ textWrap: "pretty" as any }}>{g}</span>
            </div>
          ))}
          {moreGoods > 0 && <div style={{ fontSize: 11, color: "var(--text-faint)", paddingLeft: 12 }}>+ {moreGoods} more {moreGoods === 1 ? "line" : "lines"}</div>}
        </div>
      ) : (
        <div style={{ fontSize: 11, color: "var(--attention)", marginBottom: 7 }}>No items on this order</div>
      )}

      {/* When, who drives */}
      <div style={{ display: "flex", flexDirection: "column", gap: 3, marginBottom: 7 }}>
        <span style={{ ...meta, fontSize: 12, color: "var(--text-muted)" }}>
          <Icon name="clock" size={11} />
          {p.window}
        </span>
        {(p.truck || p.driver) && (
          <span style={meta}>
            <Icon name="truck" size={11} />
            {[p.truck, p.driver].filter(Boolean).join(" · ")}
          </span>
        )}
        {p.backordered ? (
          <span style={{ ...meta, color: "var(--feedback-warning)" }} title="Held for a later delivery — marked do not load on the run sheet">
            <Icon name="hourglass" size={11} />
            {p.backordered === 1 ? "1 line on backorder" : `${p.backordered} lines on backorder`}
          </span>
        ) : null}
      </div>

      {p.notes && (
        <div style={{ display: "flex", gap: 6, padding: "5px 7px", marginBottom: 7, background: "var(--feedback-warning-bg)", borderRadius: "var(--radius-xs)", fontSize: 11, color: "var(--amber-300)", lineHeight: 1.4 }}>
          <Icon name="sticky-note" size={11} style={{ marginTop: 1, flexShrink: 0 }} />
          <span>{p.notes}</span>
        </div>
      )}

      {p.assignable && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            p.onAssign && p.onAssign();
          }}
          style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 6, width: "100%", height: 28, marginBottom: 7, background: "rgba(59,130,246,.12)", color: "var(--blue-300)", border: "1px solid rgba(59,130,246,.35)", borderRadius: "var(--radius-xs)", fontFamily: "var(--font-body)", fontSize: 10, fontWeight: 600, letterSpacing: ".06em", textTransform: "uppercase", cursor: "pointer" }}
        >
          <Icon name="truck" size={12} />
          {p.truck ? "Reassign truck & driver" : "Assign truck & driver"}
        </button>
      )}

      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, paddingTop: 7, borderTop: "1px solid var(--border-subtle)" }}>
        <span style={{ display: "flex", alignItems: "center", gap: 6, minWidth: 0 }}>
          <StatusBadge kind="payment" value={p.paymentStatus} size="sm" />
          {p.settles && (
            <span style={{ display: "inline-flex", alignItems: "center", gap: 4, fontSize: 11, color: "var(--text-faint)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
              <Icon name="credit-card" size={11} />
              {p.settles}
            </span>
          )}
        </span>
        <span className="tabular" style={{ fontSize: 13, fontWeight: 600, color: "var(--text-primary)", flexShrink: 0 }}>{p.total}</span>
      </div>
    </div>
  );
}
