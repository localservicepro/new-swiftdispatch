/* "Send to MYOB" on an order, plus the state that a push left behind.

   Two things this has to get right. It never insists an order be delivered
   first — a yard sale is paid at the counter and a pickup is collected from the
   yard, and neither ever reaches that stage. And once a sale is in MYOB it says
   so loudly, because the failure mode here is a duplicate invoice nobody
   notices until the customer queries their statement. */

import React, { useState } from "react";
import { useApp } from "../store/store";
import { pushContextFor, pushOrdersToMyob } from "../data/myob";
import { pushBlockers } from "../lib/myob";
import { placedText } from "../lib/domain";
import type { Order } from "../lib/types";
import { Alert, Button, Icon, Select } from "../design-system/components.js";

const DOC_OPTIONS = [
  { value: "invoice", label: "As an invoice" },
  { value: "order", label: "As an order" },
];

export default function MyobPushButton({ order }: { order: Order }) {
  const { myob } = useApp();
  const [docType, setDocType] = useState<"order" | "invoice" | "">("");
  const [busy, setBusy] = useState(false);
  const [confirming, setConfirming] = useState(false);
  if (!myob) return null;

  /* A re-send defaults to whatever the first one went across as, so a second
     sale at least matches the first; otherwise the settings default applies. */
  const chosen = (docType || order.myob_doc_type || myob.push_as) as "order" | "invoice";
  const ctx = pushContextFor(order, chosen);
  const blockers = ctx ? pushBlockers(ctx) : ["MYOB settings have not loaded."];
  const pushed = !!order.myob_pushed_at;

  const send = async (allowDuplicate = false) => {
    if (!ctx) return;
    setBusy(true);
    setConfirming(false);
    try {
      await pushOrdersToMyob([ctx], allowDuplicate);
    } finally {
      setBusy(false);
    }
  };

  const sentLabel =
    (order.myob_doc_type === "order" ? "Order" : "Invoice") + (order.myob_number ? " " + order.myob_number : "");

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8, width: "100%", minWidth: 0 }}>
      {pushed ? (
        <Alert tone="success" title={"Already in MYOB — " + sentLabel} icon="badge-check">
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <span>
              Sent {order.myob_pushed_at ? placedText(order.myob_pushed_at) : ""}. Sending it again raises a{" "}
              <strong>second</strong> sale in the company file — only do that if the first one was deleted in MYOB.
            </span>
            <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
              {confirming ? (
                <>
                  <Button variant="danger" size="sm" iconLeft="triangle-alert" disabled={busy} onClick={() => send(true)}>
                    {busy ? "Sending…" : "Yes — create a second sale"}
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => setConfirming(false)}>
                    Cancel
                  </Button>
                </>
              ) : (
                <Button
                  variant="outline"
                  size="sm"
                  iconLeft="repeat"
                  disabled={busy || blockers.length > 0}
                  onClick={() => setConfirming(true)}
                >
                  Send again
                </Button>
              )}
            </div>
          </div>
        </Alert>
      ) : (
        <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
          <div style={{ width: 168, flexShrink: 0 }}>
            <Select
              size="sm"
              options={DOC_OPTIONS}
              value={chosen}
              onChange={(e: any) => setDocType(e.target.value)}
              disabled={busy}
            />
          </div>
          <Button variant="secondary" size="sm" iconLeft="external-link" disabled={busy || blockers.length > 0} onClick={() => send()}>
            {busy ? "Sending…" : "Send to MYOB"}
          </Button>
          {chosen !== myob.push_as && (
            <span style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 11, color: "var(--text-faint)" }}>
              <Icon name="info" size={11} />
              just this one — the default stays {myob.push_as === "order" ? "orders" : "invoices"}
            </span>
          )}
        </div>
      )}

      {order.myob_error && !pushed && (
        <span style={{ fontSize: 11, color: "var(--feedback-danger)", textWrap: "pretty" as any }}>{order.myob_error}</span>
      )}
      {!order.myob_error && blockers.length > 0 && (
        <span style={{ fontSize: 11, color: "var(--text-faint)", textWrap: "pretty" as any }}>{blockers[0]}</span>
      )}
      {!pushed && !blockers.length && chosen === "order" && (
        <span style={{ fontSize: 11, color: "var(--text-faint)", textWrap: "pretty" as any }}>
          Goes onto this customer's open MYOB order as another line, or starts one if they haven't got an open order.
        </span>
      )}
    </div>
  );
}
