import React, { useState } from "react";
import { useApp } from "../store/store";
import { AUD, suburbRate } from "../lib/domain";
import { createCustomer } from "../data/api";
import type { Customer } from "../lib/types";
import { Button, Input, Select, Tabs } from "../design-system/components.js";

/* Adding a customer.

   It lived inside the Customers screen, which meant the only way to put a new
   name on an order was to leave the order, go to Customers, add them, and come
   back — and most orders at this yard are for someone not yet on file. It is
   the same form either way; it just needed to be openable from both places. */

export default function NewCustomerModal({ onClose, onCreated }: { onClose: () => void; onCreated: (c: Customer) => void }) {
  const app = useApp();
  const [n2, setN2] = useState({
    kind: "Company" as Customer["entity"],
    name: "",
    abn: "",
    contact: "",
    phone: "",
    email: "",
    tier: "Trade" as Customer["tier"],
    billing: "Account" as "Prepaid" | "Account" | "7 Day Account" | "Card On File",
    terms: "30",
    limit: "10000",
    street: "",
    suburbId: "",
  });
  const patch = (p: Partial<typeof n2>) => setN2((s) => ({ ...s, ...p }));
  const suburbName = (id: string) => app.suburbs.find((s) => s.id === id)?.name || "";

  return (
    <div
      onClick={onClose}
      style={{ position: "fixed", inset: 0, zIndex: 26, display: "flex", alignItems: "flex-start", justifyContent: "center", padding: 24, overflowY: "auto", background: "var(--om-scrim)", backdropFilter: "blur(10px) saturate(140%)" }}
    >
      <div onClick={(e) => e.stopPropagation()} style={{ width: "min(560px,100%)", borderRadius: 16, background: "var(--surface-card)", border: "1px solid var(--border-default)", boxShadow: "var(--om-overlay-shadow)", overflow: "hidden" }}>
        <div style={{ padding: 16, borderBottom: "1px solid var(--border-subtle)" }}>
          <div style={{ fontSize: 15, fontWeight: 600, color: "var(--text-primary)" }}>Add a customer</div>
          <div style={{ fontSize: 12, color: "var(--text-faint)", marginTop: 3 }}>
            {n2.kind === "Individual"
              ? "One person, one contact. Retail pricing and prepaid unless you say otherwise."
              : n2.kind === "Sole trader"
                ? "A person trading under their own name — they can hold trade pricing and an account."
                : "A business with several people who can order, and one place invoices go."}
          </div>
        </div>

        <div style={{ padding: 16, display: "flex", flexDirection: "column", gap: 12 }}>
          <Tabs
            items={[
              { id: "Individual", label: "A person", icon: "user" },
              { id: "Sole trader", label: "Sole trader", icon: "wrench" },
              { id: "Company", label: "Company", icon: "building-2" },
            ]}
            activeId={n2.kind}
            onSelect={(id: string) => patch({ kind: id as any, billing: id === "Individual" ? "Prepaid" : n2.billing })}
            variant="segmented"
            fullWidth
          />
          <Input size="md" label={n2.kind === "Company" ? "Business name" : "Full name"} value={n2.name} onChange={(e: any) => patch({ name: e.target.value })} placeholder={n2.kind === "Company" ? "e.g. Barwon Building Supplies" : "e.g. Dean Pearce"} />
          {n2.kind === "Company" && (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(160px,1fr))", gap: 10 }}>
              <Input size="sm" label="ABN (optional)" value={n2.abn} onChange={(e: any) => patch({ abn: e.target.value })} placeholder="00 000 000 000" />
              <Input size="sm" label="Person who orders" value={n2.contact} onChange={(e: any) => patch({ contact: e.target.value })} placeholder="Who to ask for" />
            </div>
          )}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(160px,1fr))", gap: 10 }}>
            <Input size="sm" label="Phone (optional)" value={n2.phone} onChange={(e: any) => patch({ phone: e.target.value })} placeholder="0412 000 000" />
            <Input size="sm" label="Email (optional)" value={n2.email} onChange={(e: any) => patch({ email: e.target.value })} placeholder="name@example.com.au" />
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(150px,1fr))", gap: 10 }}>
            <Select size="sm" label="What they pay" options={["Retail", "Trade"]} value={n2.tier} onChange={(e: any) => patch({ tier: e.target.value })} />
            <Select size="sm" label="How they settle" options={["Prepaid", "Account", "7 Day Account", "Card On File"]} value={n2.billing} onChange={(e: any) => patch({ billing: e.target.value })} />
          </div>
          {n2.billing === "Card On File" && (
            <div style={{ fontSize: 11, color: "var(--text-faint)", textWrap: "pretty" as any }}>
              You hold a card for them and charge it after delivery. New orders will settle by card on file unless changed.
            </div>
          )}
          {(n2.billing === "Account" || n2.billing === "7 Day Account") && (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(150px,1fr))", gap: 10 }}>
              <Select
                size="sm"
                label="Terms"
                disabled={n2.billing === "7 Day Account"}
                options={[
                  { value: "7", label: "7 days" },
                  { value: "14", label: "14 days" },
                  { value: "30", label: "30 days" },
                ]}
                value={n2.billing === "7 Day Account" ? "7" : n2.terms}
                onChange={(e: any) => patch({ terms: e.target.value })}
              />
              <Input size="sm" label="Credit limit" value={n2.limit} onChange={(e: any) => patch({ limit: e.target.value.replace(/[^0-9.]/g, "") })} suffix="AUD" />
            </div>
          )}
          <div style={{ display: "flex", flexDirection: "column", gap: 9, padding: 10, borderRadius: 10, border: "1px solid var(--border-subtle)", background: "var(--bg-sunken)" }}>
            <div style={{ fontSize: 12, fontWeight: 600, color: "var(--text-primary)" }}>Delivery address</div>
            <div style={{ fontSize: 11, color: "var(--text-faint)", textWrap: "pretty" as any }}>
              Optional now — but until a suburb is on file no delivery fee can be worked out, so orders will ask for one.
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(140px,1fr))", gap: 8 }}>
              <Input size="sm" label="Street" value={n2.street} onChange={(e: any) => patch({ street: e.target.value })} placeholder="88 Barwon Heads Rd" />
              <Select
                size="sm"
                label="Suburb"
                options={app.suburbs.filter((s) => s.active).map((s) => ({ value: s.id, label: s.name }))}
                value={n2.suburbId}
                onChange={(e: any) => patch({ suburbId: e.target.value })}
                allowUnset
              />
            </div>
            <div style={{ fontSize: 11, color: "var(--text-faint)" }}>
              {n2.suburbId
                ? `Deliveries to ${suburbName(n2.suburbId)} cost ${AUD(suburbRate(n2.suburbId, app.suburbs).fee)}.`
                : "No suburb yet — you can add one from the customer's Overview tab later."}
            </div>
          </div>
        </div>

        <div style={{ padding: "12px 16px", borderTop: "1px solid var(--border-subtle)", display: "flex", gap: 8, justifyContent: "flex-end", flexWrap: "wrap" }}>
          <Button variant="ghost" size="md" onClick={onClose}>
            Cancel
          </Button>
          <Button
            variant="primary"
            size="md"
            iconLeft="check"
            disabled={!n2.name.trim()}
            onClick={() => {
              void createCustomer({
                kind: n2.kind,
                name: n2.name.trim(),
                abn: n2.abn.trim(),
                contact: n2.contact.trim(),
                phone: n2.phone.trim(),
                email: n2.email.trim(),
                tier: n2.tier,
                billing: n2.billing === "Account" || n2.billing === "7 Day Account" ? "Account" : "Prepaid",
                termsDays: n2.billing === "7 Day Account" ? 7 : Number(n2.terms),
                cardOnFile: n2.billing === "Card On File",
                limit: Number(n2.limit) || 0,
                street: n2.street.trim(),
                suburbId: n2.suburbId || null,
              }).then((c) => {
                if (c) onCreated(c);
              });
              onClose();
            }}
          >
            Add customer
          </Button>
        </div>
      </div>
    </div>
  );
}
