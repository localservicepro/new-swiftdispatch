import React, { useEffect, useMemo, useState } from "react";
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
  suburbRate,
  unitFor,
  unitOf,
  unitPrice,
  WINDOWS_30,
  WINDOWS_60,
} from "../lib/domain";
import { PAYMENT_METHODS } from "../lib/types";
import type { OrderItem } from "../lib/types";
import { addContact, createOrder, recentSites } from "../data/api";
import {
  Alert,
  Badge,
  Button,
  Card,
  Icon,
  Input,
  PaymentSummary,
  Select,
  StatusBadge,
  StepProgress,
  Tabs,
  Textarea,
} from "../design-system/components.js";
import AddressSearch from "./AddressSearch";
import ProductCard from "./ProductCard";
import CategoryPicker from "./CategoryPicker";
import { PickerField } from "./DateWindowPicker";
import CustomerPicker from "./CustomerPicker";
import MoneyField from "./MoneyField";
import { useViewport } from "../lib/viewport";
import NewCustomerModal from "./NewCustomerModal";

/* Product cards drawn before "Show more". */
const PRODUCT_PAGE = 36;

const CHIP_HUES = ["var(--brand-primary)", "var(--brand-secondary)", "var(--status-loading)", "var(--status-enroute)"];

export default function NewOrder() {
  const ui = useUi();
  const app = useApp();
  const { products, categories, specials, customers, suburbs, trucks, paySettings, business, orderItems } = app;

  const { tight } = useViewport();
  const yard = ui.orderMode === "yardsale";
  const drafts = ui.drafts;
  const cart = ui.cart;
  const isSplitDraft = !yard && drafts.length > 1;
  const isDelivery = ui.fulfilMethod === "delivery";

  const [catFilter, setCatFilter] = useState("All");
  const [prodQuery, setProdQuery] = useState("");
  /* Nine hundred cards with photographs is not something to mount while someone
     is trying to take an order. */
  const [shownProducts, setShownProducts] = useState(PRODUCT_PAGE);
  const [contactAddOpen, setContactAddOpen] = useState(false);
  const [newContact, setNewContact] = useState({ name: "", phone: "" });
  const [newCustOpen, setNewCustOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  /* Stop credit no longer blocks the order outright, but it is not waved
     through either: somebody has to say, on this order, that they know. */
  const [creditOverride, setCreditOverride] = useState(false);

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
  /* "Amendment", not "surcharge": the yard already has two surcharges that mean
     something else — the fuel one on deliveries and the card one on payments —
     and calling a one-off addition by the same word had people looking for a
     setting that was not involved. */
  const adjustLabel =
    (ui.adjustType === "Percent" ? `Adjustment — ${adjustNum}% ` : "Adjustment — ") +
    (isSurcharge ? "amendment" : "discount");
  const total = goods + feeTotal + fuelTotal + adjust;

  const setCart = (next: CartLine[]) => ui.set({ cart: next });
  const setDrafts = (next: DeliveryDraft[]) => ui.set({ drafts: next });
  const patchDraft = (letter: string, patch: Partial<DeliveryDraft>) =>
    setDrafts(drafts.map((d) => (d.letter === letter ? { ...d, ...patch } : d)));

  /* How much one tap loads. An amount typed into the search box wins; otherwise
     it is the smallest the thing is sold in — a cubic metre for bulk, one for
     anything bagged. The old fixed "step" setting is gone: it was a mode you
     had to remember to change and then remember to change back, and forgetting
     put a tonne of sand on an order meant for a quarter of one. */
  const addProduct = (pid: string, amount?: number) => {
    const p = product(pid);
    if (!p) return;
    const u = unitFor(p);
    const nominal = amount ?? parsed.qty ?? u.min;
    const n = u.divisible ? Math.max(u.min, Math.round(nominal * 1000) / 1000) : Math.max(1, Math.round(nominal));
    const to = activeDraft;
    const found = cart.find((l) => l.productId === pid && l.to === to);
    setCart(
      found
        ? cart.map((l) =>
            l.productId === pid && l.to === to
              ? { ...l, qty: Math.round((l.qty + n) * 1000) / 1000, typed: null }
              : l
          )
        : [...cart, { productId: pid, qty: n, to, typed: null }]
    );
  };

  /* Setting a line to an exact amount, as against adding to it. This is what
     the field on a card commits. */
  const setProductQty = (pid: string, qty: number) => {
    const p = product(pid);
    if (!p) return;
    const u = unitFor(p);
    const n = u.divisible ? Math.round(qty * 1000) / 1000 : Math.round(qty);
    const to = activeDraft;
    if (!(n > 0)) return setCart(cart.filter((l) => !(l.productId === pid && l.to === to)));
    const found = cart.find((l) => l.productId === pid && l.to === to);
    setCart(
      found
        ? cart.map((l) => (l.productId === pid && l.to === to ? { ...l, qty: n, typed: null } : l))
        : [...cart, { productId: pid, qty: n, to, typed: null }]
    );
  };

  const bumpLine = (index: number, dir: number) => {
    setCart(
      cart
        .map((l, i) => {
          if (i !== index) return l;
          const u = unitFor(product(l.productId));
          /* By one, whatever the unit, and never snapped: a line typed as 0.33
             goes to 1.33, not to 1.25. The yard said twice that the buttons
             have always moved by one and the quarter-metre step was the odd
             thing out. Typing is still how you get to any other amount. */
          void u;
          return { ...l, qty: Math.max(0, Math.round((l.qty + dir) * 1000) / 1000), typed: null };
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
          /* Taken as typed. A third of a metre is a real order and snapping it
             to the nearest quarter was the app arguing with the customer; the
             step is what the buttons move by, not a rule about what can be
             sold. Anything sold whole is still sold whole. */
          return u.divisible
            ? { ...l, qty: Math.max(u.min, Math.round(n * 1000) / 1000), typed: null }
            : { ...l, qty: Math.max(1, Math.round(n)), typed: null };
        })
        .filter((l) => l.qty > 0)
    );
  };

  /* When a phone/name search lands on a business with a known contact, that
     contact auto-selects (§6). */
  const pickCustomer = (cId: string, known?: typeof customers[number]) => {
    /* `known` is for a customer created a moment ago from the modal on this
       screen: the store has it, this render's closure does not yet. */
    const c = known || customers.find((x) => x.id === cId);
    if (!c) return;
    const site = c.sites.find((x) => x.is_default) || c.sites[0];
    const r = site ? suburbRate(site.suburb_id, suburbs) : null;
    const ordersContact = c.contacts.find((x) => x.roles.includes("Orders")) || c.contacts[0];
    ui.set({
      customerId: c.id,
      orderContact: ordersContact?.id || null,
      /* An account customer settles on account — there is no other way they
         ever settle, and leaving the field blank meant someone had to pick the
         only possible answer on every order.

         The answer has to be withdrawn again when the customer changes, which
         is what it failed to do: pick an account customer, change your mind,
         pick a prepaid one, and the order still said On Account. So the app
         only overwrites what the app itself filled in. A method somebody chose
         by hand survives either way. */
      ...(c.billing === "account"
        ? { settleMethod: "on_account", settleMethodAuto: true }
        : ui.settleMethodAuto
          ? { settleMethod: null, settleMethodAuto: false }
          : {}),
      drafts: drafts.map((d, i) =>
        i === 0
          ? { ...d, street: site?.street || "", suburbId: site?.suburb_id || null, fee: r?.fee || 0, feeSource: "suburb" }
          : d
      ),
    });
    setContactAddOpen(false);
    setCreditOverride(false);
  };

  /* Categories ranked by how often the yard actually orders out of them, from
     the line items already in the store. Two categories carry three quarters of
     everything sold here, so an alphabetical list buries the ones in daily use
     behind the ones nobody has touched in a year.

     A fresh install has no order history to rank by, and during the first
     seconds after sign-in only the recent window is loaded — which is the
     better signal anyway. Either way it falls back to how many products a
     category holds, so the row is never arbitrary. */
  const categoryOptions = useMemo(() => {
    const byCategory = new Map<string, { weight: number; products: number }>();
    for (const c of categories) byCategory.set(c.id, { weight: 0, products: 0 });

    const categoryOf = new Map(products.map((p) => [p.id, p.category_id]));
    for (const p of products) {
      const e = p.category_id ? byCategory.get(p.category_id) : undefined;
      if (e) e.products += 1;
    }
    for (const lines of Object.values(orderItems) as OrderItem[][]) {
      for (const i of lines) {
        const cid = i.product_id ? categoryOf.get(i.product_id) : null;
        const e = cid ? byCategory.get(cid) : undefined;
        if (e) e.weight += 1;
      }
    }
    return categories.map((c) => {
      const e = byCategory.get(c.id)!;
      return { name: c.name, weight: e.weight || e.products / 1000, products: e.products };
    });
  }, [categories, products, orderItems]);
  /* "0.5*White Brick Sand" — the shorthand the old yard-sale screen had, and the
     reason the change sheet asks for the Step buttons to go. Type the amount,
     a star (or an x), then enough of the name to find it, and Enter loads that
     much of it. Everything after the separator is the search, so the grid
     narrows as you type either way.

     Without a separator the whole thing is just a search, because plenty of
     products begin with a number — 20mm Crushed Rock among them. */
  const parsed = useMemo(() => {
    const m = prodQuery.match(/^\s*(\d*\.?\d+)\s*[*x×X]\s*(.*)$/);
    if (!m) return { qty: null as number | null, text: prodQuery };
    const n = parseFloat(m[1]);
    return { qty: isNaN(n) || n <= 0 ? null : n, text: m[2] };
  }, [prodQuery]);

  const pq = parsed.text.trim().toLowerCase();
  const visibleProducts = products.filter((p) => {
    if (catFilter !== "All" && catName(p.category_id) !== catFilter) return false;
    return !pq || (p.name + " " + p.sku).toLowerCase().includes(pq);
  });

  useEffect(() => setShownProducts(PRODUCT_PAGE), [prodQuery, catFilter]);

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

  const creditHeld = quickBlock.blocked && !creditOverride;
  const createDisabled = creating || lines.length === 0 || emptyDrafts.length > 0 || creditHeld || badSuburbs.length > 0;

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
      orderNotes: [
        ui.orderNotesDraft,
        quickBlock.blocked && creditOverride
          ? `Placed over stop credit by ${app.user?.name || "an admin"} on ${new Date().toLocaleDateString("en-AU")}.`
          : "",
      ]
        .filter(Boolean)
        .join("\n"),
      deliveryNotes: ui.deliveryNotesDraft,
      adjustmentType: adjustNum > 0 ? (ui.adjustType === "Percent" ? "percent" : "amount") : null,
      adjustmentValue: adjustNum > 0 ? adjustSigned : null,
      fuelSurcharge: yard || !isDelivery ? 0 : fuelOf(paySettings),
    });
    setCreating(false);
    if (order) {
      app.toast({ tone: "success", title: `${order.order_number} created` });
      ui.set({
        printPrompt: { orderId: order.id, orderNumber: order.order_number, splits: isSplitDraft ? drafts.length : 0 },
        nav: yard ? "neworder" : "board",
        cart: [],
        drafts: [blankDraft("A")],
        activeDraft: "A",
        orderStep: 1,
        poNumber: "",
        orderNotesDraft: "",
        deliveryNotesDraft: "",
        settleMethod: null,
        settleMethodAuto: false,
        yardCustomer: false,
        yardWalkInName: "",
        /* The next order is for the next customer. Carrying the last one over
           saved a search and cost the yard orders billed to the wrong account,
           because the name sits up in the corner where nobody rereads it. */
        customerId: null,
        orderContact: null,
      });
      setCreditOverride(false);
      setAdjustValue("");
    }
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
  /* Rendered as a value, not declared as a component. Declared as a component
     inside this function it got a new identity on every render, React threw
     the old subtree away and mounted a fresh one, and the adjustment box lost
     focus after every single character — the "one integer at a time" on the
     change sheet. A value is just elements; React diffs them in place. */
  const typeOptions = ["Amount", "Percent"];
  const adjustmentFields = (
    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      <Tabs
        items={[
          { id: "discount", label: "Discount" },
          { id: "surcharge", label: "Amendment" },
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
          options={typeOptions}
          value={ui.adjustType}
          onChange={(e: any) => {
            const next = e.target.value as "Percent" | "Amount";
            if (next === ui.adjustType) return;
            /* Keep the same discount, express it the other way. Five percent
               off $133 is $6.65; flipping the type should say so, not wipe the
               box and make somebody work it out. */
            if (adjustNum > 0 && goods > 0) {
              const converted =
                next === "Amount" ? (goods * adjustNum) / 100 : (adjustNum / goods) * 100;
              setAdjustValue(String(Math.round(converted * 100) / 100));
            }
            ui.set({ adjustType: next });
          }}
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
            <CustomerPicker
              value={effectiveCustomer?.id || null}
              onPick={pickCustomer}
              onAddNew={() => setNewCustOpen(true)}
            />
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
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: 7,
                  padding: "9px 10px",
                  borderRadius: 8,
                  border: "1px solid var(--feedback-danger)",
                  background: "color-mix(in srgb, var(--feedback-danger) 8%, transparent)",
                }}
              >
                <div style={{ fontSize: 11, color: "var(--feedback-danger)", textWrap: "pretty" as any }}>{quickBlock.reason}</div>
                {/* The yard does let good customers keep ordering through a slow
                    month — that is a decision somebody makes, though, not a
                    thing that should happen quietly, so it is recorded on the
                    order's notes rather than just waved through. */}
                <label style={{ display: "flex", alignItems: "flex-start", gap: 7, cursor: "pointer" }}>
                  <input
                    type="checkbox"
                    checked={creditOverride}
                    onChange={(e) => setCreditOverride(e.target.checked)}
                    style={{ marginTop: 2, flexShrink: 0 }}
                  />
                  <span style={{ fontSize: 11, color: "var(--text-muted)", textWrap: "pretty" as any }}>
                    Take this order anyway. It goes on their account as normal and the override is written into the
                    order notes, so the office can see it was a decision.
                  </span>
                </label>
              </div>
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
          /* Switching between a counter sale and a delivery keeps the goods and
             the customer. A customer who changes their mind at the counter used
             to mean starting the whole order again. */
          onSelect={(id: string) =>
            ui.set({
              orderStep: 1,
              orderMode: id as any,
              cart,
              yardCustomer: id === "yardsale" ? !!ui.customerId : false,
            })
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

                <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  <Input
                    size="md"
                    icon="search"
                    placeholder="Search products, or type 0.5*sand to load half a metre"
                    value={prodQuery}
                    onChange={(e: any) => setProdQuery(e.target.value)}
                    onKeyDown={(e: any) => {
                      /* Enter on a search carrying an amount loads the top match
                         at that amount and clears the box, so a phone order is
                         one line of typing per product. */
                      if (e.key !== "Enter" || parsed.qty === null) return;
                      const hit = visibleProducts[0];
                      if (!hit) return;
                      e.preventDefault();
                      e.stopPropagation();
                      addProduct(hit.id, parsed.qty);
                      setProdQuery("");
                    }}
                  />
                  {parsed.qty !== null && (
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 7,
                        padding: "6px 9px",
                        borderRadius: 7,
                        border: "1px solid var(--border-accent)",
                        background: "var(--om-chip-active-bg)",
                        fontSize: 11.5,
                        color: "var(--text-muted)",
                        textWrap: "pretty" as any,
                      }}
                    >
                      <Icon name="corner-down-left" size={12} color="var(--brand-primary)" />
                      {visibleProducts.length ? (
                        <span>
                          Enter loads{" "}
                          <strong style={{ color: "var(--text-primary)" }}>
                            {qtyText(parsed.qty, visibleProducts[0].unit)} {visibleProducts[0].name}
                          </strong>
                          {visibleProducts.length > 1 ? ` — or tap any of the ${visibleProducts.length} below` : ""}
                        </span>
                      ) : (
                        <span>
                          {parsed.qty} of — nothing matches "{parsed.text.trim()}" yet.
                        </span>
                      )}
                    </div>
                  )}
                </div>

                <CategoryPicker options={categoryOptions} value={catFilter} onChange={setCatFilter} />

                <div className="product-grid-wrap">
                  <div className="product-grid">
                    {visibleProducts.slice(0, shownProducts).map((p) => {
                      const inCart = cart.find((l) => l.productId === p.id && l.to === activeDraft)?.qty || 0;
                      const eff = priceOf(p.id);
                      /* Only a counted product can be out of one. */
                      const out = p.track_stock && p.kind !== "variable" && Number(p.stock) <= 0;
                      return (
                        <ProductCard
                          key={p.id}
                          p={p}
                          effective={eff}
                          compact
                          selected={inCart > 0}
                          onClick={() => addProduct(p.id)}
                          badges={
                            <>
                              {eff < Number(p.price) && <Badge tone="success">Special</Badge>}
                              {out && <Badge tone="warning">None on hand</Badge>}
                            </>
                          }
                          corner={
                            inCart > 0 ? (
                              <span
                                className="tabular"
                                style={{
                                  display: "inline-block",
                                  padding: "3px 9px",
                                  borderRadius: 9999,
                                  background: "var(--brand-primary)",
                                  color: "#fff",
                                  fontSize: 11,
                                  fontWeight: 700,
                                  boxShadow: "0 2px 8px rgba(0,0,0,.45)",
                                }}
                              >
                                {qtyText(inCart, p.unit)} in order
                              </span>
                            ) : null
                          }
                          footer={
                            inCart > 0 ? (
                              /* The stepper is the one place a tap must not add
                                 another unit, so it swallows the card's click. */
                              <div
                                onClick={(e) => e.stopPropagation()}
                                style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 6, paddingTop: 2 }}
                              >
                                <Button
                                  variant="outline"
                                  size="sm"
                                  iconLeft="minus"
                                  onClick={() => {
                                    const idx = cart.findIndex((l) => l.productId === p.id && l.to === activeDraft);
                                    if (idx >= 0) bumpLine(idx, -1);
                                  }}
                                />
                                <CardQty
                                  qty={inCart}
                                  unit={p.unit}
                                  divisible={unitFor(p).divisible}
                                  onCommit={(n) => setProductQty(p.id, n)}
                                />
                                {/* Moves by the unit's own step, the same as the
                                    minus beside it. It used to call addProduct,
                                    which falls back to whatever amount is sitting
                                    in the search box — so after typing 3.5*Wbs
                                    every press added another 3.5 while minus took
                                    off 0.25. Tapping the card still uses the
                                    typed amount; that is what it is for. */}
                                <Button
                                  variant="outline"
                                  size="sm"
                                  iconLeft="plus"
                                  onClick={() => {
                                    const idx = cart.findIndex((l) => l.productId === p.id && l.to === activeDraft);
                                    if (idx >= 0) bumpLine(idx, 1);
                                  }}
                                />
                              </div>
                            ) : (
                              <div style={{ fontSize: 11, color: "var(--text-faint)", paddingTop: 2 }}>
                                {parsed.qty !== null ? `Tap to add ${qtyText(parsed.qty, p.unit)}` : `Tap to add ${qtyText(unitFor(p).min, p.unit)}`}
                              </div>
                            )
                          }
                        />
                      );
                    })}
                  </div>
                </div>
                {visibleProducts.length === 0 && (
                  <div style={{ padding: 20, textAlign: "center", fontSize: 12, color: "var(--text-faint)" }}>
                    No products match that search.
                  </div>
                )}
                {visibleProducts.length > shownProducts && (
                  <div style={{ display: "flex", justifyContent: "center" }}>
                    <Button variant="outline" size="sm" iconLeft="chevron-down" onClick={() => setShownProducts((n) => n + PRODUCT_PAGE)}>
                      Show {Math.min(PRODUCT_PAGE, visibleProducts.length - shownProducts)} more of {visibleProducts.length}
                    </Button>
                  </div>
                )}
              </div>
            </Card>
          </div>

          {/* Side by side when there is room. In a split-screen pane the two
              columns stack, and then the cart goes on top: underneath it would
              be behind nine hundred product cards, which is the same problem
              the sticky cart was built to solve. */}
          <div
            className={tight ? "order-cart order-cart--stacked" : "order-cart"}
            style={{
              display: "flex",
              flexDirection: "column",
              gap: 12,
              flex: tight ? "1 1 100%" : "1 1 320px",
              minWidth: tight ? 0 : 290,
              maxWidth: tight ? "none" : 400,
              order: tight ? -1 : 0,
            }}
          >
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
                {adjustmentFields}
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
                        /* The six addresses this customer has most recently had
                           goods delivered to, newest first, with any the yard
                           named itself in front. Most repeat customers here have
                           more than six on file, and the ones that matter today
                           are the ones a truck went to this month — the rest are
                           still on the customer's own record. */
                        const siteOptions = recentSites(effectiveCustomer)
                          .map((x) => ({
                            value: x.id,
                            label: `${x.label} — ${x.street}, ${suburbs.find((s) => s.id === x.suburb_id)?.name || ""}`,
                          }))
                          .concat([{ value: "new", label: "Somewhere else — type it below" }]);
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
                                  <MoneyField
                                    label="Fee"
                                    value={draftFeeOf(d)}
                                    onCommit={(n) => patchDraft(d.letter, { fee: n, feeSource: "manual" })}
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
                        onChange={(e: any) => ui.set({ settleMethod: e.target.value || null, settleMethodAuto: false })}
                        allowUnset
                        required
                      />
                      <div style={{ fontSize: 11, color: "var(--text-faint)", textWrap: "pretty" as any }}>
                        Records how this transaction settled — the billing relationship above comes from the customer
                        record.
                      </div>
                    </div>
                    {adjustmentFields}
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
                  <Alert
                    tone={creditOverride ? "warning" : "danger"}
                    title={creditOverride ? "Going out over stop credit" : "This customer is on stop credit"}
                    icon="circle-alert"
                  >
                    {creditOverride
                      ? "Ticked on the customer card above. The order will be taken and the override noted on it."
                      : quickBlock.reason + " Tick the box on the customer card to take the order anyway."}
                  </Alert>
                )}
              </div>

              <div style={{ flexShrink: 0, display: "flex", flexDirection: "column", gap: 8, paddingTop: 10, borderTop: "1px solid var(--border-subtle)" }}>
                <Button variant="primary" size="lg" iconLeft="check" fullWidth disabled={createDisabled} onClick={() => void doCreate()}>
                  {creditHeld
                    ? "Ordering on hold"
                    : yard
                      ? "Take payment"
                      : isSplitDraft
                        ? `Create ${drafts.length} split orders`
                        : "Create order"}
                </Button>
                <Button variant="ghost" size="md" iconLeft="arrow-left" fullWidth onClick={() => ui.set({ orderStep: 1 })}>
                  Back
                </Button>
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


      {newCustOpen && (
        <NewCustomerModal
          onClose={() => setNewCustOpen(false)}
          onCreated={(c) => {
            pickCustomer(c.id, c);
            if (yard) ui.set({ yardCustomer: true });
          }}
        />
      )}
    </div>
  );
}

/* The quantity on a product card, typed rather than clicked at. Kept verbatim
   while focused so "0.5" can be typed through "" and "0."; committed on blur or
   Enter; emptied to take the product back off the order. */
function CardQty({
  qty,
  unit,
  divisible,
  onCommit,
}: {
  qty: number;
  unit: string;
  divisible: boolean;
  onCommit: (n: number) => void;
}) {
  const [draft, setDraft] = useState<string | null>(null);
  const value = draft === null ? String(Number(qty.toFixed(3))) : draft;

  const commit = () => {
    if (draft === null) return;
    const n = parseFloat(draft);
    setDraft(null);
    if (draft.trim() === "") return onCommit(0);
    if (isNaN(n) || Math.abs(n - qty) < 0.0005) return;
    onCommit(n);
  };

  return (
    <div
      title={divisible ? `Type any amount in ${unit}` : `Sold by the ${unit} — whole numbers`}
      style={{
        display: "flex",
        alignItems: "center",
        gap: 3,
        flex: 1,
        minWidth: 0,
        justifyContent: "center",
        height: 26,
        padding: "0 4px",
        borderRadius: 6,
        border: "1px solid var(--border-default)",
        background: "var(--surface-input)",
      }}
    >
      <input
        value={value}
        inputMode="decimal"
        aria-label={`Quantity in ${unit}`}
        onChange={(e) => setDraft(e.target.value.replace(/[^0-9.]/g, "").replace(/(\..*)\./g, "$1"))}
        onBlur={commit}
        onKeyDown={(e) => {
          e.stopPropagation();
          if (e.key === "Enter") (e.target as HTMLInputElement).blur();
          if (e.key === "Escape") setDraft(null);
        }}
        style={{
          width: "100%",
          minWidth: 0,
          border: "none",
          outline: "none",
          background: "transparent",
          textAlign: "right",
          fontFamily: "inherit",
          fontSize: 12,
          fontWeight: 600,
          fontVariantNumeric: "tabular-nums",
          color: "var(--brand-secondary)",
        }}
      />
      <span style={{ fontSize: 10, color: "var(--text-faint)", flexShrink: 0 }}>{unit}</span>
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

