/* The printed quotation.

   Same sheet as the tax invoice — the letterhead, the meta block, the goods
   table and the totals stack sit where customers already know them — headed
   "Quotation" with the number, the date and how long it stands. Nothing about
   payment on it: a quote is an offer, not a bill. The foot carries the terms
   from Settings instead of the driver disclaimer and signature line. */

import { AUD, dmy } from "../lib/domain";
import type { BusinessSettings, Customer, PaymentSettings, Product, Quote, QuoteDelivery, QuoteItem, Suburb } from "../lib/types";
import { PALM_LOGO_PNG } from "./logo";
import { invoiceDocument } from "./invoice";

const WEEKDAY = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

const esc = (v: unknown): string =>
  String(v ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");

const qty = (n: number) => String(Math.round(Number(n) * 1000) / 1000);

export interface QuoteSheetInput {
  quote: Quote;
  items: QuoteItem[];
  products: Product[];
  suburbs: Suburb[];
  customer: Customer | null | undefined;
  business: BusinessSettings | null;
  paySettings: PaymentSettings | null;
}

export function quoteTitle(q: Quote): string {
  return `Quotation - ${q.quote_number}${q.revision > 1 ? ` rev ${q.revision}` : ""}`;
}

/* The arithmetic of a quote, from its locked lines and fees. */
export function quoteBreakdown(q: Quote, items: QuoteItem[]) {
  const goods = Math.round(items.reduce((t, i) => t + Number(i.line_total), 0) * 100) / 100;
  const adjust =
    q.adjustment_type === "percent"
      ? Math.round(goods * Number(q.adjustment_value || 0)) / 100
      : q.adjustment_type === "amount"
        ? Number(q.adjustment_value || 0)
        : 0;
  const subtotal = Math.round((goods + adjust) * 100) / 100;
  const delivery = q.method === "delivery" ? Math.round((q.deliveries || []).reduce((t, d) => t + (Number(d.fee) || 0), 0) * 100) / 100 : 0;
  const fuel = q.method === "delivery" ? Number(q.fuel_surcharge) || 0 : 0;
  const total = Math.round((subtotal + delivery + fuel) * 100) / 100;
  return { goods, adjust, subtotal, delivery, fuel, total };
}

export function quoteHtml(input: QuoteSheetInput): string {
  return invoiceDocument(quoteTitle(input.quote), [quoteSheet(input)]);
}

export function quoteSheet(input: QuoteSheetInput): string {
  const { quote: q, items, products, suburbs, customer, business, paySettings } = input;
  const deliveries: QuoteDelivery[] = q.method === "delivery" ? q.deliveries || [] : [];
  const multi = deliveries.length > 1;
  const contact = customer?.contacts?.find((c) => c.id === q.contact_id) || customer?.contacts?.[0];

  const { goods, adjust, subtotal, delivery, fuel, total } = quoteBreakdown(q, items);
  const gstOn = paySettings ? paySettings.gst_on : true;
  const gstRate = Number(paySettings?.gst_rate) || 10;
  const gst = gstOn ? Math.round((total - total / (1 + gstRate / 100)) * 100) / 100 : 0;

  const addressOf = (d: QuoteDelivery): string => {
    const sb = suburbs.find((x) => x.id === d.suburbId);
    const parts = [d.street, [sb?.name, sb?.state, sb?.postcode].filter(Boolean).join(" ")].filter(Boolean);
    return parts.length ? parts.join(", ") + ", Australia" : "To be confirmed";
  };
  const scheduleText = (d: QuoteDelivery): string => {
    if (!d.dateIso) return "To be confirmed";
    const dt = new Date(d.dateIso + "T00:00:00");
    const day = isNaN(dt.getTime()) ? "" : " " + WEEKDAY[dt.getDay()];
    const w = d.window || "";
    if (!w) return dmy(d.dateIso) + day;
    const loose = w === "ASAP" || w === "Within the hour";
    return dmy(d.dateIso) + day + (loose ? " — " + w : " at " + w);
  };

  const itemRow = (it: QuoteItem) => {
    const p = products.find((x) => x.id === it.product_id);
    const name = [p?.name || it.description || "Item", p?.unit].filter(Boolean).join(" ");
    return `<tr>
        <td class="prod">${esc(name)}</td>
        <td class="qty">${esc(qty(Number(it.qty)))}</td>
        <td class="unit">${esc(AUD(Number(it.unit_price)))}</td>
        <td class="price">${esc(AUD(Number(it.line_total)))}</td>
      </tr>`;
  };

  const rows = multi
    ? deliveries
        .map((d) => {
          const own = items.filter((i) => i.delivery_letter === d.letter).map(itemRow).join("");
          const sb = suburbs.find((x) => x.id === d.suburbId);
          const where = [d.street, sb?.name].filter(Boolean).join(", ") || "address to be confirmed";
          return `<tr class="group"><td colspan="4">Delivery ${esc(d.letter)} — ${esc(where)} · ${esc(scheduleText(d))}</td></tr>${own}`;
        })
        .join("")
    : items.map(itemRow).join("");

  const deliveryWhere = [...new Set(deliveries.map((d) => suburbs.find((x) => x.id === d.suburbId)?.name).filter(Boolean) as string[])].join(", ");

  const totalRow = (label: string, value: string, cls = "") =>
    `<tr class="${cls}"><th>${esc(label)}</th><td>${esc(value)}</td></tr>`;
  const meta = (label: string, value: string, strong = false) =>
    `<tr><th>${esc(label)}</th><td colspan="3">${strong ? `<strong>${esc(value)}</strong>` : esc(value)}</td></tr>`;

  const number = q.quote_number + (q.revision > 1 ? ` (revision ${q.revision})` : "");

  return `<section class="sheet">
    <header>
      <img src="${PALM_LOGO_PNG}" alt="">
      <div>
        <h1>${esc(business?.name || "")}</h1>
        ${business?.address ? `<p>${esc(business.address)}</p>` : ""}
        ${business?.phone ? `<p>Ph: ${esc(business.phone)}</p>` : ""}
        ${business?.email ? `<p>E: ${esc(business.email)}</p>` : ""}
        ${business?.abn ? `<p>ABN: ${esc(business.abn)}</p>` : ""}
      </div>
    </header>
    <hr class="heavy">

    <table class="meta">
      <tr>
        <th>Quotation No:</th>
        <td>${esc(number)}</td>
        <th class="right">Date:</th>
        <td>${esc(dmy(q.created_at.slice(0, 10)))}</td>
      </tr>
      ${meta("Valid until:", dmy(q.valid_until), true)}
      ${contact?.name ? meta("Contact Name:", contact.name) : ""}
      ${contact?.phone ? meta("Contact Phone:", contact.phone, true) : ""}
      ${meta("Business Name:", customer?.name || "")}
      ${
        q.method !== "delivery"
          ? meta("Collection:", "Pickup — collected from the yard", true)
          : multi
            ? deliveries.map((d) => meta(`Delivery ${d.letter}:`, `${addressOf(d)} — ${scheduleText(d)}`, true)).join("")
            : meta("Delivery Address:", deliveries[0] ? addressOf(deliveries[0]) : "To be confirmed", true) +
              meta("Proposed Date & Time:", deliveries[0] ? scheduleText(deliveries[0]) : "To be confirmed", true)
      }
      ${q.po_number ? meta("P/O No:", q.po_number) : ""}
    </table>

    <table class="goods">
      <thead><tr>
        <th class="prod">Product</th><th class="qty">Qty</th><th class="unit">Unit</th><th class="price">Price</th>
      </tr></thead>
      <tbody>${rows}</tbody>
    </table>

    <table class="totals">
      ${adjust ? totalRow("Goods", AUD(goods)) : ""}
      ${adjust ? totalRow("Price Adjustment", (adjust < 0 ? "−" : "+") + AUD(Math.abs(adjust))) : ""}
      ${totalRow("Subtotal", AUD(subtotal))}
      ${delivery ? totalRow(`Delivery${deliveryWhere ? ` (${deliveryWhere})` : ""}`, AUD(delivery)) : ""}
      ${fuel ? totalRow("Fuel Surcharge", AUD(fuel)) : ""}
      ${gstOn ? totalRow(`${esc(paySettings?.gst_label || "GST")} included`, AUD(gst), "gst") : ""}
      ${totalRow("Quoted Total", AUD(total), "grand")}
    </table>

    <div class="notes">
      <section>
        <h2>DELIVERY NOTES:</h2>
        <p>${esc(q.delivery_notes || "")}</p>
      </section>
      <section>
        <h2>NOTES:</h2>
        <p>${esc(q.order_notes || "")}</p>
      </section>
    </div>

    <footer>
      <p class="fine">${esc(business?.quote_terms || "Prices are valid until the date shown.")}</p>
      <p class="fine">This is a quotation, not a tax invoice. No goods are reserved and no delivery is booked until the quote is taken as an order.</p>
    </footer>
  </section>`;
}
