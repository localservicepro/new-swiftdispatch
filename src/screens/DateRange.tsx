import React from "react";
import { useUi } from "../store/ui";
import { dmy, isoFromDmy } from "../lib/domain";
import { PickerField } from "./DateWindowPicker";

/* From / To, on the same calendar orders are booked on.

   Orders, the board and Reports each offered Today, This week, This month and
   All time, and the yard's actual question is "the invoice from around the
   12th for about two hundred dollars". Two fields, either may be left open,
   values kept as ISO dates so the screens can compare them directly. */
export default function DateRangeFields({
  from,
  to,
  onChange,
}: {
  from: string;
  to: string;
  onChange: (next: { from: string; to: string }) => void;
}) {
  const ui = useUi();
  const open = (which: "from" | "to") =>
    ui.set({
      picker: {
        kind: "date",
        current: dmy(which === "from" ? from : to) || undefined,
        onPick: (v) => {
          const iso = isoFromDmy(v) || "";
          onChange(which === "from" ? { from: iso, to } : { from, to: iso });
        },
      },
    });
  return (
    <div style={{ display: "flex", gap: 8, alignItems: "flex-end" }}>
      <div style={{ width: 130 }}>
        <PickerField label="From" icon="calendar" value={dmy(from) || "Any"} onClick={() => open("from")} />
      </div>
      <div style={{ width: 130 }}>
        <PickerField label="To" icon="calendar" value={dmy(to) || "Any"} onClick={() => open("to")} />
      </div>
      {(from || to) && (
        <span onClick={() => onChange({ from: "", to: "" })} style={{ cursor: "pointer", fontSize: 11, color: "var(--brand-primary)", paddingBottom: 10, whiteSpace: "nowrap" }}>
          Clear
        </span>
      )}
    </div>
  );
}
