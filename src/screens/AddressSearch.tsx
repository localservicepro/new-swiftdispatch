import React, { useEffect, useRef, useState } from "react";
import { Icon } from "../design-system/components.js";
import { hasPlacesKey, loadPlaces, mapsSearchUrl, parsePlace, type ResolvedPlace } from "../lib/googleMaps";
import type { Suburb } from "../lib/types";

/* Street field with Google Places autocomplete (when a key is configured) and an
   always-available "open in Maps" link.

   The §5.8 rule holds: a picked suggestion resolves to a structured
   { street, suburb } and the suburb is matched against the Suburbs table — the
   fee always comes from the suburb entity. A locality we don't deliver to is
   reported back so the caller can warn instead of guessing a fee. */
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
  const inputRef = useRef<HTMLInputElement>(null);
  const [focus, setFocus] = useState(false);
  const resolvedRef = useRef(onResolved);
  resolvedRef.current = onResolved;
  const suburbsRef = useRef(suburbs);
  suburbsRef.current = suburbs;

  useEffect(() => {
    if (!hasPlacesKey() || !inputRef.current) return;
    let ac: any;
    let listener: any;
    void loadPlaces()
      .then((google) => {
        if (!google || !inputRef.current) return;
        /* Victorian suburbs only (SHGS's actual delivery area, per the brief) —
           strict bounds over VIC, not just a bias. */
        const vic = new google.maps.LatLngBounds(
          new google.maps.LatLng(-39.2, 140.96),
          new google.maps.LatLng(-33.98, 150.0)
        );
        ac = new google.maps.places.Autocomplete(inputRef.current, {
          componentRestrictions: { country: "au" },
          bounds: vic,
          strictBounds: true,
          fields: ["address_components", "formatted_address"],
          types: ["address"],
        });
        listener = ac.addListener("place_changed", () => {
          const parsed: ResolvedPlace | null = parsePlace(ac.getPlace());
          if (!parsed) return;
          const match =
            suburbsRef.current.find(
              (s) =>
                s.active &&
                s.name.toLowerCase() === parsed.suburbName.toLowerCase() &&
                (!parsed.postcode || s.postcode === parsed.postcode)
            ) ||
            suburbsRef.current.find((s) => s.active && s.name.toLowerCase() === parsed.suburbName.toLowerCase()) ||
            null;
          resolvedRef.current({ street: parsed.street, suburb: match, suburbName: parsed.suburbName });
        });
      })
      .catch(() => {});
    return () => {
      if (listener) listener.remove();
    };
  }, []);

  const mapsQuery = [street, suburbName, "VIC"].filter(Boolean).join(", ");

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
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
        onChange={(e) => onStreet(e.target.value)}
        onFocus={() => setFocus(true)}
        onBlur={() => setFocus(false)}
        placeholder={hasPlacesKey() ? "Start typing an address…" : "e.g. 88 Barwon Heads Rd"}
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
      {hasPlacesKey() && (
        <div style={{ fontSize: 11, color: "var(--text-faint)" }}>
          Google address search — picking a suggestion fills the street and resolves the suburb.
        </div>
      )}
    </div>
  );
}
