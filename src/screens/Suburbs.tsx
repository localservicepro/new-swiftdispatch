import React, { useState } from "react";
import { useApp } from "../store/store";
import { dmy } from "../lib/domain";
import { addSuburb, patchSuburb, removeSuburb } from "../data/api";
import { Alert, Button, Card, Icon, Input, Select, Switch } from "../design-system/components.js";

export default function Suburbs() {
  const { suburbs, orders } = useApp();
  const [query, setQuery] = useState("");
  const [stateFilter, setStateFilter] = useState("All states");
  const [addOpen, setAddOpen] = useState(false);
  const [nsu, setNsu] = useState({ name: "", postcode: "", state: "VIC", fee: "" });
  const [note, setNote] = useState<{ title: string; body: string } | null>(null);

  const sq = query.trim().toLowerCase();
  const matches = suburbs.filter((s) => {
    if (stateFilter !== "All states" && s.state !== stateFilter) return false;
    return !sq || `${s.name} ${s.postcode} ${s.state}`.toLowerCase().includes(sq);
  });

  /* A suburb in use by an open order cannot be deleted — its fee is still live. */
  const usedCount = (id: string) =>
    orders.filter((o) => !o.deleted_at && o.suburb_id === id && !["delivered", "cancelled"].includes(o.status)).length;

  const unrated = suburbs.filter((s) => s.active && !(Number(s.delivery_fee) > 0));
  const states = [...new Set(suburbs.map((s) => s.state))].sort();

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12, maxWidth: 1400 }}>
      <Alert tone="info" title="The suburb sets the delivery fee">
        An address resolves to one of these suburbs, and its rate is what the order charges. A suburb with no rate
        blocks the order rather than guessing from the street.
      </Alert>

      <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
        <div style={{ flex: "1 1 240px", minWidth: 200 }}>
          <Input size="sm" icon="search" value={query} onChange={(e: any) => setQuery(e.target.value)} placeholder="Suburb or postcode" />
        </div>
        <Select size="sm" options={["All states", ...states]} value={stateFilter} onChange={(e: any) => setStateFilter(e.target.value)} style={{ width: 150, flexShrink: 0 }} />
        <Button
          variant="ghost"
          size="sm"
          iconLeft="download"
          onClick={() =>
            setNote({
              title: "Import expects four columns",
              body: "suburb, postcode, state, delivery_fee. Rows are matched on postcode — an existing one updates its rate, a new one is added, and nothing is deleted. A blank fee imports as no rate, which blocks orders rather than charging zero.",
            })
          }
        >
          Import CSV
        </Button>
        <Button
          variant="ghost"
          size="sm"
          iconLeft="external-link"
          onClick={() =>
            setNote({
              title: `Exported ${suburbs.length} suburbs`,
              body: `suburbs-${dmy(new Date().toISOString().slice(0, 10))}.csv — suburb, postcode, state, delivery_fee. The file round-trips through Import unchanged.`,
            })
          }
        >
          Export
        </Button>
        <Button variant="primary" size="sm" iconLeft="plus" onClick={() => { setAddOpen(!addOpen); setNote(null); }}>
          {addOpen ? "Cancel" : "Add suburb"}
        </Button>
      </div>

      {note && (
        <Alert tone="info" title={note.title}>
          {note.body}
        </Alert>
      )}

      {addOpen && (
        <Card title="Add a suburb" padding="default">
          <div style={{ display: "flex", alignItems: "flex-end", gap: 10, flexWrap: "wrap" }}>
            <div style={{ flex: "1 1 180px", minWidth: 150 }}>
              <Input size="sm" label="Suburb" value={nsu.name} onChange={(e: any) => setNsu({ ...nsu, name: e.target.value })} placeholder="e.g. Torquay" />
            </div>
            <div style={{ flex: "0 1 120px", minWidth: 100 }}>
              <Input size="sm" label="Postcode" value={nsu.postcode} onChange={(e: any) => setNsu({ ...nsu, postcode: e.target.value.replace(/[^0-9]/g, "") })} placeholder="3228" />
            </div>
            <div style={{ flex: "0 1 110px", minWidth: 90 }}>
              <Input size="sm" label="State" value={nsu.state} onChange={(e: any) => setNsu({ ...nsu, state: e.target.value.toUpperCase().slice(0, 3) })} placeholder="VIC" />
            </div>
            <div style={{ flex: "0 1 150px", minWidth: 120 }}>
              <Input size="sm" label="Delivery fee" value={nsu.fee} onChange={(e: any) => setNsu({ ...nsu, fee: e.target.value.replace(/[^0-9.]/g, "") })} suffix="AUD" placeholder="0.00" />
            </div>
            <Button
              variant="primary"
              size="sm"
              iconLeft="check"
              disabled={!(nsu.name.trim() && nsu.postcode.trim().length === 4)}
              onClick={() => {
                void addSuburb({ name: nsu.name.trim(), postcode: nsu.postcode.trim(), state: nsu.state || "VIC", delivery_fee: nsu.fee ? Number(nsu.fee) : null });
                setNsu({ name: "", postcode: "", state: "VIC", fee: "" });
                setAddOpen(false);
              }}
            >
              Add
            </Button>
          </div>
        </Card>
      )}

      <Card
        title={matches.length === suburbs.length ? `${suburbs.length} suburbs` : `${matches.length} of ${suburbs.length} suburbs`}
        subtitle={`${suburbs.filter((s) => s.active).length} active · ${suburbs.filter((s) => !s.active).length} off · a rate edited here prices the next order straight away`}
        padding="default"
      >
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          <div style={{ display: "grid", gridTemplateColumns: "minmax(0,2fr) 96px 76px 132px 74px 52px 30px", gap: 8, padding: "0 2px 6px", borderBottom: "1px solid var(--border-subtle)" }}>
            {["Suburb", "Postcode", "State", "Delivery fee", "Orders", "Active", ""].map((h, i) => (
              <span key={i} style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: ".09em", color: "var(--text-faint)", textAlign: h === "Orders" ? "right" : "left" }}>
                {h}
              </span>
            ))}
          </div>
          {matches.map((s) => {
            const used = usedCount(s.id);
            return (
              <div key={s.id} style={{ display: "grid", gridTemplateColumns: "minmax(0,2fr) 96px 76px 132px 74px 52px 30px", gap: 8, alignItems: "center", padding: "4px 2px", borderBottom: "1px solid var(--border-subtle)" }}>
                <input defaultValue={s.name} onBlur={(e) => e.target.value.trim() && e.target.value !== s.name && patchSuburb(s.id, { name: e.target.value.trim() })} style={cellStyle} />
                <input defaultValue={s.postcode} onBlur={(e) => /^[0-9]{4}$/.test(e.target.value) && e.target.value !== s.postcode && patchSuburb(s.id, { postcode: e.target.value })} style={{ ...cellStyle, fontFamily: "'JetBrains Mono',monospace", fontSize: 12 }} />
                <input defaultValue={s.state} onBlur={(e) => e.target.value.trim() && e.target.value !== s.state && patchSuburb(s.id, { state: e.target.value.toUpperCase().slice(0, 3) })} style={{ ...cellStyle, fontSize: 12 }} />
                <div style={{ display: "flex", alignItems: "center", gap: 4, height: 30, padding: "0 8px", borderRadius: 6, border: `1px solid ${Number(s.delivery_fee) > 0 ? "var(--border-default)" : "var(--attention)"}`, background: "var(--surface-input)" }}>
                  <span style={{ fontSize: 12, color: "var(--text-faint)" }}>$</span>
                  <input
                    defaultValue={s.delivery_fee == null ? "" : String(s.delivery_fee)}
                    onBlur={(e) => {
                      const v = e.target.value.replace(/[^0-9.]/g, "");
                      const fee = v === "" ? null : Number(v);
                      if (fee !== s.delivery_fee) patchSuburb(s.id, { delivery_fee: fee });
                    }}
                    inputMode="decimal"
                    style={{ flex: 1, minWidth: 0, border: "none", outline: "none", background: "transparent", fontFamily: "inherit", fontSize: 13, fontVariantNumeric: "tabular-nums", color: "var(--text-primary)" }}
                  />
                </div>
                <span className="tabular" style={{ fontSize: 12, color: "var(--text-faint)", textAlign: "right" }}>{used || "—"}</span>
                <Switch checked={s.active} onChange={(v: boolean) => patchSuburb(s.id, { active: v })} />
                <div
                  onClick={() => !used && removeSuburb(s.id)}
                  title={used ? `Used by ${used} open ${used === 1 ? "order" : "orders"} — reassign first` : `Delete ${s.name}`}
                  style={{ cursor: used ? "not-allowed" : "pointer", width: 26, height: 26, display: "flex", alignItems: "center", justifyContent: "center", borderRadius: 6, border: "1px solid var(--border-default)", color: used ? "var(--text-faint)" : "var(--text-muted)" }}
                >
                  <Icon name="trash-2" size={12} />
                </div>
              </div>
            );
          })}
          {matches.length === 0 && (
            <div style={{ padding: "20px 8px", textAlign: "center", fontSize: 12, color: "var(--text-faint)" }}>Nothing matches that search.</div>
          )}
          {unrated.length > 0 && (
            <div style={{ fontSize: 11, color: "var(--attention)", paddingTop: 6 }}>
              {unrated.length}
              {unrated.length === 1 ? " suburb has" : " suburbs have"} no rate: {unrated.map((s) => s.name).join(", ")}.
              Orders to these addresses are blocked until a fee is set.
            </div>
          )}
        </div>
      </Card>
    </div>
  );
}

const cellStyle: React.CSSProperties = {
  minWidth: 0,
  height: 30,
  padding: "0 8px",
  borderRadius: 6,
  border: "1px solid var(--border-default)",
  background: "var(--surface-input)",
  fontFamily: "inherit",
  fontSize: 13,
  color: "var(--text-primary)",
};
