/* Shared mock of the Supabase REST surface for the browser checks. */
export const CAP = 1000;
export const N = {
  products: 40, product_categories: 6, suburbs: 6, customers: 8, customer_contacts: 8,
  customer_sites: 10, orders: 14, order_items: 30, trucks: 3, team_members: 4,
  specials: 0, payments: 0, statements: 0, product_variants: 0, special_products: 0,
};
const NAMES = ['20mm Crushed Rock','White Brick Sand','Red Gum Mulch','Cement Australia GP','Sandy Loam','Pine Bark'];
const CUSTS = ['Barwon Building Supplies','Dean Pearce','Hilltop Landscapes','Marcus Ng','Riverside Civic','Two Bays Nursery','Wattle Grove Pty Ltd','Zenith Paving'];
const YM = new Date().toISOString().slice(0,7);
const STATUSES = ['requested','preparing','preparing','loading','en_route','delivered','on_hold'];

export const row = (t, i) => {
  if (t === 'products') return { id:'p'+i, sku:'SKU'+(100+i), name: NAMES[i%6] + (i>5 ? ' '+i : ''),
    category_id:'g'+(i%6), unit: i%3===0?'m³':(i%3===1?'t':'bag'), fractional: i%3!==2,
    kind:'single', price: 60+i, stock: 0, track_stock: false, image_url: null, active: true,
    created_at:'2026-01-01T00:00:00Z' };
  if (t === 'orders') {
    const st = STATUSES[i % STATUSES.length];
    const day = 9 + (i % 10);
    return { id:'o'+i, order_number:'ORD-90'+(100+i), kind: i===5 ? 'yard_sale' : 'standard', board_rank: null, paid_at: null, booked_total: i===9 ? 999.99 : null, parent_order_id:null,
      customer_id:'c'+(i%8), contact_id:null, walk_in_name:null, customer_override:null, status: st,
      method:'delivery', street:(10+i)+' Reserve Road', suburb_id:'s'+(i%6), delivery_fee:15,
      fee_source:'suburb', delivery_date: YM+'-'+String(day).padStart(2,'0'),
      delivery_window:'11:00 – 15:00', placed_at: YM+'-'+String(day).padStart(2,'0')+'T02:00:00Z',
      truck_id: i%2? 't0':null, driver_id: i%2? 'm2':null, payment_type:'account_30',
      payment_type_overridden:false, payment_method:'on_account',
      payment_status: st==='delivered'?'paid':'invoiced', po_number:'PO-'+i,
      order_notes: i%4===0 ? 'Invoice to head office, not site.' : null,
      delivery_notes: i%3===0 ? 'Second driveway past the shed. Dog on the property — ring first.' : null,
      adjustment_type:null, adjustment_value:null, processed_at:null, overrides:{}, fuel_surcharge:0,
      pod_photo_url:null, pod_at:null, myob_uid:null, myob_doc_type:null, myob_number:null,
      myob_pushed_at:null, myob_error:null, deleted_at:null,
      created_at:'2026-09-01T00:00:00Z', updated_at:'2026-09-01T00:00:00Z' };
  }
  if (t === 'order_items') return { id:'i'+i, order_id:'o'+(i%N.orders), product_id:'p'+(i%40),
    variant_id:null, description:null, qty: 0.5+(i%4), unit_price: 60+(i%40), line_total: (0.5+(i%4))*(60+(i%40)), backordered: i===3,
    created_at:'2026-09-01T00:00:00Z' };
  if (t === 'product_categories') return { id:'g'+i, name:(['Bulk Products','Bag Products','Cement','Mulch','Sand','Tool Shop'][i] || ('Category ' + i)), sort_order:i };
  if (t === 'suburbs') return { id:'s'+i, name:['Surrey Hills','Box Hill','Camberwell','Balwyn','Kew','Hawthorn'][i%6],
    postcode: i===5 ? '2000' : '312'+(i%6), state: i===5 ? 'NSW' : 'VIC', delivery_fee:15+i, active:true, created_at:'2026-01-01T00:00:00Z' };
  if (t === 'customers') return { id:'c'+i, account_number:'108'+(10+i), name:CUSTS[i%8], entity: i%3===1?'Individual':'Company',
    abn:null, tier: i%2?'Trade':'Retail', billing: i%3===0?'account':'prepaid', terms_days: i%3===0?(i===3?7:30):null, card_on_file: i===4,
    credit_limit: i%3===0?10000:0, balance: i===3?12000:500, stop_credit: i===6, customer_since:'2024-01-01',
    billing_street:null, billing_suburb_id:null, portal_enabled:false, portal_pin:null, myob_uid:null,
    archived_at:null, created_at:'2024-01-01T00:00:00Z' };
  if (t === 'customer_contacts') return { id:'k'+i, customer_id:'c'+(i%8), name:'Contact '+i, phone:'041200000'+i, email:null, roles:['Orders'] };
  if (t === 'customer_sites') return { id:'st'+i, customer_id:'c'+(i%8), label: i<3 ? 'Back paddock' : 'Surrey Hills',
    street:(20+i)+' Union Road', suburb_id:'s'+(i%6), is_default: i<8, auto_captured: i>=3,
    last_used_at:'2026-0'+(1+(i%8))+'-01T00:00:00Z', created_at:'2025-01-01T00:00:00Z' };
  if (t === 'trucks') return { id:'t'+i, rego:'ABC'+(100+i), type:'medium', status:'Available',
    capacity_tonnes:8, fuel:null, year:null, last_maintenance:null, next_maintenance:null, notes:null };
  if (t === 'team_members') return { id:'m'+i, name:['Logan Reid','Priya Shah','Dave Kelly','Sam Whitlock'][i],
    role:['super_admin','admin','driver','admin'][i], email:null, phone:null, active:true, pin:'111'+i, is_owner:i===0 };
  return { id: t + i };
};

export async function install(p) {
  await p.route('https://fonts.googleapis.com/**', r => r.abort());
  await p.route('**/rest/v1/rpc/**', r => r.fulfill({ status:200, contentType:'application/json',
    body: JSON.stringify([{ id:'m0', name:'Logan Reid', role:'super_admin' }]) }));
  await p.route('**/rest/v1/**', async (route) => {
    const req = route.request();
    if (req.method() !== 'GET') return route.fulfill({ status:200, contentType:'application/json', body:'[]' });
    const url = new URL(req.url());
    const table = url.pathname.split('/rest/v1/')[1];
    const from = Number(url.searchParams.get('offset')||0);
    const limit = Math.min(Number(url.searchParams.get('limit')||CAP), CAP);
    const total = N[table] ?? 0;
    const to = Math.min(from+limit-1, total-1);
    const body=[]; for (let i=from;i<=to;i++) body.push(row(table,i));
    await route.fulfill({ status:200, contentType:'application/json',
      headers:{ 'content-range':`${from}-${to}/${total}`, 'access-control-expose-headers':'Content-Range' },
      body: JSON.stringify(body) });
  });
  await p.addInitScript(() => localStorage.setItem('sdp_admin_session', JSON.stringify({ id:'m0', name:'Logan Reid', role:'super_admin' })));
}
