import { chromium } from 'playwright-core';
import { setup, CHROME } from './harness.mjs';
import fs from 'node:fs';

/* Third demo: quotes. Written up like an order, saved against the customer,
   printed as a quotation, tracked, then used for an order. Scenes match the
   narration in assemble_quotes.py by name. */
const OUT = (process.env.DEMO_OUT || new URL('./raw-quotes/', import.meta.url).pathname).replace(/\/?$/, '/');
fs.rmSync(OUT, { recursive: true, force: true }); fs.mkdirSync(OUT, { recursive: true });

const b = await chromium.launch({ executablePath: CHROME });
const ctx = await b.newContext({ viewport: { width: 1600, height: 900 }, recordVideo: { dir: OUT, size: { width: 1600, height: 900 } }, colorScheme: 'dark' });
const p = await ctx.newPage();
const t0 = Date.now();
const marks = []; let cur = null;
const scene = (name) => { const t = Date.now() - t0; if (cur) cur.end = t; cur = { name, start: t }; marks.push(cur); };
const endScene = () => { if (cur) cur.end = Date.now() - t0; };
await setup(p, { signedIn: true });

let SLOW = 1;
const pause = (ms) => p.waitForTimeout(ms * SLOW);
const typeInto = async (loc, text, delay = 70) => { await loc.click(); await p.keyboard.type(text, { delay: Math.round(delay * Math.min(SLOW, 1.8)) }); };
const nav = async (l) => { const t = p.locator(`button[title="${l}"]`); if (await t.count()) await t.first().click(); else await p.getByText(l, { exact: true }).first().click(); await pause(900); };
/* Hover a button for a beat so the eye lands on it before it is pressed. */
const press = async (loc, before = 900, after = 1200) => { await loc.scrollIntoViewIfNeeded(); await loc.hover(); await pause(before); await loc.click(); await pause(after); };

try {
/* ---- Scene 1: starts like an order ---- */
scene('start'); SLOW = 2.2;
await p.goto('http://localhost:4173/', { waitUntil: 'load' });
await pause(1800);
await nav('New order'); await pause(1200);
const prod = p.locator('input[placeholder*="0.5*sand"]').first();
await typeInto(prod, '.5*wbs'); await pause(700); await prod.press('Enter'); await pause(800);
await prod.fill(''); await typeInto(prod, '2*20mm'); await pause(700); await prod.press('Enter'); await pause(800);
await prod.fill(''); await pause(400);
await press(p.getByRole('button', { name: /Continue checkout/ }).first(), 600, 1200);
const cust = p.locator('input[placeholder*="business or person"]').first();
await typeInto(cust, 'Barw'); await pause(800);
await p.getByText('Barwon Building Supplies', { exact: true }).first().click(); await pause(1400);
const adj = p.locator('input[aria-label="Adjustment value"]').first();
if (await adj.count()) { await adj.click(); await p.keyboard.type('5', { delay: 90 }); await pause(900); }
const saveQ = p.getByRole('button', { name: 'Save as quote' }).first();
await saveQ.scrollIntoViewIfNeeded(); await saveQ.hover(); await pause(2200);

/* ---- Scene 2: saved under the customer ---- */
scene('save'); SLOW = 2.0;
await saveQ.click(); await pause(2600);
await p.getByText('QTE-1001', { exact: true }).first().hover(); await pause(1600);
/* Nothing of it on the board — look, then come back to the customer. */
await p.locator('[title="Close"]').first().click(); await pause(700);
await nav('Dispatch board'); await pause(2600);
await nav('Customers'); await pause(900);
await p.getByText('Barwon Building Supplies', { exact: true }).first().click(); await pause(1300);
await p.getByRole('button', { name: /Quotes/ }).first().click(); await pause(1200);
await p.getByText('QTE-1001', { exact: true }).first().hover(); await pause(1600);

/* ---- Scene 3: the quote, and the printed quotation ---- */
scene('panel'); SLOW = 2.0;
await p.getByText('QTE-1001', { exact: true }).first().click(); await pause(2200);
await p.getByText('Quoted total').first().hover(); await pause(1600);
/* The print dialogue cannot be filmed, so the sheet the office would get is
   shown on screen for a few seconds. The hidden print frame is torn down
   right after print() returns, so its document is caught on the way in. */
await p.evaluate(() => {
  window.__sheetHtml = null;
  new MutationObserver(() => {
    const f = document.querySelector('iframe[title="Print"]');
    if (!f || window.__sheetHtml) return;
    const tick = () => { const d = f.contentDocument; if (d && d.body && d.body.children.length) window.__sheetHtml = d.documentElement.outerHTML; else setTimeout(tick, 50); };
    tick();
  }).observe(document.body, { childList: true });
});
await press(p.getByRole('button', { name: 'Print quote' }).first(), 700, 900);
await p.evaluate(() => {
  const html = window.__sheetHtml || '<p>no sheet</p>';
  const wrap = document.createElement('div');
  wrap.id = 'demo-sheet';
  wrap.style.cssText = 'position:fixed;inset:0;z-index:9999;background:rgba(9,11,21,.72);display:flex;align-items:center;justify-content:center;opacity:0;transition:opacity .4s';
  const f = document.createElement('iframe');
  f.style.cssText = 'width:794px;height:860px;border:0;background:#fff;border-radius:6px;box-shadow:0 30px 80px rgba(0,0,0,.6)';
  f.srcdoc = html;
  wrap.appendChild(f);
  document.body.appendChild(wrap);
  requestAnimationFrame(() => { wrap.style.opacity = '1'; });
});
await pause(4200);
await p.evaluate(() => { const w = document.getElementById('demo-sheet'); if (w) { w.style.opacity = '0'; setTimeout(() => w.remove(), 450); } });
await pause(1200);

/* ---- Scene 4: where the conversation is ---- */
scene('status'); SLOW = 2.0;
await press(p.getByRole('button', { name: 'Mark sent' }).first(), 800, 1500);
await press(p.getByRole('button', { name: 'Mark accepted' }).first(), 800, 1500);
await press(p.getByRole('button', { name: 'Decline' }).first(), 700, 1000);
const why = p.locator('input[placeholder*="Went elsewhere"]').first();
await typeInto(why, 'Job pushed to next month', 60); await pause(700);
await press(p.getByRole('button', { name: 'Mark declined' }).first(), 500, 1500);
await press(p.getByRole('button', { name: 'Reopen' }).first(), 800, 1500);

/* ---- Scene 5: use it for an order ---- */
scene('convert'); SLOW = 2.1;
await press(p.getByRole('button', { name: 'Use for an order' }).first(), 900, 2200);
await p.getByText(/Taking quote QTE-1001/).first().hover(); await pause(1800);
await p.getByText('Total incl. GST').first().hover(); await pause(1600);
const createBtn = p.getByRole('button', { name: /^Create order/ }).first();
await press(createBtn, 900, 2000);
if (await p.getByRole('button', { name: 'Skip' }).count()) { await p.getByRole('button', { name: 'Skip' }).first().click(); await pause(900); }
await p.locator('[draggable=true]', { hasText: 'ORD-91500' }).first().hover().catch(() => {}); await pause(2000);

/* ---- Scene 6: one record ---- */
scene('after'); SLOW = 2.1;
await nav('Customers'); await pause(1000);
await p.getByText('Barwon Building Supplies', { exact: true }).first().click(); await pause(1400);
await p.getByRole('button', { name: /Quotes/ }).first().click(); await pause(1400);
await p.getByText('QTE-1001', { exact: true }).first().click(); await pause(1400);
await p.getByText(/Taken as ORD-91500/).first().hover(); await pause(2200);
await p.locator('[title="Close"]').first().click(); await pause(800);
await nav('Settings'); await pause(1200);
const quotesCard = p.getByText('How long a quote stands', { exact: false }).first();
await quotesCard.scrollIntoViewIfNeeded(); await pause(400);
await quotesCard.hover(); await pause(2600);
endScene();
} catch (e) { console.log('STOPPED:', String(e.message).split('\n')[0]); endScene(); await p.screenshot({ path: OUT + 'fail.png' }).catch(()=>{}); }

fs.writeFileSync(OUT + 'marks.json', JSON.stringify({ t0, marks }, null, 2));
console.log(JSON.stringify(marks));
await ctx.close(); await b.close();
