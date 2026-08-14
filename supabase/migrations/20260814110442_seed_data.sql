-- Seed data mirroring the SwiftDispatch Admin design prototype (Surrey Hills Garden Supplies).
-- Fixed UUIDs so the app and later migrations can reference rows deterministically.

-- Suburbs (§5.8: the suburb sets the delivery fee)
insert into public.suburbs (id, name, postcode, state, delivery_fee, active) values
  ('a0000000-0000-4000-8000-000000000001','Belmont','3216','VIC',45,true),
  ('a0000000-0000-4000-8000-000000000002','Grovedale','3216','VIC',45,true),
  ('a0000000-0000-4000-8000-000000000003','Corio','3214','VIC',60,true),
  ('a0000000-0000-4000-8000-000000000004','Geelong West','3218','VIC',38,true),
  ('a0000000-0000-4000-8000-000000000005','South Geelong','3220','VIC',38,true),
  ('a0000000-0000-4000-8000-000000000006','Torquay','3228','VIC',85,true);

insert into public.product_categories (id, name, sort_order) values
  ('b0000000-0000-4000-8000-000000000001','Soils',1),
  ('b0000000-0000-4000-8000-000000000002','Sands',2),
  ('b0000000-0000-4000-8000-000000000003','Aggregates',3),
  ('b0000000-0000-4000-8000-000000000004','Mulches',4),
  ('b0000000-0000-4000-8000-000000000005','Bagged',5);

insert into public.products (id, sku, name, category_id, unit, price, stock, kind, fractional) values
  ('c0000000-0000-4000-8000-000000000001','SOIL-TS','Screened topsoil','b0000000-0000-4000-8000-000000000001','m³',68,42,'single',null),
  ('c0000000-0000-4000-8000-000000000002','SOIL-GM','Garden mix premium','b0000000-0000-4000-8000-000000000001','m³',82,8,'single',null),
  ('c0000000-0000-4000-8000-000000000003','SAND-YL','Yellow sand','b0000000-0000-4000-8000-000000000002','m³',74,120,'single',null),
  ('c0000000-0000-4000-8000-000000000004','SAND-PK','Packing sand','b0000000-0000-4000-8000-000000000002','m³',66,96,'single',null),
  ('c0000000-0000-4000-8000-000000000005','AGG-C3','Class 3 crushed rock','b0000000-0000-4000-8000-000000000003','t',58,240,'single',null),
  ('c0000000-0000-4000-8000-000000000006','AGG-RCC','Recycled crushed concrete','b0000000-0000-4000-8000-000000000003','t',46,310,'single',null),
  ('c0000000-0000-4000-8000-000000000007','MUL-PB','Pine bark mulch','b0000000-0000-4000-8000-000000000004','m³',64,64,'single',null),
  ('c0000000-0000-4000-8000-000000000008','MUL-RG','Red gum chip','b0000000-0000-4000-8000-000000000004','m³',88,12,'single',null),
  ('c0000000-0000-4000-8000-000000000009','BAG-CEM','Cement 20kg','b0000000-0000-4000-8000-000000000005','bag',12.5,0,'variable',null);

insert into public.product_variants (id, product_id, name, sku, price, stock) values
  ('c1000000-0000-4000-8000-000000000001','c0000000-0000-4000-8000-000000000009','20 kg bag','BAG-CEM-20',12.5,180),
  ('c1000000-0000-4000-8000-000000000002','c0000000-0000-4000-8000-000000000009','Pallet of 60','BAG-CEM-PAL',690,6);

insert into public.specials (id, name, kind, value, scope, category_id, from_date, to_date, active) values
  ('b1000000-0000-4000-8000-000000000001','Spring mulch run-out','percent',15,'category','b0000000-0000-4000-8000-000000000004','2026-09-01','2026-09-30',true),
  ('b1000000-0000-4000-8000-000000000002','Bulk fill clearance','amount',6,'products',null,null,null,true);
insert into public.special_products (special_id, product_id) values
  ('b1000000-0000-4000-8000-000000000002','c0000000-0000-4000-8000-000000000006');

insert into public.team_members (id, name, role, email, phone, active, pin, is_owner) values
  ('d0000000-0000-4000-8000-000000000001','Logan Reid','super_admin','logan@surreyhillsgardensupplies.com.au','03 9890 3901',true,'1004',true),
  ('d0000000-0000-4000-8000-000000000002','Bec Tran','admin','bec@surreyhillsgardensupplies.com.au','0412 004 887',true,'2288',false),
  ('d0000000-0000-4000-8000-000000000003','Marco Silva','admin','marco@surreyhillsgardensupplies.com.au','0455 210 774',true,'3391',false),
  ('d0000000-0000-4000-8000-000000000004','Dan Whitlock','driver',null,'0417 883 220',true,'5190',false),
  ('d0000000-0000-4000-8000-000000000005','Pete Nardella','driver',null,'0428 119 664',true,'7724',false),
  ('d0000000-0000-4000-8000-000000000006','Sam Oakley','driver',null,'0402 771 335',false,null,false);

insert into public.trucks (id, rego, type, status, capacity_tonnes, fuel, year, notes) values
  ('e0000000-0000-4000-8000-000000000001','RXK 442','large','Assigned',12,'Diesel',2021,null),
  ('e0000000-0000-4000-8000-000000000002','QQF 118','medium','Assigned',8,'Diesel',2019,null),
  ('e0000000-0000-4000-8000-000000000003','WMS 906','tipper','Loading',22,'Diesel',2020,'4 tonne clearance W:2.6M x L:6M x H:2.5M. Tilt up H:4.8M — bulka bags 3 on pallets, bulka bags 4 no pallets.'),
  ('e0000000-0000-4000-8000-000000000004','TDA 771','small','Available',4,'Diesel',2022,null),
  ('e0000000-0000-4000-8000-000000000005','JLK 220','float','Available',3,'Diesel',2018,'Clearance W:2.2M x L:4.8M x H:2.2M. Tilt up H:3.8M — bulka bags 2.'),
  ('e0000000-0000-4000-8000-000000000006','BHF 385','crane','Out of service',10,'Diesel',2017,'Clearance needed forked off W:2.5M x L:7.5M x H:3M. Clearance needed craned off W:4.3M x L:7.5M x H:4M.');

insert into public.customers (id, account_number, name, entity, abn, tier, billing, terms_days, credit_limit, balance, stop_credit, customer_since, billing_street, billing_suburb_id, portal_enabled, portal_pin) values
  ('f0000000-0000-4000-8000-000000000001','10428','Surrey Hills Nursery','Company','44 118 902 331','Trade','account',30,20000,12480.50,false,'2019-03-01','88 Barwon Heads Rd','a0000000-0000-4000-8000-000000000001',true,'4471'),
  ('f0000000-0000-4000-8000-000000000002','10511','Geelong Civil Works','Company','77 220 448 190','Trade','account',30,30000,8120,false,'2021-07-01','210 Fyans St','a0000000-0000-4000-8000-000000000005',false,null),
  ('f0000000-0000-4000-8000-000000000003','10604','Corio Concreting','Sole trader','61 903 118 774','Trade','prepaid',null,0,0,false,'2024-01-01','18 Purnell Rd','a0000000-0000-4000-8000-000000000003',false,null),
  ('f0000000-0000-4000-8000-000000000004','10618','Tucker Paving','Company','38 771 002 645','Trade','account',7,6000,2325,false,'2022-05-01','3 Sylvan St','a0000000-0000-4000-8000-000000000002',false,null),
  ('f0000000-0000-4000-8000-000000000005','10702','Bayside Landscapes','Company','12 448 903 771','Trade','account',30,4000,4412,false,'2020-09-01','14 Wharf Rd','a0000000-0000-4000-8000-000000000001',false,null),
  ('f0000000-0000-4000-8000-000000000006','10788','D. Pearce','Individual',null,'Retail','prepaid',null,0,0,false,'2026-06-01','6 Rosedale Cr','a0000000-0000-4000-8000-000000000002',false,null),
  ('f0000000-0000-4000-8000-000000000007','10801','Barwon Building Supplies','Company','90 118 774 220','Trade','account',30,40000,21908,false,'2018-02-01','9 Gordon Ave','a0000000-0000-4000-8000-000000000004',true,'8823');

insert into public.customer_contacts (id, customer_id, name, phone, email, roles) values
  ('f1000000-0000-4000-8000-000000000001','f0000000-0000-4000-8000-000000000001','Marcus Hale','0412 884 210','marcus@shnursery.com.au','{Orders,Site}'),
  ('f1000000-0000-4000-8000-000000000002','f0000000-0000-4000-8000-000000000001','Bec Tran','03 5229 8800','accounts@shnursery.com.au','{Accounts}'),
  ('f1000000-0000-4000-8000-000000000003','f0000000-0000-4000-8000-000000000002','Rhys Callow','03 5221 4400','rhys@gcw.com.au','{Orders}'),
  ('f1000000-0000-4000-8000-000000000004','f0000000-0000-4000-8000-000000000002','Site foreman','0428 771 004','site@gcw.com.au','{Site}'),
  ('f1000000-0000-4000-8000-000000000005','f0000000-0000-4000-8000-000000000003','Ash Meade','0417 662 303','ash@corioconcreting.com.au','{Orders,Accounts}'),
  ('f1000000-0000-4000-8000-000000000006','f0000000-0000-4000-8000-000000000004','Jed Tucker','0417 662 303','jed@tuckerpaving.com.au','{Orders,Accounts}'),
  ('f1000000-0000-4000-8000-000000000007','f0000000-0000-4000-8000-000000000005','Nina Farr','0412 884 210','nina@baysidelandscapes.com.au','{Orders}'),
  ('f1000000-0000-4000-8000-000000000008','f0000000-0000-4000-8000-000000000005','Paul Farr','0455 210 118','accounts@baysidelandscapes.com.au','{Accounts}'),
  ('f1000000-0000-4000-8000-000000000009','f0000000-0000-4000-8000-000000000006','Dean Pearce','0455 210 908','dpearce@outlook.com','{Orders}'),
  ('f1000000-0000-4000-8000-000000000010','f0000000-0000-4000-8000-000000000007','Kate Sammut','03 5278 1200','kate@barwonbuilding.com.au','{Orders}'),
  ('f1000000-0000-4000-8000-000000000011','f0000000-0000-4000-8000-000000000007','Ledger inbox','03 5278 1201','ap@barwonbuilding.com.au','{Accounts}');

insert into public.customer_sites (customer_id, label, street, suburb_id, is_default) values
  ('f0000000-0000-4000-8000-000000000001','Main yard','88 Barwon Heads Rd','a0000000-0000-4000-8000-000000000001',true),
  ('f0000000-0000-4000-8000-000000000001','Grovedale lot','12 Reserve Rd','a0000000-0000-4000-8000-000000000002',false),
  ('f0000000-0000-4000-8000-000000000002','Head office','210 Fyans St','a0000000-0000-4000-8000-000000000005',true),
  ('f0000000-0000-4000-8000-000000000003','Depot','18 Purnell Rd','a0000000-0000-4000-8000-000000000003',true),
  ('f0000000-0000-4000-8000-000000000004','Yard','3 Sylvan St','a0000000-0000-4000-8000-000000000002',true),
  ('f0000000-0000-4000-8000-000000000005','Office','14 Wharf Rd','a0000000-0000-4000-8000-000000000001',true),
  ('f0000000-0000-4000-8000-000000000006','Home','6 Rosedale Cr','a0000000-0000-4000-8000-000000000002',true),
  ('f0000000-0000-4000-8000-000000000007','Store','9 Gordon Ave','a0000000-0000-4000-8000-000000000004',true),
  ('f0000000-0000-4000-8000-000000000007','Torquay branch','6 Ryrie St','a0000000-0000-4000-8000-000000000006',false);

-- Board orders (design SEED). Times in Australia/Melbourne (UTC+10 in September).
insert into public.orders
  (id, order_number, kind, customer_id, walk_in_name, status, method, street, suburb_id, delivery_fee, fee_source,
   delivery_date, delivery_window, placed_at, truck_id, driver_id, payment_method, payment_status,
   order_notes, processed_at) values
  ('01000000-0000-4000-8000-000000000001','ORD-531085','standard','f0000000-0000-4000-8000-000000000006',null,'requested','pickup','Yard collection — Bay 2',null,0,'suburb','2026-09-11','12:00 – 16:00','2026-09-09 10:31+10:00',null,null,null,'pending',null,null),
  ('01000000-0000-4000-8000-000000000002','ORD-531088','standard','f0000000-0000-4000-8000-000000000003',null,'requested','delivery','18 Purnell Rd','a0000000-0000-4000-8000-000000000003',60,'suburb','2026-09-11','ASAP','2026-09-09 11:02+10:00',null,null,null,'pending','Tight driveway — 6-wheeler only.',null),
  ('01000000-0000-4000-8000-000000000003','ORD-531061','standard','f0000000-0000-4000-8000-000000000002',null,'preparing','delivery','210 Fyans St','a0000000-0000-4000-8000-000000000005',38,'suburb','2026-09-10','07:00 – 11:00','2026-09-07 14:45+10:00','e0000000-0000-4000-8000-000000000003','d0000000-0000-4000-8000-000000000006','on_account','invoiced',null,'2026-09-09 09:12+10:00'),
  ('01000000-0000-4000-8000-000000000004','ORD-531070','standard','f0000000-0000-4000-8000-000000000004',null,'preparing','delivery','3 Sylvan St','a0000000-0000-4000-8000-000000000002',45,'suburb','2026-09-10','11:00 – 15:00','2026-09-08 08:20+10:00',null,null,'card_on_file','paid',null,null),
  ('01000000-0000-4000-8000-000000000005','ORD-531055','standard','f0000000-0000-4000-8000-000000000002',null,'loading','delivery','41 Pioneer Rd','a0000000-0000-4000-8000-000000000002',45,'suburb','2026-09-09','07:00 – 11:00','2026-09-06 13:02+10:00',null,null,'on_account','invoiced',null,null),
  ('01000000-0000-4000-8000-000000000006','ORD-531048','standard','f0000000-0000-4000-8000-000000000006',null,'en_route','delivery','12 Anakie Rd','a0000000-0000-4000-8000-000000000004',38,'suburb','2026-09-09','11:00 – 15:00','2026-09-06 15:55+10:00','e0000000-0000-4000-8000-000000000002','d0000000-0000-4000-8000-000000000004','card','paid',null,null),
  ('01000000-0000-4000-8000-000000000007','ORD-530998','standard','f0000000-0000-4000-8000-000000000007',null,'delivered','delivery','9 Gordon Ave','a0000000-0000-4000-8000-000000000004',38,'suburb','2026-09-08','07:00 – 11:00','2026-09-05 07:48+10:00','e0000000-0000-4000-8000-000000000001','d0000000-0000-4000-8000-000000000005','on_account','paid',null,null),
  ('01000000-0000-4000-8000-000000000008','ORD-531042','standard','f0000000-0000-4000-8000-000000000005',null,'on_hold','delivery','14 Wharf Rd','a0000000-0000-4000-8000-000000000001',45,'suburb','2026-09-10','07:00 – 11:00','2026-09-08 16:12+10:00',null,null,'card','failed',null,null);

-- The split group: master ORD-531082 + children A/B (§5.1)
insert into public.orders
  (id, order_number, kind, parent_order_id, customer_id, status, method, street, suburb_id, delivery_fee, fee_source,
   delivery_date, delivery_window, placed_at, truck_id, driver_id, payment_method, payment_status, overrides, processed_at) values
  ('01000000-0000-4000-8000-000000000010','ORD-531082','master',null,'f0000000-0000-4000-8000-000000000001','preparing','delivery','88 Barwon Heads Rd','a0000000-0000-4000-8000-000000000001',45,'suburb','2026-09-11','07:00 – 11:00','2026-09-09 09:04+10:00',null,null,'on_account','invoiced','{}','2026-09-09 09:12+10:00'),
  ('01000000-0000-4000-8000-000000000011','ORD-531082-A','split','01000000-0000-4000-8000-000000000010','f0000000-0000-4000-8000-000000000001','preparing','delivery','88 Barwon Heads Rd','a0000000-0000-4000-8000-000000000001',45,'suburb','2026-09-11','07:00 – 11:00','2026-09-09 09:04+10:00','e0000000-0000-4000-8000-000000000001','d0000000-0000-4000-8000-000000000004','on_account','invoiced','{}',null),
  ('01000000-0000-4000-8000-000000000012','ORD-531082-B','split','01000000-0000-4000-8000-000000000010','f0000000-0000-4000-8000-000000000001','requested','delivery','6 Ryrie St','a0000000-0000-4000-8000-000000000006',85,'suburb','2026-09-11','13:00 – 16:00','2026-09-09 09:04+10:00',null,null,'on_account','invoiced','{"schedule": true, "address": true}',null);

-- Historical delivered orders so customer order histories have depth
insert into public.orders
  (id, order_number, kind, customer_id, status, method, street, suburb_id, delivery_fee, fee_source, delivery_date, delivery_window, placed_at, payment_method, payment_status) values
  ('01000000-0000-4000-8000-000000000020','ORD-530944','standard','f0000000-0000-4000-8000-000000000001','delivered','delivery','88 Barwon Heads Rd','a0000000-0000-4000-8000-000000000001',45,'suburb','2026-08-28','07:00 – 11:00','2026-08-28 08:00+10:00','on_account','paid'),
  ('01000000-0000-4000-8000-000000000021','ORD-530812','standard','f0000000-0000-4000-8000-000000000001','delivered','delivery','12 Reserve Rd','a0000000-0000-4000-8000-000000000002',45,'suburb','2026-08-14','11:00 – 15:00','2026-08-14 09:30+10:00','on_account','paid'),
  ('01000000-0000-4000-8000-000000000022','ORD-530901','standard','f0000000-0000-4000-8000-000000000002','delivered','delivery','210 Fyans St','a0000000-0000-4000-8000-000000000005',38,'suburb','2026-08-22','07:00 – 11:00','2026-08-22 07:15+10:00','on_account','paid'),
  ('01000000-0000-4000-8000-000000000023','ORD-530770','standard','f0000000-0000-4000-8000-000000000005','delivered','delivery','14 Wharf Rd','a0000000-0000-4000-8000-000000000001',45,'suburb','2026-08-02','11:00 – 15:00','2026-08-02 10:00+10:00','on_account','invoiced'),
  ('01000000-0000-4000-8000-000000000024','ORD-530855','standard','f0000000-0000-4000-8000-000000000007','delivered','delivery','9 Gordon Ave','a0000000-0000-4000-8000-000000000004',38,'suburb','2026-08-18','07:00 – 11:00','2026-08-18 07:45+10:00','on_account','invoiced');

-- Line items (§5.2: the one source of truth)
insert into public.order_items (order_id, product_id, qty, unit_price, description) values
  ('01000000-0000-4000-8000-000000000001','c0000000-0000-4000-8000-000000000007',3,64,null),
  ('01000000-0000-4000-8000-000000000001','c0000000-0000-4000-8000-000000000009',12,12.5,null),
  ('01000000-0000-4000-8000-000000000002','c0000000-0000-4000-8000-000000000003',12,74,null),
  ('01000000-0000-4000-8000-000000000002','c0000000-0000-4000-8000-000000000004',8,66,null),
  ('01000000-0000-4000-8000-000000000002','c0000000-0000-4000-8000-000000000009',20,12.5,null),
  ('01000000-0000-4000-8000-000000000003','c0000000-0000-4000-8000-000000000005',42,58,null),
  ('01000000-0000-4000-8000-000000000003','c0000000-0000-4000-8000-000000000006',24,46,null),
  ('01000000-0000-4000-8000-000000000003','c0000000-0000-4000-8000-000000000004',6,66,null),
  ('01000000-0000-4000-8000-000000000004','c0000000-0000-4000-8000-000000000004',24,66,null),
  ('01000000-0000-4000-8000-000000000004','c0000000-0000-4000-8000-000000000005',12,58,null),
  ('01000000-0000-4000-8000-000000000005','c0000000-0000-4000-8000-000000000002',22,82,null),
  ('01000000-0000-4000-8000-000000000005','c0000000-0000-4000-8000-000000000001',14,68,null),
  ('01000000-0000-4000-8000-000000000006','c0000000-0000-4000-8000-000000000006',34,46,null),
  ('01000000-0000-4000-8000-000000000007','c0000000-0000-4000-8000-000000000005',96,58,null),
  ('01000000-0000-4000-8000-000000000007','c0000000-0000-4000-8000-000000000009',40,12.5,null),
  ('01000000-0000-4000-8000-000000000007','c0000000-0000-4000-8000-000000000008',12,88,null),
  ('01000000-0000-4000-8000-000000000008','c0000000-0000-4000-8000-000000000001',14,68,null),
  ('01000000-0000-4000-8000-000000000008','c0000000-0000-4000-8000-000000000007',3,64,null),
  ('01000000-0000-4000-8000-000000000011','c0000000-0000-4000-8000-000000000002',12,82,null),
  ('01000000-0000-4000-8000-000000000011','c0000000-0000-4000-8000-000000000007',10,64,null),
  ('01000000-0000-4000-8000-000000000012','c0000000-0000-4000-8000-000000000003',6,74,null),
  ('01000000-0000-4000-8000-000000000012','c0000000-0000-4000-8000-000000000009',40,12.5,null),
  ('01000000-0000-4000-8000-000000000010',null,-2,22,'Bulka bag returned — credit'),
  ('01000000-0000-4000-8000-000000000020','c0000000-0000-4000-8000-000000000002',30,82,null),
  ('01000000-0000-4000-8000-000000000020','c0000000-0000-4000-8000-000000000007',10,64,null),
  ('01000000-0000-4000-8000-000000000021','c0000000-0000-4000-8000-000000000001',60,68,null),
  ('01000000-0000-4000-8000-000000000021','c0000000-0000-4000-8000-000000000005',44,58,null),
  ('01000000-0000-4000-8000-000000000022','c0000000-0000-4000-8000-000000000006',70,46,null),
  ('01000000-0000-4000-8000-000000000022','c0000000-0000-4000-8000-000000000005',14,58,null),
  ('01000000-0000-4000-8000-000000000023','c0000000-0000-4000-8000-000000000008',24,88,null),
  ('01000000-0000-4000-8000-000000000023','c0000000-0000-4000-8000-000000000007',16,64,null),
  ('01000000-0000-4000-8000-000000000024','c0000000-0000-4000-8000-000000000005',180,58,null),
  ('01000000-0000-4000-8000-000000000024','c0000000-0000-4000-8000-000000000009',240,12.5,null);

insert into public.payments (order_id, customer_id, amount, method, status, paid_at, created_at) values
  ('01000000-0000-4000-8000-000000000002','f0000000-0000-4000-8000-000000000003',1914,'card','pending',null,'2026-09-09 11:05+10:00'),
  ('01000000-0000-4000-8000-000000000001','f0000000-0000-4000-8000-000000000006',580,'cash','paid','2026-09-09 10:35+10:00','2026-09-09 10:35+10:00'),
  ('01000000-0000-4000-8000-000000000004','f0000000-0000-4000-8000-000000000004',2290,'card_on_file','paid','2026-09-08 08:25+10:00','2026-09-08 08:25+10:00'),
  ('01000000-0000-4000-8000-000000000008','f0000000-0000-4000-8000-000000000005',1180,'card','failed',null,'2026-09-08 16:15+10:00'),
  ('01000000-0000-4000-8000-000000000003','f0000000-0000-4000-8000-000000000002',4120,'on_account','invoiced',null,'2026-09-07 14:50+10:00'),
  ('01000000-0000-4000-8000-000000000007','f0000000-0000-4000-8000-000000000007',8268,'on_account','invoiced',null,'2026-09-05 07:50+10:00');

insert into public.statements (customer_id, ref, period_start, period_end, scope, status, amount) values
  ('f0000000-0000-4000-8000-000000000001','STM-10428-08','2026-08-01','2026-08-31','all','invoiced',12480.50),
  ('f0000000-0000-4000-8000-000000000001','STM-10428-07','2026-07-01','2026-07-31','all','paid',6240.25),
  ('f0000000-0000-4000-8000-000000000007','STM-10801-08','2026-08-01','2026-08-31','all','invoiced',21908);

insert into public.business_settings (id, name, email, phone, website, address, abn, hours) values
  (true,'Surrey Hills Garden Supplies','sales@surreyhillsgardensupplies.com.au','(03) 9890 3901','surreyhillsgardensupplies.com.au','680 Canterbury Road, Surrey Hills, Vic. 3127','58 004 771 220','Mon–Sat 7:00–16:00');

insert into public.payment_settings (id, markup_type, markup_value, fuel_surcharge) values (true,'fixed',5,5);

insert into public.integration_settings (key, connected, account, field_a, field_b, auto_sync, last_synced) values
  ('myob',true,'logan@surreyhillsgardensupplies.com.au','ARL-Surrey-Hills','6:00 AM daily',true,'2026-09-09 06:00:02+10:00'),
  ('mycrmsim',false,null,null,null,false,null),
  ('sheets',true,'jay@localservicepro.com.au','1JG3ogyd5F0W78KWjB0A_loPBsCcbkE2USh0EMU_LFqE','March 2026',true,'2026-08-12 14:08:39+10:00');

insert into public.email_settings (key, enabled) values
  ('confirm',true),('status',true),('receipt',false),('pin',true),('statement',true);
