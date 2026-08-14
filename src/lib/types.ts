/* Row types mirroring the Supabase schema (supabase/migrations). Option lists in
   the UI are generated from these unions so a select can never omit a stored
   value (§5.5 of the rebuild brief). */

export type OrderStatus =
  | "requested"
  | "preparing"
  | "loading"
  | "en_route"
  | "delivered"
  | "on_hold"
  | "cancelled"
  | "ready_for_pickup";

export type PaymentStatus = "pending" | "paid" | "invoiced" | "failed" | "refunded";

export type PaymentMethod =
  | "cash"
  | "card"
  | "cod"
  | "card_on_file"
  | "direct_debit"
  | "invoice"
  | "on_account";

export type PaymentType = "prepaid" | "account_7" | "account_14" | "account_30";
export type FulfilmentMethod = "delivery" | "pickup";
export type FeeSource = "suburb" | "manual";
export type OrderKind = "standard" | "master" | "split" | "yard_sale";
export type CustomerEntity = "Individual" | "Sole trader" | "Company";
export type CustomerTier = "Retail" | "Trade";
export type BillingType = "prepaid" | "account";
export type TeamRole = "super_admin" | "admin" | "driver";
export type TruckType = "crane" | "small" | "medium" | "large" | "semi" | "tipper" | "float";
export type TruckStatus = "Available" | "Loading" | "Assigned" | "Out of service";
export type ProductUnit = "m³" | "t" | "kg" | "bag" | "each" | "pallet";

export const PAYMENT_METHODS: { value: PaymentMethod; label: string }[] = [
  { value: "cash", label: "Cash" },
  { value: "card", label: "Card" },
  { value: "cod", label: "COD" },
  { value: "card_on_file", label: "Card on file" },
  { value: "direct_debit", label: "Direct debit" },
  { value: "invoice", label: "Invoice" },
  { value: "on_account", label: "On account" },
];

export const PAYMENT_TYPE_LABEL: Record<PaymentType, string> = {
  prepaid: "Prepaid",
  account_7: "7-day account",
  account_14: "14-day account",
  account_30: "30-day account",
};

export interface Suburb {
  id: string;
  name: string;
  postcode: string;
  state: string;
  delivery_fee: number | null;
  active: boolean;
}

export interface ProductCategory {
  id: string;
  name: string;
  sort_order: number;
}

export interface ProductVariant {
  id: string;
  product_id: string;
  name: string;
  sku: string;
  price: number;
  stock: number;
}

export interface Product {
  id: string;
  sku: string;
  name: string;
  category_id: string | null;
  unit: ProductUnit;
  fractional: boolean | null;
  kind: "single" | "variable";
  price: number;
  stock: number;
  image_url: string | null;
  active: boolean;
  variants?: ProductVariant[];
}

export interface Special {
  id: string;
  name: string;
  kind: "percent" | "amount";
  value: number;
  scope: "all" | "category" | "products";
  category_id: string | null;
  from_date: string | null;
  to_date: string | null;
  active: boolean;
  product_ids?: string[];
}

export interface TeamMember {
  id: string;
  name: string;
  role: TeamRole;
  email: string | null;
  phone: string | null;
  active: boolean;
  pin: string | null;
  is_owner: boolean;
}

export interface Truck {
  id: string;
  rego: string;
  type: TruckType;
  status: TruckStatus;
  capacity_tonnes: number | null;
  fuel: string | null;
  year: number | null;
  last_maintenance: string | null;
  next_maintenance: string | null;
  notes: string | null;
}

export interface CustomerContact {
  id: string;
  customer_id: string;
  name: string;
  phone: string | null;
  email: string | null;
  roles: string[];
}

export interface CustomerSite {
  id: string;
  customer_id: string;
  label: string;
  street: string;
  suburb_id: string | null;
  is_default: boolean;
}

export interface Customer {
  id: string;
  account_number: string;
  name: string;
  entity: CustomerEntity;
  abn: string | null;
  tier: CustomerTier;
  billing: BillingType;
  terms_days: number | null;
  credit_limit: number;
  balance: number;
  stop_credit: boolean;
  customer_since: string;
  billing_street: string | null;
  billing_suburb_id: string | null;
  portal_enabled: boolean;
  portal_pin: string | null;
  contacts: CustomerContact[];
  sites: CustomerSite[];
}

export interface OrderItem {
  id: string;
  order_id: string;
  product_id: string | null;
  variant_id: string | null;
  description: string | null;
  qty: number;
  unit_price: number;
  line_total: number;
}

export interface Order {
  id: string;
  order_number: string;
  kind: OrderKind;
  parent_order_id: string | null;
  customer_id: string | null;
  contact_id: string | null;
  walk_in_name: string | null;
  customer_override: Record<string, string> | null;
  status: OrderStatus;
  method: FulfilmentMethod;
  street: string | null;
  suburb_id: string | null;
  delivery_fee: number | null;
  fee_source: FeeSource;
  delivery_date: string | null;
  delivery_window: string | null;
  placed_at: string;
  truck_id: string | null;
  driver_id: string | null;
  payment_type: PaymentType | null;
  payment_type_overridden: boolean;
  payment_method: PaymentMethod | null;
  payment_status: PaymentStatus;
  po_number: string | null;
  order_notes: string | null;
  delivery_notes: string | null;
  adjustment_type: "percent" | "amount" | null;
  adjustment_value: number | null;
  processed_at: string | null;
  overrides: Record<string, boolean>;
  deleted_at: string | null;
}

export interface Payment {
  id: string;
  order_id: string | null;
  customer_id: string | null;
  amount: number;
  method: PaymentMethod | null;
  status: PaymentStatus;
  reference: string | null;
  paid_at: string | null;
  created_at: string;
}

export interface Statement {
  id: string;
  customer_id: string;
  ref: string;
  period_start: string;
  period_end: string;
  scope: "all" | "delivered";
  status: PaymentStatus;
  amount: number;
  generated_at: string;
}

export interface BusinessSettings {
  name: string;
  email: string | null;
  phone: string | null;
  website: string | null;
  address: string | null;
  abn: string | null;
  hours: string | null;
  doc_format: string;
  master_prefix: string;
  print_delivery_notes: boolean;
}

export interface PaymentSettings {
  gst_on: boolean;
  gst_rate: number;
  gst_label: string;
  gst_inclusive: boolean;
  card_surcharge: number;
  markup_type: "percent" | "fixed";
  markup_value: number;
  fuel_surcharge: number;
  currency: string;
  default_fee: number;
}

export interface IntegrationSettings {
  key: "myob" | "mycrmsim" | "sheets";
  connected: boolean;
  account: string | null;
  field_a: string | null;
  field_b: string | null;
  auto_sync: boolean;
  last_synced: string | null;
}

export interface EmailSetting {
  key: "confirm" | "status" | "receipt" | "pin" | "statement";
  enabled: boolean;
}
