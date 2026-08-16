/* The printed tax invoice.

   This is a rebuild of the document SHGS already sends out, measured off one of
   their own PDFs: 180mm of content on A4, the palm at the top left, a 2pt rule
   under the letterhead, the meta block on a 180px label column, the goods table
   with Qty centred and Unit/Price right-aligned, the totals stack starting at
   431px, and the driver disclaimer with the signature line pinned to the foot of
   the page. Customers recognise this layout, so it is reproduced rather than
   reinterpreted.

   It renders into a hidden iframe and calls print() on it, which is the same
   dialogue Ctrl+P opens — the office picks the printer, or "Save as PDF", and
   the file is named from the document title. Doing it in an iframe rather than
   with @media print rules on the app means the app's own stylesheet, dark
   theme and layout can never leak into the page that comes out. */

import { AUD, adjustmentOf, dmy, feeOf, goodsOf, type DeliveryPricing } from "../lib/domain";
import type { BusinessSettings, Customer, Order, OrderItem, PaymentSettings, Product, Suburb } from "../lib/types";
import { PALM_LOGO_PNG } from "./logo";

const WEEKDAY = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

const esc = (v: unknown): string =>
  String(v ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");

/* Their quantities read "2", "1.5", not "2.00". */
const qty = (n: number) => String(Math.round(Number(n) * 1000) / 1000);

const scheduleText = (o: Order): string => {
  if (!o.delivery_date) return "Not scheduled";
  const d = new Date(o.delivery_date + "T00:00:00");
  const day = isNaN(d.getTime()) ? "" : " " + WEEKDAY[d.getDay()];
  const w = o.delivery_window || "";
  if (!w) return dmy(o.delivery_date) + day;
  const loose = w === "ASAP" || w === "Within the hour";
  return dmy(o.delivery_date) + day + (loose ? " — " + w : " at " + w);
};

export interface InvoiceInput {
  order: Order;
  items: OrderItem[];
  products: Product[];
  suburbs: Suburb[];
  customer: Customer | null | undefined;
  business: BusinessSettings | null;
  paySettings: PaymentSettings | null;
  /* Printed in place of the order number. A split order being previewed before
     it exists has no number to show, and inventing one would be worse than
     saying so. */
  numberLabel?: string;
}

export function invoiceTitle(order: Order): string {
  return `Tax Invoice - ${order.order_number}`;
}

/* One invoice per delivery. A split order prints a page each, because each
   delivery goes to its own address on its own day and gets signed for
   separately. */
export function invoiceDocument(title: string, sheets: string[]): string {
  return `<!doctype html>
<html lang="en-AU"><head><meta charset="utf-8">
<title>${esc(title)}</title>
<style>${STYLE}</style></head>
<body>${sheets.join("\n")}</body></html>`;
}

export function invoiceHtml(input: InvoiceInput): string {
  return invoiceDocument(invoiceTitle(input.order), [invoiceSheet(input)]);
}

export function invoiceSheet(input: InvoiceInput): string {
  const { order, items, products, suburbs, customer, business, paySettings } = input;

  const suburb = suburbs.find((s) => s.id === order.suburb_id);
  const contact = customer?.contacts?.find((c) => c.id === order.contact_id) || customer?.contacts?.[0];
  const isDelivery = order.method === "delivery";

  const goods = goodsOf(items);
  const adjust = adjustmentOf(order, goods);
  const delivery = isDelivery ? feeOf(order, suburbs, paySettings as DeliveryPricing | null) : 0;
  const fuel = isDelivery ? Number(order.fuel_surcharge) || 0 : 0;
  const saleTotal = Math.round((goods + adjust + delivery + fuel) * 100) / 100;

  /* The card surcharge is a settlement cost, so it only lands on an invoice the
     customer is settling by card. Every other order prints the configured rate
     against $0.00 — which is what their own invoices do. */
  const cardRate = Number(paySettings?.card_surcharge) || 0;
  const paysByCard = order.payment_method === "card" || order.payment_method === "card_on_file";
  const surcharge = paysByCard ? Math.round(saleTotal * cardRate) / 100 : 0;

  const total = Math.round((saleTotal + surcharge) * 100) / 100;
  const gstOn = paySettings ? paySettings.gst_on : true;
  const gstRate = Number(paySettings?.gst_rate) || 10;
  const gst = gstOn ? Math.round((total - total / (1 + gstRate / 100)) * 100) / 100 : 0;

  const addressParts = [
    order.street,
    [suburb?.name, suburb?.state, suburb?.postcode].filter(Boolean).join(" "),
  ].filter(Boolean);
  const addressLine = !isDelivery
    ? "Pickup — collected from the yard"
    : /* An unaddressed preview should read as unaddressed, not as a lone
         ", Australia" that looks like a rendering fault. */
      addressParts.length
      ? addressParts.join(", ") + ", Australia"
      : "Not set";

  const rows = items
    .map((it) => {
      const p = products.find((x) => x.id === it.product_id);
      const name = [p?.name || it.description || "Item", p?.unit].filter(Boolean).join(" ");
      return `<tr>
        <td class="prod">${esc(name)}</td>
        <td class="qty">${esc(qty(Number(it.qty)))}</td>
        <td class="unit">${esc(AUD(Number(it.unit_price)))}</td>
        <td class="price">${esc(AUD(Number(it.line_total)))}</td>
      </tr>`;
    })
    .join("");

  const totalRow = (label: string, value: string, cls = "") =>
    `<tr class="${cls}"><th>${esc(label)}</th><td>${esc(value)}</td></tr>`;

  const meta = (label: string, value: string) =>
    `<tr><th>${esc(label)}</th><td colspan="3">${esc(value)}</td></tr>`;

  return `<section class="sheet">
    <header>
      <img src="${PALM_LOGO_PNG}" alt="">
      <div>
        <h1>${esc(business?.name || "Surrey Hills Garden Supplies")}</h1>
        ${business?.address ? `<p>${esc(business.address)}</p>` : ""}
        ${business?.phone ? `<p>Ph: ${esc(business.phone)}</p>` : ""}
        ${business?.email ? `<p>E: ${esc(business.email)}</p>` : ""}
        ${business?.abn ? `<p>ABN: ${esc(business.abn)}</p>` : ""}
      </div>
    </header>
    <hr class="heavy">

    <table class="meta">
      <tr>
        <th>Tax Invoice No:</th>
        <td>${esc(input.numberLabel || order.order_number)}</td>
        <th class="right">Date:</th>
        <td>${esc(dmy(order.placed_at.slice(0, 10)))}</td>
      </tr>
      ${contact?.name ? meta("Contact Name:", contact.name) : ""}
      ${contact?.phone ? meta("Contact Phone:", contact.phone) : ""}
      ${meta("Business Name:", customer?.name || order.walk_in_name || "Cash sale")}
      ${meta(isDelivery ? "Delivery Address:" : "Collection:", addressLine)}
      ${meta("Scheduled Date & Time:", scheduleText(order))}
      ${order.po_number ? meta("P/O No:", order.po_number) : ""}
    </table>

    <table class="goods">
      <thead><tr>
        <th class="prod">Product</th><th class="qty">Qty</th><th class="unit">Unit</th><th class="price">Price</th>
      </tr></thead>
      <tbody>${rows}</tbody>
    </table>

    <table class="totals">
      ${totalRow("Price Adjustment", (adjust < 0 ? "−" : "") + AUD(Math.abs(adjust)))}
      ${totalRow("Subtotal", AUD(goods))}
      ${isDelivery ? totalRow(`Delivery${suburb ? ` (${suburb.name})` : ""}`, AUD(delivery)) : ""}
      ${isDelivery && fuel ? totalRow("Fuel Surcharge", AUD(fuel)) : ""}
      ${totalRow("Sale Total", AUD(saleTotal))}
      ${totalRow(`Surcharge ${cardRate}%`, AUD(surcharge))}
      ${gstOn ? totalRow(`${esc(paySettings?.gst_label || "GST")} included`, AUD(gst), "gst") : ""}
      ${totalRow("Total", AUD(total), "grand")}
    </table>

    <div class="notes">
      <section>
        <h2>DELIVERY NOTES:</h2>
        <p>${esc(order.delivery_notes || "")}</p>
      </section>
      <section>
        <h2>ORDER NOTES:</h2>
        <p>${esc(order.order_notes || "")}</p>
      </section>
    </div>

    <footer>
      <p class="fine">Delivery times are indicative only. The driver's responsibility ceases at the kerbside. Should the driver be directed</p>
      <p class="fine">to enter the property, the purchaser assumes all risk for any damage to property or personal injury.</p>
      <p class="sign"><span>Name ____________</span><span>Signature ____________</span></p>
    </footer>
  </section>`;
}

const STYLE = `
  @page { size: A4; margin: 15mm; }
  * { box-sizing: border-box; }
  html, body { margin: 0; padding: 0; background: #fff; }
  body {
    /* 100%, not a fixed 681px: A4 less 15mm margins is 680.3px, and a body one
       pixel wider makes Chrome shrink the whole sheet to fit. */
    width: 100%;
    font: 12px/1.35 Arial, Helvetica, sans-serif;
    color: #000;
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
  }
  /* break-after on every sheet but the last, rather than break-before on every
     sheet but the first: the same pagination, and the form print engines
     handle most consistently. */
  .sheet { break-inside: auto; }
  .sheet:not(:last-child) { break-after: page; page-break-after: always; }
  hr { border: 0; margin: 0; }
  hr.heavy { border-top: 2px solid #000; }
  hr.rule { border-top: 1px solid #000; }

  header { display: flex; align-items: flex-start; gap: 15px; padding-bottom: 13px; }
  header img { width: 60px; height: 56px; object-fit: contain; }
  header h1 { margin: 0 0 4px; font-size: 18px; line-height: 1.1; }
  header p { margin: 0; font-size: 11px; line-height: 1.32; }

  table { width: 100%; border-collapse: collapse; }

  table.meta { margin: 17px 0 10px; }
  table.meta th, table.meta td { padding: 3px 0; font-size: 12px; text-align: left; vertical-align: top; }
  table.meta th { width: 180px; font-weight: bold; }
  table.meta td.spacer { width: 160px; }
  table.meta th.right { width: 180px; }

  table.goods th { font-weight: bold; text-align: left; padding: 0 0 7px; border-bottom: 1px solid #000; }
  table.goods td { padding: 8px 0 9px; border-bottom: 1px solid #ccc; vertical-align: top; }
  .prod { width: auto; }
  .qty  { width: 120px; text-align: center; }
  .unit { width: 50px;  text-align: right; }
  .price{ width: 80px;  text-align: right; }

  table.totals { width: 250px; margin: 24px 0 0 auto; }
  table.totals th, table.totals td { padding: 5px 0; font-size: 12px; text-align: left; font-weight: normal; }
  table.totals td { text-align: right; }
  table.totals tr.gst th, table.totals tr.gst td { font-size: 11px; }
  table.totals tr.grand th, table.totals tr.grand td {
    font-size: 14px; font-weight: bold; padding-top: 12px; border-top: 2px solid #000;
  }

  /* The notes block is given the height it occupies on their invoice so the
     rule and the signature line land where the office expects them, even on a
     docket with nothing written in either column. */
  .notes { display: flex; gap: 24px; margin-top: 42px; min-height: 100px; }
  .notes section { flex: 1 1 0; min-width: 0; }
  .notes h2 { margin: 0 0 8px; font-size: 13px; }
  .notes p { margin: 0; font-size: 14px; font-weight: bold; white-space: pre-wrap; }

  footer { padding-top: 26px; border-top: 1px solid #000; }
  footer .fine { margin: 0; font-size: 10px; line-height: 1.4; text-align: center; }
  footer .sign { display: flex; justify-content: center; gap: 60px; margin: 30px 0 0; font-size: 11px; }
`;
