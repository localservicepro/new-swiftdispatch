/* MYOB AccountRight — how a SwiftDispatch order becomes a sale.

   SHGS raise sales on the Professional layout: one line per delivery, carrying
   the order number, the customer's P/O, the goods, whether it went out on a
   truck or over the counter, and where it landed. Accounts then reconcile that
   line against the delivery docket. This module turns an order into exactly
   that line — the same code renders the live preview in Settings and the
   payload the edge function posts, so what the office previews is what MYOB
   receives.

   Everything here is pure. The OAuth dance, the company-file calls and the
   append-to-an-open-order mechanics live in supabase/functions/myob-push,
   because they need the service role and a client secret. */

import { adjustmentOf, feeOf, goodsOf, orderTotal, type DeliveryPricing } from "./domain";
import type { Customer, Order, OrderItem, Product, Suburb } from "./types";

export interface MyobSettings {
  enabled: boolean;
  company_file_id: string | null;
  company_file_name: string | null;
  sale_layout: "Professional" | "Service" | "Item";
  push_as: "order" | "invoice";
  account_code: string | null;
  account_uid: string | null;
  job_code: string | null;
  job_uid: string | null;
  tax_code: string | null;
  tax_code_uid: string | null;
  is_tax_inclusive: boolean;
  terms_note: string | null;
  description_template: string;
  journal_memo_template: string;
  line_date_rule: "delivery" | "placed";
  header_date_rule: "delivery" | "placed" | "month_end";
  delivery_status: "Print" | "Email" | "PrintAndEmail" | "AlreadyPrintedOrSent";
  delivery_word: string;
  pickup_word: string;
  auto_push: boolean;
  last_pushed_at: string | null;
}

export const DEFAULT_MYOB_SETTINGS: MyobSettings = {
  enabled: false,
  company_file_id: null,
  company_file_name: null,
  sale_layout: "Professional",
  push_as: "invoice",
  account_code: "4-1010",
  account_uid: null,
  job_code: "G",
  job_uid: null,
  tax_code: "GST",
  tax_code_uid: null,
  is_tax_inclusive: true,
  terms_note: null,
  description_template: "{order_number}{po_prefix} - {items}, {method} - {address}",
  journal_memo_template: "Sale; {customer}",
  line_date_rule: "delivery",
  header_date_rule: "delivery",
  delivery_status: "Print",
  delivery_word: "DEL",
  pickup_word: "Picked up from yard",
  auto_push: false,
  last_pushed_at: null,
};

export const DELIVERY_STATUS_OPTIONS = [
  { value: "Print", label: "To be printed" },
  { value: "Email", label: "To be emailed" },
  { value: "PrintAndEmail", label: "To be printed and emailed" },
  { value: "AlreadyPrintedOrSent", label: "Already printed or sent" },
];

export const DESCRIPTION_TOKENS: { token: string; what: string }[] = [
  { token: "{order_number}", what: "ORD-531102" },
  { token: "{po_number}", what: "the customer's purchase order, blank if there isn't one" },
  { token: "{po_prefix}", what: '" - P/O No: AU46-340237" — drops out entirely with no P/O' },
  { token: "{items}", what: "4M WHITE BRICK SAND, 1 PACKET WEED MAT PINS" },
  { token: "{method}", what: "DEL or Picked up from yard" },
  { token: "{address}", what: "245 Springvale, Nunawading" },
  { token: "{street}", what: "245 Springvale" },
  { token: "{suburb}", what: "Nunawading" },
  { token: "{customer}", what: "Surrey Hills Nursery" },
  { token: "{date}", what: "16/08/2026" },
  { token: "{notes}", what: "the order notes" },
];

/* MYOB descriptions are written the way the yard says them: "1/2M", "1 1/2M",
   "4M" for bulk, whole numbers for anything counted. */
const QUARTERS: Record<string, string> = { "0.25": "1/4", "0.5": "1/2", "0.75": "3/4" };

export const myobQty = (qty: number, unit: string): string => {
  const n = Number(qty) || 0;
  if (unit !== "m³" && unit !== "t") return String(Math.round(n * 100) / 100);
  const whole = Math.floor(n);
  const frac = QUARTERS[String(Math.round((n - whole) * 100) / 100)];
  if (!frac) return String(Math.round(n * 100) / 100);
  return whole ? `${whole} ${frac}` : frac;
};

/* A name that starts with a digit ("10M MULCH MAT") reads as one long number
   next to its quantity, so those get an "x" between them. */
export const myobItemText = (qty: number, unit: string, name: string): string => {
  const label = (name || "").toUpperCase();
  if (unit === "m³") return `${myobQty(qty, unit)}M ${label}`;
  if (unit === "t") return `${myobQty(qty, unit)}T ${label}`;
  const n = myobQty(qty, unit);
  return /^\d/.test(label) ? `${n} x ${label}` : `${n} ${label}`;
};

export interface DescriptionContext {
  order_number: string;
  po_number: string;
  po_prefix: string;
  items: string;
  method: string;
  address: string;
  street: string;
  suburb: string;
  customer: string;
  date: string;
  notes: string;
}

export const renderTemplate = (template: string, ctx: Partial<DescriptionContext>): string =>
  String(template || "")
    .replace(/\{(\w+)\}/g, (_m, key: string) => (ctx as Record<string, string>)[key] ?? "")
    /* A dropped token leaves a dangling separator behind — tidy it rather than
       shipping "331515 -  - 4M SAND" to the ledger. */
    .replace(/\s*-\s*-\s*/g, " - ")
    .replace(/\s{2,}/g, " ")
    .replace(/^[\s,-]+|[\s,-]+$/g, "")
    .trim();

const lastDayOfMonth = (iso: string): string => {
  const d = new Date(iso + "T00:00:00");
  const end = new Date(d.getFullYear(), d.getMonth() + 1, 0);
  return `${end.getFullYear()}-${String(end.getMonth() + 1).padStart(2, "0")}-${String(end.getDate()).padStart(2, "0")}`;
};

export interface MyobLine {
  date: string;
  description: string;
  total: number;
}

export interface MyobPushRequest {
  orderId: string;
  orderNumber: string;
  docType: "order" | "invoice";
  layout: MyobSettings["sale_layout"];
  customer: { id: string | null; name: string; accountNumber: string | null; uid: string | null };
  date: string;
  poNumber: string | null;
  journalMemo: string;
  comment: string | null;
  isTaxInclusive: boolean;
  deliveryStatus: string;
  accountCode: string | null;
  accountUid: string | null;
  jobCode: string | null;
  jobUid: string | null;
  taxCode: string | null;
  taxCodeUid: string | null;
  lines: MyobLine[];
}

export interface BuildContext {
  order: Order;
  items: OrderItem[];
  products: Product[];
  suburbs: Suburb[];
  customer: Customer | null | undefined;
  paySettings: DeliveryPricing | null | undefined;
  settings: MyobSettings;
}

export function descriptionContext(c: BuildContext): DescriptionContext {
  const { order, items, products, suburbs, customer, settings } = c;
  const suburb = suburbs.find((s) => s.id === order.suburb_id)?.name || "";
  const street = order.street || "";
  const itemText = items
    .map((it) => {
      const p = products.find((x) => x.id === it.product_id);
      return myobItemText(Number(it.qty), p?.unit || "each", p?.name || it.description || "ITEM");
    })
    .join(", ");
  const method = order.method === "delivery" ? settings.delivery_word : settings.pickup_word;
  const po = order.po_number || "";
  const dd = order.delivery_date || order.placed_at.slice(0, 10);
  return {
    order_number: order.order_number,
    po_number: po,
    po_prefix: po ? ` - P/O No: ${po}` : "",
    items: itemText,
    method,
    address: [street, suburb].filter(Boolean).join(", "),
    street,
    suburb,
    customer: customer?.name || order.walk_in_name || "Cash sale",
    date: dd.split("-").reverse().join("/"),
    notes: order.order_notes || "",
  };
}

export const previewDescription = (c: BuildContext): string =>
  renderTemplate(c.settings.description_template, descriptionContext(c));

/* One order becomes one line. The amount is the order's grand total — goods,
   delivery, fuel and any adjustment — so the ledger and the docket agree to the
   cent, which is the whole reason the office stopped re-keying these by hand. */
export function buildPushRequest(c: BuildContext): MyobPushRequest {
  const { order, items, suburbs, customer, paySettings, settings } = c;
  const ctx = descriptionContext(c);
  const placedDay = order.placed_at.slice(0, 10);
  const deliveryDay = order.delivery_date || placedDay;

  const lineDate = settings.line_date_rule === "placed" ? placedDay : deliveryDay;
  const headerDate =
    settings.header_date_rule === "placed"
      ? placedDay
      : settings.header_date_rule === "month_end"
        ? lastDayOfMonth(deliveryDay)
        : deliveryDay;

  return {
    orderId: order.id,
    orderNumber: order.order_number,
    docType: settings.push_as,
    layout: settings.sale_layout,
    customer: {
      id: customer?.id || null,
      name: ctx.customer,
      accountNumber: customer?.account_number || null,
      uid: (customer as any)?.myob_uid || null,
    },
    date: headerDate,
    poNumber: order.po_number || null,
    journalMemo: renderTemplate(settings.journal_memo_template, ctx),
    comment: settings.terms_note || null,
    isTaxInclusive: settings.is_tax_inclusive,
    deliveryStatus: settings.delivery_status,
    accountCode: settings.account_code,
    accountUid: settings.account_uid,
    jobCode: settings.job_code,
    jobUid: settings.job_uid,
    taxCode: settings.tax_code,
    taxCodeUid: settings.tax_code_uid,
    lines: [
      {
        date: lineDate,
        description: renderTemplate(settings.description_template, ctx),
        total: orderTotal(order, items, suburbs, paySettings),
      },
    ],
  };
}

/* Reasons an order cannot go across yet. Shown on the button rather than
   discovered as a 400 from MYOB three screens later. */
export function pushBlockers(c: BuildContext): string[] {
  const { order, items, settings } = c;
  const out: string[] = [];
  if (!settings.enabled) out.push("The MYOB connection is switched off in Settings › Integrations.");
  if (!settings.company_file_id) out.push("No company file chosen in Settings › Integrations.");
  if (!settings.account_code && !settings.account_uid) out.push("No income account set.");
  if (!settings.tax_code && !settings.tax_code_uid) out.push("No tax code set.");
  if (!items.length) out.push("The order has no line items.");
  if (order.kind === "master") out.push("Push the splits, not the master — each split is its own delivery.");
  const goods = goodsOf(items);
  const total = goods + (order.method === "delivery" ? feeOf(order, c.suburbs, c.paySettings) : 0) + adjustmentOf(order, goods);
  if (total <= 0) out.push("The order totals nothing, so there is nothing to invoice.");
  return out;
}

export const myobStateOf = (o: Order): "pushed" | "failed" | "pending" =>
  o.myob_pushed_at ? "pushed" : o.myob_error ? "failed" : "pending";
