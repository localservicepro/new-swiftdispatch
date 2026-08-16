import { create } from "zustand";
import { supabase } from "../lib/supabase";
import type { MyobSettings } from "../lib/myob";
import type {
  BusinessSettings,
  Customer,
  CustomerContact,
  CustomerSite,
  EmailSetting,
  IntegrationSettings,
  Order,
  OrderItem,
  OrderStatus,
  Payment,
  PaymentSettings,
  Product,
  ProductCategory,
  Special,
  Statement,
  Suburb,
  TeamMember,
  Truck,
} from "../lib/types";

export interface SessionUser {
  id: string;
  name: string;
  role: string;
}

export interface CartLine {
  productId: string;
  qty: number;
  to: string; // draft letter
  typed?: string | null;
}

export interface DeliveryDraft {
  letter: string;
  dateIso: string; // yyyy-mm-dd
  window: string;
  street: string;
  suburbId: string | null;
  fee: number;
  feeSource: "suburb" | "manual";
  truckId: string | null;
}

export interface ToastMsg {
  id: number;
  tone: "info" | "success" | "warning" | "danger";
  title: string;
  description?: string;
}

interface AppState {
  // session
  booted: boolean;
  loading: boolean;
  user: SessionUser | null;
  theme: "dark" | "light";

  // data
  suburbs: Suburb[];
  categories: ProductCategory[];
  products: Product[];
  specials: Special[];
  team: TeamMember[];
  trucks: Truck[];
  customers: Customer[];
  orders: Order[];
  orderItems: Record<string, OrderItem[]>;
  payments: Payment[];
  statements: Statement[];
  business: BusinessSettings | null;
  paySettings: PaymentSettings | null;
  integrations: IntegrationSettings[];
  emails: EmailSetting[];
  myob: MyobSettings | null;

  toasts: ToastMsg[];

  // actions
  setTheme: (t: "dark" | "light") => void;
  toast: (t: Omit<ToastMsg, "id">) => void;
  dismissToast: (id: number) => void;
  login: (pin: string) => Promise<SessionUser | null>;
  logout: () => void;
  loadAll: () => Promise<void>;

  patch: <K extends keyof AppState>(k: K, v: AppState[K]) => void;
}

const today = () => new Date().toISOString().slice(0, 10);

export const blankDraft = (letter = "A"): DeliveryDraft => ({
  letter,
  dateIso: today(),
  window: "ASAP",
  street: "",
  suburbId: null,
  fee: 0,
  feeSource: "suburb",
  truckId: null,
});

let toastId = 1;

export const useApp = create<AppState>((set, get) => ({
  booted: false,
  loading: false,
  user: null,
  theme: (localStorage.getItem("sdp-admin-theme") as "dark" | "light") || "dark",

  suburbs: [],
  categories: [],
  products: [],
  specials: [],
  team: [],
  trucks: [],
  customers: [],
  orders: [],
  orderItems: {},
  payments: [],
  statements: [],
  business: null,
  paySettings: null,
  integrations: [],
  emails: [],
  myob: null,

  toasts: [],

  setTheme: (t) => {
    localStorage.setItem("sdp-admin-theme", t);
    set({ theme: t });
  },

  toast: (t) => set((s) => ({ toasts: [...s.toasts, { ...t, id: toastId++ }] })),
  dismissToast: (id) => set((s) => ({ toasts: s.toasts.filter((x) => x.id !== id) })),

  login: async (pin) => {
    const { data, error } = await supabase.rpc("admin_login", { p_pin: pin });
    if (error || !data || !data.length) return null;
    const u = data[0] as SessionUser;
    localStorage.setItem("sdp_admin_session", JSON.stringify(u));
    set({ user: u });
    void get().loadAll();
    return u;
  },

  logout: () => {
    localStorage.removeItem("sdp_admin_session");
    set({ user: null });
  },

  loadAll: async () => {
    set({ loading: true });
    try {
      const [
        suburbs,
        categories,
        products,
        variants,
        specials,
        specialProducts,
        team,
        trucks,
        customers,
        contacts,
        sites,
        orders,
        items,
        payments,
        statements,
        business,
        paySettings,
        integrations,
        emails,
        myob,
      ] = await Promise.all([
        supabase.from("suburbs").select("*").order("name"),
        supabase.from("product_categories").select("*").order("sort_order"),
        supabase.from("products").select("*").order("sku"),
        supabase.from("product_variants").select("*"),
        supabase.from("specials").select("*"),
        supabase.from("special_products").select("*"),
        supabase.from("team_members").select("*").order("created_at"),
        supabase.from("trucks").select("*").order("created_at"),
        supabase.from("customers").select("*").order("account_number"),
        supabase.from("customer_contacts").select("*").order("created_at"),
        supabase.from("customer_sites").select("*"),
        supabase.from("orders").select("*").is("deleted_at", null).order("placed_at"),
        supabase.from("order_items").select("*").order("created_at"),
        supabase.from("payments").select("*").order("created_at", { ascending: false }),
        supabase.from("statements").select("*").order("generated_at", { ascending: false }),
        supabase.from("business_settings").select("*").maybeSingle(),
        supabase.from("payment_settings").select("*").maybeSingle(),
        supabase.from("integration_settings").select("*"),
        supabase.from("email_settings").select("*"),
        supabase.from("myob_settings").select("*").maybeSingle(),
      ]);

      const firstError = [suburbs, categories, products, orders].find((r) => r.error)?.error;
      if (firstError) throw firstError;

      const variantsByProduct: Record<string, Product["variants"]> = {};
      (variants.data || []).forEach((v: any) => {
        (variantsByProduct[v.product_id] = variantsByProduct[v.product_id] || []).push(v);
      });

      const idsBySpecial: Record<string, string[]> = {};
      (specialProducts.data || []).forEach((sp: any) => {
        (idsBySpecial[sp.special_id] = idsBySpecial[sp.special_id] || []).push(sp.product_id);
      });

      const contactsByCustomer: Record<string, CustomerContact[]> = {};
      (contacts.data || []).forEach((c: any) => {
        (contactsByCustomer[c.customer_id] = contactsByCustomer[c.customer_id] || []).push(c);
      });
      const sitesByCustomer: Record<string, CustomerSite[]> = {};
      (sites.data || []).forEach((c: any) => {
        (sitesByCustomer[c.customer_id] = sitesByCustomer[c.customer_id] || []).push(c);
      });

      const itemsByOrder: Record<string, OrderItem[]> = {};
      (items.data || []).forEach((i: any) => {
        (itemsByOrder[i.order_id] = itemsByOrder[i.order_id] || []).push(i);
      });

      set({
        suburbs: (suburbs.data || []) as Suburb[],
        categories: (categories.data || []) as ProductCategory[],
        products: ((products.data || []) as Product[]).map((p) => ({
          ...p,
          variants: variantsByProduct[p.id] || [],
        })),
        specials: ((specials.data || []) as Special[]).map((s) => ({
          ...s,
          product_ids: idsBySpecial[s.id] || [],
        })),
        team: (team.data || []) as TeamMember[],
        trucks: (trucks.data || []) as Truck[],
        customers: ((customers.data || []) as Customer[]).map((c) => ({
          ...c,
          contacts: contactsByCustomer[c.id] || [],
          sites: sitesByCustomer[c.id] || [],
        })),
        orders: (orders.data || []) as Order[],
        orderItems: itemsByOrder,
        payments: (payments.data || []) as Payment[],
        statements: (statements.data || []) as Statement[],
        business: (business.data || null) as BusinessSettings | null,
        paySettings: (paySettings.data || null) as PaymentSettings | null,
        integrations: (integrations.data || []) as IntegrationSettings[],
        emails: (emails.data || []) as EmailSetting[],
        myob: (myob.data || null) as MyobSettings | null,
        booted: true,
      });
    } catch (e: any) {
      get().toast({
        tone: "danger",
        title: "Could not load data",
        description: String(e?.message || e),
      });
    } finally {
      set({ loading: false });
    }
  },

  patch: (k, v) => set({ [k]: v } as any),
}));

/* Restore session on boot — a page refresh is not a sign-out. */
try {
  const raw = localStorage.getItem("sdp_admin_session");
  if (raw) {
    const u = JSON.parse(raw);
    useApp.setState({ user: u });
    void useApp.getState().loadAll();
  }
} catch {
  /* ignore */
}

/* Shared persistence helper: optimistic UI, toast on failure. */
export function persist(p: PromiseLike<{ error: any }>, what: string) {
  void Promise.resolve(p).then(({ error }) => {
    if (error) {
      useApp.getState().toast({
        tone: "danger",
        title: `Could not save ${what}`,
        description: `${error.message || error}. The screen may be ahead of the database — reload to re-sync.`,
      });
    }
  });
}

export const findOrderItems = (orderId: string): OrderItem[] => useApp.getState().orderItems[orderId] || [];

export const statusOf = (o: Order): OrderStatus => o.status;
