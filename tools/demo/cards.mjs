import { chromium } from 'playwright-core';
import { CHROME } from './harness.mjs';

/* Title and end cards for a demo, as 1600×900 PNGs. Brand colours and type
   only — no client name, these go on a public channel.
     node tools/demo/cards.mjs <outdir> "<title>" "<subtitle>" */
const [outDir, title, subtitle] = process.argv.slice(2);
const html = (h1, sub, footer) => `<!doctype html><html><head><meta charset="utf-8">
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@500;700&display=swap" rel="stylesheet">
<style>
  html,body{margin:0;width:1600px;height:900px;background:#090b15;font-family:Inter,system-ui,sans-serif;color:#f1f5ff}
  .wrap{position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:18px}
  .mark{width:84px;height:84px;border-radius:22px;background:linear-gradient(135deg,#3b82f6,#06b6d4);display:flex;align-items:center;justify-content:center;margin-bottom:10px}
  .mark svg{width:48px;height:48px}
  h1{margin:0;font-size:64px;font-weight:700;letter-spacing:-0.02em}
  p{margin:0;font-size:26px;color:#a8b3cf;font-weight:500}
  .foot{position:absolute;bottom:56px;font-size:20px;color:#6b7694;letter-spacing:.08em;text-transform:uppercase}
  .glow{position:absolute;width:900px;height:900px;border-radius:50%;background:radial-gradient(closest-side,rgba(59,130,246,.18),transparent);left:350px;top:0}
</style></head><body><div class="glow"></div><div class="wrap">
  <div class="mark"><svg viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M13 2L4 14h7l-1 8 9-12h-7l1-8z"/></svg></div>
  <h1>${h1}</h1><p>${sub}</p></div><div class="foot">${footer}</div></body></html>`;

const b = await chromium.launch({ executablePath: CHROME });
const p = await b.newPage({ viewport: { width: 1600, height: 900 } });
await p.setContent(html(title, subtitle, 'SwiftDispatch Pro'), { waitUntil: 'networkidle' }).catch(() => {});
await p.waitForTimeout(800);
await p.screenshot({ path: outDir + '/title.png' });
await p.setContent(html('SwiftDispatch Pro', 'Order desk, dispatch board and run sheets for a landscape supply yard', 'swiftdispatch.live'), { waitUntil: 'networkidle' }).catch(() => {});
await p.waitForTimeout(800);
await p.screenshot({ path: outDir + '/end.png' });
await b.close();
