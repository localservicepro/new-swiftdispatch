import React, { useState } from "react";
import { useApp } from "../store/store";
import { TRUCK_TYPES } from "../lib/domain";
import type { Truck, TruckType } from "../lib/types";
import { patchTruck, removeTruck, upsertTruck } from "../data/api";
import { Badge, Button, Card, Icon, Input, Select, StatCard, Textarea } from "../design-system/components.js";

const STATUS_TONE: Record<string, string> = { Assigned: "info", Available: "success", Loading: "warning", "Out of service": "danger" };

const BLANK = { rego: "", type: "medium" as TruckType, capacity: "", fuel: "Diesel", year: "", last: "", next: "", notes: "" };

export default function Fleet() {
  const { trucks, orders, team } = useApp();
  const [editId, setEditId] = useState<string | null>(null);
  const [modal, setModal] = useState<typeof BLANK | null>(null);

  const openOrders = orders.filter((o) => !o.deleted_at && !["delivered", "cancelled"].includes(o.status));

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12, maxWidth: 1400 }}>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(170px,1fr))", gap: 10 }}>
        <StatCard label="Trucks" value={String(trucks.length)} icon="truck" tone="neutral" />
        <StatCard label="On the road" value={String(trucks.filter((t) => t.status === "Assigned").length)} icon="navigation" tone="info" />
        <StatCard label="Available" value={String(trucks.filter((t) => t.status === "Available").length)} icon="badge-check" tone="success" />
        <StatCard label="Out of service" value={String(trucks.filter((t) => t.status === "Out of service").length)} icon="circle-alert" tone="danger" />
      </div>

      <div style={{ display: "flex", justifyContent: "flex-end" }}>
        <Button variant="primary" size="sm" iconLeft="plus" onClick={() => { setEditId(null); setModal({ ...BLANK }); }}>
          Add truck
        </Button>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(300px,1fr))", gap: 12, alignItems: "start" }}>
        {trucks.map((t) => {
          const jobs = openOrders.filter((o) => o.truck_id === t.id);
          const driverId = jobs.find((o) => o.driver_id)?.driver_id;
          const driver = team.find((x) => x.id === driverId)?.name;
          const ty = TRUCK_TYPES[t.type] || TRUCK_TYPES.medium;
          return (
            <Card key={t.id} padding="default">
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
                  <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 16, fontWeight: 700, color: "var(--text-primary)" }}>{t.rego}</span>
                  <Badge tone={STATUS_TONE[t.status] || "neutral"} icon="map-pin">
                    {t.status}
                  </Badge>
                </div>

                <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 12px", borderRadius: 10, background: "var(--surface-raised)" }}>
                  <div style={{ width: 34, height: 34, flexShrink: 0, borderRadius: 8, background: "var(--surface-active)", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--text-muted)" }}>
                    <Icon name={ty.icon} size={16} />
                  </div>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontSize: 14, fontWeight: 600, color: "var(--text-primary)" }}>{ty.label}</div>
                    <div style={{ fontSize: 12, color: "var(--text-faint)" }}>{ty.sub}</div>
                  </div>
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                  <div>
                    <div style={{ fontSize: 11, color: "var(--text-faint)" }}>Capacity</div>
                    <div style={{ fontSize: 13, fontWeight: 600, color: "var(--text-primary)" }}>{t.capacity_tonnes ? `${t.capacity_tonnes} tonnes` : "—"}</div>
                  </div>
                  <div>
                    <div style={{ fontSize: 11, color: "var(--text-faint)" }}>Fuel</div>
                    <div style={{ fontSize: 13, fontWeight: 600, color: "var(--text-primary)" }}>{t.fuel || "—"}</div>
                  </div>
                </div>

                <div style={{ display: "flex", justifyContent: "space-between", gap: 8, fontSize: 12 }}>
                  <span style={{ color: "var(--text-faint)" }}>Driver today</span>
                  <span style={{ color: "var(--text-primary)" }}>{driver || "Unassigned"}</span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", gap: 8, fontSize: 12 }}>
                  <span style={{ color: "var(--text-faint)" }}>Assigned deliveries today</span>
                  <span className="tabular" style={{ color: "var(--text-primary)", fontWeight: 600 }}>{jobs.length}</span>
                </div>

                <Select size="sm" label="Change status" options={["Available", "Loading", "Assigned", "Out of service"]} value={t.status} onChange={(e: any) => patchTruck(t.id, { status: e.target.value })} />

                <div style={{ display: "flex", gap: 8 }}>
                  <div style={{ flex: 1 }}>
                    <Button
                      variant="outline"
                      size="sm"
                      iconLeft="pencil"
                      fullWidth
                      onClick={() => {
                        setEditId(t.id);
                        setModal({
                          rego: t.rego,
                          type: t.type,
                          capacity: t.capacity_tonnes ? String(t.capacity_tonnes) : "",
                          fuel: t.fuel || "Diesel",
                          year: t.year ? String(t.year) : "",
                          last: t.last_maintenance || "",
                          next: t.next_maintenance || "",
                          notes: t.notes || "",
                        });
                      }}
                    >
                      Edit details
                    </Button>
                  </div>
                  <div style={{ flex: 1 }}>
                    <Button
                      variant="outline"
                      size="sm"
                      iconLeft="trash-2"
                      fullWidth
                      disabled={jobs.length > 0}
                      title={jobs.length > 0 ? `Assigned to ${jobs.length} ${jobs.length === 1 ? "delivery" : "deliveries"} today — reassign first` : `Remove ${t.rego}`}
                      onClick={() => jobs.length === 0 && removeTruck(t.id)}
                    >
                      Remove
                    </Button>
                  </div>
                </div>

                {t.notes && (
                  <div style={{ paddingTop: 8, borderTop: "1px solid var(--border-subtle)" }}>
                    <div style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: ".07em", color: "var(--brand-primary)" }}>Notes</div>
                    <div style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 4, textWrap: "pretty" as any }}>{t.notes}</div>
                  </div>
                )}
              </div>
            </Card>
          );
        })}
      </div>

      {modal && (
        <div onClick={() => setModal(null)} style={{ position: "fixed", inset: 0, zIndex: 24, display: "flex", alignItems: "center", justifyContent: "center", padding: 24, background: "rgba(6,7,15,.72)", backdropFilter: "blur(10px) saturate(140%)" }}>
          <div onClick={(e) => e.stopPropagation()} style={{ width: "min(460px,100%)", maxHeight: "calc(100vh - 48px)", overflowY: "auto", borderRadius: 16, background: "var(--surface-card)", border: "1px solid var(--border-default)", boxShadow: "0 24px 64px rgba(0,0,0,.6)" }}>
            <div style={{ padding: 16, borderBottom: "1px solid var(--border-subtle)", display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 10 }}>
              <div>
                <div style={{ fontSize: 15, fontWeight: 600, color: "var(--text-primary)" }}>{editId ? "Edit truck details" : "Add a truck"}</div>
                <div style={{ fontSize: 12, color: "var(--text-faint)", marginTop: 3 }}>Registration number and truck type are required.</div>
              </div>
              <div onClick={() => setModal(null)} title="Close" style={{ cursor: "pointer", width: 26, height: 26, flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center", borderRadius: 6, border: "1px solid var(--border-subtle)", color: "var(--text-muted)" }}>
                <Icon name="x" size={14} />
              </div>
            </div>
            <div style={{ padding: 16, display: "flex", flexDirection: "column", gap: 10 }}>
              <Input size="md" label="Registration number" value={modal.rego} onChange={(e: any) => setModal({ ...modal, rego: e.target.value })} placeholder="e.g. 1EV2VK" />
              <Select
                size="md"
                label="Truck type"
                options={Object.entries(TRUCK_TYPES).map(([k, v]) => ({ value: k, label: v.label }))}
                value={modal.type}
                onChange={(e: any) => setModal({ ...modal, type: e.target.value })}
              />
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                <Input size="md" label="Capacity (tonnes)" value={modal.capacity} onChange={(e: any) => setModal({ ...modal, capacity: e.target.value.replace(/[^0-9.]/g, "") })} placeholder="e.g. 10" />
                <Select size="md" label="Fuel type" options={["Diesel", "Petrol", "Electric", "LPG"]} value={modal.fuel} onChange={(e: any) => setModal({ ...modal, fuel: e.target.value })} />
              </div>
              <Input size="md" label="Year manufactured" value={modal.year} onChange={(e: any) => setModal({ ...modal, year: e.target.value.replace(/[^0-9]/g, "").slice(0, 4) })} placeholder="e.g. 2020" />
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                <DateField label="Last maintenance date" value={modal.last} onChange={(v) => setModal({ ...modal, last: v })} />
                <DateField label="Next maintenance due" value={modal.next} onChange={(v) => setModal({ ...modal, next: v })} />
              </div>
              <Textarea label="Notes" value={modal.notes} onChange={(v: any) => setModal({ ...modal, notes: typeof v === "string" ? v : v.target.value })} placeholder="Clearance heights, tilt limits, load restrictions…" rows={3} />
            </div>
            <div style={{ padding: "12px 16px", borderTop: "1px solid var(--border-subtle)", display: "flex", gap: 8, justifyContent: "flex-end" }}>
              <Button variant="ghost" size="md" onClick={() => setModal(null)}>
                Cancel
              </Button>
              <Button
                variant="primary"
                size="md"
                iconLeft="check"
                disabled={!modal.rego.trim()}
                onClick={() => {
                  const row: Partial<Truck> & { id?: string } = {
                    id: editId || undefined,
                    rego: modal.rego.trim(),
                    type: modal.type,
                    capacity_tonnes: modal.capacity ? Number(modal.capacity) : null,
                    fuel: modal.fuel,
                    year: modal.year ? Number(modal.year) : null,
                    last_maintenance: modal.last || null,
                    next_maintenance: modal.next || null,
                    notes: modal.notes || null,
                  };
                  if (!editId) row.status = "Available";
                  void upsertTruck(row);
                  setModal(null);
                  setEditId(null);
                }}
              >
                Save truck
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function DateField({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
      <label style={{ fontSize: 12, color: "var(--text-muted)" }}>{label}</label>
      <input
        type="date"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        style={{ height: 38, padding: "0 10px", borderRadius: 6, border: "1px solid var(--border-default)", background: "var(--surface-input)", fontFamily: "inherit", fontSize: 13, color: "var(--text-primary)" }}
      />
    </div>
  );
}
