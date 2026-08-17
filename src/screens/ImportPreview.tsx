/* The import preview, shared by customers, products and suburbs.

   Every importer in the app makes the same bargain: reading a file produces a
   plan, the plan is shown in full, and nothing is written until it is
   confirmed. One component so that bargain looks and behaves identically
   wherever it is offered — and so a fourth importer is a mapping function
   rather than another hundred lines of modal. */

import React, { useState } from "react";
import { Alert, Button, Tabs } from "../design-system/components.js";

export type PreviewTone = "good" | "info" | "bad" | "warn" | "flat";

const COLOUR: Record<PreviewTone, string> = {
  good: "var(--feedback-success)",
  info: "var(--brand-primary)",
  bad: "var(--feedback-danger)",
  warn: "var(--attention)",
  flat: "var(--text-faint)",
};

export interface PreviewTile {
  label: string;
  value: number;
  tone: PreviewTone;
}

export interface PreviewRow {
  line: number;
  /* The word in the left column — "New", "Update", "Skip", "+ Variant". */
  action: string;
  tone: PreviewTone;
  label: string;
  /* Rendered monospaced beside the label: a SKU, an account number. */
  code?: string;
  /* Trailing context, such as the parent a variant hangs off. */
  trail?: string;
  reason?: string;
  warnings: string[];
}

export default function ImportPreview({
  title,
  fileName,
  tiles,
  notes = [],
  rows,
  footNote,
  writeCount,
  busy,
  onClose,
  onConfirm,
  actionWidth = 62,
  confirmIcon = "upload",
}: {
  title: string;
  fileName: string;
  tiles: PreviewTile[];
  notes?: { title: string; body: React.ReactNode }[];
  rows: PreviewRow[];
  footNote: string;
  writeCount: number;
  busy: boolean;
  onClose: () => void;
  onConfirm: () => void;
  actionWidth?: number;
  confirmIcon?: string;
}) {
  const rejects = rows.filter((r) => r.reason).length;
  const warnings = rows.reduce((t, r) => t + r.warnings.length, 0);
  /* Opens on the problems when there are any — that is what wants reading. */
  const [show, setShow] = useState<"all" | "reject" | "warn">(rejects ? "reject" : "all");
  const shown = rows.filter((r) =>
    show === "reject" ? !!r.reason : show === "warn" ? r.warnings.length > 0 : true
  );

  return (
    <div
      onClick={busy ? undefined : onClose}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 30,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 24,
        background: "rgba(6,7,15,.72)",
        backdropFilter: "blur(10px) saturate(140%)",
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: "min(760px,100%)",
          maxHeight: "86vh",
          borderRadius: 16,
          background: "var(--surface-card)",
          border: "1px solid var(--border-default)",
          boxShadow: "0 24px 64px rgba(0,0,0,.6)",
          display: "flex",
          flexDirection: "column",
        }}
      >
        <div style={{ padding: 16, borderBottom: "1px solid var(--border-subtle)" }}>
          <div style={{ fontSize: 15, fontWeight: 600, color: "var(--text-primary)" }}>{title}</div>
          <div style={{ fontSize: 12, color: "var(--text-faint)", marginTop: 3 }}>
            {fileName} — {rows.length} {rows.length === 1 ? "row" : "rows"} read. Nothing is saved until you confirm.
          </div>
        </div>

        <div style={{ padding: "12px 16px 0", display: "flex", gap: 8, flexWrap: "wrap" }}>
          {tiles.map((t) => (
            <div
              key={t.label}
              style={{
                flex: "1 1 110px",
                padding: "9px 11px",
                borderRadius: 8,
                background: "var(--surface-raised)",
                border: "1px solid var(--border-subtle)",
              }}
            >
              <div className="tabular" style={{ fontSize: 18, fontWeight: 600, color: COLOUR[t.value ? t.tone : "flat"] }}>
                {t.value}
              </div>
              <div style={{ fontSize: 11, color: "var(--text-faint)" }}>{t.label}</div>
            </div>
          ))}
        </div>

        {notes.map((n) => (
          <div key={n.title} style={{ padding: "12px 16px 0" }}>
            <Alert tone="info" title={n.title}>
              {n.body}
            </Alert>
          </div>
        ))}

        <div style={{ padding: "12px 16px 0" }}>
          <Tabs
            items={[
              { id: "all", label: "Every row", count: rows.length },
              { id: "reject", label: "Skipped", count: rejects },
              { id: "warn", label: "Warnings", count: warnings },
            ]}
            activeId={show}
            onSelect={(id: string) => setShow(id as any)}
            variant="underline"
          />
        </div>

        <div style={{ flex: 1, overflowY: "auto", padding: "10px 16px", display: "flex", flexDirection: "column", gap: 4 }}>
          {shown.map((r) => (
            <div
              key={r.line}
              style={{ display: "flex", alignItems: "flex-start", gap: 9, padding: "7px 9px", borderRadius: 7, background: "var(--surface-raised)" }}
            >
              <span className="tabular" style={{ flexShrink: 0, width: 34, fontSize: 11, color: "var(--text-faint)" }}>
                {r.line}
              </span>
              <span style={{ flexShrink: 0, width: actionWidth, fontSize: 11, fontWeight: 600, color: COLOUR[r.tone] }}>
                {r.action}
              </span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 12, color: "var(--text-primary)" }}>
                  {r.label || "(no name)"}
                  {r.code ? (
                    <span style={{ fontFamily: "'JetBrains Mono',monospace", color: "var(--text-faint)" }}> · {r.code}</span>
                  ) : null}
                  {r.trail ? <span style={{ color: "var(--text-faint)" }}> {r.trail}</span> : null}
                </div>
                {r.reason && (
                  <div style={{ fontSize: 11, color: "var(--feedback-danger)", textWrap: "pretty" as any }}>{r.reason}</div>
                )}
                {r.warnings.map((w) => (
                  <div key={w} style={{ fontSize: 11, color: "var(--attention)", textWrap: "pretty" as any }}>
                    {w}
                  </div>
                ))}
              </div>
            </div>
          ))}
          {shown.length === 0 && (
            <div style={{ padding: 20, textAlign: "center", fontSize: 12, color: "var(--text-faint)" }}>Nothing here.</div>
          )}
        </div>

        <div
          style={{ padding: "12px 16px", borderTop: "1px solid var(--border-subtle)", display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}
        >
          <span style={{ flex: 1, minWidth: 0, fontSize: 11, color: "var(--text-faint)", textWrap: "pretty" as any }}>
            {footNote}
          </span>
          <Button variant="ghost" size="md" disabled={busy} onClick={onClose}>
            Cancel
          </Button>
          <Button variant="primary" size="md" iconLeft={confirmIcon} disabled={busy || writeCount === 0} onClick={onConfirm}>
            {busy ? "Importing…" : writeCount === 0 ? "Nothing to import" : `Import ${writeCount} ${writeCount === 1 ? "row" : "rows"}`}
          </Button>
        </div>
      </div>
    </div>
  );
}
