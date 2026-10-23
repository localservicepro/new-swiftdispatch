import { chromium } from 'playwright-core';
import { N, row } from './mock.mjs';
import fs from 'node:fs';
N.orders = 24; N.order_items = 72;

const OUT = (process.env.DEMO_OUT || new URL('./raw/', import.meta.url).pathname).replace(/\/?$/, '/');
fs.rmSync(OUT, { recursive: true, force: true }); fs.mkdirSync(OUT, { recursive: true });

const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
const ctx = await b.newContext({ viewport: { width: 1600, height: 900 }, recordVideo: { dir: OUT, size: { width: 1600, height: 900 } }, colorScheme: 'dark' });
const p = await ctx.newPage();
const t0 = Date.now();
const marks = []; let cur = null;
const scene = (name) => { const t = Date.now() - t0; if (cur) cur.end = t; cur = { name, start: t }; marks.push(cur); };
const endScene = () => { if (cur) cur.end = Date.now() - t0; };

/* ---- mock backend: same rows as the tests, plus creates that echo back ---- */
let seq = 200;
const CAP = 1000;
await p.route('https://fonts.googleapis.com/**', r => r.abort());
await p.routeWebSocket(/realtime\/v1\/websocket/, (ws) => {
  ws.onMessage((raw) => {
    let m; try { m = JSON.parse(String(raw)); } catch { return; }
    const arr = Array.isArray(m);
    const joinRef = arr ? m[0] : null, ref = arr ? m[1] : m.ref, topic = arr ? m[2] : m.topic, event = arr ? m[3] : m.event, payload = arr ? m[4] : m.payload;
    const reply = (resp) => ws.send(arr ? JSON.stringify([joinRef, ref, topic, 'phx_reply', { status: 'ok', response: resp }]) : JSON.stringify({ topic, event: 'phx_reply', payload: { status: 'ok', response: resp }, ref }));
    if (event === 'phx_join') {
      const pcs = (payload && payload.config && payload.config.postgres_changes) || [];
      reply({ postgres_changes: pcs.map((c, i) => ({ id: i + 1, ...c })) });
    } else if (event === 'heartbeat') reply({});
    else if (event === 'access_token') reply({});
  });
});
await p.route('**/rest/v1/**', async (route) => {
  const req = route.request();
  const url = new URL(req.url());
  const table = url.pathname.split('/rest/v1/')[1];
  if (req.method() === 'POST') {
    let body = []; try { body = req.postDataJSON(); } catch {}
    const rows = Array.isArray(body) ? body : [body];
    const now = new Date().toISOString();
    const out = rows.map((r) => {
      const base = table === 'orders' ? { ...row('orders', 0), id: 'n' + (seq++), order_number: 'ORD-9' + (1000 + seq), status: 'preparing', kind: 'standard', parent_order_id: null, placed_at: now, created_at: now, updated_at: now, truck_id: null, driver_id: null, delivery_notes: null, order_notes: null, processed_at: null, board_rank: null, paid_at: null, booked_total: null }
        : table === 'order_items' ? { id: 'ni' + (seq++), variant_id: null, description: null, backordered: false, created_at: now }
        : { id: 'x' + (seq++), created_at: now };
      const merged = { ...base, ...r };
      if (table === 'order_items') merged.line_total = Math.round(Number(merged.qty) * Number(merged.unit_price) * 100) / 100;
      return merged;
    });
    return route.fulfill({ status: 201, contentType: 'application/json', body: JSON.stringify(Array.isArray(body) ? out : out[0]) });
  }
  if (req.method() !== 'GET') return route.fulfill({ status: 200, contentType: 'application/json', body: '[]' });
  const from = Number(url.searchParams.get('offset') || 0);
  const limit = Math.min(Number(url.searchParams.get('limit') || CAP), CAP);
  const total = N[table] ?? 0;
  const to = Math.min(from + limit - 1, total - 1);
  const body = []; for (let i = from; i <= to; i++) body.push(row(table, i));
  await route.fulfill({ status: 200, contentType: 'application/json', headers: { 'content-range': `${from}-${to}/${total}`, 'access-control-expose-headers': 'Content-Range' }, body: JSON.stringify(body) });
});
/* Registered last so it wins over the generic REST mock — Playwright tries the newest route first. */
let ordNo = 91500;
await p.route('**/rest/v1/rpc/**', r => { const u = r.request().url(); if (u.includes('next_order_number')) return r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify('ORD-' + (ordNo++)) }); return r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify([{ id: 'm0', name: 'Logan Reid', role: 'super_admin' }]) }); });
await p.addInitScript(() => {
  const d = Object.getOwnPropertyDescriptor(HTMLIFrameElement.prototype, 'contentWindow');
  Object.defineProperty(HTMLIFrameElement.prototype, 'contentWindow', { get() { const w = d.get.call(this); if (w && !w.__p) { w.__p = 1; w.print = () => {}; } return w; } });
});

const pause = (ms) => p.waitForTimeout(ms);
const typeInto = async (loc, text, delay = 70) => { await loc.click(); await p.keyboard.type(text, { delay }); };
const nav = async (l) => { const t = p.locator(`button[title="${l}"]`); if (await t.count()) await t.first().click(); else await p.getByText(l, { exact: true }).first().click(); await pause(900); };
const body = async () => (await p.innerText('body')).replace(/\s+/g, ' ');

try {
/* ---- Scene 1: sign in with 1004 ---- */
scene('login');
await p.goto('http://localhost:4173/', { waitUntil: 'load' });
await pause(1800);
for (const d of ['1', '0', '0', '4']) { await p.getByText(d, { exact: true }).last().click(); await pause(450); }
await pause(3200);

/* ---- Scene 2: items ---- */
scene('items');
await nav('New order'); await pause(800);
const prod = p.locator('input[placeholder*="0.5*sand"]').first();
await typeInto(prod, '.5*wbs'); await pause(900); await prod.press('Enter'); await pause(900);
await prod.fill(''); await typeInto(prod, '2*20mm'); await pause(900); await prod.press('Enter'); await pause(900);
await prod.fill(''); await pause(300);
await p.locator('.product-grid > div').first().locator('button').last().click(); await pause(700);
await p.locator('.product-grid > div').first().locator('button').last().click(); await pause(1400);

/* ---- Scene 3: save for later, resume ---- */
scene('save');
await nav('Orders'); await pause(700);
await p.getByRole('button', { name: 'Save for later' }).first().click(); await pause(1600);
await nav('New order'); await pause(1200);
await p.getByRole('button', { name: 'Resume' }).first().click(); await pause(1800);

/* ---- Scene 4: single order checkout ---- */
scene('checkout');
await p.getByRole('button', { name: /Continue checkout/ }).first().click(); await pause(1200);
const cust = p.locator('input[placeholder*="business or person"]').first();
await typeInto(cust, 'Barw'); await pause(900);
await p.getByText('Barwon Building Supplies', { exact: true }).first().click(); await pause(1600);
// discount: $5 off
const adj = p.locator('input[aria-label="Adjustment value"]').first();
if (await adj.count()) { await adj.click(); await p.keyboard.type('5', { delay: 80 }); await pause(900); }
// delivery fee typed
const feeInput = p.locator('label', { hasText: /^Fee$/ }).locator('input').first();
const fee = (await feeInput.count()) ? feeInput : p.locator('input[inputmode="decimal"]').last();
await fee.click(); await p.keyboard.press('Control+A'); await p.keyboard.type('25', { delay: 80 }); await fee.press('Tab'); await pause(1200);
await p.getByRole('button', { name: /^Create order/ }).first().click(); await pause(1800);
const printBtn = p.getByRole('button', { name: /^Print/ }).first();
if (await printBtn.count()) { await printBtn.click(); await pause(1500); }
if (await p.getByRole('button', { name: 'Skip' }).count()) { await p.getByRole('button', { name: 'Skip' }).first().click(); await pause(800); }
await pause(1200);

/* ---- Scene 5: split order ---- */
scene('split');
await nav('New order'); await pause(800);
if (await p.getByRole('button', { name: 'Discard' }).count()) { await p.getByRole('button', { name: 'Discard' }).first().click(); await pause(500); }
const prod2 = p.locator('input[placeholder*="0.5*sand"]').first();
await typeInto(prod2, '3*crushed'); await pause(700); await prod2.press('Enter'); await pause(700);
await prod2.fill(''); await typeInto(prod2, '10*pine'); await pause(700); await prod2.press('Enter'); await pause(700);
await prod2.fill(''); await typeInto(prod2, '1*loam'); await pause(700); await prod2.press('Enter'); await pause(900);
await prod2.fill('');
await p.getByRole('button', { name: /Continue checkout/ }).first().click(); await pause(1200);
const cust2 = p.locator('input[placeholder*="business or person"]').first();
await typeInto(cust2, 'Hillt'); await pause(800);
await p.getByText('Hilltop Landscapes', { exact: true }).first().click(); await pause(1400);
await p.getByRole('button', { name: /Split this order/ }).first().click(); await pause(1600);
// send the second line to delivery B with its letter dropdown in the Per delivery card
const letterSel = p.locator('select:visible').filter({ has: p.locator('option', { hasText: /^B$/ }) });
await letterSel.nth(1).scrollIntoViewIfNeeded(); await pause(600);
await letterSel.nth(1).selectOption('B'); await pause(1600);
// B goes to Kew
const suburbSels = p.locator('select:visible').filter({ has: p.locator('option', { hasText: /^Kew$/ }) });
await suburbSels.nth(1).selectOption({ label: 'Kew' }).catch(() => {}); await pause(1400);
// a prepaid customer has no default settlement — paid in the yard
const settleSel = p.locator('select:visible').filter({ has: p.locator('option', { hasText: /^In-yard$/ }) }).first();
await settleSel.scrollIntoViewIfNeeded(); await pause(400);
await settleSel.selectOption('in_yard'); await pause(1200);
await p.getByRole('button', { name: /Create 2 split orders/ }).first().scrollIntoViewIfNeeded(); await pause(600);
await p.getByRole('button', { name: /Create 2 split orders/ }).first().click(); await pause(2000);
if (await p.getByRole('button', { name: 'Skip' }).count()) { await p.getByRole('button', { name: 'Skip' }).first().click(); await pause(800); }
await pause(800);

/* ---- Scene 6: where they landed ---- */
scene('board');
await nav('Dispatch board'); await pause(2600);
await nav('Orders'); await pause(2400);
endScene();
} catch (e) { console.log('STOPPED:', String(e.message).split('\n')[0]); endScene(); await p.screenshot({ path: OUT + 'fail.png' }).catch(()=>{}); }

fs.writeFileSync(OUT + 'marks.json', JSON.stringify({ t0, marks }, null, 2));
console.log(JSON.stringify(marks));
await ctx.close(); await b.close();
