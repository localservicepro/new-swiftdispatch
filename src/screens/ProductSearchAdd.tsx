import React, { useEffect, useMemo, useRef, useState } from "react";
import { useApp } from "../store/store";
import { AUD, unitPrice } from "../lib/domain";
import type { Product } from "../lib/types";
import { Icon, Input } from "../design-system/components.js";
import AnchoredPopover from "./AnchoredPopover";

/* Adding a product to an order that already exists.

   This was a plain <select> carrying all nine hundred products in catalogue
   order, so putting a bag of cement on an order meant scrolling a native
   dropdown past eight hundred other things — which is what the change sheet
   means by "difficult and inconvenient".

   Type instead. Name or SKU, first match highlighted, Enter adds it, Escape
   backs out. The list is capped because nobody reads past the first handful and
   drawing nine hundred rows into a popup is its own kind of slow. */

const SHOWN = 30;

export default function ProductSearchAdd({
  onAdd,
  label,
  placeholder = "Type a product name or SKU",
}: {
  onAdd: (productId: string) => void;
  label?: string;
  placeholder?: string;
}) {
  const { products, specials } = useApp();
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [cursor, setCursor] = useState(0);
  const boxRef = useRef<HTMLDivElement | null>(null);

  const q = query.trim().toLowerCase();
  const matches = useMemo(() => {
    const live = products.filter((p) => p.active);
    if (!q) return live.slice(0, SHOWN);
    const hits = live.filter((p) =>
      (p.name + " " + p.sku).toLowerCase().includes(q),
    );
    /* A product whose name starts with what was typed is almost always the one
       meant — "cement" should not open on "Cement Australia Off White". */
    hits.sort(
      (a, b) =>
        Number(b.name.toLowerCase().startsWith(q)) -
        Number(a.name.toLowerCase().startsWith(q)),
    );
    return hits.slice(0, SHOWN);
  }, [products, q]);

  useEffect(() => setCursor(0), [q]);

  const choose = (p: Product) => {
    onAdd(p.id);
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
      /* Enter here adds a line; it must not also submit whatever is around it. */
      e.stopPropagation();
      const hit = matches[cursor];
      if (hit) choose(hit);
    }
  };

  return (
    <div style={{ position: "relative", paddingTop: 4 }}>
      {label && (
        <div
          style={{ fontSize: 11, color: "var(--text-faint)", marginBottom: 4 }}
        >
          {label}
        </div>
      )}
      <div ref={boxRef}>
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
      <AnchoredPopover
        anchorRef={boxRef}
        open={open}
        onClose={() => setOpen(false)}
        maxHeight={300}
        role="listbox"
      >
        <>
          {matches.map((p, i) => {
            const eff = unitPrice(p, specials, () => null);
            const on = i === cursor;
            return (
              <div
                key={p.id}
                onMouseEnter={() => setCursor(i)}
                onClick={() => choose(p)}
                style={{
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  padding: "7px 10px",
                  background: on ? "var(--surface-active)" : "transparent",
                }}
              >
                <Icon name="package" size={12} color="var(--text-faint)" />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div
                    style={{
                      fontSize: 12.5,
                      color: "var(--text-primary)",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {p.name}
                  </div>
                  <div
                    className="tabular"
                    style={{ fontSize: 11, color: "var(--text-faint)" }}
                  >
                    {p.sku}
                  </div>
                </div>
                <span
                  className="tabular"
                  style={{
                    fontSize: 12,
                    color: "var(--text-muted)",
                    flexShrink: 0,
                  }}
                >
                  {AUD(eff)} / {p.unit}
                </span>
              </div>
            );
          })}
          {matches.length === 0 && (
            <div
              style={{
                padding: "14px 10px",
                fontSize: 12,
                color: "var(--text-faint)",
                textAlign: "center",
              }}
            >
              Nothing in the catalogue matches "{query.trim()}".
            </div>
          )}
          {!q && products.filter((p) => p.active).length > SHOWN && (
            <div
              style={{
                padding: "7px 10px",
                fontSize: 11,
                color: "var(--text-faint)",
                borderTop: "1px solid var(--border-subtle)",
              }}
            >
              Showing {SHOWN} of {products.filter((p) => p.active).length} —
              type to narrow it down.
            </div>
          )}
        </>
      </AnchoredPopover>
    </div>
  );
}
