import React from "react";
import { useApp } from "../store/store";

/* Signing in loads the last two months of orders and every order still open;
   the rest of the ledger arrives behind it. That is invisible on the dispatch
   board — nothing there is older than the window — but a screen that totals
   across all time is briefly reporting on part of the book, and a figure that
   is quietly wrong is worse than one that says it is still counting.

   So: anywhere an all-time total is shown, this sits beside it until the
   history has landed, and then disappears. */
export default function HistoryNotice({ what = "These figures" }: { what?: string }) {
  const { historyLoaded, historyLoading } = useApp();
  if (historyLoaded) return null;

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 8,
        padding: "8px 11px",
        borderRadius: 8,
        background: "var(--surface-raised)",
        border: "1px solid var(--border-subtle)",
        fontSize: 12,
        color: "var(--text-muted)",
        textWrap: "pretty" as any,
      }}
    >
      <span
        aria-hidden
        style={{
          width: 7,
          height: 7,
          flexShrink: 0,
          borderRadius: 4,
          background: historyLoading ? "var(--attention)" : "var(--text-faint)",
        }}
      />
      {historyLoading
        ? `${what} cover the last two months so far — older orders are still loading.`
        : `${what} cover the last two months. The older orders did not load; reload to try again.`}
    </div>
  );
}
