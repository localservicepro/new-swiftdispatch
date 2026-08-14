import React, { useState } from "react";
import { useApp } from "../store/store";
import { AUD, qtyText, soldIn, unitFor, unitOf, unitPrice, UNITS, dmy } from "../lib/domain";
import type { Product, ProductUnit } from "../lib/types";
import { addCategory, createSpecial, deleteProduct, removeCategory, removeSpecial, renameCategory, toggleSpecial, upsertProduct } from "../data/api";
import { Alert, Badge, Button, Card, Checkbox, DataTable, EmptyState, Icon, Input, Select, Switch, Tabs, Textarea } from "../design-system/components.js";

const BLANK_FORM = {
  open: false,
  mode: "add" as "add" | "edit",
  id: "",
  name: "",
  sku: "",
  categoryId: "",
  unit: "m³" as ProductUnit,
  price: "",
  stock: "",
  fractional: true,
  kind: "single" as "single" | "variable",
  variants: [] as { name: string; sku: string; price: string; stock: string }[],
};

export default function Products() {
  const app = useApp();
  const { products, categories, specials } = app;
  const [tab, setTab] = useState<"catalogue" | "categories" | "specials">("catalogue");
  const [query, setQuery] = useState("");
  const [catFilter, setCatFilter] = useState("All categories");
  const [csvNote, setCsvNote] = useState<{ title: string; body: string } | null>(null);
  const [form, setForm] = useState({ ...BLANK_FORM });
  const [newCatName, setNewCatName] = useState("");
  const [sp, setSp] = useState({ name: "", kind: "percent" as "percent" | "amount", value: "", scope: "products" as "all" | "category" | "products", categoryId: "", ids: [] as string[], from: "", to: "" });

  const catName = (id: string | null) => categories.find((c) => c.id === id)?.name || "—";
  const priceOf = (p: Product) => unitPrice(p, specials, () => null);
  const today = new Date().toISOString().slice(0, 10);
  const isLive = (s: (typeof specials)[number]) =>
    s.active && (!s.from_date || today >= s.from_date) && (!s.to_date || today <= s.to_date);
  const activeSpecials = specials.filter(isLive);
  const discounted = products.filter((p) => priceOf(p) < Number(p.price)).length;

  const pq = query.trim().toLowerCase();
  const matches = products.filter((p) => {
    if (catFilter !== "All categories" && catName(p.category_id) !== catFilter) return false;
    return !pq || (p.name + " " + p.sku).toLowerCase().includes(pq);
  });

  const setPf = (patch: Partial<typeof form>) => setForm((f) => ({ ...f, ...patch }));
  const pfUnitRes = unitFor({ unit: form.unit, fractional: form.fractional });

  const productsIn = (s: (typeof specials)[number]) =>
    s.scope === "all" ? products : s.scope === "category" ? products.filter((p) => p.category_id === s.category_id) : products.filter((p) => (s.product_ids || []).includes(p.id));

  const nsCount = sp.scope === "all" ? products.length : sp.scope === "category" ? products.filter((p) => p.category_id === (sp.categoryId || categories[0]?.id)).length : sp.ids.length;
  const nsPreview =
    parseFloat(sp.value) > 0
      ? (sp.kind === "percent" ? sp.value + "% off " : AUD(parseFloat(sp.value)) + " off ") +
        nsCount +
        (nsCount === 1 ? " product" : " products") +
        (sp.from || sp.to ? `, ${sp.from || "any time"} to ${sp.to || "no end"}` : ", running until you pause it") +
        "."
      : "Set a discount to see what it touches.";

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
        <Tabs
          items={[
            { id: "catalogue", label: "Catalogue", count: products.length },
            { id: "categories", label: "Categories", count: categories.length },
            { id: "specials", label: "Specials", count: activeSpecials.length },
          ]}
          activeId={tab}
          onSelect={(id: string) => {
            setTab(id as any);
            setCsvNote(null);
          }}
          variant="underline"
        />
        <div style={{ flex: 1 }} />
        <Button
          variant="ghost"
          size="sm"
          iconLeft="download"
          onClick={() =>
            setCsvNote({
              title: "Import expects the export's own columns",
              body: "sku, name, category, unit, fractional, price, stock, variant_of. Rows are matched on SKU — an existing SKU updates that product, a new one creates it, and nothing is deleted. A category named in the file that does not exist yet is created.",
            })
          }
        >
          Import
        </Button>
        <Button
          variant="ghost"
          size="sm"
          iconLeft="external-link"
          onClick={() =>
            setCsvNote({
              title: `Exported ${products.length} products`,
              body: `products-${dmy(today)}.csv — columns: sku, name, category, unit, fractional, price, stock, variant_of. Variants export as their own rows so the file round-trips through Import unchanged.`,
            })
          }
        >
          Export
        </Button>
      </div>

      {csvNote && (
        <Alert tone="info" title={csvNote.title}>
          {csvNote.body}
        </Alert>
      )}

      {tab === "catalogue" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
            <div style={{ flex: "1 1 240px", minWidth: 200 }}>
              <Input size="sm" icon="search" value={query} onChange={(e: any) => setQuery(e.target.value)} placeholder="Product name or SKU" />
            </div>
            <Select size="sm" options={["All categories", ...categories.map((c) => c.name)]} value={catFilter} onChange={(e: any) => setCatFilter(e.target.value)} style={{ width: 180, flexShrink: 0 }} />
            <Button variant="primary" size="sm" iconLeft="plus" onClick={() => setForm({ ...BLANK_FORM, open: true, categoryId: categories[0]?.id || "", fractional: unitOf("m³").divisible })}>
              Add product
            </Button>
          </div>
          <div style={{ fontSize: 12, color: "var(--text-faint)" }}>
            {matches.length === products.length
              ? `${products.length} products${activeSpecials.length ? ` · ${discounted} on special` : ""}`
              : `${matches.length} of ${products.length} products`}
          </div>
          <Card padding="none">
            <div style={{ overflowX: "auto" }}>
              <DataTable
                columns={[
                  { key: "sku", header: "SKU", mono: true, width: 110 },
                  { key: "name", header: "Product" },
                  { key: "cat", header: "Category", muted: true, width: 120 },
                  { key: "kind", header: "Type", muted: true, width: 110 },
                  { key: "sold", header: "Sold in", muted: true, width: 170 },
                  { key: "price", header: "Price", numeric: true, align: "right", width: 150 },
                  { key: "stock", header: "On hand", numeric: true, align: "right", width: 110 },
                ]}
                rows={matches.map((p) => {
                  const eff = priceOf(p);
                  return {
                    _p: p,
                    sku: p.sku,
                    name: p.name,
                    cat: catName(p.category_id),
                    kind: p.kind === "variable" ? `${(p.variants || []).length} variants` : "Single",
                    sold: soldIn(p),
                    price: eff < Number(p.price) ? `${AUD(eff)} was ${AUD(Number(p.price))}` : `${AUD(Number(p.price))} / ${p.unit}`,
                    stock: qtyText(p.kind === "variable" ? (p.variants || []).reduce((t, v) => t + Number(v.stock || 0), 0) : Number(p.stock), p.unit),
                  };
                })}
                dense
                onRowClick={(row: any) => {
                  const p: Product = row._p;
                  setForm({
                    open: true,
                    mode: "edit",
                    id: p.id,
                    name: p.name,
                    sku: p.sku,
                    categoryId: p.category_id || "",
                    unit: p.unit,
                    price: String(p.price),
                    stock: String(p.stock),
                    fractional: unitFor(p).divisible,
                    kind: p.kind,
                    variants: (p.variants || []).map((v) => ({ name: v.name, sku: v.sku, price: String(v.price), stock: String(v.stock) })),
                  });
                }}
              />
            </div>
          </Card>
        </div>
      )}

      {tab === "categories" && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(300px,1fr))", gap: 12, alignItems: "start" }}>
          <Card title="Categories" subtitle="What the order builder groups products by" padding="default">
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {categories.map((c) => {
                const count = products.filter((p) => p.category_id === c.id).length;
                return (
                  <div key={c.id} style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 10px", borderRadius: 8, background: "var(--surface-raised)" }}>
                    <input
                      defaultValue={c.name}
                      onBlur={(e) => e.target.value.trim() && e.target.value !== c.name && renameCategory(c.id, e.target.value.trim())}
                      style={{ flex: 1, minWidth: 0, border: "none", outline: "none", background: "transparent", fontFamily: "inherit", fontSize: 13, color: "var(--text-primary)" }}
                    />
                    <span className="tabular" style={{ fontSize: 11, color: "var(--text-faint)", whiteSpace: "nowrap" }}>
                      {count === 1 ? "1 product" : `${count} products`}
                    </span>
                    <div
                      onClick={() => !count && removeCategory(c.id)}
                      title={count ? `Move its ${count} products out first` : "Delete this category"}
                      style={{ cursor: count ? "not-allowed" : "pointer", width: 24, height: 24, flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center", borderRadius: 6, border: "1px solid var(--border-default)", color: count ? "var(--text-faint)" : "var(--text-muted)" }}
                    >
                      <Icon name="trash-2" size={12} />
                    </div>
                  </div>
                );
              })}
              <div style={{ display: "flex", alignItems: "flex-end", gap: 8, paddingTop: 4 }}>
                <div style={{ flex: 1 }}>
                  <Input size="sm" label="New category" value={newCatName} onChange={(e: any) => setNewCatName(e.target.value)} placeholder="e.g. Pavers" />
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  iconLeft="plus"
                  disabled={!newCatName.trim() || categories.some((c) => c.name === newCatName.trim())}
                  onClick={() => {
                    void addCategory(newCatName.trim());
                    setNewCatName("");
                  }}
                >
                  Add
                </Button>
              </div>
              <div style={{ fontSize: 11, color: "var(--text-faint)", textWrap: "pretty" as any }}>
                Renaming a category moves every product in it. A category holding products cannot be deleted — move them
                first.
              </div>
            </div>
          </Card>

          <Card title="Where categories are used" padding="default">
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {[
                { icon: "shopping-cart", text: "The order builder's filter chips, in this order." },
                { icon: "dollar-sign", text: "A special can target a whole category, so every product in it moves together." },
                { icon: "chart-column", text: "Reports group product sales by category." },
              ].map((u) => (
                <div key={u.icon} style={{ display: "flex", alignItems: "flex-start", gap: 8, fontSize: 12, color: "var(--text-muted)" }}>
                  <Icon name={u.icon} size={13} color="var(--text-faint)" style={{ marginTop: 1 }} />
                  <span style={{ textWrap: "pretty" as any }}>{u.text}</span>
                </div>
              ))}
            </div>
          </Card>
        </div>
      )}

      {tab === "specials" && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(320px,1fr))", gap: 12, alignItems: "start" }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 12, minWidth: 0 }}>
            {specials.length === 0 && (
              <EmptyState icon="dollar-sign" title="No specials running">
                A special takes a percentage or an amount off a single product, a whole category, or a set you pick.
                Create one on the right.
              </EmptyState>
            )}
            {specials.map((s) => {
              const affected = productsIn(s);
              const shown = affected.slice(0, 4);
              const live = isLive(s);
              return (
                <Card key={s.id} padding="default">
                  <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                      <span style={{ fontSize: 14, fontWeight: 600, color: "var(--text-primary)" }}>{s.name}</span>
                      <Badge tone={!s.active ? "neutral" : live ? "success" : "warning"}>
                        {!s.active ? "Paused" : live ? "Running" : s.from_date && today < s.from_date ? "Scheduled" : "Ended"}
                      </Badge>
                      <span style={{ fontSize: 12, color: "var(--text-faint)" }}>
                        {s.from_date || s.to_date ? `${s.from_date ? dmy(s.from_date) : "any time"} – ${s.to_date ? dmy(s.to_date) : "no end"}` : "No dates — always on"}
                      </span>
                      <div style={{ flex: 1 }} />
                      <Switch checked={s.active} onChange={(v: boolean) => toggleSpecial(s.id, v)} />
                      <div onClick={() => removeSpecial(s.id)} title="Delete this special" style={{ cursor: "pointer", width: 24, height: 24, display: "flex", alignItems: "center", justifyContent: "center", borderRadius: 6, border: "1px solid var(--border-default)", color: "var(--text-muted)" }}>
                        <Icon name="trash-2" size={12} />
                      </div>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", flexWrap: "wrap", gap: 8 }}>
                      <span className="tabular" style={{ fontSize: 20, fontWeight: 600, color: "var(--brand-primary)" }}>
                        {s.kind === "percent" ? s.value + "%" : AUD(Number(s.value))}
                      </span>
                      <span style={{ fontSize: 12, color: "var(--text-muted)" }}>
                        off{" "}
                        {s.scope === "all"
                          ? "every product"
                          : s.scope === "category"
                            ? "everything in " + catName(s.category_id)
                            : `${affected.length} ${affected.length === 1 ? "product" : "products"}`}
                      </span>
                    </div>
                    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                      {shown.map((p) => (
                        <div key={p.id} style={{ display: "flex", alignItems: "center", gap: 8, padding: "6px 9px", borderRadius: 6, background: "var(--surface-raised)", fontSize: 12 }}>
                          <span style={{ flex: 1, minWidth: 0, color: "var(--text-primary)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{p.name}</span>
                          <span className="tabular" style={{ color: "var(--text-faint)", textDecoration: "line-through" }}>{AUD(Number(p.price))}</span>
                          <span className="tabular" style={{ color: "var(--feedback-success)", fontWeight: 600 }}>{AUD(priceOf(p))}</span>
                        </div>
                      ))}
                      {affected.length > shown.length && (
                        <div style={{ fontSize: 11, color: "var(--text-faint)" }}>+{affected.length - shown.length} more</div>
                      )}
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>

          <Card title="Create a special" padding="default">
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              <Input size="sm" label="Name" value={sp.name} onChange={(e: any) => setSp({ ...sp, name: e.target.value })} placeholder="e.g. Spring mulch run-out" />
              <div style={{ display: "grid", gridTemplateColumns: "repeat(2,minmax(0,1fr))", gap: 8 }}>
                <Select
                  size="sm"
                  label="Discount"
                  options={[
                    { value: "percent", label: "Percent off" },
                    { value: "amount", label: "Amount off" },
                  ]}
                  value={sp.kind}
                  onChange={(e: any) => setSp({ ...sp, kind: e.target.value })}
                />
                <Input size="sm" label={sp.kind === "percent" ? "Percent" : "Amount (AUD)"} value={sp.value} onChange={(e: any) => setSp({ ...sp, value: e.target.value.replace(/[^0-9.]/g, "") })} placeholder="0" />
              </div>
              <Select
                size="sm"
                label="Applies to"
                options={[
                  { value: "all", label: "Every product" },
                  { value: "category", label: "One category" },
                  { value: "products", label: "Selected products" },
                ]}
                value={sp.scope}
                onChange={(e: any) => setSp({ ...sp, scope: e.target.value })}
              />
              {sp.scope === "category" && (
                <Select size="sm" label="Category" options={categories.map((c) => ({ value: c.id, label: c.name }))} value={sp.categoryId || categories[0]?.id || ""} onChange={(e: any) => setSp({ ...sp, categoryId: e.target.value })} />
              )}
              {sp.scope === "products" && (
                <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  <div style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: ".09em", color: "var(--text-faint)" }}>Pick the products</div>
                  <div style={{ maxHeight: 190, overflowY: "auto", display: "flex", flexDirection: "column", gap: 4, padding: 6, borderRadius: 8, border: "1px solid var(--border-subtle)" }}>
                    {products.map((p) => {
                      const on = sp.ids.includes(p.id);
                      return (
                        <div
                          key={p.id}
                          onClick={() => setSp({ ...sp, ids: on ? sp.ids.filter((x) => x !== p.id) : [...sp.ids, p.id] })}
                          style={{ cursor: "pointer", display: "flex", alignItems: "center", gap: 8, padding: "6px 8px", borderRadius: 6, background: on ? "var(--om-chip-active-bg)" : "transparent" }}
                        >
                          <Checkbox checked={on} />
                          <span style={{ flex: 1, minWidth: 0, fontSize: 12, color: "var(--text-primary)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{p.name}</span>
                          <span className="tabular" style={{ fontSize: 11, color: "var(--text-faint)" }}>{AUD(Number(p.price))}</span>
                        </div>
                      );
                    })}
                  </div>
                  <div style={{ fontSize: 11, color: "var(--text-faint)" }}>{sp.ids.length ? `${sp.ids.length} selected` : "Nothing selected yet"}</div>
                </div>
              )}
              <div style={{ display: "grid", gridTemplateColumns: "repeat(2,minmax(0,1fr))", gap: 8 }}>
                <Input size="sm" label="From" value={sp.from} onChange={(e: any) => setSp({ ...sp, from: e.target.value })} placeholder="DD/MM/YYYY" />
                <Input size="sm" label="To" value={sp.to} onChange={(e: any) => setSp({ ...sp, to: e.target.value })} placeholder="DD/MM/YYYY" />
              </div>
              <div style={{ fontSize: 11, color: "var(--text-faint)", textWrap: "pretty" as any }}>{nsPreview}</div>
              <Button
                variant="primary"
                size="md"
                iconLeft="check"
                fullWidth
                disabled={!(sp.name.trim() && parseFloat(sp.value) > 0 && (sp.scope !== "products" || sp.ids.length > 0))}
                onClick={() => {
                  const toIso = (s: string) => {
                    const p = s.split("/");
                    return p.length === 3 ? `${p[2]}-${p[1].padStart(2, "0")}-${p[0].padStart(2, "0")}` : null;
                  };
                  void createSpecial({
                    name: sp.name.trim(),
                    kind: sp.kind,
                    value: parseFloat(sp.value),
                    scope: sp.scope,
                    category_id: sp.scope === "category" ? sp.categoryId || categories[0]?.id || null : null,
                    from_date: toIso(sp.from.trim()),
                    to_date: toIso(sp.to.trim()),
                    active: true,
                    product_ids: sp.ids,
                  });
                  setSp({ name: "", kind: "percent", value: "", scope: "products", categoryId: "", ids: [], from: "", to: "" });
                }}
              >
                Create special
              </Button>
            </div>
          </Card>
        </div>
      )}

      {/* Product add/edit modal */}
      {form.open && (
        <div onClick={() => setForm({ ...BLANK_FORM })} style={{ position: "fixed", inset: 0, zIndex: 24, display: "flex", alignItems: "center", justifyContent: "center", padding: 24, background: "var(--om-scrim)" }}>
          <div onClick={(e) => e.stopPropagation()} style={{ width: "min(640px,100%)", maxHeight: "calc(100% - 48px)", display: "flex", flexDirection: "column", borderRadius: 16, background: "var(--surface-card)", border: "1px solid var(--border-default)", boxShadow: "var(--om-overlay-shadow)", overflow: "hidden" }}>
            <div style={{ flexShrink: 0, padding: 16, borderBottom: "1px solid var(--border-subtle)" }}>
              <div style={{ fontSize: 15, fontWeight: 600, color: "var(--text-primary)" }}>{form.mode === "edit" ? form.name || "Edit product" : "Add a product"}</div>
              <div style={{ fontSize: 12, color: "var(--text-faint)", marginTop: 3 }}>
                {form.mode === "edit"
                  ? "Changes apply to new orders. Orders already raised keep the price they were written at."
                  : "The unit and the fractional switch decide how it can be ordered."}
              </div>
            </div>

            <div style={{ flex: 1, minHeight: 0, overflowY: "auto", padding: 16, display: "flex", flexDirection: "column", gap: 12 }}>
              <Tabs
                items={[
                  { id: "single", label: "Single product", icon: "package" },
                  { id: "variable", label: "Variable", icon: "package-check" },
                ]}
                activeId={form.kind}
                onSelect={(id: string) => setPf({ kind: id as any, variants: id === "variable" && !form.variants.length ? [{ name: "", sku: "", price: "", stock: "" }] : form.variants })}
                variant="segmented"
                fullWidth
              />
              <div style={{ fontSize: 11, color: "var(--text-faint)", textWrap: "pretty" as any }}>
                {form.kind === "single"
                  ? "One price, one stock figure. Right for anything sold loose by the unit."
                  : "Several sizes or grades under one name — each carries its own SKU, price and stock."}
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(170px,1fr))", gap: 10 }}>
                <Input size="sm" label="Product name" value={form.name} onChange={(e: any) => setPf({ name: e.target.value })} placeholder="e.g. Screened topsoil" />
                <Input size="sm" label="SKU" value={form.sku} onChange={(e: any) => setPf({ sku: e.target.value })} placeholder={form.mode === "edit" ? "SKU" : "Left blank, one is generated"} />
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(170px,1fr))", gap: 10 }}>
                <Select size="sm" label="Category" options={categories.map((c) => ({ value: c.id, label: c.name }))} value={form.categoryId} onChange={(e: any) => setPf({ categoryId: e.target.value })} />
                <Select
                  size="sm"
                  label="Sold by"
                  options={Object.keys(UNITS).map((u) => ({ value: u, label: `${u} — ${UNITS[u as ProductUnit].label}` }))}
                  value={form.unit}
                  onChange={(e: any) => setPf({ unit: e.target.value, fractional: unitOf(e.target.value).divisible })}
                />
              </div>

              {form.kind === "single" && (
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(170px,1fr))", gap: 10 }}>
                  <Input size="sm" label={`Price per ${form.unit}`} value={form.price} onChange={(e: any) => setPf({ price: e.target.value.replace(/[^0-9.]/g, "") })} suffix="AUD" placeholder="0.00" />
                  <Input size="sm" label={`On hand (${form.unit})`} value={form.stock} onChange={(e: any) => setPf({ stock: e.target.value.replace(/[^0-9.]/g, "") })} placeholder="0" />
                </div>
              )}

              {form.kind === "variable" && (
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  <div style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: ".09em", color: "var(--text-faint)" }}>Variants</div>
                  {form.variants.map((v, i) => (
                    <div key={i} style={{ display: "grid", gridTemplateColumns: "1.4fr 1fr 0.8fr 0.8fr 28px", gap: 6, alignItems: "center" }}>
                      <VarInput value={v.name} onChange={(x) => setPf({ variants: form.variants.map((y, j) => (j === i ? { ...y, name: x } : y)) })} placeholder="Variant" />
                      <VarInput value={v.sku} onChange={(x) => setPf({ variants: form.variants.map((y, j) => (j === i ? { ...y, sku: x } : y)) })} placeholder="SKU" mono />
                      <VarInput value={v.price} onChange={(x) => setPf({ variants: form.variants.map((y, j) => (j === i ? { ...y, price: x.replace(/[^0-9.]/g, "") } : y)) })} placeholder="Price" right />
                      <VarInput value={v.stock} onChange={(x) => setPf({ variants: form.variants.map((y, j) => (j === i ? { ...y, stock: x.replace(/[^0-9.]/g, "") } : y)) })} placeholder="Stock" right />
                      <div onClick={() => setPf({ variants: form.variants.filter((_, j) => j !== i) })} title="Remove variant" style={{ cursor: "pointer", width: 26, height: 26, display: "flex", alignItems: "center", justifyContent: "center", borderRadius: 6, border: "1px solid var(--border-default)", color: "var(--text-muted)" }}>
                        <Icon name="trash-2" size={12} />
                      </div>
                    </div>
                  ))}
                  <Button variant="outline" size="sm" iconLeft="plus" onClick={() => setPf({ variants: [...form.variants, { name: "", sku: "", price: "", stock: "" }] })}>
                    Add variant
                  </Button>
                  <div style={{ fontSize: 11, color: "var(--text-faint)", textWrap: "pretty" as any }}>
                    Each variant is its own line on an order and carries its own SKU, price and stock. The unit and the
                    fractional rule are shared.
                  </div>
                </div>
              )}

              <div style={{ display: "flex", flexDirection: "column", gap: 8, padding: 10, borderRadius: 8, background: "var(--surface-raised)", border: "1px solid var(--border-subtle)" }}>
                <Switch checked={form.fractional} onChange={(v: boolean) => setPf({ fractional: v })} label="Allow fractional quantities" />
                <div style={{ fontSize: 12, color: "var(--text-muted)", textWrap: "pretty" as any }}>
                  {form.fractional
                    ? `Orders can be entered in fractions — steps of ${pfUnitRes.step} ${form.unit}, smallest order ${pfUnitRes.min} ${form.unit}.`
                    : `Whole numbers only. A typed 0.5 rounds up to 1 ${form.unit}.`}
                </div>
              </div>
            </div>

            <div style={{ flexShrink: 0, padding: "12px 16px", borderTop: "1px solid var(--border-subtle)", display: "flex", gap: 8, justifyContent: "space-between", alignItems: "center" }}>
              {form.mode === "edit" && (
                <Button
                  variant="ghost"
                  size="md"
                  iconLeft="trash-2"
                  onClick={() => {
                    deleteProduct(form.id);
                    setForm({ ...BLANK_FORM });
                  }}
                >
                  Delete
                </Button>
              )}
              <div style={{ flex: 1 }} />
              <Button variant="ghost" size="md" onClick={() => setForm({ ...BLANK_FORM })}>
                Cancel
              </Button>
              <Button
                variant="primary"
                size="md"
                iconLeft="check"
                disabled={!(form.name.trim() && (form.kind === "variable" ? form.variants.some((v) => v.name.trim() && parseFloat(v.price) > 0) : parseFloat(form.price) > 0))}
                onClick={() => {
                  const variants = form.variants
                    .filter((v) => v.name.trim() && parseFloat(v.price) > 0)
                    .map((v) => ({ name: v.name.trim(), sku: (v.sku.trim() || "VAR-" + v.name.trim().slice(0, 4)).toUpperCase(), price: parseFloat(v.price), stock: parseFloat(v.stock) || 0 }));
                  const catNm = categories.find((c) => c.id === form.categoryId)?.name || "PRD";
                  const sku = (form.sku.trim() || catNm.slice(0, 3).toUpperCase() + "-" + form.name.trim().slice(0, 3).toUpperCase()).toUpperCase();
                  void upsertProduct(
                    {
                      id: form.mode === "edit" ? form.id : undefined,
                      name: form.name.trim(),
                      sku,
                      category_id: form.categoryId || null,
                      unit: form.unit,
                      price: form.kind === "variable" ? variants[0].price : parseFloat(form.price) || 0,
                      stock: form.kind === "variable" ? variants.reduce((t, v) => t + v.stock, 0) : parseFloat(form.stock) || 0,
                      fractional: form.fractional,
                      kind: form.kind,
                    },
                    variants
                  );
                  setForm({ ...BLANK_FORM });
                }}
              >
                {form.mode === "edit" ? "Save changes" : "Add product"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function VarInput({ value, onChange, placeholder, mono, right }: { value: string; onChange: (v: string) => void; placeholder: string; mono?: boolean; right?: boolean }) {
  return (
    <input
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      style={{
        minWidth: 0,
        height: 32,
        padding: "0 8px",
        borderRadius: 6,
        border: "1px solid var(--border-default)",
        background: "var(--surface-input)",
        fontFamily: mono ? "'JetBrains Mono',monospace" : "inherit",
        fontSize: mono ? 11 : 12,
        textAlign: right ? "right" : "left",
        fontVariantNumeric: "tabular-nums",
        color: "var(--text-primary)",
      }}
    />
  );
}

void Textarea;
void qtyText;
