import React, { useMemo, useRef, useState } from "react";
import { Icon } from "../design-system/components.js";
import AnchoredPopover from "./AnchoredPopover";
import { useApp } from "../store/store";
import { mapsSearchUrl } from "../lib/googleMaps";
import { pickableSuburbs, splitSuburbFromText } from "../lib/domain";
import type { Suburb } from "../lib/types";

/* Street field with SwiftDispatch's own lookup — no Google.

   The field used to call the Places API as you typed. The yard asked for that
   to go: "the autofill popup clutters the screen and, primarily under the
   street search box, creates more difficulty selecting the address from the
   dropdown". Two of them asked, twice. What they wanted kept is the internal
   dropdown, and for it to offer nothing outside Victoria.

   So the list under the field is built from what SwiftDispatch already knows:

   - suburbs: type the street, then start the suburb — "12 Reserve Rd Box" —
     and the matching suburbs appear. Picking one strips it from the street,
     sets the suburb and prices the delivery from its rate;
   - addresses already on file: an address the yard has delivered to before,
     for any customer, matches on the street and fills both in one click.

   Typing a whole suburb name at the end of the address and moving on does the
   same thing without a click, which is what the new-customer form was missing.
   Fees only ever come from the suburb (§5.8); the street is just words. */
export default function AddressSearch({
  label = "Street",
  street,
  suburbName,
  suburbs,
  onStreet,
  onResolved,
}: {
  label?: string;
  street: string;
  suburbName?: string;
  suburbs: Suburb[];
  onStreet: (street: string) => void;
  onResolved: (r: { street: string; suburb: Suburb | null; suburbName: string }) => void;
}) {
  const { customers } = useApp();
  const [focus, setFocus] = useState(false);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const [note, setNote] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const pickable = useMemo(() => pickableSuburbs(suburbs), [suburbs]);

  type Item =
    | { kind: "suburb"; key: string; main: string; secondary: string; suburb: Suburb; street: string }
    | { kind: "site"; key: string; main: string; secondary: string; suburb: Suburb; street: string };

  const items = useMemo<Item[]>(() => {
    const text = street.trim().replace(/\s+/g, " ");
    if (text.length < 2) return [];
    const out: Item[] = [];

    /* The trailing fragment is what might be a suburb: everything after the
       last comma, or the last one or two words. */
    const frags = new Set<string>();
    const afterComma = text.includes(",") ? text.slice(text.lastIndexOf(",") + 1).trim() : "";
    if (afterComma) frags.add(afterComma);
    const words = text.split(" ");
    if (words.length >= 1) frags.add(words.slice(-1).join(" "));
    if (words.length >= 2) frags.add(words.slice(-2).join(" "));
    for (const frag of frags) {
      const f = frag.toLowerCase();
      if (f.length < 2) continue;
      for (const s of pickable) {
        if (!s.name.toLowerCase().startsWith(f)) continue;
        if (out.some((i) => i.kind === "suburb" && i.suburb.id === s.id)) continue;
        const rest = text.slice(0, text.toLowerCase().lastIndexOf(f)).replace(/[\s,]+$/, "");
        out.push({ kind: "suburb", key: "s:" + s.id, main: s.name, secondary: `${s.state} ${s.postcode} · set as the suburb`, suburb: s, street: rest });
        if (out.length >= 6) break;
      }
    }

    /* Addresses already on file, by street. */
    const q = text.toLowerCase();
    const seen = new Set<string>();
    for (const c of customers) {
      if (c.archived_at) continue;
      for (const site of c.sites) {
        const sub = pickable.find((x) => x.id === site.suburb_id);
        if (!sub) continue;
        const k = (site.street + "|" + sub.id).toLowerCase();
        if (seen.has(k) || !site.street.toLowerCase().includes(q)) continue;
        seen.add(k);
        out.push({ kind: "site", key: "a:" + site.id, main: site.street, secondary: `${sub.name} ${sub.postcode} · ${c.name}`, suburb: sub, street: site.street });
        if (seen.size >= 5) break;
      }
      if (seen.size >= 5) break;
    }
    return out;
  }, [street, pickable, customers]);

  const choose = (it: Item) => {
    setOpen(false);
    setActive(-1);
    onResolved({ street: it.street, suburb: it.suburb, suburbName: it.suburb.name });
    setNote(`${it.suburb.name} set — delivery priced from its rate.`);
  };

  /* Moving on with "…, Box Hill" at the end of the line is as good as a click. */
  const settle = () => {
    const hit = splitSuburbFromText(street, suburbs);
    if (hit && hit.street !== street.trim()) {
      onResolved({ street: hit.street, suburb: hit.suburb, suburbName: hit.suburb.name });
      setNote(`${hit.suburb.name} set — delivery priced from its rate.`);
    }
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (!open || !items.length) {
      if (e.key === "Enter") settle();
      return;
    }
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActive((a) => (a + 1) % items.length);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((a) => (a <= 0 ? items.length - 1 : a - 1));
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (active >= 0) choose(items[active]);
      else settle();
    } else if (e.key === "Escape") {
      setOpen(false);
    }
  };

  const mapsQuery = [street, suburbName, "VIC"].filter(Boolean).join(", ");

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 5, position: "relative" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
        <label style={{ fontSize: 12, fontWeight: 500, color: "var(--text-muted)" }}>{label}</label>
        <a
          href={mapsSearchUrl(mapsQuery || "Victoria, Australia")}
          target="_blank"
          rel="noreferrer"
          title="Check truck access before dispatching"
          style={{ display: "inline-flex", alignItems: "center", gap: 4, fontSize: 11, fontWeight: 600 }}
        >
          <Icon name="map-pin" size={11} />
          Open in Maps
        </a>
      </div>
      <input
        ref={inputRef}
        value={street}
        onChange={(e) => {
          onStreet(e.target.value);
          setNote(null);
          setOpen(true);
          setActive(-1);
        }}
        onFocus={() => {
          setFocus(true);
          setOpen(true);
        }}
        onBlur={() => {
          setFocus(false);
          settle();
        }}
        onKeyDown={onKeyDown}
        placeholder="e.g. 88 Barwon Heads Rd, Box Hill"
        /* The browser's own saved-address popup is the other thing the yard
           meant by "autofill"; this keeps it away from the field. */
        autoComplete="new-password"
        name="street-line"
        style={{
          height: 32,
          padding: "0 10px",
          borderRadius: 6,
          border: `1px solid ${focus ? "var(--border-accent)" : "var(--border-default)"}`,
          outline: "none",
          background: "var(--surface-input)",
          fontFamily: "inherit",
          fontSize: 13,
          color: "var(--text-primary)",
          boxShadow: focus ? "0 0 0 2px rgba(59,130,246,.25)" : "none",
          transition: "var(--transition-control, all 140ms)",
        }}
      />

      <AnchoredPopover anchorRef={inputRef} open={open && focus && items.length > 0} onClose={() => setOpen(false)} maxHeight={300} role="listbox">
        <div style={{ padding: "4px 0" }}>
          {items.map((it, i) => (
            <div
              key={it.key}
              onMouseDown={(e) => {
                e.preventDefault(); // keep the input focused
                choose(it);
              }}
              onMouseEnter={() => setActive(i)}
              style={{ padding: "8px 12px", cursor: "pointer", display: "flex", alignItems: "center", gap: 8, background: i === active ? "var(--surface-active)" : "transparent" }}
            >
              <Icon name={it.kind === "suburb" ? "map" : "map-pin"} size={12} color="var(--text-faint)" />
              <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: 13, color: "var(--text-primary)" }}>{it.main}</div>
                <div style={{ fontSize: 11, color: "var(--text-faint)" }}>{it.secondary}</div>
              </div>
            </div>
          ))}
        </div>
      </AnchoredPopover>

      <div style={{ fontSize: 11, color: note ? "var(--feedback-success)" : "var(--text-faint)", textWrap: "pretty" as any }}>
        {note || "Type the street, then the suburb — pick it from the list, or just finish the line with the suburb name. Victoria only."}
      </div>
    </div>
  );
}
