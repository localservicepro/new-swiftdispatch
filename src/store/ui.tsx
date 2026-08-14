/* UI/session state for the shell: navigation, the in-progress order, drawers and
   modals. Kept separate from the data store so screen state never masquerades as
   database state. */

import React, { createContext, useContext, useMemo, useState } from "react";
import { blankDraft, useApp, type CartLine, type DeliveryDraft } from "./store";
import type { OrderStatus } from "../lib/types";

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
  qtyStep: number;
  adjustType: "Percent" | "Dollars";
  settleMethod: string | null;
  poNumber: string;
  orderNotesDraft: string;
  deliveryNotesDraft: string;
  savedDraft: SavedDraft | null;

  // pickers & drawers
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

const UiCtx = createContext<UiState | null>(null);

export function UiProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState(() => ({
    nav: "dashboard",
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
    qtyStep: 1,
    adjustType: "Percent" as "Percent" | "Dollars",
    settleMethod: null as string | null,
    poNumber: "",
    orderNotesDraft: "",
    deliveryNotesDraft: "",
    savedDraft: readSavedDraft(),
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
      startOrder: (customerId) =>
        setState((s) => ({
          ...s,
          nav: "neworder",
          orderStep: 1,
          orderMode: "standard",
          drawerOpen: false,
          custId: null,
          customerId: customerId !== undefined ? customerId : s.customerId,
        })),
      startYardSale: () =>
        setState((s) => ({
          ...s,
          nav: "neworder",
          orderStep: 1,
          orderMode: "yardsale",
          cart: [],
          drawerOpen: false,
          yardCustomer: false,
          yardWalkInName: "",
          orderContact: null,
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
