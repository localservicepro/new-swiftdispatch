import React from "react";
import { Icon } from "../design-system/components.js";

/* Icons the design-system bundle does not carry.

   Its Icon falls back to a plain circle for a name it does not know — silently,
   so a button asking for "upload" renders a meaningless dot and nobody notices.
   Five of ours were doing exactly that.

   Rather than hand-edit the bundle (it is generated from the design source and
   carries content hashes, so an edit would be undone by the next sync), the
   missing glyphs live here and everything else falls through to the real Icon.
   Same Lucide set, same 24px grid, so they sit with the rest. */

const PATHS: Record<string, string[]> = {
  "book-open": [
    "M12 7v14",
    "M3 18a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1h5a4 4 0 0 1 4 4 4 4 0 0 1 4-4h5a1 1 0 0 1 1 1v13a1 1 0 0 1-1 1h-6a3 3 0 0 0-3 3 3 3 0 0 0-3-3z",
  ],
  upload: ["M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4", "M17 8l-5-5-5 5", "M12 3v12"],
  "chevron-left": ["m15 18-6-6 6-6"],
  "chevron-up": ["m18 15-6-6-6 6"],
  "grid-2x2": ["M12 3v18", "M3 12h18", "M4 3h16a1 1 0 0 1 1 1v16a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1z"],
  list: ["M3 5h.01", "M3 12h.01", "M3 19h.01", "M8 5h13", "M8 12h13", "M8 19h13"],
};

export default function AppIcon({
  name,
  size = 16,
  color = "currentColor",
  title,
  style,
}: {
  name: string;
  size?: number;
  color?: string;
  title?: string;
  style?: React.CSSProperties;
}) {
  const paths = PATHS[name];
  if (!paths) return <Icon name={name} size={size} color={color} title={title} style={style} />;

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke={color}
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      role={title ? "img" : undefined}
      aria-label={title}
      aria-hidden={title ? undefined : true}
      style={{ display: "inline-block", flexShrink: 0, ...style }}
    >
      {paths.map((d) => (
        <path key={d} d={d} />
      ))}
    </svg>
  );
}
