# Migrations

These files mirror the migrations applied to the Supabase project **New SwiftDispatch**
(`zksvmdbnlpwrrfbtvksl`, ap-southeast-2) via the Supabase MCP on 2026-08-14:

| Version        | Name                   |
| -------------- | ---------------------- |
| 20260814105923 | core_schema            |
| 20260814110125 | functions_and_triggers |
| 20260814110211 | rls_policies           |
| 20260814110442 | seed_data              |

Apply order matters. The schema encodes the rebuild brief's architectural fixes:

- **§5.1** — split orders reference their master (`orders.parent_order_id`); the
  `sync_split_children` trigger propagates address/fee/schedule from the master to
  every split that has not explicitly overridden them (`orders.overrides` jsonb).
- **§5.2** — `order_items` is the only source of truth for line items. No JSON blob
  exists anywhere; `order_totals` view derives every total from these rows.
- **§5.3** — `payment_type` (billing relationship, derived from the customer via the
  `orders_default_payment_type` trigger) is a separate column from `payment_method`
  (how one transaction settled). `statement_eligible_orders` view derives statement
  eligibility from the relationship — never an order-level flag.
- **§5.5** — `payment_method` is nullable; null renders as "— Not set —" in the UI
  and is never silently defaulted.
- **§5.8** — delivery fees resolve from `suburbs.delivery_fee` via `orders.suburb_id`.
  A suburb with no rate (or switched off) blocks the order rather than charging zero.

RLS is enabled on every table. Because the admin app authenticates with a staff PIN
(`admin_login` RPC) rather than Supabase Auth at this stage, policies currently grant
the API roles full access — RLS is the enforcement point to tighten (switch policies
to `to authenticated` + role checks) once Supabase Auth is wired in, without schema
changes.
