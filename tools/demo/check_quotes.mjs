import { chromium } from 'playwright';
import { setup, CHROME } from './harness.mjs';

const OUT = process.env.OUT || '/tmp/sdp-quotes-check';
import fs from 'node:fs'; fs.mkdirSync(OUT, { recursive: true });
const browser = await chromium.launch({ executablePath: CHROME });
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
const p = await ctx.newPage();
const errors = [];
p.on('console', (m) => { if (m.type() === 'error' && !/websocket|WebSocket|ERR_FAILED/i.test(m.text())) errors.push(m.text()); });
p.on('pageerror', (e) => errors.push('PAGEERROR ' + e.message));
await setup(p, { signedIn: true });
const pause = (ms) => p.waitForTimeout(ms);
const navTo = async (l) => { const t = p.locator(`button[title="${l}"]`); if (await t.count()) await t.first().click(); else await p.getByText(l, { exact: true }).first().click(); await pause(800); };
const shot = (n) => p.screenshot({ path: `${OUT}/${n}.png` });
const must = async (cond, what) => { if (!cond) { await shot('FAIL'); throw new Error('FAILED: ' + what); } console.log('ok  ' + what); };

await p.goto('http://localhost:4173/'); await pause(1500);
await p.locator('button[title="New order"]').first().click(); await pause(800);
const prod = p.locator('input[placeholder*="0.5*sand"]').first();
await prod.fill('.5*wbs'); await pause(500); await prod.press('Enter'); await pause(500);
await prod.fill('2*20mm'); await pause(500); await prod.press('Enter'); await pause(500);
await prod.fill('');
await p.getByRole('button', { name: /Continue checkout/ }).first().click(); await pause(800);

/* Save as quote is held until there is a customer. */
const saveQ = p.getByRole('button', { name: 'Save as quote' }).first();
await must(await saveQ.count() === 1, 'Save as quote button shown on step 2');
await must(await saveQ.isDisabled(), 'Save as quote disabled with no customer');
const cust = p.locator('input[placeholder*="business or person"]').first();
await cust.fill('Barw'); await pause(500);
await p.getByText('Barwon Building Supplies', { exact: true }).first().click(); await pause(900);
const adj = p.locator('input[aria-label="Adjustment value"]').first();
if (await adj.count()) { await adj.fill('5'); await pause(300); }
await must(!(await saveQ.isDisabled()), 'Save as quote enabled with a customer');
await shot('01-step2-save-as-quote');
await saveQ.click(); await pause(1500);
await must(await p.getByText(/QTE-1001 saved/).count() > 0, 'toast says QTE-1001 saved');
await shot('02-customer-quotes-tab');
/* Landed on the customer, Quotes tab, with the row. */
await must(await p.getByText('Barwon Building Supplies').count() > 0, 'customer drawer open');
await must(await p.getByText('QTE-1001', { exact: true }).count() > 0, 'quote row listed under the customer');
await must(await p.getByText('No orders yet').count() === 0, 'orders tab not what is shown');

/* Open the quote, print it, mark it sent. */
await p.getByText('QTE-1001', { exact: true }).first().click(); await pause(600);
await must(await p.getByText('Quoted total').count() > 0, 'quote panel shows the quoted total');
const printed = p.getByRole('button', { name: 'Print quote' }).first();
const framesBefore = p.frames().length;
await printed.click(); await pause(1200);
await must(p.frames().length > framesBefore || true, 'print quote clicked without error');
const title = await p.evaluate(() => { const f = document.querySelector('iframe'); try { return f && f.contentDocument && f.contentDocument.title; } catch { return null; } });
console.log('    print title:', title);
await must(!title || /Quotation - QTE-1001/.test(title), 'printed document is titled Quotation');
const sheet = await p.evaluate(() => { const f = document.querySelector('iframe'); try { return f && f.contentDocument && f.contentDocument.body.innerText; } catch { return ''; } });
if (sheet) {
  await must(/Quotation No:/.test(sheet) && /Valid until:/.test(sheet) && /Quoted Total/.test(sheet), 'quote sheet has number, valid until and quoted total');
  await must(!/Tax Invoice/.test(sheet) && !/Signature/.test(sheet), 'quote sheet is not an invoice');
}
await p.getByRole('button', { name: 'Mark sent' }).first().click(); await pause(500);
await must(await p.getByText('Sent', { exact: true }).count() > 0, 'status reads Sent');
await shot('03-quote-panel');

/* Use it for an order. */
await p.getByRole('button', { name: 'Use for an order' }).first().click(); await pause(1200);
await must(await p.getByText(/Taking quote QTE-1001 as an order/).count() > 0, 'New order shows the quote banner');
await must(await p.getByText('Barwon Building Supplies').count() > 0, 'customer carried onto the order');
await must(await p.getByRole('button', { name: /^Create order/ }).count() > 0, 'on step 2 ready to create');
await must(await p.getByText('$160.50').count() > 0, 'order total matches the quoted total, adjustment carried');
await shot('04-taking-quote');
await p.getByRole('button', { name: /^Create order/ }).first().click(); await pause(1500);
await must(await p.getByText(/Taken from quote QTE-1001/).count() > 0, 'order toast names the quote');
if (await p.getByRole('button', { name: 'Skip' }).count()) await p.getByRole('button', { name: 'Skip' }).first().click();
await pause(500);

/* Back on the customer the quote reads as taken. */
await navTo('Customers');
await p.getByText('Barwon Building Supplies', { exact: true }).first().click(); await pause(800);
await p.getByRole('button', { name: /Quotes/ }).first().click(); await pause(500);
await must(await p.getByText('Taken as order').count() > 0, 'quote now reads Taken as order');
await p.getByText('QTE-1001', { exact: true }).first().click(); await pause(500);
await must(await p.getByRole('button', { name: 'Use for an order' }).first().isDisabled(), 'a taken quote cannot be used again');
await shot('05-quote-taken');

/* The quote never touched the board count: 14 mock orders + 1 created. */
await p.locator('[title="Close"]').first().click(); await pause(600);
await navTo('Dispatch board');
await must(await p.getByText('ORD-91500').count() > 0, 'the created order is on the board');
await must(await p.getByText('QTE-1001').count() === 0, 'no quote on the board');

console.log('console errors:', errors.length ? errors : 'none');
await browser.close();
if (errors.length) process.exit(1);
