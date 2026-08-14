/* Google Maps helpers.

   Deep links (search + turn-by-turn directions) work with no API key and are
   used across admin and the driver portal. Places Autocomplete on address
   fields lights up when VITE_GOOGLE_MAPS_API_KEY is set — without a key the
   fields stay plain inputs with a "search in Maps" link, so nothing breaks. */

export const mapsSearchUrl = (address: string) =>
  "https://www.google.com/maps/search/?api=1&query=" + encodeURIComponent(address);

/* Opens Google Maps in turn-by-turn mode from the driver's current location. */
export const mapsDirectionsUrl = (destination: string) =>
  "https://www.google.com/maps/dir/?api=1&destination=" + encodeURIComponent(destination) + "&travelmode=driving";

const API_KEY = (import.meta.env.VITE_GOOGLE_MAPS_API_KEY as string | undefined) || "";

export const hasPlacesKey = () => API_KEY.length > 0;

let loader: Promise<any> | null = null;

/* Loads the Maps JS API (places library) once. Resolves null when no key is set. */
export function loadPlaces(): Promise<any | null> {
  if (!API_KEY) return Promise.resolve(null);
  if (!loader) {
    loader = new Promise((resolve, reject) => {
      const existing = (window as any).google?.maps?.places;
      if (existing) return resolve((window as any).google);
      const s = document.createElement("script");
      s.src = `https://maps.googleapis.com/maps/api/js?key=${API_KEY}&libraries=places&region=AU`;
      s.async = true;
      s.onload = () => resolve((window as any).google);
      s.onerror = () => reject(new Error("Google Maps failed to load"));
      document.head.appendChild(s);
    });
  }
  return loader;
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
export function parsePlace(place: any): ResolvedPlace | null {
  const comps: any[] = place?.address_components || [];
  const get = (type: string, short = false) => {
    const c = comps.find((x) => x.types.includes(type));
    return c ? (short ? c.short_name : c.long_name) : "";
  };
  const streetNumber = get("street_number");
  const route = get("route");
  const suburbName = get("locality") || get("sublocality");
  if (!route && !suburbName) return null;
  return {
    street: [streetNumber, route].filter(Boolean).join(" "),
    suburbName,
    postcode: get("postal_code"),
    state: get("administrative_area_level_1", true),
    formatted: place.formatted_address || "",
  };
}
