import React, { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useApp } from "../store/store";

/* A dropdown that nothing can clip.

   Every search list in this app was an absolutely positioned div hanging off
   `top: 100%`, which works right up until something above it in the tree has an
   overflow rule — and in this app two things always do. Every design-system
   Card sets `overflow: hidden`, and the cart column on the new-order screen
   adds `overflow-y: auto` so a long order scrolls rather than pushing the
   checkout button off the window. Between them the customer list was cut off a
   few pixels below the search box: you could see the top edge of the first
   result and nothing else, which made it impossible to pick anybody.

   Absolute positioning cannot escape that. Fixed positioning in a portal can:
   the list is rendered into document.body, outside every Card and every
   scrollbox, and placed against the live screen coordinates of the field it
   belongs to. Nothing in the layout above it can reach it.

   That bought problem is that a fixed element does not move with the page, so
   it has to be told. It re-measures on every scroll — capture phase, because
   the thing that scrolls is usually an inner box rather than the window — and
   on resize, so it stays stuck to its field. It also flips above the field when
   there is more room up there, which is what happens in a split-screen window
   with the cart halfway down the screen. */

const GAP = 4;
const EDGE = 8;
/* Above the order drawer (15), the date picker (26), the handbook (35) and the
   confirm dialog (40) — a dropdown is always the most recent thing asked for. */
const Z = 60;

interface Placement {
  left: number;
  width: number;
  top?: number;
  bottom?: number;
  maxHeight: number;
}

export default function AnchoredPopover({
  anchorRef,
  open,
  onClose,
  maxHeight = 320,
  minWidth = 240,
  children,
  role,
}: {
  anchorRef: React.RefObject<HTMLElement | null>;
  open: boolean;
  onClose: () => void;
  maxHeight?: number;
  minWidth?: number;
  children: React.ReactNode;
  role?: string;
}) {
  /* The light palette is scoped to [data-theme="light"] on the shell. A portal
     lands outside that element, so the attribute travels with it — otherwise a
     dropdown comes out dark on a light screen. */
  const theme = useApp((s) => s.theme);
  const popRef = useRef<HTMLDivElement | null>(null);
  const [place, setPlace] = useState<Placement | null>(null);

  const measure = useCallback(() => {
    const el = anchorRef.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const width = Math.max(minWidth, r.width);
    /* Kept on screen when the field is near the right-hand edge, which it is in
       a split-screen pane. */
    const left = Math.max(EDGE, Math.min(r.left, window.innerWidth - width - EDGE));

    const below = window.innerHeight - r.bottom - GAP - EDGE;
    const above = r.top - GAP - EDGE;
    /* Below unless there is genuinely more room above — flipping for the sake
       of a few pixels is more disorienting than a slightly short list. */
    if (below >= Math.min(maxHeight, 180) || below >= above) {
      setPlace({ left, width, top: r.bottom + GAP, maxHeight: Math.max(120, Math.min(maxHeight, below)) });
    } else {
      setPlace({
        left,
        width,
        bottom: window.innerHeight - r.top + GAP,
        maxHeight: Math.max(120, Math.min(maxHeight, above)),
      });
    }
  }, [anchorRef, maxHeight, minWidth]);

  useLayoutEffect(() => {
    if (!open) return setPlace(null);
    measure();
  }, [open, measure]);

  useEffect(() => {
    if (!open) return;
    const onMove = () => measure();
    /* Capture, so an inner scrollbox counts and not just the window. */
    window.addEventListener("scroll", onMove, true);
    window.addEventListener("resize", onMove);
    return () => {
      window.removeEventListener("scroll", onMove, true);
      window.removeEventListener("resize", onMove);
    };
  }, [open, measure]);

  /* Clicking away closes it. The popover is no longer inside the field's own
     element, so both have to be checked or picking a row would count as
     clicking away and shut the list before the click landed. */
  useEffect(() => {
    if (!open) return;
    const away = (e: MouseEvent) => {
      const t = e.target as Node;
      if (anchorRef.current?.contains(t)) return;
      if (popRef.current?.contains(t)) return;
      onClose();
    };
    const key = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("mousedown", away);
    document.addEventListener("keydown", key);
    return () => {
      document.removeEventListener("mousedown", away);
      document.removeEventListener("keydown", key);
    };
  }, [open, onClose, anchorRef]);

  if (!open || !place || typeof document === "undefined") return null;

  return createPortal(
    <div
      ref={popRef}
      role={role}
      data-theme={theme}
      style={{
        position: "fixed",
        zIndex: Z,
        left: place.left,
        width: place.width,
        ...(place.top !== undefined ? { top: place.top } : { bottom: place.bottom }),
        maxHeight: place.maxHeight,
        overflowY: "auto",
        borderRadius: 8,
        border: "1px solid var(--border-default)",
        background: "var(--surface-card)",
        boxShadow: "0 12px 32px rgba(0,0,0,.4)",
        color: "var(--text-body)",
      }}
    >
      {children}
    </div>,
    document.body
  );
}
