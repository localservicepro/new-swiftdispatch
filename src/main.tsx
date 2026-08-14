import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import DriverPortal from "./driver/DriverPortal";
import "./index.css";

/* #/driver opens the driver portal — hash routing so it works on any static host. */
const isDriver = window.location.hash.startsWith("#/driver");
window.addEventListener("hashchange", () => {
  if (window.location.hash.startsWith("#/driver") !== isDriver) window.location.reload();
});

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>{isDriver ? <DriverPortal /> : <App />}</React.StrictMode>
);
