import { chromium } from 'playwright-core';
import { N, row } from './mock.mjs';
import { setup, CHROME } from './harness.mjs';
import fs from 'node:fs';
N.orders = 24; N.order_items = 72;

/* Second half of the demo: the dispatch board, live updates, changing an
   order after the fact, the customer on the order, payment, and reports. */
const OUT = (process.env.DEMO_OUT || new URL('./raw-board/', import.meta.url).pathname).replace(/\/?$/, '/');
fs.rmSync(OUT, { recursive: true, force: true }); fs.mkdirSync(OUT, { recursive: true });

const b = await chromium.launch({ executablePath: CHROME });
const ctx = await b.newContext({ viewport: { width: 1600, height: 900 }, recordVideo: { dir: OUT, size: { width: 1600, height: 900 } }, colorScheme: 'dark' });
const p = await ctx.newPage();
const t0 = Date.now();
const marks = []; let cur = null;
const scene = (name) => { const t = Date.now() - t0; if (cur) cur.end = t; cur = { name, start: t }; marks.push(cur); };
const endScene = () => { if (cur) cur.end = Date.now() - t0; };
const { pushChange } = await setup(p, { signedIn: true });

let SLOW = 1;
const pause = (ms) => p.waitForTimeout(ms * SLOW);
const typeInto = async (loc, text, delay = 70) => { await loc.click(); await p.keyboard.type(text, { delay: Math.round(delay * Math.min(SLOW, 1.8)) }); };
const nav = async (l) => { const t = p.locator(`button[title="${l}"]`); if (await t.count()) await t.first().click(); else await p.getByText(l, { exact: true }).first().click(); await pause(900); };
const body = async () => (await p.innerText('body')).replace(/\s+/g, ' ');
const closeDrawer = async () => { await p.locator('div[title="Click anywhere to close"]').first().click({ position: { x: 5, y: 5 } }).catch(() => {}); await pause(600); };
/* HTML5 drag, staged so React sees each step. */
const dragCard = async (fromIdx, toIdx) => {
  const fire = (type, idx) => p.evaluate(([type, idx]) => {
    const lane = document.querySelector('.board-lane-handle').parentElement;
    const el = lane.querySelectorAll('[draggable=true]')[idx];
    el.scrollIntoView({ block: 'center' });
    el.dispatchEvent(new DragEvent(type, { bubbles: true, cancelable: true, dataTransfer: new DataTransfer() }));
  }, [type, idx]);
  await fire('dragstart', fromIdx); await pause(500);
  await fire('dragover', toIdx); await pause(900);
  await fire('drop', toIdx); await pause(200);
  await fire('dragend', fromIdx);
  /* scrollIntoView moved the column; put it back so the top card is in shot */
  await p.evaluate(() => { const lane = document.querySelector('.board-lane-handle').parentElement; lane.querySelectorAll('*').forEach((el) => { if (el.scrollTop) el.scrollTop = 0; }); });
};

try {
/* ---- Scene 1: the board ---- */
scene('board'); SLOW = 2.0;
await p.goto('http://localhost:4173/', { waitUntil: 'load' });
await pause(2200);
await nav('Dispatch board'); await pause(2600);
// hover a card so the eye lands on address and goods
await p.locator('[draggable=true]').nth(1).hover(); await pause(1800);
// resize the first column
const h = p.locator('.board-lane-handle').first();
const hb = await h.boundingBox();
await p.mouse.move(hb.x + hb.width / 2, hb.y + 140); await p.mouse.down();
for (let i = 1; i <= 8; i++) { await p.mouse.move(hb.x + hb.width / 2 + i * 15, hb.y + 140); await p.waitForTimeout(60); }
await p.mouse.up(); await pause(1400);
await h.dblclick(); await pause(1200);
// drag the third card above the first
await dragCard(2, 0); await pause(2200);

/* ---- Scene 2: live ---- */
scene('live'); SLOW = 1.8;
await pause(1500);
// someone else moves ORD-90101 from Preparing to Loading
pushChange('orders', 'UPDATE', { ...row('orders', 1), status: 'loading', truck_id: 't0', driver_id: 'm2' }, { id: 'o1' });
await pause(2600);
pushChange('orders', 'UPDATE', { ...row('orders', 2), status: 'en_route', truck_id: 't1', driver_id: 'm2' }, { id: 'o2' });
await pause(2600);
await p.reload({ waitUntil: 'load' }); await pause(3200);

/* ---- Scene 3: when the day changes ---- */
scene('change'); SLOW = 1.9;
await p.locator('[draggable=true]', { hasText: 'ORD-90109' }).first().click(); await pause(1600);
const hold = p.locator('div[title^="Backorder — hold"]').first();
await hold.scrollIntoViewIfNeeded(); await pause(400);
await hold.click(); await pause(1800);
await p.getByRole('button', { name: 'Delivery', exact: true }).last().click(); await pause(1200);
await p.locator('span:text-is("Date") + div').first().click(); await pause(1200);
const overlay = p.locator('div[style*="z-index: 26"]').first();
/* A later day this month — the picker remembers the month it was left on,
   and the report ranges later in the recording expect this month's orders. */
await overlay.locator('text=/^28$/').last().click(); await pause(1200);
const fee = p.locator('label', { hasText: /^Delivery fee$/ }).locator('input').first();
const feeField = (await fee.count()) ? fee : p.locator('input[inputmode="decimal"]:visible').last();
await feeField.click(); await p.keyboard.press('Control+A'); await p.keyboard.type('25', { delay: 90 }); await feeField.press('Tab'); await pause(1200);
await p.getByRole('button', { name: /^Items/ }).last().click(); await pause(1200);
await p.locator('text=/Booked at/ >> visible=true').first().scrollIntoViewIfNeeded().catch(() => {}); await pause(2200);

/* ---- Scene 4: customer on the order ---- */
scene('customer'); SLOW = 2.2;
await p.getByRole('button', { name: 'Customer', exact: true }).last().click(); await pause(1500);
await p.locator('div[title="Edit this contact"]').first().scrollIntoViewIfNeeded(); await pause(400);
await p.locator('div[title="Edit this contact"]').first().click(); await pause(700);
const ph = p.locator('input[placeholder="0412 000 000"]:visible').first();
await ph.click(); await p.keyboard.press('Control+A'); await p.keyboard.type('0499 111 222', { delay: 60 });
await p.getByRole('button', { name: /^Save$/ }).first().click(); await pause(1500);
await p.getByRole('button', { name: /Open in Customers/ }).first().scrollIntoViewIfNeeded(); await pause(300);
await p.getByRole('button', { name: /Open in Customers/ }).first().click(); await pause(2600);

/* ---- Scene 5: paid, and found later ---- */
scene('paid'); SLOW = 1.5;
await p.locator('div[title="Close"]:visible').first().click(); await pause(600);
await nav('Orders'); await pause(600);
const firstRowText = await p.locator('tbody tr').first().innerText();
const amt = firstRowText.match(/\$([\d,]+\.\d\d)/)?.[1]?.replace(',', '') || '';
const who = (firstRowText.match(/ORD-\d+\s+([A-Z][a-z]+)/) || [])[1] || '';
await p.locator('tbody tr').first().click(); await pause(1300);
await p.getByRole('button', { name: /Mark as paid/ }).first().scrollIntoViewIfNeeded(); await pause(300);
await p.getByRole('button', { name: /Mark as paid/ }).first().click(); await pause(1800);
await closeDrawer();
const search = p.locator('input[placeholder*="Order no"], input[placeholder*="Search"]').first();
await typeInto(search, `${who} ${amt}`.trim(), 80); await pause(1600);
await search.fill(''); await pause(500);
const periodSel = p.locator('select').filter({ has: p.locator('option', { hasText: 'Custom range' }) }).first();
await periodSel.selectOption('Custom range'); await pause(900);
await p.getByText('From', { exact: true }).first().locator('xpath=..').click(); await pause(700);
await p.locator('text=/^9$/ >> visible=true').last().click(); await pause(600);
await p.getByText('To', { exact: true }).first().locator('xpath=..').click(); await pause(700);
await p.locator('text=/^12$/ >> visible=true').last().click(); await pause(1800);
await p.locator('tbody tr').first().click(); await pause(1500);
await closeDrawer();

/* ---- Scene 6: reports ---- */
scene('reports'); SLOW = 1.7;
await nav('Reports'); await pause(1800);
const rsel = p.locator('select').filter({ has: p.locator('option', { hasText: 'Custom range' }) }).first();
await rsel.selectOption('Custom range'); await pause(800);
await p.getByText('From', { exact: true }).first().locator('xpath=..').click(); await pause(600);
await p.locator('text=/^9$/ >> visible=true').last().click(); await pause(500);
await p.getByText('To', { exact: true }).first().locator('xpath=..').click(); await pause(600);
await p.locator('text=/^14$/ >> visible=true').last().click(); await pause(1800);
const reportSel = p.locator('select').filter({ has: p.locator('option', { hasText: 'Product sales by customer' }) }).first();
await reportSel.selectOption('Product sales by customer'); await pause(1800);
await reportSel.selectOption('Sales by suburb'); await pause(1500);
await p.getByRole('button', { name: /Export CSV/ }).first().hover(); await pause(900);
await nav('Dashboard'); await pause(2800);
endScene();
} catch (e) { console.log('STOPPED:', String(e.message).split('\n')[0]); endScene(); await p.screenshot({ path: OUT + 'fail.png' }).catch(() => {}); }

fs.writeFileSync(OUT + 'marks.json', JSON.stringify({ t0, marks }, null, 2));
console.log(JSON.stringify(marks));
await ctx.close(); await b.close();
