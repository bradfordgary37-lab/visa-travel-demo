"""Layer 1, part 1 — async site fetcher.

Reads retry_queue.csv and never_analysed_queue.csv (columns: lead_id, domain,
email), fetches each lead's homepage plus one commerce page if the homepage
links to one, and writes:

  ./html/{lead_id}.html         homepage HTML
  ./html/{lead_id}__page2.html  the commerce page, if a second page was fetched
  ./fetch_log.csv               lead_id, domain, final_url, http_status, bytes,
                                 page_count, fetch_status, error_detail
  ./dead_domains.csv            lead_id, domain — DNS resolution failed, not retried

Design notes (from the previous run's failure analysis):
  - 25s timeout, not 8s (416/470 prior failures were timeouts)
  - https:// first, http:// only as a fallback when https fails outright
    (a non-2xx response is not "failing outright" — no fallback for that)
  - browser User-Agent + Accept + Accept-Language (21 prior failures were
    connection resets from bot-blocking)
  - follow_redirects=True, max 5 redirects
  - one retry, 3s backoff, on ConnectionResetError / RemoteDisconnected only
"""
from __future__ import annotations

import argparse
import asyncio
import csv
import re
import socket
from dataclasses import dataclass
from pathlib import Path
from urllib.parse import urljoin, urlparse

import httpx
from selectolax.parser import HTMLParser

USER_AGENT = (
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
    "(KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36"
)
HEADERS = {
    "User-Agent": USER_AGENT,
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
    "Accept-Language": "en-US,en;q=0.9",
}
COMMERCE_LINK_RE = re.compile(r"/(cart|checkout|shop|store|products)\b", re.IGNORECASE)
TIMEOUT_SECONDS = 25.0
CONCURRENCY = 12
MAX_REDIRECTS = 5
RETRY_BACKOFF_SECONDS = 3
MAX_PAGES_PER_LEAD = 2

FETCH_LOG_FIELDS = [
    "lead_id", "domain", "final_url", "http_status", "bytes",
    "page_count", "fetch_status", "error_detail",
]


@dataclass
class Lead:
    lead_id: str
    domain: str
    email: str


@dataclass
class FetchResult:
    lead_id: str
    domain: str
    final_url: str = ""
    http_status: int | None = None
    num_bytes: int = 0
    page_count: int = 0
    fetch_status: str = "error"
    error_detail: str = ""


def load_leads(*paths: Path) -> list[Lead]:
    leads: list[Lead] = []
    seen: set[str] = set()
    for path in paths:
        if not path.exists():
            continue
        with path.open(newline="", encoding="utf-8") as f:
            for row in csv.DictReader(f):
                lead_id = (row.get("lead_id") or "").strip()
                domain = (row.get("domain") or "").strip()
                if not lead_id or not domain or lead_id in seen:
                    continue
                seen.add(lead_id)
                leads.append(Lead(lead_id, domain, (row.get("email") or "").strip()))
    return leads


def hostname_of(domain: str) -> str:
    if "://" in domain:
        return urlparse(domain).hostname or domain
    return domain.split("/")[0]


def resolves(domain: str) -> bool:
    host = hostname_of(domain)
    try:
        socket.getaddrinfo(host, None)
        return True
    except socket.gaierror:
        return False


def is_retryable_reset(exc: BaseException) -> bool:
    name = type(exc).__name__
    text = str(exc)
    return (
        isinstance(exc, ConnectionResetError)
        or "RemoteDisconnected" in name
        or "RemoteDisconnected" in text
        or "Remote end closed connection" in text
    )


def is_blocked_signal(exc: BaseException) -> bool:
    return is_retryable_reset(exc) or isinstance(exc, httpx.RemoteProtocolError)


async def get_with_retry(client: httpx.AsyncClient, url: str) -> httpx.Response:
    """One GET, with a single retry (3s backoff) on connection reset."""
    try:
        return await client.get(url, headers=HEADERS)
    except (ConnectionResetError, httpx.RemoteProtocolError, httpx.TransportError) as exc:
        if is_retryable_reset(exc):
            await asyncio.sleep(RETRY_BACKOFF_SECONDS)
            return await client.get(url, headers=HEADERS)
        raise


async def fetch_scheme(client: httpx.AsyncClient, scheme: str, domain: str) -> httpx.Response:
    url = f"{scheme}://{hostname_of(domain)}/"
    return await get_with_retry(client, url)


def find_commerce_link(base_url: str, html: str) -> str | None:
    tree = HTMLParser(html)
    base_host = urlparse(base_url).netloc
    for node in tree.css("a[href]"):
        href = node.attributes.get("href") or ""
        if not COMMERCE_LINK_RE.search(href):
            continue
        absolute = urljoin(base_url, href)
        if urlparse(absolute).netloc == base_host:
            return absolute
    return None


async def fetch_lead(client: httpx.AsyncClient, lead: Lead, html_dir: Path) -> FetchResult:
    result = FetchResult(lead_id=lead.lead_id, domain=lead.domain)

    if not resolves(lead.domain):
        result.fetch_status = "dead"
        result.error_detail = "dns_resolution_failed"
        return result

    response: httpx.Response | None = None
    last_exc: BaseException | None = None
    for scheme in ("https", "http"):
        try:
            response = await fetch_scheme(client, scheme, lead.domain)
            break
        except httpx.TimeoutException as exc:
            last_exc = exc
            result.fetch_status = "timeout"
            result.error_detail = f"{scheme}: {exc}"
        except Exception as exc:  # noqa: BLE001 - classify below
            last_exc = exc
            if is_blocked_signal(exc):
                result.fetch_status = "blocked"
            else:
                result.fetch_status = "error"
            result.error_detail = f"{scheme}: {exc}"

    if response is None:
        # both schemes failed outright
        if last_exc is None:
            result.fetch_status = "error"
            result.error_detail = "unknown fetch failure"
        return result

    result.final_url = str(response.url)
    result.http_status = response.status_code
    body = response.text
    result.num_bytes = len(response.content)

    if response.status_code in (403, 429):
        result.fetch_status = "blocked"
        result.error_detail = f"http_{response.status_code}"
    else:
        result.fetch_status = "ok"

    html_dir.mkdir(parents=True, exist_ok=True)
    (html_dir / f"{lead.lead_id}.html").write_text(body, encoding="utf-8", errors="replace")
    result.page_count = 1

    if MAX_PAGES_PER_LEAD > 1 and result.fetch_status == "ok":
        commerce_url = find_commerce_link(result.final_url, body)
        if commerce_url:
            try:
                page2 = await get_with_retry(client, commerce_url)
                (html_dir / f"{lead.lead_id}__page2.html").write_text(
                    page2.text, encoding="utf-8", errors="replace"
                )
                result.page_count = 2
                result.num_bytes += len(page2.content)
            except Exception as exc:  # noqa: BLE001 - homepage still counts as ok
                result.error_detail = (result.error_detail + f"; page2_error: {exc}").strip("; ")

    return result


async def run(leads: list[Lead], html_dir: Path, fetch_log_path: Path, dead_domains_path: Path) -> None:
    semaphore = asyncio.Semaphore(CONCURRENCY)
    limits = httpx.Limits(max_connections=CONCURRENCY, max_keepalive_connections=CONCURRENCY)
    timeout = httpx.Timeout(TIMEOUT_SECONDS)

    async def worker(client: httpx.AsyncClient, lead: Lead) -> FetchResult:
        async with semaphore:
            return await fetch_lead(client, lead, html_dir)

    async with httpx.AsyncClient(
        timeout=timeout,
        limits=limits,
        follow_redirects=True,
        max_redirects=MAX_REDIRECTS,
        http2=False,
    ) as client:
        results = await asyncio.gather(*(worker(client, lead) for lead in leads))

    fetch_log_path.parent.mkdir(parents=True, exist_ok=True)
    with fetch_log_path.open("w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=FETCH_LOG_FIELDS)
        writer.writeheader()
        for r in results:
            writer.writerow({
                "lead_id": r.lead_id,
                "domain": r.domain,
                "final_url": r.final_url,
                "http_status": r.http_status if r.http_status is not None else "",
                "bytes": r.num_bytes,
                "page_count": r.page_count,
                "fetch_status": r.fetch_status,
                "error_detail": r.error_detail,
            })

    with dead_domains_path.open("w", newline="", encoding="utf-8") as f:
        writer = csv.writer(f)
        writer.writerow(["lead_id", "domain"])
        for r in results:
            if r.fetch_status == "dead":
                writer.writerow([r.lead_id, r.domain])

    total = len(results)
    ok = sum(1 for r in results if r.fetch_status == "ok")
    print(f"fetched {total} leads: {ok} ok, "
          f"{sum(1 for r in results if r.fetch_status == 'dead')} dead, "
          f"{sum(1 for r in results if r.fetch_status == 'timeout')} timeout, "
          f"{sum(1 for r in results if r.fetch_status == 'blocked')} blocked, "
          f"{sum(1 for r in results if r.fetch_status == 'error')} error "
          f"({ok / total:.1%} success)" if total else "no leads to fetch")


def main() -> None:
    parser = argparse.ArgumentParser(description="Async site fetcher (Layer 1, part 1)")
    parser.add_argument("--retry-queue", type=Path, default=Path("retry_queue.csv"))
    parser.add_argument("--never-analysed-queue", type=Path, default=Path("never_analysed_queue.csv"))
    parser.add_argument("--html-dir", type=Path, default=Path("html"))
    parser.add_argument("--fetch-log", type=Path, default=Path("fetch_log.csv"))
    parser.add_argument("--dead-domains", type=Path, default=Path("dead_domains.csv"))
    args = parser.parse_args()

    leads = load_leads(args.retry_queue, args.never_analysed_queue)
    if not leads:
        raise SystemExit(
            f"No leads loaded from {args.retry_queue} / {args.never_analysed_queue}. "
            "Place the input CSVs in the working directory or pass --retry-queue/--never-analysed-queue."
        )
    asyncio.run(run(leads, args.html_dir, args.fetch_log, args.dead_domains))


if __name__ == "__main__":
    main()
