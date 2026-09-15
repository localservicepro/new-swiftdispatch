import React, { useEffect, useMemo, useRef, useState } from "react";
import { useApp } from "../store/store";
import { customerBadgeType, CLASS_STYLE } from "../lib/domain";
import type { Customer } from "../lib/types";
import { Icon, Input } from "../design-system/components.js";

/* Choosing a customer on an order.

   This was a row of small chips — three recent names, more once you typed —
   and the change sheet is right that it did not fit the rest of the app: chips
   are for filters, where clicking the wrong one costs you a click, not for
   picking the account an order is going to be billed to, where clicking the
   wrong one puts someone else's goods on someone else's statement. Two
   businesses with similar names sat side by side in a wrapping row of 11px
   text, and nothing about the arrangement said which was which.

   A list instead: one per row, with what actually distinguishes them — entity,
   account number, terms, and the suburb they usually take deliveries in — and
   room to read it. Searching covers names, account numbers, contact names and
   phone numbers, because any of the four is what the person on the phone
   offers. */

const SHOWN = 40;

export default function CustomerPicker({
  value,
  onPick,
  onAddNew,
  placeholder = "Search a business or person",
}: {
  value: string | null;
  onPick: (id: string) => void;
  onAddNew?: () => void;
  placeholder?: string;
}) {
  const { customers, suburbs } = useApp();
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [cursor, setCursor] = useState(0);
  const boxRef = useRef<HTMLDivElement | null>(null);

  const suburbName = (id: string | null | undefined) => suburbs.find((s) => s.id === id)?.name || "";

  /* An archived customer is out of the book but still on their old orders.
     They must not be choosable for a new one. */
  const live = useMemo(() => customers.filter((c) => !c.archived_at), [customers]);

  const q = query.trim().toLowerCase();
  const matches = useMemo(() => {
    if (!q) return live.slice(0, SHOWN);
    const hits = live.filter((c) =>
      (c.name + " " + c.account_number + " " + c.contacts.map((x) => x.name + " " + (x.phone || "")).join(" "))
        .toLowerCase()
        .includes(q)
    );
    hits.sort((a, b) => Number(b.name.toLowerCase().startsWith(q)) - Number(a.name.toLowerCase().startsWith(q)));
    return hits.slice(0, SHOWN);
  }, [live, q]);

  const total = q
    ? live.filter((c) =>
        (c.name + " " + c.account_number + " " + c.contacts.map((x) => x.name + " " + (x.phone || "")).join(" "))
          .toLowerCase()
          .includes(q)
      ).length
    : live.length;

  useEffect(() => setCursor(0), [q]);

  useEffect(() => {
    if (!open) return;
    const away = (e: MouseEvent) => {
      if (boxRef.current && !boxRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", away);
    return () => document.removeEventListener("mousedown", away);
  }, [open]);

  const choose = (c: Customer) => {
    onPick(c.id);
    setQuery("");
    setOpen(false);
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Escape") return setOpen(false);
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setOpen(true);
      setCursor((n) => Math.min(matches.length - 1, n + 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setCursor((n) => Math.max(0, n - 1));
    } else if (e.key === "Enter") {
      e.preventDefault();
      e.stopPropagation();
      const hit = matches[cursor];
      if (hit) choose(hit);
    }
  };

  return (
    <div ref={boxRef} style={{ position: "relative" }}>
      <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <Input
            size="sm"
            icon="search"
            placeholder={placeholder}
            value={query}
            onFocus={() => setOpen(true)}
            onKeyDown={onKeyDown}
            onChange={(e: any) => {
              setQuery(e.target.value);
              setOpen(true);
            }}
          />
        </div>
        {onAddNew && (
          <div
            onClick={onAddNew}
            title="Add a customer without leaving this order"
            style={{
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: 5,
              height: 32,
              padding: "0 10px",
              flexShrink: 0,
              borderRadius: 6,
              border: "1px solid var(--border-default)",
              background: "var(--surface-raised)",
              color: "var(--text-muted)",
              fontSize: 12,
              whiteSpace: "nowrap",
            }}
          >
            <Icon name="plus" size={13} />
            New
          </div>
        )}
      </div>

      {open && (
        <div
          style={{
            position: "absolute",
            zIndex: 6,
            top: "100%",
            left: 0,
            right: 0,
            marginTop: 4,
            maxHeight: 320,
            overflowY: "auto",
            borderRadius: 8,
            border: "1px solid var(--border-default)",
            background: "var(--surface-card)",
            boxShadow: "0 12px 32px rgba(0,0,0,.4)",
          }}
        >
          {matches.map((c, i) => {
            const on = i === cursor;
            const cls = customerBadgeType(c);
            const site = c.sites.find((x) => x.is_default) || c.sites[0];
            return (
              <div
                key={c.id}
                onMouseEnter={() => setCursor(i)}
                onClick={() => choose(c)}
                style={{
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: 9,
                  padding: "8px 10px",
                  background: on ? "var(--surface-active)" : c.id === value ? "var(--om-chip-active-bg)" : "transparent",
                }}
              >
                <span style={{ width: 3, alignSelf: "stretch", borderRadius: 2, flexShrink: 0, background: CLASS_STYLE[cls].colour }} />
                <Icon
                  name={c.entity === "Company" ? "building-2" : c.entity === "Sole trader" ? "wrench" : "user"}
                  size={13}
                  color="var(--text-faint)"
                />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div
                    style={{
                      fontSize: 13,
                      color: "var(--text-primary)",
                      fontWeight: 500,
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {c.name}
                  </div>
                  <div style={{ fontSize: 11, color: "var(--text-faint)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    Acct {c.account_number} · {c.billing === "account" ? `${c.terms_days}-day account` : "prepaid"} ·{" "}
                    {c.tier}
                    {site ? ` · ${suburbName(site.suburb_id) || site.street}` : ""}
                  </div>
                </div>
                {c.stop_credit && <Icon name="octagon-alert" size={13} color="var(--attention)" title="On stop credit" />}
                {c.id === value && <Icon name="check" size={13} color="var(--brand-primary)" />}
              </div>
            );
          })}
          {matches.length === 0 && (
            <div style={{ padding: "16px 12px", textAlign: "center" }}>
              <div style={{ fontSize: 12, color: "var(--text-muted)" }}>Nobody on file matches "{query.trim()}".</div>
              {onAddNew && (
                <div onClick={onAddNew} style={{ cursor: "pointer", fontSize: 12, marginTop: 6, color: "var(--brand-primary)" }}>
                  Add them as a new customer
                </div>
              )}
            </div>
          )}
          {matches.length > 0 && total > matches.length && (
            <div style={{ padding: "7px 10px", fontSize: 11, color: "var(--text-faint)", borderTop: "1px solid var(--border-subtle)" }}>
              Showing {matches.length} of {total.toLocaleString()} — keep typing to narrow it down.
            </div>
          )}
        </div>
      )}
    </div>
  );
}
