"""One-off retry harness for the sandbox proxy's transient 'Host not in
allowlist' artifact seen while running fetcher.py in this environment.

Unlike a genuine site-side 403 (Cloudflare, WAF, etc.), this specific
failure is infra noise: the same domain succeeds seconds later with no
code change. This script retries only leads whose saved HTML matches that
exact synthetic message, with backoff, at low concurrency, leaving real
site-side blocks alone.
"""
from __future__ import annotations

import asyncio
import csv
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))
import fetcher  # noqa: E402

ARTIFACT_PREFIX = "Host not in allowlist:"
MAX_ATTEMPTS = 6
BACKOFF_BASE = 3
CONCURRENCY = 5


def is_proxy_artifact(html_path: Path) -> bool:
    if not html_path.exists():
        return False
    head = html_path.read_text(encoding="utf-8", errors="replace")[:64]
    return head.startswith(ARTIFACT_PREFIX)


async def retry_lead(client, lead: fetcher.Lead, html_dir: Path) -> fetcher.FetchResult:
    result = None
    for attempt in range(MAX_ATTEMPTS):
        result = await fetcher.fetch_lead(client, lead, html_dir)
        html_path = html_dir / f"{lead.lead_id}.html"
        if result.fetch_status == "ok" or not is_proxy_artifact(html_path):
            return result
        await asyncio.sleep(BACKOFF_BASE * (attempt + 1))
    return result


async def main() -> None:
    html_dir = Path("html")
    fetch_log_path = Path("fetch_log.csv")

    rows = {}
    with fetch_log_path.open(newline="", encoding="utf-8") as f:
        for row in csv.DictReader(f):
            rows[row["lead_id"]] = row

    lead_info = {}
    for path in ("retry_queue.csv", "never_analysed_queue.csv"):
        with open(path, newline="", encoding="utf-8") as f:
            for row in csv.DictReader(f):
                lead_info[row["lead_id"]] = row

    targets = []
    for lead_id, row in rows.items():
        if row["fetch_status"] != "blocked":
            continue
        if is_proxy_artifact(html_dir / f"{lead_id}.html"):
            info = lead_info.get(lead_id)
            if info:
                targets.append(fetcher.Lead(lead_id, info["domain"], info.get("email", "")))

    print(f"{len(targets)} leads still showing the proxy artifact; retrying with backoff")
    if not targets:
        return

    semaphore = asyncio.Semaphore(CONCURRENCY)
    limits = fetcher.httpx.Limits(max_connections=CONCURRENCY, max_keepalive_connections=CONCURRENCY)
    timeout = fetcher.httpx.Timeout(fetcher.TIMEOUT_SECONDS)

    async def worker(client, lead):
        async with semaphore:
            return await retry_lead(client, lead, html_dir)

    async with fetcher.httpx.AsyncClient(
        timeout=timeout, limits=limits, follow_redirects=True,
        max_redirects=fetcher.MAX_REDIRECTS, http2=False,
    ) as client:
        results = await asyncio.gather(*(worker(client, lead) for lead in targets))

    resolved = 0
    for r in results:
        rows[r.lead_id] = {
            "lead_id": r.lead_id,
            "domain": r.domain,
            "final_url": r.final_url,
            "http_status": r.http_status if r.http_status is not None else "",
            "bytes": r.num_bytes,
            "page_count": r.page_count,
            "fetch_status": r.fetch_status,
            "error_detail": r.error_detail,
        }
        if r.fetch_status == "ok":
            resolved += 1

    with fetch_log_path.open("w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=fetcher.FETCH_LOG_FIELDS)
        writer.writeheader()
        for row in rows.values():
            writer.writerow(row)

    still_stuck = sum(
        1 for lid in (t.lead_id for t in targets)
        if rows[lid]["fetch_status"] != "ok"
    )
    print(f"resolved {resolved} of {len(targets)}; {still_stuck} still failing after {MAX_ATTEMPTS} attempts")


if __name__ == "__main__":
    asyncio.run(main())
