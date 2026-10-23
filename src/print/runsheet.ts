/* The run sheet — the paper that goes out on the truck.

   It is not a small invoice. An invoice is for the customer and is about money;
   a run sheet is for the loader and the driver and is about goods, gates and
   getting a signature. What it carries, in the order the job happens in:

     what to load, in type big enough to read across a yard, with a box to tick
     as each thing goes on, and the unit price beside it — the yard asked for
     that in place of the SKU, which told the loader nothing;

     where it is going and who to ring when nobody answers the gate;

     the delivery notes, which are the whole reason the yard asked for these —
     "second driveway", "leave behind the shed", "dog" — and which were
     previously only on a screen back in the office;

     and a signature block, because the signed sheet is what settles an argument
     about whether a load turned up.

   One sheet per delivery. A split order prints one per drop, because each drop
   is a separate run with its own address and its own signature. */

import { AUD, dmy, qtyText } from "../lib/domain";
import type { BusinessSettings, Customer, Order, OrderItem, Product, Suburb, TeamMember, Truck } from "../lib/types";
import { PALM_LOGO_PNG } from "./logo";

const WEEKDAY = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

const esc = (v: unknown): string =>
  String(v ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");

const scheduleText = (o: Order): string => {
  if (!o.delivery_date) return "Not scheduled";
  const d = new Date(o.delivery_date + "T00:00:00");
  const day = isNaN(d.getTime()) ? "" : " " + WEEKDAY[d.getDay()];
  const w = o.delivery_window || "";
  if (!w) return dmy(o.delivery_date) + day;
  const loose = w === "ASAP" || w === "Within the hour";
  return dmy(o.delivery_date) + day + (loose ? " — " + w : " at " + w);
};

export interface RunSheetGroup {
  order: Order;
  items: OrderItem[];
}

export interface RunSheetInput {
  groups: RunSheetGroup[];
  products: Product[];
  suburbs: Suburb[];
  trucks: Truck[];
  team: TeamMember[];
  customer: Customer | null | undefined;
  business: BusinessSettings | null;
}

export const runSheetTitle = (order: Order) => `Run Sheet - ${order.order_number}`;

export function runSheetHtml(input: RunSheetInput): string {
  const { groups, products, suburbs, trucks, team, customer, business } = input;
  const title = groups.length ? runSheetTitle(groups[0].order) : "Run Sheet";
  return `<!doctype html>
<html lang="en-AU"><head><meta charset="utf-8">
<title>${esc(title)}</title>
<style>${STYLE}</style></head>
<body>${groups.map((g) => sheet(g, products, suburbs, trucks, team, customer, business, groups.length)).join("\n")}</body></html>`;
}

function sheet(
  g: RunSheetGroup,
  products: Product[],
  suburbs: Suburb[],
  trucks: Truck[],
  team: TeamMember[],
  customer: Customer | null | undefined,
  business: BusinessSettings | null,
  sheetCount: number
): string {
  const o = g.order;
  const suburb = suburbs.find((s) => s.id === o.suburb_id);
  const truck = trucks.find((t) => t.id === o.truck_id);
  const driver = team.find((t) => t.id === o.driver_id);
  const contact = customer?.contacts?.find((c) => c.id === o.contact_id) || customer?.contacts?.[0];
  const isDelivery = o.method === "delivery";

  const where = isDelivery
    ? [o.street, suburb ? `${suburb.name} ${suburb.state} ${suburb.postcode}` : null].filter(Boolean).join(", ")
    : "Collection from the yard";

  const lines = g.items.length
    ? g.items
        .map((i) => {
          const p = products.find((x) => x.id === i.product_id);
          /* A backordered line is printed, struck and labelled, rather than
             left off: the driver should know the customer is expecting it and
             not load it, and the customer signing the sheet should see it was
             not forgotten. */
          const bo = !!i.backordered;
          return `<tr${bo ? ' class="bo"' : ""}>
            <td class="tick">${bo ? "B/O" : ""}</td>
            <td class="qty">${esc(qtyText(Number(i.qty), p?.unit || "each"))}</td>
            <td class="prod">${esc(p?.name || i.description || "Item")}${bo ? ' <span class="bo-tag">Backorder — do not load</span>' : ""}</td>
            <td class="price">${esc(AUD(Number(i.unit_price)))} <span class="per">/ ${esc(p?.unit || "each")}</span></td>
          </tr>`;
        })
        .join("")
    : `<tr><td class="tick"></td><td class="qty">—</td><td class="prod">No items recorded on this order</td><td class="price"></td></tr>`;

  const notes = [
    o.delivery_notes ? { label: "For the driver", text: o.delivery_notes } : null,
    o.order_notes ? { label: "Order notes", text: o.order_notes } : null,
  ].filter(Boolean) as { label: string; text: string }[];

  return `<section class="sheet">
  <header>
    <img src="${PALM_LOGO_PNG}" alt="">
    <div>
      <h1>Run sheet</h1>
      <p>${esc(business?.name || "Surrey Hills Garden Supplies")}${business?.phone ? " &nbsp;·&nbsp; " + esc(business.phone) : ""}</p>
    </div>
    <div class="ordno">
      <strong>${esc(o.order_number)}</strong>
      <span>${esc(isDelivery ? "Delivery" : "Pickup")}${sheetCount > 1 ? " — 1 of " + sheetCount : ""}</span>
    </div>
  </header>
  <hr class="heavy">

  <table class="meta">
    <tr><th>Customer</th><td>${esc(customer?.name || o.walk_in_name || "Walk-in")}${
      customer ? ` <span class="faint">Acct ${esc(customer.account_number)}</span>` : ""
    }</td></tr>
    ${contact ? `<tr><th>Ordered by</th><td>${esc(contact.name)}${contact.phone ? " — " + esc(contact.phone) : ""}</td></tr>` : ""}
    <tr><th>${isDelivery ? "Deliver to" : "Collection"}</th><td class="where">${esc(where)}</td></tr>
    <tr><th>When</th><td>${esc(scheduleText(o))}</td></tr>
    <tr><th>Truck &amp; driver</th><td>${truck ? esc(`${truck.rego} — ${truck.type}`) : "<span class='unset'>Not assigned</span>"}${
      driver ? " &nbsp;·&nbsp; " + esc(driver.name) : truck ? " &nbsp;·&nbsp; <span class='unset'>no driver</span>" : ""
    }</td></tr>
    ${o.po_number ? `<tr><th>Customer PO</th><td>${esc(o.po_number)}</td></tr>` : ""}
  </table>

  <table class="goods">
    <thead><tr><th class="tick">✓</th><th class="qty">Qty</th><th class="prod">Product</th><th class="price">Unit price</th></tr></thead>
    <tbody>${lines}</tbody>
  </table>

  ${notes
    .map(
      (n) => `<div class="notes"><span class="notes-label">${esc(n.label)}</span><p>${esc(n.text)}</p></div>`
    )
    .join("")}

  <div class="sign">
    <div class="sign-col"><span>Loaded by</span><div class="line"></div></div>
    <div class="sign-col"><span>Received by (print name)</span><div class="line"></div></div>
    <div class="sign-col"><span>Signature</span><div class="line"></div></div>
    <div class="sign-col narrow"><span>Time</span><div class="line"></div></div>
  </div>
  <p class="foot">Goods remain the property of ${esc(
    business?.name || "Surrey Hills Garden Supplies"
  )} until paid for in full. The driver is not authorised to enter soft ground or cross private paving; where entry is requested beyond the kerb it is at the customer's risk.</p>
</section>`;
}

const STYLE = `
  @page { size: A4; margin: 15mm; }
  * { box-sizing: border-box; }
  html, body { margin: 0; padding: 0; background: #fff; }
  body {
    width: 100%;
    font: 12px/1.35 Arial, Helvetica, sans-serif;
    color: #000;
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
  }
  .sheet { break-inside: auto; }
  .sheet:not(:last-child) { break-after: page; page-break-after: always; }
  hr { border: 0; margin: 0; }
  hr.heavy { border-top: 2px solid #000; }

  header { display: flex; align-items: flex-start; gap: 15px; padding-bottom: 13px; }
  header img { width: 60px; height: 56px; object-fit: contain; }
  header h1 { margin: 0 0 4px; font-size: 20px; line-height: 1.1; }
  header p { margin: 0; font-size: 11px; }
  .ordno { margin-left: auto; text-align: right; }
  .ordno strong { display: block; font-size: 19px; letter-spacing: .01em; }
  .ordno span { font-size: 11px; text-transform: uppercase; letter-spacing: .08em; }

  table { width: 100%; border-collapse: collapse; }
  table.meta { margin: 15px 0 6px; }
  table.meta th, table.meta td { padding: 3px 0; font-size: 12.5px; text-align: left; vertical-align: top; }
  table.meta th { width: 130px; font-weight: bold; }
  /* The address is what the driver reads at 60km/h down a side road. */
  table.meta td.where { font-size: 15px; font-weight: bold; }
  .faint { color: #555; font-weight: normal; }
  .unset { color: #b00; }

  table.goods { margin-top: 14px; }
  table.goods th { font-weight: bold; text-align: left; padding: 0 0 7px; border-bottom: 2px solid #000; font-size: 11px; text-transform: uppercase; letter-spacing: .06em; }
  table.goods td { padding: 11px 0; border-bottom: 1px solid #ccc; vertical-align: middle; }
  /* Loading is done standing up with the sheet at arm's length. */
  table.goods td.qty { font-size: 16px; font-weight: bold; width: 110px; }
  table.goods td.prod { font-size: 15px; }
  table.goods td.price { font-size: 12px; width: 130px; text-align: right; white-space: nowrap; }
  table.goods td.price .per { font-size: 10px; color: #555; }
  table.goods th.tick, table.goods td.tick { width: 34px; }
  table.goods tr.bo td { color: #777; }
  table.goods tr.bo td.qty, table.goods tr.bo td.prod { text-decoration: line-through; }
  table.goods tr.bo td.tick { font-size: 9px; font-weight: bold; letter-spacing: .04em; }
  table.goods tr.bo td.tick::before { content: none; }
  table.goods tr.bo td.prod .bo-tag { text-decoration: none; display: inline-block; margin-left: 6px; font-size: 9px; font-weight: bold; text-transform: uppercase; letter-spacing: .06em; border: 1px solid #777; border-radius: 3px; padding: 1px 5px; }
  table.goods td.tick::before {
    content: ""; display: block; width: 17px; height: 17px; border: 1.5px solid #000;
  }

  .notes { margin-top: 16px; border: 1.5px solid #000; padding: 9px 11px; }
  .notes-label { display: block; font-size: 10px; font-weight: bold; text-transform: uppercase; letter-spacing: .08em; margin-bottom: 3px; }
  .notes p { margin: 0; font-size: 14px; line-height: 1.4; }

  .sign { display: flex; gap: 16px; margin-top: 30px; }
  .sign-col { flex: 1; }
  .sign-col.narrow { flex: 0 0 90px; }
  .sign-col span { display: block; font-size: 10px; text-transform: uppercase; letter-spacing: .07em; margin-bottom: 20px; }
  .sign-col .line { border-bottom: 1px solid #000; }

  .foot { margin-top: 22px; font-size: 9.5px; line-height: 1.4; color: #333; }
`;
