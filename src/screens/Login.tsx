import React, { useState } from "react";
import { useApp } from "../store/store";
import { Icon } from "../design-system/components.js";

/* Admin PIN sign-in — super admins and admins only; a driver's PIN opens the
   driver portal, never this desk. */
export default function Login() {
  const login = useApp((s) => s.login);
  const [pin, setPin] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const press = async (d: string) => {
    if (busy) return;
    if (d === "back") {
      setPin((p) => p.slice(0, -1));
      setError("");
      return;
    }
    if (pin.length >= 4) return;
    const next = pin + d;
    setPin(next);
    setError("");
    if (next.length === 4) {
      setBusy(true);
      const u = await login(next);
      setBusy(false);
      if (!u) {
        setPin("");
        setError("That PIN doesn't match an active admin");
      }
    }
  };

  const keys = "1,2,3,4,5,6,7,8,9,,0,back".split(",");

  return (
    <div
      style={{
        height: "100%",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 24,
        fontFamily: "Inter, system-ui, sans-serif",
      }}
    >
      <div style={{ width: "100%", maxWidth: 340, display: "flex", flexDirection: "column", gap: 20 }}>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 8, textAlign: "center" }}>
          <img src="/swiftdispatch-mark.png" alt="" style={{ height: 40, width: 40, objectFit: "contain" }} />
          <div style={{ fontSize: 17, fontWeight: 600, color: "var(--text-primary)" }}>SwiftDispatch Pro</div>
          <div style={{ fontSize: 12, color: "var(--text-faint)" }}>Admin sign-in — super admins and admins only</div>
        </div>

        <div style={{ display: "flex", gap: 10, justifyContent: "center" }}>
          {[0, 1, 2, 3].map((i) => (
            <div
              key={i}
              style={{
                width: 48,
                height: 56,
                borderRadius: 10,
                background: "var(--surface-card)",
                border: "1px solid var(--border-default)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 22,
                fontWeight: 700,
                color: "var(--text-primary)",
              }}
            >
              {pin[i] ? "•" : ""}
            </div>
          ))}
        </div>

        {error && (
          <div style={{ textAlign: "center", fontSize: 12, color: "var(--feedback-danger)" }}>{error}</div>
        )}

        <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 8 }}>
          {keys.map((d, i) => (
            <div
              key={i}
              onClick={() => (d === "" ? undefined : void press(d))}
              style={{
                visibility: d === "" ? "hidden" : "visible",
                cursor: "pointer",
                height: 52,
                borderRadius: 10,
                background: "var(--surface-raised)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 18,
                fontWeight: 600,
                color: "var(--text-primary)",
                userSelect: "none",
                opacity: busy ? 0.6 : 1,
              }}
            >
              {d === "back" ? "⌫" : d}
            </div>
          ))}
        </div>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 8, paddingTop: 4 }}>
          <div style={{ fontSize: 11, color: "var(--text-faint)", textAlign: "center" }}>
            Drivers sign in from the Driver portal, not here.
          </div>
          <a
            href="#/driver"
            style={{
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 8,
              width: "100%",
              height: 44,
              borderRadius: 10,
              border: "1px solid var(--border-default)",
              background: "var(--surface-card)",
              fontSize: 14,
              fontWeight: 600,
              color: "var(--text-primary)",
              textDecoration: "none",
            }}
          >
            <Icon name="truck" size={16} color="var(--brand-primary)" />
            Driver sign-in
          </a>
          <a href="#/portal" style={{ fontSize: 12 }}>
            Customer portal
          </a>
        </div>
      </div>
    </div>
  );
}
