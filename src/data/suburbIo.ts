/* Suburb import and export.

   The suburb is where the delivery fee comes from (§5.8), so this importer is
   the strictest of the three. A blank fee imports as no rate at all — which
   blocks orders to that suburb until someone sets one — and never as zero,
   because "free delivery" and "nobody has priced this yet" are different
   answers and only one of them should quietly charge nothing. */

import { supabase } from "../lib/supabase";
import { useApp } from "../store/store";
import { downloadCsv, readCsvTable, readMoney, toCsv } from "../lib/csv";
import type { Suburb } from "../lib/types";

const S = () => useApp.getState();

export const SUBURB_COLUMNS = ["Suburb", "Postcode", "State", "Delivery fee", "Active"];

/* ---------- export ---------- */

export function exportSuburbsCsv(): number {
  const s = S();
  const rows = [...s.suburbs]
    .sort((a, b) => a.name.localeCompare(b.name))
    .map((x) => [
      x.name,
      x.postcode,
      x.state,
      /* Blank, not 0, when there is no rate — the same distinction the importer
         reads back. */
      x.delivery_fee === null || x.delivery_fee === undefined ? "" : x.delivery_fee,
      x.active ? "Yes" : "No",
    ]);
  const today = new Date().toISOString().slice(0, 10);
  downloadCsv(`suburbs-${today}.csv`, toCsv(SUBURB_COLUMNS, rows));
  return rows.length;
}

/* ---------- import ---------- */

export interface SuburbImportRow {
  line: number;
  action: "create" | "update" | "reject";
  name: string;
  postcode: string;
  reason?: string;
  warnings: string[];
  values: Partial<Suburb>;
  existingId?: string;
}

export interface SuburbImportPlan {
  rows: SuburbImportRow[];
  creates: number;
  updates: number;
  rejects: number;
  warnings: number;
  unknownColumns: string[];
}

const yes = (v: string) => /^(y|yes|true|1)$/i.test(v.trim());
const KNOWN = new Set([
  "suburb", "name", "suburbname", "town", "locality",
  "postcode", "postalcode", "zip",
  "state",
  "deliveryfee", "fee", "rate", "deliveryrate",
  "active", "enabled", "isactive",
]);

const pick = (row: Record<string, string>, ...keys: string[]) => {
  for (const k of keys) if (row[k] !== undefined && row[k] !== "") return row[k];
  return "";
};

export function planSuburbImport(text: string): SuburbImportPlan {
  const s = S();
  const { headers, rows } = readCsvTable(text);
  const unknownColumns = headers.filter((h) => {
    const k = h.toLowerCase().replace(/[^a-z0-9]/g, "");
    return k && !KNOWN.has(k);
  });

  /* A suburb is identified by its name and postcode together. A postcode alone
     covers several suburbs — 3127 is both Surrey Hills and Mont Albert — and
     matching on it would quietly merge two delivery zones onto one rate. */
  const key = (name: string, postcode: string) => `${name.trim().toLowerCase()}|${postcode.trim()}`;
  const seen = new Map<string, number>();

  const out: SuburbImportRow[] = rows.map((row, i) => {
    const line = i + 2;
    const warnings: string[] = [];
    const name = pick(row, "suburb", "name", "suburbname", "town", "locality").trim();
    const postcode = pick(row, "postcode", "postalcode", "zip").trim();

    const reject = (reason: string): SuburbImportRow => ({
      line,
      action: "reject",
      name,
      postcode,
      reason,
      warnings,
      values: {},
    });

    if (!name) return reject("No suburb name.");
    if (!postcode) return reject("No postcode — a suburb name on its own is not unique.");
    if (!/^\d{4}$/.test(postcode)) return reject(`"${postcode}" is not a four-digit postcode.`);

    const k = key(name, postcode);
    if (seen.has(k)) return reject(`${name} ${postcode} appears twice in this file (also on line ${seen.get(k)}).`);
    seen.set(k, line);

    const existing = s.suburbs.find((x) => key(x.name, x.postcode) === k);
    const values: Partial<Suburb> = { name, postcode };

    const stateRaw = pick(row, "state").trim();
    if (stateRaw) {
      if (!/^[A-Za-z]{2,3}$/.test(stateRaw)) return reject(`"${stateRaw}" is not a state code.`);
      values.state = stateRaw.toUpperCase();
    } else if (!existing) values.state = "VIC";

    /* The whole point of the column. Present-but-blank means no rate; a number
       means that rate, including zero if the yard really does deliver here for
       nothing. */
    const feeKey = ["deliveryfee", "fee", "rate", "deliveryrate"].find((c) => row[c] !== undefined);
    if (feeKey !== undefined) {
      const raw = (row[feeKey] || "").trim();
      if (raw === "") {
        values.delivery_fee = null;
        if (existing && existing.delivery_fee !== null)
          warnings.push(`Clears the ${existing.name} rate of $${Number(existing.delivery_fee).toFixed(2)} — orders here will be blocked.`);
        else if (!existing) warnings.push("No rate, so orders to this suburb are blocked until one is set.");
      } else {
        const f = readMoney(raw);
        if (f === null) return reject(`"${raw}" is not a delivery fee.`);
        if (f < 0) return reject(`A delivery fee cannot be negative (${raw}).`);
        values.delivery_fee = f;
        if (f === 0) warnings.push("Priced at $0.00 — deliveries here will be free, not blocked.");
      }
    } else if (!existing) {
      values.delivery_fee = null;
      warnings.push("No rate, so orders to this suburb are blocked until one is set.");
    }

    const activeRaw = pick(row, "active", "enabled", "isactive");
    if (activeRaw) values.active = yes(activeRaw);
    else if (!existing) values.active = true;

    return {
      line,
      action: existing ? "update" : "create",
      name,
      postcode,
      warnings,
      values,
      existingId: existing?.id,
    };
  });

  return {
    rows: out,
    creates: out.filter((r) => r.action === "create").length,
    updates: out.filter((r) => r.action === "update").length,
    rejects: out.filter((r) => r.action === "reject").length,
    warnings: out.reduce((t, r) => t + r.warnings.length, 0),
    unknownColumns,
  };
}

export interface SuburbImportResult {
  created: number;
  updated: number;
  failed: string[];
}

export async function applySuburbImport(plan: SuburbImportPlan): Promise<SuburbImportResult> {
  const result: SuburbImportResult = { created: 0, updated: 0, failed: [] };

  const inserts = plan.rows.filter((r) => r.action === "create").map((r) => r.values);
  if (inserts.length) {
    const { error } = await supabase.from("suburbs").insert(inserts);
    if (error) result.failed.push(error.message);
    else result.created = inserts.length;
  }

  for (const r of plan.rows) {
    if (r.action !== "update" || !r.existingId) continue;
    const { error } = await supabase.from("suburbs").update(r.values).eq("id", r.existingId);
    if (error) result.failed.push(`${r.name}: ${error.message}`);
    else result.updated += 1;
  }

  await S().loadAll();
  return result;
}
