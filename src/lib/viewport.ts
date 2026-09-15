import { useEffect, useState } from "react";

/* How much room the app actually has.

   Several people at the yard run two copies of SwiftDispatch side by side on
   one monitor — taking an order in the left half while watching the board in the
   right — so half a 1366px laptop screen, about 680px, is a real working width
   and not an edge case. Everything has to stay usable there, which mostly means
   giving up furniture rather than information: the navigation collapses to
   icons, the top bar drops its labels, and the wide tables shed the columns you
   can get from the order itself while keeping the goods and the notes, which
   are the things you cannot.

   Two steps rather than a scale, because there are only two decisions to make.

     narrow — a window split down the middle of a normal monitor. The sidebar
     collapses and the top bar tightens.

     tight — half a small laptop, or a tablet. Tables shed columns.

   matchMedia rather than a resize listener: it fires on the transition, not on
   every pixel of a drag. */

const NARROW = 1180;
const TIGHT = 860;

const query = (px: number) => `(max-width: ${px}px)`;

function listen(px: number, set: (v: boolean) => void) {
  if (typeof window === "undefined" || !window.matchMedia) return () => {};
  const mq = window.matchMedia(query(px));
  const on = () => set(mq.matches);
  on();
  mq.addEventListener("change", on);
  return () => mq.removeEventListener("change", on);
}

const initial = (px: number) =>
  typeof window !== "undefined" && window.matchMedia ? window.matchMedia(query(px)).matches : false;

export function useViewport() {
  const [narrow, setNarrow] = useState(() => initial(NARROW));
  const [tight, setTight] = useState(() => initial(TIGHT));

  useEffect(() => listen(NARROW, setNarrow), []);
  useEffect(() => listen(TIGHT, setTight), []);

  return { narrow, tight };
}
