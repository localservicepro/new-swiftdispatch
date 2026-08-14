/* Pure domain helpers, ported from the design prototype so every surface reads
   the same rules: unit steps, specials pricing, suburb-keyed delivery fees and
   stop-credit blocking. */

import type {
  Customer,
  Order,
  OrderItem,
  OrderStatus,
  PaymentType,
  Product,
  ProductUnit,
  Special,
  Suburb,
} from "./types";

export const AUD = (n: number) =>
  "$" + n.toLocaleString("en-AU", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
export const AUD0 = (n: number) => "$" + Math.round(n).toLocaleString("en-AU");

/* Bulk goods are scooped, not counted — a quarter metre of mulch is a real order.
   Bagged goods are not divisible. Each unit carries its own increment. */
export interface UnitRule {
  step: number;
  min: number;
  decimals: number;
  label: string;
  divisible: boolean;
}

export const UNITS: Record<ProductUnit, UnitRule> = {
  "m³": { step: 0.25, min: 0.25, decimals: 2, label: "cubic metre", divisible: true },
  t: { step: 0.5, min: 0.5, decimals: 2, label: "tonne", divisible: true },
  kg: { step: 5, min: 5, decimals: 0, label: "kilogram", divisible: true },
  bag: { step: 1, min: 1, decimals: 0, label: "bag", divisible: false },
  each: { step: 1, min: 1, decimals: 0, label: "each", divisible: false },
  pallet: { step: 1, min: 1, decimals: 0, label: "pallet", divisible: false },
};

export const unitOf = (u: string | undefined): UnitRule => UNITS[(u || "each") as ProductUnit] || UNITS.each;

/* A product's own fractional flag wins over its unit's default. */
export const unitFor = (p: Pick<Product, "unit" | "fractional"> | undefined): UnitRule => {
  const base = unitOf(p?.unit);
  const allow = p && p.fractional !== undefined && p.fractional !== null ? p.fractional : base.divisible;
  if (allow) return base.divisible ? base : { ...base, step: 0.5, min: 0.5, decimals: 2, divisible: true };
  return { ...base, step: Math.max(1, Math.ceil(base.step)), min: 1, decimals: 0, divisible: false };
};

export const roundToStep = (n: number, rule: UnitRule) =>
  Math.round(Math.round(n / rule.step) * rule.step * 1000) / 1000;

export const qtyText = (n: number, u: string) => {
  const d = unitOf(u).decimals;
  const s = Number(n).toFixed(d);
  return (d ? s.replace(/\.?0+$/, "") : s) + " " + u;
};

export const soldIn = (p: Product) => {
  const d = unitFor(p);
  return d.divisible ? `${p.unit} · steps of ${d.step}` : `${p.unit} · whole only`;
};

/* Dates. The app is live: "today" is the real day, DD/MM/YYYY on screen. */
const DAY = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTH = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

export const dmy = (iso: string | null | undefined): string => {
  if (!iso) return "";
  const d = new Date(iso + (iso.length === 10 ? "T00:00:00" : ""));
  if (isNaN(d.getTime())) return iso;
  return (
    String(d.getDate()).padStart(2, "0") +
    "/" +
    String(d.getMonth() + 1).padStart(2, "0") +
    "/" +
    d.getFullYear()
  );
};

export const isoFromDmy = (s: string): string | null => {
  const p = String(s || "").split("/");
  if (p.length !== 3) return null;
  const [dd, mm, yy] = p.map(Number);
  if (!dd || !mm || !yy) return null;
  return `${yy}-${String(mm).padStart(2, "0")}-${String(dd).padStart(2, "0")}`;
};

export const shortDate = (iso: string | null | undefined) => {
  if (!iso) return "";
  const d = new Date(iso + (iso.length === 10 ? "T00:00:00" : ""));
  if (isNaN(d.getTime())) return iso;
  return `${DAY[d.getDay()]} ${String(d.getDate()).padStart(2, "0")} ${MONTH[d.getMonth()]}`;
};

export const placedText = (ts: string) => {
  const d = new Date(ts);
  return (
    dmy(d.toISOString().slice(0, 10)).slice(0, 5) +
    "/" +
    d.getFullYear() +
    " " +
    d.toLocaleTimeString("en-AU", { hour: "numeric", minute: "2-digit", hour12: true }).toUpperCase()
  );
};

/* A special is a property of the price list — one resolver, best discount wins,
   overlapping specials never stack. */
export const unitPrice = (
  p: Product | undefined,
  specials: Special[],
  categoryNameById: (id: string | null) => string | null
): number => {
  if (!p) return 0;
  const today = new Date().toISOString().slice(0, 10);
  let best = p.price;
  for (const s of specials) {
    if (!s.active) continue;
    if (s.from_date && today < s.from_date) continue;
    if (s.to_date && today > s.to_date) continue;
    const hit =
      s.scope === "all" ||
      (s.scope === "category" && s.category_id != null && s.category_id === p.category_id) ||
      (s.scope === "products" && (s.product_ids || []).includes(p.id));
    if (!hit) continue;
    const v = s.kind === "percent" ? p.price * (1 - s.value / 100) : p.price - s.value;
    if (v < best) best = v;
  }
  void categoryNameById;
  return Math.max(0, Math.round(best * 100) / 100);
};

/* §5.8: the fee resolves from the suburb entity. Switched off (or unknown) is
   the same unresolved state — block, never guess. */
export interface SuburbRate {
  id: string;
  postcode: string;
  fee: number;
  state: string;
  missing: boolean;
  inactive: boolean;
}

export const suburbRate = (suburbId: string | null | undefined, suburbs: Suburb[]): SuburbRate => {
  const hit = suburbId ? suburbs.find((s) => s.id === suburbId) : undefined;
  if (!hit) return { id: "", postcode: "", fee: 0, state: "VIC", missing: true, inactive: false };
  if (!hit.active)
    return { id: "", postcode: hit.postcode, fee: 0, state: hit.state, missing: true, inactive: true };
  return {
    id: hit.id,
    postcode: hit.postcode,
    fee: Number(hit.delivery_fee) || 0,
    state: hit.state,
    missing: false,
    inactive: false,
  };
};

/* Delivery pricing (Payments › Settings): the fee charged is the suburb rate
   plus the configured markup. A hand-typed fee is deliberate and taken as-is —
   markup never silently stacks on top of it. */
export interface DeliveryPricing {
  markup_type: "percent" | "fixed";
  markup_value: number;
  fuel_surcharge: number;
}

export const markupOn = (base: number, pay: DeliveryPricing | null | undefined): number => {
  if (!pay) return 0;
  const mv = Number(pay.markup_value) || 0;
  return Math.round((pay.markup_type === "percent" ? (base * mv) / 100 : mv) * 100) / 100;
};

export const resolvedSuburbFee = (
  suburbId: string | null | undefined,
  suburbs: Suburb[],
  pay: DeliveryPricing | null | undefined
): { base: number; markup: number; total: number } => {
  const base = suburbRate(suburbId, suburbs).fee || 0;
  const markup = markupOn(base, pay);
  return { base, markup, total: Math.round((base + markup) * 100) / 100 };
};

export const fuelOf = (pay: DeliveryPricing | null | undefined): number =>
  pay ? Number(pay.fuel_surcharge) || 0 : 0;

export const feeOf = (
  o: Pick<Order, "fee_source" | "delivery_fee" | "suburb_id">,
  suburbs: Suburb[],
  pay?: DeliveryPricing | null
): number => {
  if (o.fee_source === "manual") return Number(o.delivery_fee) || 0;
  return resolvedSuburbFee(o.suburb_id, suburbs, pay).total;
};

export const goodsOf = (items: OrderItem[]) => items.reduce((t, i) => t + Number(i.line_total), 0);

export const orderTotal = (o: Order, items: OrderItem[], suburbs: Suburb[], pay?: DeliveryPricing | null) => {
  const goods = goodsOf(items);
  const fee = o.method === "delivery" ? feeOf(o, suburbs, pay) + (Number(o.fuel_surcharge) || 0) : 0;
  const adjust =
    o.adjustment_type === "percent"
      ? -goods * (Number(o.adjustment_value) || 0) / 100
      : o.adjustment_type === "amount"
        ? -(Number(o.adjustment_value) || 0)
        : 0;
  return Math.round((goods + fee + adjust) * 100) / 100;
};

/* Stop credit: manual hold, or the balance over the limit on an account. */
export const blockedState = (c: Customer | null | undefined): { blocked: boolean; reason: string } => {
  if (!c) return { blocked: false, reason: "" };
  if (c.billing !== "account") return { blocked: false, reason: "" };
  if (c.stop_credit)
    return {
      blocked: true,
      reason:
        "Held by hand. Someone at the yard put this account on stop credit — clear the switch on the Credit tab to let orders through again.",
    };
  if (Number(c.balance) > Number(c.credit_limit)) {
    return {
      blocked: true,
      reason:
        "Owing $" +
        Number(c.balance).toLocaleString("en-AU", { minimumFractionDigits: 2 }) +
        " against a $" +
        Number(c.credit_limit).toLocaleString("en-AU") +
        " limit. Take a payment, raise the limit, or switch them to prepaid — new orders stay blocked until the balance is under the limit.",
    };
  }
  return { blocked: false, reason: "" };
};

/* §5.3: the billing relationship derives from the customer. */
export const derivePaymentType = (c: Customer | null | undefined): PaymentType => {
  if (!c || c.billing !== "account") return "prepaid";
  if (c.terms_days === 7) return "account_7";
  if (c.terms_days === 14) return "account_14";
  return "account_30";
};

export const customerBadgeType = (c: Customer | null | undefined): "account" | "trade" | "residential" => {
  if (!c) return "residential";
  if (c.billing === "account") return "account";
  return c.tier === "Trade" ? "trade" : "residential";
};

export const LANES: { id: OrderStatus; title: string; accent: string }[] = [
  { id: "on_hold", title: "On hold", accent: "var(--status-on-hold)" },
  { id: "requested", title: "Requested", accent: "var(--status-requested)" },
  { id: "preparing", title: "Confirmed & preparing", accent: "var(--status-preparing)" },
  { id: "loading", title: "Loading", accent: "var(--status-loading)" },
  { id: "en_route", title: "En route", accent: "var(--status-enroute)" },
  { id: "delivered", title: "Delivered", accent: "var(--status-delivered)" },
];

export const STATUS_ACCENT: Partial<Record<OrderStatus, string>> = {
  requested: "var(--status-requested)",
  preparing: "var(--status-preparing)",
  loading: "var(--status-loading)",
  en_route: "var(--status-enroute)",
  delivered: "var(--status-delivered)",
  on_hold: "var(--status-on-hold)",
};

export const TRUCK_TYPES: Record<string, { label: string; sub: string; icon: string }> = {
  crane: { label: "Crane truck", sub: "Specialized cargo", icon: "wrench" },
  small: { label: "Small truck", sub: "Up to 3 tonnes", icon: "package" },
  medium: { label: "Medium truck", sub: "Up to 8 tonnes", icon: "truck" },
  large: { label: "Large truck", sub: "Up to 15 tonnes", icon: "truck" },
  semi: { label: "Semi trailer", sub: "Over 15 tonnes", icon: "truck" },
  tipper: { label: "Tipper", sub: "Specialized cargo", icon: "truck" },
  float: { label: "Float", sub: "Specialized cargo", icon: "truck" },
};

export const ROLES: Record<
  string,
  { key: string; label: string; icon: string; perms: string[]; note: string }
> = {
  super_admin: {
    key: "super_admin",
    label: "Super admin",
    icon: "shield-check",
    perms: ["Everything an admin can do", "Manage team & roles", "Delete users", "Edit delivered orders"],
    note: "The only role that can see the Admins list, change someone's role or remove a user.",
  },
  admin: {
    key: "admin",
    label: "Admin",
    icon: "user",
    perms: ["Orders", "Customers", "Payments", "Products", "Suburbs"],
    note: "Runs the yard day to day. Cannot change team access or roles.",
  },
  driver: {
    key: "driver",
    label: "Driver",
    icon: "truck",
    perms: ["Driver portal only", "Assignable to orders"],
    note: "Sees only the jobs assigned to them. A yard with no drivers cannot assign deliveries.",
  },
};

/* 12-hour labels match what dispatch writes on paper run sheets. */
const hh12 = (mins: number) => {
  let h = Math.floor(mins / 60);
  const m = mins % 60;
  const ap = h >= 12 ? "PM" : "AM";
  h = h % 12;
  if (h === 0) h = 12;
  return h + (m ? ":" + String(m).padStart(2, "0") : ":00") + " " + ap;
};
const buildWindows = (stepMin: number, spanMin: number) => {
  const out: string[] = [];
  for (let t = 7 * 60; t + spanMin <= 17 * 60; t += stepMin) out.push(hh12(t) + " - " + hh12(t + spanMin));
  return out;
};
export const WINDOWS_30 = buildWindows(30, 30);
export const WINDOWS_60 = buildWindows(30, 60);

export const WINDOW_OPTIONS = [
  "ASAP",
  "Within the hour",
  "07:00 – 11:00",
  "11:00 – 15:00",
  "12:00 – 16:00",
  "13:00 – 16:00",
  "15:00 – 17:00",
];

/* Board lanes sort on a resolved delivery timestamp so ASAP / 1-hour orders sit
   in time order at the top of their day, never at the bottom (§6 sort-key bug). */
export const deliverySortKey = (o: Pick<Order, "delivery_date" | "delivery_window" | "placed_at">) => {
  const day = o.delivery_date ? new Date(o.delivery_date + "T00:00:00").getTime() : 8640000000000000;
  const w = o.delivery_window || "";
  let mins: number;
  if (w === "ASAP") mins = 0;
  else if (w === "Within the hour") mins = 1;
  else {
    const m = w.match(/^(\d{1,2}):(\d{2})/);
    mins = m ? Number(m[1]) * 60 + Number(m[2]) : 24 * 60;
  }
  return day + mins * 60000 + new Date(o.placed_at).getTime() / 1e7;
};
