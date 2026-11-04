import React from "react";

/* Two cells shared by the Orders list and the dispatch board's list view.

   Both exist because of the same request: the goods and the notes on an order
   are what decide which truck goes and how the driver gets in, and neither was
   visible without opening the order one at a time. They wrap to a few lines and
   then stop — the full text is on the title, so nothing is lost, but one long
   order cannot push every other row off the screen. */

function Clamped({ text, lines, style }: { text: string; lines: number; style?: React.CSSProperties }) {
  return (
    <span
      title={text}
      style={{
        display: "-webkit-box",
        WebkitLineClamp: lines,
        WebkitBoxOrient: "vertical" as any,
        overflow: "hidden",
        whiteSpace: "normal",
        textWrap: "pretty" as any,
        lineHeight: 1.45,
        ...style,
      }}
    >
      {text}
    </span>
  );
}

export function GoodsCell({ text, count }: { text: string; count: number }) {
  if (!count)
    return (
      <span style={{ fontSize: 11, color: "var(--attention)" }} title="This order has no line items">
        No items
      </span>
    );
  return <Clamped text={text} lines={3} style={{ fontSize: 11.5, color: "var(--text-body)" }} />;
}

export function NotesCell({ delivery, order }: { delivery: string | null; order: string | null }) {
  const d = (delivery || "").trim();
  const o = (order || "").trim();
  if (!d && !o) return <span style={{ fontSize: 11, color: "var(--text-faint)" }}>—</span>;
  return (
    <span style={{ display: "flex", flexDirection: "column", gap: 2 }}>
      {d && <Clamped text={d} lines={3} style={{ fontSize: 11.5, color: "var(--attention)" }} />}
      {o && <Clamped text={o} lines={2} style={{ fontSize: 11, color: "var(--text-faint)" }} />}
    </span>
  );
}
