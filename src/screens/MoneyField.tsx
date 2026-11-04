import React, { useState } from "react";
import { Input } from "../design-system/components.js";

/* A dollar amount you can actually type into.

   The delivery fee fields showed `fee.toFixed(2)` and wrote back on every
   keystroke. Type a 1 and the field becomes "1.00" with the caret wherever the
   browser left it; try for 15 and you get 1.005 or 51.00 or nothing. The yard
   called it "extremely difficult to use", which is generous.

   Same answer as the quantity fields: hold what is typed, verbatim, while the
   field has focus, and commit once on blur or Enter. Empty on blur commits
   nothing, so clearing a fee you did not mean to touch leaves it alone. */
export default function MoneyField({
  label,
  value,
  onCommit,
  size = "sm",
  suffix = "AUD",
  style,
}: {
  label?: string;
  value: number;
  onCommit: (n: number) => void;
  size?: "sm" | "md";
  suffix?: string;
  style?: React.CSSProperties;
}) {
  const [draft, setDraft] = useState<string | null>(null);
  const shown = draft === null ? Number(value || 0).toFixed(2) : draft;

  const commit = () => {
    if (draft === null) return;
    const raw = draft.trim();
    setDraft(null);
    if (raw === "") return;
    const n = parseFloat(raw);
    if (isNaN(n)) return;
    const rounded = Math.round(n * 100) / 100;
    if (Math.abs(rounded - value) < 0.005) return;
    onCommit(rounded);
  };

  return (
    <Input
      size={size}
      label={label}
      value={shown}
      suffix={suffix}
      inputMode="decimal"
      style={style}
      onFocus={() => setDraft(value ? String(Math.round(value * 100) / 100) : "")}
      onChange={(e: any) => setDraft(String(e.target.value).replace(/[^0-9.]/g, "").replace(/(\..*)\./g, "$1"))}
      onBlur={commit}
      onKeyDown={(e: any) => {
        if (e.key === "Enter") (e.target as HTMLInputElement).blur();
        if (e.key === "Escape") setDraft(null);
      }}
    />
  );
}
