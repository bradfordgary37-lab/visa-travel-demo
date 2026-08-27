"""Validation gate before the full Layer 3 run.

Per the task write-up: classify a 30-lead sample, pull every lead where
follow_up_score > 70, and confirm in the raw HTML that no capture form
actually exists. If more than two or three of those are wrong, the prompt
still needs work and a full run would just mass-produce the error.

This script automates the cross-check: it re-parses each flagged lead's
saved HTML with extractor.py's own logic and reports a MISMATCH whenever the
markup actually shows an email/contact form (has_email_form, has_contact_form,
or non-null form_evidence) despite the model having scored follow_up_score
over the threshold. A human should still eyeball the mismatches — the point
of this script is to make that spot-check cheap, not to replace it.
"""
from __future__ import annotations

import argparse
import asyncio
from pathlib import Path

import classify
import extractor

FOLLOW_UP_THRESHOLD = 70


def load_pages(html_dir: Path, lead_id: str) -> list[str]:
    homepage = html_dir / f"{lead_id}.html"
    if not homepage.exists():
        return []
    pages = [homepage.read_text(encoding="utf-8", errors="replace")]
    page2 = html_dir / f"{lead_id}__page2.html"
    if page2.exists():
        pages.append(page2.read_text(encoding="utf-8", errors="replace"))
    return pages


async def main_async(args: argparse.Namespace) -> None:
    signals_rows = classify.load_jsonl(args.signals_jsonl)[: args.sample]
    if not signals_rows:
        raise SystemExit(f"No rows loaded from {args.signals_jsonl}")

    emails = classify.load_emails(args.retry_queue, args.never_analysed_queue)
    business_names = classify.load_business_names(args.business_names)
    segment_matrix = classify.load_segment_matrix(args.segment_matrix)

    rows = await classify.run(
        signals_rows, emails, business_names, segment_matrix,
        args.model, args.concurrency, args.out_csv, args.out_jsonl,
    )

    flagged = [r for r in rows if (r.get("follow_up_score") or 0) > FOLLOW_UP_THRESHOLD]
    print(f"\n{len(flagged)} of {len(rows)} sampled leads scored follow_up_score > {FOLLOW_UP_THRESHOLD}")

    mismatches = []
    for row in flagged:
        pages = load_pages(args.html_dir, row["lead_id"])
        if not pages:
            print(f"  {row['lead_id']} ({row['domain']}): no saved HTML found, skipping cross-check")
            continue
        signals = extractor.extract_signals_from_pages(pages)
        looks_like_capture_exists = (
            signals["has_email_form"] or signals["has_contact_form"] or bool(signals["form_evidence"])
        )
        marker = "MISMATCH" if looks_like_capture_exists else "ok"
        if looks_like_capture_exists:
            mismatches.append(row)
        print(
            f"  [{marker}] {row['lead_id']} ({row['domain']}) follow_up_score={row['follow_up_score']} "
            f"has_email_form={signals['has_email_form']} has_contact_form={signals['has_contact_form']} "
            f"form_evidence={signals['form_evidence']!r} "
            f"model_evidence={row['evidence_follow_up']!r}"
        )

    print(f"\n{len(mismatches)} mismatch(es) out of {len(flagged)} flagged leads.")
    if len(mismatches) > 3:
        print(
            "More than two or three are wrong — the prompt still needs work. "
            "A full run would just mass-produce this error. Do not proceed."
        )
    else:
        print("Within tolerance — safe to proceed to the full run.")


def main() -> None:
    parser = argparse.ArgumentParser(description="30-lead validation gate before the full Layer 3 run")
    parser.add_argument("--signals-jsonl", type=Path, default=Path("signals.jsonl"))
    parser.add_argument("--html-dir", type=Path, default=Path("html"))
    parser.add_argument("--retry-queue", type=Path, default=Path("retry_queue.csv"))
    parser.add_argument("--never-analysed-queue", type=Path, default=Path("never_analysed_queue.csv"))
    parser.add_argument("--business-names", type=Path, default=None)
    parser.add_argument("--segment-matrix", type=Path, default=None)
    parser.add_argument("--model", default=classify.DEFAULT_MODEL)
    parser.add_argument("--concurrency", type=int, default=classify.DEFAULT_CONCURRENCY)
    parser.add_argument("--sample", type=int, default=30)
    parser.add_argument("--out-csv", type=Path, default=Path("validation_sample.csv"))
    parser.add_argument("--out-jsonl", type=Path, default=Path("validation_sample.jsonl"))
    args = parser.parse_args()

    asyncio.run(main_async(args))


if __name__ == "__main__":
    main()
