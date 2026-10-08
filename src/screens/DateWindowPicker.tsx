import React, { useEffect, useState } from "react";
import { useUi } from "../store/ui";
import { WINDOWS_30, WINDOWS_60 } from "../lib/domain";
import { Button, Icon } from "../design-system/components.js";

/* The date and delivery-window picker, and the field that opens it.

   It lived inside the new-order screen, which is why editing an order came with
   a different and worse arrangement — a text box you had to type 14/09/2026
   into, character by character, against a value that was rewritten from the
   stored date on every keystroke, so it could not actually be changed at all.

   One picker, mounted once at the shell, driven by ui.picker. Anything that
   needs a date or a window opens the same thing and gets the same answer. */

export { PickerField };

function PickerField({ label, icon, value, onClick }: { label: string; icon: string; value: string; onClick: () => void }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
      <span style={{ fontSize: 11, color: "var(--text-faint)" }}>{label}</span>
      <div
        onClick={onClick}
        style={{
          cursor: "pointer",
          height: 36,
          display: "flex",
          alignItems: "center",
          gap: 8,
          padding: "0 10px",
          borderRadius: 6,
          border: "1px solid var(--border-default)",
          background: "var(--surface-input)",
          fontSize: 13,
          color: "var(--text-primary)",
          overflow: "hidden",
          textOverflow: "ellipsis",
          whiteSpace: "nowrap",
        }}
      >
        <Icon name={icon} size={14} color="var(--text-faint)" />
        {value}
      </div>
    </div>
  );
}

export default function DateWindowPicker() {
  const ui = useUi();
  const picker = ui.picker;
  const now = new Date();
  const [view, setView] = useState({ y: now.getFullYear(), m: now.getMonth() });

  /* Escape backs out without picking. It covers the whole window, so in a
     split-screen pane the backdrop you would otherwise have to click is the
     only way out and it is not obviously a way out. */
  useEffect(() => {
    if (!picker) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") ui.set({ picker: null });
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [!picker]);

  if (!picker) return null;

  const close = () => ui.set({ picker: null });
  const pick = (v: string) => {
    picker.onPick(v);
    close();
  };

  const grid = (() => {
    const first = new Date(view.y, view.m, 1);
    const startDow = first.getDay();
    const days = new Date(view.y, view.m + 1, 0).getDate();
    const cells: (number | null)[] = [];
    for (let i = 0; i < startDow; i++) cells.push(null);
    for (let d = 1; d <= days; d++) cells.push(d);
    while (cells.length % 7 !== 0) cells.push(null);
    return cells;
  })();

  const [selD, selM, selY] = String(picker.current || "")
    .split("/")
    .map(Number);

  return (
    <div
      onClick={close}
      style={{ position: "fixed", inset: 0, zIndex: 26, display: "flex", alignItems: "center", justifyContent: "center", padding: 24, background: "rgba(6,7,15,.72)", backdropFilter: "blur(10px) saturate(140%)" }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{ width: "min(340px,100%)", maxHeight: "min(560px,90vh)", display: "flex", flexDirection: "column", borderRadius: 16, background: "var(--surface-card)", border: "1px solid var(--border-default)", boxShadow: "0 24px 64px rgba(0,0,0,.6)", overflow: "hidden" }}
      >
        <div style={{ flexShrink: 0, padding: "14px 16px", borderBottom: "1px solid var(--border-subtle)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <span style={{ fontSize: 14, fontWeight: 600, color: "var(--text-primary)" }}>
            {picker.kind === "date" ? "Pick a date" : "Priority & delivery window"}
          </span>
          <div onClick={close} style={{ cursor: "pointer", width: 26, height: 26, display: "flex", alignItems: "center", justifyContent: "center", borderRadius: 6, color: "var(--text-muted)" }}>
            <Icon name="x" size={14} />
          </div>
        </div>

        {picker.kind === "date" ? (
          <div style={{ flex: 1, overflowY: "auto", padding: "14px 16px", display: "flex", flexDirection: "column", gap: 10 }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <NavBtn dir="arrow-left" onClick={() => setView((v) => (v.m === 0 ? { y: v.y - 1, m: 11 } : { y: v.y, m: v.m - 1 }))} />
              <span style={{ fontSize: 13, fontWeight: 600, color: "var(--text-primary)" }}>
                {new Date(view.y, view.m, 1).toLocaleDateString("en-AU", { month: "long", year: "numeric" })}
              </span>
              <NavBtn dir="arrow-right" onClick={() => setView((v) => (v.m === 11 ? { y: v.y + 1, m: 0 } : { y: v.y, m: v.m + 1 }))} />
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(7,1fr)", gap: 4 }}>
              {["S", "M", "T", "W", "T", "F", "S"].map((dw, i) => (
                <div key={i} style={{ textAlign: "center", fontSize: 11, color: "var(--text-faint)" }}>
                  {dw}
                </div>
              ))}
              {grid.map((d, i) => {
                if (d === null) return <div key={i} />;
                const isSel = d === selD && view.m === (selM || 0) - 1 && view.y === selY;
                const isToday = d === now.getDate() && view.m === now.getMonth() && view.y === now.getFullYear();
                return (
                  <div
                    key={i}
                    onClick={() => pick(`${String(d).padStart(2, "0")}/${String(view.m + 1).padStart(2, "0")}/${view.y}`)}
                    style={{
                      cursor: "pointer",
                      aspectRatio: "1",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      borderRadius: 8,
                      fontSize: 13,
                      background: isSel ? "var(--brand-primary)" : "transparent",
                      color: isSel ? "#ffffff" : "var(--text-primary)",
                      border: isToday && !isSel ? "1px solid var(--border-accent)" : "1px solid transparent",
                    }}
                  >
                    {d}
                  </div>
                );
              })}
            </div>
            <Button variant="ghost" size="sm" onClick={() => setView({ y: now.getFullYear(), m: now.getMonth() })}>
              Today
            </Button>
          </div>
        ) : (
          <div style={{ flex: 1, overflowY: "auto", padding: "6px 0" }}>
            <SectionLabel>Priority</SectionLabel>
            {[
              { value: "Urgent", icon: "zap", color: "var(--feedback-danger)" },
              { value: "ASAP", icon: "clock-fading", color: "var(--attention)" },
              { value: "Any time", icon: "calendar-clock", color: "var(--text-muted)" },
            ].map((p) => (
              <div key={p.value} onClick={() => pick(p.value)} style={{ cursor: "pointer", display: "flex", alignItems: "center", gap: 10, padding: "9px 16px", background: picker.current === p.value ? "var(--surface-active)" : "transparent" }}>
                <Icon name={p.icon} size={16} color={p.color} />
                <span style={{ fontSize: 14, fontWeight: 600, color: "var(--text-primary)" }}>{p.value}</span>
              </div>
            ))}
            <SectionLabel>30-Minute Windows</SectionLabel>
            {WINDOWS_30.map((w) => (
              <WindowRow key={w} label={w} selected={picker.current === w} onClick={() => pick(w)} />
            ))}
            <SectionLabel>1-Hour Windows</SectionLabel>
            {WINDOWS_60.map((w) => (
              <WindowRow key={w} label={w} selected={picker.current === w} onClick={() => pick(w)} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ padding: "12px 16px 4px", fontSize: 11, textTransform: "uppercase", letterSpacing: ".09em", color: "var(--text-faint)" }}>
      {children}
    </div>
  );
}

function NavBtn({ dir, onClick }: { dir: string; onClick: () => void }) {
  return (
    <div onClick={onClick} style={{ cursor: "pointer", width: 28, height: 28, display: "flex", alignItems: "center", justifyContent: "center", borderRadius: 6, border: "1px solid var(--border-subtle)", color: "var(--text-muted)" }}>
      <Icon name={dir} size={14} />
    </div>
  );
}

function WindowRow({ label, selected, onClick }: { label: string; selected: boolean; onClick: () => void }) {
  return (
    <div onClick={onClick} style={{ cursor: "pointer", display: "flex", alignItems: "center", gap: 10, padding: "9px 16px", background: selected ? "var(--surface-active)" : "transparent" }}>
      <Icon name="clock" size={14} color="var(--text-faint)" />
      <span style={{ fontSize: 13, color: "var(--text-primary)" }}>{label}</span>
    </div>
  );
}

