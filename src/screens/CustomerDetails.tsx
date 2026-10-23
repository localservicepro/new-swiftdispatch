import React, { useState } from "react";
import { useApp } from "../store/store";
import { AUD, dmy, suburbRate } from "../lib/domain";
import type { Customer, CustomerContact } from "../lib/types";
import { addContact, patchContact, patchCustomer, removeContact } from "../data/api";
import { Alert, Badge, Button, Card, Icon, Input, Select } from "../design-system/components.js";
import DraftInput from "./DraftInput";

/* The customer record, editable, wherever it is shown.

   Two rows on the change sheet, named as blockers to further testing: "must
   be able to edit customers", and "ability to see all customer details when
   viewing an order". The Customers screen showed the name, ABN and billing
   address as plain text and let you change the pricing tier but not the
   spelling of the name; the order drawer showed nothing about the customer at
   all beyond their name in the header.

   One component for both. The Customers overview renders it, and the order
   drawer's Customer tab renders the same thing, so a phone number corrected
   while taking an order is corrected on the record, not on the order. */

const ROLES = ["Orders", "Accounts", "Site"];

const settleKey = (c: Customer) =>
  c.billing === "account" ? (c.terms_days === 7 ? "account_7" : c.terms_days === 14 ? "account_14" : "account") : c.card_on_file ? "card_on_file" : "prepaid";

const settlePatch = (key: string): Partial<Customer> => {
  switch (key) {
    case "account":
      return { billing: "account", terms_days: 30, card_on_file: false };
    case "account_14":
      return { billing: "account", terms_days: 14, card_on_file: false };
    case "account_7":
      return { billing: "account", terms_days: 7, card_on_file: false };
    case "card_on_file":
      return { billing: "prepaid", terms_days: null, card_on_file: true };
    default:
      return { billing: "prepaid", terms_days: null, card_on_file: false };
  }
};

export function CustomerDetails({ cust }: { cust: Customer }) {
  const app = useApp();
  const suburbs = app.suburbs;
  const billRate = suburbRate(cust.billing_suburb_id, suburbs);
  const suburbName = suburbs.find((s) => s.id === cust.billing_suburb_id)?.name || "";
  const suburbOptions = suburbs.filter((s) => s.active).map((s) => ({ value: s.id, label: s.name }));
  const isPerson = cust.entity === "Individual";

  return (
    <>
      <Card title="How this customer is set up" padding="default">
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(170px,1fr))", gap: 10 }}>
          <Select size="sm" label="Who they are" options={["Individual", "Sole trader", "Company"]} value={cust.entity} onChange={(e: any) => patchCustomer(cust.id, { entity: e.target.value })} />
          <Select size="sm" label="What they pay" options={["Retail", "Trade"]} value={cust.tier} onChange={(e: any) => patchCustomer(cust.id, { tier: e.target.value })} />
          {/* One choice covering billing, terms and the card-on-file flag,
              because that is how the yard thinks of it: a customer is on
              account, on a seven-day account, has a card on file, or pays up
              front. Fourteen-day terms exist on a few records and stay
              choosable only where already set. */}
          <Select
            size="sm"
            label="How they settle"
            options={[
              { value: "prepaid", label: "Prepaid" },
              { value: "account", label: "Account (30 days)" },
              ...(cust.billing === "account" && cust.terms_days === 14 ? [{ value: "account_14", label: "Account (14 days)" }] : []),
              { value: "account_7", label: "7 day account" },
              { value: "card_on_file", label: "Card on file" },
            ]}
            value={settleKey(cust)}
            onChange={(e: any) => patchCustomer(cust.id, settlePatch(e.target.value))}
          />
        </div>
      </Card>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(280px,1fr))", gap: 12, alignItems: "start" }}>
        <Card
          title={isPerson ? "Person" : "Business"}
          subtitle={`Acct ${cust.account_number} · customer since ${dmy(cust.customer_since)}`}
          padding="default"
        >
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <DraftInput
              label={isPerson ? "Full name" : "Business name"}
              value={cust.name}
              onCommit={(v) => patchCustomer(cust.id, { name: v })}
              placeholder={isPerson ? "e.g. Dean Pearce" : "e.g. Barwon Building Supplies"}
            />
            {!isPerson && (
              <DraftInput
                label="ABN"
                value={cust.abn || ""}
                allowEmpty
                onCommit={(v) => patchCustomer(cust.id, { abn: v || null })}
                placeholder="00 000 000 000"
              />
            )}
            <div style={{ fontSize: 11, color: "var(--text-faint)" }}>Changes save when you leave the field. Enter saves too; Escape puts it back.</div>
          </div>
        </Card>

        <Card
          title={cust.billing === "account" ? "Invoices go to" : "Billing address"}
          subtitle={cust.billing_suburb_id ? `${suburbName} ${billRate.state} ${billRate.postcode} · delivery ${AUD(billRate.fee)}` : "No suburb set"}
          padding="default"
        >
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <DraftInput
              label="Street"
              value={cust.billing_street || ""}
              allowEmpty
              onCommit={(v) => patchCustomer(cust.id, { billing_street: v || null })}
              placeholder="12 Reserve Rd"
            />
            <Select
              size="sm"
              label="Suburb"
              options={suburbOptions}
              value={cust.billing_suburb_id || ""}
              onChange={(e: any) => patchCustomer(cust.id, { billing_suburb_id: e.target.value || null })}
              allowUnset
            />
            {(cust.billing_street || cust.billing_suburb_id) && (
              <a
                href={"https://www.google.com/maps/search/" + encodeURIComponent(`${cust.billing_street || ""} ${suburbName} VIC ${billRate.postcode}`)}
                target="_blank"
                rel="noreferrer"
                style={{ display: "inline-flex", alignItems: "center", gap: 4, fontSize: 11, alignSelf: "flex-start" }}
              >
                <Icon name="external-link" size={12} />
                Open in Google Maps
              </a>
            )}
          </div>
        </Card>
      </div>
    </>
  );
}

/* Contacts, with the pencil the list was missing. Adding and removing were
   there; a typo in a phone number meant deleting the person and adding them
   again, which also lost which orders they had placed. */
export function ContactsEditor({ cust }: { cust: Customer }) {
  const [draft, setDraft] = useState({ name: "", phone: "", email: "", role: "Orders" });
  const isPerson = cust.entity === "Individual";
  return (
    <>
      {isPerson && (
        <Alert tone="info" title="An individual has one contact">
          Switch "Who they are" to a business if several people need to order or receive invoices.
        </Alert>
      )}
      <Card
        title="Contacts"
        subtitle={isPerson ? "One person on the account" : `${cust.contacts.length} ${cust.contacts.length === 1 ? "person" : "people"} can act on this account`}
        padding="default"
      >
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {cust.contacts.map((ct) => (
            <ContactRow key={ct.id} cust={cust} ct={ct} />
          ))}
          {cust.contacts.length === 0 && <div style={{ fontSize: 12, color: "var(--text-faint)" }}>Nobody on file yet.</div>}
          {(!isPerson || cust.contacts.length === 0) && (
            <div style={{ display: "flex", flexDirection: "column", gap: 8, padding: 10, borderRadius: 8, border: "1px dashed var(--border-default)" }}>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(150px,1fr))", gap: 8 }}>
                <Input size="sm" label="Name" value={draft.name} onChange={(e: any) => setDraft({ ...draft, name: e.target.value })} placeholder="e.g. Marcus Hale" />
                <Input size="sm" label="Phone (optional)" value={draft.phone} onChange={(e: any) => setDraft({ ...draft, phone: e.target.value })} placeholder="0412 000 000" />
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(150px,1fr))", gap: 8, alignItems: "end" }}>
                <Input size="sm" label="Email (optional)" value={draft.email} onChange={(e: any) => setDraft({ ...draft, email: e.target.value })} placeholder="name@business.com.au" />
                <Select size="sm" label="Role" options={ROLES} value={draft.role} onChange={(e: any) => setDraft({ ...draft, role: e.target.value })} />
              </div>
              <Button
                variant="outline"
                size="sm"
                iconLeft="plus"
                disabled={!draft.name.trim()}
                onClick={() => {
                  addContact(cust.id, {
                    name: draft.name.trim(),
                    phone: draft.phone.trim() || null,
                    email: draft.email.trim() || null,
                    roles: [draft.role],
                  });
                  setDraft({ name: "", phone: "", email: "", role: "Orders" });
                }}
              >
                Add contact
              </Button>
            </div>
          )}
        </div>
      </Card>
    </>
  );
}

function ContactRow({ cust, ct }: { cust: Customer; ct: CustomerContact }) {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ name: ct.name, phone: ct.phone || "", email: ct.email || "", role: ct.roles[0] || "Orders" });
  const dirty = form.name !== ct.name || form.phone !== (ct.phone || "") || form.email !== (ct.email || "") || form.role !== (ct.roles[0] || "Orders");
  const last = cust.contacts.length === 1;

  return (
    <div style={{ borderRadius: 8, background: "var(--surface-raised)", border: `1px solid ${open ? "var(--border-default)" : "transparent"}` }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, padding: 10, flexWrap: "wrap" }}>
        <div style={{ flex: "1 1 160px", minWidth: 0 }}>
          <div style={{ fontSize: 13, fontWeight: 500, color: "var(--text-primary)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{ct.name}</div>
          <div className="tabular" style={{ fontSize: 11, color: "var(--text-faint)" }}>
            {ct.phone ? (
              <a href={"tel:" + ct.phone.replace(/\s+/g, "")} style={{ color: "inherit" }}>
                {ct.phone}
              </a>
            ) : (
              "—"
            )}
            {" · " + (ct.email || "no email")}
          </div>
        </div>
        {ct.roles.map((r) => (
          <Badge key={r} tone={r === "Accounts" ? "brand" : r === "Site" ? "neutral" : "info"} outline>
            {r}
          </Badge>
        ))}
        <div
          onClick={() => setOpen(!open)}
          title={open ? "Done" : "Edit this contact"}
          style={{ cursor: "pointer", width: 24, height: 24, flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center", borderRadius: 6, border: "1px solid var(--border-default)", color: "var(--text-muted)" }}
        >
          <Icon name={open ? "x" : "pencil"} size={12} />
        </div>
        {!last && (
          <div
            onClick={() => removeContact(cust.id, ct.id)}
            title="Remove contact"
            style={{ cursor: "pointer", width: 24, height: 24, flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center", borderRadius: 6, border: "1px solid var(--border-default)", color: "var(--text-muted)" }}
          >
            <Icon name="trash-2" size={12} />
          </div>
        )}
      </div>
      {open && (
        <div style={{ display: "flex", flexDirection: "column", gap: 8, padding: "0 10px 10px" }}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(150px,1fr))", gap: 8 }}>
            <Input size="sm" label="Name" value={form.name} onChange={(e: any) => setForm({ ...form, name: e.target.value })} />
            <Input size="sm" label="Phone" value={form.phone} onChange={(e: any) => setForm({ ...form, phone: e.target.value })} placeholder="0412 000 000" />
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(150px,1fr))", gap: 8, alignItems: "end" }}>
            <Input size="sm" label="Email" value={form.email} onChange={(e: any) => setForm({ ...form, email: e.target.value })} placeholder="name@business.com.au" />
            <Select size="sm" label="Role" options={ROLES} value={form.role} onChange={(e: any) => setForm({ ...form, role: e.target.value })} />
          </div>
          <div style={{ display: "flex", gap: 6 }}>
            <Button
              variant="primary"
              size="sm"
              iconLeft="check"
              disabled={!dirty || !form.name.trim()}
              onClick={() => {
                patchContact(cust.id, ct.id, {
                  name: form.name.trim(),
                  phone: form.phone.trim() || null,
                  email: form.email.trim() || null,
                  /* Only replace the roles when the one shown was changed — a
                     contact with two roles keeps both otherwise. */
                  roles: form.role === (ct.roles[0] || "Orders") ? ct.roles : [form.role],
                });
                setOpen(false);
              }}
            >
              Save
            </Button>
            <Button variant="ghost" size="sm" onClick={() => { setForm({ name: ct.name, phone: ct.phone || "", email: ct.email || "", role: ct.roles[0] || "Orders" }); setOpen(false); }}>
              Cancel
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
