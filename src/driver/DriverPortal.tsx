import React, { useEffect, useMemo, useState } from "react";
import { fetchIn, pageAll, supabase } from "../lib/supabase";
import { qtyText, shortDate, STATUS_ACCENT } from "../lib/domain";
import { mapsDirectionsUrl, mapsSearchUrl } from "../lib/googleMaps";
import type { Order, OrderItem, Product, Suburb } from "../lib/types";
import { Button, Icon, StatusBadge } from "../design-system/components.js";

/* Driver portal — mobile-first, per "Driver Portal.dc.html": PIN sign-in, today's
   jobs, one job in view at a time, big touch targets. Loading → En route →
   Delivered is the whole vocabulary; a driver marking Delivered moves the order
   to the same lane the board uses, so the two paths can never disagree. */

interface DriverUser {
  id: string;
  name: string;
}

export default function DriverPortal() {
  const [driver, setDriver] = useState<DriverUser | null>(() => {
    try {
      const raw = localStorage.getItem("sdp_driver_session");
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
        maxWidth: 480,
        margin: "0 auto",
        background: "var(--bg-app)",
        color: "var(--text-body)",
        fontFamily: "Inter, system-ui, sans-serif",
        fontSize: 16,
        display: "flex",
        flexDirection: "column",
      }}
    >
      {driver ? <DriverApp driver={driver} onSignOut={() => {
        localStorage.removeItem("sdp_driver_session");
        setDriver(null);
      }} /> : <DriverLogin onLogin={(u) => {
        localStorage.setItem("sdp_driver_session", JSON.stringify(u));
        setDriver(u);
      }} />}
    </div>
  );
}

function DriverLogin({ onLogin }: { onLogin: (u: DriverUser) => void }) {
  const [pin, setPin] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const press = async (d: string) => {
    if (busy) return;
    if (d === "back") {
      setPin((p) => p.slice(0, -1));
      setError("");
      return;
    }
    if (pin.length >= 4) return;
    const next = pin + d;
    setPin(next);
    setError("");
    if (next.length === 4) {
      setBusy(true);
      const { data, error: err } = await supabase.rpc("driver_login", { p_pin: next });
      setBusy(false);
      if (err || !data?.length) {
        setPin("");
        setError("That PIN doesn't match an active driver");
        return;
      }
      onLogin({ id: data[0].id, name: data[0].name });
    }
  };

  return (
    <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", padding: 24, minHeight: "100vh" }}>
      <div style={{ width: "100%", display: "flex", flexDirection: "column", gap: 20 }}>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 8, textAlign: "center" }}>
          <img src="/swiftdispatch-mark.png" alt="" style={{ height: 44, width: 44, objectFit: "contain" }} />
          <div style={{ fontSize: 19, fontWeight: 600, color: "var(--text-primary)" }}>Driver</div>
          <div style={{ fontSize: 13, color: "var(--text-faint)" }}>Enter your PIN to see today's jobs</div>
        </div>

        <div style={{ display: "flex", gap: 10, justifyContent: "center" }}>
          {[0, 1, 2, 3].map((i) => (
            <div key={i} style={{ width: 56, height: 64, borderRadius: 12, background: "var(--surface-card)", border: "1px solid var(--border-default)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 26, fontWeight: 700, color: "var(--text-primary)" }}>
              {pin[i] ? "•" : ""}
            </div>
          ))}
        </div>

        {error && <div style={{ textAlign: "center", fontSize: 13, color: "var(--feedback-danger)" }}>{error}</div>}

        <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 10 }}>
          {"1,2,3,4,5,6,7,8,9,,0,back".split(",").map((d, i) => (
            <div
              key={i}
              onClick={() => (d === "" ? undefined : void press(d))}
              style={{ visibility: d === "" ? "hidden" : "visible", cursor: "pointer", height: 64, borderRadius: 12, background: "var(--surface-raised)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22, fontWeight: 600, color: "var(--text-primary)", userSelect: "none", opacity: busy ? 0.6 : 1 }}
            >
              {d === "back" ? "⌫" : d}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function DriverApp({ driver, onSignOut }: { driver: DriverUser; onSignOut: () => void }) {
  const [orders, setOrders] = useState<Order[]>([]);
  const [items, setItems] = useState<Record<string, OrderItem[]>>({});
  const [products, setProducts] = useState<Product[]>([]);
  const [suburbs, setSuburbs] = useState<Suburb[]>([]);
  const [selId, setSelId] = useState<string | null>(null);
  const [photos, setPhotos] = useState<Record<string, string>>({});

  const load = async () => {
    const [o, s, p] = await Promise.all([
      pageAll(() =>
        supabase.from("orders").select("*", { count: "exact" }).eq("driver_id", driver.id).is("deleted_at", null).order("id")
      ),
      pageAll(() => supabase.from("suburbs").select("*", { count: "exact" }).order("name")),
      pageAll(() => supabase.from("products").select("*", { count: "exact" }).order("sku")),
    ]);
    const mine = (o.data || []) as Order[];
    setOrders(mine);
    setSuburbs((s.data || []) as Suburb[]);
    setProducts((p.data || []) as Product[]);
    if (mine.length) {
      const its = await fetchIn<OrderItem>("order_items", "order_id", mine.map((x) => x.id));
      const by: Record<string, OrderItem[]> = {};
      its.forEach((i) => (by[i.order_id] = by[i.order_id] || []).push(i));
      setItems(by);
    }
  };

  useEffect(() => {
    void load();
    const t = setInterval(load, 30000); // dispatch assigns; jobs appear without a refresh
    return () => clearInterval(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [driver.id]);

  const addressOf = (o: Order) => {
    if (o.method === "pickup") return "Yard collection";
    const sub = suburbs.find((s) => s.id === o.suburb_id);
    return [o.street, sub ? `${sub.name} VIC ${sub.postcode}` : ""].filter(Boolean).join(", ");
  };

  const active = useMemo(
    () =>
      orders
        .filter((o) => !["delivered", "cancelled"].includes(o.status))
        .sort((a, b) => ((a.delivery_window || "") > (b.delivery_window || "") ? 1 : -1)),
    [orders]
  );
  const deliveredToday = orders.filter(
    (o) => o.status === "delivered" && o.pod_at && o.pod_at.slice(0, 10) === new Date().toISOString().slice(0, 10)
  );
  const sel = selId ? orders.find((o) => o.id === selId) : null;

  const markStage = async (o: Order, status: "en_route" | "delivered") => {
    const patch: Partial<Order> =
      status === "delivered"
        ? { status, pod_photo_url: photos[o.id] || null, pod_at: new Date().toISOString() }
        : { status };
    setOrders((prev) => prev.map((x) => (x.id === o.id ? { ...x, ...patch } : x)));
    await supabase.from("orders").update(patch).eq("id", o.id);
  };

  const onPhoto = (o: Order, file: File) => {
    const reader = new FileReader();
    reader.onload = () => setPhotos((p) => ({ ...p, [o.id]: String(reader.result) }));
    reader.readAsDataURL(file);
  };

  return (
    <>
      <div style={{ position: "sticky", top: 0, zIndex: 2, height: 56, flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, padding: "0 16px", background: "rgba(9,11,21,.9)", backdropFilter: "blur(10px) saturate(140%)", borderBottom: "1px solid var(--border-subtle)" }}>
        <div style={{ minWidth: 0 }}>
          <div style={{ fontSize: 15, fontWeight: 600, color: "var(--text-primary)" }}>{driver.name}</div>
          <div style={{ fontSize: 11, color: "var(--text-faint)" }}>
            {new Date().toLocaleDateString("en-AU", { weekday: "long", day: "2-digit", month: "long" })}
          </div>
        </div>
        <div onClick={onSignOut} title="Sign out" style={{ cursor: "pointer", width: 38, height: 38, flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center", borderRadius: 8, border: "1px solid var(--border-subtle)", color: "var(--text-muted)" }}>
          <Icon name="log-out" size={18} />
        </div>
      </div>

      <div style={{ flex: 1, overflowY: "auto", padding: 14, display: "flex", flexDirection: "column", gap: 12 }}>
        {!sel && (
          <>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(2,1fr)", gap: 8 }}>
              <div style={{ padding: 12, borderRadius: 12, background: "var(--surface-card)", border: "1px solid var(--border-subtle)" }}>
                <div style={{ fontSize: 11, color: "var(--text-faint)" }}>Remaining</div>
                <div style={{ fontSize: 24, fontWeight: 700, color: "var(--text-primary)", marginTop: 2 }}>{active.length}</div>
              </div>
              <div style={{ padding: 12, borderRadius: 12, background: "var(--surface-card)", border: "1px solid var(--border-subtle)" }}>
                <div style={{ fontSize: 11, color: "var(--text-faint)" }}>Delivered today</div>
                <div style={{ fontSize: 24, fontWeight: 700, color: "var(--feedback-success)", marginTop: 2 }}>{deliveredToday.length}</div>
              </div>
            </div>

            {active.length === 0 && (
              <div style={{ padding: "60px 20px", textAlign: "center", display: "flex", flexDirection: "column", alignItems: "center", gap: 10 }}>
                <Icon name="truck" size={28} color="var(--text-faint)" />
                <div style={{ fontSize: 14, color: "var(--text-muted)" }}>
                  No active deliveries — nothing is assigned to you right now. Jobs appear here the moment dispatch
                  assigns them.
                </div>
              </div>
            )}

            {active.map((o) => (
              <div
                key={o.id}
                onClick={() => setSelId(o.id)}
                style={{ cursor: "pointer", padding: 14, borderRadius: 14, background: "var(--surface-card)", border: "1px solid var(--border-subtle)", borderLeft: `3px solid ${STATUS_ACCENT[o.status] || "var(--border-default)"}`, display: "flex", flexDirection: "column", gap: 8 }}
              >
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
                  <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 13, color: "var(--text-primary)" }}>{o.order_number}</span>
                  <StatusBadge kind="order" value={o.status} />
                </div>
                <div style={{ fontSize: 16, fontWeight: 600, color: "var(--text-primary)" }}>
                  <CustomerName order={o} />
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, color: "var(--text-muted)" }}>
                  <Icon name="clock" size={14} />
                  {shortDate(o.delivery_date)} · {o.delivery_window}
                </div>
                <div style={{ display: "flex", alignItems: "flex-start", gap: 8, fontSize: 13, color: "var(--text-muted)" }}>
                  <Icon name="map-pin" size={14} />
                  {addressOf(o)}
                </div>
              </div>
            ))}
          </>
        )}

        {sel && (
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <div onClick={() => setSelId(null)} style={{ cursor: "pointer", display: "flex", alignItems: "center", gap: 6, fontSize: 14, color: "var(--brand-primary)", fontWeight: 500 }}>
              <Icon name="arrow-left" size={16} />
              All jobs
            </div>

            <div style={{ padding: 16, borderRadius: 14, background: "var(--surface-card)", border: "1px solid var(--border-subtle)", display: "flex", flexDirection: "column", gap: 12 }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
                <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 14, color: "var(--text-primary)" }}>{sel.order_number}</span>
                <StatusBadge kind="order" value={sel.status} />
              </div>
              <div style={{ fontSize: 19, fontWeight: 700, color: "var(--text-primary)" }}>
                <CustomerName order={sel} />
              </div>

              <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 12px", borderRadius: 10, background: "var(--surface-raised)" }}>
                <Icon name="clock" size={16} color="var(--text-faint)" />
                <span style={{ fontSize: 15, color: "var(--text-primary)" }}>
                  {shortDate(sel.delivery_date)} · {sel.delivery_window}
                </span>
              </div>

              <div style={{ display: "flex", alignItems: "flex-start", gap: 10, padding: "10px 12px", borderRadius: 10, background: "var(--surface-raised)" }}>
                <Icon name="map-pin" size={16} color="var(--text-faint)" />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 15, color: "var(--text-primary)" }}>{addressOf(sel)}</div>
                  <div style={{ display: "flex", gap: 14, marginTop: 6, flexWrap: "wrap" }}>
                    <a href={mapsDirectionsUrl(addressOf(sel))} target="_blank" rel="noreferrer" style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 13, fontWeight: 600 }}>
                      <Icon name="navigation" size={14} />
                      Get directions
                    </a>
                    <a href={mapsSearchUrl(addressOf(sel))} target="_blank" rel="noreferrer" style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 13, fontWeight: 600 }}>
                      <Icon name="map-pin" size={14} />
                      View on map
                    </a>
                  </div>
                </div>
              </div>

              {sel.delivery_notes && (
                <div style={{ padding: "10px 12px", borderRadius: 10, background: "color-mix(in srgb, var(--feedback-warning) 10%, transparent)", border: "1px solid color-mix(in srgb, var(--feedback-warning) 30%, transparent)" }}>
                  <div style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: ".07em", color: "var(--feedback-warning)" }}>Delivery notes</div>
                  <div style={{ fontSize: 14, color: "var(--text-primary)", marginTop: 4, textWrap: "pretty" as any }}>{sel.delivery_notes}</div>
                </div>
              )}

              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                <div style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: ".07em", color: "var(--text-faint)" }}>Items</div>
                {(items[sel.id] || []).map((it) => {
                  const p = products.find((x) => x.id === it.product_id);
                  return (
                    <div key={it.id} style={{ display: "flex", justifyContent: "space-between", fontSize: 14, color: "var(--text-muted)" }}>
                      <span>{p?.name || it.description}</span>
                      <span className="tabular">{qtyText(Number(it.qty), p?.unit || "each")}</span>
                    </div>
                  );
                })}
              </div>
            </div>

            {(sel.status === "loading" || sel.status === "preparing" || sel.status === "requested") && (
              <Button variant="primary" size="lg" iconLeft="truck" fullWidth onClick={() => void markStage(sel, "en_route")}>
                Start delivery — mark en route
              </Button>
            )}

            {sel.status === "en_route" && (
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                <div style={{ fontSize: 13, color: "var(--text-muted)" }}>
                  Photo proof of delivery is required to mark this job delivered.
                </div>
                <label style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 8, height: photos[sel.id] ? 220 : 160, borderRadius: 14, border: "2px dashed var(--border-default)", background: "var(--surface-raised)", cursor: "pointer", overflow: "hidden" }}>
                  {photos[sel.id] ? (
                    <img src={photos[sel.id]} alt="Proof of delivery" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                  ) : (
                    <>
                      <Icon name="camera" size={28} color="var(--text-faint)" />
                      <span style={{ fontSize: 14, color: "var(--text-faint)" }}>Tap to take or choose a photo</span>
                    </>
                  )}
                  <input
                    type="file"
                    accept="image/*"
                    capture="environment"
                    style={{ display: "none" }}
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      if (f) onPhoto(sel, f);
                    }}
                  />
                </label>
                <Button variant="primary" size="lg" iconLeft="badge-check" fullWidth disabled={!photos[sel.id]} onClick={() => void markStage(sel, "delivered")}>
                  Mark delivered
                </Button>
              </div>
            )}

            {sel.status === "delivered" && (
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 8, padding: 20, textAlign: "center" }}>
                <Icon name="badge-check" size={28} color="var(--feedback-success)" />
                <div style={{ fontSize: 15, fontWeight: 600, color: "var(--text-primary)" }}>Delivered</div>
                {sel.pod_at && (
                  <div style={{ fontSize: 12, color: "var(--text-faint)" }}>
                    Marked delivered {new Date(sel.pod_at).toLocaleString("en-AU", { hour: "numeric", minute: "2-digit", day: "2-digit", month: "2-digit" })}
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </>
  );
}

/* Customer name comes with the order rows to keep the portal's reads light. */
function CustomerName({ order }: { order: Order }) {
  const [name, setName] = useState(order.walk_in_name || "");
  useEffect(() => {
    if (!order.customer_id) return;
    void supabase
      .from("customers")
      .select("name")
      .eq("id", order.customer_id)
      .maybeSingle()
      .then(({ data }) => data && setName((data as any).name));
  }, [order.customer_id]);
  return <>{name || "Walk-in"}</>;
}
