import React, { useState } from "react";
import { Input } from "../design-system/components.js";

/* A text field that writes once, not per keystroke.

   Customer names, ABNs and street lines used to be read-only on the customer
   record, and the obvious fix — an Input wired straight to patchCustomer — would
   send a row update to Supabase for every character typed. Same shape as
   MoneyField: hold the draft while the field has focus, commit on blur or
   Enter, and only if it actually changed. Escape puts the old value back. */
export default function DraftInput({
  label,
  value,
  onCommit,
  placeholder,
  size = "sm",
  allowEmpty = false,
  style,
}: {
  label?: string;
  value: string;
  onCommit: (v: string) => void;
  placeholder?: string;
  size?: "sm" | "md";
  /* Most fields here must not be blanked — a customer with no name is a bug,
     not a choice — so an empty blur is treated as "leave it". ABN and street
     can legitimately be cleared. */
  allowEmpty?: boolean;
  style?: React.CSSProperties;
}) {
  const [draft, setDraft] = useState<string | null>(null);
  const shown = draft === null ? value : draft;

  const commit = () => {
    if (draft === null) return;
    const next = draft.trim();
    setDraft(null);
    if (!next && !allowEmpty) return;
    if (next === (value || "").trim()) return;
    onCommit(next);
  };

  return (
    <Input
      size={size}
      label={label}
      value={shown}
      placeholder={placeholder}
      style={style}
      onFocus={() => setDraft(value || "")}
      onChange={(e: any) => setDraft(String(e.target.value))}
      onBlur={commit}
      onKeyDown={(e: any) => {
        if (e.key === "Enter") (e.target as HTMLInputElement).blur();
        if (e.key === "Escape") setDraft(null);
      }}
    />
  );
}
