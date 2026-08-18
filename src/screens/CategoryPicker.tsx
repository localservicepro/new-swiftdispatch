import React, { useEffect, useMemo, useRef, useState } from "react";
import { Icon, Input } from "../design-system/components.js";

/* Forty-nine categories as chips filled eight rows and pushed the products off
   the screen — on the one page where the products are the whole point.

   They are not used evenly: two of them account for three quarters of every
   line the yard has ever sold, and eight cover nine in ten. So the row shows
   the ones actually being ordered, most-used first, and the long tail lives
   behind "More" with a search box. Whatever is selected always stays visible,
   even when it is something obscure, because a filter you cannot see is a
   filter you cannot turn off. */

export interface CategoryOption {
  name: string;
  /* How often this category has been ordered — what the ordering is by. */
  weight: number;
  /* How many products sit in it, shown in the overflow list. */
  products: number;
}

/* Six, because that is what fits on one line at the width this sits in, and
   because six covers around 86% of everything the yard has ever ordered. The
   ones beyond that are a click away, which is the right price for a page whose
   job is showing products. */
const VISIBLE = 6;
/* Some categories are named like a sentence — "Damcourse AKA Flashing,
   Waterproof Membrane" — and two of those wrap the row on their own. The chip
   shows as much as fits and carries the full name as its tooltip; the overflow
   list, which has room, always shows it whole. */
const CHIP_CHARS = 22;
const short = (s: string) => (s.length > CHIP_CHARS ? s.slice(0, CHIP_CHARS - 1).trimEnd() + "…" : s);

export default function CategoryPicker({
  options,
  value,
  onChange,
}: {
  options: CategoryOption[];
  value: string;
  onChange: (name: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [find, setFind] = useState("");
  const wrap = useRef<HTMLDivElement>(null);

  const ranked = useMemo(
    () =>
      [...options].sort((a, b) => b.weight - a.weight || a.name.localeCompare(b.name)),
    [options]
  );

  /* The row: the busiest few, plus whatever is selected if it did not make the
     cut, so it can always be seen and cleared. */
  const shown = useMemo(() => {
    const top = ranked.slice(0, VISIBLE).map((c) => c.name);
    if (value !== "All" && !top.includes(value)) top.push(value);
    return top;
  }, [ranked, value]);

  const hidden = ranked.filter((c) => !shown.includes(c.name));

  useEffect(() => {
    if (!open) return;
    const away = (e: MouseEvent) => {
      if (wrap.current && !wrap.current.contains(e.target as Node)) setOpen(false);
    };
    const esc = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", away);
    document.addEventListener("keydown", esc);
    return () => {
      document.removeEventListener("mousedown", away);
      document.removeEventListener("keydown", esc);
    };
  }, [open]);

  useEffect(() => {
    if (!open) setFind("");
  }, [open]);

  const q = find.trim().toLowerCase();
  /* Search reaches every category, not only the hidden ones — someone typing
     "bulk" wants the answer whether or not it happens to be in the row. */
  const matches = (q ? ranked.filter((c) => c.name.toLowerCase().includes(q)) : hidden).slice(0, 60);

  const chip = (label: string, on: boolean, onClick: () => void, extra?: React.ReactNode) => (
    <div
      key={label}
      onClick={onClick}
      title={label}
      style={{
        cursor: "pointer",
        display: "flex",
        alignItems: "center",
        gap: 5,
        fontSize: 12,
        padding: "5px 11px",
        borderRadius: 9999,
        whiteSpace: "nowrap",
        border: `1px solid ${on ? "var(--border-strong)" : "var(--border-subtle)"}`,
        background: on ? "var(--surface-active)" : "transparent",
        color: on ? "var(--text-primary)" : "var(--text-muted)",
      }}
    >
      {short(label)}
      {extra}
    </div>
  );

  return (
    <div ref={wrap} style={{ position: "relative", display: "flex", gap: 6, flexWrap: "wrap", alignItems: "center" }}>
      {chip("All", value === "All", () => onChange("All"))}
      {shown.map((name) => chip(name, value === name, () => onChange(name)))}

      {hidden.length > 0 &&
        chip(
          open ? "Close" : `More`,
          open,
          () => setOpen((o) => !o),
          <>
            <span className="tabular" style={{ fontSize: 11, color: "var(--text-faint)" }}>
              {hidden.length}
            </span>
            <Icon name={open ? "chevron-up" : "chevron-down"} size={12} color="var(--text-faint)" />
          </>
        )}

      {open && (
        <div
          style={{
            position: "absolute",
            top: "calc(100% + 6px)",
            left: 0,
            zIndex: 20,
            width: "min(420px, 100%)",
            maxHeight: 320,
            display: "flex",
            flexDirection: "column",
            borderRadius: 10,
            background: "var(--surface-card)",
            border: "1px solid var(--border-default)",
            boxShadow: "0 18px 44px rgba(0,0,0,.5)",
          }}
        >
          <div style={{ padding: 8, borderBottom: "1px solid var(--border-subtle)" }}>
            <Input
              size="sm"
              icon="search"
              autoFocus
              placeholder="Find a category"
              value={find}
              onChange={(e: any) => setFind(e.target.value)}
            />
          </div>
          <div style={{ overflowY: "auto", padding: 6, display: "flex", flexDirection: "column", gap: 2 }}>
            {matches.map((c) => (
              <div
                key={c.name}
                onClick={() => {
                  onChange(c.name);
                  setOpen(false);
                }}
                style={{
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  padding: "7px 9px",
                  borderRadius: 7,
                  fontSize: 12,
                  background: value === c.name ? "var(--surface-active)" : "transparent",
                  color: value === c.name ? "var(--text-primary)" : "var(--text-body)",
                }}
              >
                <span style={{ flex: 1, minWidth: 0 }}>{c.name}</span>
                <span className="tabular" style={{ fontSize: 11, color: "var(--text-faint)", whiteSpace: "nowrap" }}>
                  {c.products} {c.products === 1 ? "product" : "products"}
                </span>
              </div>
            ))}
            {matches.length === 0 && (
              <div style={{ padding: 14, textAlign: "center", fontSize: 12, color: "var(--text-faint)" }}>
                No category by that name.
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
