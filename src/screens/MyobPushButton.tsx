/* "Push to MYOB" on an order, plus the state that push left behind.

   The button refuses to pretend: if the connection is off, the coding is
   missing or the order has nothing on it, it says so where the click would be
   rather than firing a request that MYOB will bounce. */

import React, { useState } from "react";
import { useApp } from "../store/store";
import { pushContextFor, pushOrdersToMyob } from "../data/myob";
import { pushBlockers } from "../lib/myob";
import type { Order } from "../lib/types";
import { Button, Icon } from "../design-system/components.js";

export default function MyobPushButton({ order, compact }: { order: Order; compact?: boolean }) {
  const { myob } = useApp();
  const [busy, setBusy] = useState(false);
  if (!myob) return null;

  const ctx = pushContextFor(order);
  const blockers = ctx ? pushBlockers(ctx) : ["MYOB settings have not loaded."];
  const pushed = !!order.myob_pushed_at;

  const send = async () => {
    if (!ctx) return;
    setBusy(true);
    try {
      await pushOrdersToMyob([ctx]);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 4, minWidth: 0 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
        <Button
          variant={pushed ? "outline" : "secondary"}
          size="sm"
          iconLeft="external-link"
          disabled={busy || blockers.length > 0}
          onClick={send}
        >
          {busy ? "Sending…" : pushed ? "Send to MYOB again" : "Push to MYOB"}
        </Button>
        {pushed && (
          <span style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 11, color: "var(--feedback-success)" }}>
            <Icon name="badge-check" size={12} />
            {order.myob_number
              ? `${order.myob_doc_type === "order" ? "Order" : "Invoice"} ${order.myob_number}`
              : "In MYOB"}
          </span>
        )}
      </div>

      {order.myob_error && !pushed && (
        <span style={{ fontSize: 11, color: "var(--feedback-danger)", textWrap: "pretty" as any }}>{order.myob_error}</span>
      )}
      {!compact && !order.myob_error && blockers.length > 0 && (
        <span style={{ fontSize: 11, color: "var(--text-faint)", textWrap: "pretty" as any }}>{blockers[0]}</span>
      )}
    </div>
  );
}
