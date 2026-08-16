import React, { useMemo, useState } from "react";
import { blankDraft, useApp, type CartLine, type DeliveryDraft } from "../store/store";
import { useUi } from "../store/ui";
import {
  AUD,
  AUD0,
  blockedState,
  fuelOf,
  resolvedSuburbFee,
  customerBadgeType,
  dmy,
  isoFromDmy,
  qtyText,
  roundToStep,
  suburbRate,
  unitFor,
  unitOf,
  unitPrice,
  WINDOWS_30,
  WINDOWS_60,
} from "../lib/domain";
import { PAYMENT_METHODS, type Order, type OrderItem } from "../lib/types";
import { addContact, createOrder } from "../data/api";
import { invoiceDocument, invoiceSheet } from "../print/invoice";
import { printDocument } from "../print/print";
import {
  Alert,
  Button,
  Card,
  Icon,
  Input,
  PaymentSummary,
  ProductTile,
  Select,
  StatusBadge,
  StepProgress,
  Tabs,
  Textarea,
} from "../design-system/components.js";
import AddressSearch from "./AddressSearch";

const CHIP_HUES = ["var(--brand-primary)", "var(--brand-secondary)", "var(--status-loading)", "var(--status-enroute)"];

export default function NewOrder() {
  const ui = useUi();
  const app = useApp();
  const { products, categories, specials, customers, suburbs, trucks, paySettings, business } = app;

  const yard = ui.orderMode === "yardsale";
  const drafts = ui.drafts;
  const cart = ui.cart;
  const isSplitDraft = !yard && drafts.length > 1;
  const isDelivery = ui.fulfilMethod === "delivery";

  const [catFilter, setCatFilter] = useState("All");
  const [prodQuery, setProdQuery] = useState("");
  const [custQuery, setCustQuery] = useState("");
  const [contactAddOpen, setContactAddOpen] = useState(false);
  const [newContact, setNewContact] = useState({ name: "", phone: "" });
  const [creating, setCreating] = useState(false);

  const priceOf = (pid: string) => unitPrice(products.find((p) => p.id === pid), specials, () => null);
  const product = (pid: string) => products.find((p) => p.id === pid);
  const catName = (id: string | null) => categories.find((c) => c.id === id)?.name || "—";

  const customer = ui.customerId ? customers.find((c) => c.id === ui.customerId) || null : null;
  const effectiveCustomer = yard && !ui.yardCustomer ? null : customer;
  const quickBlock = yard && !ui.yardCustomer ? { blocked: false, reason: "" } : blockedState(effectiveCustomer);

  const chipFor = (letter: string) => {
    const i = drafts.findIndex((d) => d.letter === letter);
    return CHIP_HUES[i < 0 ? 0 : i % CHIP_HUES.length];
  };

  const activeDraft = drafts.some((d) => d.letter === ui.activeDraft) ? ui.activeDraft : drafts[0].letter;

  /* Fee charged = suburb rate + markup (Payments › Settings). A hand-typed fee
     is taken as-is. Fuel surcharge is its own line, never folded into the fee. */
  const draftFeeOf = (d: DeliveryDraft) =>
    d.feeSource === "manual" ? Number(d.fee) || 0 : resolvedSuburbFee(d.suburbId, suburbs, paySettings).total;

  const lines = cart.map((l, index) => {
    const p = product(l.productId)!;
    const price = priceOf(l.productId);
    return { ...p, index, to: l.to, qty: l.qty, typed: l.typed, price, lineTotal: price * l.qty };
  });
  const goods = lines.reduce((s, l) => s + l.lineTotal, 0);
  const feeTotal = yard || !isDelivery ? 0 : drafts.reduce((s, d) => s + draftFeeOf(d), 0);
  const fuelTotal = yard || !isDelivery ? 0 : fuelOf(paySettings) * drafts.length;
  const [adjustValue, setAdjustValue] = useState("");
  const adjustNum = parseFloat(adjustValue) || 0;
  /* An adjustment goes either way: a discount off the goods or a surcharge on
     top. The value stored on the order is signed — negative discounts. */
  const adjustSigned = ui.adjustDirection === "surcharge" ? adjustNum : -adjustNum;
  const adjust = ui.adjustType === "Percent" ? Math.round(goods * adjustSigned) / 100 : adjustSigned;
  const isSurcharge = ui.adjustDirection === "surcharge";
  const adjustLabel =
    (ui.adjustType === "Percent" ? `Adjustment — ${adjustNum}% ` : "Adjustment — ") +
    (isSurcharge ? "surcharge" : "discount");
  const total = goods + feeTotal + fuelTotal + adjust;

  const setCart = (next: CartLine[]) => ui.set({ cart: next });
  const setDrafts = (next: DeliveryDraft[]) => ui.set({ drafts: next });
  const patchDraft = (letter: string, patch: Partial<DeliveryDraft>) =>
    setDrafts(drafts.map((d) => (d.letter === letter ? { ...d, ...patch } : d)));

  const addProduct = (pid: string, step?: number) => {
    const p = product(pid);
    if (!p) return;
    const u = unitFor(p);
    const nominal = step || ui.qtyStep || u.step;
    const n = u.divisible ? Math.max(u.min, roundToStep(nominal, u)) : Math.max(1, Math.ceil(nominal));
    const to = activeDraft;
    const found = cart.find((l) => l.productId === pid && l.to === to);
    setCart(
      found
        ? cart.map((l) => (l.productId === pid && l.to === to ? { ...l, qty: roundToStep(l.qty + n, u), typed: null } : l))
        : [...cart, { productId: pid, qty: n, to, typed: null }]
    );
  };

  const bumpLine = (index: number, dir: number) => {
    setCart(
      cart
        .map((l, i) => {
          if (i !== index) return l;
          const u = unitFor(product(l.productId));
          return { ...l, qty: Math.max(0, roundToStep(l.qty + dir * u.step, u)), typed: null };
        })
        .filter((l) => l.qty > 0)
    );
  };

  /* A typed quantity is kept verbatim while the field has focus — you cannot type
     "0.5" without passing through "" and "0." (§ prototype). */
  const typeQty = (index: number, raw: string) => {
    const clean = String(raw).replace(/[^0-9.]/g, "").replace(/(\..*)\./g, "$1");
    setCart(
      cart.map((l, i) => {
        if (i !== index) return l;
        const n = parseFloat(clean);
        return { ...l, typed: clean, qty: isNaN(n) ? 0 : Math.max(0, n) };
      })
    );
  };

  const commitQty = (index: number) => {
    setCart(
      cart
        .map((l, i) => {
          if (i !== index) return l;
          const u = unitFor(product(l.productId));
          const raw = l.typed === null || l.typed === undefined ? String(l.qty) : l.typed;
          const n = parseFloat(raw);
          if (raw.trim() === "" || isNaN(n) || n <= 0) return { ...l, qty: 0, typed: null };
          return { ...l, qty: Math.max(u.min, roundToStep(n, u)), typed: null };
        })
        .filter((l) => l.qty > 0)
    );
  };

  /* Customer chips: three most recent, plus current pick; searching widens. */
  const cq = custQuery.trim().toLowerCase();
  const custMatches = cq
    ? customers.filter((c) =>
        (c.name + " " + c.account_number + " " + c.contacts.map((x) => x.name + " " + (x.phone || "")).join(" "))
          .toLowerCase()
          .includes(cq)
      )
    : customers;
  const shownCustomers = cq
    ? custMatches.slice(0, 8)
    : customers.slice(0, 3).concat(customer && !customers.slice(0, 3).some((c) => c.id === customer.id) ? [customer] : []);
  const hiddenCount = cq ? Math.max(0, custMatches.length - 8) : Math.max(0, customers.length - shownCustomers.length);

  /* When a phone/name search lands on a business with a known contact, that
     contact auto-selects (§6). */
  const pickCustomer = (cId: string) => {
    const c = customers.find((x) => x.id === cId);
    if (!c) return;
    const site = c.sites.find((x) => x.is_default) || c.sites[0];
    const r = site ? suburbRate(site.suburb_id, suburbs) : null;
    const ordersContact = c.contacts.find((x) => x.roles.includes("Orders")) || c.contacts[0];
    ui.set({
      customerId: c.id,
      orderContact: ordersContact?.id || null,
      drafts: drafts.map((d, i) =>
        i === 0
          ? { ...d, street: site?.street || "", suburbId: site?.suburb_id || null, fee: r?.fee || 0, feeSource: "suburb" }
          : d
      ),
    });
    setContactAddOpen(false);
  };

  const catNames = ["All", ...categories.map((c) => c.name)];
  const pq = prodQuery.trim().toLowerCase();
  const visibleProducts = products.filter((p) => {
    if (catFilter !== "All" && catName(p.category_id) !== catFilter) return false;
    return !pq || (p.name + " " + p.sku).toLowerCase().includes(pq);
  });

  const perDraft = drafts.map((d) => ({
    letter: d.letter,
    lineTotal: cart.filter((l) => l.to === d.letter).reduce((s, l) => s + priceOf(l.productId) * l.qty, 0),
    count: cart.filter((l) => l.to === d.letter).length,
  }));
  const emptyDrafts = isSplitDraft ? perDraft.filter((p) => p.count === 0) : [];
  const badSuburbs =
    yard || !isDelivery
      ? []
      : drafts
          .filter((d) => suburbRate(d.suburbId, suburbs).missing)
          .map((d) => ({
            letter: d.letter,
            why: !d.suburbId
              ? `Delivery ${d.letter} has no suburb set.`
              : `Delivery ${d.letter} is set to a suburb that is switched off in Suburbs.`,
          }));

  const summaryLines: { label: string; value: string; negative?: boolean }[] = [{ label: "Goods", value: AUD(goods) }];
  if (!yard && isDelivery) {
    drafts.forEach((d) => {
      const name = suburbs.find((s) => s.id === d.suburbId)?.name || "no suburb";
      summaryLines.push({
        label: isSplitDraft ? `Delivery ${d.letter} — ${name}` : `Delivery — ${name}`,
        value: AUD(draftFeeOf(d)),
      });
    });
  }
  if (fuelTotal > 0)
    summaryLines.push({
      label: "Fuel surcharge" + (drafts.length > 1 ? ` — ${drafts.length} deliveries` : ""),
      value: AUD(fuelTotal),
    });
  if (adjustNum > 0)
    summaryLines.push({
      label: adjustLabel,
      value: (adjust < 0 ? "−" : "+") + AUD(Math.abs(adjust)),
      negative: adjust < 0,
    });
  summaryLines.push({ label: "Includes GST", value: AUD(total / 11) });

  const createDisabled =
    creating || lines.length === 0 || emptyDrafts.length > 0 || quickBlock.blocked || badSuburbs.length > 0;

  const doCreate = async () => {
    if (createDisabled) return;
    setCreating(true);
    const order = await createOrder({
      mode: ui.orderMode,
      customer: effectiveCustomer,
      contactId: ui.orderContact,
      walkInName: ui.yardWalkInName,
      method: yard ? "pickup" : ui.fulfilMethod,
      drafts,
      cart,
      settleMethod: ui.settleMethod,
      poNumber: ui.poNumber,
      orderNotes: ui.orderNotesDraft,
      deliveryNotes: ui.deliveryNotesDraft,
      adjustmentType: adjustNum > 0 ? (ui.adjustType === "Percent" ? "percent" : "amount") : null,
      adjustmentValue: adjustNum > 0 ? adjustSigned : null,
      fuelSurcharge: yard || !isDelivery ? 0 : fuelOf(paySettings),
    });
    setCreating(false);
    if (order) {
      app.toast({ tone: "success", title: `${order.order_number} created`, description: yard ? "Docket printed at the counter." : undefined });
      ui.set({
        nav: yard ? "neworder" : "board",
        cart: [],
        drafts: [blankDraft("A")],
        activeDraft: "A",
        orderStep: 1,
        poNumber: "",
        orderNotesDraft: "",
        deliveryNotesDraft: "",
        settleMethod: null,
        yardCustomer: false,
        yardWalkInName: "",
      });
    }
  };

  /* Print from step 2 shows the tax invoice this order will become, not the
     admin screen. The order has no number until it is created, so the number
     line says so rather than inventing one — a split prints a page per delivery,
     the same as it will once created. */
  const printPreview = () => {
    const placedAt = new Date().toISOString();
    const sheets = drafts.map((d) => {
      const lines = isSplitDraft ? cart.filter((l) => l.to === d.letter) : cart;
      const items: OrderItem[] = lines.map((l, i) => {
        const price = priceOf(l.productId);
        return {
          id: `preview-${d.letter}-${i}`,
          order_id: "preview",
          product_id: l.productId,
          variant_id: null,
          description: null,
          qty: l.qty,
          unit_price: price,
          line_total: Math.round(price * l.qty * 100) / 100,
        };
      });
      const order = {
        id: "preview",
        order_number: "",
        kind: yard ? "yard_sale" : isSplitDraft ? "split" : "standard",
        parent_order_id: null,
        customer_id: effectiveCustomer?.id || null,
        contact_id: ui.orderContact,
        walk_in_name: ui.yardWalkInName || null,
        customer_override: null,
        status: "requested",
        method: yard ? "pickup" : ui.fulfilMethod,
        street: d.street,
        suburb_id: d.suburbId,
        delivery_fee: d.fee,
        fee_source: d.feeSource,
        delivery_date: d.dateIso,
        delivery_window: d.window,
        placed_at: placedAt,
        truck_id: d.truckId,
        driver_id: null,
        payment_type: null,
        payment_type_overridden: false,
        payment_method: (ui.settleMethod as Order["payment_method"]) || null,
        payment_status: "pending",
        po_number: ui.poNumber || null,
        order_notes: ui.orderNotesDraft || null,
        delivery_notes: ui.deliveryNotesDraft || null,
        adjustment_type: adjustNum > 0 ? (ui.adjustType === "Percent" ? "percent" : "amount") : null,
        adjustment_value: adjustNum > 0 ? adjustSigned : null,
        processed_at: null,
        overrides: {},
        fuel_surcharge: yard || !isDelivery ? 0 : fuelOf(paySettings),
        pod_photo_url: null,
        pod_at: null,
        myob_uid: null,
        myob_doc_type: null,
        myob_number: null,
        myob_pushed_at: null,
        myob_error: null,
        deleted_at: null,
      } as Order;
      return invoiceSheet({
        order,
        items,
        products,
        suburbs,
        customer: effectiveCustomer,
        business,
        paySettings,
        numberLabel: isSplitDraft
          ? `Not yet created — delivery ${d.letter} of ${drafts.length}`
          : "Not yet created",
      });
    });
    printDocument(invoiceDocument("Tax Invoice - preview", sheets));
  };

  /* Enter advances the flow where a continue action exists (§6). */
  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key !== "Enter") return;
    const tag = (e.target as HTMLElement).tagName;
    if (tag === "TEXTAREA") return;
    if (ui.orderStep === 1 && lines.length) ui.set({ orderStep: 2 });
    else if (ui.orderStep === 2 && (e.ctrlKey || yard)) void doCreate();
  };

  const contactOptions = (effectiveCustomer?.contacts || []).map((ct) => ({
    value: ct.id,
    label: ct.phone ? `${ct.name} — ${ct.phone}` : ct.name,
  }));
  const customerIsBusiness = effectiveCustomer ? effectiveCustomer.entity !== "Individual" : false;

  const suburbOptions = suburbs.filter((s) => s.active).map((s) => ({ value: s.id, label: s.name }));
  const truckOptions = trucks.map((t) => ({ value: t.id, label: `${t.rego} — ${t.type}` }));

  /* One adjustment, edited from either step: direction (discount or surcharge),
     amount, and whether that amount is a percentage of goods or dollars. */
  const AdjustmentFields = () => (
    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      <Tabs
        items={[
          { id: "discount", label: "Discount" },
          { id: "surcharge", label: "Surcharge" },
        ]}
        activeId={ui.adjustDirection}
        onSelect={(id: string) => ui.set({ adjustDirection: id as "discount" | "surcharge" })}
        variant="segmented"
        fullWidth
      />
      <div style={{ display: "flex", alignItems: "flex-end", gap: 8, flexWrap: "wrap" }}>
        <div style={{ flex: 1, minWidth: 100 }}>
          <Input
            size="sm"
            label="Adjustment"
            aria-label="Adjustment value"
            value={adjustValue}
            onChange={(e: any) => setAdjustValue(e.target.value.replace(/[^0-9.]/g, ""))}
          />
        </div>
        <Select
          size="sm"
          label="Type"
          options={["Percent", "Dollars"]}
          value={ui.adjustType}
          onChange={(e: any) => ui.set({ adjustType: e.target.value })}
          style={{ width: 118, flexShrink: 0 }}
        />
      </div>
    </div>
  );

  const customerPickerCard = (
    <Card
      title={yard ? (ui.yardCustomer ? "On account" : "Walk-in") : "Customer"}
      subtitle={
        yard
          ? ui.yardCustomer
            ? "Still settled at the counter"
            : "No record needed for a counter sale"
          : "Sets pricing, credit and the delivery address"
      }
      padding="default"
    >
      <div style={{ display: "flex", flexDirection: "column", gap: 9 }}>
        {yard && !ui.yardCustomer && (
          <>
            <div style={{ fontSize: 12, color: "var(--text-muted)", textWrap: "pretty" as any }}>
              Counter sale — no record needed. Name whoever is at the counter only if they want it on the docket.
            </div>
            <Input
              size="sm"
              label="Name on the docket (optional)"
              value={ui.yardWalkInName}
              onChange={(e: any) => ui.set({ yardWalkInName: e.target.value })}
              placeholder="Who is collecting"
            />
            <Button variant="outline" size="sm" iconLeft="building-2" onClick={() => ui.set({ yardCustomer: true })} fullWidth>
              Put it on a business account
            </Button>
          </>
        )}
        {(!yard || ui.yardCustomer) && (
          <>
            <Input
              size="sm"
              icon="search"
              value={custQuery}
              onChange={(e: any) => setCustQuery(e.target.value)}
              placeholder="Search a business or person"
            />
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
              {shownCustomers.map((c) => {
                const on = effectiveCustomer?.id === c.id;
                return (
                  <div
                    key={c.id}
                    onClick={() => pickCustomer(c.id)}
                    title={`${c.entity} · ${c.contacts.length === 1 ? "1 contact" : c.contacts.length + " contacts"}`}
                    style={{
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      gap: 5,
                      fontSize: 11,
                      padding: "3px 9px",
                      borderRadius: 9999,
                      whiteSpace: "nowrap",
                      border: `1px solid ${on ? "var(--border-accent)" : "var(--border-subtle)"}`,
                      background: on ? "var(--om-chip-active-bg)" : "transparent",
                      color: on ? "var(--text-primary)" : "var(--text-muted)",
                    }}
                  >
                    <Icon name={c.entity === "Company" ? "building-2" : c.entity === "Sole trader" ? "wrench" : "user"} size={11} />
                    {c.name}
                  </div>
                );
              })}
              {custMatches.length === 0 && (
                <span style={{ fontSize: 11, color: "var(--text-faint)" }}>Nothing matches "{custQuery}".</span>
              )}
              {hiddenCount > 0 && (
                <span style={{ fontSize: 11, color: "var(--text-faint)", alignSelf: "center" }}>
                  +{hiddenCount} more — {cq ? "keep typing" : "search to find them"}
                </span>
              )}
            </div>
            {effectiveCustomer && (
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  padding: "8px 10px",
                  borderRadius: 8,
                  background: "var(--surface-raised)",
                  border: "1px solid var(--border-subtle)",
                }}
              >
                <StatusBadge kind="customer" value={customerBadgeType(effectiveCustomer)} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 12, fontWeight: 600, color: "var(--text-primary)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {effectiveCustomer.name}
                  </div>
                  <div style={{ fontSize: 11, color: "var(--text-faint)" }}>
                    Acct {effectiveCustomer.account_number} ·{" "}
                    {effectiveCustomer.billing === "account" ? `${effectiveCustomer.terms_days} days account` : "prepaid"}
                  </div>
                </div>
                {yard && ui.yardCustomer && (
                  <div
                    onClick={() => ui.set({ yardCustomer: false, orderContact: null })}
                    title="Back to a walk-in"
                    style={{
                      cursor: "pointer",
                      width: 22,
                      height: 22,
                      flexShrink: 0,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      borderRadius: 6,
                      border: "1px solid var(--border-default)",
                      color: "var(--text-muted)",
                    }}
                  >
                    <Icon name="x" size={11} />
                  </div>
                )}
              </div>
            )}
            {customerIsBusiness && (
              <Select
                size="sm"
                label={`Who is ordering for ${effectiveCustomer!.name}`}
                options={contactOptions}
                value={ui.orderContact || ""}
                onChange={(e: any) => ui.set({ orderContact: e.target.value || null })}
                allowUnset
              />
            )}
            {contactAddOpen && effectiveCustomer && (
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: 8,
                  padding: 10,
                  borderRadius: 8,
                  border: "1px dashed var(--border-accent)",
                  background: "var(--om-inline-add-bg)",
                }}
              >
                <div style={{ fontSize: 12, color: "var(--text-muted)", textWrap: "pretty" as any }}>
                  A name is all you need. Phone and email can follow later.
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(130px,1fr))", gap: 8 }}>
                  <Input size="sm" label="Name" value={newContact.name} onChange={(e: any) => setNewContact({ ...newContact, name: e.target.value })} placeholder="Who is ordering" />
                  <Input size="sm" label="Phone (optional)" value={newContact.phone} onChange={(e: any) => setNewContact({ ...newContact, phone: e.target.value })} placeholder="0412 000 000" />
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  iconLeft="user"
                  disabled={!newContact.name.trim()}
                  fullWidth
                  onClick={() => {
                    const row = addContact(effectiveCustomer.id, {
                      name: newContact.name.trim(),
                      phone: newContact.phone.trim() || null,
                      email: null,
                      roles: ["Orders"],
                    });
                    ui.set({ orderContact: row.id });
                    setNewContact({ name: "", phone: "" });
                    setContactAddOpen(false);
                  }}
                >
                  Add contact and use it
                </Button>
              </div>
            )}
            {customerIsBusiness && (
              <div onClick={() => setContactAddOpen(!contactAddOpen)} style={{ cursor: "pointer", fontSize: 11, color: "var(--brand-primary)" }}>
                {contactAddOpen ? "Cancel" : "Contact not listed? Add them"}
              </div>
            )}
            {quickBlock.blocked && (
              <div style={{ fontSize: 11, color: "var(--feedback-danger)", textWrap: "pretty" as any }}>{quickBlock.reason}</div>
            )}
          </>
        )}
      </div>
    </Card>
  );

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }} onKeyDown={onKeyDown}>
      <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
        <Tabs
          items={[
            { id: "standard", label: "Standard", icon: "truck" },
            { id: "yardsale", label: "Yard sale", icon: "zap" },
          ]}
          activeId={ui.orderMode}
          onSelect={(id: string) =>
            ui.set({ orderStep: 1, orderMode: id as any, cart: id === "yardsale" ? [] : cart, yardCustomer: false })
          }
          variant="segmented"
          style={{ width: 290, flexShrink: 0 }}
        />
        <StepProgress
          steps={["Items", yard ? "Payment" : "Delivery & payment"]}
          current={ui.orderStep}
          maxReached={lines.length ? 2 : 1}
          onStepClick={(n: number) => {
            if (n === 1 || lines.length) ui.set({ orderStep: n });
          }}
          style={{ flex: "1 1 300px", minWidth: 0 }}
        />
      </div>

      {ui.savedDraft && lines.length === 0 && ui.orderStep === 1 && (
        <Alert
          tone="info"
          title={"You have an order saved from earlier" + (ui.savedDraft.orderMode === "yardsale" ? " — yard sale" : "")}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
            <span style={{ flex: 1, minWidth: 180 }}>Saved {ui.savedDraft.savedAt}.</span>
            <Button variant="outline" size="sm" onClick={() => ui.discardSavedOrder()}>
              Discard
            </Button>
            <Button variant="primary" size="sm" iconLeft="rotate-ccw" onClick={() => ui.resumeSavedOrder()}>
              Resume
            </Button>
          </div>
        </Alert>
      )}

      {ui.orderStep === 1 && (
        <div style={{ display: "flex", flexWrap: "wrap", gap: 12, alignItems: "flex-start" }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 12, flex: "1 1 460px", minWidth: 300 }}>
            <Card padding="default" style={{ minWidth: 0 }}>
              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                    flexWrap: "wrap",
                    padding: "8px 10px",
                    borderRadius: 10,
                    background: "var(--bg-sunken)",
                    border: "1px solid var(--border-default)",
                  }}
                >
                  <span style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: ".09em", whiteSpace: "nowrap", color: "var(--text-faint)" }}>
                    {isSplitDraft ? "Loading into" : "One delivery"}
                  </span>
                  {isSplitDraft ? (
                    drafts.map((d, i) => {
                      const on = d.letter === activeDraft;
                      const name = suburbs.find((s) => s.id === d.suburbId)?.name;
                      return (
                        <div
                          key={d.letter}
                          onClick={() => ui.set({ activeDraft: d.letter })}
                          style={{
                            cursor: "pointer",
                            display: "flex",
                            alignItems: "center",
                            gap: 7,
                            padding: "5px 12px",
                            borderRadius: 8,
                            border: `1px solid ${on ? chipFor(d.letter) : "var(--border-subtle)"}`,
                            background: on ? "var(--surface-active)" : "transparent",
                          }}
                        >
                          <span style={{ width: 18, height: 18, display: "flex", alignItems: "center", justifyContent: "center", borderRadius: 5, fontSize: 11, fontWeight: 700, background: chipFor(d.letter), color: "#06070f" }}>
                            {d.letter}
                          </span>
                          <span style={{ fontSize: 12, fontWeight: 600, whiteSpace: "nowrap", color: on ? "var(--text-primary)" : "var(--text-muted)" }}>
                            {isDelivery ? name || "no suburb" : "Pickup"}
                          </span>
                          <span className="tabular" style={{ fontSize: 11, whiteSpace: "nowrap", color: "var(--text-faint)" }}>
                            {perDraft[i].count} {perDraft[i].count === 1 ? "line" : "lines"}
                          </span>
                        </div>
                      );
                    })
                  ) : (
                    <span style={{ fontSize: 12, color: "var(--text-muted)" }}>Everything you tap rides on one delivery</span>
                  )}
                  <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
                    {isSplitDraft && (
                      <Button
                        variant="ghost"
                        size="sm"
                        iconLeft="trash-2"
                        onClick={() => {
                          if (drafts.length < 2) return;
                          const gone = drafts[drafts.length - 1].letter;
                          const keep = drafts.slice(0, -1);
                          ui.set({
                            drafts: keep,
                            activeDraft: keep[keep.length - 1].letter,
                            cart: cart.map((l) => (l.to === gone ? { ...l, to: keep[0].letter } : l)),
                          });
                        }}
                      >
                        Undo split
                      </Button>
                    )}
                    {!yard && (
                      <Button
                        variant="outline"
                        size="sm"
                        iconLeft="git-branch"
                        onClick={() => {
                          const next = String.fromCharCode(65 + drafts.length);
                          const first = drafts[0];
                          ui.set({
                            drafts: [...drafts, { ...first, letter: next, window: "13:00 – 16:00", truckId: null }],
                            activeDraft: next,
                          });
                        }}
                      >
                        {isSplitDraft ? "Add a delivery" : "Split this order"}
                      </Button>
                    )}
                  </div>
                </div>

                {isSplitDraft && (
                  <div style={{ fontSize: 11, color: "var(--text-faint)", textWrap: "pretty" as any }}>
                    Every tile you tap lands on the highlighted delivery. Tap a letter in the cart to move a line across.
                  </div>
                )}

                <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                  <div style={{ flex: "1 1 240px", minWidth: 200 }}>
                    <Input size="md" icon="search" placeholder="Search products or scan a barcode" value={prodQuery} onChange={(e: any) => setProdQuery(e.target.value)} />
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
                    <span style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: ".09em", color: "var(--text-faint)" }}>Step</span>
                    {[0.25, 0.5, 1, 2, 5, 10].map((n) => {
                      const on = ui.qtyStep === n;
                      return (
                        <div
                          key={n}
                          onClick={() => ui.set({ qtyStep: n })}
                          style={{
                            cursor: "pointer",
                            minWidth: 36,
                            textAlign: "center",
                            fontSize: 12,
                            fontWeight: 600,
                            padding: "6px 10px",
                            borderRadius: 6,
                            border: `1px solid ${on ? "var(--border-strong)" : "var(--border-subtle)"}`,
                            background: on ? "var(--surface-active)" : "transparent",
                            color: on ? "var(--text-primary)" : "var(--text-muted)",
                          }}
                        >
                          +{n}
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                  {catNames.map((label) => {
                    const on = catFilter === label;
                    return (
                      <div
                        key={label}
                        onClick={() => setCatFilter(label)}
                        style={{
                          cursor: "pointer",
                          fontSize: 12,
                          padding: "5px 11px",
                          borderRadius: 9999,
                          border: `1px solid ${on ? "var(--border-strong)" : "var(--border-subtle)"}`,
                          background: on ? "var(--surface-active)" : "transparent",
                          color: on ? "var(--text-primary)" : "var(--text-muted)",
                        }}
                      >
                        {label}
                      </div>
                    );
                  })}
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(160px,1fr))", gap: 10 }}>
                  {visibleProducts.map((p) => (
                    <ProductTile
                      key={p.id}
                      name={p.name}
                      sku={p.sku}
                      price={AUD0(priceOf(p.id))}
                      unit={p.unit}
                      quantity={cart.find((l) => l.productId === p.id && l.to === activeDraft)?.qty || 0}
                      onAdd={() => addProduct(p.id)}
                      onRemove={() => {
                        const idx = cart.findIndex((l) => l.productId === p.id && l.to === activeDraft);
                        if (idx >= 0) bumpLine(idx, -1);
                      }}
                    />
                  ))}
                </div>
              </div>
            </Card>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 12, flex: "1 1 320px", minWidth: 290, maxWidth: 400 }}>
            {customerPickerCard}

            <Card title={yard ? "Counter sale" : "Cart"} subtitle={isSplitDraft ? "Tap a letter to move that line to the next delivery" : undefined} padding="default">
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {lines.map((l) => {
                  const u = unitFor(l);
                  const typing = l.typed !== null && l.typed !== undefined;
                  const shown = typing ? l.typed! : String(Number(l.qty.toFixed(u.decimals)));
                  const willRemove = typing && (l.typed!.trim() === "" || parseFloat(l.typed!) === 0);
                  const offStep = !willRemove && Math.abs(l.qty / u.step - Math.round(l.qty / u.step)) > 0.001;
                  return (
                    <div key={l.index} style={{ display: "flex", alignItems: "center", gap: 8, paddingBottom: 9, borderBottom: "1px solid var(--border-subtle)" }}>
                      {isSplitDraft && (
                        <div
                          onClick={() => {
                            const order = drafts.map((d) => d.letter);
                            const next = order[(order.indexOf(l.to) + 1) % order.length];
                            setCart(cart.map((x, i) => (i === l.index ? { ...x, to: next } : x)));
                          }}
                          title="Move to the next delivery"
                          style={{ cursor: "pointer", width: 20, height: 20, flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center", borderRadius: 5, fontSize: 11, fontWeight: 700, background: chipFor(l.to), color: "#06070f" }}
                        >
                          {l.to}
                        </div>
                      )}
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 13, color: "var(--text-primary)", fontWeight: 500, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                          {l.name}
                        </div>
                        <div className="tabular" style={{ fontSize: 12, color: "var(--text-faint)" }}>
                          {AUD0(l.price)} per {l.unit}
                        </div>
                      </div>
                      <div style={{ display: "flex", alignItems: "center", gap: 3, flexShrink: 0 }}>
                        <SmallBtn onClick={() => bumpLine(l.index, -1)} title={stepTitle(u, willRemove, l.name)}>
                          −
                        </SmallBtn>
                        <div
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: 3,
                            flexShrink: 0,
                            padding: "0 5px",
                            height: 22,
                            borderRadius: 6,
                            border: `1px solid ${willRemove ? "var(--feedback-danger)" : offStep ? "var(--feedback-warning)" : "var(--border-default)"}`,
                            background: "var(--surface-input)",
                          }}
                        >
                          <input
                            value={shown}
                            onChange={(e) => typeQty(l.index, e.target.value)}
                            onBlur={() => commitQty(l.index)}
                            inputMode="decimal"
                            title={stepTitle(u, willRemove, l.name)}
                            size={Math.max(3, shown.length)}
                            style={{
                              minWidth: 34,
                              maxWidth: 88,
                              border: "none",
                              outline: "none",
                              background: "transparent",
                              textAlign: "right",
                              fontFamily: "inherit",
                              fontSize: 12,
                              fontVariantNumeric: "tabular-nums",
                              color: "var(--text-primary)",
                            }}
                          />
                          <span style={{ fontSize: 11, color: "var(--text-faint)" }}>{l.unit}</span>
                        </div>
                        <SmallBtn onClick={() => bumpLine(l.index, 1)} title={stepTitle(u, willRemove, l.name)}>
                          +
                        </SmallBtn>
                        <SmallBtn onClick={() => setCart(cart.filter((_, i) => i !== l.index))} title="Remove line">
                          <Icon name="trash-2" size={11} />
                        </SmallBtn>
                      </div>
                      <div className="tabular" style={{ width: 72, textAlign: "right", fontSize: 13, fontWeight: 600, color: "var(--text-primary)", flexShrink: 0 }}>
                        {willRemove ? "—" : AUD(l.lineTotal)}
                      </div>
                    </div>
                  );
                })}
                {lines.length === 0 && (
                  <div style={{ padding: "22px 8px", textAlign: "center", fontSize: 12, color: "var(--text-faint)" }}>
                    No items yet. Tap a product to load it in.
                  </div>
                )}
                <AdjustmentFields />
                <div style={{ display: "flex", flexDirection: "column", gap: 8, paddingTop: 10, borderTop: "1px solid var(--border-subtle)" }}>
                  <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 10 }}>
                    <span style={{ fontSize: 12, color: "var(--text-faint)" }}>Lines</span>
                    <span className="tabular" style={{ fontSize: 12, fontWeight: 500, color: "var(--text-muted)" }}>
                      {lines.length}
                    </span>
                  </div>
                  {adjustNum > 0 && (
                    <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 10 }}>
                      <span style={{ fontSize: 12, color: "var(--text-faint)" }}>{adjustLabel}</span>
                      <span
                        className="tabular"
                        style={{ fontSize: 12, fontWeight: 500, color: adjust < 0 ? "var(--feedback-success)" : "var(--attention)" }}
                      >
                        {adjust < 0 ? "−" : "+"}
                        {AUD(Math.abs(adjust))}
                      </span>
                    </div>
                  )}
                  <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 10 }}>
                    <span style={{ fontSize: 18, color: "var(--text-primary)" }}>Subtotal</span>
                    <span className="tabular" style={{ fontSize: 18, fontWeight: 600, color: "var(--text-primary)" }}>
                      {AUD(goods + adjust)}
                    </span>
                  </div>
                  <div style={{ fontSize: 11, color: "var(--text-faint)", textWrap: "pretty" as any }}>
                    {lines.length
                      ? yard
                        ? "Delivery is not charged on a counter sale. Payment comes next."
                        : "Delivery fees are added on the next step."
                      : "Tap a product to start the order."}
                  </div>
                  <Button variant="primary" size="lg" iconLeft="arrow-right" fullWidth disabled={lines.length === 0} onClick={() => lines.length && ui.set({ orderStep: 2 })}>
                    {lines.length === 0 ? "Add an item to continue" : "Continue checkout"}
                  </Button>
                </div>
              </div>
            </Card>
          </div>
        </div>
      )}

      {ui.orderStep === 2 && (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap", padding: "10px 12px", borderRadius: 10, background: "var(--surface-raised)", border: "1px solid var(--border-subtle)" }}>
            <Button variant="ghost" size="sm" iconLeft="arrow-left" onClick={() => ui.set({ orderStep: 1 })}>
              Back to items
            </Button>
            <span style={{ fontSize: 12, color: "var(--text-muted)" }}>
              {lines.length} {lines.length === 1 ? "line" : "lines"} ·{" "}
              {[...new Set(lines.map((l) => l.unit))]
                .map((u) => qtyText(lines.filter((l) => l.unit === u).reduce((s, l) => s + l.qty, 0), u))
                .join(", ") || "nothing loaded"}
            </span>
            <div style={{ flex: 1 }} />
            <span className="tabular" style={{ fontSize: 14, fontWeight: 600, color: "var(--text-primary)" }}>
              {AUD(goods)} in goods
            </span>
          </div>

          <div style={{ display: "flex", flexWrap: "wrap", gap: 12, alignItems: "flex-start" }}>
            <div style={{ flex: "1 1 320px", minWidth: 300, display: "flex", flexDirection: "column", gap: 12 }}>
              {customerPickerCard}

              {!yard && (
                <Card
                  title="Deliveries"
                  subtitle={isSplitDraft ? `${drafts.length} deliveries under one master order` : "One delivery — add another to split this order"}
                  padding="default"
                >
                  <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                    <Tabs
                      items={[
                        { id: "delivery", label: "Delivery", icon: "truck" },
                        { id: "pickup", label: "Pickup", icon: "shopping-bag" },
                      ]}
                      activeId={ui.fulfilMethod}
                      onSelect={(id: string) => ui.set({ fulfilMethod: id as any })}
                      variant="segmented"
                      fullWidth
                    />

                    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(280px,1fr))", gap: 10 }}>
                      {drafts.map((d, i) => {
                        const rate = suburbRate(d.suburbId, suburbs);
                        const pd = perDraft[i];
                        const site = effectiveCustomer?.sites.find((x) => x.street === d.street && x.suburb_id === d.suburbId);
                        const siteOptions = (effectiveCustomer?.sites || [])
                          .map((x) => ({
                            value: x.id,
                            label: `${x.label} — ${x.street}, ${suburbs.find((s) => s.id === x.suburb_id)?.name || ""}`,
                          }))
                          .concat([{ value: "new", label: "New address" }]);
                        const suburbNm = suburbs.find((s) => s.id === d.suburbId)?.name;
                        return (
                          <div key={d.letter} style={{ display: "flex", flexDirection: "column", gap: 8, padding: 9, borderRadius: 10, border: `1px solid ${isSplitDraft ? "var(--border-default)" : "var(--border-subtle)"}`, background: "var(--bg-sunken)" }}>
                            <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
                              <span style={{ width: 18, height: 18, flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center", borderRadius: 5, fontSize: 11, fontWeight: 700, background: chipFor(d.letter), color: "#06070f" }}>
                                {d.letter}
                              </span>
                              <span style={{ fontSize: 12, fontWeight: 600, color: "var(--text-primary)" }}>
                                {isSplitDraft ? "Delivery " + d.letter : "Delivery details"}
                              </span>
                              <span className="tabular" style={{ marginLeft: "auto", fontSize: 11, color: "var(--text-faint)" }}>
                                {pd.count} lines · {AUD(pd.lineTotal)}
                              </span>
                              {i > 0 && (
                                <div
                                  onClick={() =>
                                    ui.set({
                                      drafts: drafts.filter((x) => x.letter !== d.letter),
                                      cart: cart.map((l) => (l.to === d.letter ? { ...l, to: drafts[0].letter } : l)),
                                      activeDraft: drafts[0].letter,
                                    })
                                  }
                                  title="Remove this delivery"
                                  style={{ cursor: "pointer", width: 20, height: 20, display: "flex", alignItems: "center", justifyContent: "center", borderRadius: 5, border: "1px solid var(--border-default)", color: "var(--text-muted)" }}
                                >
                                  <Icon name="trash-2" size={11} />
                                </div>
                              )}
                            </div>
                            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(120px,1fr))", gap: 6 }}>
                              <PickerField
                                label="Date"
                                icon="calendar"
                                value={dmy(d.dateIso)}
                                onClick={() =>
                                  ui.set({
                                    picker: {
                                      kind: "date",
                                      current: dmy(d.dateIso),
                                      onPick: (v) => {
                                        const iso = isoFromDmy(v);
                                        if (iso) patchDraft(d.letter, { dateIso: iso });
                                      },
                                    },
                                  })
                                }
                              />
                              <PickerField
                                label="Window"
                                icon="clock"
                                value={d.window}
                                onClick={() =>
                                  ui.set({
                                    picker: { kind: "window", current: d.window, onPick: (v) => patchDraft(d.letter, { window: v }) },
                                  })
                                }
                              />
                            </div>
                            {isDelivery && (
                              <>
                                {effectiveCustomer && (
                                  <Select
                                    size="sm"
                                    label="Deliver to"
                                    options={siteOptions}
                                    value={site?.id || "new"}
                                    onChange={(e: any) => {
                                      const hit = effectiveCustomer.sites.find((x) => x.id === e.target.value);
                                      if (hit) {
                                        const r = suburbRate(hit.suburb_id, suburbs);
                                        patchDraft(d.letter, { street: hit.street, suburbId: hit.suburb_id, fee: r.fee, feeSource: "suburb" });
                                      } else {
                                        patchDraft(d.letter, { street: "", suburbId: null, fee: 0, feeSource: "suburb" });
                                      }
                                    }}
                                  />
                                )}
                                <AddressSearch
                                  street={d.street}
                                  suburbName={suburbNm}
                                  suburbs={suburbs}
                                  onStreet={(v) => patchDraft(d.letter, { street: v })}
                                  onResolved={({ street: st, suburb, suburbName: nm }) => {
                                    if (suburb) {
                                      const r = suburbRate(suburb.id, suburbs);
                                      patchDraft(d.letter, { street: st, suburbId: suburb.id, fee: r.fee, feeSource: "suburb" });
                                    } else {
                                      /* Unknown suburb: keep the typed address, suburb stays a manual pick.
                                         The field shows the warning inline. */
                                      patchDraft(d.letter, { street: st, suburbId: null, fee: 0, feeSource: "suburb" });
                                      void nm;
                                    }
                                  }}
                                />
                                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(120px,1fr))", gap: 6 }}>
                                  <Select
                                    size="sm"
                                    label="Suburb"
                                    options={suburbOptions}
                                    value={d.suburbId || ""}
                                    onChange={(e: any) => {
                                      const r = suburbRate(e.target.value, suburbs);
                                      patchDraft(d.letter, { suburbId: e.target.value || null, fee: r.fee, feeSource: "suburb" });
                                    }}
                                    allowUnset
                                  />
                                  <Input
                                    size="sm"
                                    label="Fee"
                                    value={draftFeeOf(d).toFixed(2)}
                                    onChange={(e: any) => patchDraft(d.letter, { fee: Number(e.target.value) || 0, feeSource: "manual" })}
                                    suffix="AUD"
                                  />
                                </div>
                                <Select
                                  size="sm"
                                  label="Truck"
                                  options={truckOptions}
                                  value={d.truckId || ""}
                                  onChange={(e: any) => patchDraft(d.letter, { truckId: e.target.value || null })}
                                  allowUnset
                                />
                                <div style={{ fontSize: 11, color: d.suburbId && !rate.missing ? "var(--text-faint)" : "var(--feedback-danger)" }}>
                                  {!d.suburbId
                                    ? "No suburb resolved — the delivery fee cannot be calculated."
                                    : rate.inactive
                                      ? `${suburbNm} is switched off in Suburbs, so no rate applies. Turn it back on or pick another suburb.`
                                      : d.feeSource === "suburb"
                                        ? `From the ${suburbNm} rate (${AUD(rate.fee)})` +
                                          (resolvedSuburbFee(d.suburbId, suburbs, paySettings).markup > 0
                                            ? ` + ${AUD(resolvedSuburbFee(d.suburbId, suburbs, paySettings).markup)} markup.`
                                            : ".")
                                        : `Set by hand — no longer tracking the ${suburbNm} rate of ${AUD(rate.fee)}.`}
                                </div>
                              </>
                            )}
                          </div>
                        );
                      })}
                    </div>

                    <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                      <Button
                        variant="outline"
                        size="sm"
                        iconLeft="git-branch"
                        onClick={() => {
                          const next = String.fromCharCode(65 + drafts.length);
                          const first = drafts[0];
                          ui.set({ drafts: [...drafts, { ...first, letter: next, window: "13:00 – 16:00", truckId: null }], activeDraft: next });
                        }}
                      >
                        {isSplitDraft ? "Add a delivery" : "Split this order"}
                      </Button>
                      {isSplitDraft && (
                        <Button
                          variant="ghost"
                          size="sm"
                          iconLeft="repeat"
                          onClick={() => {
                            const a = drafts[0];
                            setDrafts(drafts.map((d) => (d.letter === a.letter ? d : { ...d, street: a.street, suburbId: a.suburbId, fee: a.fee, feeSource: a.feeSource, dateIso: a.dateIso })));
                          }}
                        >
                          Copy A to all
                        </Button>
                      )}
                    </div>
                  </div>
                </Card>
              )}

              {isSplitDraft && (
                <Card title="Per delivery" subtitle="Change a quantity here, or send a line to another delivery by letter" padding="default">
                  <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                    {drafts.map((d, i) => {
                      const dLines = lines.filter((l) => l.to === d.letter);
                      const suburbNm = suburbs.find((s) => s.id === d.suburbId)?.name || "no suburb";
                      return (
                        <React.Fragment key={d.letter}>
                          <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 10px", borderRadius: 8, background: "var(--surface-raised)" }}>
                            <span style={{ width: 18, height: 18, flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center", borderRadius: 5, fontSize: 11, fontWeight: 700, background: chipFor(d.letter), color: "#06070f" }}>
                              {d.letter}
                            </span>
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <div style={{ fontSize: 12, color: "var(--text-primary)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                                {isDelivery ? `${d.street || "—"}, ${suburbNm}` : "Yard collection"}
                              </div>
                              <div style={{ fontSize: 11, color: "var(--text-faint)" }}>
                                {dmy(d.dateIso)} · {d.window} · {perDraft[i].count} {perDraft[i].count === 1 ? "line" : "lines"}
                              </div>
                            </div>
                            <span className="tabular" style={{ fontSize: 13, fontWeight: 600, color: "var(--text-primary)" }}>
                              {AUD(perDraft[i].lineTotal + (isDelivery ? draftFeeOf(d) : 0))}
                            </span>
                          </div>
                          <div style={{ display: "flex", flexDirection: "column", gap: 5, padding: "0 10px 10px 26px" }}>
                            {dLines.map((dl) => {
                              const u = unitOf(dl.unit);
                              return (
                                <div key={dl.index} style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
                                  <Select
                                    size="sm"
                                    options={drafts.map((x) => x.letter)}
                                    value={dl.to}
                                    onChange={(e: any) => setCart(cart.map((x, k) => (k === dl.index ? { ...x, to: e.target.value } : x)))}
                                    style={{ width: 58, flexShrink: 0 }}
                                  />
                                  <span style={{ flex: "1 1 100px", minWidth: 80, fontSize: 12, color: "var(--text-primary)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                                    {dl.name}
                                  </span>
                                  <div style={{ display: "flex", alignItems: "center", gap: 3, flexShrink: 0 }}>
                                    <SmallBtn onClick={() => bumpLine(dl.index, -1)} size={20}>−</SmallBtn>
                                    <span className="tabular" style={{ minWidth: 54, textAlign: "center", fontSize: 11, color: "var(--text-muted)", whiteSpace: "nowrap" }}>
                                      {qtyText(dl.qty, dl.unit)}
                                    </span>
                                    <SmallBtn onClick={() => bumpLine(dl.index, 1)} size={20}>+</SmallBtn>
                                    <SmallBtn onClick={() => setCart(cart.filter((_, k) => k !== dl.index))} size={20}>
                                      <Icon name="trash-2" size={10} />
                                    </SmallBtn>
                                  </div>
                                  <span className="tabular" style={{ width: 66, textAlign: "right", fontSize: 12, fontWeight: 600, color: "var(--text-primary)", whiteSpace: "nowrap" }}>
                                    {AUD(dl.lineTotal)}
                                  </span>
                                </div>
                              );
                            })}
                            {dLines.length === 0 && (
                              <div style={{ fontSize: 11, color: "var(--attention)" }}>Nothing loaded on this delivery yet.</div>
                            )}
                          </div>
                        </React.Fragment>
                      );
                    })}
                    {emptyDrafts.length > 0 && (
                      <Alert
                        tone="warning"
                        title={
                          emptyDrafts.length === 1
                            ? `Delivery ${emptyDrafts[0].letter} has no items`
                            : `${emptyDrafts.length} deliveries have no items`
                        }
                      >
                        Use the letter dropdown beside any line above to move it onto an empty delivery. An order cannot
                        be created with an empty delivery.
                      </Alert>
                    )}
                  </div>
                </Card>
              )}
            </div>

            {/* The summary column flows with the page — an inner scroll area here
                clipped the notes fields behind the sticky footer. */}
            <div style={{ flex: "1 1 280px", minWidth: 280, maxWidth: 380, display: "flex", flexDirection: "column", gap: 10 }}>
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                <PaymentSummary
                  lines={summaryLines}
                  total={AUD(total)}
                  paymentStatus={yard ? "paid" : effectiveCustomer?.billing === "account" ? "invoiced" : "pending"}
                  paymentType={
                    yard && !ui.yardCustomer
                      ? "Prepaid"
                      : effectiveCustomer?.billing === "account"
                        ? `${effectiveCustomer.terms_days}-day account`
                        : "Prepaid"
                  }
                  paymentTypeSource="customer"
                  paymentMethod={ui.settleMethod ? ui.settleMethod.replace(/_/g, " ") : undefined}
                  statementEligible={!yard && effectiveCustomer?.billing === "account"}
                />
                <Card title="Order details" padding="default">
                  <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                    <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                      <Select
                        size="sm"
                        label="Settlement method"
                        options={PAYMENT_METHODS}
                        value={ui.settleMethod || ""}
                        onChange={(e: any) => ui.set({ settleMethod: e.target.value || null })}
                        allowUnset
                        required
                      />
                      <div style={{ fontSize: 11, color: "var(--text-faint)", textWrap: "pretty" as any }}>
                        Records how this transaction settled — the billing relationship above comes from the customer
                        record.
                      </div>
                    </div>
                    <AdjustmentFields />
                    <Input size="sm" label="PO number" value={ui.poNumber} onChange={(e: any) => ui.set({ poNumber: e.target.value })} placeholder="Customer's PO reference" />
                    <Textarea
                      size="sm"
                      label="Order notes"
                      value={ui.orderNotesDraft}
                      onChange={(v: any) => ui.set({ orderNotesDraft: typeof v === "string" ? v : v.target.value })}
                      placeholder="Commercial notes — statements, PO references"
                    />
                    <Textarea
                      size="sm"
                      label="Delivery notes for the driver"
                      value={ui.deliveryNotesDraft}
                      onChange={(v: any) => ui.set({ deliveryNotesDraft: typeof v === "string" ? v : v.target.value })}
                      placeholder="Gate codes, drop points — reaches the driver"
                    />
                  </div>
                </Card>

                {badSuburbs.length > 0 && (
                  <Alert
                    tone="danger"
                    title={
                      badSuburbs.length === 1 ? `Delivery ${badSuburbs[0].letter} has no usable suburb` : `${badSuburbs.length} deliveries have no usable suburb`
                    }
                    icon="circle-alert"
                  >
                    {badSuburbs.map((b) => b.why).join(" ")} A delivery fee cannot be calculated, so the order cannot be
                    created.
                  </Alert>
                )}

                {quickBlock.blocked && (
                  <Alert tone="danger" title="This customer is on stop credit" icon="circle-alert">
                    {quickBlock.reason}
                  </Alert>
                )}
              </div>

              <div style={{ flexShrink: 0, display: "flex", flexDirection: "column", gap: 8, paddingTop: 10, borderTop: "1px solid var(--border-subtle)" }}>
                <Button variant="primary" size="lg" iconLeft="check" fullWidth disabled={createDisabled} onClick={() => void doCreate()}>
                  {quickBlock.blocked
                    ? "Ordering on hold"
                    : yard
                      ? "Take payment"
                      : isSplitDraft
                        ? `Create ${drafts.length} split orders`
                        : "Create order"}
                </Button>
                <div style={{ display: "flex", gap: 8 }}>
                  <div style={{ flex: 1 }}>
                    <Button variant="ghost" size="md" iconLeft="arrow-left" fullWidth onClick={() => ui.set({ orderStep: 1 })}>
                      Back
                    </Button>
                  </div>
                  <div style={{ flex: 1 }}>
                    <Button variant="outline" size="md" iconLeft="printer" fullWidth onClick={printPreview}>
                      Print
                    </Button>
                  </div>
                </div>
                <div style={{ fontSize: 11, color: "var(--text-faint)", textWrap: "pretty" as any }}>
                  {yard
                    ? "Enter takes the payment and prints the docket."
                    : isSplitDraft
                      ? "Creates a master plus one order per delivery. Address, fee and schedule are set here per delivery and stay editable on the master afterwards."
                      : "Ctrl+Enter creates the order and clears the screen for the next one."}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      <DateWindowPicker />
    </div>
  );
}

function stepTitle(u: { divisible: boolean; step: number; min: number; label: string }, willRemove: boolean, name: string) {
  if (willRemove) return `Leave this empty to take ${name} off the order`;
  return u.divisible
    ? `Sold by the ${u.label} — steps of ${u.step}, minimum ${u.min}`
    : `Sold by the ${u.label} — whole numbers only`;
}

function SmallBtn({ children, onClick, title, size = 22 }: { children: React.ReactNode; onClick: () => void; title?: string; size?: number }) {
  return (
    <div
      onClick={onClick}
      title={title}
      style={{
        cursor: "pointer",
        width: size,
        height: size,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        borderRadius: 6,
        border: "1px solid var(--border-default)",
        color: "var(--text-muted)",
        fontSize: 12,
        flexShrink: 0,
      }}
    >
      {children}
    </div>
  );
}

function PickerField({ label, icon, value, onClick }: { label: string; icon: string; value: string; onClick: () => void }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
      <span style={{ fontSize: 11, color: "var(--text-faint)" }}>{label}</span>
      <div
        onClick={onClick}
        style={{
          cursor: "pointer",
          height: 36,
          display: "flex",
          alignItems: "center",
          gap: 8,
          padding: "0 10px",
          borderRadius: 6,
          border: "1px solid var(--border-default)",
          background: "var(--surface-input)",
          fontSize: 13,
          color: "var(--text-primary)",
          overflow: "hidden",
          textOverflow: "ellipsis",
          whiteSpace: "nowrap",
        }}
      >
        <Icon name={icon} size={14} color="var(--text-faint)" />
        {value}
      </div>
    </div>
  );
}

/* Date & window picker modal — calendar plus priority + 30/60 minute windows. */
function DateWindowPicker() {
  const ui = useUi();
  const picker = ui.picker;
  const now = new Date();
  const [view, setView] = useState({ y: now.getFullYear(), m: now.getMonth() });
  if (!picker) return null;

  const close = () => ui.set({ picker: null });
  const pick = (v: string) => {
    picker.onPick(v);
    close();
  };

  const grid = (() => {
    const first = new Date(view.y, view.m, 1);
    const startDow = first.getDay();
    const days = new Date(view.y, view.m + 1, 0).getDate();
    const cells: (number | null)[] = [];
    for (let i = 0; i < startDow; i++) cells.push(null);
    for (let d = 1; d <= days; d++) cells.push(d);
    while (cells.length % 7 !== 0) cells.push(null);
    return cells;
  })();

  const [selD, selM, selY] = String(picker.current || "")
    .split("/")
    .map(Number);

  return (
    <div
      onClick={close}
      style={{ position: "fixed", inset: 0, zIndex: 26, display: "flex", alignItems: "center", justifyContent: "center", padding: 24, background: "rgba(6,7,15,.72)", backdropFilter: "blur(10px) saturate(140%)" }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{ width: "min(340px,100%)", maxHeight: "min(560px,90vh)", display: "flex", flexDirection: "column", borderRadius: 16, background: "var(--surface-card)", border: "1px solid var(--border-default)", boxShadow: "0 24px 64px rgba(0,0,0,.6)", overflow: "hidden" }}
      >
        <div style={{ flexShrink: 0, padding: "14px 16px", borderBottom: "1px solid var(--border-subtle)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <span style={{ fontSize: 14, fontWeight: 600, color: "var(--text-primary)" }}>
            {picker.kind === "date" ? "Pick a date" : "Priority & delivery window"}
          </span>
          <div onClick={close} style={{ cursor: "pointer", width: 26, height: 26, display: "flex", alignItems: "center", justifyContent: "center", borderRadius: 6, color: "var(--text-muted)" }}>
            <Icon name="x" size={14} />
          </div>
        </div>

        {picker.kind === "date" ? (
          <div style={{ flex: 1, overflowY: "auto", padding: "14px 16px", display: "flex", flexDirection: "column", gap: 10 }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <NavBtn dir="arrow-left" onClick={() => setView((v) => (v.m === 0 ? { y: v.y - 1, m: 11 } : { y: v.y, m: v.m - 1 }))} />
              <span style={{ fontSize: 13, fontWeight: 600, color: "var(--text-primary)" }}>
                {new Date(view.y, view.m, 1).toLocaleDateString("en-AU", { month: "long", year: "numeric" })}
              </span>
              <NavBtn dir="arrow-right" onClick={() => setView((v) => (v.m === 11 ? { y: v.y + 1, m: 0 } : { y: v.y, m: v.m + 1 }))} />
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(7,1fr)", gap: 4 }}>
              {["S", "M", "T", "W", "T", "F", "S"].map((dw, i) => (
                <div key={i} style={{ textAlign: "center", fontSize: 11, color: "var(--text-faint)" }}>
                  {dw}
                </div>
              ))}
              {grid.map((d, i) => {
                if (d === null) return <div key={i} />;
                const isSel = d === selD && view.m === (selM || 0) - 1 && view.y === selY;
                const isToday = d === now.getDate() && view.m === now.getMonth() && view.y === now.getFullYear();
                return (
                  <div
                    key={i}
                    onClick={() => pick(`${String(d).padStart(2, "0")}/${String(view.m + 1).padStart(2, "0")}/${view.y}`)}
                    style={{
                      cursor: "pointer",
                      aspectRatio: "1",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      borderRadius: 8,
                      fontSize: 13,
                      background: isSel ? "var(--brand-primary)" : "transparent",
                      color: isSel ? "#ffffff" : "var(--text-primary)",
                      border: isToday && !isSel ? "1px solid var(--border-accent)" : "1px solid transparent",
                    }}
                  >
                    {d}
                  </div>
                );
              })}
            </div>
            <Button variant="ghost" size="sm" onClick={() => setView({ y: now.getFullYear(), m: now.getMonth() })}>
              Today
            </Button>
          </div>
        ) : (
          <div style={{ flex: 1, overflowY: "auto", padding: "6px 0" }}>
            <SectionLabel>Priority</SectionLabel>
            {[
              { value: "Urgent", icon: "zap", color: "var(--feedback-danger)" },
              { value: "ASAP", icon: "clock-fading", color: "var(--attention)" },
              { value: "Any time", icon: "calendar-clock", color: "var(--text-muted)" },
            ].map((p) => (
              <div key={p.value} onClick={() => pick(p.value)} style={{ cursor: "pointer", display: "flex", alignItems: "center", gap: 10, padding: "9px 16px", background: picker.current === p.value ? "var(--surface-active)" : "transparent" }}>
                <Icon name={p.icon} size={16} color={p.color} />
                <span style={{ fontSize: 14, fontWeight: 600, color: "var(--text-primary)" }}>{p.value}</span>
              </div>
            ))}
            <SectionLabel>30-Minute Windows</SectionLabel>
            {WINDOWS_30.map((w) => (
              <WindowRow key={w} label={w} selected={picker.current === w} onClick={() => pick(w)} />
            ))}
            <SectionLabel>1-Hour Windows</SectionLabel>
            {WINDOWS_60.map((w) => (
              <WindowRow key={w} label={w} selected={picker.current === w} onClick={() => pick(w)} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ padding: "12px 16px 4px", fontSize: 11, textTransform: "uppercase", letterSpacing: ".09em", color: "var(--text-faint)" }}>
      {children}
    </div>
  );
}

function NavBtn({ dir, onClick }: { dir: string; onClick: () => void }) {
  return (
    <div onClick={onClick} style={{ cursor: "pointer", width: 28, height: 28, display: "flex", alignItems: "center", justifyContent: "center", borderRadius: 6, border: "1px solid var(--border-subtle)", color: "var(--text-muted)" }}>
      <Icon name={dir} size={14} />
    </div>
  );
}

function WindowRow({ label, selected, onClick }: { label: string; selected: boolean; onClick: () => void }) {
  return (
    <div onClick={onClick} style={{ cursor: "pointer", display: "flex", alignItems: "center", gap: 10, padding: "9px 16px", background: selected ? "var(--surface-active)" : "transparent" }}>
      <Icon name="clock" size={14} color="var(--text-faint)" />
      <span style={{ fontSize: 13, color: "var(--text-primary)" }}>{label}</span>
    </div>
  );
}
