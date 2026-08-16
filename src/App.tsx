import React from "react";
import { useApp } from "./store/store";
import { SidebarNav, Icon, Button, Tabs, Toast } from "./design-system/components.js";
import Login from "./screens/Login";
import Dashboard from "./screens/Dashboard";
import Board from "./screens/Board";
import NewOrder from "./screens/NewOrder";
import Orders from "./screens/Orders";
import Customers from "./screens/Customers";
import Payments from "./screens/Payments";
import Products from "./screens/Products";
import Fleet from "./screens/Fleet";
import Team from "./screens/Team";
import Suburbs from "./screens/Suburbs";
import Reports from "./screens/Reports";
import Settings from "./screens/Settings";
import OrderDrawer from "./screens/OrderDrawer";
import { UiProvider, useUi } from "./store/ui";
import { printReceipt, type PrintMode } from "./data/api";

const SCREEN_META: Record<string, [string, string]> = {
  board: ["Dispatch board", "Six stages · sorted by delivery time, oldest booking first"],
  neworder: ["New order", "Items first, then delivery and payment"],
  orders: ["Orders", "Click a row to open it beside the list"],
  dashboard: ["Dashboard", "Live operations overview"],
  customers: ["Customers", "Individuals, sole traders and company accounts"],
  payments: ["Payments", "Ledger, statements and MYOB"],
  products: ["Products", "Catalogue, stock and specials"],
  fleet: ["Fleet", "Trucks and who is driving them today"],
  team: ["Team", "Who can see what, and who is driving today"],
  suburbs: ["Suburbs", "Delivery areas and the rate each one charges"],
  reports: ["Reports", "Product sales by customer"],
  settings: ["Settings", "Business details, integrations and documents"],
};

function Shell() {
  const ui = useUi();
  const user = useApp((s) => s.user);
  const theme = useApp((s) => s.theme);
  const setTheme = useApp((s) => s.setTheme);
  const toasts = useApp((s) => s.toasts);
  const dismissToast = useApp((s) => s.dismissToast);
  const boardCount = useApp(
    (s) => s.orders.filter((o) => !o.deleted_at && o.kind !== "master" && !["delivered", "cancelled"].includes(o.status)).length
  );
  const unpaidCount = useApp((s) => s.payments.filter((p) => p.status === "pending" || p.status === "failed").length);

  const nav = ui.nav;
  const [title, subtitle] = SCREEN_META[nav] || SCREEN_META.board;

  const navItems = [
    { section: "Operate" },
    { id: "dashboard", label: "Dashboard", icon: "layout-dashboard" },
    { id: "board", label: "Dispatch board", icon: "target", badge: boardCount || undefined },
    { id: "orders", label: "Orders", icon: "shopping-cart" },
    { id: "fleet", label: "Fleet", icon: "truck" },
    { id: "team", label: "Team", icon: "users-round" },
    { id: "suburbs", label: "Suburbs", icon: "map-pin" },
    { section: "Sell" },
    { id: "neworder", label: "New order", icon: "plus" },
    { id: "customers", label: "Customers", icon: "users" },
    { id: "products", label: "Products", icon: "package" },
    { section: "Money" },
    { id: "payments", label: "Payments", icon: "credit-card", badge: unpaidCount || undefined },
    { id: "reports", label: "Reports", icon: "chart-column" },
    { section: "Setup" },
    { id: "settings", label: "Settings", icon: "settings" },
  ];

  return (
    <div
      data-theme={theme}
      style={{
        position: "relative",
        display: "flex",
        width: "100%",
        height: "100vh",
        minHeight: 600,
        overflow: "hidden",
        background: "var(--bg-app)",
        color: "var(--text-body)",
        fontFamily: "Inter, system-ui, sans-serif",
        fontSize: 14,
        letterSpacing: "-0.011em",
      }}
    >
      <SidebarNav
        items={navItems}
        activeId={nav}
        onSelect={(id: string) => ui.navigateTo(id)}
        collapsed={ui.collapsed}
        brandName="SwiftDispatch Pro"
        brandSub="Surrey Hills Garden Supplies"
        logoSrc="/swiftdispatch-mark.png"
        style={{ flexShrink: 0, height: "100%", position: "relative", zIndex: 3 }}
      />

      <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", overflow: "hidden" }}>
        {/* Top bar */}
        <div
          style={{
            flexShrink: 0,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 12,
            flexWrap: "wrap",
            padding: "10px 16px",
            minHeight: 56,
            boxSizing: "border-box",
            background: "var(--om-topbar)",
            backdropFilter: "blur(10px) saturate(140%)",
            borderBottom: "1px solid var(--border-subtle)",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0, flex: 1 }}>
            <div
              onClick={() => ui.set({ collapsed: !ui.collapsed })}
              title="Collapse navigation"
              style={{
                cursor: "pointer",
                width: 28,
                height: 28,
                flexShrink: 0,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                borderRadius: 6,
                border: "1px solid var(--border-subtle)",
                color: "var(--text-muted)",
              }}
            >
              <Icon name="list-filter" size={14} />
            </div>
            <div style={{ minWidth: 0 }}>
              <div
                style={{
                  fontSize: 16,
                  fontWeight: 600,
                  color: "var(--text-primary)",
                  letterSpacing: "-0.02em",
                  whiteSpace: "nowrap",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                }}
              >
                {title}
              </div>
              <div
                style={{
                  fontSize: 12,
                  color: "var(--text-faint)",
                  whiteSpace: "nowrap",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                }}
              >
                {subtitle}
              </div>
            </div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0, flexWrap: "wrap" }}>
            <div
              onClick={() => setTheme(theme === "light" ? "dark" : "light")}
              title={theme === "light" ? "Switch to dark" : "Switch to light"}
              style={{
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                gap: 6,
                height: 32,
                padding: "0 10px",
                flexShrink: 0,
                borderRadius: 6,
                border: "1px solid var(--border-subtle)",
                background: "var(--surface-raised)",
                color: "var(--text-muted)",
                fontSize: 12,
              }}
            >
              <Icon name={theme === "light" ? "sun" : "moon"} size={14} />
              {theme === "light" ? "Light" : "Dark"}
            </div>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 6,
                fontSize: 11,
                textTransform: "uppercase",
                letterSpacing: ".09em",
                color: "var(--text-faint)",
                paddingRight: 6,
              }}
            >
              <span style={{ width: 6, height: 6, borderRadius: "50%", background: "var(--feedback-success)" }} />
              Live
            </div>
            <Button variant="secondary" size="sm" iconLeft="zap" onClick={() => ui.startYardSale()}>
              Yard sale
            </Button>
            <Button variant="primary" size="sm" iconLeft="plus" onClick={() => ui.startOrder()}>
              New order
            </Button>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                paddingLeft: 8,
                borderLeft: "1px solid var(--border-subtle)",
              }}
            >
              <span style={{ fontSize: 12, color: "var(--text-muted)" }}>{user?.name}</span>
              <div
                onClick={() => useApp.getState().logout()}
                title="Sign out"
                style={{
                  cursor: "pointer",
                  width: 30,
                  height: 30,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  borderRadius: 6,
                  border: "1px solid var(--border-subtle)",
                  color: "var(--text-muted)",
                }}
              >
                <Icon name="log-out" size={14} />
              </div>
            </div>
          </div>
        </div>

        <div style={{ flex: 1, overflow: "auto", padding: 16 }}>
          {nav === "dashboard" && <Dashboard />}
          {nav === "board" && <Board />}
          {nav === "neworder" && <NewOrder />}
          {nav === "orders" && <Orders />}
          {nav === "customers" && <Customers />}
          {nav === "payments" && <Payments />}
          {nav === "products" && <Products />}
          {nav === "fleet" && <Fleet />}
          {nav === "team" && <Team />}
          {nav === "suburbs" && <Suburbs />}
          {nav === "reports" && <Reports />}
          {nav === "settings" && <Settings />}
        </div>
      </div>

      <OrderDrawer />
      <PendingNavModal />
      <PrintPromptModal />

      {/* Toasts */}
      <div
        style={{
          position: "absolute",
          right: 16,
          bottom: 16,
          zIndex: 40,
          display: "flex",
          flexDirection: "column",
          gap: 8,
          width: 360,
          maxWidth: "calc(100% - 32px)",
        }}
      >
        {toasts.map((t) => (
          <Toast key={t.id} tone={t.tone} title={t.title} description={t.description} onDismiss={() => dismissToast(t.id)} />
        ))}
      </div>
    </div>
  );
}

/* Raised the moment an order is created, so the tax invoice can be printed
   carrying its real number rather than a "not yet created" placeholder. Skipping
   is a first-class answer — plenty of orders never need a printed docket, and
   Print receipt on the order does the same job later. */
function PrintPromptModal() {
  const ui = useUi();
  const [mode, setMode] = React.useState<PrintMode>("separate");
  const p = ui.printPrompt;
  if (!p) return null;
  const close = () => ui.set({ printPrompt: null });

  return (
    <div
      onClick={close}
      style={{
        position: "absolute",
        inset: 0,
        zIndex: 30,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 24,
        background: "rgba(6,7,15,.72)",
        backdropFilter: "blur(10px) saturate(140%)",
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: "min(460px,100%)",
          borderRadius: 16,
          background: "var(--surface-card)",
          border: "1px solid var(--border-default)",
          boxShadow: "0 24px 64px rgba(0,0,0,.6)",
        }}
      >
        <div style={{ padding: "16px 16px 0" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <Icon name="badge-check" size={15} color="var(--feedback-success)" />
            <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 15, fontWeight: 600, color: "var(--text-primary)" }}>
              {p.orderNumber}
            </span>
            <span style={{ fontSize: 15, fontWeight: 600, color: "var(--text-primary)" }}>created</span>
          </div>
          <div style={{ fontSize: 12, color: "var(--text-faint)", marginTop: 6, textWrap: "pretty" as any }}>
            {p.splits > 1
              ? `${p.splits} deliveries under one master order. Print the tax invoice now, or skip and print it later from the order.`
              : "Print the tax invoice now, or skip and print it later from the order."}
          </div>
        </div>

        {p.splits > 1 && (
          <div style={{ padding: "14px 16px 0" }}>
            <Tabs
              items={[
                { id: "separate", label: `One per delivery — ${p.splits} pages` },
                { id: "combined", label: "One invoice for the lot" },
              ]}
              activeId={mode}
              onSelect={(id: string) => setMode(id as PrintMode)}
              variant="segmented"
              fullWidth
            />
          </div>
        )}

        <div style={{ padding: 16, display: "flex", gap: 8, justifyContent: "flex-end", flexWrap: "wrap" }}>
          <Button variant="ghost" size="md" onClick={close}>
            Skip
          </Button>
          <Button
            variant="primary"
            size="md"
            iconLeft="printer"
            onClick={() => {
              printReceipt(p.orderId, mode);
              close();
            }}
          >
            Print tax invoice
          </Button>
        </div>
      </div>
    </div>
  );
}

function PendingNavModal() {
  const ui = useUi();
  if (!ui.pendingNav) return null;
  return (
    <div
      onClick={() => ui.set({ pendingNav: null })}
      style={{
        position: "absolute",
        inset: 0,
        zIndex: 25,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 24,
        background: "rgba(6,7,15,.72)",
        backdropFilter: "blur(10px) saturate(140%)",
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: "min(440px,100%)",
          borderRadius: 16,
          background: "var(--surface-card)",
          border: "1px solid var(--border-default)",
          boxShadow: "0 24px 64px rgba(0,0,0,.6)",
        }}
      >
        <div style={{ padding: "16px 16px 0" }}>
          <div style={{ fontSize: 15, fontWeight: 600, color: "var(--text-primary)" }}>Save this order for later?</div>
          <div style={{ fontSize: 12, color: "var(--text-faint)", marginTop: 6, textWrap: "pretty" as any }}>
            You have unsaved changes. Save your progress and resume later, or discard and start fresh next time.
          </div>
        </div>
        <div style={{ padding: 16, display: "flex", gap: 8, justifyContent: "flex-end", flexWrap: "wrap" }}>
          <Button variant="ghost" size="md" onClick={() => ui.set({ pendingNav: null })}>
            Keep editing
          </Button>
          <Button variant="danger" size="md" onClick={() => ui.discardOrder()}>
            Discard
          </Button>
          <Button variant="primary" size="md" onClick={() => ui.saveOrderForLater()}>
            Save for later
          </Button>
        </div>
      </div>
    </div>
  );
}

export default function App() {
  const user = useApp((s) => s.user);
  const theme = useApp((s) => s.theme);
  if (!user)
    return (
      <div data-theme={theme} style={{ height: "100vh", background: "var(--bg-app)" }}>
        <Login />
      </div>
    );
  return (
    <UiProvider>
      <Shell />
    </UiProvider>
  );
}
