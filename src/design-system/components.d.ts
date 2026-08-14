/* Loose typings for the ported design-system bundle (components.js). The
   components are plain JS with runtime prop handling; screens pass the
   documented camelCase props. */
import * as React from "react";

type C = React.ComponentType<any>;

export const ICON_NAMES: string[];
export const Icon: C;
export const Button: C;
export const Checkbox: C;
export const Input: C;
export const Select: C;
export const Switch: C;
export const Textarea: C;
export const Badge: C;
export const Card: C;
export const DataTable: C;
export const EmptyState: C;
export const StatCard: C;
export const StatusBadge: C;
export const AddressBlock: C;
export const DeliveryTaskCard: C;
export const DispatchColumn: C;
export const NotesPanel: C;
export const OrderCard: C;
export const PaymentSummary: C;
export const PinCodeInput: C;
export const ProductTile: C;
export const SplitOrderGroup: C;
export const Alert: C;
export const ConflictWarning: C;
export const Modal: C;
export const Toast: C;
export const MobileTabBar: C;
export const SidebarNav: C;
export const StepProgress: C;
export const Tabs: C;
export const TopBar: C;
