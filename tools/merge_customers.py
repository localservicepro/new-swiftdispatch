#!/usr/bin/env python3
"""Merge the old app's customers + customer_contacts exports into one file the
SwiftDispatch customer importer reads in a single pass.

The old app stores a person twice over: the customer row carries its own
first_name/last_name/phone/email (the account's own contact), and
customer_contacts carries everyone else, joined by customer_id. This flattens
both into one CSV — a customer row per account, then a "Contact of" row per
extra person, keyed on account number rather than the old UUIDs.

    python3 merge_customers.py customers.csv contacts.csv suburbs.csv > out.csv
"""

import csv, sys, io

def norm(s):
    return (s or "").strip()

def real(s):
    """The old data uses punctuation as a placeholder for "nothing here" — a
    lone dot, "..", "**". Those are not names."""
    s = norm(s)
    return "" if not s.strip(".*-_ ") else s

def title_name(first, last):
    """The old data hides all sorts in last_name — "." as a placeholder, and
    sometimes a company or a note. Drop the placeholders, keep the rest."""
    first, last = real(first), real(last)
    return " ".join(p for p in (first, last) if p)

def main(customers_path, contacts_path, suburbs_path=None):
    suburb_name = {}
    if suburbs_path:
        for s in csv.DictReader(open(suburbs_path, encoding="utf-8-sig")):
            suburb_name[s["id"]] = s["name"]

    customers = list(csv.DictReader(open(customers_path, encoding="utf-8-sig")))
    contacts = list(csv.DictReader(open(contacts_path, encoding="utf-8-sig")))

    account_by_id = {c["id"]: norm(c["account_number"]) for c in customers}

    out = io.StringIO()
    w = csv.writer(out, lineterminator="\r\n")
    w.writerow([
        "Account number", "Name", "Entity", "ABN", "Tier", "Billing", "Terms days",
        "Credit limit", "Balance", "Stop credit", "Customer since", "Billing street",
        "Billing suburb", "Portal enabled", "Portal PIN",
        "Contact name", "Contact phone", "Contact email", "Contact of",
    ])

    # customer_type carries two of our fields at once: how they settle, and
    # which price list they are on.
    TIER = {"account": "Trade", "trade": "Trade", "residential": "Retail"}
    BILLING = {"account": "Account", "trade": "Prepaid", "residential": "Prepaid"}

    by_customer = {}
    for ct in contacts:
        by_customer.setdefault(ct["customer_id"], []).append(ct)

    written, orphans = 0, []
    for c in customers:
        account = norm(c["account_number"])
        person = title_name(c["first_name"], c["last_name"])
        company = real(c["company_name"]) or real(c["business_name"])
        is_business = norm(c["entity_type"]) == "business"

        # The account is named for the business when there is one; otherwise
        # for the person. A business with no company name falls back to the
        # person rather than importing nameless.
        name = (company if is_business and company else person) or company or "(unnamed)"
        ctype = norm(c["customer_type"]).lower()

        # Their full_address is a whole address string; the suburb comes from
        # the suburb_id join, not from parsing it.
        street = norm(c["full_address"])
        suburb = suburb_name.get(norm(c["suburb_id"]), "")

        w.writerow([
            account,
            name,
            "Company" if is_business else "Individual",
            "",
            TIER.get(ctype, "Retail"),
            BILLING.get(ctype, "Prepaid"),
            30 if ctype == "account" else "",
            "",
            "",
            "Yes" if norm(c["stop_credit"]).lower() == "true" else "No",
            norm(c["created_at"])[:10],
            street,
            suburb,
            "Yes" if norm(c["portal_access_enabled"]).lower() == "true" else "No",
            norm(c["portal_access_pin"]),
            # The customer row's own person becomes the account's first contact.
            person,
            norm(c["phone"]),
            norm(c["email"]),
            "",
        ])
        written += 1

        for ct in by_customer.get(c["id"], []):
            if norm(ct["is_active"]).lower() == "false":
                continue
            cname = title_name(ct["first_name"], ct["last_name"])
            if not cname or cname == person:
                continue
            w.writerow([""] * 15 + [cname, norm(ct["phone"]), norm(ct["email"]), account])

    for ct in contacts:
        if ct["customer_id"] not in account_by_id:
            orphans.append(ct)

    sys.stdout.write(out.getvalue())
    print(
        f"\n-- {written} customers, "
        f"{sum(len(v) for k, v in by_customer.items() if k in account_by_id)} contacts attached, "
        f"{len(orphans)} contacts with no customer in this extract",
        file=sys.stderr,
    )

if __name__ == "__main__":
    main(*sys.argv[1:])
