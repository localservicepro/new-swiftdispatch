import React, { useEffect, useMemo, useRef, useState } from "react";
import { useApp } from "../store/store";
import { Icon, Input } from "../design-system/components.js";

/* Narrowing a report to one product.

   A plain select would be nine hundred options long, which is the same problem
   the order screen had; this is the same answer — type a few letters, pick from
   what matches. Empty means every product, and clearing it is one click, because
   the common move is to look at one item and then look at everything again. */

const SHOWN = 30;

export default function ProductFilter({
  value,
  onChange,
  placeholder = "All products — type to filter by item",
}: {
  value: string;
  onChange: (id: string) => void;
  placeholder?: string;
}) {
  const { products } = useApp();
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [cursor, setCursor] = useState(0);
  const boxRef = useRef<HTMLDivElement | null>(null);

  const chosen = products.find((p) => p.id === value);

  const q = query.trim().toLowerCase();
  const matches = useMemo(() => {
    if (!q) return products.slice(0, SHOWN);
    const hits = products.filter((p) => (p.name + " " + p.sku).toLowerCase().includes(q));
    hits.sort((a, b) => Number(b.name.toLowerCase().startsWith(q)) - Number(a.name.toLowerCase().startsWith(q)));
    return hits.slice(0, SHOWN);
  }, [products, q]);

  useEffect(() => setCursor(0), [q]);

  useEffect(() => {
    if (!open) return;
    const away = (e: MouseEvent) => {
      if (boxRef.current && !boxRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", away);
    return () => document.removeEventListener("mousedown", away);
  }, [open]);

  if (chosen)
    return (
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 7,
          height: 32,
          padding: "0 6px 0 10px",
          borderRadius: 6,
          border: "1px solid var(--border-accent)",
          background: "var(--om-chip-active-bg)",
        }}
      >
        <Icon name="package" size={13} color="var(--brand-primary)" />
        <span
          style={{
            flex: 1,
            minWidth: 0,
            fontSize: 12.5,
            color: "var(--text-primary)",
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          }}
        >
          {chosen.name}
        </span>
        <div
          onClick={() => {
            onChange("");
            setQuery("");
          }}
          title="Show every product again"
          style={{
            cursor: "pointer",
            width: 22,
            height: 22,
            flexShrink: 0,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            borderRadius: 5,
            color: "var(--text-muted)",
          }}
        >
          <Icon name="x" size={12} />
        </div>
      </div>
    );

  return (
    <div ref={boxRef} style={{ position: "relative" }}>
      <Input
        size="sm"
        icon="package"
        placeholder={placeholder}
        value={query}
        onFocus={() => setOpen(true)}
        onKeyDown={(e: any) => {
          if (e.key === "Escape") return setOpen(false);
          if (e.key === "ArrowDown") {
            e.preventDefault();
            setOpen(true);
            setCursor((n: number) => Math.min(matches.length - 1, n + 1));
          } else if (e.key === "ArrowUp") {
            e.preventDefault();
            setCursor((n: number) => Math.max(0, n - 1));
          } else if (e.key === "Enter") {
            e.preventDefault();
            const hit = matches[cursor];
            if (hit) {
              onChange(hit.id);
              setOpen(false);
            }
          }
        }}
        onChange={(e: any) => {
          setQuery(e.target.value);
          setOpen(true);
        }}
      />
      {open && (
        <div
          style={{
            position: "absolute",
            zIndex: 6,
            top: "100%",
            left: 0,
            right: 0,
            marginTop: 4,
            maxHeight: 280,
            overflowY: "auto",
            borderRadius: 8,
            border: "1px solid var(--border-default)",
            background: "var(--surface-card)",
            boxShadow: "0 12px 32px rgba(0,0,0,.4)",
          }}
        >
          {matches.map((p, i) => (
            <div
              key={p.id}
              onMouseEnter={() => setCursor(i)}
              onClick={() => {
                onChange(p.id);
                setOpen(false);
              }}
              style={{
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                gap: 8,
                padding: "7px 10px",
                background: i === cursor ? "var(--surface-active)" : "transparent",
              }}
            >
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 12.5, color: "var(--text-primary)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {p.name}
                </div>
                <div className="tabular" style={{ fontSize: 11, color: "var(--text-faint)" }}>
                  {p.sku} · sold by the {p.unit}
                </div>
              </div>
            </div>
          ))}
          {matches.length === 0 && (
            <div style={{ padding: "14px 10px", fontSize: 12, color: "var(--text-faint)", textAlign: "center" }}>
              Nothing in the catalogue matches "{query.trim()}".
            </div>
          )}
        </div>
      )}
    </div>
  );
}
