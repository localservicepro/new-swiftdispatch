/* Customer import and export.

   Export is the whole customer list plus its primary orders contact, in the
   column order the importer reads — so a round trip is lossless and the export
   doubles as the template for the import.

   Import is deliberately two-step: reading a file only produces a plan, and
   nothing is written until that plan is confirmed. A customer list is the kind
   of data where a silent half-successful import is far worse than a refusal,
   so every row is either matched to an existing account, queued as new, or
   rejected with the reason on it. */

import { supabase } from "../lib/supabase";
import { useApp } from "../store/store";
import { downloadCsv, readCsvTable, readMoney, toCsv } from "../lib/csv";
import type { Customer, CustomerContact, CustomerEntity, CustomerTier } from "../lib/types";

const S = () => useApp.getState();
const uuid = () => crypto.randomUUID();

export const CUSTOMER_COLUMNS = [
  "Account number",
  "Name",
  "Entity",
  "ABN",
  "Tier",
  "Billing",
  "Terms days",
  "Credit limit",
  "Balance",
  "Stop credit",
  "Customer since",
  "Billing street",
  "Billing suburb",
  "Portal enabled",
  "Portal PIN",
  "Contact name",
  "Contact phone",
  "Contact email",
  "Contact of",
];

/* ---------- export ---------- */

export function exportCustomersCsv(): number {
  const s = S();
  const suburbName = (id: string | null) => s.suburbs.find((x) => x.id === id)?.name || "";
  const rows: (string | number)[][] = [];
  [...s.customers]
    .sort((a, b) => a.account_number.localeCompare(b.account_number, undefined, { numeric: true }))
    .forEach((c) => {
      const contact = c.contacts?.find((ct) => ct.roles?.includes("Orders")) || c.contacts?.[0];
      rows.push([
        c.account_number,
        c.name,
        c.entity,
        c.abn || "",
        c.tier,
        c.billing === "account" ? "Account" : "Prepaid",
        c.terms_days ?? "",
        c.credit_limit ?? 0,
        c.balance ?? 0,
        c.stop_credit ? "Yes" : "No",
        c.customer_since || "",
        c.billing_street || "",
        suburbName(c.billing_suburb_id),
        c.portal_enabled ? "Yes" : "No",
        c.portal_pin || "",
        contact?.name || "",
        contact?.phone || "",
        contact?.email || "",
        "",
      ]);
      /* Everyone else on the account gets a row of their own, straight after
         it, the way a product's variants do. */
      (c.contacts || [])
        .filter((ct) => ct.id !== contact?.id)
        .forEach((ct) => {
          rows.push(["", "", "", "", "", "", "", "", "", "", "", "", "", "", "", ct.name, ct.phone || "", ct.email || "", c.account_number]);
        });
    });
  const today = new Date().toISOString().slice(0, 10);
  downloadCsv(`customers-${today}.csv`, toCsv(CUSTOMER_COLUMNS, rows));
  return rows.length;
}

/* ---------- import ---------- */

export interface ImportRow {
  line: number;
  action: "create" | "update" | "contact" | "reject";
  name: string;
  accountNumber: string;
  /* Set for an update — the account this row will be written onto. */
  existingId?: string;
  reason?: string;
  warnings: string[];
  values: Partial<Customer>;
  contact: { name: string; phone: string; email: string } | null;
  /* Set on a row that is only a contact — the account it belongs to. */
  contactOf?: string;
}

export interface ImportPlan {
  rows: ImportRow[];
  creates: number;
  updates: number;
  contacts: number;
  rejects: number;
  warnings: number;
  unknownColumns: string[];
}

const yes = (v: string) => /^(y|yes|true|1)$/i.test(v.trim());
const ENTITIES: CustomerEntity[] = ["Individual", "Sole trader", "Company"];
const TIERS: CustomerTier[] = ["Retail", "Trade"];

const matchOneOf = <T extends string>(v: string, options: T[]): T | null => {
  const k = v.trim().toLowerCase();
  return options.find((o) => o.toLowerCase() === k) || null;
};

/* Dates arrive as 2019-03-01 or 01/03/2019 depending on what wrote the file. */
const readDate = (v: string): string | null => {
  const t = v.trim();
  if (!t) return null;
  if (/^\d{4}-\d{2}-\d{2}$/.test(t)) return t;
  const m = t.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (m) return `${m[3]}-${m[2].padStart(2, "0")}-${m[1].padStart(2, "0")}`;
  return null;
};

const KNOWN = new Set([
  "accountnumber", "accountno", "account", "acct",
  "name", "customer", "customername", "businessname",
  "entity", "abn", "tier", "pricing",
  "billing", "settles", "settlement",
  "termsdays", "terms", "creditlimit", "limit", "balance",
  "stopcredit", "customersince", "since",
  "billingstreet", "street", "address",
  "billingsuburb", "suburb",
  "portalenabled", "portal", "portalpin", "pin",
  "contactname", "contactphone", "phone", "contactemail", "email",
  "contactof", "contactfor", "belongsto",
]);

const pick = (row: Record<string, string>, ...keys: string[]) => {
  for (const k of keys) if (row[k] !== undefined && row[k] !== "") return row[k];
  return "";
};

export function planCustomerImport(text: string): ImportPlan {
  const s = S();
  const { headers, rows } = readCsvTable(text);
  const unknownColumns = headers.filter((h) => {
    const k = h.toLowerCase().replace(/[^a-z0-9]/g, "");
    return k && !KNOWN.has(k);
  });

  /* Account numbers already claimed inside this file, so two rows cannot both
     create the same account, and so a contact row can name an account that
     only exists further up the same file. */
  const seen = new Map<string, number>();
  const inFile = new Set<string>();

  const out: ImportRow[] = rows.map((row, i) => {
    const line = i + 2; // +1 for the header, +1 for 1-based line numbers
    const warnings: string[] = [];
    const accountNumber = pick(row, "accountnumber", "accountno", "account", "acct").trim();
    const name = pick(row, "name", "customer", "customername", "businessname").trim();

    const contactName = pick(row, "contactname").trim();
    const contact = contactName
      ? { name: contactName, phone: pick(row, "contactphone", "phone").trim(), email: pick(row, "contactemail", "email").trim() }
      : null;

    const reject = (reason: string): ImportRow => ({
      line,
      action: "reject",
      name,
      accountNumber,
      reason,
      warnings,
      values: {},
      contact,
    });

    /* ---- a contact row ---- */
    const contactOf = pick(row, "contactof", "contactfor", "belongsto").trim();
    if (contactOf) {
      if (!contact?.name && !name) return reject("A contact row needs a contact name.");
      const known = inFile.has(contactOf) || s.customers.some((c) => c.account_number === contactOf);
      if (!known)
        return reject(`No customer with account ${contactOf} to attach this contact to — put that customer above it, or import it first.`);
      return {
        line,
        action: "contact",
        name: contact?.name || name,
        accountNumber: contactOf,
        contactOf,
        warnings,
        values: {},
        contact: contact || { name, phone: pick(row, "contactphone", "phone").trim(), email: pick(row, "contactemail", "email").trim() },
      };
    }

    if (!name) return reject("No customer name.");
    if (accountNumber && seen.has(accountNumber))
      return reject(`Account ${accountNumber} appears twice in this file (also on line ${seen.get(accountNumber)}).`);
    if (accountNumber) {
      seen.set(accountNumber, line);
      inFile.add(accountNumber);
    }

    const existing = accountNumber ? s.customers.find((c) => c.account_number === accountNumber) : undefined;

    const values: Partial<Customer> = { name };

    const entityRaw = pick(row, "entity");
    if (entityRaw) {
      const entity = matchOneOf(entityRaw, ENTITIES);
      if (!entity) return reject(`"${entityRaw}" is not one of ${ENTITIES.join(", ")}.`);
      values.entity = entity;
    } else if (!existing) values.entity = "Company";

    const tierRaw = pick(row, "tier", "pricing");
    if (tierRaw) {
      const tier = matchOneOf(tierRaw, TIERS);
      if (!tier) return reject(`"${tierRaw}" is not one of ${TIERS.join(", ")}.`);
      values.tier = tier;
    } else if (!existing) values.tier = "Retail";

    const billingRaw = pick(row, "billing", "settles", "settlement");
    if (billingRaw) {
      const k = billingRaw.trim().toLowerCase();
      if (k === "account") values.billing = "account";
      else if (k === "prepaid") values.billing = "prepaid";
      else return reject(`"${billingRaw}" is not Account or Prepaid.`);
    } else if (!existing) values.billing = "prepaid";

    const onAccount = values.billing === "account" || (values.billing === undefined && existing?.billing === "account");

    const termsRaw = pick(row, "termsdays", "terms");
    if (termsRaw) {
      const t = readMoney(termsRaw);
      if (t === null) return reject(`"${termsRaw}" is not a number of days.`);
      values.terms_days = t;
    } else if (!existing && onAccount) values.terms_days = 30;

    const limitRaw = pick(row, "creditlimit", "limit");
    if (limitRaw) {
      const l = readMoney(limitRaw);
      if (l === null) return reject(`"${limitRaw}" is not a credit limit.`);
      values.credit_limit = l;
    } else if (!existing) values.credit_limit = 0;

    /* Balance is money the ledger owns. An import may seed it on a brand-new
       account, but it will not silently rewrite what an existing account owes. */
    const balanceRaw = pick(row, "balance");
    if (balanceRaw) {
      const b = readMoney(balanceRaw);
      if (b === null) return reject(`"${balanceRaw}" is not a balance.`);
      if (existing) {
        if (Math.abs(b - Number(existing.balance)) > 0.005)
          warnings.push(`Balance left at ${existing.balance} — an import will not rewrite what an account owes.`);
      } else values.balance = b;
    }

    const stopRaw = pick(row, "stopcredit");
    if (stopRaw) values.stop_credit = yes(stopRaw);

    const sinceRaw = pick(row, "customersince", "since");
    if (sinceRaw) {
      const d = readDate(sinceRaw);
      if (!d) return reject(`"${sinceRaw}" is not a date — use 2026-08-16 or 16/08/2026.`);
      values.customer_since = d;
    }

    const street = pick(row, "billingstreet", "street", "address");
    if (street) values.billing_street = street;

    const suburbRaw = pick(row, "billingsuburb", "suburb");
    if (suburbRaw) {
      const hit = s.suburbs.find((x) => x.name.toLowerCase() === suburbRaw.trim().toLowerCase());
      if (hit) values.billing_suburb_id = hit.id;
      /* §5.8: a suburb we cannot resolve is left unset rather than guessed at.
         The customer still imports; the address just needs a suburb picked. */
      else warnings.push(`No suburb called "${suburbRaw}" — left unset. Add it under Operate › Suburbs.`);
    }

    const portalRaw = pick(row, "portalenabled", "portal");
    if (portalRaw) values.portal_enabled = yes(portalRaw);
    const pin = pick(row, "portalpin", "pin").trim();
    if (pin) {
      if (!/^\d{4}$/.test(pin)) return reject(`"${pin}" is not a four-digit PIN.`);
      values.portal_pin = pin;
    }

    return {
      line,
      action: existing ? "update" : "create",
      name,
      accountNumber,
      existingId: existing?.id,
      warnings,
      values,
      contact,
    };
  });

  return {
    rows: out,
    creates: out.filter((r) => r.action === "create").length,
    updates: out.filter((r) => r.action === "update").length,
    contacts: out.filter((r) => r.action === "contact").length,
    rejects: out.filter((r) => r.action === "reject").length,
    warnings: out.reduce((t, r) => t + r.warnings.length, 0),
    unknownColumns,
  };
}

export interface ImportResult {
  created: number;
  updated: number;
  failed: { line: number; name: string; error: string }[];
}

/* Applies a plan that has already been shown to whoever is importing. Rejected
   rows never reach here. */
export async function applyCustomerImport(plan: ImportPlan): Promise<ImportResult> {
  const s = S();
  const result: ImportResult = { created: 0, updated: 0, failed: [] };

  /* New account numbers are allocated from the top of the existing range, the
     same step the Add customer form uses, so an import cannot collide with a
     number the yard is about to hand out. */
  let nextAccount = Math.max(10800, ...s.customers.map((c) => Number(c.account_number) || 0));

  /* Account number -> customer id, filled in as accounts are written so the
     contact rows that follow can find the account even when this same file
     created it. */
  const idByAccount = new Map<string, string>();
  s.customers.forEach((c) => idByAccount.set(c.account_number, c.id));

  const newCustomers: Customer[] = [];
  const patches: { id: string; patch: Partial<Customer> }[] = [];
  const newContacts: CustomerContact[] = [];

  for (const row of plan.rows) {
    if (row.action === "reject") continue;

    if (row.action === "contact") continue;

    if (row.action === "update" && row.existingId) {
      idByAccount.set(row.accountNumber, row.existingId);
      patches.push({ id: row.existingId, patch: row.values });
      const target = s.customers.find((c) => c.id === row.existingId);
      /* Only add a contact the account hasn't already got — re-importing the
         same file should not stack duplicate people onto every customer. */
      if (row.contact && target && !target.contacts?.some((ct) => ct.name.toLowerCase() === row.contact!.name.toLowerCase())) {
        newContacts.push({
          id: uuid(),
          customer_id: row.existingId,
          name: row.contact.name,
          phone: row.contact.phone || null,
          email: row.contact.email || null,
          roles: ["Orders"],
        });
      }
      continue;
    }

    const id = uuid();
    const account = row.accountNumber || String((nextAccount += 7));
    if (!row.accountNumber) nextAccount = Number(account);
    idByAccount.set(account, id);
    const cust: Customer = {
      id,
      account_number: account,
      name: row.values.name || row.name,
      entity: row.values.entity || "Company",
      abn: row.values.abn ?? null,
      tier: row.values.tier || "Retail",
      billing: row.values.billing || "prepaid",
      terms_days: row.values.terms_days ?? null,
      credit_limit: row.values.credit_limit ?? 0,
      balance: row.values.balance ?? 0,
      stop_credit: row.values.stop_credit ?? false,
      customer_since: row.values.customer_since || new Date().toISOString().slice(0, 10),
      billing_street: row.values.billing_street ?? null,
      billing_suburb_id: row.values.billing_suburb_id ?? null,
      portal_enabled: row.values.portal_enabled ?? false,
      portal_pin: row.values.portal_pin ?? null,
      myob_uid: null,
      contacts: [],
      sites: [],
    };
    newCustomers.push(cust);
    if (row.contact) {
      newContacts.push({
        id: uuid(),
        customer_id: id,
        name: row.contact.name,
        phone: row.contact.phone || null,
        email: row.contact.email || null,
        roles: ["Orders"],
      });
    }
  }

  /* Extra contacts last, once every account they might name exists. */
  for (const row of plan.rows) {
    if (row.action !== "contact" || !row.contact || !row.contactOf) continue;
    const customerId = idByAccount.get(row.contactOf);
    if (!customerId) {
      result.failed.push({ line: row.line, name: row.contact.name, error: `Account ${row.contactOf} was not written.` });
      continue;
    }
    const target = s.customers.find((c) => c.id === customerId);
    /* Re-importing the same file should not stack duplicate people onto an
       account, so skip a name it already has. */
    if (target?.contacts?.some((ct) => ct.name.toLowerCase() === row.contact!.name.toLowerCase())) continue;
    newContacts.push({
      id: uuid(),
      customer_id: customerId,
      name: row.contact.name,
      phone: row.contact.phone || null,
      email: row.contact.email || null,
      roles: ["Orders"],
    });
  }

  if (newCustomers.length) {
    const rows = newCustomers.map(({ contacts, sites, ...r }) => {
      void contacts;
      void sites;
      return r;
    });
    const { error } = await supabase.from("customers").insert(rows);
    if (error) {
      result.failed.push({ line: 0, name: `${newCustomers.length} new customers`, error: error.message });
    } else {
      result.created = newCustomers.length;
    }
  }

  for (const p of patches) {
    const { error } = await supabase.from("customers").update(p.patch).eq("id", p.id);
    if (error) {
      const name = s.customers.find((c) => c.id === p.id)?.name || p.id;
      result.failed.push({ line: 0, name, error: error.message });
    } else result.updated += 1;
  }

  if (newContacts.length && !result.failed.length) {
    const { error } = await supabase.from("customer_contacts").insert(newContacts);
    if (error) result.failed.push({ line: 0, name: "contacts", error: error.message });
  }

  /* Reload rather than patching the store by hand: an import touches enough
     rows that a refetch is both simpler and the only way to be sure the screen
     matches the database. */
  await S().loadAll();
  return result;
}
