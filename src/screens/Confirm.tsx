import React, { useEffect } from "react";
import { Button, Icon } from "../design-system/components.js";

/* One confirmation dialog, for the handful of actions that cannot be undone
   with a click — deleting an order, removing a customer, dropping a saved
   address.

   It takes a body rather than a single line because the useful part of a
   confirmation is rarely the question. "Delete this customer?" tells you
   nothing; "they have 214 orders, so the record is kept and hidden rather than
   destroyed" tells you what is actually about to happen, which is the only
   thing worth reading before clicking. */
export default function Confirm({
  title,
  confirmLabel = "Delete",
  tone = "danger",
  icon = "triangle-alert",
  busy = false,
  onConfirm,
  onClose,
  children,
}: {
  title: string;
  confirmLabel?: string;
  tone?: "danger" | "primary";
  icon?: string;
  busy?: boolean;
  onConfirm: () => void;
  onClose: () => void;
  children?: React.ReactNode;
}) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 40,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 24,
        background: "var(--om-scrim)",
        backdropFilter: "blur(10px) saturate(140%)",
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-label={title}
        style={{
          width: "min(460px,100%)",
          borderRadius: 16,
          background: "var(--surface-card)",
          border: "1px solid var(--border-default)",
          boxShadow: "var(--om-overlay-shadow)",
        }}
      >
        <div style={{ padding: "16px 16px 0", display: "flex", gap: 10 }}>
          <Icon
            name={icon}
            size={17}
            color={tone === "danger" ? "var(--feedback-danger)" : "var(--brand-primary)"}
            style={{ marginTop: 1, flexShrink: 0 }}
          />
          <div style={{ minWidth: 0 }}>
            <div style={{ fontSize: 15, fontWeight: 600, color: "var(--text-primary)", textWrap: "pretty" as any }}>{title}</div>
            {children && (
              <div style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 6, lineHeight: 1.55, textWrap: "pretty" as any }}>
                {children}
              </div>
            )}
          </div>
        </div>
        <div style={{ padding: 16, display: "flex", gap: 8, justifyContent: "flex-end", flexWrap: "wrap" }}>
          <Button variant="ghost" size="md" onClick={onClose} disabled={busy}>
            Cancel
          </Button>
          <Button variant={tone === "danger" ? "danger" : "primary"} size="md" disabled={busy} onClick={onConfirm}>
            {busy ? "Working…" : confirmLabel}
          </Button>
        </div>
      </div>
    </div>
  );
}
