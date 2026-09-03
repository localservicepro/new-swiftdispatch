/* The printed account statement.

   Measured off one of SHGS's own statements the same way the tax invoice was:
   180mm of content on A4, "STATEMENT" set large against the letterhead, the
   customer and period block, a boxed ledger of charges and payments with a
   running balance, the totals strip, BALANCE DUE, the ageing summary, and the
   bank details above a centred footer. Every rule lands where theirs does.

   Shares the print pipeline with the invoice — see print.ts — so the office
   gets the same Ctrl+P dialogue and the same Save-as-PDF naming. */

import { AUD, dmy } from "../lib/domain";
import type { BusinessSettings, Customer } from "../lib/types";

const esc = (v: unknown): string =>
  String(v ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");

/* One line of the ledger. Charges and payments never share a row — a row is
   either money owed or money received, and the balance runs down the page. */
export interface StatementLine {
  dateIso: string;
  ref: string;
  charge: number;
  payment: number;
  /* Where the goods went. A heading is emitted whenever this changes, which is
     how their statement groups a month's deliveries by site. */
  address: string | null;
}

export interface StatementAgeing {
  current: number;
  over30: number;
  over60: number;
  over90: number;
  total: number;
}

export interface StatementInput {
  customer: Customer;
  customerAddress: string;
  business: BusinessSettings | null;
  periodLabel: string;
  generatedIso: string;
  lines: StatementLine[];
  ageing: StatementAgeing;
}

export const statementTitle = (c: Customer) => `Statement - ${c.name}`;

export function statementHtml(input: StatementInput): string {
  const { customer, customerAddress, business, periodLabel, generatedIso, lines, ageing } = input;

  let running = 0;
  /* The first site heading sits above the table, where theirs does; a change of
     address part-way through the month emits another inside it. */
  const leadAddress = lines.find((l) => l.address)?.address || null;
  let lastAddress: string | null = leadAddress;
  const body = lines
    .map((l) => {
      running = Math.round((running + l.charge - l.payment) * 100) / 100;
      /* The heading repeats only when the site changes, so a month of
         deliveries to one address reads as one block. */
      const heading =
        l.address && l.address !== lastAddress
          ? `<tr class="site"><td colspan="5">${esc(l.address)}</td></tr>`
          : "";
      if (l.address) lastAddress = l.address;
      return `${heading}<tr>
        <td class="date">${esc(dmy(l.dateIso))}</td>
        <td class="ref">${esc(l.ref)}</td>
        <td class="num">${l.charge ? esc(AUD(l.charge)) : ""}</td>
        <td class="num">${l.payment ? esc(AUD(l.payment)) : ""}</td>
        <td class="num">${esc(AUD(running))}</td>
      </tr>`;
    })
    .join("");

  const charges = Math.round(lines.reduce((t, l) => t + l.charge, 0) * 100) / 100;
  const payments = Math.round(lines.reduce((t, l) => t + l.payment, 0) * 100) / 100;
  const balanceDue = Math.round((charges - payments) * 100) / 100;

  const bankBits = [
    business?.bank_account_name ? `Acc. Name: ${business.bank_account_name}` : null,
    business?.bank_bsb ? `BSB: ${business.bank_bsb}` : null,
    business?.bank_account_no ? `Account No: ${business.bank_account_no}` : null,
  ].filter(Boolean) as string[];

  return `<!doctype html>
<html lang="en-AU"><head><meta charset="utf-8">
<title>${esc(statementTitle(customer))}</title>
<style>${STYLE}</style></head>
<body>
  <header>
    <div class="who">
      <h1>${esc(business?.name || "Surrey Hills Garden Supplies")}</h1>
      ${business?.address ? `<p>${esc(business.address)}</p>` : ""}
      ${business?.phone ? `<p>Sales Ph: ${esc(business.phone)}</p>` : ""}
      ${business?.email ? `<p>Email: ${esc(business.email)}</p>` : ""}
      ${business?.website ? `<p>Web: ${esc(business.website)}</p>` : ""}
      ${business?.abn ? `<p>ABN: ${esc(business.abn)}</p>` : ""}
    </div>
    <div class="mark">
      <div class="word">STATEMENT</div>
      <div class="on">${esc(dmy(generatedIso))}</div>
    </div>
  </header>
  <hr class="rule">

  <div class="cust">
    <h2>${esc(customer.name)}</h2>
    ${customerAddress ? `<p>${esc(customerAddress)}</p>` : ""}
  </div>
  <hr class="rule">

  <p class="period"><strong>Statement Period:</strong> ${esc(periodLabel)}</p>

  ${leadAddress ? `<p class="site-lead">${esc(leadAddress)}</p>` : ""}
  <table class="ledger">
    <thead><tr>
      <th class="date">Date</th>
      <th class="ref">Invoice No.</th>
      <th class="num">Charges</th>
      <th class="num">Payments</th>
      <th class="num">Balance Due</th>
    </tr></thead>
    <tbody>${body || `<tr><td colspan="5" class="empty">No activity in this period.</td></tr>`}</tbody>
  </table>

  <table class="sums">
    <tr>
      <th>Totals</th>
      <td class="num">${esc(AUD(charges))}</td>
      <td class="num">${esc(AUD(payments))}</td>
      <td></td>
    </tr>
  </table>

  <p class="due"><span>BALANCE DUE:</span><span class="amount">${esc(AUD(balanceDue))}</span></p>

  <h3 class="ageing-title">Account Summary</h3>
  <table class="ageing">
    <thead><tr>
      <th>Current</th><th>Over 30 Days</th><th>Over 60 Days</th><th>Over 90 Days</th><th>Total Due</th>
    </tr></thead>
    <tbody><tr>
      <td>${esc(AUD(ageing.current))}</td>
      <td>${esc(AUD(ageing.over30))}</td>
      <td>${esc(AUD(ageing.over60))}</td>
      <td>${esc(AUD(ageing.over90))}</td>
      <td class="total">${esc(AUD(ageing.total))}</td>
    </tr></tbody>
  </table>

  <div class="pay">
    <p><strong>Payment:</strong>${business?.bank_name ? ` (${esc(business.bank_name)})` : ""} ${esc(bankBits.join(" | "))}</p>
    ${business?.payment_reference_note ? `<p>${esc(business.payment_reference_note)}</p>` : ""}
    ${business?.card_surcharge_note ? `<p>${esc(business.card_surcharge_note)}</p>` : ""}
  </div>

  <footer>
    <p>This statement was generated on ${esc(dmy(generatedIso))}. Please contact us if you have any questions.</p>
    <p>${[business?.email ? `Email: ${esc(business.email)}` : null, business?.phone ? `Phone: ${esc(business.phone)}` : null]
      .filter(Boolean)
      .join(" | ")}</p>
  </footer>
</body></html>`;
}

const STYLE = `
  @page { size: A4; margin: 15mm; }
  * { box-sizing: border-box; }
  html, body { margin: 0; padding: 0; background: #fff; }
  body {
    width: 100%;
    font: 11px/1.35 Arial, Helvetica, sans-serif;
    color: #000;
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
  }
  hr.rule { border: 0; border-top: 1px solid #000; margin: 0; }

  header { display: flex; align-items: flex-start; gap: 20px; padding-bottom: 15px; }
  header .who { flex: 1; min-width: 0; }
  header h1 { margin: 0 0 5px; font-size: 18px; line-height: 1.1; }
  header p { margin: 0 0 4px; font-size: 10px; line-height: 1.1; }
  header .mark { flex-shrink: 0; text-align: right; }
  header .mark .word { font-size: 24px; font-weight: bold; line-height: 1.1; }
  header .mark .on { margin-top: 9px; font-size: 11px; }

  .cust { padding: 10px 0 6px; }
  .cust h2 { margin: 0 0 4px; font-size: 13px; line-height: 1.15; }
  .cust p { margin: 0; font-size: 11px; }

  .period { margin: 16px 0 0; font-size: 11px; }

  table { width: 100%; border-collapse: collapse; }

  /* Their ledger is boxed by column: a heavy rule above the header, a light one
     under every row, drawn cell by cell rather than across the table. */
  table.ledger { margin-top: 7px; }
  table.ledger th { padding: 5px 0; border-top: 2px solid #000; border-bottom: 1px solid #000; font-size: 11px; }
  table.ledger td { padding: 4px 0 3px; border-bottom: 1px solid #000; font-size: 11px; }
  table.ledger th.date, table.ledger th.ref { text-align: center; }
  table.ledger td.date, table.ledger td.ref { text-align: left; padding-left: 8px; }
  table.ledger .num { text-align: right; padding-right: 1px; }
  table.ledger th.date { width: 136px; }
  table.ledger th.ref  { width: 143px; }
  table.ledger th:nth-child(3) { width: 115px; }
  table.ledger th:nth-child(4) { width: 130px; }
  table.ledger th:nth-child(5) { width: 157px; }
  .site-lead { margin: 12px 0 0; font-size: 12px; font-weight: bold; }
  /* A change of site part-way through the month gets its own heading row. */
  table.ledger tr.site td { border: 0; padding: 12px 0 4px; font-size: 12px; font-weight: bold; }
  table.ledger td.empty { text-align: center; padding: 14px 0; color: #444; }

  /* The totals strip runs on its own column split, as it does on theirs. */
  table.sums { margin-top: 20px; }
  table.sums th, table.sums td {
    padding: 5px 0 7px; border-top: 2px solid #000; border-bottom: 2px solid #000; font-size: 11px; font-weight: bold;
  }
  table.sums th { width: 165px; text-align: left; padding-left: 8px; }
  table.sums td:nth-child(2) { width: 174px; }
  table.sums td:nth-child(3) { width: 135px; }
  table.sums td:nth-child(4) { width: 207px; }
  table.sums .num { text-align: right; }

  .due { display: flex; justify-content: flex-end; align-items: baseline; gap: 24px; margin: 15px 0 0; font-size: 13px; font-weight: bold; }
  .due .amount { font-size: 14px; }

  .ageing-title { margin: 16px 0 0; font-size: 12px; }
  table.ageing { margin-top: 9px; }
  table.ageing th { padding: 6px 0; border-top: 2px solid #000; border-bottom: 1px solid #000; font-size: 11px; text-align: center; }
  table.ageing td { padding: 7px 0; border-bottom: 2px solid #000; font-size: 12px; font-weight: bold; text-align: center; }
  table.ageing td.total { font-size: 13px; }
  table.ageing th:nth-child(1) { width: 108px; }
  table.ageing th:nth-child(2) { width: 149px; }
  table.ageing th:nth-child(3) { width: 150px; }
  table.ageing th:nth-child(4) { width: 149px; }
  table.ageing th:nth-child(5) { width: 125px; }

  .pay { margin: 34px 0 0; padding-left: 11px; }
  .pay p { margin: 0 0 6px; font-size: 10px; }
  .pay p:first-child { font-size: 11px; }

  footer { margin-top: 25px; padding-top: 18px; border-top: 1px solid #000; }
  footer p { margin: 0 0 3px; font-size: 9px; text-align: center; }
`;
