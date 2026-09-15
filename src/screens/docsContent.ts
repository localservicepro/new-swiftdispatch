/* The handbook, in one place.

   The same text lives in the shared Google Sheet the yard uses to ask for
   changes; this is the copy that ships with the app, so the answer to "how does
   this screen work" is on the screen rather than in a tab nobody has open.

   Keep the two in step when something changes — the sheet is where requests go
   in, this is where the answer comes out. */

export interface Guide {
  /* Which screen this belongs to, and the nav id it matches so the handbook can
     open on whatever you are looking at. */
  screen: string;
  nav?: string;
  part: string;
  what: string;
  note?: string;
}

export interface Fn {
  name: string;
  where: string;
  what: string;
}

export interface Rule {
  title: string;
  what: string;
  why: string;
}

export const GUIDES: Guide[] = [
  {
    screen: "Signing in",
    part: "Admin PIN keypad",
    what: "Four digits on the keypad. Super admins and admins only — a driver's PIN opens the driver portal, from the link under the keypad.",
    note: "A refresh is not a sign-out.",
  },
  {
    screen: "Dashboard",
    nav: "dashboard",
    part: "Today / week / month",
    what: "Orders, revenue, average order, lines moved, on the road, unpaid. The period buttons change all of them together.",
    note: "Revenue counts what was placed in the period, not what was paid.",
  },
  {
    screen: "Dashboard",
    nav: "dashboard",
    part: "Product movement",
    what: "What left the yard, by quantity or revenue, filtered by category.",
    note: "Bars compare within a unit — a tonne is not a cubic metre, so they are never mixed.",
  },
  {
    screen: "Dashboard",
    nav: "dashboard",
    part: "Stock to watch",
    what: "On-hand against what moved, with days of cover.",
    note: "Only lists products someone actually counts.",
  },
  {
    screen: "Dashboard",
    nav: "dashboard",
    part: "Needs attention",
    what: "Account orders with no billing relationship, addresses with no suburb, failed payments, stop-credit orders still open, splits waiting on a truck.",
  },
  {
    screen: "Dispatch board",
    nav: "board",
    part: "Kanban lanes",
    what: "On hold, confirmed & preparing, loading, en route, delivered. Drag a card to move the order.",
    note: "Taking an order confirms it, so there is no separate Requested column — an order the customer raised through the portal lands in the same lane with a flag on it until someone looks.",
  },
  {
    screen: "Orders",
    nav: "orders",
    part: "The list",
    what: "Every order, newest first, 100 to a page, with the goods and the notes on each one. Search covers order number, customer, delivery address, PO and any contact phone.",
    note: "Sort by when it was placed or by when it is due. The trash icon at the end of a row deletes an order.",
  },
  {
    screen: "Orders",
    nav: "orders",
    part: "Master and split",
    what: "A split order shows as MO — ORD-xxxx. The master holds no line items: the splits are the order.",
  },
  {
    screen: "New order",
    nav: "neworder",
    part: "Picking products",
    what: "Search or tap a category, then tap a card to add it. Type the amount straight onto the card, or type it into the search — \"0.5*white brick\" and Enter loads half a tonne of it.",
    note: "A product already in the order shows the quantity over its photo, and that figure can be typed over.",
  },
  {
    screen: "New order",
    nav: "neworder",
    part: "The cart",
    what: "Stays on screen while you scroll the catalogue, so you can see what is already in the order without scrolling back. In a split-screen window it sits above the catalogue instead.",
  },
  {
    screen: "New order",
    nav: "neworder",
    part: "Splitting",
    what: "Split this order turns one order into several deliveries. Tap a letter in the cart to move a line across.",
  },
  {
    screen: "New order",
    nav: "neworder",
    part: "Yard sale",
    what: "Counter mode. No delivery or address — name on the docket is optional, or put it on a business account.",
  },
  {
    screen: "Customers",
    nav: "customers",
    part: "The list",
    what: "Everyone, 100 at a time. Search reaches the whole book.",
  },
  {
    screen: "Customers",
    nav: "customers",
    part: "Three separate things",
    what: "Who they are (person or business), what they pay (retail or trade pricing), and how they settle (prepaid, or an account with terms and a limit).",
    note: "A sole trader can be a person on trade pricing who prepays.",
  },
  {
    screen: "New order",
    nav: "neworder",
    part: "A customer who is not on file",
    what: "New beside the customer search adds them without leaving the order.",
    note: "The order starts on nobody — it no longer keeps whoever the last one was for.",
  },
  {
    screen: "Customers",
    nav: "customers",
    part: "Delivery addresses",
    what: "Every address an order has been delivered to is saved here, and the six most recent are offered on a new order. Labels and streets are editable.",
    note: "Naming an address keeps it. Only unnamed ones the app captured itself are dropped past six.",
  },
  {
    screen: "Customers",
    nav: "customers",
    part: "Statements",
    what: "Open an account and print a statement for any month.",
    note: "Ageing counts every unpaid order on the account, not just that month's.",
  },
  {
    screen: "Customers",
    nav: "customers",
    part: "Portal",
    what: "Account customers sign in with a PIN. Enable per customer, or for all account customers at once.",
    note: "Orders they raise land on the dispatch board as Requested.",
  },
  {
    screen: "Products",
    nav: "products",
    part: "Catalogue",
    what: "Cards with photos, four across. Click one to edit.",
    note: "The Table view is better for a stocktake.",
  },
  {
    screen: "Products",
    nav: "products",
    part: "Photos",
    what: "Upload a file in the product editor — PNG, JPG, WEBP, GIF or AVIF up to 10MB.",
    note: "No photo shows a placeholder.",
  },
  {
    screen: "Products",
    nav: "products",
    part: "Specials",
    what: "Percent or amount off, across all products, a category, or a chosen few, with a date range.",
  },
  {
    screen: "Payments",
    nav: "payments",
    part: "MYOB",
    what: "Push finished orders to MYOB as an order or an invoice.",
    note: "Settings holds the description, date, account, job and tax defaults.",
  },
  {
    screen: "Suburbs",
    nav: "suburbs",
    part: "Delivery zones",
    what: "Name, postcode, state, delivery fee. The fee on an order comes from here.",
    note: "A suburb with no fee blocks orders to it until one is set.",
  },
  {
    screen: "Settings",
    nav: "settings",
    part: "Business and payment",
    what: "What prints on invoices and statements, payment settings, fuel surcharge, integrations, email and MYOB.",
  },
  {
    screen: "Reports",
    nav: "reports",
    part: "Item movement",
    what: "What has gone out against what is still booked to go, by product. Filter any report to a single item.",
    note: "Still to go counts every undelivered order booked for today or later, however far ahead — it is the reorder list.",
  },
  {
    screen: "Every screen",
    part: "Split screen",
    what: "The app works in half a monitor. The navigation folds to icons, the top bar drops its labels, and the wide lists shed the columns you can read off the order itself.",
    note: "The goods and the notes stay, because those are what the list is for.",
  },
  {
    screen: "Every screen",
    part: "Import and export",
    what: "Customers, products and suburbs each export to CSV and import back.",
    note: "The export is the template the importer reads.",
  },
];

export const FUNCTION_GROUPS: { group: string; items: Fn[] }[] = [
  {
    group: "Taking an order",
    items: [
      { name: "Create order", where: "New order", what: "Delivery or pickup, one or many deliveries, any number of lines." },
      {
        name: "Split an order",
        where: "New order › Split this order",
        what: "One order, several deliveries, each with its own address, date and truck.",
      },
      {
        name: "Yard sale / counter sale",
        where: "Top bar › Yard sale",
        what: "Walk-in sale with no delivery. Optional name on the docket.",
      },
      { name: "Order adjustment", where: "New order, step 2", what: "Discount or amendment, as a percent or an amount. Called an amendment, not a surcharge — the fuel and card surcharges are different things." },
      { name: "Typed quantities", where: "New order · Orders › Items", what: "Type the amount on a product card, in the cart, or as \"0.5*sand\" in the search. A third of a metre is a real order and is taken as typed." },
      { name: "Create a customer mid-order", where: "New order › New", what: "Adds a customer without leaving the order, and puts them straight on it." },
      { name: "Order over stop credit", where: "New order, customer card", what: "Takes the order anyway and writes the override into the order notes, so it reads as a decision." },
      { name: "Dispatch board", where: "Dispatch board", what: "Drag orders between stages; assign truck and driver." },
      { name: "Delivery photos (POD)", where: "Driver portal", what: "Driver marks delivered and attaches a photo." },
      { name: "Delete an order", where: "Orders list · order panel", what: "Hides it everywhere and keeps the record, so anything printed or sent to MYOB still reads. A master takes its deliveries with it." },
    ],
  },
  {
    group: "Paperwork",
    items: [
      {
        name: "Tax invoice",
        where: "Orders › Print receipt",
        what: "Prints in the yard's invoice format through the browser print dialogue.",
      },
      {
        name: "Split invoices",
        where: "Orders › Print receipt",
        what: "One sheet per delivery, or all deliveries combined on one.",
      },
      {
        name: "Run sheet",
        where: "Orders › Run sheet",
        what: "The paper that goes on the truck: goods with a box to tick, the address in large type, the phones, and the delivery notes. No prices. One sheet per drop.",
      },
      {
        name: "Account statement",
        where: "Customers › Statement",
        what: "Any month, in the yard's statement format, with ageing across the whole account.",
      },
    ],
  },
  {
    group: "Money",
    items: [
      { name: "MYOB push", where: "Orders › Send to MYOB", what: "Sends an order or an invoice to MYOB AccountRight." },
      {
        name: "MYOB duplicate guard",
        where: "Orders › Send to MYOB",
        what: "Banner and a block if the order has already gone across.",
      },
      { name: "Payments ledger", where: "Payments", what: "Payments with order, customer, method and status." },
      { name: "Delivery fee by suburb", where: "Suburbs", what: "The fee comes from the suburb. A manual fee is recorded as manual." },
      { name: "Fuel surcharge", where: "Settings › Payments", what: "Per-delivery surcharge applied to delivery orders." },
    ],
  },
  {
    group: "The catalogue",
    items: [
      { name: "Product cards with photos", where: "Products › Cards", what: "Four across, with the photograph or a placeholder." },
      {
        name: "Photo upload",
        where: "Products › edit a product",
        what: "Upload from your computer; replaces and removes cleanly.",
      },
      {
        name: "Variants",
        where: "Products › edit a product",
        what: "One product, several sizes or finishes, each with its own SKU, price and stock.",
      },
      { name: "Specials", where: "Products › Specials", what: "Percent or amount off, with a date range." },
      {
        name: "Stock tracking",
        where: "Products › edit a product",
        what: "Off for everything carried over. Turn it on once you have counted a product.",
      },
    ],
  },
  {
    group: "Data in and out",
    items: [
      {
        name: "Customer import / export",
        where: "Customers › Import / Export CSV",
        what: "Round-trips the customer book, including contacts, in one file.",
      },
      {
        name: "Product import / export",
        where: "Products › Import / Export CSV",
        what: "Round-trips the catalogue. A number in the Stock column turns tracking on.",
      },
      {
        name: "Suburb import / export",
        where: "Suburbs › Import / Export CSV",
        what: "Round-trips delivery zones and rates. Can clear out suburbs the file does not mention.",
      },
      { name: "Import preview", where: "All three importers", what: "Shows every row and what will happen before anything is written." },
      { name: "Saved delivery addresses", where: "Customers › Delivery addresses", what: "The last six addresses per customer, captured as orders go out and editable by hand." },
      { name: "Item movement report", where: "Reports", what: "Gone out against still to go, per product — what to order in from the quarry." },
      { name: "Delete a customer", where: "Customers › Delete", what: "Deleted outright if they have never ordered; archived out of the book if they have, so their invoices still read." },
    ],
  },
  {
    group: "Portals and people",
    items: [
      {
        name: "Customer portal",
        where: "#/portal",
        what: "Account customers sign in with a PIN, see their orders and raise new ones.",
      },
      { name: "Driver portal", where: "#/driver", what: "Drivers see their runs, update status and attach delivery photos." },
      { name: "Team and PINs", where: "Team", what: "Super admin, admin and driver roles, each with a sign-in PIN." },
      { name: "Trucks", where: "Fleet", what: "Rego, type and status." },
      { name: "Assign a crew", where: "Dispatch board › Loading", what: "Truck and driver together. Admins who also drive are on the list, not only the drivers." },
    ],
  },
  {
    group: "Setup",
    items: [
      { name: "Business details", where: "Settings", what: "What prints on invoices and statements, including bank details." },
    ],
  },
];

export const RULES: Rule[] = [
  {
    title: "The suburb sets the delivery fee",
    what: "A delivery's fee comes from its suburb. A fee that differs is recorded as manual, so it is visible as a decision.",
    why: "Stops the same run being priced three ways by three people.",
  },
  {
    title: "A suburb with no fee blocks orders to it",
    what: "Blank is not zero. A suburb nobody has priced will not take an order until someone prices it.",
    why: "'Free delivery' and 'nobody has priced this' are different answers; only one should quietly charge nothing.",
  },
  {
    title: "A master order holds no line items",
    what: "On a split order the deliveries hold the goods; the master groups them. Its total is the sum of its splits.",
    why: "The old app let both hold lines and drift apart — 24 orders disagreed with themselves.",
  },
  {
    title: "Payment type is not payment method",
    what: "Type is the terms (prepaid, 7/14/30 day account). Method is how the money arrived (cash, card, direct debit).",
    why: "The old data mixed them, which is why some orders arrived with 'trade' as a payment type. Trade is a price list.",
  },
  {
    title: "Taking an order confirms it",
    what: "An order written up here starts at confirmed & preparing. Requested belongs to orders the yard did not raise — the customer portal puts them there, flagged, in the same lane.",
    why: "Two columns for one decision meant every order got dragged twice.",
  },
  {
    title: "A quantity is taken as typed",
    what: "The +/- buttons move by the unit's own step. A number you type is kept as it is — 0.33 of a metre stays 0.33.",
    why: "The step is how the buttons move, not a rule about what can be sold. Snapping a typed amount to the nearest quarter was the app arguing with the customer.",
  },
  {
    title: "Stop credit warns rather than bars",
    what: "An account over its limit shows the reason and will still take the order once someone ticks the box. The override is written into the order notes.",
    why: "The yard does carry good customers through a slow month. That is a decision somebody makes, so it is recorded as one.",
  },
  {
    title: "Nothing is written until you confirm",
    what: "Every importer shows the full plan first — what will be created, changed, skipped, and why.",
    why: "An import that surprises you has already done the damage.",
  },
  {
    title: "Stock is 'not tracked' until counted",
    what: "Everything carried over is marked not tracked, because the old app seeded rather than counted.",
    why: "There is no correct number to restore; there never was one. Count a product and turn it on.",
  },
  {
    title: "Statements wait for the full ledger",
    what: "Printing a statement loads the entire order history first.",
    why: "Ageing counts every unpaid order on the account. A statement drawn on part of the book would misstate what is owed.",
  },
  {
    title: "Sign-in loads two months, then the rest",
    what: "The last 60 days plus every order still open, however old.",
    why: "Screens that total across all time say so until the rest lands, rather than showing a figure that is quietly short.",
  },
  {
    title: "An order already in MYOB says so",
    what: "A pushed order shows a banner and will not go across again without an explicit override.",
    why: "Duplicates in MYOB are painful to unpick.",
  },
  {
    title: "Deleted orders are hidden, not destroyed",
    what: "Deleting sets a date; the row stays.",
    why: "History that other records point at stays readable.",
  },
  {
    title: "A customer with orders is archived, not deleted",
    what: "Never ordered, and they are gone for good. Ever ordered, and the record is kept and hidden — out of the book and every picker, still readable on their old orders.",
    why: "Statements, tax invoices and four years of history all read the name through that row.",
  },
  {
    title: "Each order starts on nobody",
    what: "The new-order screen no longer keeps the customer from the last order.",
    why: "The same customer rarely orders twice in a row, and the name sits in a corner nobody rereads — which is how goods end up on the wrong account.",
  },
];

/* Where change requests and bug reports go. Shown at the foot of the handbook so
   the two halves — how it works, and how to ask for it to work differently —
   are one click apart. */
export const CHANGE_LOG_URL = "https://docs.google.com/spreadsheets/d/1SZsJkrbX0O6eFuQGta5ueEreIRkaaVoQPh33AgKdg40/edit";
