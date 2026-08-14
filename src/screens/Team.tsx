import React, { useState } from "react";
import { useApp } from "../store/store";
import { ROLES } from "../lib/domain";
import type { TeamRole } from "../lib/types";
import { addTeamMember, genPin, patchTeamMember, removeTeamMember } from "../data/api";
import { Button, Card, Icon, Input, Select, StatCard, Switch, Tabs } from "../design-system/components.js";

export default function Team() {
  const { team, user } = useApp();
  const [roleFilter, setRoleFilter] = useState("Everyone");
  const [addOpen, setAddOpen] = useState(false);
  const [nt, setNt] = useState({ name: "", role: "driver" as TeamRole, email: "", phone: "" });
  const [smsSent, setSmsSent] = useState<Record<string, string>>({});

  const admins = team.filter((p) => p.role !== "driver");
  const drivers = team.filter((p) => p.role === "driver");
  const cards = team.filter((p) => {
    if (roleFilter === "Everyone") return true;
    if (roleFilter === "Admins") return p.role !== "driver";
    return p.role === "driver";
  });

  const roleOptions = Object.values(ROLES).map((r) => ({ value: r.key, label: r.label }));

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12, maxWidth: 1400 }}>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(180px,1fr))", gap: 10 }}>
        <StatCard label="People" value={String(team.length)} icon="users" tone="neutral" />
        <StatCard label="Admins" value={String(admins.length)} icon="shield-check" tone="info" />
        <StatCard label="Drivers" value={String(drivers.length)} icon="truck" tone="neutral" />
        <StatCard label="On duty today" value={String(team.filter((p) => p.active).length)} icon="badge-check" tone="success" />
      </div>

      <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
        <Tabs
          items={[
            { id: "Everyone", label: "Everyone", count: team.length },
            { id: "Drivers", label: "Drivers", count: drivers.length },
            { id: "Admins", label: "Admins", count: admins.length },
          ]}
          activeId={roleFilter}
          onSelect={setRoleFilter}
          variant="segmented"
        />
        <div style={{ flex: 1 }} />
        <Button variant="primary" size="sm" iconLeft="plus" onClick={() => setAddOpen(!addOpen)}>
          {addOpen ? "Cancel" : "Add someone"}
        </Button>
      </div>

      {addOpen && (
        <Card title="Add someone" subtitle="A name and a role is enough — the rest can follow" padding="default">
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(170px,1fr))", gap: 10 }}>
              <Input size="sm" label="Name" value={nt.name} onChange={(e: any) => setNt({ ...nt, name: e.target.value })} placeholder="e.g. Dan Whitlock" />
              <Select size="sm" label="Role" options={roleOptions} value={nt.role} onChange={(e: any) => setNt({ ...nt, role: e.target.value })} />
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(170px,1fr))", gap: 10 }}>
              <Input size="sm" label="Email (optional)" value={nt.email} onChange={(e: any) => setNt({ ...nt, email: e.target.value })} placeholder="name@surreyhills.com.au" />
              <Input size="sm" label="Phone (optional)" value={nt.phone} onChange={(e: any) => setNt({ ...nt, phone: e.target.value })} placeholder="0412 000 000" />
            </div>
            <div style={{ fontSize: 12, color: "var(--text-muted)", textWrap: "pretty" as any }}>
              {(ROLES[nt.role]?.note || "") + " Stored as " + nt.role + "."}
            </div>
            <Button
              variant="primary"
              size="md"
              iconLeft="check"
              disabled={!nt.name.trim()}
              onClick={() => {
                void addTeamMember({ name: nt.name.trim(), role: nt.role, email: nt.email.trim() || null, phone: nt.phone.trim() || null });
                setNt({ name: "", role: "driver", email: "", phone: "" });
                setAddOpen(false);
              }}
            >
              Add to the team
            </Button>
          </div>
        </Card>
      )}

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(300px,1fr))", gap: 12, alignItems: "start" }}>
        {cards.map((p) => {
          const r = ROLES[p.role] || ROLES.driver;
          const self = p.id === user?.id;
          const cannotRemove = self || p.is_owner;
          return (
            <Card key={p.id} padding="default">
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                <div style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
                  <div style={{ width: 34, height: 34, flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center", borderRadius: 8, background: "var(--surface-raised)", color: "var(--text-muted)" }}>
                    <Icon name={r.icon} size={15} />
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 14, fontWeight: 600, color: "var(--text-primary)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {p.name + (self ? " (you)" : "")}
                    </div>
                    <div style={{ fontSize: 11, color: "var(--text-faint)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {[p.email, p.phone].filter(Boolean).join(" · ") || "No contact on file"}
                    </div>
                  </div>
                  <div
                    onClick={() => !cannotRemove && removeTeamMember(p.id)}
                    title={cannotRemove ? "You cannot remove your own access" : `Remove ${p.name}`}
                    style={{ cursor: cannotRemove ? "not-allowed" : "pointer", width: 24, height: 24, flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center", borderRadius: 6, border: "1px solid var(--border-default)", color: cannotRemove ? "var(--text-faint)" : "var(--text-muted)" }}
                  >
                    <Icon name="trash-2" size={12} />
                  </div>
                </div>

                <Select size="sm" label="Role" options={roleOptions} value={p.role} onChange={(e: any) => patchTeamMember(p.id, { role: e.target.value })} />

                <div style={{ display: "flex", flexWrap: "wrap", gap: 5 }}>
                  {r.perms.map((label) => (
                    <span key={label} style={{ fontSize: 11, padding: "2px 8px", borderRadius: 9999, whiteSpace: "nowrap", border: "1px solid var(--border-subtle)", background: "var(--surface-raised)", color: "var(--text-muted)" }}>
                      {label}
                    </span>
                  ))}
                </div>

                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, paddingTop: 8, borderTop: "1px solid var(--border-subtle)" }}>
                  <span style={{ fontSize: 12, color: "var(--text-faint)" }}>
                    {p.role === "driver" ? (p.active ? "Rostered today" : "Not rostered") : p.active ? "Access on" : "Access suspended"}
                  </span>
                  <Switch checked={p.active} onChange={(v: boolean) => patchTeamMember(p.id, { active: v })} />
                </div>

                <div style={{ display: "flex", flexDirection: "column", gap: 8, paddingTop: 8, borderTop: "1px solid var(--border-subtle)" }}>
                  <div style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: ".09em", color: "var(--text-faint)" }}>
                    {p.role === "driver" ? "Driver portal PIN" : "Admin sign-in PIN"}
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <div className="tabular" style={{ flex: 1, fontSize: 16, fontWeight: 700, letterSpacing: ".1em", color: "var(--brand-primary)" }}>
                      {p.pin || "— not set —"}
                    </div>
                    <Button variant="outline" size="sm" iconLeft="repeat" onClick={() => patchTeamMember(p.id, { pin: genPin() })}>
                      New PIN
                    </Button>
                    <Button
                      variant="secondary"
                      size="sm"
                      iconLeft="mail"
                      disabled={!p.pin || !p.phone}
                      onClick={() => setSmsSent((prev) => ({ ...prev, [p.id]: `Sent to ${p.phone} just now.` }))}
                    >
                      Send via SMS
                    </Button>
                  </div>
                  {smsSent[p.id] && <div style={{ fontSize: 11, color: "var(--feedback-success)" }}>{smsSent[p.id]}</div>}
                </div>
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
