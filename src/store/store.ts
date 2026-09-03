import { create } from "zustand";
import { fetchIn, pageAll, supabase } from "../lib/supabase";
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
  /* The older order history arrives after the app is already usable. Screens
     that total across all time — reports, statements, a customer's whole
     ledger — say so until this turns true. */
  historyLoaded: boolean;
  historyLoading: boolean;
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
  loadHistory: () => Promise<void>;

  patch: <K extends keyof AppState>(k: K, v: AppState[K]) => void;
}

const today = () => new Date().toISOString().slice(0, 10);

/* How much of the order book the app loads before it will let anyone in.
   Sixty days covers what a dispatcher actually looks at — plus every order
   still open, however old, because a back-order from last year is exactly the
   sort of thing that must not go missing off the board. The rest of the
   history follows in the background. */
const WORKING_WINDOW_DAYS = 60;
const windowStart = () => {
  const d = new Date();
  d.setDate(d.getDate() - WORKING_WINDOW_DAYS);
  return d.toISOString();
};

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
/* The passes while they are running, so a second caller joins the one already
   going rather than starting its own. Reloading the page mid-load, or any two
   things asking at once, was running the whole thing twice over — every table,
   every page, every chunk, doubled. */
let inFlightLoad: Promise<void> | null = null;
let inFlightHistory: Promise<void> | null = null;

export const useApp = create<AppState>((set, get) => ({
  booted: false,
  loading: false,
  historyLoaded: false,
  historyLoading: false,
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
    if (inFlightLoad) return inFlightLoad;
    set({ loading: true });
    inFlightLoad = (async () => {
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
        payments,
        statements,
        business,
        paySettings,
        integrations,
        emails,
        myob,
      ] = await Promise.all([
        /* Anything that grows with the business is paged; the settings-sized
           tables are read in one go. See pageAll on why. */
        pageAll(() => supabase.from("suburbs").select("*", { count: "exact" }).order("name")),
        supabase.from("product_categories").select("*").order("sort_order"),
        pageAll(() => supabase.from("products").select("*", { count: "exact" }).order("sku")),
        pageAll(() => supabase.from("product_variants").select("*", { count: "exact" }).order("id")),
        supabase.from("specials").select("*"),
        supabase.from("special_products").select("*"),
        supabase.from("team_members").select("*").order("created_at"),
        supabase.from("trucks").select("*").order("created_at"),
        pageAll(() => supabase.from("customers").select("*", { count: "exact" }).order("account_number")),
        pageAll(() => supabase.from("customer_contacts").select("*", { count: "exact" }).order("created_at").order("id")),
        pageAll(() => supabase.from("customer_sites").select("*", { count: "exact" }).order("id")),
        /* Only the working window on the first pass — see WORKING_WINDOW. */
        pageAll(() =>
          supabase
            .from("orders")
            .select("*", { count: "exact" })
            .is("deleted_at", null)
            .or(`status.not.in.(delivered,cancelled),placed_at.gte.${windowStart()}`)
            .order("placed_at")
            .order("id")
        ),
        pageAll(() => supabase.from("payments").select("*", { count: "exact" }).order("created_at", { ascending: false }).order("id")),
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

      /* The line items for the window, not for the whole ledger. Sixteen
         thousand rows is the single biggest thing this load used to pull, and
         almost none of it is on screen when someone signs in. */
      const windowOrders = (orders.data || []) as Order[];
      const items = await fetchIn<OrderItem>("order_items", "order_id", windowOrders.map((o) => o.id));
      const itemsByOrder: Record<string, OrderItem[]> = {};
      items.forEach((i) => {
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
        historyLoaded: false,
      });

      /* Deliberately not awaited: the app is usable now, and the rest of the
         ledger arrives underneath it. */
      void get().loadHistory();
    } catch (e: any) {
      get().toast({
        tone: "danger",
        title: "Could not load data",
        description: String(e?.message || e),
      });
    } finally {
      set({ loading: false });
      inFlightLoad = null;
    }
    })();
    return inFlightLoad;
  },

  /* Everything the working window left behind: the settled orders older than
     it, and their lines. Runs unawaited behind a usable app.

     The predicate is the exact complement of the window's — settled AND older —
     so no order is fetched twice and none falls between the two. And nothing
     already in the store is overwritten: an order the dispatcher edited while
     this was in flight stays as they left it, because the merge only adds ids
     it has not already got. */
  loadHistory: async () => {
    if (get().historyLoaded) return;
    /* Callers that need the whole ledger await this, so a second caller must
       wait for the pass already running rather than sail past it — a statement
       drawn on half the book would be wrong about what is owed. */
    if (inFlightHistory) return inFlightHistory;
    set({ historyLoading: true });
    inFlightHistory = (async () => {
    try {
      const { data, error } = await pageAll<Order>(() =>
        supabase
          .from("orders")
          .select("*", { count: "exact" })
          .is("deleted_at", null)
          .in("status", ["delivered", "cancelled"])
          .lt("placed_at", windowStart())
          .order("placed_at")
          .order("id")
      );
      if (error) throw error;

      const have = new Set(get().orders.map((o) => o.id));
      const older = (data || []).filter((o) => !have.has(o.id));

      /* The lines for those orders, read by paging the table rather than by
         naming seven thousand ids. Asking for them by id meant thirty-six
         requests each carrying a seven-kilobyte list of UUIDs; paging is
         seventeen requests of a thousand rows, six at a time, and the ones
         already loaded are simply skipped on the way in. */
      const { data: allItems, error: itemsError } = await pageAll<OrderItem>(() =>
        supabase.from("order_items").select("*", { count: "exact" }).order("created_at").order("id")
      );
      if (itemsError) throw itemsError;

      set((s) => {
        const byOrder = { ...s.orderItems };
        const seen = new Set<string>();
        for (const lines of Object.values(byOrder)) for (const i of lines) seen.add(i.id);
        for (const i of allItems || []) {
          if (seen.has(i.id)) continue;
          (byOrder[i.order_id] = byOrder[i.order_id] || []).push(i);
        }
        return {
          orders: [...s.orders, ...older].sort(
            (a, b) => new Date(a.placed_at).getTime() - new Date(b.placed_at).getTime()
          ),
          orderItems: byOrder,
          historyLoaded: true,
        };
      });
    } catch (e: any) {
      /* Not fatal — the app is running on the working window. Say so quietly
         rather than blocking anyone, and leave historyLoaded false so the
         screens that need everything keep saying they are short. */
      get().toast({
        tone: "warning",
        title: "Older orders did not finish loading",
        description: `${e?.message || e}. Everything from the last ${WORKING_WINDOW_DAYS} days is here; reload to try again.`,
      });
    } finally {
      set({ historyLoading: false });
      inFlightHistory = null;
    }
    })();
    return inFlightHistory;
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
