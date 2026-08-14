/* SwiftDispatch Pro design system components.
   Ported verbatim from the Claude Design system bundle
   (_ds/swiftdispatch-pro-design-system .../_ds_bundle.js) so the app renders
   exactly what the design specifies. Do not restyle by hand — edit tokens instead. */
/* eslint-disable */
import React from "react";
/* @ds-bundle: {"format":4,"namespace":"SwiftDispatchProDesignSystem_26a2a3","components":[{"name":"Button","sourcePath":"components/core/Button.jsx"},{"name":"Checkbox","sourcePath":"components/core/Checkbox.jsx"},{"name":"ICON_NAMES","sourcePath":"components/core/Icon.jsx"},{"name":"Icon","sourcePath":"components/core/Icon.jsx"},{"name":"Input","sourcePath":"components/core/Input.jsx"},{"name":"Select","sourcePath":"components/core/Select.jsx"},{"name":"Switch","sourcePath":"components/core/Switch.jsx"},{"name":"Textarea","sourcePath":"components/core/Textarea.jsx"},{"name":"Badge","sourcePath":"components/data/Badge.jsx"},{"name":"Card","sourcePath":"components/data/Card.jsx"},{"name":"DataTable","sourcePath":"components/data/DataTable.jsx"},{"name":"EmptyState","sourcePath":"components/data/EmptyState.jsx"},{"name":"StatCard","sourcePath":"components/data/StatCard.jsx"},{"name":"StatusBadge","sourcePath":"components/data/StatusBadge.jsx"},{"name":"AddressBlock","sourcePath":"components/domain/AddressBlock.jsx"},{"name":"DeliveryTaskCard","sourcePath":"components/domain/DeliveryTaskCard.jsx"},{"name":"DispatchColumn","sourcePath":"components/domain/DispatchColumn.jsx"},{"name":"NotesPanel","sourcePath":"components/domain/NotesPanel.jsx"},{"name":"OrderCard","sourcePath":"components/domain/OrderCard.jsx"},{"name":"PaymentSummary","sourcePath":"components/domain/PaymentSummary.jsx"},{"name":"PinCodeInput","sourcePath":"components/domain/PinCodeInput.jsx"},{"name":"ProductTile","sourcePath":"components/domain/ProductTile.jsx"},{"name":"SplitOrderGroup","sourcePath":"components/domain/SplitOrderGroup.jsx"},{"name":"Alert","sourcePath":"components/feedback/Alert.jsx"},{"name":"ConflictWarning","sourcePath":"components/feedback/ConflictWarning.jsx"},{"name":"Modal","sourcePath":"components/feedback/Modal.jsx"},{"name":"Toast","sourcePath":"components/feedback/Toast.jsx"},{"name":"MobileTabBar","sourcePath":"components/navigation/MobileTabBar.jsx"},{"name":"SidebarNav","sourcePath":"components/navigation/SidebarNav.jsx"},{"name":"StepProgress","sourcePath":"components/navigation/StepProgress.jsx"},{"name":"Tabs","sourcePath":"components/navigation/Tabs.jsx"},{"name":"TopBar","sourcePath":"components/navigation/TopBar.jsx"}],"sourceHashes":{"components/core/Button.jsx":"777b1a23a4a1","components/core/Checkbox.jsx":"efed3670d5ef","components/core/Icon.jsx":"7cb327d10934","components/core/Input.jsx":"280df9727fd5","components/core/Select.jsx":"afc69106d8dd","components/core/Switch.jsx":"ddd3086e7e99","components/core/Textarea.jsx":"88c81b48fec6","components/data/Badge.jsx":"3b8b8a8d692c","components/data/Card.jsx":"03e1acdd4277","components/data/DataTable.jsx":"33a29389eda8","components/data/EmptyState.jsx":"999065fa5612","components/data/StatCard.jsx":"5899942053b5","components/data/StatusBadge.jsx":"ba3dbe84e102","components/domain/AddressBlock.jsx":"ae0c2af416e8","components/domain/DeliveryTaskCard.jsx":"5d032c5c7aa4","components/domain/DispatchColumn.jsx":"9703325e6874","components/domain/NotesPanel.jsx":"4264eb2ef5ff","components/domain/OrderCard.jsx":"281745691025","components/domain/PaymentSummary.jsx":"206a06e42992","components/domain/PinCodeInput.jsx":"aaf99e184cc6","components/domain/ProductTile.jsx":"6cd989a9a808","components/domain/SplitOrderGroup.jsx":"036f84676301","components/feedback/Alert.jsx":"927162256e5d","components/feedback/ConflictWarning.jsx":"0ff947738c14","components/feedback/Modal.jsx":"73cff071f5ad","components/feedback/Toast.jsx":"47d5ca921109","components/navigation/MobileTabBar.jsx":"6ff9ac455505","components/navigation/SidebarNav.jsx":"5a0196c6d985","components/navigation/StepProgress.jsx":"c4c11db0eeb5","components/navigation/Tabs.jsx":"7a13a12f807d","components/navigation/TopBar.jsx":"167a7f30b931","ui_kits/admin/kit-app.jsx":"c223ca8079f9","ui_kits/admin/kit-assign-dialog.jsx":"373c573a8f2f","ui_kits/admin/kit-data.jsx":"9002b473a289","ui_kits/admin/kit-dispatch-board.jsx":"15f7176d7cdd","ui_kits/admin/kit-order-detail.jsx":"39f21ceb7145","ui_kits/admin/kit-order-list.jsx":"d569d6ff4a87","ui_kits/admin/kit-order-wizard.jsx":"af38c48ce7d8","ui_kits/customer_portal/kit-app.jsx":"d8f3a7a50f9d","ui_kits/driver/kit-app.jsx":"49e9c2283417","ui_kits/storefront/kit-app.jsx":"d168395a62e7"},"inlinedExternals":[],"unexposedExports":[]} */


const __ds_ns = {};

const __ds_scope = {};

(__ds_ns.__errors = __ds_ns.__errors || []);

// components/core/Icon.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
/* Lucide glyphs, vendored from lucide-icons/lucide and inlined as data URIs.
   Inline rather than CDN: a cross-origin mask URL is dropped by the
   screenshot / PDF / PPTX capture pipeline, which then paints every icon as a
   solid coloured rectangle. The same files also live in assets/icons/. */
const GLYPHS = {
  "arrow-down-narrow-wide": "data:image/svg+xml;utf8,%3Csvg xmlns='http://www.w3.org/2000/svg' width='24' height='24' viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='m3 16 4 4 4-4'%3E%3C/path%3E%3Cpath d='M7 20V4'%3E%3C/path%3E%3Cpath d='M11 4h4'%3E%3C/path%3E%3Cpath d='M11 8h7'%3E%3C/path%3E%3Cpath d='M11 12h10'%3E%3C/path%3E%3C/svg%3E",
  "arrow-left": "data:image/svg+xml;utf8,%3Csvg xmlns='http://www.w3.org/2000/svg' width='24' height='24' viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='m12 19-7-7 7-7'%3E%3C/path%3E%3Cpath d='M19 12H5'%3E%3C/path%3E%3C/svg%3E",
  "arrow-right": "data:image/svg+xml;utf8,%3Csvg xmlns='http://www.w3.org/2000/svg' width='24' height='24' viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='M5 12h14'%3E%3C/path%3E%3Cpath d='m12 5 7 7-7 7'%3E%3C/path%3E%3C/svg%3E",
  "badge-check": "data:image/svg+xml;utf8,%3Csvg xmlns='http://www.w3.org/2000/svg' width='24' height='24' viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='M3.85 8.62a4 4 0 0 1 4.78-4.77 4 4 0 0 1 6.74 0 4 4 0 0 1 4.78 4.78 4 4 0 0 1 0 6.74 4 4 0 0 1-4.77 4.78 4 4 0 0 1-6.75 0 4 4 0 0 1-4.78-4.77 4 4 0 0 1 0-6.76Z'%3E%3C/path%3E%3Cpath d='m9 12 2 2 4-4'%3E%3C/path%3E%3C/svg%3E",
  "bell": "data:image/svg+xml;utf8,%3Csvg xmlns='http://www.w3.org/2000/svg' width='24' height='24' viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='M10.268 21a2 2 0 0 0 3.464 0'%3E%3C/path%3E%3Cpath d='M3.262 15.326A1 1 0 0 0 4 17h16a1 1 0 0 0 .74-1.673C19.41 13.956 18 12.499 18 8A6 6 0 0 0 6 8c0 4.499-1.411 5.956-2.738 7.326'%3E%3C/path%3E%3C/svg%3E",
  "bell-off": "data:image/svg+xml;utf8,%3Csvg xmlns='http://www.w3.org/2000/svg' width='24' height='24' viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='M10.268 21a2 2 0 0 0 3.464 0'%3E%3C/path%3E%3Cpath d='M17 17H4a1 1 0 0 1-.74-1.673C4.59 13.956 6 12.499 6 8a6 6 0 0 1 .258-1.742'%3E%3C/path%3E%3Cpath d='m2 2 20 20'%3E%3C/path%3E%3Cpath d='M8.668 3.01A6 6 0 0 1 18 8c0 2.687.77 4.653 1.707 6.05'%3E%3C/path%3E%3C/svg%3E",
  "bell-ring": "data:image/svg+xml;utf8,%3Csvg xmlns='http://www.w3.org/2000/svg' width='24' height='24' viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='M10.268 21a2 2 0 0 0 3.464 0'%3E%3C/path%3E%3Cpath d='M22 8c0-2.3-.8-4.3-2-6'%3E%3C/path%3E%3Cpath d='M3.262 15.326A1 1 0 0 0 4 17h16a1 1 0 0 0 .74-1.673C19.41 13.956 18 12.499 18 8A6 6 0 0 0 6 8c0 4.499-1.411 5.956-2.738 7.326'%3E%3C/path%3E%3Cpath d='M4 2C2.8 3.7 2 5.7 2 8'%3E%3C/path%3E%3C/svg%3E",
  "building-2": "data:image/svg+xml;utf8,%3Csvg xmlns='http://www.w3.org/2000/svg' width='24' height='24' viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='M10 12h4'%3E%3C/path%3E%3Cpath d='M10 8h4'%3E%3C/path%3E%3Cpath d='M14 21v-3a2 2 0 0 0-4 0v3'%3E%3C/path%3E%3Cpath d='M6 10H4a2 2 0 0 0-2 2v7a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-2'%3E%3C/path%3E%3Cpath d='M6 21V5a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v16'%3E%3C/path%3E%3C/svg%3E",
  "calendar": "data:image/svg+xml;utf8,%3Csvg xmlns='http://www.w3.org/2000/svg' width='24' height='24' viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='M8 2v3'%3E%3C/path%3E%3Cpath d='M16 2v3'%3E%3C/path%3E%3Crect x='3' y='3' width='18' height='18' rx='2'%3E%3C/rect%3E%3Cpath d='M3 9h18'%3E%3C/path%3E%3C/svg%3E",
  "calendar-clock": "data:image/svg+xml;utf8,%3Csvg xmlns='http://www.w3.org/2000/svg' width='24' height='24' viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='M16 14v2.2l1.6 1'%3E%3C/path%3E%3Cpath d='M16 2v3'%3E%3C/path%3E%3Cpath d='M21 7.338V5a2 2 0 00-2-2H5a2 2 0 00-2 2v14a2 2 0 002 2h2.338'%3E%3C/path%3E%3Cpath d='M3 9h5.859'%3E%3C/path%3E%3Cpath d='M8 2v3'%3E%3C/path%3E%3Ccircle cx='16' cy='16' r='6'%3E%3C/circle%3E%3C/svg%3E",
  "camera": "data:image/svg+xml;utf8,%3Csvg xmlns='http://www.w3.org/2000/svg' width='24' height='24' viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='M13.997 4a2 2 0 0 1 1.76 1.05l.486.9A2 2 0 0 0 18.003 7H20a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V9a2 2 0 0 1 2-2h1.997a2 2 0 0 0 1.759-1.048l.489-.904A2 2 0 0 1 10.004 4z'%3E%3C/path%3E%3Ccircle cx='12' cy='13' r='3'%3E%3C/circle%3E%3C/svg%3E",
  "chart-column": "data:image/svg+xml;utf8,%3Csvg xmlns='http://www.w3.org/2000/svg' width='24' height='24' viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='M3 3v16a2 2 0 0 0 2 2h16'%3E%3C/path%3E%3Cpath d='M18 17V9'%3E%3C/path%3E%3Cpath d='M13 17V5'%3E%3C/path%3E%3Cpath d='M8 17v-3'%3E%3C/path%3E%3C/svg%3E",
  "chart-no-axes-column": "data:image/svg+xml;utf8,%3Csvg xmlns='http://www.w3.org/2000/svg' width='24' height='24' viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='M5 21v-6'%3E%3C/path%3E%3Cpath d='M12 21V3'%3E%3C/path%3E%3Cpath d='M19 21V9'%3E%3C/path%3E%3C/svg%3E",
  "check": "data:image/svg+xml;utf8,%3Csvg xmlns='http://www.w3.org/2000/svg' width='24' height='24' viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='M20 6 9 17l-5-5'%3E%3C/path%3E%3C/svg%3E",
  "chevron-down": "data:image/svg+xml;utf8,%3Csvg xmlns='http://www.w3.org/2000/svg' width='24' height='24' viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='m6 9 6 6 6-6'%3E%3C/path%3E%3C/svg%3E",
  "chevron-right": "data:image/svg+xml;utf8,%3Csvg xmlns='http://www.w3.org/2000/svg' width='24' height='24' viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='m9 18 6-6-6-6'%3E%3C/path%3E%3C/svg%3E",
  "circle": "data:image/svg+xml;utf8,%3Csvg xmlns='http://www.w3.org/2000/svg' width='24' height='24' viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Ccircle cx='12' cy='12' r='10'%3E%3C/circle%3E%3C/svg%3E",
  "circle-alert": "data:image/svg+xml;utf8,%3Csvg xmlns='http://www.w3.org/2000/svg' width='24' height='24' viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Ccircle cx='12' cy='12' r='10'%3E%3C/circle%3E%3Cline x1='12' x2='12' y1='8' y2='12'%3E%3C/line%3E%3Cline x1='12' x2='12.01' y1='16' y2='16'%3E%3C/line%3E%3C/svg%3E",
  "circle-check": "data:image/svg+xml;utf8,%3Csvg xmlns='http://www.w3.org/2000/svg' width='24' height='24' viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Ccircle cx='12' cy='12' r='10'%3E%3C/circle%3E%3Cpath d='m9 12 2 2 4-4'%3E%3C/path%3E%3C/svg%3E",
  "circle-question-mark": "data:image/svg+xml;utf8,%3Csvg xmlns='http://www.w3.org/2000/svg' width='24' height='24' viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Ccircle cx='12' cy='12' r='10'%3E%3C/circle%3E%3Cpath d='M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3'%3E%3C/path%3E%3Cpath d='M12 17h.01'%3E%3C/path%3E%3C/svg%3E",
  "circle-x": "data:image/svg+xml;utf8,%3Csvg xmlns='http://www.w3.org/2000/svg' width='24' height='24' viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Ccircle cx='12' cy='12' r='10'%3E%3C/circle%3E%3Cpath d='m15 9-6 6'%3E%3C/path%3E%3Cpath d='m9 9 6 6'%3E%3C/path%3E%3C/svg%3E",
  "clock": "data:image/svg+xml;utf8,%3Csvg xmlns='http://www.w3.org/2000/svg' width='24' height='24' viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Ccircle cx='12' cy='12' r='10'%3E%3C/circle%3E%3Cpath d='M12 6v6l4 2'%3E%3C/path%3E%3C/svg%3E",
  "clock-fading": "data:image/svg+xml;utf8,%3Csvg xmlns='http://www.w3.org/2000/svg' width='24' height='24' viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='M12 2a10 10 0 0 1 7.38 16.75'%3E%3C/path%3E%3Cpath d='M12 6v6l4 2'%3E%3C/path%3E%3Cpath d='M2.5 8.875a10 10 0 0 0-.5 3'%3E%3C/path%3E%3Cpath d='M2.83 16a10 10 0 0 0 2.43 3.4'%3E%3C/path%3E%3Cpath d='M4.636 5.235a10 10 0 0 1 .891-.857'%3E%3C/path%3E%3Cpath d='M8.644 21.42a10 10 0 0 0 7.631-.38'%3E%3C/path%3E%3C/svg%3E",
  "credit-card": "data:image/svg+xml;utf8,%3Csvg xmlns='http://www.w3.org/2000/svg' width='24' height='24' viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Crect width='20' height='14' x='2' y='5' rx='2'%3E%3C/rect%3E%3Cline x1='2' x2='22' y1='10' y2='10'%3E%3C/line%3E%3C/svg%3E",
  "dollar-sign": "data:image/svg+xml;utf8,%3Csvg xmlns='http://www.w3.org/2000/svg' width='24' height='24' viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cline x1='12' x2='12' y1='2' y2='22'%3E%3C/line%3E%3Cpath d='M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6'%3E%3C/path%3E%3C/svg%3E",
  "dot": "data:image/svg+xml;utf8,%3Csvg xmlns='http://www.w3.org/2000/svg' width='24' height='24' viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Ccircle cx='12' cy='12' r='1'%3E%3C/circle%3E%3C/svg%3E",
  "download": "data:image/svg+xml;utf8,%3Csvg xmlns='http://www.w3.org/2000/svg' width='24' height='24' viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='M12 15V3'%3E%3C/path%3E%3Cpath d='M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4'%3E%3C/path%3E%3Cpath d='m7 10 5 5 5-5'%3E%3C/path%3E%3C/svg%3E",
  "external-link": "data:image/svg+xml;utf8,%3Csvg xmlns='http://www.w3.org/2000/svg' width='24' height='24' viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='M15 3h6v6'%3E%3C/path%3E%3Cpath d='M10 14 21 3'%3E%3C/path%3E%3Cpath d='M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6'%3E%3C/path%3E%3C/svg%3E",
  "eye": "data:image/svg+xml;utf8,%3Csvg xmlns='http://www.w3.org/2000/svg' width='24' height='24' viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='M2.062 12.348a1 1 0 0 1 0-.696 10.75 10.75 0 0 1 19.876 0 1 1 0 0 1 0 .696 10.75 10.75 0 0 1-19.876 0'%3E%3C/path%3E%3Ccircle cx='12' cy='12' r='3'%3E%3C/circle%3E%3C/svg%3E",
  "file-check": "data:image/svg+xml;utf8,%3Csvg xmlns='http://www.w3.org/2000/svg' width='24' height='24' viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='M6 22a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h8a2.4 2.4 0 0 1 1.704.706l3.588 3.588A2.4 2.4 0 0 1 20 8v12a2 2 0 0 1-2 2z'%3E%3C/path%3E%3Cpath d='M14 2v5a1 1 0 0 0 1 1h5'%3E%3C/path%3E%3Cpath d='m9 15 2 2 4-4'%3E%3C/path%3E%3C/svg%3E",
  "file-text": "data:image/svg+xml;utf8,%3Csvg xmlns='http://www.w3.org/2000/svg' width='24' height='24' viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='M6 22a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h8a2.4 2.4 0 0 1 1.704.706l3.588 3.588A2.4 2.4 0 0 1 20 8v12a2 2 0 0 1-2 2z'%3E%3C/path%3E%3Cpath d='M14 2v5a1 1 0 0 0 1 1h5'%3E%3C/path%3E%3Cpath d='M10 9H8'%3E%3C/path%3E%3Cpath d='M16 13H8'%3E%3C/path%3E%3Cpath d='M16 17H8'%3E%3C/path%3E%3C/svg%3E",
  "file-x": "data:image/svg+xml;utf8,%3Csvg xmlns='http://www.w3.org/2000/svg' width='24' height='24' viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='M6 22a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h8a2.4 2.4 0 0 1 1.704.706l3.588 3.588A2.4 2.4 0 0 1 20 8v12a2 2 0 0 1-2 2z'%3E%3C/path%3E%3Cpath d='M14 2v5a1 1 0 0 0 1 1h5'%3E%3C/path%3E%3Cpath d='m14.5 12.5-5 5'%3E%3C/path%3E%3Cpath d='m9.5 12.5 5 5'%3E%3C/path%3E%3C/svg%3E",
  "git-branch": "data:image/svg+xml;utf8,%3Csvg xmlns='http://www.w3.org/2000/svg' width='24' height='24' viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='M15 6a9 9 0 0 0-9 9V3'%3E%3C/path%3E%3Ccircle cx='18' cy='6' r='3'%3E%3C/circle%3E%3Ccircle cx='6' cy='18' r='3'%3E%3C/circle%3E%3C/svg%3E",
  "hourglass": "data:image/svg+xml;utf8,%3Csvg xmlns='http://www.w3.org/2000/svg' width='24' height='24' viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='M5 22h14'%3E%3C/path%3E%3Cpath d='M5 2h14'%3E%3C/path%3E%3Cpath d='M17 22v-4.172a2 2 0 0 0-.586-1.414L12 12l-4.414 4.414A2 2 0 0 0 7 17.828V22'%3E%3C/path%3E%3Cpath d='M7 2v4.172a2 2 0 0 0 .586 1.414L12 12l4.414-4.414A2 2 0 0 0 17 6.172V2'%3E%3C/path%3E%3C/svg%3E",
  "house": "data:image/svg+xml;utf8,%3Csvg xmlns='http://www.w3.org/2000/svg' width='24' height='24' viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='M15 21v-8a1 1 0 0 0-1-1h-4a1 1 0 0 0-1 1v8'%3E%3C/path%3E%3Cpath d='M3 10a2 2 0 0 1 .709-1.528l7-6a2 2 0 0 1 2.582 0l7 6A2 2 0 0 1 21 10v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z'%3E%3C/path%3E%3C/svg%3E",
  "inbox": "data:image/svg+xml;utf8,%3Csvg xmlns='http://www.w3.org/2000/svg' width='24' height='24' viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='22 12 16 12 14 15 10 15 8 12 2 12'%3E%3C/polyline%3E%3Cpath d='M5.45 5.11 2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z'%3E%3C/path%3E%3C/svg%3E",
  "info": "data:image/svg+xml;utf8,%3Csvg xmlns='http://www.w3.org/2000/svg' width='24' height='24' viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Ccircle cx='12' cy='12' r='10'%3E%3C/circle%3E%3Cpath d='M12 16v-4'%3E%3C/path%3E%3Cpath d='M12 8h.01'%3E%3C/path%3E%3C/svg%3E",
  "key-round": "data:image/svg+xml;utf8,%3Csvg xmlns='http://www.w3.org/2000/svg' width='24' height='24' viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='M2.586 17.414A2 2 0 0 0 2 18.828V21a1 1 0 0 0 1 1h3a1 1 0 0 0 1-1v-1a1 1 0 0 1 1-1h1a1 1 0 0 0 1-1v-1a1 1 0 0 1 1-1h.172a2 2 0 0 0 1.414-.586l.814-.814a6.5 6.5 0 1 0-4-4z'%3E%3C/path%3E%3Ccircle cx='16.5' cy='7.5' r='.5' fill='currentColor'%3E%3C/circle%3E%3C/svg%3E",
  "layout-dashboard": "data:image/svg+xml;utf8,%3Csvg xmlns='http://www.w3.org/2000/svg' width='24' height='24' viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Crect width='7' height='9' x='3' y='3' rx='1'%3E%3C/rect%3E%3Crect width='7' height='5' x='14' y='3' rx='1'%3E%3C/rect%3E%3Crect width='7' height='9' x='14' y='12' rx='1'%3E%3C/rect%3E%3Crect width='7' height='5' x='3' y='16' rx='1'%3E%3C/rect%3E%3C/svg%3E",
  "link": "data:image/svg+xml;utf8,%3Csvg xmlns='http://www.w3.org/2000/svg' width='24' height='24' viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71'%3E%3C/path%3E%3Cpath d='M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71'%3E%3C/path%3E%3C/svg%3E",
  "list-filter": "data:image/svg+xml;utf8,%3Csvg xmlns='http://www.w3.org/2000/svg' width='24' height='24' viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='M2 5h20'%3E%3C/path%3E%3Cpath d='M6 12h12'%3E%3C/path%3E%3Cpath d='M9 19h6'%3E%3C/path%3E%3C/svg%3E",
  "loader-circle": "data:image/svg+xml;utf8,%3Csvg xmlns='http://www.w3.org/2000/svg' width='24' height='24' viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='M21 12a9 9 0 1 1-6.219-8.56'%3E%3C/path%3E%3C/svg%3E",
  "lock": "data:image/svg+xml;utf8,%3Csvg xmlns='http://www.w3.org/2000/svg' width='24' height='24' viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Crect width='18' height='11' x='3' y='11' rx='2' ry='2'%3E%3C/rect%3E%3Cpath d='M7 11V7a5 5 0 0 1 10 0v4'%3E%3C/path%3E%3C/svg%3E",
  "log-in": "data:image/svg+xml;utf8,%3Csvg xmlns='http://www.w3.org/2000/svg' width='24' height='24' viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='m10 17 5-5-5-5'%3E%3C/path%3E%3Cpath d='M15 12H3'%3E%3C/path%3E%3Cpath d='M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4'%3E%3C/path%3E%3C/svg%3E",
  "log-out": "data:image/svg+xml;utf8,%3Csvg xmlns='http://www.w3.org/2000/svg' width='24' height='24' viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='m16 17 5-5-5-5'%3E%3C/path%3E%3Cpath d='M21 12H9'%3E%3C/path%3E%3Cpath d='M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4'%3E%3C/path%3E%3C/svg%3E",
  "mail": "data:image/svg+xml;utf8,%3Csvg xmlns='http://www.w3.org/2000/svg' width='24' height='24' viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='m22 7-8.991 5.727a2 2 0 0 1-2.009 0L2 7'%3E%3C/path%3E%3Crect x='2' y='4' width='20' height='16' rx='2'%3E%3C/rect%3E%3C/svg%3E",
  "map": "data:image/svg+xml;utf8,%3Csvg xmlns='http://www.w3.org/2000/svg' width='24' height='24' viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='M14.106 5.553a2 2 0 0 0 1.788 0l3.659-1.83A1 1 0 0 1 21 4.619v12.764a1 1 0 0 1-.553.894l-4.553 2.277a2 2 0 0 1-1.788 0l-4.212-2.106a2 2 0 0 0-1.788 0l-3.659 1.83A1 1 0 0 1 3 19.381V6.618a1 1 0 0 1 .553-.894l4.553-2.277a2 2 0 0 1 1.788 0z'%3E%3C/path%3E%3Cpath d='M15 5.764v15'%3E%3C/path%3E%3Cpath d='M9 3.236v15'%3E%3C/path%3E%3C/svg%3E",
  "map-pin": "data:image/svg+xml;utf8,%3Csvg xmlns='http://www.w3.org/2000/svg' width='24' height='24' viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='M20 10c0 4.993-5.539 10.193-7.399 11.799a1 1 0 0 1-1.202 0C9.539 20.193 4 14.993 4 10a8 8 0 0 1 16 0'%3E%3C/path%3E%3Ccircle cx='12' cy='10' r='3'%3E%3C/circle%3E%3C/svg%3E",
  "minus": "data:image/svg+xml;utf8,%3Csvg xmlns='http://www.w3.org/2000/svg' width='24' height='24' viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='M5 12h14'%3E%3C/path%3E%3C/svg%3E",
  "navigation": "data:image/svg+xml;utf8,%3Csvg xmlns='http://www.w3.org/2000/svg' width='24' height='24' viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolygon points='3 11 22 2 13 21 11 13 3 11'%3E%3C/polygon%3E%3C/svg%3E",
  "octagon-alert": "data:image/svg+xml;utf8,%3Csvg xmlns='http://www.w3.org/2000/svg' width='24' height='24' viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='M12 16h.01'%3E%3C/path%3E%3Cpath d='M12 8v4'%3E%3C/path%3E%3Cpath d='M15.312 2a2 2 0 0 1 1.414.586l4.688 4.688A2 2 0 0 1 22 8.688v6.624a2 2 0 0 1-.586 1.414l-4.688 4.688a2 2 0 0 1-1.414.586H8.688a2 2 0 0 1-1.414-.586l-4.688-4.688A2 2 0 0 1 2 15.312V8.688a2 2 0 0 1 .586-1.414l4.688-4.688A2 2 0 0 1 8.688 2z'%3E%3C/path%3E%3C/svg%3E",
  "package": "data:image/svg+xml;utf8,%3Csvg xmlns='http://www.w3.org/2000/svg' width='24' height='24' viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='M11 21.73a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73z'%3E%3C/path%3E%3Cpath d='M12 22V12'%3E%3C/path%3E%3Cpolyline points='3.29 7 12 12 20.71 7'%3E%3C/polyline%3E%3Cpath d='m7.5 4.27 9 5.15'%3E%3C/path%3E%3C/svg%3E",
  "package-check": "data:image/svg+xml;utf8,%3Csvg xmlns='http://www.w3.org/2000/svg' width='24' height='24' viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='M12 22V12'%3E%3C/path%3E%3Cpath d='m16 17 2 2 4-4'%3E%3C/path%3E%3Cpath d='M21 11.127V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.729l7 4a2 2 0 0 0 2 .001l1.32-.753'%3E%3C/path%3E%3Cpath d='M3.29 7 12 12l8.71-5'%3E%3C/path%3E%3Cpath d='m7.5 4.27 8.997 5.148'%3E%3C/path%3E%3C/svg%3E",
  "pause": "data:image/svg+xml;utf8,%3Csvg xmlns='http://www.w3.org/2000/svg' width='24' height='24' viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Crect x='14' y='3' width='5' height='18' rx='1'%3E%3C/rect%3E%3Crect x='5' y='3' width='5' height='18' rx='1'%3E%3C/rect%3E%3C/svg%3E",
  "pencil": "data:image/svg+xml;utf8,%3Csvg xmlns='http://www.w3.org/2000/svg' width='24' height='24' viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='M21.174 6.812a1 1 0 0 0-3.986-3.987L3.842 16.174a2 2 0 0 0-.5.83l-1.321 4.352a.5.5 0 0 0 .623.622l4.353-1.32a2 2 0 0 0 .83-.497z'%3E%3C/path%3E%3Cpath d='m15 5 4 4'%3E%3C/path%3E%3C/svg%3E",
  "phone": "data:image/svg+xml;utf8,%3Csvg xmlns='http://www.w3.org/2000/svg' width='24' height='24' viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='M13.832 16.568a1 1 0 0 0 1.213-.303l.355-.465A2 2 0 0 1 17 15h3a2 2 0 0 1 2 2v3a2 2 0 0 1-2 2A18 18 0 0 1 2 4a2 2 0 0 1 2-2h3a2 2 0 0 1 2 2v3a2 2 0 0 1-.8 1.6l-.468.351a1 1 0 0 0-.292 1.233 14 14 0 0 0 6.392 6.384'%3E%3C/path%3E%3C/svg%3E",
  "plus": "data:image/svg+xml;utf8,%3Csvg xmlns='http://www.w3.org/2000/svg' width='24' height='24' viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='M5 12h14'%3E%3C/path%3E%3Cpath d='M12 5v14'%3E%3C/path%3E%3C/svg%3E",
  "printer": "data:image/svg+xml;utf8,%3Csvg xmlns='http://www.w3.org/2000/svg' width='24' height='24' viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2'%3E%3C/path%3E%3Cpath d='M6 9V3a1 1 0 0 1 1-1h10a1 1 0 0 1 1 1v6'%3E%3C/path%3E%3Crect x='6' y='14' width='12' height='8' rx='1'%3E%3C/rect%3E%3C/svg%3E",
  "printer-check": "data:image/svg+xml;utf8,%3Csvg xmlns='http://www.w3.org/2000/svg' width='24' height='24' viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='M13.5 22H7a1 1 0 0 1-1-1v-6a1 1 0 0 1 1-1h10a1 1 0 0 1 1 1v.5'%3E%3C/path%3E%3Cpath d='m16 19 2 2 4-4'%3E%3C/path%3E%3Cpath d='M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v2'%3E%3C/path%3E%3Cpath d='M6 9V3a1 1 0 0 1 1-1h10a1 1 0 0 1 1 1v6'%3E%3C/path%3E%3C/svg%3E",
  "repeat": "data:image/svg+xml;utf8,%3Csvg xmlns='http://www.w3.org/2000/svg' width='24' height='24' viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='m17 2 4 4-4 4'%3E%3C/path%3E%3Cpath d='M3 11v-1a4 4 0 0 1 4-4h14'%3E%3C/path%3E%3Cpath d='m7 22-4-4 4-4'%3E%3C/path%3E%3Cpath d='M21 13v1a4 4 0 0 1-4 4H3'%3E%3C/path%3E%3C/svg%3E",
  "rotate-ccw": "data:image/svg+xml;utf8,%3Csvg xmlns='http://www.w3.org/2000/svg' width='24' height='24' viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8'%3E%3C/path%3E%3Cpath d='M3 3v5h5'%3E%3C/path%3E%3C/svg%3E",
  "search": "data:image/svg+xml;utf8,%3Csvg xmlns='http://www.w3.org/2000/svg' width='24' height='24' viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='m21 21-4.34-4.34'%3E%3C/path%3E%3Ccircle cx='11' cy='11' r='8'%3E%3C/circle%3E%3C/svg%3E",
  "settings": "data:image/svg+xml;utf8,%3Csvg xmlns='http://www.w3.org/2000/svg' width='24' height='24' viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='M9.671 4.136a2.34 2.34 0 0 1 4.659 0 2.34 2.34 0 0 0 3.319 1.915 2.34 2.34 0 0 1 2.33 4.033 2.34 2.34 0 0 0 0 3.831 2.34 2.34 0 0 1-2.33 4.033 2.34 2.34 0 0 0-3.319 1.915 2.34 2.34 0 0 1-4.659 0 2.34 2.34 0 0 0-3.32-1.915 2.34 2.34 0 0 1-2.33-4.033 2.34 2.34 0 0 0 0-3.831A2.34 2.34 0 0 1 6.35 6.051a2.34 2.34 0 0 0 3.319-1.915'%3E%3C/path%3E%3Ccircle cx='12' cy='12' r='3'%3E%3C/circle%3E%3C/svg%3E",
  "shield-check": "data:image/svg+xml;utf8,%3Csvg xmlns='http://www.w3.org/2000/svg' width='24' height='24' viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z'%3E%3C/path%3E%3Cpath d='m9 12 2 2 4-4'%3E%3C/path%3E%3C/svg%3E",
  "shopping-bag": "data:image/svg+xml;utf8,%3Csvg xmlns='http://www.w3.org/2000/svg' width='24' height='24' viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='M16 10a4 4 0 0 1-8 0'%3E%3C/path%3E%3Cpath d='M3.103 6.034h17.794'%3E%3C/path%3E%3Cpath d='M3.4 5.467a2 2 0 0 0-.4 1.2V20a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6.667a2 2 0 0 0-.4-1.2l-2-2.667A2 2 0 0 0 17 2H7a2 2 0 0 0-1.6.8z'%3E%3C/path%3E%3C/svg%3E",
  "shopping-cart": "data:image/svg+xml;utf8,%3Csvg xmlns='http://www.w3.org/2000/svg' width='24' height='24' viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Ccircle cx='8' cy='21' r='1'%3E%3C/circle%3E%3Ccircle cx='19' cy='21' r='1'%3E%3C/circle%3E%3Cpath d='M2.05 2.05h2l2.66 12.42a2 2 0 0 0 2 1.58h9.78a2 2 0 0 0 1.95-1.57l1.65-7.43H5.12'%3E%3C/path%3E%3C/svg%3E",
  "sticky-note": "data:image/svg+xml;utf8,%3Csvg xmlns='http://www.w3.org/2000/svg' width='24' height='24' viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='M21 9a2.4 2.4 0 0 0-.706-1.706l-3.588-3.588A2.4 2.4 0 0 0 15 3H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2z'%3E%3C/path%3E%3Cpath d='M15 3v5a1 1 0 0 0 1 1h5'%3E%3C/path%3E%3C/svg%3E",
  "target": "data:image/svg+xml;utf8,%3Csvg xmlns='http://www.w3.org/2000/svg' width='24' height='24' viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Ccircle cx='12' cy='12' r='10'%3E%3C/circle%3E%3Ccircle cx='12' cy='12' r='6'%3E%3C/circle%3E%3Ccircle cx='12' cy='12' r='2'%3E%3C/circle%3E%3C/svg%3E",
  "trash-2": "data:image/svg+xml;utf8,%3Csvg xmlns='http://www.w3.org/2000/svg' width='24' height='24' viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='M10 11v6'%3E%3C/path%3E%3Cpath d='M14 11v6'%3E%3C/path%3E%3Cpath d='M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6'%3E%3C/path%3E%3Cpath d='M3 6h18'%3E%3C/path%3E%3Cpath d='M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2'%3E%3C/path%3E%3C/svg%3E",
  "trending-down": "data:image/svg+xml;utf8,%3Csvg xmlns='http://www.w3.org/2000/svg' width='24' height='24' viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='M16 17h6v-6'%3E%3C/path%3E%3Cpath d='m22 17-8.5-8.5-5 5L2 7'%3E%3C/path%3E%3C/svg%3E",
  "trending-up": "data:image/svg+xml;utf8,%3Csvg xmlns='http://www.w3.org/2000/svg' width='24' height='24' viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='M16 7h6v6'%3E%3C/path%3E%3Cpath d='m22 7-8.5 8.5-5-5L2 17'%3E%3C/path%3E%3C/svg%3E",
  "triangle-alert": "data:image/svg+xml;utf8,%3Csvg xmlns='http://www.w3.org/2000/svg' width='24' height='24' viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3'%3E%3C/path%3E%3Cpath d='M12 9v4'%3E%3C/path%3E%3Cpath d='M12 17h.01'%3E%3C/path%3E%3C/svg%3E",
  "truck": "data:image/svg+xml;utf8,%3Csvg xmlns='http://www.w3.org/2000/svg' width='24' height='24' viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='M14 18V6a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2v11a1 1 0 0 0 1 1h2'%3E%3C/path%3E%3Cpath d='M15 18H9'%3E%3C/path%3E%3Cpath d='M19 18h2a1 1 0 0 0 1-1v-3.65a1 1 0 0 0-.22-.624l-3.48-4.35A1 1 0 0 0 17.52 8H14'%3E%3C/path%3E%3Ccircle cx='17' cy='18' r='2'%3E%3C/circle%3E%3Ccircle cx='7' cy='18' r='2'%3E%3C/circle%3E%3C/svg%3E",
  "user": "data:image/svg+xml;utf8,%3Csvg xmlns='http://www.w3.org/2000/svg' width='24' height='24' viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2'%3E%3C/path%3E%3Ccircle cx='12' cy='7' r='4'%3E%3C/circle%3E%3C/svg%3E",
  "users": "data:image/svg+xml;utf8,%3Csvg xmlns='http://www.w3.org/2000/svg' width='24' height='24' viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2'%3E%3C/path%3E%3Cpath d='M16 3.128a4 4 0 0 1 0 7.744'%3E%3C/path%3E%3Cpath d='M22 21v-2a4 4 0 0 0-3-3.87'%3E%3C/path%3E%3Ccircle cx='9' cy='7' r='4'%3E%3C/circle%3E%3C/svg%3E",
  "users-round": "data:image/svg+xml;utf8,%3Csvg xmlns='http://www.w3.org/2000/svg' width='24' height='24' viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='M18 21a8 8 0 0 0-16 0'%3E%3C/path%3E%3Ccircle cx='10' cy='8' r='5'%3E%3C/circle%3E%3Cpath d='M22 20c0-3.37-2-6.5-4-8a5 5 0 0 0-.45-8.3'%3E%3C/path%3E%3C/svg%3E",
  "wallet": "data:image/svg+xml;utf8,%3Csvg xmlns='http://www.w3.org/2000/svg' width='24' height='24' viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='M19 7V4a1 1 0 0 0-1-1H5a2 2 0 0 0 0 4h15a1 1 0 0 1 1 1v4h-3a2 2 0 0 0 0 4h3a1 1 0 0 0 1-1v-2a1 1 0 0 0-1-1'%3E%3C/path%3E%3Cpath d='M3 5v14a2 2 0 0 0 2 2h15a1 1 0 0 0 1-1v-4'%3E%3C/path%3E%3C/svg%3E",
  "wrench": "data:image/svg+xml;utf8,%3Csvg xmlns='http://www.w3.org/2000/svg' width='24' height='24' viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.106-3.105c.32-.322.863-.22.983.218a6 6 0 0 1-8.259 7.057l-7.91 7.91a1 1 0 0 1-2.999-3l7.91-7.91a6 6 0 0 1 7.057-8.259c.438.12.54.662.219.984z'%3E%3C/path%3E%3C/svg%3E",
  "x": "data:image/svg+xml;utf8,%3Csvg xmlns='http://www.w3.org/2000/svg' width='24' height='24' viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='M18 6 6 18'%3E%3C/path%3E%3Cpath d='m6 6 12 12'%3E%3C/path%3E%3C/svg%3E",
  "moon": "data:image/svg+xml;utf8,%3Csvg xmlns='http://www.w3.org/2000/svg' width='24' height='24' viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z'%3E%3C/path%3E%3C/svg%3E",
  "sun": "data:image/svg+xml;utf8,%3Csvg xmlns='http://www.w3.org/2000/svg' width='24' height='24' viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Ccircle cx='12' cy='12' r='4'%3E%3C/circle%3E%3Cpath d='M12 2v2'%3E%3C/path%3E%3Cpath d='M12 20v2'%3E%3C/path%3E%3Cpath d='m4.93 4.93 1.41 1.41'%3E%3C/path%3E%3Cpath d='m17.66 17.66 1.41 1.41'%3E%3C/path%3E%3Cpath d='M2 12h2'%3E%3C/path%3E%3Cpath d='M20 12h2'%3E%3C/path%3E%3Cpath d='m6.34 17.66-1.41 1.41'%3E%3C/path%3E%3Cpath d='m19.07 4.93-1.41 1.41'%3E%3C/path%3E%3C/svg%3E",
  "zap": "data:image/svg+xml;utf8,%3Csvg xmlns='http://www.w3.org/2000/svg' width='24' height='24' viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='M15.914 4a1.5 1.5 0 00-2.474-1.561l-9 9A1.5 1.5 0 005.5 14h4.002a.5.5 0 01.471.666L8.086 20a1.5 1.5 0 002.475 1.56l9-9A1.5 1.5 0 0018.5 10h-3.997a.5.5 0 01-.472-.667z'%3E%3C/path%3E%3C/svg%3E"
};
const ICON_NAMES = Object.keys(GLYPHS);

/** Lucide glyph rendered as a CSS mask so it inherits colour like text. */
function Icon({
  name = "circle",
  size = 16,
  color = "currentColor",
  title,
  style,
  ...rest
}) {
  const glyph = GLYPHS[name] || GLYPHS.circle;
  const url = 'url("' + glyph + '")';
  return /*#__PURE__*/React.createElement("span", _extends({
    role: title ? "img" : undefined,
    "aria-label": title,
    "aria-hidden": title ? undefined : "true",
    title: title
  }, rest, {
    style: {
      display: "inline-block",
      width: size,
      height: size,
      flexShrink: 0,
      backgroundColor: color,
      WebkitMaskImage: url,
      maskImage: url,
      WebkitMaskRepeat: "no-repeat",
      maskRepeat: "no-repeat",
      WebkitMaskPosition: "center",
      maskPosition: "center",
      WebkitMaskSize: "contain",
      maskSize: "contain",
      ...style
    }
  }));
}
Object.assign(__ds_scope, { ICON_NAMES, Icon });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/core/Icon.jsx", error: String((e && e.message) || e) }); }

// components/core/Button.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
const SIZES = {
  sm: {
    height: 30,
    padding: "0 10px",
    font: "var(--text-xs)",
    gap: 6,
    icon: 13
  },
  md: {
    height: 36,
    padding: "0 14px",
    font: "var(--text-base)",
    gap: 7,
    icon: 15
  },
  lg: {
    height: 44,
    padding: "0 20px",
    font: "var(--text-md)",
    gap: 8,
    icon: 17
  },
  xl: {
    height: 56,
    padding: "0 24px",
    font: "var(--text-md)",
    gap: 10,
    icon: 19
  }
};
const VARIANTS = {
  primary: {
    background: "var(--brand-primary)",
    color: "var(--brand-on-primary)",
    border: "1px solid var(--brand-primary)",
    hover: "var(--brand-primary-hover)"
  },
  secondary: {
    background: "var(--surface-raised)",
    color: "var(--text-primary)",
    border: "1px solid var(--border-default)",
    hover: "var(--surface-active)"
  },
  outline: {
    background: "transparent",
    color: "var(--text-body)",
    border: "1px solid var(--border-default)",
    hover: "var(--surface-raised)"
  },
  ghost: {
    background: "transparent",
    color: "var(--text-muted)",
    border: "1px solid transparent",
    hover: "var(--surface-raised)"
  },
  danger: {
    background: "var(--feedback-danger)",
    color: "#fff",
    border: "1px solid var(--feedback-danger)",
    hover: "var(--red-400)"
  },
  success: {
    background: "var(--feedback-success)",
    color: "#04241a",
    border: "1px solid var(--feedback-success)",
    hover: "var(--emerald-400)"
  }
};
function Button({
  children,
  variant = "primary",
  size = "md",
  iconLeft,
  iconRight,
  loading = false,
  disabled = false,
  fullWidth = false,
  style,
  onClick,
  type = "button",
  ...rest
}) {
  const [hover, setHover] = React.useState(false);
  const s = SIZES[size] || SIZES.md;
  const v = VARIANTS[variant] || VARIANTS.primary;
  const off = disabled || loading;
  return /*#__PURE__*/React.createElement("button", _extends({
    type: type,
    disabled: off,
    onClick: onClick,
    onMouseEnter: () => setHover(true),
    onMouseLeave: () => setHover(false)
  }, rest, {
    style: {
      display: "inline-flex",
      alignItems: "center",
      justifyContent: "center",
      gap: s.gap,
      height: s.height,
      padding: s.padding,
      width: fullWidth ? "100%" : undefined,
      fontFamily: "var(--font-body)",
      fontSize: s.font,
      fontWeight: "var(--weight-semibold)",
      letterSpacing: "var(--tracking-tight)",
      lineHeight: 1,
      background: off ? "var(--surface-raised)" : hover ? v.hover : v.background,
      color: off ? "var(--text-faint)" : v.color,
      border: off ? "1px solid var(--border-subtle)" : v.border,
      borderRadius: "var(--radius-sm)",
      cursor: off ? "not-allowed" : "pointer",
      whiteSpace: "nowrap",
      transition: "var(--transition-control)",
      boxShadow: variant === "primary" && !off ? "var(--shadow-sm)" : "none",
      ...style
    }
  }), loading ? /*#__PURE__*/React.createElement(__ds_scope.Icon, {
    name: "loader-circle",
    size: s.icon
  }) : iconLeft ? /*#__PURE__*/React.createElement(__ds_scope.Icon, {
    name: iconLeft,
    size: s.icon
  }) : null, children, iconRight && !loading ? /*#__PURE__*/React.createElement(__ds_scope.Icon, {
    name: iconRight,
    size: s.icon
  }) : null);
}
Object.assign(__ds_scope, { Button });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/core/Button.jsx", error: String((e && e.message) || e) }); }

// components/core/Checkbox.jsx
try { (() => {
function Checkbox({
  label,
  checked = false,
  onChange,
  disabled,
  description,
  style
}) {
  return /*#__PURE__*/React.createElement("label", {
    style: {
      display: "flex",
      alignItems: description ? "flex-start" : "center",
      gap: 10,
      cursor: disabled ? "not-allowed" : "pointer",
      opacity: disabled ? 0.5 : 1,
      ...style
    }
  }, /*#__PURE__*/React.createElement("span", {
    onClick: () => !disabled && onChange && onChange(!checked),
    style: {
      width: 17,
      height: 17,
      flexShrink: 0,
      marginTop: description ? 1 : 0,
      display: "inline-flex",
      alignItems: "center",
      justifyContent: "center",
      background: checked ? "var(--brand-primary)" : "var(--surface-input)",
      border: `1px solid ${checked ? "var(--brand-primary)" : "var(--border-strong)"}`,
      borderRadius: "var(--radius-xs)",
      transition: "var(--transition-control)"
    }
  }, checked && /*#__PURE__*/React.createElement(__ds_scope.Icon, {
    name: "check",
    size: 12,
    color: "#fff"
  })), label && /*#__PURE__*/React.createElement("span", {
    style: {
      display: "flex",
      flexDirection: "column",
      gap: 2
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: "var(--text-base)",
      color: "var(--text-body)"
    }
  }, label), description && /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: "var(--text-2xs)",
      color: "var(--text-faint)"
    }
  }, description)));
}
Object.assign(__ds_scope, { Checkbox });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/core/Checkbox.jsx", error: String((e && e.message) || e) }); }

// components/core/Input.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
function Input({
  label,
  hint,
  error,
  icon,
  mono = false,
  size = "md",
  value,
  onChange,
  placeholder,
  type = "text",
  disabled = false,
  suffix,
  style,
  ...rest
}) {
  const [focus, setFocus] = React.useState(false);
  const h = size === "sm" ? 32 : size === "lg" ? 44 : 38;
  return /*#__PURE__*/React.createElement("label", {
    style: {
      display: "flex",
      flexDirection: "column",
      gap: 6,
      width: "100%",
      ...style
    }
  }, label && /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: "var(--text-xs)",
      fontWeight: "var(--weight-medium)",
      color: "var(--text-muted)",
      letterSpacing: "var(--tracking-tight)"
    }
  }, label), /*#__PURE__*/React.createElement("span", {
    style: {
      display: "flex",
      alignItems: "center",
      gap: 8,
      height: h,
      padding: "0 10px",
      background: disabled ? "var(--surface-card)" : "var(--surface-input)",
      border: `1px solid ${error ? "var(--feedback-danger)" : focus ? "var(--brand-primary)" : "var(--border-default)"}`,
      borderRadius: "var(--radius-sm)",
      boxShadow: focus ? "0 0 0 3px rgba(59,130,246,.18)" : "none",
      transition: "var(--transition-control)"
    }
  }, icon && /*#__PURE__*/React.createElement(__ds_scope.Icon, {
    name: icon,
    size: 14,
    color: "var(--text-faint)"
  }), /*#__PURE__*/React.createElement("input", _extends({
    type: type,
    value: value,
    onChange: onChange,
    placeholder: placeholder,
    disabled: disabled,
    onFocus: () => setFocus(true),
    onBlur: () => setFocus(false)
  }, rest, {
    style: {
      flex: 1,
      minWidth: 0,
      border: "none",
      outline: "none",
      background: "transparent",
      color: disabled ? "var(--text-faint)" : "var(--text-primary)",
      fontFamily: mono ? "var(--font-numeric)" : "var(--font-body)",
      fontSize: size === "lg" ? "var(--text-md)" : "var(--text-base)",
      letterSpacing: mono ? "0.06em" : "var(--tracking-tight)"
    }
  })), suffix && /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: "var(--text-xs)",
      color: "var(--text-faint)"
    }
  }, suffix)), (hint || error) && /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: "var(--text-2xs)",
      color: error ? "var(--feedback-danger)" : "var(--text-faint)"
    }
  }, error || hint));
}
Object.assign(__ds_scope, { Input });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/core/Input.jsx", error: String((e && e.message) || e) }); }

// components/core/Select.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
const UNSET = "__unset__";
function Select({
  label,
  options = [],
  value,
  onChange,
  size = "md",
  disabled,
  allowUnset = false,
  unsetLabel = "— Not set —",
  required = false,
  style,
  ...rest
}) {
  const h = size === "sm" ? 32 : size === "lg" ? 44 : 38;
  const isUnset = value == null || value === "" || value === UNSET;
  const missing = required && isUnset;
  const known = options.some(o => (typeof o === "string" ? o : o.value) === value);
  return /*#__PURE__*/React.createElement("label", {
    style: {
      display: "flex",
      flexDirection: "column",
      gap: 6,
      width: "100%",
      ...style
    }
  }, label && /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: "var(--text-xs)",
      fontWeight: "var(--weight-medium)",
      color: "var(--text-muted)"
    }
  }, label), /*#__PURE__*/React.createElement("span", {
    style: {
      position: "relative",
      display: "block"
    }
  }, /*#__PURE__*/React.createElement("select", _extends({
    value: isUnset ? UNSET : value,
    onChange: onChange,
    disabled: disabled
  }, rest, {
    style: {
      width: "100%",
      height: h,
      padding: "0 32px 0 10px",
      appearance: "none",
      background: "var(--surface-input)",
      color: isUnset ? "var(--text-faint)" : "var(--text-primary)",
      border: `1px solid ${missing ? "var(--attention)" : "var(--border-default)"}`,
      borderRadius: "var(--radius-sm)",
      fontFamily: "var(--font-body)",
      fontSize: "var(--text-base)",
      outline: "none",
      cursor: disabled ? "not-allowed" : "pointer",
      transition: "var(--transition-control)"
    }
  }), (allowUnset || isUnset) && /*#__PURE__*/React.createElement("option", {
    value: UNSET,
    style: {
      background: "var(--ink-200)"
    }
  }, unsetLabel), !known && !isUnset && /*#__PURE__*/React.createElement("option", {
    value: value,
    style: {
      background: "var(--ink-200)"
    }
  }, value), options.map(o => {
    const val = typeof o === "string" ? o : o.value;
    const lab = typeof o === "string" ? o : o.label;
    return /*#__PURE__*/React.createElement("option", {
      key: val,
      value: val,
      style: {
        background: "var(--ink-200)"
      }
    }, lab);
  })), /*#__PURE__*/React.createElement(__ds_scope.Icon, {
    name: "chevron-down",
    size: 14,
    color: "var(--text-faint)",
    style: {
      position: "absolute",
      right: 10,
      top: "50%",
      transform: "translateY(-50%)",
      pointerEvents: "none"
    }
  })), missing && /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: "var(--text-2xs)",
      color: "var(--attention)"
    }
  }, "Required \u2014 choose a value"));
}
Object.assign(__ds_scope, { Select });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/core/Select.jsx", error: String((e && e.message) || e) }); }

// components/core/Switch.jsx
try { (() => {
function Switch({
  checked = false,
  onChange,
  label,
  disabled,
  style
}) {
  return /*#__PURE__*/React.createElement("label", {
    style: {
      display: "inline-flex",
      alignItems: "center",
      gap: 10,
      cursor: disabled ? "not-allowed" : "pointer",
      opacity: disabled ? 0.5 : 1,
      ...style
    }
  }, /*#__PURE__*/React.createElement("span", {
    onClick: () => !disabled && onChange && onChange(!checked),
    style: {
      width: 34,
      height: 19,
      padding: 2,
      borderRadius: "var(--radius-pill)",
      background: checked ? "var(--brand-primary)" : "var(--ink-400)",
      display: "inline-flex",
      alignItems: "center",
      transition: "background-color var(--duration-fast) var(--ease-standard)"
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      width: 15,
      height: 15,
      borderRadius: "50%",
      background: "#fff",
      transform: checked ? "translateX(15px)" : "translateX(0)",
      transition: "transform var(--duration-fast) var(--ease-out)",
      boxShadow: "var(--shadow-sm)"
    }
  })), label && /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: "var(--text-base)",
      color: "var(--text-body)"
    }
  }, label));
}
Object.assign(__ds_scope, { Switch });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/core/Switch.jsx", error: String((e && e.message) || e) }); }

// components/core/Textarea.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
function Textarea({
  label,
  hint,
  rows = 3,
  value,
  onChange,
  placeholder,
  disabled,
  style,
  ...rest
}) {
  const [focus, setFocus] = React.useState(false);
  return /*#__PURE__*/React.createElement("label", {
    style: {
      display: "flex",
      flexDirection: "column",
      gap: 6,
      width: "100%",
      ...style
    }
  }, label && /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: "var(--text-xs)",
      fontWeight: "var(--weight-medium)",
      color: "var(--text-muted)"
    }
  }, label), /*#__PURE__*/React.createElement("textarea", _extends({
    rows: rows,
    value: value,
    onChange: onChange,
    placeholder: placeholder,
    disabled: disabled,
    onFocus: () => setFocus(true),
    onBlur: () => setFocus(false)
  }, rest, {
    style: {
      width: "100%",
      padding: "10px 12px",
      resize: "vertical",
      background: "var(--surface-input)",
      color: "var(--text-primary)",
      border: `1px solid ${focus ? "var(--brand-primary)" : "var(--border-default)"}`,
      borderRadius: "var(--radius-sm)",
      outline: "none",
      fontFamily: "var(--font-body)",
      fontSize: "var(--text-base)",
      lineHeight: "var(--leading-normal)",
      boxShadow: focus ? "0 0 0 3px rgba(59,130,246,.18)" : "none",
      transition: "var(--transition-control)"
    }
  })), hint && /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: "var(--text-2xs)",
      color: "var(--text-faint)"
    }
  }, hint));
}
Object.assign(__ds_scope, { Textarea });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/core/Textarea.jsx", error: String((e && e.message) || e) }); }

// components/data/Badge.jsx
try { (() => {
const TONES = {
  neutral: ["var(--text-muted)", "rgba(168,179,207,.1)"],
  info: ["var(--feedback-info)", "var(--feedback-info-bg)"],
  success: ["var(--feedback-success)", "var(--feedback-success-bg)"],
  warning: ["var(--feedback-warning)", "var(--feedback-warning-bg)"],
  danger: ["var(--feedback-danger)", "var(--feedback-danger-bg)"],
  brand: ["var(--brand-secondary)", "rgba(6,182,212,.12)"]
};
function Badge({
  children,
  tone = "neutral",
  icon,
  mono = false,
  outline = false,
  size = "md",
  style
}) {
  const [fg, bg] = TONES[tone] || TONES.neutral;
  const sm = size === "sm";
  return /*#__PURE__*/React.createElement("span", {
    style: {
      display: "inline-flex",
      alignItems: "center",
      gap: 5,
      padding: sm ? "1px 6px" : "3px 8px",
      background: outline ? "transparent" : bg,
      color: fg,
      border: `1px solid ${outline ? "var(--border-default)" : "transparent"}`,
      borderRadius: "var(--radius-xs)",
      fontFamily: mono ? "var(--font-numeric)" : "var(--font-body)",
      fontSize: sm ? "var(--text-2xs)" : "var(--text-xs)",
      fontWeight: "var(--weight-semibold)",
      letterSpacing: mono ? "0.04em" : "var(--tracking-tight)",
      lineHeight: 1.4,
      whiteSpace: "nowrap",
      ...style
    }
  }, icon && /*#__PURE__*/React.createElement(__ds_scope.Icon, {
    name: icon,
    size: sm ? 10 : 12
  }), children);
}
Object.assign(__ds_scope, { Badge });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/data/Badge.jsx", error: String((e && e.message) || e) }); }

// components/data/Card.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
const PADS = {
  dense: "10px 12px",
  default: "14px 16px",
  comfy: "18px 20px",
  none: 0
};
function Card({
  children,
  title,
  subtitle,
  actions,
  accent,
  padding = "default",
  interactive = false,
  elevated = false,
  style,
  onClick,
  ...rest
}) {
  const [hover, setHover] = React.useState(false);
  return /*#__PURE__*/React.createElement("div", _extends({
    onClick: onClick,
    onMouseEnter: () => setHover(true),
    onMouseLeave: () => setHover(false)
  }, rest, {
    style: {
      position: "relative",
      background: "var(--surface-card)",
      border: `1px solid ${interactive && hover ? "var(--border-strong)" : "var(--border-subtle)"}`,
      borderRadius: "var(--radius-lg)",
      boxShadow: elevated ? "var(--shadow-lg)" : "var(--shadow-sm)",
      overflow: "hidden",
      cursor: interactive ? "pointer" : undefined,
      transition: "var(--transition-surface)",
      ...style
    }
  }), accent && /*#__PURE__*/React.createElement("span", {
    style: {
      position: "absolute",
      insetInlineStart: 0,
      top: 0,
      bottom: 0,
      width: 2,
      background: accent
    }
  }), (title || actions) && /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      alignItems: "flex-start",
      justifyContent: "space-between",
      gap: 12,
      padding: "12px 16px",
      borderBottom: "1px solid var(--border-subtle)",
      background: "var(--gradient-sheen)"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      flexDirection: "column",
      gap: 2,
      minWidth: 0
    }
  }, title && /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: "var(--text-base)",
      fontWeight: "var(--weight-semibold)",
      color: "var(--text-primary)",
      letterSpacing: "var(--tracking-tight)"
    }
  }, title), subtitle && /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: "var(--text-xs)",
      color: "var(--text-faint)"
    }
  }, subtitle)), actions && /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      gap: 6,
      flexShrink: 0
    }
  }, actions)), /*#__PURE__*/React.createElement("div", {
    style: {
      padding: PADS[padding]
    }
  }, children));
}
Object.assign(__ds_scope, { Card });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/data/Card.jsx", error: String((e && e.message) || e) }); }

// components/data/DataTable.jsx
try { (() => {
function DataTable({
  columns = [],
  rows = [],
  dense = true,
  onRowClick,
  emptyMessage = "Nothing here yet",
  style
}) {
  const [hoverIdx, setHoverIdx] = React.useState(-1);
  const pad = dense ? "8px 12px" : "12px 14px";
  return /*#__PURE__*/React.createElement("div", {
    style: {
      width: "100%",
      overflowX: "auto",
      ...style
    }
  }, /*#__PURE__*/React.createElement("table", {
    style: {
      width: "100%",
      borderCollapse: "collapse",
      fontSize: dense ? "var(--text-sm)" : "var(--text-base)"
    }
  }, /*#__PURE__*/React.createElement("thead", null, /*#__PURE__*/React.createElement("tr", null, columns.map(c => /*#__PURE__*/React.createElement("th", {
    key: c.key,
    style: {
      textAlign: c.align || "left",
      padding: pad,
      fontSize: "var(--text-2xs)",
      fontWeight: "var(--weight-semibold)",
      letterSpacing: "var(--tracking-eyebrow)",
      textTransform: "uppercase",
      color: "var(--text-faint)",
      borderBottom: "1px solid var(--border-default)",
      whiteSpace: "nowrap",
      width: c.width
    }
  }, c.header)))), /*#__PURE__*/React.createElement("tbody", null, rows.length === 0 ? /*#__PURE__*/React.createElement("tr", null, /*#__PURE__*/React.createElement("td", {
    colSpan: columns.length,
    style: {
      padding: "28px 12px",
      textAlign: "center",
      color: "var(--text-faint)"
    }
  }, emptyMessage)) : rows.map((r, i) => /*#__PURE__*/React.createElement("tr", {
    key: r.id || i,
    onClick: () => onRowClick && onRowClick(r),
    onMouseEnter: () => setHoverIdx(i),
    onMouseLeave: () => setHoverIdx(-1),
    style: {
      background: hoverIdx === i ? "var(--surface-raised)" : "transparent",
      cursor: onRowClick ? "pointer" : undefined,
      transition: "background-color var(--duration-fast) var(--ease-standard)"
    }
  }, columns.map(c => /*#__PURE__*/React.createElement("td", {
    key: c.key,
    className: c.numeric ? "tabular" : undefined,
    style: {
      padding: pad,
      textAlign: c.align || "left",
      borderBottom: "1px solid var(--border-subtle)",
      color: c.muted ? "var(--text-faint)" : "var(--text-body)",
      fontFamily: c.mono ? "var(--font-numeric)" : undefined,
      whiteSpace: c.wrap ? "normal" : "nowrap"
    }
  }, c.render ? c.render(r) : r[c.key])))))));
}
Object.assign(__ds_scope, { DataTable });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/data/DataTable.jsx", error: String((e && e.message) || e) }); }

// components/data/EmptyState.jsx
try { (() => {
function EmptyState({
  icon = "package",
  title,
  description,
  action,
  compact = false,
  style
}) {
  return /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center",
      gap: 10,
      padding: compact ? "28px 20px" : "56px 24px",
      textAlign: "center",
      ...style
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      display: "inline-flex",
      alignItems: "center",
      justifyContent: "center",
      width: compact ? 36 : 48,
      height: compact ? 36 : 48,
      borderRadius: "var(--radius-lg)",
      background: "var(--surface-raised)",
      border: "1px solid var(--border-subtle)"
    }
  }, /*#__PURE__*/React.createElement(__ds_scope.Icon, {
    name: icon,
    size: compact ? 16 : 20,
    color: "var(--text-faint)"
  })), title && /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: "var(--text-base)",
      fontWeight: "var(--weight-semibold)",
      color: "var(--text-primary)"
    }
  }, title), description && /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: "var(--text-xs)",
      color: "var(--text-faint)",
      maxWidth: 320,
      lineHeight: "var(--leading-normal)"
    }
  }, description), action && /*#__PURE__*/React.createElement("div", {
    style: {
      marginTop: 4
    }
  }, action));
}
Object.assign(__ds_scope, { EmptyState });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/data/EmptyState.jsx", error: String((e && e.message) || e) }); }

// components/data/StatCard.jsx
try { (() => {
function StatCard({
  label,
  value,
  unit,
  icon,
  tone = "neutral",
  delta,
  deltaDirection = "up",
  style
}) {
  const colors = {
    neutral: "var(--text-primary)",
    info: "var(--feedback-info)",
    success: "var(--feedback-success)",
    warning: "var(--feedback-warning)",
    danger: "var(--feedback-danger)",
    brand: "var(--brand-secondary)"
  };
  const fg = colors[tone] || colors.neutral;
  return /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      flexDirection: "column",
      gap: 8,
      padding: "14px 16px",
      background: "var(--surface-card)",
      border: "1px solid var(--border-subtle)",
      borderRadius: "var(--radius-lg)",
      boxShadow: "var(--shadow-inset-top)",
      ...style
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      gap: 8
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: "var(--text-2xs)",
      fontWeight: "var(--weight-semibold)",
      letterSpacing: "var(--tracking-eyebrow)",
      textTransform: "uppercase",
      color: "var(--text-faint)"
    }
  }, label), icon && /*#__PURE__*/React.createElement(__ds_scope.Icon, {
    name: icon,
    size: 14,
    color: fg
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      alignItems: "baseline",
      gap: 6
    }
  }, /*#__PURE__*/React.createElement("span", {
    className: "tabular",
    style: {
      fontSize: "var(--text-3xl)",
      fontWeight: "var(--weight-semibold)",
      letterSpacing: "var(--tracking-display)",
      color: fg,
      lineHeight: 1
    }
  }, value), unit && /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: "var(--text-xs)",
      color: "var(--text-faint)"
    }
  }, unit)), delta && /*#__PURE__*/React.createElement("span", {
    style: {
      display: "inline-flex",
      alignItems: "center",
      gap: 4,
      fontSize: "var(--text-2xs)",
      color: deltaDirection === "up" ? "var(--feedback-success)" : "var(--feedback-danger)"
    }
  }, /*#__PURE__*/React.createElement(__ds_scope.Icon, {
    name: deltaDirection === "up" ? "trending-up" : "trending-down",
    size: 11
  }), delta));
}
Object.assign(__ds_scope, { StatCard });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/data/StatCard.jsx", error: String((e && e.message) || e) }); }

// components/data/StatusBadge.jsx
try { (() => {
/* HUE ENCODES ORDER STATE ONLY. Customer type and fulfilment method are
   encoded by chip weight and icon — see tokens/colors.css. */

const ORDER = {
  on_hold: ["On Hold", "var(--status-on-hold)", "var(--status-on-hold-bg)", "pause"],
  back_order: ["Backorder", "var(--status-back-order)", "var(--status-back-order-bg)", "rotate-ccw"],
  requested: ["Requested", "var(--status-requested)", "var(--status-requested-bg)", "inbox"],
  preparing: ["Preparing", "var(--status-preparing)", "var(--status-preparing-bg)", "package"],
  loading: ["Loading", "var(--status-loading)", "var(--status-loading-bg)", "clock"],
  en_route: ["En Route", "var(--status-enroute)", "var(--status-enroute-bg)", "truck"],
  delivered: ["Delivered", "var(--status-delivered)", "var(--status-delivered-bg)", "circle-check"],
  cancelled: ["Cancelled", "var(--status-cancelled)", "var(--status-cancelled-bg)", "circle-x"],
  ready_for_pickup: ["Ready", "var(--status-ready-pickup)", "var(--status-ready-pickup-bg)", "bell-ring"],
  pickup_scheduled: ["Pickup Set", "var(--status-pickup-scheduled)", "var(--status-pickup-scheduled-bg)", "calendar-clock"],
  pickup_in_progress: ["Collecting", "var(--status-pickup-progress)", "var(--status-pickup-progress-bg)", "shopping-bag"],
  pickup_complete: ["Collected", "var(--status-pickup-complete)", "var(--status-pickup-complete-bg)", "circle-check"]
};
const PAYMENT = {
  paid: ["Paid", "var(--pay-paid)", "var(--pay-paid-bg)", "circle-check"],
  pending: ["Pending", "var(--pay-pending)", "var(--pay-pending-bg)", "hourglass"],
  failed: ["Failed", "var(--pay-failed)", "var(--pay-failed-bg)", "triangle-alert"],
  invoiced: ["Invoiced", "var(--pay-invoiced)", "var(--pay-invoiced-bg)", "file-text"]
};
/* weight, not hue: filled | outline | plain */
const CUSTOMER = {
  account: ["Account", "filled", "building-2"],
  trade: ["Trade", "outline", "wrench"],
  residential: ["Residential", "plain", "house"]
};
const METHOD = {
  delivery: ["Delivery", "truck"],
  pickup: ["Pickup", "shopping-bag"]
};
function StatusBadge({
  kind = "order",
  value,
  label,
  showIcon = true,
  iconOnly = false,
  size = "md",
  style
}) {
  const sm = size === "sm";
  const base = {
    display: "inline-flex",
    alignItems: "center",
    gap: 5,
    padding: sm ? "2px 6px" : "3px 9px",
    borderRadius: "var(--radius-xs)",
    fontSize: sm ? "var(--text-2xs)" : "var(--text-xs)",
    fontWeight: "var(--weight-semibold)",
    letterSpacing: "var(--tracking-wide)",
    textTransform: "uppercase",
    lineHeight: 1.5,
    whiteSpace: "nowrap"
  };
  if (kind === "customer") {
    const [text, weight, icon] = CUSTOMER[value] || ["Unknown", "plain", "circle-question-mark"];
    const fg = weight === "filled" ? "var(--dim-filled-fg)" : weight === "outline" ? "var(--dim-outline-fg)" : "var(--dim-plain-fg)";
    if (iconOnly) {
      return /*#__PURE__*/React.createElement(__ds_scope.Icon, {
        name: icon,
        size: sm ? 12 : 14,
        color: fg,
        title: label || text,
        style: style
      });
    }
    return /*#__PURE__*/React.createElement("span", {
      style: {
        ...base,
        color: fg,
        background: weight === "filled" ? "var(--dim-filled-bg)" : "transparent",
        border: `1px solid ${weight === "outline" ? "var(--border-default)" : "transparent"}`,
        padding: weight === "plain" ? 0 : base.padding,
        ...style
      }
    }, showIcon && /*#__PURE__*/React.createElement(__ds_scope.Icon, {
      name: icon,
      size: sm ? 10 : 12
    }), label || text);
  }
  if (kind === "method") {
    const [text, icon] = METHOD[value] || ["Unknown", "circle-question-mark"];
    if (iconOnly) return /*#__PURE__*/React.createElement(__ds_scope.Icon, {
      name: icon,
      size: sm ? 12 : 14,
      color: "var(--method-fg)",
      title: label || text,
      style: style
    });
    return /*#__PURE__*/React.createElement("span", {
      style: {
        ...base,
        color: "var(--method-fg)",
        background: "var(--method-bg)",
        border: "1px solid var(--border-subtle)",
        ...style
      }
    }, showIcon && /*#__PURE__*/React.createElement(__ds_scope.Icon, {
      name: icon,
      size: sm ? 10 : 12
    }), label || text);
  }
  const map = kind === "payment" ? PAYMENT : ORDER;
  const [text, fg, bg, icon] = map[value] || ["Unknown", "var(--text-faint)", "rgba(168,179,207,.08)", "circle-question-mark"];
  if (iconOnly) return /*#__PURE__*/React.createElement(__ds_scope.Icon, {
    name: icon,
    size: sm ? 12 : 14,
    color: fg,
    title: label || text,
    style: style
  });
  return /*#__PURE__*/React.createElement("span", {
    style: {
      ...base,
      color: fg,
      background: bg,
      border: `1px solid ${fg}33`,
      ...style
    }
  }, showIcon && /*#__PURE__*/React.createElement(__ds_scope.Icon, {
    name: icon,
    size: sm ? 10 : 12
  }), label || text);
}
Object.assign(__ds_scope, { StatusBadge });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/data/StatusBadge.jsx", error: String((e && e.message) || e) }); }

// components/domain/AddressBlock.jsx
try { (() => {
function AddressBlock({
  label = "Delivery address",
  street,
  line,
  suburb,
  state = "VIC",
  postcode,
  suburbId,
  deliveryFee,
  deliveryFeeSource = "suburb",
  sameAsBilling = false,
  source = "customer",
  verified = false,
  onChange,
  onOpenMap,
  style
}) {
  const streetLine = street || line;
  const sourceLabel = {
    customer: "From customer record",
    manual: "Entered for this order",
    split: "Split-specific"
  }[source] || source;
  const unresolved = !suburbId;
  return /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      gap: 10,
      padding: "12px 14px",
      background: "var(--surface-raised)",
      border: `1px solid ${unresolved ? "rgba(248,113,113,.4)" : "var(--border-subtle)"}`,
      borderRadius: "var(--radius-md)",
      ...style
    }
  }, /*#__PURE__*/React.createElement(__ds_scope.Icon, {
    name: "map-pin",
    size: 15,
    color: unresolved ? "var(--attention)" : "var(--brand-primary)",
    style: {
      marginTop: 2,
      flexShrink: 0
    }
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1,
      minWidth: 0
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      alignItems: "center",
      gap: 6,
      marginBottom: 4,
      flexWrap: "wrap"
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: "var(--text-2xs)",
      letterSpacing: "var(--tracking-eyebrow)",
      textTransform: "uppercase",
      color: "var(--text-faint)"
    }
  }, label), verified && !unresolved && /*#__PURE__*/React.createElement(__ds_scope.Icon, {
    name: "badge-check",
    size: 12,
    color: "var(--feedback-success)"
  }), sameAsBilling && /*#__PURE__*/React.createElement("span", {
    style: {
      display: "inline-flex",
      alignItems: "center",
      gap: 4,
      fontSize: "var(--text-2xs)",
      color: "var(--text-faint)",
      border: "1px solid var(--border-default)",
      borderRadius: 3,
      padding: "0 5px"
    }
  }, /*#__PURE__*/React.createElement(__ds_scope.Icon, {
    name: "link",
    size: 9
  }), "Same as billing")), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: "var(--text-base)",
      color: "var(--text-primary)",
      lineHeight: 1.45
    }
  }, streetLine), (suburb || postcode) && /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: "var(--text-base)",
      color: "var(--text-primary)",
      lineHeight: 1.45
    }
  }, [suburb, state, postcode].filter(Boolean).join(" ")), unresolved && /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      alignItems: "center",
      gap: 5,
      marginTop: 5,
      fontSize: "var(--text-2xs)",
      color: "var(--attention)"
    }
  }, /*#__PURE__*/React.createElement(__ds_scope.Icon, {
    name: "triangle-alert",
    size: 11
  }), "No suburb matched \u2014 delivery fee can't be calculated"), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      alignItems: "center",
      gap: 10,
      marginTop: 6,
      flexWrap: "wrap"
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: "var(--text-2xs)",
      color: "var(--text-faint)"
    }
  }, sourceLabel), deliveryFee && !unresolved && /*#__PURE__*/React.createElement("span", {
    className: "tabular",
    style: {
      fontSize: "var(--text-2xs)",
      color: "var(--feedback-success)",
      fontWeight: "var(--weight-semibold)"
    }
  }, "Delivery ", deliveryFee, " ", /*#__PURE__*/React.createElement("span", {
    style: {
      color: "var(--text-faint)",
      fontWeight: "var(--weight-regular)"
    }
  }, "(", deliveryFeeSource === "manual" ? "set manually" : "from " + (suburb || "suburb") + " rate", ")")), onOpenMap && /*#__PURE__*/React.createElement("button", {
    onClick: onOpenMap,
    style: linkBtn
  }, /*#__PURE__*/React.createElement(__ds_scope.Icon, {
    name: "external-link",
    size: 10
  }), "Open in Google Maps"))), onChange && /*#__PURE__*/React.createElement("button", {
    onClick: onChange,
    style: {
      alignSelf: "flex-start",
      background: "transparent",
      border: "1px solid var(--border-default)",
      color: "var(--text-muted)",
      borderRadius: "var(--radius-xs)",
      padding: "3px 9px",
      fontSize: "var(--text-2xs)",
      cursor: "pointer",
      fontFamily: "var(--font-body)",
      flexShrink: 0
    }
  }, "Change"));
}
const linkBtn = {
  display: "inline-flex",
  alignItems: "center",
  gap: 4,
  background: "transparent",
  border: "none",
  color: "var(--text-accent)",
  fontSize: "var(--text-2xs)",
  cursor: "pointer",
  padding: 0,
  fontFamily: "var(--font-body)"
};
Object.assign(__ds_scope, { AddressBlock });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/domain/AddressBlock.jsx", error: String((e && e.message) || e) }); }

// components/domain/DeliveryTaskCard.jsx
try { (() => {
function DeliveryTaskCard({
  orderNumber,
  customerName,
  phone,
  address,
  window: timeWindow,
  status = "preparing",
  truck,
  items = [],
  notes,
  purchaseOrder,
  actions,
  onNavigate,
  style
}) {
  return /*#__PURE__*/React.createElement("div", {
    style: {
      background: "var(--surface-card)",
      border: "1px solid var(--border-default)",
      borderRadius: "var(--radius-lg)",
      overflow: "hidden",
      boxShadow: "var(--shadow-md)",
      ...style
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      gap: 10,
      padding: "14px 16px",
      borderBottom: "1px solid var(--border-subtle)"
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      display: "flex",
      flexDirection: "column",
      gap: 3
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      fontFamily: "var(--font-numeric)",
      fontSize: "var(--text-md)",
      fontWeight: "var(--weight-semibold)",
      color: "var(--text-primary)",
      letterSpacing: "0.02em"
    }
  }, orderNumber), purchaseOrder && /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: "var(--text-2xs)",
      color: "var(--text-faint)"
    }
  }, "PO ", purchaseOrder)), /*#__PURE__*/React.createElement(__ds_scope.StatusBadge, {
    kind: "order",
    value: status
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      padding: "14px 16px",
      display: "flex",
      flexDirection: "column",
      gap: 12
    }
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: "var(--text-lg)",
      fontWeight: "var(--weight-semibold)",
      color: "var(--text-primary)",
      letterSpacing: "var(--tracking-tight)"
    }
  }, customerName), phone && /*#__PURE__*/React.createElement("a", {
    href: "tel:" + phone,
    style: {
      display: "inline-flex",
      alignItems: "center",
      gap: 6,
      marginTop: 6,
      fontSize: "var(--text-md)",
      color: "var(--blue-300)"
    }
  }, /*#__PURE__*/React.createElement(__ds_scope.Icon, {
    name: "phone",
    size: 15
  }), phone)), address && /*#__PURE__*/React.createElement("button", {
    onClick: onNavigate,
    style: {
      display: "flex",
      alignItems: "flex-start",
      gap: 10,
      width: "100%",
      textAlign: "left",
      minHeight: "var(--touch-target-min)",
      padding: "12px 14px",
      background: "var(--surface-raised)",
      border: "1px solid var(--border-default)",
      borderRadius: "var(--radius-md)",
      cursor: "pointer",
      fontFamily: "var(--font-body)"
    }
  }, /*#__PURE__*/React.createElement(__ds_scope.Icon, {
    name: "map-pin",
    size: 17,
    color: "var(--brand-primary)",
    style: {
      marginTop: 1
    }
  }), /*#__PURE__*/React.createElement("span", {
    style: {
      flex: 1,
      fontSize: "var(--text-md)",
      color: "var(--text-primary)",
      lineHeight: 1.4
    }
  }, address), /*#__PURE__*/React.createElement(__ds_scope.Icon, {
    name: "navigation",
    size: 16,
    color: "var(--brand-primary)",
    style: {
      marginTop: 1
    }
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      flexWrap: "wrap",
      gap: 8
    }
  }, timeWindow && /*#__PURE__*/React.createElement("span", {
    style: {
      display: "inline-flex",
      alignItems: "center",
      gap: 6,
      padding: "6px 10px",
      background: "var(--surface-raised)",
      borderRadius: "var(--radius-sm)",
      fontSize: "var(--text-base)",
      color: "var(--text-body)"
    }
  }, /*#__PURE__*/React.createElement(__ds_scope.Icon, {
    name: "clock",
    size: 14,
    color: "var(--text-faint)"
  }), timeWindow), truck && /*#__PURE__*/React.createElement("span", {
    style: {
      display: "inline-flex",
      alignItems: "center",
      gap: 6,
      padding: "6px 10px",
      background: "rgba(59,130,246,.12)",
      borderRadius: "var(--radius-sm)",
      fontSize: "var(--text-base)",
      fontWeight: "var(--weight-semibold)",
      color: "var(--blue-300)"
    }
  }, /*#__PURE__*/React.createElement(__ds_scope.Icon, {
    name: "truck",
    size: 14
  }), truck)), items.length > 0 && /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      flexDirection: "column",
      gap: 6
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: "var(--text-2xs)",
      letterSpacing: "var(--tracking-eyebrow)",
      textTransform: "uppercase",
      color: "var(--text-faint)"
    }
  }, "Load"), items.map((it, i) => /*#__PURE__*/React.createElement("div", {
    key: i,
    style: {
      display: "flex",
      justifyContent: "space-between",
      gap: 10,
      padding: "8px 0",
      borderBottom: i < items.length - 1 ? "1px solid var(--border-subtle)" : "none"
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: "var(--text-md)",
      color: "var(--text-body)"
    }
  }, it.name), /*#__PURE__*/React.createElement("span", {
    className: "tabular",
    style: {
      fontSize: "var(--text-md)",
      fontWeight: "var(--weight-semibold)",
      color: "var(--text-primary)",
      whiteSpace: "nowrap"
    }
  }, it.qty)))), notes && /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      gap: 9,
      padding: "10px 12px",
      background: "var(--feedback-warning-bg)",
      border: "1px solid rgba(245,158,11,.3)",
      borderRadius: "var(--radius-sm)"
    }
  }, /*#__PURE__*/React.createElement(__ds_scope.Icon, {
    name: "triangle-alert",
    size: 15,
    color: "var(--brand-attention)",
    style: {
      marginTop: 1,
      flexShrink: 0
    }
  }), /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: "var(--text-base)",
      color: "var(--amber-300)",
      lineHeight: 1.45
    }
  }, notes)), actions && /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      flexDirection: "column",
      gap: 8,
      marginTop: 2
    }
  }, actions)));
}
Object.assign(__ds_scope, { DeliveryTaskCard });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/domain/DeliveryTaskCard.jsx", error: String((e && e.message) || e) }); }

// components/domain/DispatchColumn.jsx
try { (() => {
function DispatchColumn({
  title,
  accent = "var(--border-strong)",
  count = 0,
  value,
  children,
  style
}) {
  return /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      flexDirection: "column",
      width: "var(--dispatch-column-width)",
      flexShrink: 0,
      minHeight: 0,
      ...style
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      alignItems: "center",
      gap: 8,
      padding: "9px 12px",
      background: "var(--surface-card)",
      border: "1px solid var(--border-subtle)",
      borderTop: `2px solid ${accent}`,
      borderRadius: "var(--radius-sm) var(--radius-sm) 0 0"
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: "var(--text-xs)",
      fontWeight: "var(--weight-semibold)",
      letterSpacing: "var(--tracking-eyebrow)",
      textTransform: "uppercase",
      color: accent
    }
  }, title), /*#__PURE__*/React.createElement("span", {
    className: "tabular",
    style: {
      fontSize: "var(--text-2xs)",
      fontWeight: "var(--weight-semibold)",
      color: "var(--text-muted)",
      background: "var(--surface-active)",
      borderRadius: "var(--radius-pill)",
      padding: "1px 7px"
    }
  }, count), /*#__PURE__*/React.createElement("span", {
    style: {
      flex: 1
    }
  }), value && /*#__PURE__*/React.createElement("span", {
    className: "tabular",
    style: {
      fontSize: "var(--text-2xs)",
      color: "var(--text-faint)"
    }
  }, value)), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      flexDirection: "column",
      gap: 8,
      padding: 8,
      flex: 1,
      minHeight: 0,
      overflowY: "auto",
      background: "var(--bg-sunken)",
      border: "1px solid var(--border-subtle)",
      borderTop: "none",
      borderRadius: "0 0 var(--radius-sm) var(--radius-sm)"
    }
  }, children));
}
Object.assign(__ds_scope, { DispatchColumn });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/domain/DispatchColumn.jsx", error: String((e && e.message) || e) }); }

// components/domain/NotesPanel.jsx
try { (() => {
function NotesPanel({
  orderNotes,
  deliveryNotes,
  compact = false,
  onEdit,
  style
}) {
  const rows = [orderNotes && {
    label: "Order notes",
    body: orderNotes,
    icon: "file-text",
    color: "var(--text-muted)"
  }, deliveryNotes && {
    label: "Delivery notes",
    body: deliveryNotes,
    icon: "map-pin",
    color: "var(--amber-300)"
  }].filter(Boolean);
  if (rows.length === 0) return null;
  return /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      flexDirection: "column",
      gap: compact ? 6 : 10,
      padding: compact ? "8px 10px" : "12px 14px",
      background: "var(--surface-raised)",
      border: "1px solid var(--border-subtle)",
      borderRadius: "var(--radius-sm)",
      ...style
    }
  }, rows.map(r => /*#__PURE__*/React.createElement("div", {
    key: r.label,
    style: {
      display: "flex",
      gap: 8
    }
  }, /*#__PURE__*/React.createElement(__ds_scope.Icon, {
    name: r.icon,
    size: 12,
    color: r.color,
    style: {
      marginTop: 3,
      flexShrink: 0
    }
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      minWidth: 0,
      flex: 1
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: "var(--text-2xs)",
      letterSpacing: "var(--tracking-eyebrow)",
      textTransform: "uppercase",
      color: "var(--text-faint)",
      marginBottom: 2
    }
  }, r.label), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: compact ? "var(--text-xs)" : "var(--text-base)",
      color: r.color,
      lineHeight: 1.45
    }
  }, r.body)), onEdit && /*#__PURE__*/React.createElement("button", {
    onClick: onEdit,
    style: {
      background: "transparent",
      border: "none",
      color: "var(--text-faint)",
      cursor: "pointer",
      padding: 2,
      display: "inline-flex",
      alignSelf: "flex-start"
    }
  }, /*#__PURE__*/React.createElement(__ds_scope.Icon, {
    name: "pencil",
    size: 12
  })))));
}
Object.assign(__ds_scope, { NotesPanel });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/domain/NotesPanel.jsx", error: String((e && e.message) || e) }); }

// components/domain/OrderCard.jsx
try { (() => {
const STATUS_ACCENT = {
  on_hold: "var(--status-on-hold)",
  back_order: "var(--status-back-order)",
  requested: "var(--status-requested)",
  preparing: "var(--status-preparing)",
  loading: "var(--status-loading)",
  en_route: "var(--status-enroute)",
  delivered: "var(--status-delivered)",
  cancelled: "var(--status-cancelled)",
  ready_for_pickup: "var(--status-ready-pickup)",
  pickup_scheduled: "var(--status-pickup-scheduled)",
  pickup_in_progress: "var(--status-pickup-progress)",
  pickup_complete: "var(--status-pickup-complete)"
};
function OrderCard({
  orderNumber,
  isMaster = false,
  isSplit = false,
  customerName,
  contactName,
  customerType = "residential",
  status = "requested",
  paymentStatus,
  method = "delivery",
  address,
  window: timeWindow,
  placedAt,
  total,
  itemCount,
  truck,
  driver,
  notes,
  stopCredit = false,
  processed = false,
  assignable = false,
  onAssign,
  onClick,
  style
}) {
  const [hover, setHover] = React.useState(false);
  const display = isMaster ? "MO — " + orderNumber : orderNumber;
  const meta = {
    display: "flex",
    gap: 5,
    alignItems: "center",
    fontSize: "var(--text-xs)",
    color: "var(--text-faint)",
    lineHeight: 1.4
  };
  return /*#__PURE__*/React.createElement("div", {
    onClick: onClick,
    onMouseEnter: () => setHover(true),
    onMouseLeave: () => setHover(false),
    style: {
      position: "relative",
      padding: "9px 11px 9px 13px",
      background: hover ? "var(--surface-raised)" : "var(--surface-card)",
      border: `1px solid ${hover ? "var(--border-strong)" : "var(--border-subtle)"}`,
      borderRadius: "var(--radius-md)",
      cursor: onClick ? "pointer" : undefined,
      transition: "var(--transition-surface)",
      ...style
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      position: "absolute",
      left: 0,
      top: 0,
      bottom: 0,
      width: 2,
      borderRadius: "2px 0 0 2px",
      background: STATUS_ACCENT[status] || "var(--border-strong)"
    }
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      alignItems: "center",
      gap: 5,
      marginBottom: 5
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      fontFamily: "var(--font-numeric)",
      fontSize: "var(--text-xs)",
      fontWeight: "var(--weight-semibold)",
      letterSpacing: "0.02em",
      color: "var(--text-primary)"
    }
  }, display), isMaster && /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 9,
      fontWeight: "var(--weight-bold)",
      letterSpacing: "var(--tracking-eyebrow)",
      color: "var(--brand-secondary)",
      border: "1px solid rgba(6,182,212,.4)",
      borderRadius: 3,
      padding: "0 4px"
    }
  }, "MASTER"), isSplit && /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 9,
      fontWeight: "var(--weight-bold)",
      letterSpacing: "var(--tracking-eyebrow)",
      color: "var(--text-faint)",
      border: "1px solid var(--border-default)",
      borderRadius: 3,
      padding: "0 4px"
    }
  }, "SPLIT"), processed && /*#__PURE__*/React.createElement(__ds_scope.Icon, {
    name: "printer-check",
    size: 12,
    color: "var(--feedback-success)",
    title: "Already processed"
  }), /*#__PURE__*/React.createElement("span", {
    style: {
      flex: 1
    }
  }), /*#__PURE__*/React.createElement(__ds_scope.StatusBadge, {
    kind: "method",
    value: method,
    size: "sm"
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      alignItems: "center",
      gap: 6,
      marginBottom: 2
    }
  }, /*#__PURE__*/React.createElement(__ds_scope.StatusBadge, {
    kind: "customer",
    value: customerType,
    size: "sm",
    iconOnly: true
  }), /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: "var(--text-xs)",
      fontWeight: "var(--weight-semibold)",
      color: "var(--text-primary)",
      overflow: "hidden",
      textOverflow: "ellipsis",
      whiteSpace: "nowrap"
    }
  }, customerName), stopCredit && /*#__PURE__*/React.createElement(__ds_scope.Icon, {
    name: "octagon-alert",
    size: 12,
    color: "var(--attention)"
  })), contactName && /*#__PURE__*/React.createElement("div", {
    style: {
      ...meta,
      marginBottom: 6
    }
  }, /*#__PURE__*/React.createElement(__ds_scope.Icon, {
    name: "user",
    size: 11
  }), contactName), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      flexDirection: "column",
      gap: 3,
      marginBottom: 7
    }
  }, timeWindow && /*#__PURE__*/React.createElement("span", {
    style: meta
  }, /*#__PURE__*/React.createElement(__ds_scope.Icon, {
    name: "clock",
    size: 11
  }), timeWindow), address && /*#__PURE__*/React.createElement("span", {
    style: {
      ...meta,
      alignItems: "flex-start"
    }
  }, /*#__PURE__*/React.createElement(__ds_scope.Icon, {
    name: "map-pin",
    size: 11,
    style: {
      marginTop: 1,
      flexShrink: 0
    }
  }), /*#__PURE__*/React.createElement("span", null, address)), (truck || driver) && /*#__PURE__*/React.createElement("span", {
    style: meta
  }, /*#__PURE__*/React.createElement(__ds_scope.Icon, {
    name: "truck",
    size: 11
  }), [truck, driver].filter(Boolean).join(" · ")), placedAt && /*#__PURE__*/React.createElement("span", {
    style: meta
  }, /*#__PURE__*/React.createElement(__ds_scope.Icon, {
    name: "clock-fading",
    size: 11
  }), "Placed ", placedAt)), notes && /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      gap: 6,
      padding: "5px 7px",
      marginBottom: 7,
      background: "var(--feedback-warning-bg)",
      borderRadius: "var(--radius-xs)",
      fontSize: "var(--text-2xs)",
      color: "var(--amber-300)",
      lineHeight: 1.4
    }
  }, /*#__PURE__*/React.createElement(__ds_scope.Icon, {
    name: "sticky-note",
    size: 11,
    style: {
      marginTop: 1,
      flexShrink: 0
    }
  }), /*#__PURE__*/React.createElement("span", null, notes)), assignable && /*#__PURE__*/React.createElement("button", {
    onClick: e => {
      e.stopPropagation();
      onAssign && onAssign();
    },
    style: {
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      gap: 6,
      width: "100%",
      height: 28,
      marginBottom: 7,
      background: "rgba(59,130,246,.12)",
      color: "var(--blue-300)",
      border: "1px solid rgba(59,130,246,.35)",
      borderRadius: "var(--radius-xs)",
      fontFamily: "var(--font-body)",
      fontSize: "var(--text-2xs)",
      fontWeight: "var(--weight-semibold)",
      letterSpacing: "var(--tracking-wide)",
      textTransform: "uppercase",
      cursor: "pointer"
    }
  }, /*#__PURE__*/React.createElement(__ds_scope.Icon, {
    name: "truck",
    size: 12
  }), truck ? "Reassign truck & driver" : "Assign truck & driver"), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      gap: 8,
      paddingTop: 7,
      borderTop: "1px solid var(--border-subtle)"
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      display: "flex",
      alignItems: "center",
      gap: 5
    }
  }, paymentStatus && /*#__PURE__*/React.createElement(__ds_scope.StatusBadge, {
    kind: "payment",
    value: paymentStatus,
    size: "sm"
  }), itemCount != null && /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: "var(--text-2xs)",
      color: "var(--text-faint)"
    }
  }, itemCount, " items")), /*#__PURE__*/React.createElement("span", {
    className: "tabular",
    style: {
      fontSize: "var(--text-xs)",
      fontWeight: "var(--weight-semibold)",
      color: "var(--text-primary)"
    }
  }, total)));
}
Object.assign(__ds_scope, { OrderCard });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/domain/OrderCard.jsx", error: String((e && e.message) || e) }); }

// components/domain/PaymentSummary.jsx
try { (() => {
function PaymentSummary({
  lines = [],
  total,
  paymentStatus,
  paymentType,
  paymentTypeSource = "customer",
  paymentMethod,
  invoiceRef,
  credit,
  statementEligible,
  style
}) {
  const row = {
    display: "flex",
    justifyContent: "space-between",
    gap: 12,
    fontSize: "var(--text-base)"
  };
  return /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      flexDirection: "column",
      gap: 8,
      padding: "14px 16px",
      background: "var(--surface-card)",
      border: "1px solid var(--border-subtle)",
      borderRadius: "var(--radius-md)",
      ...style
    }
  }, lines.map(l => /*#__PURE__*/React.createElement("div", {
    key: l.label,
    style: row
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      color: l.emphasis ? "var(--text-body)" : "var(--text-faint)"
    }
  }, l.label), /*#__PURE__*/React.createElement("span", {
    className: "tabular",
    style: {
      color: l.negative ? "var(--feedback-success)" : "var(--text-body)"
    }
  }, l.value))), credit && /*#__PURE__*/React.createElement("div", {
    style: row
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      color: "var(--feedback-success)"
    }
  }, "Account credit applied"), /*#__PURE__*/React.createElement("span", {
    className: "tabular",
    style: {
      color: "var(--feedback-success)"
    }
  }, credit)), /*#__PURE__*/React.createElement("div", {
    style: {
      height: 1,
      background: "var(--border-default)",
      margin: "2px 0"
    }
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      justifyContent: "space-between",
      alignItems: "baseline",
      gap: 12
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: "var(--text-base)",
      fontWeight: "var(--weight-semibold)",
      color: "var(--text-primary)"
    }
  }, "Total incl. GST"), /*#__PURE__*/React.createElement("span", {
    className: "tabular",
    style: {
      fontSize: "var(--text-xl)",
      fontWeight: "var(--weight-semibold)",
      color: "var(--text-primary)",
      letterSpacing: "var(--tracking-tight)"
    }
  }, total)), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      flexDirection: "column",
      gap: 6,
      marginTop: 6,
      paddingTop: 10,
      borderTop: "1px solid var(--border-subtle)"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      justifyContent: "space-between",
      gap: 12,
      alignItems: "center"
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: "var(--text-2xs)",
      letterSpacing: "var(--tracking-eyebrow)",
      textTransform: "uppercase",
      color: "var(--text-faint)"
    }
  }, "Billing relationship"), /*#__PURE__*/React.createElement("span", {
    style: {
      display: "inline-flex",
      alignItems: "center",
      gap: 6
    }
  }, paymentType ? /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: "var(--text-xs)",
      fontWeight: "var(--weight-semibold)",
      color: "var(--text-primary)"
    }
  }, paymentType), /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: "var(--text-2xs)",
      color: paymentTypeSource === "customer" ? "var(--text-faint)" : "var(--brand-attention)"
    }
  }, paymentTypeSource === "customer" ? "from customer" : "overridden")) : /*#__PURE__*/React.createElement("span", {
    style: {
      display: "inline-flex",
      alignItems: "center",
      gap: 5,
      fontSize: "var(--text-xs)",
      fontWeight: "var(--weight-semibold)",
      color: "var(--attention)"
    }
  }, /*#__PURE__*/React.createElement(__ds_scope.Icon, {
    name: "triangle-alert",
    size: 12
  }), "Not set"))), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      justifyContent: "space-between",
      gap: 12,
      alignItems: "center"
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: "var(--text-2xs)",
      letterSpacing: "var(--tracking-eyebrow)",
      textTransform: "uppercase",
      color: "var(--text-faint)"
    }
  }, "Settled by"), /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: "var(--text-xs)",
      fontWeight: "var(--weight-semibold)",
      color: paymentMethod ? "var(--text-primary)" : "var(--text-faint)"
    }
  }, paymentMethod || "Not set"))), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      alignItems: "center",
      gap: 8,
      flexWrap: "wrap",
      marginTop: 4
    }
  }, paymentStatus && /*#__PURE__*/React.createElement(__ds_scope.StatusBadge, {
    kind: "payment",
    value: paymentStatus,
    size: "sm"
  }), statementEligible != null && /*#__PURE__*/React.createElement("span", {
    style: {
      display: "inline-flex",
      alignItems: "center",
      gap: 5,
      fontSize: "var(--text-2xs)",
      color: statementEligible ? "var(--feedback-success)" : "var(--text-faint)"
    }
  }, /*#__PURE__*/React.createElement(__ds_scope.Icon, {
    name: statementEligible ? "file-check" : "file-x",
    size: 11
  }), statementEligible ? "On monthly statement" : "Not on statement"), invoiceRef && /*#__PURE__*/React.createElement("span", {
    style: {
      fontFamily: "var(--font-numeric)",
      fontSize: "var(--text-2xs)",
      color: "var(--brand-secondary)"
    }
  }, "MYOB ", invoiceRef)));
}
Object.assign(__ds_scope, { PaymentSummary });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/domain/PaymentSummary.jsx", error: String((e && e.message) || e) }); }

// components/domain/PinCodeInput.jsx
try { (() => {
function PinCodeInput({
  length = 6,
  value = "",
  onChange,
  error = false,
  disabled = false,
  style
}) {
  const refs = React.useRef([]);
  const set = (i, ch) => {
    if (!/^\d*$/.test(ch)) return;
    const next = value.padEnd(length, " ").split("");
    next[i] = ch.slice(-1) || " ";
    const joined = next.join("").replace(/ /g, "");
    onChange && onChange(joined);
    if (ch && i < length - 1) refs.current[i + 1] && refs.current[i + 1].focus();
  };
  const key = (i, e) => {
    if (e.key === "Backspace" && !value[i] && i > 0) refs.current[i - 1] && refs.current[i - 1].focus();
  };
  const digits = value.padEnd(length, " ").split("").slice(0, length);
  return /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      gap: 8,
      justifyContent: "center",
      ...style
    }
  }, digits.map((d, i) => /*#__PURE__*/React.createElement("input", {
    key: i,
    ref: el => refs.current[i] = el,
    value: d.trim(),
    onChange: e => set(i, e.target.value),
    onKeyDown: e => key(i, e),
    inputMode: "numeric",
    maxLength: 1,
    disabled: disabled,
    style: {
      width: 46,
      height: 56,
      textAlign: "center",
      fontFamily: "var(--font-numeric)",
      fontSize: "var(--text-2xl)",
      fontWeight: "var(--weight-semibold)",
      color: "var(--text-primary)",
      background: "var(--surface-input)",
      border: `1px solid ${error ? "var(--feedback-danger)" : d.trim() ? "var(--brand-primary)" : "var(--border-default)"}`,
      borderRadius: "var(--radius-md)",
      outline: "none",
      transition: "var(--transition-control)",
      opacity: disabled ? 0.5 : 1
    }
  })));
}
Object.assign(__ds_scope, { PinCodeInput });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/domain/PinCodeInput.jsx", error: String((e && e.message) || e) }); }

// components/domain/ProductTile.jsx
try { (() => {
function ProductTile({
  name,
  sku,
  price,
  unit = "each",
  imageSrc,
  quantity = 0,
  outOfStock = false,
  onAdd,
  onRemove,
  style
}) {
  const [hover, setHover] = React.useState(false);
  return /*#__PURE__*/React.createElement("div", {
    onMouseEnter: () => setHover(true),
    onMouseLeave: () => setHover(false),
    style: {
      display: "flex",
      flexDirection: "column",
      overflow: "hidden",
      background: "var(--surface-card)",
      border: `1px solid ${quantity > 0 ? "var(--border-accent)" : hover ? "var(--border-strong)" : "var(--border-subtle)"}`,
      borderRadius: "var(--radius-lg)",
      opacity: outOfStock ? 0.55 : 1,
      boxShadow: quantity > 0 ? "var(--glow-brand)" : "var(--shadow-sm)",
      transition: "var(--transition-surface)",
      transform: hover && !outOfStock ? "translateY(-2px)" : "none",
      ...style
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      position: "relative",
      aspectRatio: "4 / 3",
      background: "var(--surface-raised)",
      display: "flex",
      alignItems: "center",
      justifyContent: "center"
    }
  }, imageSrc ? /*#__PURE__*/React.createElement("img", {
    src: imageSrc,
    alt: "",
    style: {
      width: "100%",
      height: "100%",
      objectFit: "cover"
    }
  }) : /*#__PURE__*/React.createElement(__ds_scope.Icon, {
    name: "package",
    size: 28,
    color: "var(--ink-500)"
  }), quantity > 0 && /*#__PURE__*/React.createElement("span", {
    className: "tabular",
    style: {
      position: "absolute",
      top: 8,
      right: 8,
      padding: "2px 8px",
      borderRadius: "var(--radius-pill)",
      background: "var(--brand-primary)",
      color: "#fff",
      fontSize: "var(--text-2xs)",
      fontWeight: "var(--weight-bold)"
    }
  }, quantity, " in cart"), outOfStock && /*#__PURE__*/React.createElement("span", {
    style: {
      position: "absolute",
      inset: 0,
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      background: "rgba(9,11,21,.6)",
      fontSize: "var(--text-xs)",
      fontWeight: "var(--weight-semibold)",
      letterSpacing: "var(--tracking-wide)",
      textTransform: "uppercase",
      color: "var(--feedback-danger)"
    }
  }, "Out of stock")), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      flexDirection: "column",
      gap: 8,
      padding: 14,
      flex: 1
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      justifyContent: "space-between",
      gap: 8
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: "var(--text-base)",
      fontWeight: "var(--weight-semibold)",
      color: "var(--text-primary)",
      lineHeight: 1.3
    }
  }, name), /*#__PURE__*/React.createElement("span", {
    className: "tabular",
    style: {
      fontSize: "var(--text-md)",
      fontWeight: "var(--weight-semibold)",
      color: "var(--brand-secondary)",
      whiteSpace: "nowrap"
    }
  }, price)), /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: "var(--text-2xs)",
      color: "var(--text-faint)",
      fontFamily: sku ? "var(--font-numeric)" : undefined
    }
  }, sku ? "SKU " + sku : "", sku && unit ? " · " : "", unit ? "per " + unit : ""), /*#__PURE__*/React.createElement("span", {
    style: {
      flex: 1
    }
  }), quantity > 0 ? /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      gap: 10
    }
  }, /*#__PURE__*/React.createElement("button", {
    onClick: onRemove,
    style: stepBtn
  }, /*#__PURE__*/React.createElement(__ds_scope.Icon, {
    name: "minus",
    size: 14
  })), /*#__PURE__*/React.createElement("span", {
    className: "tabular",
    style: {
      minWidth: 28,
      textAlign: "center",
      fontSize: "var(--text-md)",
      fontWeight: "var(--weight-semibold)",
      color: "var(--text-primary)"
    }
  }, quantity), /*#__PURE__*/React.createElement("button", {
    onClick: onAdd,
    style: stepBtn
  }, /*#__PURE__*/React.createElement(__ds_scope.Icon, {
    name: "plus",
    size: 14
  }))) : /*#__PURE__*/React.createElement("button", {
    onClick: onAdd,
    disabled: outOfStock,
    style: {
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      gap: 7,
      width: "100%",
      height: 38,
      background: "transparent",
      color: outOfStock ? "var(--text-faint)" : "var(--text-primary)",
      border: "1px solid var(--border-default)",
      borderRadius: "var(--radius-sm)",
      fontFamily: "var(--font-body)",
      fontSize: "var(--text-base)",
      fontWeight: "var(--weight-semibold)",
      cursor: outOfStock ? "not-allowed" : "pointer",
      transition: "var(--transition-control)"
    }
  }, /*#__PURE__*/React.createElement(__ds_scope.Icon, {
    name: "plus",
    size: 14
  }), "Add to order")));
}
const stepBtn = {
  width: 34,
  height: 34,
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  background: "var(--surface-raised)",
  color: "var(--text-primary)",
  border: "1px solid var(--border-default)",
  borderRadius: "var(--radius-pill)",
  cursor: "pointer"
};
Object.assign(__ds_scope, { ProductTile });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/domain/ProductTile.jsx", error: String((e && e.message) || e) }); }

// components/domain/SplitOrderGroup.jsx
try { (() => {
function SplitOrderGroup({
  masterNumber,
  customerName,
  combinedTotal,
  splitCount,
  defaultOpen = true,
  children,
  style
}) {
  const [open, setOpen] = React.useState(defaultOpen);
  return /*#__PURE__*/React.createElement("div", {
    style: {
      background: "rgba(6,182,212,.05)",
      border: "1px solid rgba(6,182,212,.28)",
      borderRadius: "var(--radius-md)",
      overflow: "hidden",
      ...style
    }
  }, /*#__PURE__*/React.createElement("button", {
    onClick: () => setOpen(!open),
    style: {
      display: "flex",
      alignItems: "center",
      gap: 8,
      width: "100%",
      padding: "8px 10px",
      background: "transparent",
      border: "none",
      cursor: "pointer",
      textAlign: "left",
      fontFamily: "var(--font-body)"
    }
  }, /*#__PURE__*/React.createElement(__ds_scope.Icon, {
    name: open ? "chevron-down" : "chevron-right",
    size: 13,
    color: "var(--brand-secondary)"
  }), /*#__PURE__*/React.createElement("span", {
    style: {
      display: "flex",
      flexDirection: "column",
      gap: 1,
      flex: 1,
      minWidth: 0
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      fontFamily: "var(--font-numeric)",
      fontSize: "var(--text-xs)",
      fontWeight: "var(--weight-semibold)",
      color: "var(--cyan-300)"
    }
  }, "MO \u2014 ", masterNumber), /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: "var(--text-2xs)",
      color: "var(--text-faint)",
      overflow: "hidden",
      textOverflow: "ellipsis",
      whiteSpace: "nowrap"
    }
  }, customerName, " \xB7 ", splitCount, " splits")), /*#__PURE__*/React.createElement("span", {
    className: "tabular",
    style: {
      fontSize: "var(--text-xs)",
      fontWeight: "var(--weight-semibold)",
      color: "var(--text-primary)"
    }
  }, combinedTotal)), open && /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      flexDirection: "column",
      gap: 6,
      padding: "0 8px 8px"
    }
  }, children));
}
Object.assign(__ds_scope, { SplitOrderGroup });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/domain/SplitOrderGroup.jsx", error: String((e && e.message) || e) }); }

// components/feedback/Alert.jsx
try { (() => {
const TONES = {
  info: ["var(--feedback-info)", "var(--feedback-info-bg)", "info"],
  success: ["var(--feedback-success)", "var(--feedback-success-bg)", "circle-check"],
  warning: ["var(--feedback-warning)", "var(--feedback-warning-bg)", "triangle-alert"],
  danger: ["var(--feedback-danger)", "var(--feedback-danger-bg)", "circle-alert"]
};
function Alert({
  tone = "info",
  title,
  children,
  icon,
  action,
  style
}) {
  const [fg, bg, defIcon] = TONES[tone] || TONES.info;
  return /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      gap: 10,
      padding: "12px 14px",
      background: bg,
      border: `1px solid ${fg}40`,
      borderRadius: "var(--radius-md)",
      ...style
    }
  }, /*#__PURE__*/React.createElement(__ds_scope.Icon, {
    name: icon || defIcon,
    size: 16,
    color: fg,
    style: {
      marginTop: 1
    }
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      flexDirection: "column",
      gap: 3,
      flex: 1,
      minWidth: 0
    }
  }, title && /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: "var(--text-base)",
      fontWeight: "var(--weight-semibold)",
      color: "var(--text-primary)"
    }
  }, title), children && /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: "var(--text-xs)",
      color: "var(--text-muted)",
      lineHeight: "var(--leading-normal)"
    }
  }, children)), action && /*#__PURE__*/React.createElement("div", {
    style: {
      flexShrink: 0
    }
  }, action));
}
Object.assign(__ds_scope, { Alert });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/feedback/Alert.jsx", error: String((e && e.message) || e) }); }

// components/feedback/ConflictWarning.jsx
try { (() => {
function ConflictWarning({
  severity = "warning",
  title = "Scheduling conflict",
  conflicts = [],
  onResolve,
  style
}) {
  const fg = severity === "danger" ? "var(--feedback-danger)" : "var(--feedback-warning)";
  const bg = severity === "danger" ? "var(--feedback-danger-bg)" : "var(--feedback-warning-bg)";
  return /*#__PURE__*/React.createElement("div", {
    style: {
      background: bg,
      border: `1px solid ${fg}40`,
      borderRadius: "var(--radius-md)",
      padding: "12px 14px",
      ...style
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      alignItems: "center",
      gap: 8,
      marginBottom: conflicts.length ? 8 : 0
    }
  }, /*#__PURE__*/React.createElement(__ds_scope.Icon, {
    name: "triangle-alert",
    size: 15,
    color: fg
  }), /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: "var(--text-base)",
      fontWeight: "var(--weight-semibold)",
      color: "var(--text-primary)",
      flex: 1
    }
  }, title), onResolve && /*#__PURE__*/React.createElement("button", {
    onClick: onResolve,
    style: {
      background: "transparent",
      border: `1px solid ${fg}55`,
      color: fg,
      borderRadius: "var(--radius-xs)",
      padding: "3px 9px",
      fontSize: "var(--text-2xs)",
      fontWeight: "var(--weight-semibold)",
      cursor: "pointer",
      fontFamily: "var(--font-body)"
    }
  }, "Resolve")), conflicts.length > 0 && /*#__PURE__*/React.createElement("ul", {
    style: {
      margin: 0,
      padding: 0,
      listStyle: "none",
      display: "flex",
      flexDirection: "column",
      gap: 6
    }
  }, conflicts.map((c, i) => /*#__PURE__*/React.createElement("li", {
    key: i,
    style: {
      display: "flex",
      gap: 8,
      alignItems: "flex-start",
      fontSize: "var(--text-xs)",
      color: "var(--text-muted)"
    }
  }, /*#__PURE__*/React.createElement(__ds_scope.Icon, {
    name: c.icon || "dot",
    size: 12,
    color: fg,
    style: {
      marginTop: 2
    }
  }), /*#__PURE__*/React.createElement("span", null, /*#__PURE__*/React.createElement("strong", {
    style: {
      color: "var(--text-body)",
      fontWeight: "var(--weight-semibold)"
    }
  }, c.label), c.detail ? " — " + c.detail : "")))));
}
Object.assign(__ds_scope, { ConflictWarning });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/feedback/ConflictWarning.jsx", error: String((e && e.message) || e) }); }

// components/feedback/Modal.jsx
try { (() => {
function Modal({
  open = true,
  title,
  subtitle,
  children,
  footer,
  onClose,
  width = 560,
  style
}) {
  if (!open) return null;
  return /*#__PURE__*/React.createElement("div", {
    style: {
      position: "absolute",
      inset: 0,
      zIndex: 60,
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      padding: 24,
      background: "var(--surface-overlay)",
      backdropFilter: "var(--blur-overlay)"
    },
    onClick: onClose
  }, /*#__PURE__*/React.createElement("div", {
    onClick: e => e.stopPropagation(),
    style: {
      width: "100%",
      maxWidth: width,
      maxHeight: "88%",
      display: "flex",
      flexDirection: "column",
      background: "var(--surface-card)",
      border: "1px solid var(--border-default)",
      borderRadius: "var(--radius-xl)",
      boxShadow: "var(--shadow-overlay)",
      overflow: "hidden",
      ...style
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      alignItems: "flex-start",
      gap: 12,
      padding: "16px 20px",
      borderBottom: "1px solid var(--border-subtle)"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1,
      minWidth: 0
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: "var(--text-lg)",
      fontWeight: "var(--weight-semibold)",
      color: "var(--text-primary)",
      letterSpacing: "var(--tracking-tight)"
    }
  }, title), subtitle && /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: "var(--text-xs)",
      color: "var(--text-faint)",
      marginTop: 2
    }
  }, subtitle)), onClose && /*#__PURE__*/React.createElement("button", {
    onClick: onClose,
    style: {
      background: "transparent",
      border: "none",
      color: "var(--text-faint)",
      cursor: "pointer",
      padding: 4,
      display: "inline-flex"
    }
  }, /*#__PURE__*/React.createElement(__ds_scope.Icon, {
    name: "x",
    size: 16
  }))), /*#__PURE__*/React.createElement("div", {
    style: {
      padding: 20,
      overflowY: "auto",
      flex: 1
    }
  }, children), footer && /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      justifyContent: "flex-end",
      gap: 8,
      padding: "12px 20px",
      borderTop: "1px solid var(--border-subtle)",
      background: "var(--bg-sunken)"
    }
  }, footer)));
}
Object.assign(__ds_scope, { Modal });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/feedback/Modal.jsx", error: String((e && e.message) || e) }); }

// components/feedback/Toast.jsx
try { (() => {
const TONES = {
  info: ["var(--feedback-info)", "info"],
  success: ["var(--feedback-success)", "circle-check"],
  warning: ["var(--feedback-warning)", "triangle-alert"],
  danger: ["var(--feedback-danger)", "circle-alert"]
};
function Toast({
  tone = "info",
  title,
  description,
  onDismiss,
  style
}) {
  const [fg, icon] = TONES[tone] || TONES.info;
  return /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      alignItems: "flex-start",
      gap: 10,
      width: 340,
      padding: "12px 14px",
      background: "var(--surface-raised)",
      border: "1px solid var(--border-default)",
      borderRadius: "var(--radius-md)",
      boxShadow: "var(--shadow-lg)",
      borderLeft: `2px solid ${fg}`,
      ...style
    }
  }, /*#__PURE__*/React.createElement(__ds_scope.Icon, {
    name: icon,
    size: 16,
    color: fg,
    style: {
      marginTop: 1
    }
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      flexDirection: "column",
      gap: 2,
      flex: 1,
      minWidth: 0
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: "var(--text-base)",
      fontWeight: "var(--weight-semibold)",
      color: "var(--text-primary)"
    }
  }, title), description && /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: "var(--text-xs)",
      color: "var(--text-muted)",
      lineHeight: "var(--leading-normal)"
    }
  }, description)), onDismiss && /*#__PURE__*/React.createElement("button", {
    onClick: onDismiss,
    style: {
      background: "transparent",
      border: "none",
      cursor: "pointer",
      padding: 2,
      color: "var(--text-faint)",
      display: "inline-flex"
    }
  }, /*#__PURE__*/React.createElement(__ds_scope.Icon, {
    name: "x",
    size: 14
  })));
}
Object.assign(__ds_scope, { Toast });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/feedback/Toast.jsx", error: String((e && e.message) || e) }); }

// components/navigation/MobileTabBar.jsx
try { (() => {
function MobileTabBar({
  items = [],
  activeId,
  onSelect,
  style
}) {
  return /*#__PURE__*/React.createElement("nav", {
    style: {
      display: "flex",
      alignItems: "stretch",
      background: "var(--bg-sunken)",
      borderTop: "1px solid var(--border-default)",
      paddingBottom: "env(safe-area-inset-bottom)",
      ...style
    }
  }, items.map(t => {
    const active = t.id === activeId;
    return /*#__PURE__*/React.createElement("button", {
      key: t.id,
      onClick: () => onSelect && onSelect(t.id),
      style: {
        flex: 1,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: 4,
        minHeight: "var(--touch-target-min)",
        padding: "8px 4px",
        background: "transparent",
        border: "none",
        color: active ? "var(--blue-300)" : "var(--text-faint)",
        cursor: "pointer",
        position: "relative"
      }
    }, active && /*#__PURE__*/React.createElement("span", {
      style: {
        position: "absolute",
        top: 0,
        left: "22%",
        right: "22%",
        height: 2,
        background: "var(--brand-primary)",
        borderRadius: "0 0 2px 2px"
      }
    }), /*#__PURE__*/React.createElement("span", {
      style: {
        position: "relative"
      }
    }, /*#__PURE__*/React.createElement(__ds_scope.Icon, {
      name: t.icon || "circle",
      size: 20
    }), t.count > 0 && /*#__PURE__*/React.createElement("span", {
      className: "tabular",
      style: {
        position: "absolute",
        top: -5,
        right: -9,
        minWidth: 15,
        height: 15,
        padding: "0 4px",
        borderRadius: "var(--radius-pill)",
        background: "var(--brand-attention)",
        color: "#241503",
        fontSize: 9,
        fontWeight: "var(--weight-bold)",
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center"
      }
    }, t.count)), /*#__PURE__*/React.createElement("span", {
      style: {
        fontSize: "var(--text-2xs)",
        fontWeight: active ? "var(--weight-semibold)" : "var(--weight-regular)"
      }
    }, t.label));
  }));
}
Object.assign(__ds_scope, { MobileTabBar });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/navigation/MobileTabBar.jsx", error: String((e && e.message) || e) }); }

// components/navigation/SidebarNav.jsx
try { (() => {
function SidebarNav({
  items = [],
  activeId,
  onSelect,
  collapsed = false,
  brandName = "SwiftDispatch Pro",
  brandSub = "Order Management",
  logoSrc,
  footer,
  style
}) {
  const [hoverId, setHoverId] = React.useState(null);
  return /*#__PURE__*/React.createElement("nav", {
    style: {
      display: "flex",
      flexDirection: "column",
      width: collapsed ? "var(--sidebar-width-collapsed)" : "var(--sidebar-width)",
      flexShrink: 0,
      height: "100%",
      background: "var(--bg-sunken)",
      borderRight: "1px solid var(--border-subtle)",
      ...style
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      alignItems: "center",
      gap: 10,
      padding: collapsed ? "14px 0" : "14px 16px",
      justifyContent: collapsed ? "center" : "flex-start",
      borderBottom: "1px solid var(--border-subtle)",
      minHeight: "var(--topbar-height)"
    }
  }, logoSrc ? /*#__PURE__*/React.createElement("img", {
    src: logoSrc,
    alt: "",
    style: {
      width: 26,
      height: 26,
      objectFit: "contain",
      flexShrink: 0
    }
  }) : /*#__PURE__*/React.createElement("span", {
    style: {
      width: 26,
      height: 26,
      borderRadius: "var(--radius-sm)",
      background: "var(--gradient-brand)",
      flexShrink: 0
    }
  }), !collapsed && /*#__PURE__*/React.createElement("span", {
    style: {
      display: "flex",
      flexDirection: "column",
      minWidth: 0
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: "var(--text-base)",
      fontWeight: "var(--weight-semibold)",
      color: "var(--text-primary)",
      letterSpacing: "var(--tracking-tight)",
      whiteSpace: "nowrap",
      overflow: "hidden",
      textOverflow: "ellipsis"
    }
  }, brandName), /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: "var(--text-2xs)",
      color: "var(--text-faint)"
    }
  }, brandSub))), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      flexDirection: "column",
      gap: 1,
      padding: collapsed ? "8px 6px" : "8px 8px",
      overflowY: "auto",
      flex: 1
    }
  }, items.map(item => {
    if (item.section) {
      return collapsed ? /*#__PURE__*/React.createElement("span", {
        key: item.section,
        style: {
          height: 1,
          background: "var(--border-subtle)",
          margin: "8px 4px"
        }
      }) : /*#__PURE__*/React.createElement("span", {
        key: item.section,
        style: {
          padding: "12px 8px 5px",
          fontSize: "var(--text-2xs)",
          fontWeight: "var(--weight-semibold)",
          letterSpacing: "var(--tracking-eyebrow)",
          textTransform: "uppercase",
          color: "var(--text-faint)"
        }
      }, item.section);
    }
    const active = item.id === activeId;
    const hot = hoverId === item.id;
    return /*#__PURE__*/React.createElement("button", {
      key: item.id,
      onClick: () => onSelect && onSelect(item.id),
      onMouseEnter: () => setHoverId(item.id),
      onMouseLeave: () => setHoverId(null),
      title: collapsed ? item.label : undefined,
      style: {
        display: "flex",
        alignItems: "center",
        gap: 10,
        padding: collapsed ? "9px 0" : "8px 10px",
        justifyContent: collapsed ? "center" : "flex-start",
        background: active ? "rgba(59,130,246,.13)" : hot ? "var(--surface-raised)" : "transparent",
        color: active ? "var(--blue-300)" : "var(--text-muted)",
        border: "none",
        borderRadius: "var(--radius-sm)",
        fontFamily: "var(--font-body)",
        fontSize: "var(--text-base)",
        fontWeight: active ? "var(--weight-semibold)" : "var(--weight-regular)",
        cursor: "pointer",
        textAlign: "left",
        width: "100%",
        transition: "var(--transition-control)"
      }
    }, /*#__PURE__*/React.createElement(__ds_scope.Icon, {
      name: item.icon || "circle",
      size: 15
    }), !collapsed && /*#__PURE__*/React.createElement("span", {
      style: {
        flex: 1,
        whiteSpace: "nowrap",
        overflow: "hidden",
        textOverflow: "ellipsis"
      }
    }, item.label), !collapsed && item.badge != null && /*#__PURE__*/React.createElement("span", {
      className: "tabular",
      style: {
        fontSize: "var(--text-2xs)",
        fontWeight: "var(--weight-semibold)",
        padding: "1px 6px",
        borderRadius: "var(--radius-pill)",
        background: "var(--surface-active)",
        color: "var(--text-muted)"
      }
    }, item.badge));
  })), footer && /*#__PURE__*/React.createElement("div", {
    style: {
      padding: 10,
      borderTop: "1px solid var(--border-subtle)"
    }
  }, footer));
}
Object.assign(__ds_scope, { SidebarNav });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/navigation/SidebarNav.jsx", error: String((e && e.message) || e) }); }

// components/navigation/StepProgress.jsx
try { (() => {
function StepProgress({
  steps = [],
  current = 1,
  maxReached,
  onStepClick,
  style
}) {
  const reach = maxReached == null ? current : maxReached;
  return /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      alignItems: "center",
      width: "100%",
      ...style
    }
  }, steps.map((label, i) => {
    const n = i + 1;
    const done = n < current;
    const active = n === current;
    const reachable = n <= reach;
    return /*#__PURE__*/React.createElement(React.Fragment, {
      key: label
    }, /*#__PURE__*/React.createElement("button", {
      onClick: () => reachable && onStepClick && onStepClick(n),
      disabled: !reachable,
      style: {
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: 6,
        background: "transparent",
        border: "none",
        padding: 0,
        cursor: reachable && onStepClick ? "pointer" : "default",
        flexShrink: 0
      }
    }, /*#__PURE__*/React.createElement("span", {
      style: {
        width: 26,
        height: 26,
        borderRadius: "50%",
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        background: done ? "var(--feedback-success)" : active ? "var(--brand-primary)" : "var(--surface-raised)",
        border: `1px solid ${done ? "var(--feedback-success)" : active ? "var(--brand-primary)" : "var(--border-default)"}`,
        color: done || active ? "#fff" : "var(--text-faint)",
        fontSize: "var(--text-xs)",
        fontWeight: "var(--weight-semibold)",
        boxShadow: active ? "0 0 0 4px rgba(59,130,246,.16)" : "none",
        transition: "var(--transition-control)"
      }
    }, done ? /*#__PURE__*/React.createElement(__ds_scope.Icon, {
      name: "check",
      size: 13,
      color: "#fff"
    }) : n), /*#__PURE__*/React.createElement("span", {
      style: {
        fontSize: "var(--text-2xs)",
        whiteSpace: "nowrap",
        color: active ? "var(--text-primary)" : reachable ? "var(--text-muted)" : "var(--text-faint)",
        fontWeight: active ? "var(--weight-semibold)" : "var(--weight-regular)"
      }
    }, label)), i < steps.length - 1 && /*#__PURE__*/React.createElement("span", {
      style: {
        flex: 1,
        height: 1,
        margin: "0 8px",
        marginBottom: 18,
        background: n < current ? "var(--feedback-success)" : "var(--border-default)"
      }
    }));
  }));
}
Object.assign(__ds_scope, { StepProgress });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/navigation/StepProgress.jsx", error: String((e && e.message) || e) }); }

// components/navigation/Tabs.jsx
try { (() => {
function Tabs({
  items = [],
  activeId,
  onSelect,
  variant = "underline",
  fullWidth = false,
  style
}) {
  const seg = variant === "segmented";
  return /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      gap: seg ? 2 : 4,
      alignItems: "stretch",
      padding: seg ? 3 : 0,
      background: seg ? "var(--surface-raised)" : "transparent",
      border: seg ? "1px solid var(--border-subtle)" : "none",
      borderBottom: seg ? "1px solid var(--border-subtle)" : "1px solid var(--border-subtle)",
      borderRadius: seg ? "var(--radius-md)" : 0,
      width: fullWidth ? "100%" : "fit-content",
      ...style
    }
  }, items.map(t => {
    const active = t.id === activeId;
    return /*#__PURE__*/React.createElement("button", {
      key: t.id,
      onClick: () => onSelect && onSelect(t.id),
      style: {
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        gap: 7,
        flex: fullWidth ? 1 : undefined,
        padding: seg ? "7px 14px" : "9px 12px",
        background: seg && active ? "var(--surface-active)" : "transparent",
        color: active ? "var(--text-primary)" : "var(--text-faint)",
        border: "none",
        borderRadius: seg ? "var(--radius-xs)" : 0,
        borderBottom: seg ? "none" : `2px solid ${active ? "var(--brand-primary)" : "transparent"}`,
        marginBottom: seg ? 0 : -1,
        fontFamily: "var(--font-body)",
        fontSize: "var(--text-base)",
        fontWeight: active ? "var(--weight-semibold)" : "var(--weight-regular)",
        cursor: "pointer",
        whiteSpace: "nowrap",
        transition: "var(--transition-control)"
      }
    }, t.icon && /*#__PURE__*/React.createElement(__ds_scope.Icon, {
      name: t.icon,
      size: 14
    }), t.label, t.count != null && /*#__PURE__*/React.createElement("span", {
      className: "tabular",
      style: {
        fontSize: "var(--text-2xs)",
        color: "var(--text-faint)"
      }
    }, t.count));
  }));
}
Object.assign(__ds_scope, { Tabs });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/navigation/Tabs.jsx", error: String((e && e.message) || e) }); }

// components/navigation/TopBar.jsx
try { (() => {
function TopBar({
  title,
  subtitle,
  breadcrumb,
  actions,
  live = false,
  style
}) {
  return /*#__PURE__*/React.createElement("header", {
    style: {
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      gap: 16,
      minHeight: "var(--topbar-height)",
      padding: "0 20px",
      background: "rgba(9,11,21,.85)",
      backdropFilter: "var(--blur-overlay)",
      borderBottom: "1px solid var(--border-subtle)",
      position: "sticky",
      top: 0,
      zIndex: 20,
      ...style
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      flexDirection: "column",
      gap: 2,
      minWidth: 0
    }
  }, breadcrumb && /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: "var(--text-2xs)",
      letterSpacing: "var(--tracking-eyebrow)",
      textTransform: "uppercase",
      color: "var(--text-faint)"
    }
  }, breadcrumb), /*#__PURE__*/React.createElement("span", {
    style: {
      display: "flex",
      alignItems: "center",
      gap: 8
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: "var(--text-lg)",
      fontWeight: "var(--weight-semibold)",
      color: "var(--text-primary)",
      letterSpacing: "var(--tracking-tight)"
    }
  }, title), live && /*#__PURE__*/React.createElement("span", {
    style: {
      display: "inline-flex",
      alignItems: "center",
      gap: 5,
      fontSize: "var(--text-2xs)",
      color: "var(--feedback-success)"
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      width: 6,
      height: 6,
      borderRadius: "50%",
      background: "var(--feedback-success)",
      boxShadow: "0 0 0 3px rgba(16,185,129,.18)"
    }
  }), "Live")), subtitle && /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: "var(--text-xs)",
      color: "var(--text-faint)"
    }
  }, subtitle)), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      alignItems: "center",
      gap: 8,
      flexShrink: 0
    }
  }, actions));
}
Object.assign(__ds_scope, { TopBar });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/navigation/TopBar.jsx", error: String((e && e.message) || e) }); }
if (__ds_ns.__errors.length) console.error("design-system load errors", __ds_ns.__errors);
export const {

  ICON_NAMES,
  Icon,
  Button,
  Checkbox,
  Input,
  Select,
  Switch,
  Textarea,
  Badge,
  Card,
  DataTable,
  EmptyState,
  StatCard,
  StatusBadge,
  AddressBlock,
  DeliveryTaskCard,
  DispatchColumn,
  NotesPanel,
  OrderCard,
  PaymentSummary,
  PinCodeInput,
  ProductTile,
  SplitOrderGroup,
  Alert,
  ConflictWarning,
  Modal,
  Toast,
  MobileTabBar,
  SidebarNav,
  StepProgress,
  Tabs,
  TopBar
} = __ds_scope;
