import React, { useEffect, useRef, useState } from "react";
import { Icon } from "../design-system/components.js";
import { fetchPlace, fetchSuggestions, hasPlacesKey, mapsSearchUrl, type PlaceSuggestion } from "../lib/googleMaps";
import type { Suburb } from "../lib/types";

/* Street field with Google address search. The dropdown is our own — rendered on
   the design tokens, fed by the Places API (New) — so it works with current API
   keys and never fights the theme.

   Behaviour, per the yard's ask:
   - pick a suggestion → the street fills in, and when Google's locality matches
     a suburb in the Suburbs table the suburb and its fee are set automatically;
   - no match (or no key, or Google down) → the typed address stands as-is and
     the suburb stays a manual pick. Fees only ever come from the suburb (§5.8). */
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
  const [focus, setFocus] = useState(false);
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<PlaceSuggestion[]>([]);
  const [active, setActive] = useState(-1);
  const [note, setNote] = useState<{ tone: "ok" | "warn"; text: string } | null>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<number>();
  const abortRef = useRef<AbortController | null>(null);
  const pickedRef = useRef(false);

  /* Debounced suggestion fetch while typing. */
  const queryChanged = (value: string) => {
    onStreet(value);
    setNote(null);
    if (!hasPlacesKey()) return;
    window.clearTimeout(debounceRef.current);
    if (value.trim().length < 3) {
      setItems([]);
      setOpen(false);
      return;
    }
    debounceRef.current = window.setTimeout(() => {
      abortRef.current?.abort();
      const ctl = new AbortController();
      abortRef.current = ctl;
      fetchSuggestions(value, ctl.signal)
        .then((s) => {
          if (ctl.signal.aborted || pickedRef.current) return;
          setItems(s);
          setOpen(s.length > 0);
          setActive(-1);
        })
        .catch(() => {
          /* Google unreachable or key not enabled — typing stays manual. */
          setItems([]);
          setOpen(false);
        });
    }, 250);
  };

  const pick = async (s: PlaceSuggestion) => {
    pickedRef.current = true;
    setOpen(false);
    setItems([]);
    try {
      const place = await fetchPlace(s.placeId);
      if (!place) return;
      const match =
        suburbs.find(
          (x) =>
            x.active &&
            x.name.toLowerCase() === place.suburbName.toLowerCase() &&
            (!place.postcode || x.postcode === place.postcode)
        ) ||
        suburbs.find((x) => x.active && x.name.toLowerCase() === place.suburbName.toLowerCase()) ||
        null;
      onResolved({ street: place.street, suburb: match, suburbName: place.suburbName });
      setNote(
        match
          ? { tone: "ok", text: `${match.name} matched — suburb and delivery fee set from its rate.` }
          : {
              tone: "warn",
              text: `${place.suburbName || "That suburb"} isn't in your Suburbs list — keep the address and pick the suburb by hand below, or add it under Operate › Suburbs.`,
            }
      );
    } catch {
      /* details call failed — keep whatever is typed, suburb stays manual */
    } finally {
      pickedRef.current = false;
    }
  };

  /* Close when clicking anywhere else. */
  useEffect(() => {
    const onDown = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, []);

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (!open || !items.length) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActive((a) => (a + 1) % items.length);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((a) => (a <= 0 ? items.length - 1 : a - 1));
    } else if (e.key === "Enter" && active >= 0) {
      e.preventDefault();
      void pick(items[active]);
    } else if (e.key === "Escape") {
      setOpen(false);
    }
  };

  const mapsQuery = [street, suburbName, "VIC"].filter(Boolean).join(", ");

  return (
    <div ref={wrapRef} style={{ display: "flex", flexDirection: "column", gap: 5, position: "relative" }}>
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
        value={street}
        onChange={(e) => queryChanged(e.target.value)}
        onFocus={() => {
          setFocus(true);
          if (items.length) setOpen(true);
        }}
        onBlur={() => setFocus(false)}
        onKeyDown={onKeyDown}
        placeholder={hasPlacesKey() ? "Start typing an address…" : "e.g. 88 Barwon Heads Rd"}
        autoComplete="off"
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

      {open && items.length > 0 && (
        <div
          style={{
            position: "absolute",
            top: "100%",
            left: 0,
            right: 0,
            zIndex: 30,
            marginTop: 4,
            padding: "4px 0",
            borderRadius: 8,
            background: "var(--surface-card)",
            border: "1px solid var(--border-default)",
            boxShadow: "var(--om-overlay-shadow)",
            maxHeight: 280,
            overflowY: "auto",
          }}
        >
          {items.map((s, i) => (
            <div
              key={s.placeId}
              onMouseDown={(e) => {
                e.preventDefault(); // keep the input focused
                void pick(s);
              }}
              onMouseEnter={() => setActive(i)}
              style={{
                padding: "8px 12px",
                cursor: "pointer",
                background: i === active ? "var(--surface-active)" : "transparent",
              }}
            >
              <div style={{ fontSize: 13, color: "var(--text-primary)" }}>{s.main}</div>
              {s.secondary && <div style={{ fontSize: 11, color: "var(--text-faint)" }}>{s.secondary}</div>}
            </div>
          ))}
          <div
            style={{
              padding: "5px 12px 2px",
              borderTop: "1px solid var(--border-subtle)",
              marginTop: 4,
              fontSize: 10,
              color: "var(--text-faint)",
              textAlign: "right",
            }}
          >
            powered by Google
          </div>
        </div>
      )}

      {note && (
        <div style={{ fontSize: 11, color: note.tone === "ok" ? "var(--feedback-success)" : "var(--feedback-warning)", textWrap: "pretty" as any }}>
          {note.text}
        </div>
      )}
      {!note && hasPlacesKey() && (
        <div style={{ fontSize: 11, color: "var(--text-faint)" }}>
          Google address search — pick a suggestion, or just type the address and choose the suburb yourself.
        </div>
      )}
    </div>
  );
}
