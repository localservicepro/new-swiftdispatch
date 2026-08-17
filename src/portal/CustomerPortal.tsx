import React, { useEffect, useMemo, useState } from "react";
import { fetchIn, pageAll, supabase } from "../lib/supabase";
import { AUD, AUD0, dmy, fuelOf, resolvedSuburbFee, suburbRate, unitPrice } from "../lib/domain";
import type { Customer, CustomerSite, Order, OrderItem, PaymentSettings, Product, ProductCategory, Special, Suburb } from "../lib/types";
import {
  AddressBlock,
  Alert,
  Button,
  Card,
  DataTable,
  Icon,
  Input,
  PaymentSummary,
  ProductTile,
  Select,
  StatCard,
  StepProgress,
  Tabs,
  Textarea,
} from "../design-system/components.js";

/* Customer portal — per "Customer Portal.dc.html". Account customers sign in on
   the PIN the yard gave them (no account number, no password), see their orders
   and credit, and place orders that land straight on the dispatch board as
   Requested — there is no separate approval step. */

interface PortalUser {
  id: string;
  name: string;
  account_number: string;
}

const STATUS_LABEL: Record<string, string> = {
  requested: "Requested",
  preparing: "Preparing",
  loading: "Loading",
  en_route: "En route",
  delivered: "Delivered",
  on_hold: "On hold",
  cancelled: "Cancelled",
  ready_for_pickup: "Ready for pickup",
};

export default function CustomerPortal() {
  const [user, setUser] = useState<PortalUser | null>(() => {
    try {
      const raw = localStorage.getItem("sdp_portal_session");
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  });

  return (
    <div
      data-theme="dark"
      style={{
        width: "100%",
        minHeight: "100vh",
        background: "var(--bg-app)",
        color: "var(--text-body)",
        fontFamily: "Inter, system-ui, sans-serif",
        fontSize: 14,
        letterSpacing: "-0.011em",
        display: "flex",
        flexDirection: "column",
      }}
    >
      {user ? (
        <PortalApp
          user={user}
          onSignOut={() => {
            localStorage.removeItem("sdp_portal_session");
            setUser(null);
          }}
        />
      ) : (
        <PortalLogin
          onLogin={(u) => {
            localStorage.setItem("sdp_portal_session", JSON.stringify(u));
            setUser(u);
          }}
        />
      )}
    </div>
  );
}

function PortalLogin({ onLogin }: { onLogin: (u: PortalUser) => void }) {
  const [pin, setPin] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const doLogin = async () => {
    const p = pin.trim();
    if (!p) return setError("Enter your PIN");
    setBusy(true);
    const { data, error: err } = await supabase.rpc("portal_login", { p_pin: p });
    setBusy(false);
    if (err || !data?.length) return setError("That PIN doesn't match an active account");
    onLogin(data[0] as PortalUser);
  };

  return (
    <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}>
      <div style={{ width: "100%", maxWidth: 380, display: "flex", flexDirection: "column", gap: 20 }}>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 8, textAlign: "center" }}>
          <img src="/swiftdispatch-mark.png" alt="" style={{ height: 40, width: 40, objectFit: "contain" }} />
          <div style={{ fontSize: 18, fontWeight: 600, color: "var(--text-primary)" }}>Surrey Hills Garden Supplies</div>
          <div style={{ fontSize: 12, color: "var(--text-faint)" }}>Account portal — orders and statements</div>
        </div>

        <Card padding="default">
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <Input
              label="PIN"
              value={pin}
              onChange={(e: any) => {
                setPin(e.target.value.replace(/[^0-9]/g, "").slice(0, 4));
                setError("");
              }}
              placeholder="4-digit PIN"
              onKeyDown={(e: any) => e.key === "Enter" && void doLogin()}
            />
            {error && (
              <Alert tone="danger" title={error}>
                Ask the yard for your PIN, or for a new one.
              </Alert>
            )}
            <Button variant="primary" size="lg" iconLeft="log-in" fullWidth loading={busy} onClick={() => void doLogin()}>
              Sign in
            </Button>
          </div>
        </Card>
        <div style={{ fontSize: 11, color: "var(--text-faint)", textAlign: "center", textWrap: "pretty" as any }}>
          Just the PIN the yard gave you — no account number, no password.
        </div>
      </div>
    </div>
  );
}

interface CartLine {
  id: string;
  qty: number;
}

function PortalApp({ user, onSignOut }: { user: PortalUser; onSignOut: () => void }) {
  const [cust, setCust] = useState<Customer | null>(null);
  const [sites, setSites] = useState<CustomerSite[]>([]);
  const [suburbs, setSuburbs] = useState<Suburb[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<ProductCategory[]>([]);
  const [specials, setSpecials] = useState<Special[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [itemsByOrder, setItemsByOrder] = useState<Record<string, OrderItem[]>>({});
  const [paySettings, setPaySettings] = useState<PaymentSettings | null>(null);

  const [tab, setTab] = useState<"dashboard" | "orders" | "neworder">("dashboard");
  const [statusFilter, setStatusFilter] = useState("All statuses");
  const [orderStep, setOrderStep] = useState(1);
  const [cart, setCart] = useState<CartLine[]>([]);
  const [prodQuery, setProdQuery] = useState("");
  const [prodCat, setProdCat] = useState("All");
  const [method, setMethod] = useState<"delivery" | "pickup">("delivery");
  const [siteChoice, setSiteChoice] = useState<string>("");
  const [reqDate, setReqDate] = useState(dmy(new Date().toISOString().slice(0, 10)));
  const [reqWindow, setReqWindow] = useState("07:00 – 11:00");
  const [poRef, setPoRef] = useState("");
  const [orderNotes, setOrderNotes] = useState("");
  const [deliveryNotes, setDeliveryNotes] = useState("");
  const [lastOrderNumber, setLastOrderNumber] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const load = async () => {
    const [c, st, sub, p, cat, sp, spp, o, pay] = await Promise.all([
      supabase.from("customers").select("*").eq("id", user.id).maybeSingle(),
      supabase.from("customer_sites").select("*").eq("customer_id", user.id),
      supabase.from("suburbs").select("*"),
      supabase.from("products").select("*").eq("active", true).order("sku"),
      supabase.from("product_categories").select("*").order("sort_order"),
      supabase.from("specials").select("*"),
      supabase.from("special_products").select("*"),
      pageAll(() =>
        supabase
          .from("orders")
          .select("*", { count: "exact" })
          .eq("customer_id", user.id)
          .is("deleted_at", null)
          .order("placed_at", { ascending: false })
          .order("id")
      ),
      supabase.from("payment_settings").select("*").maybeSingle(),
    ]);
    const idsBySpecial: Record<string, string[]> = {};
    (spp.data || []).forEach((x: any) => (idsBySpecial[x.special_id] = idsBySpecial[x.special_id] || []).push(x.product_id));
    setCust((c.data as Customer) || null);
    setSites((st.data || []) as CustomerSite[]);
    setSuburbs((sub.data || []) as Suburb[]);
    setProducts((p.data || []) as Product[]);
    setCategories((cat.data || []) as ProductCategory[]);
    setSpecials(((sp.data || []) as Special[]).map((s) => ({ ...s, product_ids: idsBySpecial[s.id] || [] })));
    setPaySettings((pay.data as PaymentSettings) || null);
    const myOrders = (o.data || []) as Order[];
    setOrders(myOrders);
    if (myOrders.length) {
      const its = await fetchIn<OrderItem>("order_items", "order_id", myOrders.map((x) => x.id));
      const by: Record<string, OrderItem[]> = {};
      its.forEach((i) => (by[i.order_id] = by[i.order_id] || []).push(i));
      setItemsByOrder(by);
    }
  };

  useEffect(() => {
    void load();
    const t = setInterval(load, 45000); // orders move here as the yard confirms and loads them
    return () => clearInterval(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user.id]);

  useEffect(() => {
    if (!siteChoice && sites.length) setSiteChoice((sites.find((s) => s.is_default) || sites[0]).id);
  }, [sites, siteChoice]);

  const priceOf = (p: Product) => unitPrice(p, specials, () => null);
  const catName = (id: string | null) => categories.find((c) => c.id === id)?.name || "—";
  const suburbName = (id: string | null) => suburbs.find((s) => s.id === id)?.name || "";

  const blocked = useMemo(() => {
    if (!cust || cust.billing !== "account") return { blocked: false, reason: "" };
    if (cust.stop_credit)
      return { blocked: true, reason: "This account is on hold. Contact Surrey Hills Garden Supplies to have it lifted." };
    if (Number(cust.balance) > Number(cust.credit_limit))
      return {
        blocked: true,
        reason: `Owing ${AUD(Number(cust.balance))} against a ${AUD0(Number(cust.credit_limit))} limit. New orders are blocked until the balance is under the limit — settle the balance or contact the yard.`,
      };
    return { blocked: false, reason: "" };
  }, [cust]);

  const lines = cart.map((l) => {
    const p = products.find((x) => x.id === l.id)!;
    const price = priceOf(p);
    return { ...p, qty: l.qty, price, lineTotal: price * l.qty };
  });
  const goods = lines.reduce((s, l) => s + l.lineTotal, 0);
  const site = sites.find((s) => s.id === siteChoice) || sites[0] || null;
  const rate = site ? suburbRate(site.suburb_id, suburbs) : null;
  const fee = method === "delivery" && site ? resolvedSuburbFee(site.suburb_id, suburbs, paySettings).total : 0;
  const fuel = method === "delivery" ? fuelOf(paySettings) : 0;
  const total = goods + fee + fuel;

  const addProduct = (id: string) =>
    setCart((c) => {
      const found = c.find((l) => l.id === id);
      return found ? c.map((l) => (l.id === id ? { ...l, qty: l.qty + 1 } : l)) : [...c, { id, qty: 1 }];
    });
  const bump = (id: string, delta: number) =>
    setCart((c) => c.map((l) => (l.id === id ? { ...l, qty: Math.max(0, l.qty + delta) } : l)).filter((l) => l.qty > 0));

  const orderRows = orders.map((o) => {
    const its = itemsByOrder[o.id] || [];
    const t =
      its.reduce((s, i) => s + Number(i.line_total), 0) +
      (o.method === "delivery" ? (Number(o.delivery_fee) || 0) + (Number(o.fuel_surcharge) || 0) : 0);
    return {
      number: o.order_number,
      date: dmy(o.placed_at.slice(0, 10)),
      status: STATUS_LABEL[o.status] || o.status,
      payment: o.payment_status[0].toUpperCase() + o.payment_status.slice(1),
      total: AUD(t),
    };
  });
  const openRows = orderRows.filter((o) => o.status !== "Delivered" && o.status !== "Cancelled");

  const submitOrder = async () => {
    if (!cust || blocked.blocked || submitting || !lines.length) return;
    setSubmitting(true);
    const { data: num, error: numErr } = await supabase.rpc("next_order_number");
    if (numErr) {
      setSubmitting(false);
      return;
    }
    const id = crypto.randomUUID();
    const dateParts = reqDate.split("/");
    const iso = dateParts.length === 3 ? `${dateParts[2]}-${dateParts[1].padStart(2, "0")}-${dateParts[0].padStart(2, "0")}` : null;
    const { error } = await supabase.from("orders").insert({
      id,
      order_number: num,
      kind: "standard",
      customer_id: cust.id,
      status: "requested",
      method,
      street: method === "delivery" ? site?.street || "" : "Yard collection",
      suburb_id: method === "delivery" ? site?.suburb_id || null : null,
      delivery_fee: fee,
      fuel_surcharge: fuel,
      fee_source: "suburb",
      delivery_date: iso,
      delivery_window: reqWindow,
      payment_method: "on_account",
      payment_status: "invoiced",
      po_number: poRef || null,
      order_notes: orderNotes || null,
      delivery_notes: deliveryNotes || null,
    });
    if (!error) {
      await supabase.from("order_items").insert(
        lines.map((l) => ({ order_id: id, product_id: l.id, qty: l.qty, unit_price: l.price }))
      );
      setLastOrderNumber(num as string);
      setOrderStep(3);
      setCart([]);
      setPoRef("");
      setOrderNotes("");
      setDeliveryNotes("");
      void load();
    }
    setSubmitting(false);
  };

  const catChips = ["All", ...categories.map((c) => c.name)];
  const q = prodQuery.trim().toLowerCase();
  const visibleProducts = products.filter(
    (p) => (prodCat === "All" || catName(p.category_id) === prodCat) && (!q || p.name.toLowerCase().includes(q))
  );

  return (
    <>
      <div style={{ height: 56, flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16, padding: "0 20px", background: "rgba(9,11,21,.85)", backdropFilter: "blur(10px) saturate(140%)", borderBottom: "1px solid var(--border-subtle)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0 }}>
          <img src="/swiftdispatch-mark.png" alt="" style={{ height: 24, width: 24, objectFit: "contain", flexShrink: 0 }} />
          <div style={{ minWidth: 0 }}>
            <div style={{ fontSize: 14, fontWeight: 600, color: "var(--text-primary)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {user.name}
            </div>
            <div style={{ fontSize: 11, color: "var(--text-faint)" }}>Acct {user.account_number}</div>
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
          <Tabs
            items={[
              { id: "dashboard", label: "Dashboard" },
              { id: "orders", label: "Orders" },
            ]}
            activeId={tab}
            onSelect={(id: string) => setTab(id as any)}
            variant="segmented"
            style={{ width: 220 }}
          />
          <Button
            variant="primary"
            size="sm"
            iconLeft="plus"
            onClick={() => {
              if (!blocked.blocked) {
                setTab("neworder");
                setOrderStep(1);
                setCart([]);
              }
            }}
          >
            New order
          </Button>
          <div onClick={onSignOut} title="Sign out" style={{ cursor: "pointer", width: 32, height: 32, display: "flex", alignItems: "center", justifyContent: "center", borderRadius: 6, border: "1px solid var(--border-subtle)", color: "var(--text-muted)" }}>
            <Icon name="log-out" size={14} />
          </div>
        </div>
      </div>

      <div style={{ flex: 1, overflow: "auto", padding: 20 }}>
        <div style={{ maxWidth: 1100, margin: "0 auto" }}>
          {tab === "dashboard" && cust && (
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              {blocked.blocked && (
                <Alert tone="danger" title="Ordering is on hold">
                  {blocked.reason}
                </Alert>
              )}

              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(170px,1fr))", gap: 10 }}>
                <StatCard label="Open orders" value={String(openRows.length)} icon="shopping-cart" tone="info" />
                <StatCard label="Lifetime orders" value={String(orderRows.length)} icon="package" tone="neutral" />
                <StatCard label="Owing" value={AUD0(Number(cust.balance))} icon="wallet" tone={Number(cust.balance) > Number(cust.credit_limit) ? "danger" : "neutral"} />
                <StatCard label="Available credit" value={AUD0(Math.max(0, Number(cust.credit_limit) - Number(cust.balance)))} icon="credit-card" tone="success" />
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(320px,1fr))", gap: 14, alignItems: "start" }}>
                <Card title="Open orders" subtitle="Everything not yet delivered" padding="none">
                  <div style={{ overflowX: "auto" }}>
                    <DataTable
                      columns={[
                        { key: "number", header: "Order", mono: true, width: 140 },
                        { key: "date", header: "Placed", muted: true, width: 110 },
                        { key: "status", header: "Status", width: 130 },
                        { key: "total", header: "Total", numeric: true, align: "right", width: 100 },
                      ]}
                      rows={openRows}
                      dense
                      onRowClick={() => setTab("orders")}
                      emptyMessage="Nothing on the go right now"
                    />
                  </div>
                </Card>

                <Card title="Account" subtitle={`${cust.terms_days} days account`} padding="default">
                  <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 8 }}>
                      <MiniStat label="Limit" value={AUD0(Number(cust.credit_limit))} />
                      <MiniStat label="Owing" value={AUD(Number(cust.balance))} />
                      <MiniStat
                        label="Available"
                        value={AUD(Math.max(0, Number(cust.credit_limit) - Number(cust.balance)))}
                        color={Number(cust.balance) > Number(cust.credit_limit) ? "var(--feedback-danger)" : "var(--feedback-success)"}
                      />
                    </div>
                    <div style={{ height: 6, borderRadius: 9999, background: "var(--bg-sunken)", overflow: "hidden" }}>
                      <div
                        style={{
                          height: "100%",
                          width: cust.credit_limit ? Math.min(100, Math.round((Number(cust.balance) / Number(cust.credit_limit)) * 100)) + "%" : "0%",
                          background: Number(cust.balance) > Number(cust.credit_limit) ? "var(--feedback-danger)" : "var(--brand-primary)",
                        }}
                      />
                    </div>
                    <div style={{ fontSize: 12, color: "var(--text-faint)" }}>
                      Statements are emailed to your accounts contact on the 1st of each month.
                    </div>
                  </div>
                </Card>
              </div>
            </div>
          )}

          {tab === "orders" && (
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                <Select
                  size="sm"
                  options={["All statuses", "Requested", "Preparing", "Loading", "En route", "Delivered"]}
                  value={statusFilter}
                  onChange={(e: any) => setStatusFilter(e.target.value)}
                  style={{ width: 180, flexShrink: 0 }}
                />
                <div style={{ flex: 1 }} />
                <span style={{ fontSize: 12, color: "var(--text-faint)" }}>{orderRows.length} orders</span>
              </div>
              <Card padding="none">
                <div style={{ overflowX: "auto" }}>
                  <DataTable
                    columns={[
                      { key: "number", header: "Order", mono: true, width: 150 },
                      { key: "date", header: "Placed", muted: true, width: 120 },
                      { key: "status", header: "Status", width: 140 },
                      { key: "payment", header: "Payment", width: 110 },
                      { key: "total", header: "Total", numeric: true, align: "right", width: 110 },
                    ]}
                    rows={orderRows.filter((o) => statusFilter === "All statuses" || o.status === statusFilter)}
                    dense
                    emptyMessage="No orders yet"
                  />
                </div>
              </Card>
            </div>
          )}

          {tab === "neworder" && (
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {blocked.blocked && (
                <Alert tone="danger" title="Ordering is on hold">
                  {blocked.reason}
                </Alert>
              )}

              <StepProgress
                steps={["Items", "Delivery & confirm", "Sent"]}
                current={orderStep}
                maxReached={orderStep}
                onStepClick={(n: number) => n <= orderStep && setOrderStep(n)}
                style={{ flex: 1 }}
              />

              {orderStep === 1 && (
                <div style={{ display: "flex", flexWrap: "wrap", gap: 14, alignItems: "flex-start" }}>
                  <div style={{ flex: "1 1 460px", minWidth: 300, display: "flex", flexDirection: "column", gap: 12 }}>
                    <Card padding="default">
                      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                        <Input size="md" icon="search" value={prodQuery} onChange={(e: any) => setProdQuery(e.target.value)} placeholder="Search products" />
                        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                          {catChips.map((label) => {
                            const on = prodCat === label;
                            return (
                              <div
                                key={label}
                                onClick={() => setProdCat(label)}
                                style={{ cursor: "pointer", fontSize: 12, padding: "5px 11px", borderRadius: 9999, border: `1px solid ${on ? "var(--border-strong)" : "var(--border-subtle)"}`, background: on ? "var(--surface-active)" : "transparent", color: on ? "var(--text-primary)" : "var(--text-muted)" }}
                              >
                                {label}
                              </div>
                            );
                          })}
                        </div>
                        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(170px,1fr))", gap: 10 }}>
                          {visibleProducts.map((p) => (
                            <ProductTile
                              key={p.id}
                              name={p.name}
                              sku={p.sku}
                              price={AUD0(priceOf(p))}
                              unit={p.unit}
                              quantity={cart.find((l) => l.id === p.id)?.qty || 0}
                              onAdd={() => addProduct(p.id)}
                              onRemove={() => bump(p.id, -1)}
                            />
                          ))}
                        </div>
                      </div>
                    </Card>
                  </div>

                  <div style={{ flex: "1 1 300px", minWidth: 280, maxWidth: 360, display: "flex", flexDirection: "column", gap: 12 }}>
                    <Card title="Your order" padding="default">
                      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                        {lines.map((l) => (
                          <div key={l.id} style={{ display: "flex", alignItems: "center", gap: 10, paddingBottom: 10, borderBottom: "1px solid var(--border-subtle)" }}>
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <div style={{ fontSize: 13, color: "var(--text-primary)", fontWeight: 500 }}>{l.name}</div>
                              <div className="tabular" style={{ fontSize: 12, color: "var(--text-faint)" }}>
                                {l.qty} {l.unit} × {AUD0(l.price)}
                              </div>
                            </div>
                            <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                              <MiniBtn onClick={() => bump(l.id, -1)}>−</MiniBtn>
                              <MiniBtn onClick={() => addProduct(l.id)}>+</MiniBtn>
                            </div>
                            <div className="tabular" style={{ width: 72, textAlign: "right", fontSize: 13, fontWeight: 600, color: "var(--text-primary)" }}>
                              {AUD(l.lineTotal)}
                            </div>
                          </div>
                        ))}
                        {lines.length === 0 && (
                          <div style={{ padding: "20px 8px", textAlign: "center", fontSize: 12, color: "var(--text-faint)" }}>
                            Nothing yet. Tap a product to add it.
                          </div>
                        )}
                        <div style={{ display: "flex", justifyContent: "space-between", paddingTop: 6, borderTop: "1px solid var(--border-subtle)" }}>
                          <span style={{ fontSize: 13, color: "var(--text-muted)" }}>Subtotal</span>
                          <span className="tabular" style={{ fontSize: 16, fontWeight: 600, color: "var(--text-primary)" }}>
                            {AUD(goods)}
                          </span>
                        </div>
                        <Button variant="primary" size="lg" iconLeft="arrow-right" fullWidth disabled={lines.length === 0} onClick={() => lines.length && setOrderStep(2)}>
                          {lines.length === 0 ? "Add an item to continue" : "Continue to delivery"}
                        </Button>
                      </div>
                    </Card>
                  </div>
                </div>
              )}

              {orderStep === 2 && (
                <div style={{ display: "flex", flexWrap: "wrap", gap: 14, alignItems: "flex-start" }}>
                  <div style={{ flex: "1 1 400px", minWidth: 300, display: "flex", flexDirection: "column", gap: 12 }}>
                    <Card title="Delivery" padding="default">
                      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                        <Tabs
                          items={[
                            { id: "delivery", label: "Delivery", icon: "truck" },
                            { id: "pickup", label: "Pickup", icon: "shopping-bag" },
                          ]}
                          activeId={method}
                          onSelect={(id: string) => setMethod(id as any)}
                          variant="segmented"
                          fullWidth
                        />
                        {method === "delivery" && (
                          <>
                            <Select
                              label="Deliver to"
                              options={sites.map((s) => ({
                                value: s.id,
                                label: `${s.label} — ${s.street}, ${suburbName(s.suburb_id)}`,
                              }))}
                              value={siteChoice}
                              onChange={(e: any) => setSiteChoice(e.target.value)}
                            />
                            {site && rate && (
                              <AddressBlock
                                label="Delivery address"
                                street={site.street}
                                suburb={suburbName(site.suburb_id)}
                                postcode={rate.postcode}
                                suburbId={rate.id}
                                deliveryFee={AUD(fee)}
                                deliveryFeeSource="suburb"
                                source="customer"
                                verified
                                onOpenMap={() =>
                                  window.open(
                                    "https://www.google.com/maps/search/?api=1&query=" +
                                      encodeURIComponent(`${site.street} ${suburbName(site.suburb_id)} VIC ${rate.postcode}`),
                                    "_blank"
                                  )
                                }
                                onChange={() => {}}
                              />
                            )}
                          </>
                        )}
                        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                          <Input label="Date" value={reqDate} onChange={(e: any) => setReqDate(e.target.value)} />
                          <Select
                            label="Window"
                            options={["ASAP", "Within the hour", "07:00 – 11:00", "11:00 – 15:00", "15:00 – 17:00"]}
                            value={reqWindow}
                            onChange={(e: any) => setReqWindow(e.target.value)}
                          />
                        </div>
                        <Input label="PO / reference (optional)" value={poRef} onChange={(e: any) => setPoRef(e.target.value)} placeholder="Your job or PO number" />
                        <Textarea
                          label="Order notes"
                          value={orderNotes}
                          onChange={(v: any) => setOrderNotes(typeof v === "string" ? v : v.target.value)}
                          placeholder="Anything for the office — references, billing notes"
                        />
                        <Textarea
                          label="Delivery notes for the driver"
                          value={deliveryNotes}
                          onChange={(v: any) => setDeliveryNotes(typeof v === "string" ? v : v.target.value)}
                          placeholder="Gate codes, drop points — reaches the driver"
                        />
                      </div>
                    </Card>
                  </div>

                  <div style={{ flex: "1 1 300px", minWidth: 280, maxWidth: 360, display: "flex", flexDirection: "column", gap: 12 }}>
                    <PaymentSummary
                      lines={[
                        { label: "Goods", value: AUD(goods) },
                        {
                          label: method === "delivery" ? `Delivery — ${site ? suburbName(site.suburb_id) : ""}` : "Pickup — no delivery fee",
                          value: AUD(fee),
                        },
                        ...(fuel > 0 ? [{ label: "Fuel surcharge", value: AUD(fuel) }] : []),
                        { label: "Includes GST", value: AUD(total / 11) },
                      ]}
                      total={AUD(total)}
                      paymentStatus="invoiced"
                      paymentType={cust ? `${cust.terms_days}-day account` : ""}
                      paymentTypeSource="customer"
                      paymentMethod="On account"
                      statementEligible
                    />
                    <div style={{ display: "flex", gap: 8 }}>
                      <div style={{ flex: 1 }}>
                        <Button variant="ghost" size="lg" iconLeft="arrow-left" fullWidth onClick={() => setOrderStep(1)}>
                          Back
                        </Button>
                      </div>
                      <div style={{ flex: 2 }}>
                        <Button variant="primary" size="lg" iconLeft="check" fullWidth disabled={blocked.blocked || submitting} onClick={() => void submitOrder()}>
                          Place order
                        </Button>
                      </div>
                    </div>
                    <div style={{ fontSize: 11, color: "var(--text-faint)", textWrap: "pretty" as any }}>
                      This goes straight to Surrey Hills Garden Supplies for confirmation — there's no separate approval
                      step here.
                    </div>
                  </div>
                </div>
              )}

              {orderStep === 3 && (
                <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 14, padding: "60px 20px", textAlign: "center" }}>
                  <div style={{ width: 56, height: 56, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", background: "color-mix(in srgb, var(--feedback-success) 16%, transparent)" }}>
                    <Icon name="badge-check" size={28} color="var(--feedback-success)" />
                  </div>
                  <div style={{ fontSize: 18, fontWeight: 600, color: "var(--text-primary)" }}>Order sent — {lastOrderNumber}</div>
                  <div style={{ fontSize: 13, color: "var(--text-muted)", maxWidth: 380, textWrap: "pretty" as any }}>
                    Surrey Hills Garden Supplies has it on their dispatch board now, as Requested. You'll see it move
                    here as they confirm and load it.
                  </div>
                  <div style={{ display: "flex", gap: 8 }}>
                    <Button variant="outline" size="md" onClick={() => setTab("orders")}>
                      View my orders
                    </Button>
                    <Button
                      variant="primary"
                      size="md"
                      iconLeft="plus"
                      onClick={() => {
                        setOrderStep(1);
                        setCart([]);
                      }}
                    >
                      Place another
                    </Button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </>
  );
}

function MiniStat({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <div style={{ padding: 10, borderRadius: 8, background: "var(--surface-raised)" }}>
      <div style={{ fontSize: 11, color: "var(--text-faint)" }}>{label}</div>
      <div className="tabular" style={{ fontSize: 15, fontWeight: 600, color: color || "var(--text-primary)", marginTop: 2 }}>
        {value}
      </div>
    </div>
  );
}

function MiniBtn({ children, onClick }: { children: React.ReactNode; onClick: () => void }) {
  return (
    <div
      onClick={onClick}
      style={{ cursor: "pointer", width: 24, height: 24, display: "flex", alignItems: "center", justifyContent: "center", borderRadius: 6, border: "1px solid var(--border-default)", color: "var(--text-muted)" }}
    >
      {children}
    </div>
  );
}
