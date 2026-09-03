/* Google Maps helpers.

   Deep links (search + turn-by-turn directions) work with no API key and are
   used across admin and the driver portal.

   Address autocomplete uses the Places API (New) REST endpoints directly —
   the legacy JS Autocomplete widget is not served to new API keys and its
   injected dropdown fights the design system. Fetching suggestions ourselves
   keeps the dropdown fully on-theme and works with any current key
   (requires "Places API (New)" enabled on the key's project). */

export const mapsSearchUrl = (address: string) =>
  "https://www.google.com/maps/search/?api=1&query=" + encodeURIComponent(address);

/* Opens Google Maps in turn-by-turn mode from the driver's current location. */
export const mapsDirectionsUrl = (destination: string) =>
  "https://www.google.com/maps/dir/?api=1&destination=" + encodeURIComponent(destination) + "&travelmode=driving";

const API_KEY = (import.meta.env.VITE_GOOGLE_MAPS_API_KEY as string | undefined) || "";

export const hasPlacesKey = () => API_KEY.length > 0;

export interface PlaceSuggestion {
  placeId: string;
  main: string;
  secondary: string;
}

/* Victorian bounding box — the brief restricts address search to VIC. */
const VIC_RECT = {
  low: { latitude: -39.2, longitude: 140.96 },
  high: { latitude: -33.98, longitude: 150.0 },
};

export async function fetchSuggestions(input: string, signal?: AbortSignal): Promise<PlaceSuggestion[]> {
  if (!API_KEY || input.trim().length < 3) return [];
  const res = await fetch("https://places.googleapis.com/v1/places:autocomplete", {
    method: "POST",
    signal,
    headers: {
      "Content-Type": "application/json",
      "X-Goog-Api-Key": API_KEY,
    },
    body: JSON.stringify({
      input,
      regionCode: "AU",
      locationRestriction: { rectangle: VIC_RECT },
    }),
  });
  if (!res.ok) throw new Error("places autocomplete " + res.status);
  const json = await res.json();
  return ((json.suggestions as any[]) || [])
    .map((s) => s.placePrediction)
    .filter(Boolean)
    .map((p: any) => ({
      placeId: p.placeId,
      main: p.structuredFormat?.mainText?.text || p.text?.text || "",
      secondary: p.structuredFormat?.secondaryText?.text || "",
    }));
}

export interface ResolvedPlace {
  street: string;
  suburbName: string;
  postcode: string;
  state: string;
  formatted: string;
}

/* The address component's output is structured — street and suburb separately —
   so delivery-fee logic reads the suburb entity, never a formatted string (§5.8). */
export async function fetchPlace(placeId: string): Promise<ResolvedPlace | null> {
  if (!API_KEY) return null;
  const res = await fetch(
    `https://places.googleapis.com/v1/places/${encodeURIComponent(placeId)}?fields=addressComponents,formattedAddress`,
    { headers: { "X-Goog-Api-Key": API_KEY } }
  );
  if (!res.ok) throw new Error("place details " + res.status);
  const json = await res.json();
  const comps: any[] = json.addressComponents || [];
  const get = (type: string, short = false) => {
    const c = comps.find((x) => (x.types || []).includes(type));
    return c ? (short ? c.shortText : c.longText) || "" : "";
  };
  const streetNumber = get("street_number");
  const subpremise = get("subpremise");
  const route = get("route");
  const suburbName = get("locality") || get("sublocality");
  if (!route && !suburbName) return null;
  const streetBase = [streetNumber, route].filter(Boolean).join(" ");
  return {
    street: subpremise ? `${subpremise}/${streetBase}` : streetBase,
    suburbName,
    postcode: get("postal_code"),
    state: get("administrative_area_level_1", true),
    formatted: json.formattedAddress || "",
  };
}
