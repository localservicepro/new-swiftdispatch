import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import DriverPortal from "./driver/DriverPortal";
import CustomerPortal from "./portal/CustomerPortal";
import "./index.css";

/* Hash routing so every surface works on any static host:
   #/driver — driver portal, #/portal — customer portal, anything else — admin. */
const surface = window.location.hash.startsWith("#/driver")
  ? "driver"
  : window.location.hash.startsWith("#/portal")
    ? "portal"
    : "admin";
window.addEventListener("hashchange", () => {
  const next = window.location.hash.startsWith("#/driver")
    ? "driver"
    : window.location.hash.startsWith("#/portal")
      ? "portal"
      : "admin";
  if (next !== surface) window.location.reload();
});

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    {surface === "driver" ? <DriverPortal /> : surface === "portal" ? <CustomerPortal /> : <App />}
  </React.StrictMode>
);
