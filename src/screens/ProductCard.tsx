import React, { useEffect, useState } from "react";
import { AUD, qtyText } from "../lib/domain";
import type { Product } from "../lib/types";
import { Badge, Icon } from "../design-system/components.js";

/* One product card, shown in two places: the Products tab, where tapping it
   opens the product for editing, and the New order screen, where tapping it
   puts the product in the cart.

   They are the same card deliberately. Someone who has learnt to read the
   catalogue — where the photograph sits, where the price sits, what a struck-out
   price means — should not have to learn it twice. What differs is only the
   bottom line and what a tap does, so that is all this takes as props. */

export interface ProductCardProps {
  p: Product;
  /* Price after any live special; struck through against list price when lower. */
  effective: number;
  /* Shown under the name beside the SKU — a category on the catalogue, nothing
     on the order screen where the category is already the active filter. */
  subtitle?: string;
  onClick: () => void;
  /* Sits along the bottom. Stock on the catalogue, a quantity stepper on the
     order screen. */
  footer?: React.ReactNode;
  /* Drawn as a ring, so a product already in the cart is obvious at a glance. */
  selected?: boolean;
  /* Top-left, over the photograph. */
  badges?: React.ReactNode;
  /* Bottom-right, over the photograph — how much of this is already in the
     order. The ring around a selected card is easy to miss when you are
     scanning four columns of photographs, and the whole question while
     scrolling is "have I added this one yet".

     Bottom rather than top so it never collides with the badges on the left:
     a product that is both out of stock and already in the order had the two
     sitting on top of each other. */
  corner?: React.ReactNode;
  compact?: boolean;
}

export default function ProductCard({
  p,
  effective,
  subtitle,
  onClick,
  footer,
  selected = false,
  badges,
  corner,
  compact = false,
}: ProductCardProps) {
  const [hover, setHover] = useState(false);
  /* A URL that 404s is the same as no photograph as far as the yard is
     concerned, and a torn image icon is not something to put in front of
     someone taking an order. */
  const [broken, setBroken] = useState(false);
  useEffect(() => setBroken(false), [p.image_url]);

  const onSpecial = effective < Number(p.price);
  const showImage = !!p.image_url && !broken;

  return (
    <div
      onClick={onClick}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        display: "flex",
        flexDirection: "column",
        cursor: "pointer",
        overflow: "hidden",
        borderRadius: "var(--radius-lg)",
        background: "var(--surface-card)",
        border: `1px solid ${
          selected ? "var(--border-accent)" : hover ? "var(--border-strong)" : "var(--border-subtle)"
        }`,
        boxShadow: selected ? "var(--glow-brand)" : hover ? "var(--shadow-md)" : "var(--shadow-sm)",
        transform: hover ? "translateY(-2px)" : "none",
        transition: "var(--transition-surface)",
        opacity: p.active ? 1 : 0.6,
      }}
    >
      <div
        style={{
          position: "relative",
          aspectRatio: "4 / 3",
          background: "var(--surface-raised)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        {showImage ? (
          <img
            src={p.image_url!}
            alt=""
            loading="lazy"
            onError={() => setBroken(true)}
            /* Positioned out of flow so the 4:3 well keeps its shape: an in-flow
               img with height:100% resolves against its own intrinsic ratio and
               stretches the box, which leaves photographed products taller than
               unphotographed ones and the grid ragged. */
            style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover" }}
          />
        ) : (
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 5 }}>
            <Icon name="package" size={compact ? 20 : 26} color="var(--text-faint)" />
            <span style={{ fontSize: 10, letterSpacing: ".06em", textTransform: "uppercase", color: "var(--text-faint)" }}>
              No photo
            </span>
          </div>
        )}
        {badges && (
          <div style={{ position: "absolute", top: 8, left: 8, display: "flex", gap: 6, flexWrap: "wrap" }}>{badges}</div>
        )}
        {corner && <div style={{ position: "absolute", bottom: 8, right: 8 }}>{corner}</div>}
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 5, padding: compact ? 10 : 12, flex: 1 }}>
        <div style={{ fontSize: compact ? 12 : 13, fontWeight: 600, lineHeight: 1.3, color: "var(--text-primary)" }}>
          {p.name}
        </div>
        <div style={{ fontSize: 11, color: "var(--text-faint)" }}>
          <span style={{ fontFamily: "'JetBrains Mono',monospace" }}>{p.sku}</span>
          {subtitle ? ` · ${subtitle}` : ""}
        </div>
        <span style={{ flex: 1 }} />
        <div style={{ display: "flex", alignItems: "baseline", gap: 6, flexWrap: "wrap" }}>
          <span
            className="tabular"
            style={{ fontSize: 14, fontWeight: 600, color: onSpecial ? "var(--feedback-success)" : "var(--text-primary)" }}
          >
            {AUD(effective)}
          </span>
          {onSpecial && (
            <span className="tabular" style={{ fontSize: 11, color: "var(--text-faint)", textDecoration: "line-through" }}>
              {AUD(Number(p.price))}
            </span>
          )}
          <span style={{ fontSize: 11, color: "var(--text-faint)" }}>/ {p.unit}</span>
        </div>
        {footer}
      </div>
    </div>
  );
}

/* The catalogue's bottom line: what is on the shelf, or an admission that
   nobody knows. Most of the catalogue came from an app that seeded a number
   per product rather than counting, so saying "8,999,998 on hand" would be
   inventing a fact. */
export function StockLine({ p }: { p: Product }) {
  if (!p.track_stock) {
    return <div style={{ fontSize: 11, color: "var(--text-faint)" }}>Stock not tracked</div>;
  }
  const stock =
    p.kind === "variable" ? (p.variants || []).reduce((t, v) => t + Number(v.stock || 0), 0) : Number(p.stock);
  return (
    <div className="tabular" style={{ fontSize: 11, color: stock > 0 ? "var(--text-muted)" : "var(--attention)" }}>
      {stock > 0 ? `${qtyText(stock, p.unit)} on hand` : "None on hand"}
    </div>
  );
}

/* The badges the catalogue shows over the photograph. */
export function CatalogueBadges({ p, onSpecial }: { p: Product; onSpecial: boolean }) {
  return (
    <>
      {onSpecial && <Badge tone="success">Special</Badge>}
      {!p.active && <Badge tone="neutral">Inactive</Badge>}
      {p.kind === "variable" && <Badge tone="info">{(p.variants || []).length} variants</Badge>}
    </>
  );
}
