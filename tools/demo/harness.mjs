import { N, row } from './mock.mjs';

/* The mocked backend both demo recordings run against: the test rows from
   mock.mjs, creates that echo back with ids, a PIN sign-in that always
   succeeds, and a realtime socket that answers the join so the Live dot is
   green — and that the recording can push a change through, to show a card
   moving because someone else moved it. */
export async function setup(p, { signedIn = false } = {}) {
  let seq = 200;
  let ordNo = 91500;
  const CAP = 1000;
  await p.route('https://fonts.googleapis.com/**', r => r.abort());
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
  /* Registered after the generic REST mock so it wins — Playwright tries the newest route first. */
  await p.route('**/rest/v1/rpc/**', r => {
    const u = r.request().url();
    if (u.includes('next_order_number')) return r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify('ORD-' + (ordNo++)) });
    return r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify([{ id: 'm0', name: 'Logan Reid', role: 'super_admin' }]) });
  });

  const live = { ws: null, joinRef: null, topic: null, ids: {} };
  await p.routeWebSocket(/realtime\/v1\/websocket/, (ws) => {
    live.ws = ws;
    ws.onMessage((raw) => {
      let m; try { m = JSON.parse(String(raw)); } catch { return; }
      const arr = Array.isArray(m);
      const joinRef = arr ? m[0] : null, ref = arr ? m[1] : m.ref, topic = arr ? m[2] : m.topic, event = arr ? m[3] : m.event, payload = arr ? m[4] : m.payload;
      const reply = (resp) => ws.send(arr ? JSON.stringify([joinRef, ref, topic, 'phx_reply', { status: 'ok', response: resp }]) : JSON.stringify({ topic, event: 'phx_reply', payload: { status: 'ok', response: resp }, ref }));
      if (event === 'phx_join') {
        const pcs = (payload && payload.config && payload.config.postgres_changes) || [];
        live.joinRef = joinRef; live.topic = topic; live.arr = arr;
        pcs.forEach((c, i) => { live.ids[c.table] = i + 1; });
        reply({ postgres_changes: pcs.map((c, i) => ({ id: i + 1, ...c })) });
      } else if (event === 'heartbeat' || event === 'access_token') reply({});
    });
  });
  /* Push a change as if another user had made it. */
  const pushChange = (table, type, record, old_record = {}) => {
    if (!live.ws || !live.topic) throw new Error('realtime not joined yet');
    const payload = { ids: [live.ids[table]], data: { schema: 'public', table, commit_timestamp: new Date().toISOString(), type, columns: [], record, old_record, errors: null } };
    live.ws.send(live.arr ? JSON.stringify([live.joinRef, null, live.topic, 'postgres_changes', payload]) : JSON.stringify({ topic: live.topic, event: 'postgres_changes', payload, ref: null }));
  };

  await p.addInitScript((signedIn) => {
    const d = Object.getOwnPropertyDescriptor(HTMLIFrameElement.prototype, 'contentWindow');
    Object.defineProperty(HTMLIFrameElement.prototype, 'contentWindow', { get() { const w = d.get.call(this); if (w && !w.__p) { w.__p = 1; w.print = () => {}; } return w; } });
    if (signedIn) localStorage.setItem('sdp_admin_session', JSON.stringify({ id: 'm0', name: 'Logan Reid', role: 'super_admin' }));
  }, signedIn);
  return { pushChange, live };
}

export const CHROME = process.env.CHROME_PATH || '/opt/pw-browsers/chromium';
