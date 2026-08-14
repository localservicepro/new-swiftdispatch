/** Tailwind is available for layout utilities in screens; the design system's
 *  own components style themselves from the token CSS, so preflight is off to
 *  keep the token base styles authoritative. */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx,js,jsx}"],
  corePlugins: { preflight: false },
  theme: { extend: {} },
  plugins: [],
};
