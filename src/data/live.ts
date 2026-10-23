import { supabase } from "../lib/supabase";
import { useApp } from "../store/store";
import type { Customer, CustomerContact, CustomerSite, Order, OrderItem, Payment, Product, Special, Suburb, TeamMember, Truck } from "../lib/types";

/* Live updates between screens.

   The app loaded once at sign-in and never heard about anything afterwards,
   so a card one person dragged on the board stayed where it was on everyone
   else's until they reloaded — "particularly crucial within the dispatch
   board", in the yard's words, and the reason they were refreshing all day
   (which in turn is why the refresh landing on the dashboard was row 174).

   One channel, every table the screens draw from. Each change is folded into
   the store the same way the app's own writes are: upsert by id, remove on
   delete. The app's own writes come back too — harmless, the row is identical
   — and the nested shapes the store keeps (a customer's contacts and sites, a
   product's variants, a special's product ids) are preserved across an upsert
   of the parent and maintained by the child tables' own events. */

type Row = Record<string, any>;
type Change = { eventType: "INSERT" | "UPDATE" | "DELETE"; new: Row; old: Row; table: string };

const upsert = <T extends { id: string }>(list: T[], row: T, merge?: (prev: T) => Partial<T>): T[] => {
  const i = list.findIndex((x) => x.id === row.id);
  if (i < 0) return [...list, row];
  const next = list.slice();
  next[i] = { ...list[i], ...row, ...(merge ? merge(list[i]) : {}) };
  return next;
};
const without = <T extends { id: string }>(list: T[], id: string): T[] => (list.some((x) => x.id === id) ? list.filter((x) => x.id !== id) : list);

let channel: ReturnType<typeof supabase.channel> | null = null;

export function startLive() {
  if (channel) return;
  const set = useApp.setState;
  const get = useApp.getState;

  const apply = (c: Change) => {
    const row = c.new as Row;
    const gone = c.eventType === "DELETE";
    const id: string = gone ? c.old?.id : row.id;
    if (!id) return;
    switch (c.table) {
      case "orders":
        set((s) => ({ orders: gone ? without(s.orders, id) : upsert(s.orders, row as Order) }));
        break;
      case "order_items": {
        set((s) => {
          const byOrder = { ...s.orderItems };
          if (gone) {
            /* A delete only carries the key, so the line is looked for everywhere. */
            for (const k of Object.keys(byOrder)) if (byOrder[k].some((i) => i.id === id)) byOrder[k] = byOrder[k].filter((i) => i.id !== id);
          } else {
            const it = row as OrderItem;
            for (const k of Object.keys(byOrder)) if (k !== it.order_id && byOrder[k].some((i) => i.id === id)) byOrder[k] = byOrder[k].filter((i) => i.id !== id);
            byOrder[it.order_id] = upsert(byOrder[it.order_id] || [], it);
          }
          return { orderItems: byOrder };
        });
        break;
      }
      case "customers":
        set((s) => ({
          customers: gone
            ? without(s.customers, id)
            : upsert(s.customers, { ...(row as Omit<Customer, "contacts" | "sites">), contacts: [], sites: [] } as Customer, (prev) => ({ contacts: prev.contacts, sites: prev.sites })),
        }));
        break;
      case "customer_contacts":
        set((s) => ({
          customers: s.customers.map((cu) => {
            const has = cu.contacts.some((x) => x.id === id);
            if (gone) return has ? { ...cu, contacts: cu.contacts.filter((x) => x.id !== id) } : cu;
            const ct = row as CustomerContact;
            if (cu.id === ct.customer_id) return { ...cu, contacts: upsert(cu.contacts, ct) };
            return has ? { ...cu, contacts: cu.contacts.filter((x) => x.id !== id) } : cu;
          }),
        }));
        break;
      case "customer_sites":
        set((s) => ({
          customers: s.customers.map((cu) => {
            const has = cu.sites.some((x) => x.id === id);
            if (gone) return has ? { ...cu, sites: cu.sites.filter((x) => x.id !== id) } : cu;
            const st = row as CustomerSite;
            if (cu.id === st.customer_id) return { ...cu, sites: upsert(cu.sites, st) };
            return has ? { ...cu, sites: cu.sites.filter((x) => x.id !== id) } : cu;
          }),
        }));
        break;
      case "products":
        set((s) => ({
          products: gone ? without(s.products, id) : upsert(s.products, { ...(row as Product), variants: [] } as Product, (prev) => ({ variants: prev.variants })),
        }));
        break;
      case "product_categories":
        set((s) => ({ categories: gone ? without(s.categories, id) : upsert(s.categories, row as any) }));
        break;
      case "specials":
        set((s) => ({
          specials: gone ? without(s.specials, id) : upsert(s.specials, { ...(row as Special), product_ids: [] } as Special, (prev) => ({ product_ids: prev.product_ids })),
        }));
        break;
      case "special_products": {
        const sid: string = gone ? c.old?.special_id : row.special_id;
        const pid: string = gone ? c.old?.product_id : row.product_id;
        if (!sid || !pid) break;
        set((s) => ({
          specials: s.specials.map((sp) =>
            sp.id !== sid ? sp : { ...sp, product_ids: gone ? (sp.product_ids || []).filter((x) => x !== pid) : Array.from(new Set([...(sp.product_ids || []), pid])) }
          ),
        }));
        break;
      }
      case "suburbs":
        set((s) => ({ suburbs: gone ? without(s.suburbs, id) : upsert(s.suburbs, row as Suburb) }));
        break;
      case "team_members":
        set((s) => ({ team: gone ? without(s.team, id) : upsert(s.team, row as TeamMember) }));
        break;
      case "trucks":
        set((s) => ({ trucks: gone ? without(s.trucks, id) : upsert(s.trucks, row as Truck) }));
        break;
      case "payments":
        set((s) => ({ payments: gone ? without(s.payments, id) : upsert(s.payments, row as Payment) }));
        break;
    }
  };

  channel = supabase.channel("swiftdispatch-live");
  for (const table of [
    "orders",
    "order_items",
    "customers",
    "customer_contacts",
    "customer_sites",
    "products",
    "product_categories",
    "specials",
    "special_products",
    "suburbs",
    "team_members",
    "trucks",
    "payments",
  ]) {
    channel.on("postgres_changes" as any, { event: "*", schema: "public", table }, (payload: any) =>
      apply({ eventType: payload.eventType, new: payload.new || {}, old: payload.old || {}, table })
    );
  }
  channel.subscribe((status: string) => {
    useApp.setState({ live: status === "SUBSCRIBED" } as any);
    /* A dropped socket that comes back may have missed changes in between;
       a quiet reload of the working set catches them up. */
    if (status === "SUBSCRIBED" && get().booted && resubscribed) void get().loadAll();
    if (status === "SUBSCRIBED") resubscribed = true;
  });
}
let resubscribed = false;

export function stopLive() {
  if (!channel) return;
  void supabase.removeChannel(channel);
  channel = null;
  resubscribed = false;
}
