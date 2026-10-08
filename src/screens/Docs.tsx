import React, { useEffect, useMemo, useRef, useState } from "react";
import { Button, Input, Tabs } from "../design-system/components.js";
import AppIcon from "./AppIcon";
import { CHANGE_LOG_URL, FUNCTION_GROUPS, GUIDES, RULES, type Guide } from "./docsContent";

/* The handbook, one click from wherever you are.

   Two things it deliberately does. It opens on the screen you are actually
   looking at — the answer to "what is this" should not require finding the
   right heading first. And searching drops the sections entirely and shows
   every match across all three, because someone hunting the word "statement"
   does not know whether it is a guide, a function or a rule. */

type Section = "screens" | "functions" | "rules";

export default function Docs({ nav, onClose }: { nav: string; onClose: () => void }) {
  const [query, setQuery] = useState("");
  const [section, setSection] = useState<Section>("screens");
  const bodyRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  /* Switching section or searching should start at the top, not halfway down
     the previous section's scroll position. */
  useEffect(() => {
    if (bodyRef.current) bodyRef.current.scrollTop = 0;
  }, [section, query]);

  /* Screens in the order they appear in the sidebar, except the one you are on,
     which comes first. */
  const screenGroups = useMemo(() => {
    const order: string[] = [];
    const byScreen = new Map<string, Guide[]>();
    for (const g of GUIDES) {
      const list = byScreen.get(g.screen);
      if (list) list.push(g);
      else {
        byScreen.set(g.screen, [g]);
        order.push(g.screen);
      }
    }
    const here = GUIDES.find((g) => g.nav === nav)?.screen;
    const names = here ? [here, ...order.filter((n) => n !== here)] : order;
    return names.map((name) => ({ name, here: name === here, items: byScreen.get(name)! }));
  }, [nav]);

  const q = query.trim().toLowerCase();
  const hit = (...parts: (string | undefined)[]) => !q || parts.some((p) => p?.toLowerCase().includes(q));

  const foundGuides = useMemo(
    () => (q ? GUIDES.filter((g) => hit(g.screen, g.part, g.what, g.note)) : []),
    [q]
  );
  const foundFns = useMemo(
    () => (q ? FUNCTION_GROUPS.flatMap((gr) => gr.items).filter((f) => hit(f.name, f.where, f.what)) : []),
    [q]
  );
  const foundRules = useMemo(() => (q ? RULES.filter((r) => hit(r.title, r.what, r.why)) : []), [q]);
  const found = foundGuides.length + foundFns.length + foundRules.length;

  return (
    <div
      onClick={onClose}
      style={{
        position: "absolute",
        inset: 0,
        zIndex: 35,
        display: "flex",
        justifyContent: "flex-end",
        background: "rgba(6,7,15,.62)",
        backdropFilter: "blur(6px) saturate(130%)",
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-label="Handbook"
        style={{
          width: "min(640px,100%)",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          background: "var(--surface-card)",
          borderLeft: "1px solid var(--border-default)",
          boxShadow: "-24px 0 64px rgba(0,0,0,.5)",
        }}
      >
        <div style={{ flexShrink: 0, padding: "14px 16px 0" }}>
          <div style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
            <AppIcon name="book-open" size={18} color="var(--brand-primary)" style={{ marginTop: 2 }} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 15, fontWeight: 600, color: "var(--text-primary)", letterSpacing: "-0.02em" }}>Handbook</div>
              <div style={{ fontSize: 12, color: "var(--text-faint)", marginTop: 2, textWrap: "pretty" as any }}>
                What each part of SwiftDispatch does, and how to use it.
              </div>
            </div>
            <div
              onClick={onClose}
              title="Close (Esc)"
              style={{
                cursor: "pointer",
                width: 28,
                height: 28,
                flexShrink: 0,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                borderRadius: 6,
                border: "1px solid var(--border-subtle)",
                color: "var(--text-muted)",
              }}
            >
              <AppIcon name="x" size={14} />
            </div>
          </div>

          <div style={{ marginTop: 12 }}>
            <Input
              size="sm"
              icon="search"
              placeholder="Search the handbook — statement, split, stock…"
              value={query}
              onChange={(e: any) => setQuery(e.target.value)}
            />
          </div>

          {!q && (
            <div style={{ marginTop: 10 }}>
              <Tabs
                items={[
                  { id: "screens", label: "By screen" },
                  { id: "functions", label: "What it can do" },
                  { id: "rules", label: "House rules" },
                ]}
                activeId={section}
                onSelect={(id: string) => setSection(id as Section)}
                variant="segmented"
                fullWidth
              />
            </div>
          )}
        </div>

        <div ref={bodyRef} style={{ flex: 1, minHeight: 0, overflowY: "auto", padding: "14px 16px 16px" }}>
          {q ? (
            found === 0 ? (
              <Empty query={query} />
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
                <div style={{ fontSize: 12, color: "var(--text-faint)" }}>
                  {found} {found === 1 ? "match" : "matches"} for “{query.trim()}”
                </div>
                {foundGuides.length > 0 && (
                  <Group title="Guides">
                    {foundGuides.map((g) => (
                      <GuideRow key={g.screen + g.part} g={g} withScreen />
                    ))}
                  </Group>
                )}
                {foundFns.length > 0 && (
                  <Group title="Functions">
                    {foundFns.map((f) => (
                      <FnRow key={f.name} name={f.name} where={f.where} what={f.what} />
                    ))}
                  </Group>
                )}
                {foundRules.length > 0 && (
                  <Group title="House rules">
                    {foundRules.map((r) => (
                      <RuleRow key={r.title} title={r.title} what={r.what} why={r.why} />
                    ))}
                  </Group>
                )}
              </div>
            )
          ) : section === "screens" ? (
            <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
              {screenGroups.map((s) => (
                <Group key={s.name} title={s.name} here={s.here}>
                  {s.items.map((g) => (
                    <GuideRow key={g.part} g={g} />
                  ))}
                </Group>
              ))}
            </div>
          ) : section === "functions" ? (
            <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
              {FUNCTION_GROUPS.map((gr) => (
                <Group key={gr.group} title={gr.group}>
                  {gr.items.map((f) => (
                    <FnRow key={f.name} name={f.name} where={f.where} what={f.what} />
                  ))}
                </Group>
              ))}
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
              <div style={{ fontSize: 12, color: "var(--text-faint)", textWrap: "pretty" as any }}>
                The decisions the app makes on your behalf, and why. Worth reading once — most of them exist because the old
                system did the opposite.
              </div>
              <Group title="House rules">
                {RULES.map((r) => (
                  <RuleRow key={r.title} title={r.title} what={r.what} why={r.why} />
                ))}
              </Group>
            </div>
          )}
        </div>

        <div
          style={{
            flexShrink: 0,
            display: "flex",
            alignItems: "center",
            gap: 10,
            flexWrap: "wrap",
            padding: "10px 16px",
            borderTop: "1px solid var(--border-subtle)",
            background: "var(--surface-raised)",
          }}
        >
          <span style={{ fontSize: 12, color: "var(--text-faint)", flex: 1, minWidth: 180, textWrap: "pretty" as any }}>
            Something missing, wrong, or worth changing? Write it in the change sheet.
          </span>
          <Button
            variant="outline"
            size="sm"
            iconLeft="external-link"
            onClick={() => window.open(CHANGE_LOG_URL, "_blank", "noopener")}
          >
            Change sheet
          </Button>
        </div>
      </div>
    </div>
  );
}

function Group({ title, here, children }: { title: string; here?: boolean; children: React.ReactNode }) {
  return (
    <section style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <h3
          style={{
            margin: 0,
            fontSize: 11,
            fontWeight: 600,
            textTransform: "uppercase",
            letterSpacing: ".09em",
            color: "var(--text-faint)",
          }}
        >
          {title}
        </h3>
        {here && (
          <span
            style={{
              fontSize: 10,
              padding: "1px 6px",
              borderRadius: 999,
              border: "1px solid var(--border-subtle)",
              background: "var(--surface-raised)",
              color: "var(--brand-primary)",
            }}
          >
            You're here
          </span>
        )}
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>{children}</div>
    </section>
  );
}

function Panel({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        padding: "10px 12px",
        borderRadius: 10,
        border: "1px solid var(--border-subtle)",
        background: "var(--surface-raised)",
        display: "flex",
        flexDirection: "column",
        gap: 4,
      }}
    >
      {children}
    </div>
  );
}

function GuideRow({ g, withScreen }: { g: Guide; withScreen?: boolean }) {
  return (
    <Panel>
      <div style={{ fontSize: 13, fontWeight: 600, color: "var(--text-primary)" }}>
        {g.part}
        {withScreen && <span style={{ fontWeight: 400, color: "var(--text-faint)" }}> · {g.screen}</span>}
      </div>
      <div style={{ fontSize: 12, color: "var(--text-body)", lineHeight: 1.55, textWrap: "pretty" as any }}>{g.what}</div>
      {g.note && <Note>{g.note}</Note>}
    </Panel>
  );
}

function FnRow({ name, where, what }: { name: string; where: string; what: string }) {
  return (
    <Panel>
      <div style={{ display: "flex", alignItems: "baseline", gap: 8, flexWrap: "wrap" }}>
        <span style={{ fontSize: 13, fontWeight: 600, color: "var(--text-primary)" }}>{name}</span>
        <span style={{ fontSize: 11, color: "var(--text-faint)" }}>{where}</span>
      </div>
      <div style={{ fontSize: 12, color: "var(--text-body)", lineHeight: 1.55, textWrap: "pretty" as any }}>{what}</div>
    </Panel>
  );
}

function RuleRow({ title, what, why }: { title: string; what: string; why: string }) {
  return (
    <Panel>
      <div style={{ fontSize: 13, fontWeight: 600, color: "var(--text-primary)" }}>{title}</div>
      <div style={{ fontSize: 12, color: "var(--text-body)", lineHeight: 1.55, textWrap: "pretty" as any }}>{what}</div>
      <Note>{why}</Note>
    </Panel>
  );
}

function Note({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        display: "flex",
        gap: 6,
        marginTop: 2,
        fontSize: 11,
        color: "var(--text-faint)",
        lineHeight: 1.5,
        textWrap: "pretty" as any,
      }}
    >
      <AppIcon name="info" size={12} style={{ marginTop: 2 }} />
      <span>{children}</span>
    </div>
  );
}

function Empty({ query }: { query: string }) {
  return (
    <div style={{ padding: "28px 8px", textAlign: "center", color: "var(--text-faint)" }}>
      <AppIcon name="search" size={20} />
      <div style={{ fontSize: 13, marginTop: 8, color: "var(--text-muted)" }}>Nothing in the handbook matches “{query.trim()}”.</div>
      <div style={{ fontSize: 12, marginTop: 4, textWrap: "pretty" as any }}>
        If it is something the app should do and does not, add it to the change sheet below.
      </div>
    </div>
  );
}
