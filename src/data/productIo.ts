/* Product import and export.

   Follows the contract the catalogue screen has always described: columns
   sku, name, category, unit, fractional, price, stock, variant_of; rows matched
   on SKU; an existing SKU updates that product, a new one creates it, nothing
   is deleted; a category named in the file that does not exist yet is created.

   Variants export as their own rows, carrying the parent's SKU in variant_of,
   so a variable product round-trips with the prices that actually sell — they
   live on the variants, not the parent. */

import { supabase } from "../lib/supabase";
import { useApp } from "../store/store";
import { downloadCsv, readCsvTable, toCsv } from "../lib/csv";
import { UNITS } from "../lib/domain";
import type { Product, ProductUnit } from "../lib/types";

const S = () => useApp.getState();
const uuid = () => crypto.randomUUID();

export const PRODUCT_COLUMNS = [
  "SKU",
  "Name",
  "Category",
  "Unit",
  "Fractional",
  "Price",
  "Stock",
  "Active",
  "Variant of",
  "Image URL",
];

/* ---------- export ---------- */

export function exportProductsCsv(): number {
  const s = S();
  const catName = (id: string | null) => s.categories.find((c) => c.id === id)?.name || "";
  const rows: (string | number)[][] = [];

  [...s.products]
    .sort((a, b) => a.sku.localeCompare(b.sku, undefined, { numeric: true }))
    .forEach((p) => {
      rows.push([
        p.sku,
        p.name,
        catName(p.category_id),
        p.unit,
        p.fractional === null || p.fractional === undefined ? "" : p.fractional ? "Yes" : "No",
        p.price,
        p.stock,
        p.active ? "Yes" : "No",
        "",
        p.image_url || "",
      ]);
      /* Straight after their parent, so the file reads the way the catalogue
         does and a spreadsheet sort is not needed to make sense of it. */
      (p.variants || []).forEach((v) => {
        rows.push([v.sku, v.name, catName(p.category_id), p.unit, "", v.price, v.stock, p.active ? "Yes" : "No", p.sku, ""]);
      });
    });

  const today = new Date().toISOString().slice(0, 10);
  downloadCsv(`products-${today}.csv`, toCsv(PRODUCT_COLUMNS, rows));
  return rows.length;
}

/* ---------- import ---------- */

export interface ProductImportRow {
  line: number;
  action: "create" | "update" | "create-variant" | "update-variant" | "reject";
  sku: string;
  name: string;
  parentSku?: string;
  reason?: string;
  warnings: string[];
  values: Partial<Product>;
  categoryName?: string;
  variant?: { name: string; sku: string; price: number; stock: number };
  existingId?: string;
}

export interface ProductImportPlan {
  rows: ProductImportRow[];
  creates: number;
  updates: number;
  variants: number;
  rejects: number;
  warnings: number;
  newCategories: string[];
  unknownColumns: string[];
}

const yes = (v: string) => /^(y|yes|true|1)$/i.test(v.trim());
const num = (v: string) => {
  const n = Number(String(v).replace(/[$,\s]/g, ""));
  return Number.isFinite(n) ? n : null;
};

const KNOWN = new Set([
  "sku", "code", "productcode",
  "name", "product", "productname", "description",
  "category", "categoryname",
  "unit", "uom", "soldin",
  "fractional", "divisible",
  "price", "unitprice",
  "stock", "onhand", "qty", "quantity",
  "active", "enabled",
  "variantof", "parent", "parentsku",
  "imageurl", "image",
]);

const pick = (row: Record<string, string>, ...keys: string[]) => {
  for (const k of keys) if (row[k] !== undefined && row[k] !== "") return row[k];
  return "";
};

/* "m3", "M³", "cubic metre" all mean the same bin. */
const UNIT_ALIASES: Record<string, ProductUnit> = {
  m3: "m³", "m³": "m³", cubicmetre: "m³", cubicmeter: "m³", cube: "m³",
  t: "t", tonne: "t", ton: "t",
  kg: "kg", kilogram: "kg", kilo: "kg",
  bag: "bag", bags: "bag",
  each: "each", ea: "each", unit: "each",
  pallet: "pallet", pallets: "pallet",
};
const readUnit = (v: string): ProductUnit | null => UNIT_ALIASES[v.trim().toLowerCase().replace(/[\s.]/g, "")] || null;

export function planProductImport(text: string): ProductImportPlan {
  const s = S();
  const { headers, rows } = readCsvTable(text);
  const unknownColumns = headers.filter((h) => {
    const k = h.toLowerCase().replace(/[^a-z0-9]/g, "");
    return k && !KNOWN.has(k);
  });

  const newCategories: string[] = [];
  const categoryFor = (name: string): string | undefined => {
    const hit = s.categories.find((c) => c.name.toLowerCase() === name.trim().toLowerCase());
    if (hit) return hit.id;
    if (!newCategories.some((n) => n.toLowerCase() === name.trim().toLowerCase())) newCategories.push(name.trim());
    return undefined;
  };

  /* SKUs claimed by this file, so it cannot define the same product twice, and
     so a variant can name a parent that only exists in the file. */
  const seen = new Map<string, number>();
  const fileProducts = new Set<string>();

  const out: ProductImportRow[] = rows.map((row, i) => {
    const line = i + 2;
    const warnings: string[] = [];
    const sku = pick(row, "sku", "code", "productcode").trim();
    const name = pick(row, "name", "product", "productname", "description").trim();
    const parentSku = pick(row, "variantof", "parent", "parentsku").trim();

    const reject = (reason: string): ProductImportRow => ({
      line,
      action: "reject",
      sku,
      name,
      parentSku: parentSku || undefined,
      reason,
      warnings,
      values: {},
    });

    if (!sku) return reject("No SKU — every row needs one, and it is what rows are matched on.");
    if (!name) return reject("No product name.");
    if (seen.has(sku)) return reject(`SKU ${sku} appears twice in this file (also on line ${seen.get(sku)}).`);
    seen.set(sku, line);

    const priceRaw = pick(row, "price", "unitprice");
    const price = priceRaw ? num(priceRaw) : null;
    if (priceRaw && price === null) return reject(`"${priceRaw}" is not a price.`);
    const stockRaw = pick(row, "stock", "onhand", "qty", "quantity");
    const stock = stockRaw ? num(stockRaw) : null;
    if (stockRaw && stock === null) return reject(`"${stockRaw}" is not a stock figure.`);

    /* ---- a variant row ---- */
    if (parentSku) {
      const parentInFile = fileProducts.has(parentSku);
      const parentInStore = s.products.find((p) => p.sku === parentSku);
      if (!parentInFile && !parentInStore)
        return reject(`No product with SKU ${parentSku} to hang this variant on — put the parent above it, or import it first.`);
      const existingVariant = parentInStore?.variants?.find((v) => v.sku === sku);
      if (price === null && !existingVariant) return reject("A new variant needs a price.");
      return {
        line,
        action: existingVariant ? "update-variant" : "create-variant",
        sku,
        name,
        parentSku,
        warnings,
        values: {},
        existingId: existingVariant?.id,
        variant: {
          name,
          sku,
          price: price ?? Number(existingVariant?.price) ?? 0,
          stock: stock ?? Number(existingVariant?.stock ?? 0),
        },
      };
    }

    /* ---- a product row ---- */
    fileProducts.add(sku);
    const existing = s.products.find((p) => p.sku === sku);
    const values: Partial<Product> = { sku, name };

    const catRaw = pick(row, "category", "categoryname");
    let categoryName: string | undefined;
    if (catRaw) {
      categoryName = catRaw.trim();
      const id = categoryFor(catRaw);
      if (id) values.category_id = id;
      /* Otherwise it is resolved at apply time, once the category exists. */
    }

    const unitRaw = pick(row, "unit", "uom", "soldin");
    if (unitRaw) {
      const unit = readUnit(unitRaw);
      if (!unit) return reject(`"${unitRaw}" is not one of ${Object.keys(UNITS).join(", ")}.`);
      values.unit = unit;
    } else if (!existing) values.unit = "each";

    const fracRaw = pick(row, "fractional", "divisible");
    if (fracRaw) values.fractional = yes(fracRaw);

    if (price !== null) values.price = price;
    else if (!existing) return reject("A new product needs a price.");

    if (stock !== null) values.stock = stock;
    else if (!existing) values.stock = 0;

    const activeRaw = pick(row, "active", "enabled");
    if (activeRaw) values.active = yes(activeRaw);
    else if (!existing) values.active = true;

    const img = pick(row, "imageurl", "image").trim();
    if (img) values.image_url = img;

    if (existing && existing.kind === "variable" && price !== null)
      warnings.push("This product sells through its variants, so the price here is not what customers pay.");

    return {
      line,
      action: existing ? "update" : "create",
      sku,
      name,
      warnings,
      values,
      categoryName,
      existingId: existing?.id,
    };
  });

  return {
    rows: out,
    creates: out.filter((r) => r.action === "create").length,
    updates: out.filter((r) => r.action === "update").length,
    variants: out.filter((r) => r.action === "create-variant" || r.action === "update-variant").length,
    rejects: out.filter((r) => r.action === "reject").length,
    warnings: out.reduce((t, r) => t + r.warnings.length, 0),
    newCategories,
    unknownColumns,
  };
}

export interface ProductImportResult {
  created: number;
  updated: number;
  variants: number;
  categories: number;
  failed: string[];
}

export async function applyProductImport(plan: ProductImportPlan): Promise<ProductImportResult> {
  const s = S();
  const result: ProductImportResult = { created: 0, updated: 0, variants: 0, categories: 0, failed: [] };

  /* Categories first: a product row cannot be written until the category it
     names has an id. */
  const categoryIds = new Map<string, string>();
  s.categories.forEach((c) => categoryIds.set(c.name.toLowerCase(), c.id));
  if (plan.newCategories.length) {
    const rows = plan.newCategories.map((name, i) => ({ name, sort_order: s.categories.length + i + 1 }));
    const { data, error } = await supabase.from("product_categories").insert(rows).select("*");
    if (error) {
      result.failed.push(`Categories: ${error.message}`);
      return result;
    }
    (data || []).forEach((c: any) => categoryIds.set(String(c.name).toLowerCase(), c.id));
    result.categories = (data || []).length;
  }

  /* SKU -> product id, filled in as products are written so the variants that
     follow can find their parent even when it was created by this same file. */
  const productIdBySku = new Map<string, string>();
  s.products.forEach((p) => productIdBySku.set(p.sku, p.id));

  const inserts: Record<string, unknown>[] = [];
  const updates: { id: string; patch: Record<string, unknown> }[] = [];

  for (const row of plan.rows) {
    if (row.action !== "create" && row.action !== "update") continue;
    const patch: Record<string, unknown> = { ...row.values };
    if (row.categoryName) {
      const id = categoryIds.get(row.categoryName.toLowerCase());
      if (id) patch.category_id = id;
    }
    if (row.action === "update" && row.existingId) {
      updates.push({ id: row.existingId, patch });
    } else {
      const id = uuid();
      productIdBySku.set(row.sku, id);
      inserts.push({ id, kind: "single", ...patch });
    }
  }

  if (inserts.length) {
    const { error } = await supabase.from("products").insert(inserts);
    if (error) result.failed.push(`Products: ${error.message}`);
    else result.created = inserts.length;
  }
  for (const u of updates) {
    const { error } = await supabase.from("products").update(u.patch).eq("id", u.id);
    if (error) result.failed.push(`Product ${u.id}: ${error.message}`);
    else result.updated += 1;
  }

  /* Variants last, and only once their parents exist. A parent that gained a
     variant becomes a variable product — that is what makes the catalogue show
     the variant prices instead of the parent's. */
  const variantInserts: Record<string, unknown>[] = [];
  const variantUpdates: { id: string; patch: Record<string, unknown> }[] = [];
  const nowVariable = new Set<string>();

  for (const row of plan.rows) {
    if (!row.variant || !row.parentSku) continue;
    const parentId = productIdBySku.get(row.parentSku);
    if (!parentId) {
      result.failed.push(`Variant ${row.sku}: parent ${row.parentSku} was not written.`);
      continue;
    }
    nowVariable.add(parentId);
    if (row.existingId) variantUpdates.push({ id: row.existingId, patch: row.variant });
    else variantInserts.push({ id: uuid(), product_id: parentId, ...row.variant });
  }

  if (variantInserts.length) {
    const { error } = await supabase.from("product_variants").insert(variantInserts);
    if (error) result.failed.push(`Variants: ${error.message}`);
    else result.variants += variantInserts.length;
  }
  for (const v of variantUpdates) {
    const { error } = await supabase.from("product_variants").update(v.patch).eq("id", v.id);
    if (error) result.failed.push(`Variant ${v.id}: ${error.message}`);
    else result.variants += 1;
  }
  for (const id of nowVariable) {
    const { error } = await supabase.from("products").update({ kind: "variable" }).eq("id", id);
    if (error) result.failed.push(`Product ${id}: ${error.message}`);
  }

  await S().loadAll();
  return result;
}
