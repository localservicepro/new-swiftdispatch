/* Mutation layer: optimistic store updates + Supabase persistence.
   Every write goes through here so the store and the database stay in step. */

import { supabase } from "../lib/supabase";
import { persist, useApp, type DeliveryDraft, type CartLine } from "../store/store";
import { derivePaymentType, feeOf, orderTotal, unitFor, roundToStep, unitPrice } from "../lib/domain";
import { pushBlockers, readyForMyob } from "../lib/myob";
import { pushContextFor, pushOrdersToMyob } from "./myob";
import { invoiceDocument, invoiceSheet, invoiceTitle } from "../print/invoice";
import { statementHtml, type StatementAgeing, type StatementLine } from "../print/statement";
import { printDocument } from "../print/print";
import type {
  Customer,
  CustomerContact,
  CustomerSite,
  Order,
  OrderItem,
  OrderStatus,
  Product,
  Special,
  Suburb,
  TeamMember,
  Truck,
} from "../lib/types";

const S = () => useApp.getState();
const set = useApp.setState;

const uuid = () => crypto.randomUUID();

/* ---------- orders ---------- */

export function patchOrderLocal(id: string, patch: Partial<Order>) {
  set((s) => ({ orders: s.orders.map((o) => (o.id === id ? { ...o, ...patch } : o)) }));
}

export function patchOrder(id: string, patch: Partial<Order>) {
  patchOrderLocal(id, patch);
  persist(supabase.from("orders").update(patch).eq("id", id), "the order");
  syncMasterToSplits(id, patch);
}

/* §5.1: editing a master's shared fields flows to every split that hasn't
   overridden them. The database trigger does the same server-side; this keeps
   the UI in step without a refetch. */
function syncMasterToSplits(id: string, patch: Partial<Order>) {
  const s = S();
  const master = s.orders.find((o) => o.id === id);
  if (!master || master.kind !== "master") return;
  const addressKeys = ["street", "suburb_id", "delivery_fee", "fee_source"] as const;
  const scheduleKeys = ["delivery_date", "delivery_window"] as const;
  const touchedAddress = addressKeys.some((k) => k in patch);
  const touchedSchedule = scheduleKeys.some((k) => k in patch);
  if (!touchedAddress && !touchedSchedule) return;
  set((st) => ({
    orders: st.orders.map((o) => {
      if (o.parent_order_id !== id) return o;
      const next = { ...o };
      if (touchedAddress && !o.overrides?.address) addressKeys.forEach((k) => ((next as any)[k] = (patch as any)[k] ?? (master as any)[k]));
      if (touchedSchedule && !o.overrides?.schedule) scheduleKeys.forEach((k) => ((next as any)[k] = (patch as any)[k] ?? (master as any)[k]));
      return next;
    }),
  }));
}

/* A split edit marks its override flag the moment it diverges (§5.1). */
export function patchSplit(id: string, patch: Partial<Order>, overrideKey?: string) {
  const s = S();
  const split = s.orders.find((o) => o.id === id);
  if (!split) return;
  const overrides = overrideKey ? { ...split.overrides, [overrideKey]: true } : split.overrides;
  patchOrderLocal(id, { ...patch, overrides });
  persist(supabase.from("orders").update({ ...patch, overrides }).eq("id", id), "the split");
}

export function resetSplitToMaster(id: string) {
  const s = S();
  const split = s.orders.find((o) => o.id === id);
  const master = split?.parent_order_id ? s.orders.find((o) => o.id === split.parent_order_id) : null;
  if (!split || !master) return;
  const patch: Partial<Order> = {
    street: master.street,
    suburb_id: master.suburb_id,
    delivery_fee: master.delivery_fee,
    fee_source: master.fee_source,
    delivery_date: master.delivery_date,
    delivery_window: master.delivery_window,
    overrides: {},
  };
  patchOrderLocal(id, patch);
  persist(supabase.from("orders").update(patch).eq("id", id), "the split");
}

export function copyToAllSplits(masterId: string, what: "address" | "schedule") {
  const s = S();
  const splits = s.orders.filter((o) => o.parent_order_id === masterId);
  const first = splits[0];
  if (!first) return;
  splits.forEach((sp) => {
    const patch: Partial<Order> =
      what === "address"
        ? { street: first.street, suburb_id: first.suburb_id, delivery_fee: first.delivery_fee, fee_source: first.fee_source }
        : { delivery_date: first.delivery_date, delivery_window: first.delivery_window };
    patchSplit(sp.id, patch, what);
  });
}

export function moveOrder(id: string, to: OrderStatus) {
  patchOrder(id, { status: to });
  logActivity("order", id, "status:" + to);
  void autoPushToMyob(id);
}

/* Settings › Integrations can have a finished sale raise itself straight away.
   Finished is per fulfilment method — delivered on a truck, collected from the
   yard, or rung up at the counter — so readyForMyob decides, not the delivered
   stage alone. It stays silent when it can't: a half-configured MYOB should not
   throw an error at whoever just marked a truck back in. */
export async function autoPushToMyob(orderId: string) {
  const s = S();
  if (!s.myob?.enabled || !s.myob.auto_push) return;
  const order = s.orders.find((o) => o.id === orderId);
  if (!order || !readyForMyob(order)) return;
  const ctx = pushContextFor(order);
  if (!ctx || pushBlockers(ctx).length) return;
  await pushOrdersToMyob([ctx]);
}

export function assignCrew(id: string, truckId: string | null, driverId: string | null) {
  const s = S();
  const isSplit = s.orders.find((o) => o.id === id)?.kind === "split";
  if (isSplit) patchSplit(id, { truck_id: truckId, driver_id: driverId }, "assignment");
  else patchOrder(id, { truck_id: truckId, driver_id: driverId });
}

export function setOrderItemQty(orderId: string, itemId: string, delta: number) {
  const s = S();
  const items = s.orderItems[orderId] || [];
  const item = items.find((i) => i.id === itemId);
  if (!item) return;
  const p = s.products.find((x) => x.id === item.product_id);
  const u = unitFor(p);
  const qty = Math.max(0, roundToStep(Number(item.qty) + delta * u.step, u));
  if (qty <= 0) return removeOrderItem(orderId, itemId);
  const next = items.map((i) =>
    i.id === itemId ? { ...i, qty, line_total: Math.round(qty * Number(i.unit_price) * 100) / 100 } : i
  );
  set((st) => ({ orderItems: { ...st.orderItems, [orderId]: next } }));
  persist(supabase.from("order_items").update({ qty }).eq("id", itemId), "the line");
  markItemsOverridden(orderId);
}

export function removeOrderItem(orderId: string, itemId: string) {
  set((st) => ({
    orderItems: { ...st.orderItems, [orderId]: (st.orderItems[orderId] || []).filter((i) => i.id !== itemId) },
  }));
  persist(supabase.from("order_items").delete().eq("id", itemId), "the line");
  markItemsOverridden(orderId);
}

export function addOrderItem(orderId: string, productId: string) {
  const s = S();
  const p = s.products.find((x) => x.id === productId);
  if (!p) return;
  const items = s.orderItems[orderId] || [];
  const found = items.find((i) => i.product_id === productId);
  if (found) return setOrderItemQty(orderId, found.id, 1);
  const u = unitFor(p);
  const price = unitPrice(p, s.specials, () => null);
  const row: OrderItem = {
    id: uuid(),
    order_id: orderId,
    product_id: productId,
    variant_id: null,
    description: null,
    qty: u.min,
    unit_price: price,
    line_total: Math.round(u.min * price * 100) / 100,
  };
  set((st) => ({ orderItems: { ...st.orderItems, [orderId]: [...items, row] } }));
  persist(
    supabase.from("order_items").insert({
      id: row.id,
      order_id: orderId,
      product_id: productId,
      qty: row.qty,
      unit_price: row.unit_price,
    }),
    "the line"
  );
  markItemsOverridden(orderId);
}

function markItemsOverridden(orderId: string) {
  const s = S();
  const o = s.orders.find((x) => x.id === orderId);
  if (o?.kind === "split" && !o.overrides?.items) {
    const overrides = { ...o.overrides, items: true };
    patchOrderLocal(orderId, { overrides });
    persist(supabase.from("orders").update({ overrides }).eq("id", orderId), "the split");
  }
}

export interface CreateOrderInput {
  mode: "standard" | "yardsale";
  customer: Customer | null;
  contactId: string | null;
  walkInName: string;
  method: "delivery" | "pickup";
  drafts: DeliveryDraft[];
  cart: CartLine[];
  settleMethod: string | null;
  poNumber: string;
  orderNotes: string;
  deliveryNotes: string;
  adjustmentType: "percent" | "amount" | null;
  adjustmentValue: number | null;
  fuelSurcharge: number;
}

export async function createOrder(input: CreateOrderInput): Promise<Order | null> {
  const s = S();
  const isSplit = input.mode === "standard" && input.drafts.length > 1;
  const payment_type = input.customer ? derivePaymentType(input.customer) : "prepaid";

  const { data: numData, error: numError } = await supabase.rpc("next_order_number");
  if (numError) {
    S().toast({ tone: "danger", title: "Could not create the order", description: numError.message });
    return null;
  }
  const baseNumber = numData as string;

  const priceFor = (productId: string) =>
    unitPrice(s.products.find((p) => p.id === productId), s.specials, () => null);

  const rows: Partial<Order>[] = [];
  const itemRows: { order_id: string; product_id: string; qty: number; unit_price: number }[] = [];

  const common = {
    customer_id: input.customer?.id || null,
    contact_id: input.contactId,
    walk_in_name: input.walkInName || null,
    method: input.method,
    payment_type,
    payment_method: (input.settleMethod as Order["payment_method"]) || null,
    payment_status: (input.mode === "yardsale" ? "paid" : payment_type === "prepaid" ? "pending" : "invoiced") as Order["payment_status"],
    po_number: input.poNumber || null,
    order_notes: input.orderNotes || null,
    delivery_notes: input.deliveryNotes || null,
    adjustment_type: input.adjustmentType,
    adjustment_value: input.adjustmentValue,
    fuel_surcharge: input.method === "delivery" ? input.fuelSurcharge : 0,
    placed_at: new Date().toISOString(),
    created_by: s.user?.id || null,
  };

  let masterId: string | null = null;

  if (isSplit) {
    masterId = uuid();
    const a = input.drafts[0];
    rows.push({
      id: masterId,
      order_number: baseNumber,
      kind: "master",
      status: "requested",
      street: a.street,
      suburb_id: a.suburbId,
      delivery_fee: a.fee,
      fee_source: a.feeSource,
      delivery_date: a.dateIso,
      delivery_window: a.window,
      overrides: {},
      ...common,
    } as Partial<Order>);
    input.drafts.forEach((d, i) => {
      const id = uuid();
      const overrides: Record<string, boolean> = {};
      if (i > 0) {
        if (d.street !== a.street || d.suburbId !== a.suburbId) overrides.address = true;
        if (d.dateIso !== a.dateIso || d.window !== a.window) overrides.schedule = true;
      }
      rows.push({
        id,
        order_number: baseNumber + "-" + d.letter,
        kind: "split",
        parent_order_id: masterId,
        status: "requested",
        street: d.street,
        suburb_id: d.suburbId,
        delivery_fee: d.fee,
        fee_source: d.feeSource,
        delivery_date: d.dateIso,
        delivery_window: d.window,
        truck_id: d.truckId,
        overrides,
        ...common,
      } as Partial<Order>);
      input.cart
        .filter((l) => l.to === d.letter)
        .forEach((l) => itemRows.push({ order_id: id, product_id: l.productId, qty: l.qty, unit_price: priceFor(l.productId) }));
    });
  } else {
    const id = uuid();
    const d = input.drafts[0];
    rows.push({
      id,
      order_number: baseNumber,
      kind: input.mode === "yardsale" ? "yard_sale" : "standard",
      status: input.mode === "yardsale" ? "ready_for_pickup" : "requested",
      street: input.method === "delivery" ? d.street : "Yard collection",
      suburb_id: input.method === "delivery" ? d.suburbId : null,
      delivery_fee: input.method === "delivery" ? d.fee : 0,
      fee_source: d.feeSource,
      delivery_date: d.dateIso,
      delivery_window: d.window,
      truck_id: input.method === "delivery" ? d.truckId : null,
      overrides: {},
      ...common,
    } as Partial<Order>);
    input.cart.forEach((l) =>
      itemRows.push({ order_id: id, product_id: l.productId, qty: l.qty, unit_price: priceFor(l.productId) })
    );
  }

  const { data: inserted, error } = await supabase.from("orders").insert(rows as any).select("*");
  if (error) {
    S().toast({ tone: "danger", title: "Could not create the order", description: error.message + " Your order details are kept — fix the issue and click Create again." });
    return null;
  }
  const { data: insertedItems, error: itemsError } = await supabase
    .from("order_items")
    .insert(itemRows)
    .select("*");
  if (itemsError) {
    S().toast({ tone: "danger", title: "Order saved, items failed", description: itemsError.message });
  }

  const newOrders = (inserted || []) as Order[];
  const byOrder: Record<string, OrderItem[]> = {};
  ((insertedItems || []) as OrderItem[]).forEach((i) => {
    (byOrder[i.order_id] = byOrder[i.order_id] || []).push(i);
  });
  set((st) => ({
    orders: [...st.orders, ...newOrders],
    orderItems: { ...st.orderItems, ...byOrder },
  }));
  logActivity("order", newOrders[0]?.id || null, "created:" + baseNumber);
  /* A yard sale is finished the moment it is rung up — it never passes through
     a status change, so auto-push has to be offered its one chance here. */
  if (input.mode === "yardsale") newOrders.forEach((o) => void autoPushToMyob(o.id));
  return newOrders.find((o) => o.kind !== "split") || newOrders[0] || null;
}

export function markProcessed(id: string) {
  const now = new Date().toISOString();
  patchOrder(id, { processed_at: now, processed_by: S().user?.id || null } as Partial<Order>);
}

/* Print receipt: open the browser's print dialogue on the tax invoice, the same
   one Ctrl+P shows, and record that the order has been printed. */
export type PrintMode = "separate" | "combined";

export function splitsOf(masterId: string) {
  return S()
    .orders.filter((o) => o.parent_order_id === masterId && !o.deleted_at)
    .sort((a, b) => a.order_number.localeCompare(b.order_number));
}

export function printReceipt(id: string, mode: PrintMode = "separate") {
  const s = S();
  const order = s.orders.find((o) => o.id === id);
  if (!order) return;

  /* A master carries no line items of its own — every product sits on one of
     its splits (§5.2). Printing the master therefore means printing its
     deliveries, or the whole job comes out blank. */
  const splits = order.kind === "master" ? splitsOf(order.id) : [];
  const common = {
    products: s.products,
    suburbs: s.suburbs,
    customer: s.customers.find((c) => c.id === order.customer_id),
    business: s.business,
    paySettings: s.paySettings,
  };

  let sheets: string[];
  if (splits.length && mode === "combined") {
    /* One invoice for the lot: every delivery listed under its own heading,
       one total at the foot, one signature. */
    sheets = [
      invoiceSheet({
        ...common,
        order,
        items: [],
        groups: splits.map((o) => ({ order: o, items: s.orderItems[o.id] || [] })),
      }),
    ];
  } else {
    const targets = splits.length ? splits : [order];
    sheets = targets.map((o, i) =>
      invoiceSheet({
        ...common,
        order: o,
        items: s.orderItems[o.id] || [],
        customer: s.customers.find((c) => c.id === o.customer_id),
        /* One sheet in someone's hand should say there are others. */
        numberLabel: splits.length ? `${o.order_number} — delivery ${i + 1} of ${splits.length}` : undefined,
      })
    );
  }

  printDocument(invoiceDocument(invoiceTitle(order), sheets));
  (splits.length ? splits : [order]).forEach((o) => markProcessed(o.id));
  if (splits.length) markProcessed(order.id);
}

/* ---------- statements ---------- */

const monthEnd = (start: Date) => new Date(start.getFullYear(), start.getMonth() + 1, 0);
const isoOf = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

export const monthLabel = (iso: string) =>
  new Date(iso + "T00:00:00").toLocaleDateString("en-AU", { month: "long", year: "numeric" });

/* The last 12 months, newest first, keyed by the first of the month. */
export function statementMonths(): { value: string; label: string }[] {
  const now = new Date();
  return Array.from({ length: 12 }, (_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const iso = isoOf(d);
    return { value: iso, label: monthLabel(iso) };
  });
}

/* An order's date for statement purposes: when the goods moved, falling back to
   when it was booked. */
const orderDate = (o: Order) => o.delivery_date || o.placed_at.slice(0, 10);

/* Ageing runs on every unpaid order on the account, not just this period's —
   that is what makes the summary an account summary rather than a repeat of the
   ledger above it. */
function ageingFor(customerId: string, asAtIso: string): StatementAgeing {
  const s = S();
  const asAt = new Date(asAtIso + "T00:00:00").getTime();
  const buckets = { current: 0, over30: 0, over60: 0, over90: 0, total: 0 };
  s.orders
    .filter(
      (o) =>
        o.customer_id === customerId &&
        !o.deleted_at &&
        o.kind !== "master" &&
        o.status !== "cancelled" &&
        o.payment_status !== "paid"
    )
    .forEach((o) => {
      const amount = orderTotal(o, s.orderItems[o.id] || [], s.suburbs, s.paySettings);
      if (amount <= 0) return;
      const days = Math.floor((asAt - new Date(orderDate(o) + "T00:00:00").getTime()) / 86400000);
      if (days > 90) buckets.over90 += amount;
      else if (days > 60) buckets.over60 += amount;
      else if (days > 30) buckets.over30 += amount;
      else buckets.current += amount;
      buckets.total += amount;
    });
  const round = (n: number) => Math.round(n * 100) / 100;
  return {
    current: round(buckets.current),
    over30: round(buckets.over30),
    over60: round(buckets.over60),
    over90: round(buckets.over90),
    total: round(buckets.total),
  };
}

export function statementLines(customerId: string, startIso: string, endIso: string, scope: "all" | "delivered") {
  const s = S();
  const suburbName = (id: string | null) => s.suburbs.find((x) => x.id === id)?.name || "";
  const inPeriod = (iso: string) => iso >= startIso && iso <= endIso;

  const charges: StatementLine[] = s.orders
    .filter(
      (o) =>
        o.customer_id === customerId &&
        !o.deleted_at &&
        o.kind !== "master" &&
        o.status !== "cancelled" &&
        (scope === "all" || o.status === "delivered") &&
        inPeriod(orderDate(o))
    )
    .map((o) => ({
      dateIso: orderDate(o),
      ref: o.order_number,
      charge: orderTotal(o, s.orderItems[o.id] || [], s.suburbs, s.paySettings),
      payment: 0,
      address:
        o.method === "delivery"
          ? [o.street, suburbName(o.suburb_id)].filter(Boolean).join(", ") || null
          : "Yard collection",
    }));

  const received: StatementLine[] = s.payments
    .filter((p) => p.customer_id === customerId && p.status === "paid" && p.paid_at && inPeriod(p.paid_at.slice(0, 10)))
    .map((p) => ({
      dateIso: (p.paid_at as string).slice(0, 10),
      ref: p.reference || s.orders.find((o) => o.id === p.order_id)?.order_number || "Payment",
      charge: 0,
      payment: Number(p.amount) || 0,
      address: null,
    }));

  return [...charges, ...received].sort((a, b) => a.dateIso.localeCompare(b.dateIso) || a.ref.localeCompare(b.ref));
}

/* Print the account statement for one month. Nothing is recorded — printing a
   statement to look at it should not litter the customer's history. */
export function printStatement(customerId: string, startIso: string, scope: "all" | "delivered" = "all") {
  const s = S();
  const customer = s.customers.find((c) => c.id === customerId);
  if (!customer) return;
  const start = new Date(startIso + "T00:00:00");
  const endIso = isoOf(monthEnd(start));
  const today = isoOf(new Date());

  const suburb = s.suburbs.find((x) => x.id === customer.billing_suburb_id);
  printDocument(
    statementHtml({
      customer,
      customerAddress: [customer.billing_street, suburb?.name].filter(Boolean).join(", "),
      business: s.business,
      periodLabel: monthLabel(startIso),
      generatedIso: today,
      lines: statementLines(customerId, startIso, endIso, scope),
      /* As at today, not the period end: the office posts these now and wants
         to know what is owed now. */
      ageing: ageingFor(customerId, today),
    })
  );
}

/* ---------- customers ---------- */

export function patchCustomer(id: string, patch: Partial<Customer>) {
  set((s) => ({ customers: s.customers.map((c) => (c.id === id ? { ...c, ...patch } : c)) }));
  const { contacts, sites, ...row } = patch as any;
  if (Object.keys(row).length) persist(supabase.from("customers").update(row).eq("id", id), "the customer");
}

export function addContact(customerId: string, c: Omit<CustomerContact, "id" | "customer_id">): CustomerContact {
  const row: CustomerContact = { id: uuid(), customer_id: customerId, ...c };
  set((s) => ({
    customers: s.customers.map((x) => (x.id === customerId ? { ...x, contacts: [...x.contacts, row] } : x)),
  }));
  persist(supabase.from("customer_contacts").insert(row), "the contact");
  return row;
}

export function removeContact(customerId: string, contactId: string) {
  set((s) => ({
    customers: s.customers.map((x) =>
      x.id === customerId ? { ...x, contacts: x.contacts.filter((ct) => ct.id !== contactId) } : x
    ),
  }));
  persist(supabase.from("customer_contacts").delete().eq("id", contactId), "the contact");
}

export function addSite(customerId: string, site: Omit<CustomerSite, "id" | "customer_id">) {
  const row: CustomerSite = { id: uuid(), customer_id: customerId, ...site };
  set((s) => ({
    customers: s.customers.map((x) => (x.id === customerId ? { ...x, sites: [...x.sites, row] } : x)),
  }));
  persist(supabase.from("customer_sites").insert(row), "the site");
}

export function genPin(): string {
  const used = new Set(
    S()
      .customers.map((c) => c.portal_pin)
      .concat(S().team.map((t) => t.pin))
      .filter(Boolean) as string[]
  );
  let pin = "";
  do {
    pin = String(Math.floor(1000 + Math.random() * 9000));
  } while (used.has(pin));
  return pin;
}

export interface NewCustomerInput {
  kind: Customer["entity"];
  name: string;
  abn: string;
  contact: string;
  phone: string;
  email: string;
  tier: Customer["tier"];
  billing: "Prepaid" | "Account";
  termsDays: number;
  limit: number;
  street: string;
  suburbId: string | null;
}

export async function createCustomer(input: NewCustomerInput): Promise<Customer | null> {
  const s = S();
  const acct = String(
    Math.max(10800, ...s.customers.map((c) => Number(c.account_number) || 0)) + 7
  );
  const id = uuid();
  const row = {
    id,
    account_number: acct,
    name: input.name,
    entity: input.kind,
    abn: input.abn || null,
    tier: input.tier,
    billing: input.billing === "Account" ? "account" : "prepaid",
    terms_days: input.billing === "Account" ? input.termsDays : null,
    credit_limit: input.billing === "Account" ? input.limit : 0,
    billing_street: input.street || null,
    billing_suburb_id: input.suburbId,
  };
  const { data, error } = await supabase.from("customers").insert(row).select("*").single();
  if (error) {
    s.toast({ tone: "danger", title: "Could not add the customer", description: error.message });
    return null;
  }
  const person = (input.kind === "Company" ? input.contact : input.name) || input.name;
  const contact: CustomerContact = {
    id: uuid(),
    customer_id: id,
    name: person,
    phone: input.phone || null,
    email: input.email || null,
    roles: ["Orders"],
  };
  persist(supabase.from("customer_contacts").insert(contact), "the contact");
  const sites: CustomerSite[] = [];
  if (input.street && input.suburbId) {
    const site: CustomerSite = {
      id: uuid(),
      customer_id: id,
      label: "Main",
      street: input.street,
      suburb_id: input.suburbId,
      is_default: true,
    };
    sites.push(site);
    persist(supabase.from("customer_sites").insert(site), "the site");
  }
  const cust: Customer = { ...(data as Customer), contacts: [contact], sites };
  set((st) => ({ customers: [...st.customers, cust] }));
  return cust;
}

/* ---------- catalogue ---------- */

export function patchProduct(id: string, patch: Partial<Product>) {
  set((s) => ({ products: s.products.map((p) => (p.id === id ? { ...p, ...patch } : p)) }));
  const { variants, ...row } = patch as any;
  if (Object.keys(row).length) persist(supabase.from("products").update(row).eq("id", id), "the product");
}

export async function upsertProduct(row: Partial<Product> & { id?: string }, variants: { name: string; sku: string; price: number; stock: number }[]) {
  const s = S();
  const id = row.id || uuid();
  const dbRow = { ...row, id, variants: undefined } as any;
  delete dbRow.variants;
  const { data, error } = await supabase.from("products").upsert(dbRow).select("*").single();
  if (error) {
    s.toast({ tone: "danger", title: "Could not save the product", description: error.message });
    return;
  }
  await supabase.from("product_variants").delete().eq("product_id", id);
  let vrows: Product["variants"] = [];
  if (variants.length) {
    const { data: vdata } = await supabase
      .from("product_variants")
      .insert(variants.map((v) => ({ ...v, product_id: id })))
      .select("*");
    vrows = (vdata || []) as Product["variants"];
  }
  const next = { ...(data as Product), variants: vrows };
  set((st) => ({
    products: st.products.some((p) => p.id === id)
      ? st.products.map((p) => (p.id === id ? next : p))
      : [...st.products, next],
  }));
}

export function deleteProduct(id: string) {
  set((s) => ({ products: s.products.filter((p) => p.id !== id) }));
  persist(supabase.from("products").delete().eq("id", id), "the product");
}

export async function addCategory(name: string) {
  const s = S();
  const { data, error } = await supabase
    .from("product_categories")
    .insert({ name, sort_order: s.categories.length + 1 })
    .select("*")
    .single();
  if (error) return s.toast({ tone: "danger", title: "Could not add the category", description: error.message });
  set((st) => ({ categories: [...st.categories, data as any] }));
}

export function renameCategory(id: string, name: string) {
  set((s) => ({ categories: s.categories.map((c) => (c.id === id ? { ...c, name } : c)) }));
  persist(supabase.from("product_categories").update({ name }).eq("id", id), "the category");
}

export function removeCategory(id: string) {
  set((s) => ({ categories: s.categories.filter((c) => c.id !== id) }));
  persist(supabase.from("product_categories").delete().eq("id", id), "the category");
}

export async function createSpecial(input: Omit<Special, "id" | "product_ids"> & { product_ids: string[] }) {
  const s = S();
  const id = uuid();
  const { product_ids, ...row } = input;
  const { error } = await supabase.from("specials").insert({ ...row, id });
  if (error) return s.toast({ tone: "danger", title: "Could not create the special", description: error.message });
  if (product_ids.length)
    persist(
      supabase.from("special_products").insert(product_ids.map((pid) => ({ special_id: id, product_id: pid }))),
      "the special's products"
    );
  set((st) => ({ specials: [...st.specials, { ...row, id, product_ids }] }));
}

export function toggleSpecial(id: string, active: boolean) {
  set((s) => ({ specials: s.specials.map((x) => (x.id === id ? { ...x, active } : x)) }));
  persist(supabase.from("specials").update({ active }).eq("id", id), "the special");
}

export function removeSpecial(id: string) {
  set((s) => ({ specials: s.specials.filter((x) => x.id !== id) }));
  persist(supabase.from("specials").delete().eq("id", id), "the special");
}

/* ---------- fleet / team / suburbs ---------- */

export function patchTruck(id: string, patch: Partial<Truck>) {
  set((s) => ({ trucks: s.trucks.map((t) => (t.id === id ? { ...t, ...patch } : t)) }));
  persist(supabase.from("trucks").update(patch).eq("id", id), "the truck");
}

export async function upsertTruck(row: Partial<Truck> & { id?: string }) {
  const s = S();
  const id = row.id || uuid();
  const { data, error } = await supabase.from("trucks").upsert({ ...row, id }).select("*").single();
  if (error) return void s.toast({ tone: "danger", title: "Could not save the truck", description: error.message });
  set((st) => ({
    trucks: st.trucks.some((t) => t.id === id)
      ? st.trucks.map((t) => (t.id === id ? (data as Truck) : t))
      : [...st.trucks, data as Truck],
  }));
}

export function removeTruck(id: string) {
  set((s) => ({ trucks: s.trucks.filter((t) => t.id !== id) }));
  persist(supabase.from("trucks").delete().eq("id", id), "the truck");
}

export function patchTeamMember(id: string, patch: Partial<TeamMember>) {
  set((s) => ({ team: s.team.map((t) => (t.id === id ? { ...t, ...patch } : t)) }));
  persist(supabase.from("team_members").update(patch).eq("id", id), "the team member");
}

export async function addTeamMember(row: { name: string; role: TeamMember["role"]; email: string | null; phone: string | null }) {
  const s = S();
  const { data, error } = await supabase.from("team_members").insert(row).select("*").single();
  if (error) return void s.toast({ tone: "danger", title: "Could not add them", description: error.message });
  set((st) => ({ team: [...st.team, data as TeamMember] }));
}

export function removeTeamMember(id: string) {
  set((s) => ({ team: s.team.filter((t) => t.id !== id) }));
  persist(supabase.from("team_members").delete().eq("id", id), "the team member");
}

export function patchSuburb(id: string, patch: Partial<Suburb>) {
  set((s) => ({ suburbs: s.suburbs.map((x) => (x.id === id ? { ...x, ...patch } : x)) }));
  persist(supabase.from("suburbs").update(patch).eq("id", id), "the suburb");
}

export async function addSuburb(row: { name: string; postcode: string; state: string; delivery_fee: number | null }) {
  const s = S();
  const { data, error } = await supabase.from("suburbs").insert(row).select("*").single();
  if (error) return void s.toast({ tone: "danger", title: "Could not add the suburb", description: error.message });
  set((st) => ({ suburbs: [...st.suburbs, data as Suburb].sort((a, b) => a.name.localeCompare(b.name)) }));
}

/* Everything that still points at a suburb. Orders in any state count, not
   just open ones: a delivered order keeps its suburb so the delivery fee on
   its invoice can still be explained, and the database will refuse to drop a
   row underneath it. */
export function suburbReferences(id: string): { orders: number; customers: number; sites: number; total: number } {
  const s = S();
  const orders = s.orders.filter((o) => o.suburb_id === id).length;
  const customers = s.customers.filter((c) => c.billing_suburb_id === id).length;
  const sites = s.customers.reduce((t, c) => t + (c.sites || []).filter((x) => x.suburb_id === id).length, 0);
  return { orders, customers, sites, total: orders + customers + sites };
}

export async function removeSuburb(id: string) {
  const s = S();
  const before = s.suburbs;
  set(() => ({ suburbs: before.filter((x) => x.id !== id) }));
  const { error } = await supabase.from("suburbs").delete().eq("id", id);
  if (!error) return true;
  /* Put it back rather than leaving the screen claiming a deletion that the
     database rejected. */
  set(() => ({ suburbs: before }));
  const refs = suburbReferences(id);
  s.toast({
    tone: "danger",
    title: "That suburb is still in use",
    description: refs.total
      ? `${[refs.orders && `${refs.orders} orders`, refs.customers && `${refs.customers} customers`, refs.sites && `${refs.sites} delivery sites`]
          .filter(Boolean)
          .join(", ")} still point at it. Switch it off instead — it stops being offered on new orders and the history stays readable.`
      : error.message,
  });
  return false;
}

/* ---------- settings ---------- */

export function patchBusiness(patch: Record<string, unknown>) {
  set((s) => ({ business: s.business ? { ...s.business, ...patch } : (patch as any) }));
  persist(supabase.from("business_settings").update(patch).eq("id", true), "business settings");
}

export function patchPaySettings(patch: Record<string, unknown>) {
  set((s) => ({ paySettings: s.paySettings ? { ...s.paySettings, ...patch } : (patch as any) }));
  persist(supabase.from("payment_settings").update(patch).eq("id", true), "payment settings");
}

export function patchIntegration(key: string, patch: Record<string, unknown>) {
  set((s) => ({
    integrations: s.integrations.map((i) => (i.key === key ? { ...i, ...patch } : i)),
  }));
  persist(supabase.from("integration_settings").update(patch).eq("key", key), "the integration");
}

export function patchEmailSetting(key: string, enabled: boolean) {
  set((s) => ({ emails: s.emails.map((e) => (e.key === key ? { ...e, enabled } : e)) }));
  persist(supabase.from("email_settings").update({ enabled }).eq("key", key), "email settings");
}

/* ---------- statements / activity ---------- */

/* startIso is the first of the chosen month — the office picks which month
   rather than being limited to this one and last. */
export async function generateStatement(customer: Customer, startIso: string, scope: "all" | "delivered") {
  const start = new Date(startIso + "T00:00:00");
  const end = monthEnd(start);
  const endIso = isoOf(end);
  const lines = statementLines(customer.id, startIso, endIso, scope);
  const amount = Math.round(lines.reduce((t, l) => t + l.charge - l.payment, 0) * 100) / 100;
  const ref = `STM-${customer.account_number}-${String(start.getMonth() + 1).padStart(2, "0")}`;
  const row = {
    customer_id: customer.id,
    ref,
    period_start: startIso,
    period_end: endIso,
    scope,
    status: "pending",
    /* What the month actually came to, not the customer's running balance —
       the printed statement and the recorded row have to agree. */
    amount,
  };
  const { data, error } = await supabase.from("statements").insert(row).select("*").single();
  if (error)
    return void S().toast({ tone: "danger", title: "Could not generate the statement", description: error.message });
  set((s) => ({ statements: [data as any, ...s.statements] }));
  S().toast({ tone: "success", title: "Statement generated", description: `${ref} — sent to the accounts contact.` });
}

export function logActivity(entityType: string, entityId: string | null, action: string) {
  void supabase.from("activity_logs").insert({
    entity_type: entityType,
    entity_id: entityId,
    action,
    actor_id: S().user?.id || null,
  });
}

/* Fee helper shared by the new-order screen. */
export const draftFee = (d: DeliveryDraft, suburbs: Suburb[]) =>
  feeOf({ fee_source: d.feeSource, delivery_fee: d.fee, suburb_id: d.suburbId }, suburbs);
