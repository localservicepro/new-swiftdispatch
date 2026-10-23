/* UI/session state for the shell: navigation, the in-progress order, drawers and
   modals. Kept separate from the data store so screen state never masquerades as
   database state. */

import React, { useEffect, createContext, useContext, useMemo, useState } from "react";
import { blankDraft, useApp, type CartLine, type DeliveryDraft } from "./store";
import type { OrderStatus } from "../lib/types";

/* Raised after an order is created so the tax invoice can be printed with its
   real number on it. Lives here, not in the new-order screen, because a
   standard order navigates to the board the moment it is created. */
export interface PrintPrompt {
  orderId: string;
  orderNumber: string;
  splits: number;
}

export interface PickerState {
  kind: "date" | "window";
  current?: string;
  onPick: (v: string) => void;
}

export interface SavedDraft {
  cart: CartLine[];
  customerId: string | null;
  orderMode: "standard" | "yardsale";
  orderStep: number;
  drafts: DeliveryDraft[];
  yardCustomer: boolean;
  savedAt: string;
}

interface UiState {
  nav: string;
  collapsed: boolean;
  pendingNav: string | null;

  // new order flow
  orderMode: "standard" | "yardsale";
  orderStep: number;
  cart: CartLine[];
  drafts: DeliveryDraft[];
  activeDraft: string;
  customerId: string | null;
  yardCustomer: boolean;
  yardWalkInName: string;
  orderContact: string | null;
  fulfilMethod: "delivery" | "pickup";
  adjustType: "Percent" | "Amount";
  adjustDirection: "discount" | "surcharge";
  settleMethod: string | null;
  /* Whether the settlement method above was filled in by the app rather than
     chosen by hand. An automatic answer is the app's to withdraw when the
     customer changes; one somebody typed is theirs and is left alone. */
  settleMethodAuto: boolean;
  poNumber: string;
  orderNotesDraft: string;
  deliveryNotesDraft: string;
  savedDraft: SavedDraft | null;

  // pickers & drawers
  printPrompt: PrintPrompt | null;
  picker: PickerState | null;
  drawerOpen: boolean;
  selectedOrderId: string | null; // null while drawer open = master group view
  drawerMasterId: string | null;
  drawerTab: string;
  assignFor: string | null;
  custId: string | null;
  custTab: string;
  lastOpenedOrder: string | null;

  set: (patch: Partial<UiState>) => void;
  navigateTo: (id: string) => void;
  startOrder: (customerId?: string | null) => void;
  startYardSale: () => void;
  discardOrder: () => void;
  saveOrderForLater: () => void;
  resumeSavedOrder: () => void;
  discardSavedOrder: () => void;
  openOrderDrawer: (orderId: string | null, masterId: string | null, tab?: string) => void;
}

/* The screen survives a reload. The yard refreshes often — until live updates
   landed it was the only way to see a colleague's change — and every refresh
   dropped them on the dashboard. The new-order screen is the exception: its
   cart is not in this store, so coming back to an empty order form helps nobody;
   Orders is where a saved draft is offered from. */
const SCREENS = ["dashboard", "board", "neworder", "orders", "customers", "payments", "products", "fleet", "team", "suburbs", "reports", "settings", "docs"];
const readNav = (): string => {
  try {
    const v = localStorage.getItem("sdp_nav") || "";
    if (v === "neworder") return "orders";
    return SCREENS.includes(v) ? v : "dashboard";
  } catch {
    return "dashboard";
  }
};

const UiCtx = createContext<UiState | null>(null);

export function UiProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState(() => ({
    nav: readNav(),
    collapsed: false,
    pendingNav: null as string | null,
    orderMode: "standard" as "standard" | "yardsale",
    orderStep: 1,
    cart: [] as CartLine[],
    drafts: [blankDraft("A")],
    activeDraft: "A",
    customerId: null as string | null,
    yardCustomer: false,
    yardWalkInName: "",
    orderContact: null as string | null,
    fulfilMethod: "delivery" as "delivery" | "pickup",
    /* An amount, not a percentage. The yard prices a discount as "take five
       dollars off", not "take five percent off", and the field was asking them
       to convert every time. */
    adjustType: "Amount" as "Percent" | "Amount",
    adjustDirection: "discount" as "discount" | "surcharge",
    settleMethod: null as string | null,
    settleMethodAuto: false,
    poNumber: "",
    orderNotesDraft: "",
    deliveryNotesDraft: "",
    savedDraft: readSavedDraft(),
    printPrompt: null as PrintPrompt | null,
    picker: null as PickerState | null,
    drawerOpen: false,
    selectedOrderId: null as string | null,
    drawerMasterId: null as string | null,
    drawerTab: "items",
    assignFor: null as string | null,
    custId: null as string | null,
    custTab: "overview",
    lastOpenedOrder: null as string | null,
  }));

  useEffect(() => {
    try {
      localStorage.setItem("sdp_nav", state.nav);
    } catch {
      /* private window — the screen just is not remembered */
    }
  }, [state.nav]);

  const api = useMemo<UiState>(() => {
    const set = (patch: Partial<UiState>) => setState((s) => ({ ...s, ...patch }) as any);
    const hasUnsavedOrder = (s: typeof state) =>
      s.nav === "neworder" && (s.cart.length > 0 || (s.orderMode === "yardsale" && s.yardCustomer));
    return {
      ...state,
      set,
      navigateTo: (id) => {
        setState((s) => {
          if (id === "neworder" || !hasUnsavedOrder(s)) return { ...s, nav: id, drawerOpen: false };
          return { ...s, pendingNav: id };
        });
      },
      /* Starting an order starts it empty. It used to keep whoever the last
         order was for, which reads as a convenience and is not one: the same
         customer rarely orders twice in a row, the name sits in a corner of the
         screen where nobody rereads it, and the result was goods billed to the
         wrong account. Customers › New order still passes one in deliberately. */
      startOrder: (customerId) =>
        setState((s) => ({
          ...s,
          nav: "neworder",
          orderStep: 1,
          orderMode: "standard",
          drawerOpen: false,
          custId: null,
          customerId: customerId ?? null,
          orderContact: null,
          settleMethod: customerId ? s.settleMethod : null,
          settleMethodAuto: customerId ? s.settleMethodAuto : false,
        })),
      /* Switching to the counter keeps whatever is already on the order.
         Half-written orders do turn into counter sales — the customer rings,
         then turns up — and this used to empty the cart without asking, while
         the New order button beside it kept everything. A customer already
         chosen comes across as the account the sale goes on. */
      startYardSale: () =>
        setState((s) => ({
          ...s,
          nav: "neworder",
          orderStep: 1,
          orderMode: "yardsale",
          drawerOpen: false,
          yardCustomer: !!s.customerId,
          yardWalkInName: s.yardWalkInName,
        })),
      discardOrder: () =>
        setState((s) => ({
          ...s,
          nav: s.pendingNav || s.nav,
          pendingNav: null,
          drawerOpen: false,
          cart: [],
          drafts: [blankDraft("A")],
          activeDraft: "A",
          orderStep: 1,
          yardCustomer: false,
          poNumber: "",
          orderNotesDraft: "",
          deliveryNotesDraft: "",
        })),
      saveOrderForLater: () =>
        setState((s) => {
          const snapshot: SavedDraft = {
            cart: s.cart,
            customerId: s.customerId,
            orderMode: s.orderMode,
            orderStep: s.orderStep,
            drafts: s.drafts,
            yardCustomer: s.yardCustomer,
            savedAt: new Date().toLocaleString("en-AU", {
              hour: "numeric",
              minute: "2-digit",
              day: "2-digit",
              month: "2-digit",
            }),
          };
          try {
            localStorage.setItem("sdp_saved_order", JSON.stringify(snapshot));
          } catch {}
          return {
            ...s,
            nav: s.pendingNav || s.nav,
            pendingNav: null,
            drawerOpen: false,
            savedDraft: snapshot,
            cart: [],
            drafts: [blankDraft("A")],
            activeDraft: "A",
            orderStep: 1,
            yardCustomer: false,
          };
        }),
      resumeSavedOrder: () =>
        setState((s) => {
          const d = s.savedDraft;
          if (!d) return s;
          try {
            localStorage.removeItem("sdp_saved_order");
          } catch {}
          return {
            ...s,
            nav: "neworder",
            savedDraft: null,
            cart: d.cart,
            customerId: d.customerId,
            orderMode: d.orderMode,
            orderStep: d.orderStep,
            drafts: d.drafts,
            activeDraft: d.drafts[0]?.letter || "A",
            yardCustomer: d.yardCustomer,
          };
        }),
      discardSavedOrder: () => {
        try {
          localStorage.removeItem("sdp_saved_order");
        } catch {}
        set({ savedDraft: null });
      },
      openOrderDrawer: (orderId, masterId, tab) =>
        set({
          drawerOpen: true,
          selectedOrderId: orderId,
          drawerMasterId: masterId,
          drawerTab: tab || (masterId && !orderId ? "splits" : "items"),
        }),
    };
  }, [state]);

  return <UiCtx.Provider value={api}>{children}</UiCtx.Provider>;
}

function readSavedDraft(): SavedDraft | null {
  try {
    const raw = localStorage.getItem("sdp_saved_order");
    return raw ? (JSON.parse(raw) as SavedDraft) : null;
  } catch {
    return null;
  }
}

export function useUi(): UiState {
  const v = useContext(UiCtx);
  if (!v) throw new Error("useUi outside provider");
  return v;
}

export const nextStatusOptions: { value: OrderStatus; label: string }[] = [
  { value: "requested", label: "Requested" },
  { value: "preparing", label: "Confirmed & preparing" },
  { value: "loading", label: "Loading" },
  { value: "en_route", label: "En route" },
  { value: "delivered", label: "Delivered" },
  { value: "on_hold", label: "On hold" },
];

void useApp;
