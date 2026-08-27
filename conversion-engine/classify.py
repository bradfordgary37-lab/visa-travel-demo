"""Layer 3 — classification.

One Anthropic API call per lead, batched with bounded concurrency. Reads
signals.jsonl (produced by extractor.py) and emits classified.csv /
classified.jsonl with the primary/secondary segment, five scores, and
evidence for each lead.

What is sent to the model, per lead: business_name, domain, the signals
object (minus page_text), and page_text capped at 6000 chars.

What is deliberately NOT sent (see task write-up):
  - the lead's email address — contributes nothing to classification and
    would put contact PII into every API call; it is joined back locally
    by lead_id after classification instead.
  - pitch/strategy copy — a fixed lookup by segment name, joined in after
    from --segment-matrix rather than paid for on every call.
  - any previous run's scores/segment — re-running should not be anchored
    to a prior answer.
"""
from __future__ import annotations

import argparse
import asyncio
import csv
import json
import re
from pathlib import Path
from typing import Any
from urllib.parse import urlparse

from anthropic import AsyncAnthropic, APIStatusError

SYSTEM_PROMPT_PATH = Path(__file__).parent / "prompts" / "system_prompt.txt"
PAGE_TEXT_CAP = 6000
DEFAULT_MODEL = "claude-sonnet-5"
DEFAULT_CONCURRENCY = 10
MAX_RETRIES = 2
RETRY_BACKOFF_SECONDS = 5

ALLOWED_SEGMENTS = {
    "Cart Recovery Opportunity",
    "Customer Engagement Opportunity",
    "Follow-up Opportunity",
    "Conversion Opportunity",
    "Multi-Opportunity",
    "Not a Good Fit",
    "Insufficient Data",
}
ALLOWED_CONFIDENCE = {"High", "Medium", "Low"}
SCORE_FIELDS = [
    "conversion_score", "cart_recovery_score", "customer_engagement_score",
    "follow_up_score", "customer_intelligence_score",
]

OUTPUT_FIELDS = [
    "lead_id", "domain", "email", "business_name",
    "primary_segment", "secondary_segment", "confidence", "business_summary",
    *SCORE_FIELDS,
    "evidence_conversion", "evidence_cart_recovery", "evidence_engagement", "evidence_follow_up",
    "open_gap_count", "disqualifier",
    "pitch", "strategy",
    "classification_error",
]


def load_jsonl(path: Path) -> list[dict[str, Any]]:
    rows = []
    with path.open(encoding="utf-8") as f:
        for line in f:
            line = line.strip()
            if line:
                rows.append(json.loads(line))
    return rows


def load_emails(*paths: Path) -> dict[str, str]:
    emails: dict[str, str] = {}
    for path in paths:
        if not path.exists():
            continue
        with path.open(newline="", encoding="utf-8") as f:
            for row in csv.DictReader(f):
                lead_id = (row.get("lead_id") or "").strip()
                if lead_id:
                    emails[lead_id] = (row.get("email") or "").strip()
    return emails


def load_business_names(path: Path | None) -> dict[str, str]:
    if not path or not path.exists():
        return {}
    names: dict[str, str] = {}
    with path.open(newline="", encoding="utf-8") as f:
        for row in csv.DictReader(f):
            lead_id = (row.get("lead_id") or "").strip()
            name = (row.get("business_name") or "").strip()
            if lead_id and name:
                names[lead_id] = name
    return names


def load_segment_matrix(path: Path | None) -> dict[str, dict[str, str]]:
    if not path or not path.exists():
        return {}
    matrix: dict[str, dict[str, str]] = {}
    with path.open(newline="", encoding="utf-8") as f:
        for row in csv.DictReader(f):
            segment = (row.get("segment") or "").strip()
            if segment:
                matrix[segment] = {
                    "pitch": row.get("pitch", ""),
                    "strategy": row.get("strategy", ""),
                }
    return matrix


def fallback_business_name(domain: str) -> str:
    host = urlparse(domain if "://" in domain else f"//{domain}", scheme="").hostname or domain
    host = re.sub(r"^www\.", "", host)
    stem = host.split(".")[0]
    return stem.replace("-", " ").replace("_", " ").title()


def build_user_message(business_name: str, domain: str, signals: dict[str, Any]) -> str:
    signals_for_prompt = {k: v for k, v in signals.items() if k != "page_text"}
    page_text = (signals.get("page_text") or "")[:PAGE_TEXT_CAP]
    return (
        f"business_name: {business_name}\n"
        f"domain: {domain}\n\n"
        f"SIGNALS:\n{json.dumps(signals_for_prompt, ensure_ascii=False)}\n\n"
        f"PAGE TEXT:\n{page_text}\n"
    )


def parse_classification(text: str) -> dict[str, Any]:
    text = text.strip()
    if text.startswith("```"):
        text = re.sub(r"^```(?:json)?\s*|\s*```$", "", text.strip(), flags=re.IGNORECASE)
    data = json.loads(text)

    if data.get("primary_segment") not in ALLOWED_SEGMENTS:
        raise ValueError(f"invalid primary_segment: {data.get('primary_segment')!r}")
    secondary = data.get("secondary_segment")
    if secondary is not None and secondary not in ALLOWED_SEGMENTS:
        raise ValueError(f"invalid secondary_segment: {secondary!r}")
    if data.get("confidence") not in ALLOWED_CONFIDENCE:
        raise ValueError(f"invalid confidence: {data.get('confidence')!r}")
    for field in SCORE_FIELDS:
        score = data.get(field)
        if not isinstance(score, (int, float)) or not (0 <= score <= 100):
            raise ValueError(f"invalid {field}: {score!r}")
    return data


def insufficient_data_row(error_detail: str) -> dict[str, Any]:
    return {
        "primary_segment": "Insufficient Data",
        "secondary_segment": None,
        "confidence": "Low",
        "business_summary": "",
        "conversion_score": 50, "cart_recovery_score": 50, "customer_engagement_score": 50,
        "follow_up_score": 50, "customer_intelligence_score": 50,
        "evidence": {"conversion": "", "cart_recovery": "", "engagement": "", "follow_up": ""},
        "open_gap_count": 0,
        "disqualifier": None,
        "classification_error": error_detail,
    }


async def classify_one(
    client: AsyncAnthropic, model: str, system_prompt: str, lead_id: str, user_message: str,
) -> dict[str, Any]:
    last_error = ""
    for attempt in range(MAX_RETRIES + 1):
        try:
            response = await client.messages.create(
                model=model,
                max_tokens=1024,
                system=system_prompt,
                messages=[{"role": "user", "content": user_message}],
            )
            text = "".join(block.text for block in response.content if block.type == "text")
            data = parse_classification(text)
            data["classification_error"] = ""
            return data
        except APIStatusError as exc:
            last_error = f"api_error status={exc.status_code}: {exc.message}"
            if exc.status_code in (429, 529, 500, 502, 503):
                await asyncio.sleep(RETRY_BACKOFF_SECONDS * (attempt + 1))
                continue
            break
        except (json.JSONDecodeError, ValueError) as exc:
            last_error = f"invalid_output: {exc}"
            continue
        except Exception as exc:  # noqa: BLE001
            last_error = f"unexpected_error: {exc}"
            break

    row = insufficient_data_row(last_error)
    return row


async def run(
    signals_rows: list[dict[str, Any]],
    emails: dict[str, str],
    business_names: dict[str, str],
    segment_matrix: dict[str, dict[str, str]],
    model: str,
    concurrency: int,
    out_csv: Path,
    out_jsonl: Path,
) -> list[dict[str, Any]]:
    system_prompt = SYSTEM_PROMPT_PATH.read_text(encoding="utf-8")
    client = AsyncAnthropic()
    semaphore = asyncio.Semaphore(concurrency)

    async def worker(signals: dict[str, Any]) -> dict[str, Any]:
        lead_id = signals["lead_id"]
        domain = signals.get("domain", "")
        business_name = business_names.get(lead_id) or fallback_business_name(domain)
        user_message = build_user_message(business_name, domain, signals)
        async with semaphore:
            result = await classify_one(client, model, system_prompt, lead_id, user_message)

        evidence = result.get("evidence") or {}
        pitch_strategy = segment_matrix.get(result.get("primary_segment", ""), {})
        return {
            "lead_id": lead_id,
            "domain": domain,
            "email": emails.get(lead_id, ""),
            "business_name": business_name,
            "primary_segment": result.get("primary_segment"),
            "secondary_segment": result.get("secondary_segment"),
            "confidence": result.get("confidence"),
            "business_summary": result.get("business_summary"),
            "conversion_score": result.get("conversion_score"),
            "cart_recovery_score": result.get("cart_recovery_score"),
            "customer_engagement_score": result.get("customer_engagement_score"),
            "follow_up_score": result.get("follow_up_score"),
            "customer_intelligence_score": result.get("customer_intelligence_score"),
            "evidence_conversion": evidence.get("conversion", ""),
            "evidence_cart_recovery": evidence.get("cart_recovery", ""),
            "evidence_engagement": evidence.get("engagement", ""),
            "evidence_follow_up": evidence.get("follow_up", ""),
            "open_gap_count": result.get("open_gap_count"),
            "disqualifier": result.get("disqualifier"),
            "pitch": pitch_strategy.get("pitch", ""),
            "strategy": pitch_strategy.get("strategy", ""),
            "classification_error": result.get("classification_error", ""),
        }

    rows = await asyncio.gather(*(worker(s) for s in signals_rows))

    out_csv.parent.mkdir(parents=True, exist_ok=True)
    with out_csv.open("w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=OUTPUT_FIELDS)
        writer.writeheader()
        for row in rows:
            writer.writerow(row)

    with out_jsonl.open("w", encoding="utf-8") as f:
        for row in rows:
            f.write(json.dumps(row, ensure_ascii=False) + "\n")

    errors = sum(1 for r in rows if r["classification_error"])
    print(f"classified {len(rows)} leads ({errors} fell back to Insufficient Data due to errors)")
    return rows


def main() -> None:
    parser = argparse.ArgumentParser(description="Classification (Layer 3)")
    parser.add_argument("--signals-jsonl", type=Path, default=Path("signals.jsonl"))
    parser.add_argument("--retry-queue", type=Path, default=Path("retry_queue.csv"))
    parser.add_argument("--never-analysed-queue", type=Path, default=Path("never_analysed_queue.csv"))
    parser.add_argument("--business-names", type=Path, default=None,
                         help="optional CSV: lead_id,business_name")
    parser.add_argument("--segment-matrix", type=Path, default=None,
                         help="optional CSV: segment,pitch,strategy — joined in after classification")
    parser.add_argument("--model", default=DEFAULT_MODEL)
    parser.add_argument("--concurrency", type=int, default=DEFAULT_CONCURRENCY)
    parser.add_argument("--sample", type=int, default=None,
                         help="only classify the first N leads (for validation before a full run)")
    parser.add_argument("--out-csv", type=Path, default=Path("classified.csv"))
    parser.add_argument("--out-jsonl", type=Path, default=Path("classified.jsonl"))
    args = parser.parse_args()

    signals_rows = load_jsonl(args.signals_jsonl)
    if args.sample is not None:
        signals_rows = signals_rows[: args.sample]
    if not signals_rows:
        raise SystemExit(f"No rows loaded from {args.signals_jsonl}")

    emails = load_emails(args.retry_queue, args.never_analysed_queue)
    business_names = load_business_names(args.business_names)
    segment_matrix = load_segment_matrix(args.segment_matrix)

    asyncio.run(run(
        signals_rows, emails, business_names, segment_matrix,
        args.model, args.concurrency, args.out_csv, args.out_jsonl,
    ))


if __name__ == "__main__":
    main()
