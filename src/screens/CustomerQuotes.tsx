import React, { useState } from "react";
import { useApp } from "../store/store";
import { useUi } from "../store/ui";
import { AUD, dmy, qtyText, quoteState, QUOTE_STATE_LABEL, type QuoteState } from "../lib/domain";
import { PAYMENT_METHOD_LABEL } from "../lib/types";
import type { Customer, Quote } from "../lib/types";
import { deleteQuote, printQuote, setQuoteStatus } from "../data/api";
import { quoteBreakdown } from "../print/quote";
import Confirm from "./Confirm";
import { Alert, Badge, Button, Card, DataTable, Icon, Input } from "../design-system/components.js";

/* The customer's quotes: every one written up for them on the New order
   screen, newest first. Pick a row to see what was quoted, print it, note
   where the conversation got to, or take it as an order. A quote is its own
   record — nothing here is on the board or in the money. */

const TONE: Record<QuoteState, "neutral" | "info" | "success" | "warning" | "danger"> = {
  open: "info",
  sent: "info",
  accepted: "success",
  converted: "success",
  declined: "neutral",
  expired: "warning",
};

export default function CustomerQuotes({ cust }: { cust: Customer }) {
  const ui = useUi();
  const app = useApp();
  const { quotes, quoteItems, products, suburbs, orders } = app;
  const mine = quotes
    .filter((q) => q.customer_id === cust.id && !q.deleted_at)
    .sort((a, b) => b.created_at.localeCompare(a.created_at));
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [declineOpen, setDeclineOpen] = useState(false);
  const [declineReason, setDeclineReason] = useState("");
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [confirmReplace, setConfirmReplace] = useState(false);

  const sel = selectedId ? mine.find((q) => q.id === selectedId) || null : null;
  const items = sel ? quoteItems[sel.id] || [] : [];
  const state = sel ? quoteState(sel) : null;
  const totals = sel ? quoteBreakdown(sel, items) : null;
  const becameOrder = sel?.order_id ? orders.find((o) => o.id === sel.order_id) : null;

  const useForOrder = () => {
    if (!sel) return;
    ui.useQuoteForOrder(sel, items);
  };
  const askUseForOrder = () => {
    /* An order already half written stays that way unless they say so. */
    if (ui.cart.length > 0) setConfirmReplace(true);
    else useForOrder();
  };

  const rows = mine.map((q) => {
    const st = quoteState(q);
    return {
      id: q.id,
      number: q.quote_number + (q.revision > 1 ? ` r${q.revision}` : ""),
      date: dmy(q.created_at.slice(0, 10)),
      until: dmy(q.valid_until),
      state: QUOTE_STATE_LABEL[st],
      total: AUD(Number(q.quoted_total)),
      _q: q,
    };
  });

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      <div style={{ display: "flex", gap: 14, flexWrap: "wrap", fontSize: 12, color: "var(--text-muted)", alignItems: "center" }}>
        <span>
          <span className="tabular" style={{ color: "var(--text-primary)", fontWeight: 600 }}>{mine.length}</span>{" "}
          {mine.length === 1 ? "quote" : "quotes"}
        </span>
        <span>
          <span className="tabular" style={{ color: "var(--text-primary)", fontWeight: 600 }}>
            {mine.filter((q) => ["open", "sent", "accepted"].includes(quoteState(q))).length}
          </span>{" "}
          still standing
        </span>
        <div style={{ flex: 1 }} />
        <span style={{ fontSize: 11, color: "var(--text-faint)" }}>Write one up on New order and press Save as quote.</span>
      </div>

      <Card padding="none">
        <div style={{ overflowX: "auto" }}>
          <DataTable
            columns={[
              { key: "number", header: "Quote", mono: true, width: 120 },
              { key: "date", header: "Written", muted: true, width: 110 },
              { key: "until", header: "Valid until", muted: true, width: 110 },
              { key: "state", header: "Status", width: 130 },
              { key: "total", header: "Quoted", numeric: true, align: "right", width: 110 },
            ]}
            rows={rows}
            dense
            emptyMessage="No quotes yet"
            onRowClick={(row: any) => setSelectedId(row.id === selectedId ? null : row.id)}
          />
        </div>
      </Card>

      {sel && state && totals && (
        <Card
          title={sel.quote_number + (sel.revision > 1 ? ` — revision ${sel.revision}` : "")}
          subtitle={`Written ${dmy(sel.created_at.slice(0, 10))} · valid until ${dmy(sel.valid_until)}`}
          padding="default"
          actions={
            <Badge tone={TONE[state]} icon={state === "converted" ? "check" : state === "expired" ? "clock" : "file-text"}>
              {QUOTE_STATE_LABEL[state]}
            </Badge>
          }
        >
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {state === "converted" && (
              <Alert tone="success" title={`Taken as ${becameOrder?.order_number || "an order"}`} icon="check">
                {becameOrder
                  ? `Created ${dmy(becameOrder.placed_at.slice(0, 10))}. The order is on the Orders tab and the board; this quote is kept for the record.`
                  : "The order it became is outside the loaded window. This quote is kept for the record."}
              </Alert>
            )}
            {state === "expired" && (
              <Alert tone="warning" title="Past its valid-until date" icon="clock">
                It can still be used for an order — the New order screen will say the quote has expired so the prices get a look.
              </Alert>
            )}
            {state === "declined" && (
              <Alert tone="info" title="Declined" icon="x">
                {sel.declined_reason ? `"${sel.declined_reason}" — ` : ""}
                {sel.declined_at ? `noted ${dmy(sel.declined_at.slice(0, 10))}.` : ""} Reopen it if they come back.
              </Alert>
            )}

            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              <Button variant="primary" size="sm" iconLeft="plus" disabled={state === "converted"} onClick={askUseForOrder}>
                Use for an order
              </Button>
              <Button variant="secondary" size="sm" iconLeft="printer" onClick={() => printQuote(sel.id)}>
                Print quote
              </Button>
              {(state === "open" || state === "expired") && (
                <Button variant="outline" size="sm" iconLeft="mail" onClick={() => setQuoteStatus(sel.id, "sent")}>
                  Mark sent
                </Button>
              )}
              {(state === "open" || state === "sent" || state === "expired") && (
                <Button variant="outline" size="sm" iconLeft="check" onClick={() => setQuoteStatus(sel.id, "accepted")}>
                  Mark accepted
                </Button>
              )}
              {state !== "converted" && state !== "declined" && (
                <Button variant="outline" size="sm" iconLeft="x" onClick={() => setDeclineOpen((v) => !v)}>
                  Decline
                </Button>
              )}
              {state === "declined" && (
                <Button variant="outline" size="sm" iconLeft="rotate-ccw" onClick={() => setQuoteStatus(sel.id, "open")}>
                  Reopen
                </Button>
              )}
              <div style={{ flex: 1 }} />
              <Button variant="ghost" size="sm" iconLeft="trash-2" onClick={() => setConfirmDelete(true)}>
                Delete
              </Button>
            </div>

            {declineOpen && state !== "declined" && (
              <div style={{ display: "flex", gap: 8, alignItems: "flex-end", flexWrap: "wrap" }}>
                <div style={{ flex: "1 1 220px" }}>
                  <Input size="sm" label="Why (optional)" value={declineReason} placeholder="Went elsewhere, too dear, job fell through…" onChange={(e: any) => setDeclineReason(e.target.value)} />
                </div>
                <Button
                  variant="danger"
                  size="sm"
                  onClick={() => {
                    setQuoteStatus(sel.id, "declined", declineReason.trim());
                    setDeclineOpen(false);
                    setDeclineReason("");
                  }}
                >
                  Mark declined
                </Button>
              </div>
            )}

            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(200px,1fr))", gap: 10, fontSize: 12 }}>
              <div>
                <div style={{ fontSize: 11, color: "var(--text-faint)", marginBottom: 2 }}>{sel.method === "delivery" ? (sel.deliveries.length > 1 ? "Deliveries" : "Delivery") : "Collection"}</div>
                {sel.method !== "delivery" ? (
                  <div style={{ color: "var(--text-primary)" }}>Pickup from the yard</div>
                ) : (
                  sel.deliveries.map((d) => {
                    const sb = suburbs.find((s) => s.id === d.suburbId);
                    return (
                      <div key={d.letter} style={{ color: "var(--text-primary)" }}>
                        {sel.deliveries.length > 1 ? `${d.letter}: ` : ""}
                        {[d.street, sb?.name].filter(Boolean).join(", ") || "Address to be confirmed"} · {d.dateIso ? dmy(d.dateIso) : "date TBC"}
                        {d.window ? ` ${d.window}` : ""} · {AUD(Number(d.fee) || 0)}
                      </div>
                    );
                  })
                )}
              </div>
              <div>
                <div style={{ fontSize: 11, color: "var(--text-faint)", marginBottom: 2 }}>Settlement</div>
                <div style={{ color: "var(--text-primary)" }}>{sel.settle_method ? PAYMENT_METHOD_LABEL[sel.settle_method] : "Not set"}</div>
                {sel.po_number && <div style={{ color: "var(--text-muted)" }}>P/O {sel.po_number}</div>}
              </div>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
              {items.map((i) => {
                const p = products.find((x) => x.id === i.product_id);
                return (
                  <div key={i.id} style={{ display: "flex", gap: 8, alignItems: "center", fontSize: 12, padding: "4px 0", borderBottom: "1px solid var(--border-subtle)" }}>
                    {sel.deliveries.length > 1 && (
                      <span className="tabular" style={{ width: 16, color: "var(--text-faint)" }}>{i.delivery_letter}</span>
                    )}
                    <span style={{ flex: 1, minWidth: 0, color: "var(--text-primary)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {p?.name || i.description || "Item"}
                    </span>
                    <span className="tabular" style={{ color: "var(--text-muted)", whiteSpace: "nowrap" }}>
                      {qtyText(Number(i.qty), p?.unit || "each")} × {AUD(Number(i.unit_price))}
                    </span>
                    <span className="tabular" style={{ width: 80, textAlign: "right", fontWeight: 600, color: "var(--text-primary)" }}>
                      {AUD(Number(i.line_total))}
                    </span>
                  </div>
                );
              })}
              {!items.length && <div style={{ fontSize: 12, color: "var(--text-faint)" }}>No lines on this quote.</div>}
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 3, alignSelf: "flex-end", minWidth: 220, fontSize: 12 }}>
              {totals.adjust !== 0 && <Row label="Goods" value={AUD(totals.goods)} />}
              {totals.adjust !== 0 && <Row label="Adjustment" value={(totals.adjust < 0 ? "−" : "+") + AUD(Math.abs(totals.adjust))} />}
              <Row label="Subtotal" value={AUD(totals.subtotal)} />
              {totals.delivery > 0 && <Row label="Delivery" value={AUD(totals.delivery)} />}
              {totals.fuel > 0 && <Row label="Fuel surcharge" value={AUD(totals.fuel)} />}
              <Row label="Quoted total" value={AUD(totals.total)} strong />
            </div>

            {(sel.order_notes || sel.delivery_notes) && (
              <div style={{ fontSize: 12, color: "var(--text-muted)", whiteSpace: "pre-wrap" }}>
                {sel.delivery_notes && (
                  <div>
                    <Icon name="truck" size={11} /> {sel.delivery_notes}
                  </div>
                )}
                {sel.order_notes && <div>{sel.order_notes}</div>}
              </div>
            )}
          </div>
        </Card>
      )}

      {confirmDelete && sel && (
        <Confirm
          title={`Delete ${sel.quote_number}?`}
          confirmLabel="Delete quote"
          onClose={() => setConfirmDelete(false)}
          onConfirm={() => {
            deleteQuote(sel.id);
            setConfirmDelete(false);
            setSelectedId(null);
          }}
        >
          It comes off the customer's record. Nothing else refers to a quote, so there is nothing else to tidy.
        </Confirm>
      )}

      {confirmReplace && sel && (
        <Confirm
          title="Replace the order in progress?"
          confirmLabel="Use the quote"
          tone="primary"
          icon="file-text"
          onClose={() => setConfirmReplace(false)}
          onConfirm={() => {
            setConfirmReplace(false);
            useForOrder();
          }}
        >
          There is an order half written on the New order screen. Using {sel.quote_number} replaces what is in its cart.
        </Confirm>
      )}
    </div>
  );
}

function Row({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", gap: 12, fontWeight: strong ? 600 : 400, color: strong ? "var(--text-primary)" : "var(--text-muted)" }}>
      <span>{label}</span>
      <span className="tabular">{value}</span>
    </div>
  );
}

export const quoteCountFor = (quotes: Quote[], customerId: string) => quotes.filter((q) => q.customer_id === customerId && !q.deleted_at).length;
