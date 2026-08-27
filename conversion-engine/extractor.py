"""Layer 1, part 2 — signal extractor.

Parses the HTML saved by fetcher.py (./html/{lead_id}.html and, if fetched,
./html/{lead_id}__page2.html) with selectolax and emits one row per lead to
signals.csv and signals.jsonl.

Every field is a hard boolean/integer/string derived from the markup — no
inference. Where a signal cannot be determined, the field is null, never
false. Downstream (Layer 3) treats null as "undetermined" and false as
"affirmatively absent" — collapsing that distinction here would poison the
classification step, so it is preserved deliberately throughout.
"""
from __future__ import annotations

import argparse
import csv
import json
import re
from pathlib import Path
from typing import Any

from selectolax.parser import HTMLParser

WHITESPACE_RE = re.compile(r"\s+")
PAGE_TEXT_CAP = 6000

# ---- platform ---------------------------------------------------------

PLATFORM_SIGNATURES: list[tuple[str, str, re.Pattern[str]]] = [
    ("woocommerce", "woocommerce", re.compile(r"woocommerce", re.IGNORECASE)),
    ("shopify", "cdn.shopify.com", re.compile(r"cdn\.shopify\.com|Shopify\.theme|/cdn/shop/", re.IGNORECASE)),
    ("wordpress", "wp-content", re.compile(r"wp-content|wp-includes|generator\"\s*content=\"WordPress", re.IGNORECASE)),
    ("squarespace", "squarespace.com", re.compile(r"squarespace\.com|static1\.squarespace\.com|Squarespace\.SQUARESPACE_CONTEXT", re.IGNORECASE)),
    ("wix", "wixstatic.com", re.compile(r"wixstatic\.com|wix\.com|X-Wix-", re.IGNORECASE)),
]
GENERATOR_META_RE = re.compile(r'<meta[^>]+name=["\']generator["\'][^>]+content=["\']([^"\']+)["\']', re.IGNORECASE)

# ---- lead capture -------------------------------------------------------

ESP_SIGNATURES = [
    ("klaviyo", re.compile(r"klaviyo", re.IGNORECASE)),
    ("mailchimp", re.compile(r"mailchimp|list-manage\.com", re.IGNORECASE)),
    ("omnisend", re.compile(r"omnisend", re.IGNORECASE)),
    ("activecampaign", re.compile(r"activecampaign", re.IGNORECASE)),
    ("brevo", re.compile(r"brevo|sendinblue", re.IGNORECASE)),
]
POPUP_SIGNATURES = [
    ("privy", re.compile(r"privy\.com|static\.privy\.com", re.IGNORECASE)),
    ("justuno", re.compile(r"justuno", re.IGNORECASE)),
    ("optinmonster", re.compile(r"optinmonster", re.IGNORECASE)),
    ("poptin", re.compile(r"poptin", re.IGNORECASE)),
    ("wisepops", re.compile(r"wisepops", re.IGNORECASE)),
    ("picreel", re.compile(r"picreel", re.IGNORECASE)),
    ("sumo", re.compile(r"sumo\.com|sumome", re.IGNORECASE)),
    ("generic", re.compile(r"exit-intent|exit_intent|class=\"[^\"]*\b(modal|popup)\b", re.IGNORECASE)),
]

# ---- engagement -----------------------------------------------------------

CHAT_SIGNATURES = [
    ("tawk", re.compile(r"tawk\.to", re.IGNORECASE)),
    ("intercom", re.compile(r"widget\.intercom\.io|intercomcdn", re.IGNORECASE)),
    ("crisp", re.compile(r"crisp\.chat|client\.crisp\.chat", re.IGNORECASE)),
    ("drift", re.compile(r"js\.driftt\.com|drift\.com", re.IGNORECASE)),
    ("zendesk", re.compile(r"zdassets\.com|zendesk", re.IGNORECASE)),
    ("tidio", re.compile(r"tidio", re.IGNORECASE)),
    ("whatsapp", re.compile(r"wa\.me/|api\.whatsapp\.com", re.IGNORECASE)),
]

BOOKING_RE = re.compile(
    r"/(book|booking|appointment|schedule)\b|calendly\.com|/calendar",
    re.IGNORECASE,
)
PRODUCT_LINK_RE = re.compile(r"/products?/", re.IGNORECASE)
BRAND_LINK_RE = re.compile(r"/(brand|brands|vendor|vendors|designer|designers)/", re.IGNORECASE)
CATEGORY_LINK_RE = re.compile(r"/(category|categories|collections?)/", re.IGNORECASE)
CART_MARKUP_RE = re.compile(r"add[-_]?to[-_]?cart|/cart\b|/checkout\b", re.IGNORECASE)
CURRENCY_RE = re.compile(r"(US\$|CA\$|A\$|NZ\$|R\$|[$€£¥₹])\s?\d|\b(USD|EUR|GBP|CAD|AUD|NZD)\b")
CTA_TEXT_RE = re.compile(
    r"\b(buy now|shop now|add to cart|book now|get started|sign up|subscribe|"
    r"contact us|learn more|order now|start now|schedule)\b",
    re.IGNORECASE,
)
REVIEW_RE = re.compile(
    r'itemtype=["\'][^"\']*schema\.org/(Review|AggregateRating)["\']|class=["\'][^"\']*\b(review|testimonial)s?\b|'
    r"yotpo|trustpilot|judge\.me|stamped\.io",
    re.IGNORECASE,
)
PROMO_BAR_RE = re.compile(
    r'(id|class)=["\'][^"\']*\b(announcement|promo-?bar|top-?bar)\b[^"\']*["\']',
    re.IGNORECASE,
)
PROMO_TEXT_RE = re.compile(r"\d+%\s*off|free shipping|limited time|use code\b", re.IGNORECASE)


def collapse_whitespace(text: str) -> str:
    return WHITESPACE_RE.sub(" ", text).strip()


def find_signature(haystack: str, signatures: list[tuple[str, re.Pattern[str]]]) -> str | None:
    for name, pattern in signatures:
        if pattern.search(haystack):
            return name
    return None


def detect_platform(html: str) -> tuple[str | None, str | None]:
    for name, evidence_label, pattern in PLATFORM_SIGNATURES:
        match = pattern.search(html)
        if match:
            return name, match.group(0)
    generator = GENERATOR_META_RE.search(html)
    if generator:
        return "other", generator.group(0)
    return "unknown", None


def links_matching(tree: HTMLParser, pattern: re.Pattern[str]) -> list[str]:
    hrefs = []
    for node in tree.css("a[href]"):
        href = node.attributes.get("href") or ""
        if pattern.search(href):
            hrefs.append(href)
    return hrefs


def find_email_inputs(tree: HTMLParser) -> list:
    inputs = []
    for node in tree.css("input"):
        input_type = (node.attributes.get("type") or "").lower()
        name = (node.attributes.get("name") or "").lower()
        placeholder = (node.attributes.get("placeholder") or "").lower()
        if input_type == "email" or "email" in name or "email" in placeholder:
            inputs.append(node)
    return inputs


def nearest_heading_text(node) -> str | None:
    # walk up to the enclosing <form> (or a few ancestors), then look for a
    # preceding heading/legend/label sibling to use as evidence.
    current = node
    depth = 0
    while current is not None and depth < 6:
        for selector in ("legend", "h1", "h2", "h3", "h4", "label"):
            sib = current.css_first(selector)
            if sib and sib.text(strip=True):
                return collapse_whitespace(sib.text())[:200]
        current = current.parent
        depth += 1
    return None


def extract_form_signals(tree: HTMLParser) -> dict[str, Any]:
    email_inputs = find_email_inputs(tree)
    html_text = tree.html or ""
    has_newsletter_signup = bool(re.search(r"newsletter|subscribe", html_text, re.IGNORECASE))
    has_email_form = bool(email_inputs) or has_newsletter_signup

    has_contact_form = False
    form_evidence = None
    for form in tree.css("form"):
        names = " ".join(
            (i.attributes.get("name") or "") + " " + (i.attributes.get("type") or "")
            for i in form.css("input, textarea")
        ).lower()
        has_name = "name" in names
        has_email = "email" in names or bool(find_email_inputs(form))
        has_message = bool(form.css("textarea")) or bool(re.search(r"message|comment", names))
        if has_name and has_email and has_message:
            has_contact_form = True
            form_evidence = nearest_heading_text(form)
            break

    if form_evidence is None and email_inputs:
        form_evidence = nearest_heading_text(email_inputs[0])

    return {
        "has_email_form": has_email_form,
        "has_contact_form": has_contact_form,
        "form_evidence": form_evidence,
    }


def extract_signals_from_pages(pages: list[str]) -> dict[str, Any]:
    """pages: list of raw HTML strings for a single lead (homepage [, page2])."""
    combined_html = "\n".join(pages)
    trees = [HTMLParser(p) for p in pages]
    primary_tree = trees[0]

    platform, platform_evidence = detect_platform(combined_html)

    has_cart = bool(CART_MARKUP_RE.search(combined_html))
    product_links: set[str] = set()
    brand_links: set[str] = set()
    category_links: set[str] = set()
    for tree in trees:
        product_links.update(links_matching(tree, PRODUCT_LINK_RE))
        brand_links.update(links_matching(tree, BRAND_LINK_RE))
        category_links.update(links_matching(tree, CATEGORY_LINK_RE))

    currency_match = CURRENCY_RE.search(combined_html)
    price_currency = None
    if currency_match:
        price_currency = (currency_match.group(1) or currency_match.group(2))

    form_signals_per_page = [extract_form_signals(tree) for tree in trees]
    has_email_form = any(s["has_email_form"] for s in form_signals_per_page)
    has_contact_form = any(s["has_contact_form"] for s in form_signals_per_page)
    form_evidence = next((s["form_evidence"] for s in form_signals_per_page if s["form_evidence"]), None)

    esp = find_signature(combined_html, ESP_SIGNATURES)
    popup = find_signature(combined_html, POPUP_SIGNATURES)
    chat = find_signature(combined_html, CHAT_SIGNATURES)

    has_booking = bool(BOOKING_RE.search(combined_html))

    body_text = primary_tree.body.text(separator=" ") if primary_tree.body else ""
    body_text = collapse_whitespace(body_text)
    above_fold_ctas = 0
    if primary_tree.body:
        above_fold_nodes = primary_tree.body.css("a, button")[:60]
        for node in above_fold_nodes:
            label = node.text(strip=True) or ""
            if CTA_TEXT_RE.search(label):
                above_fold_ctas += 1

    has_reviews = bool(REVIEW_RE.search(combined_html))
    has_promo_bar = bool(PROMO_BAR_RE.search(combined_html)) and bool(PROMO_TEXT_RE.search(combined_html))

    page_text = collapse_whitespace(
        " ".join(t.body.text(separator=" ") for t in trees if t.body)
    )[:PAGE_TEXT_CAP]

    return {
        "platform": platform,
        "platform_evidence": platform_evidence,
        "has_cart": has_cart,
        "product_count_visible": len(product_links),
        "brand_count_visible": len(brand_links),
        "category_count_visible": len(category_links),
        "price_currency": price_currency,
        "has_email_form": has_email_form,
        "has_contact_form": has_contact_form,
        "form_evidence": form_evidence,
        "has_esp_tag": esp or "none",
        "has_popup_script": popup is not None,
        "popup_library": popup,
        "has_chat_widget": chat or "none",
        "has_booking": has_booking,
        "cta_count_above_fold": above_fold_ctas,
        "has_reviews": has_reviews,
        "has_promo_bar": has_promo_bar,
        "page_text": page_text,
    }


SIGNAL_COLUMNS = [
    "lead_id", "domain",
    "platform", "platform_evidence",
    "has_cart", "product_count_visible", "brand_count_visible", "category_count_visible", "price_currency",
    "has_email_form", "has_contact_form", "form_evidence", "has_esp_tag", "has_popup_script", "popup_library",
    "has_chat_widget", "has_booking",
    "cta_count_above_fold", "has_reviews", "has_promo_bar",
    "page_text",
]


def load_fetch_log(path: Path) -> dict[str, dict[str, str]]:
    rows: dict[str, dict[str, str]] = {}
    if not path.exists():
        return rows
    with path.open(newline="", encoding="utf-8") as f:
        for row in csv.DictReader(f):
            rows[row["lead_id"]] = row
    return rows


def run(html_dir: Path, fetch_log_path: Path, out_csv: Path, out_jsonl: Path) -> None:
    fetch_log = load_fetch_log(fetch_log_path)

    lead_ids: list[str] = []
    domain_by_lead: dict[str, str] = {}
    for path in sorted(html_dir.glob("*.html")):
        if path.name.endswith("__page2.html"):
            continue
        lead_id = path.stem
        lead_ids.append(lead_id)
        domain_by_lead[lead_id] = fetch_log.get(lead_id, {}).get("domain", "")

    rows: list[dict[str, Any]] = []
    for lead_id in lead_ids:
        homepage = (html_dir / f"{lead_id}.html").read_text(encoding="utf-8", errors="replace")
        pages = [homepage]
        page2_path = html_dir / f"{lead_id}__page2.html"
        if page2_path.exists():
            pages.append(page2_path.read_text(encoding="utf-8", errors="replace"))

        signals = extract_signals_from_pages(pages)
        row = {"lead_id": lead_id, "domain": domain_by_lead.get(lead_id, ""), **signals}
        rows.append(row)

    out_csv.parent.mkdir(parents=True, exist_ok=True)
    with out_csv.open("w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=SIGNAL_COLUMNS)
        writer.writeheader()
        for row in rows:
            writer.writerow(row)

    with out_jsonl.open("w", encoding="utf-8") as f:
        for row in rows:
            f.write(json.dumps(row, ensure_ascii=False) + "\n")

    print(f"wrote {len(rows)} rows to {out_csv} and {out_jsonl}")
    print("non-null counts per signal column:")
    for col in SIGNAL_COLUMNS:
        if col in ("lead_id", "domain", "page_text"):
            continue
        non_null = sum(1 for row in rows if row.get(col) is not None and row.get(col) != "none")
        print(f"  {col:26s} {non_null:5d} / {len(rows)}")


def main() -> None:
    parser = argparse.ArgumentParser(description="Signal extractor (Layer 1, part 2)")
    parser.add_argument("--html-dir", type=Path, default=Path("html"))
    parser.add_argument("--fetch-log", type=Path, default=Path("fetch_log.csv"))
    parser.add_argument("--out-csv", type=Path, default=Path("signals.csv"))
    parser.add_argument("--out-jsonl", type=Path, default=Path("signals.jsonl"))
    args = parser.parse_args()

    if not args.html_dir.exists():
        raise SystemExit(f"{args.html_dir} does not exist — run fetcher.py first.")

    run(args.html_dir, args.fetch_log, args.out_csv, args.out_jsonl)


if __name__ == "__main__":
    main()
