"""Shared helper: appends one batch of manually-produced Layer 3
classifications to classified.csv / classified.jsonl.
"""
import csv
import json
import os
import sys
sys.path.insert(0, ".")
import classify

EMAILS = {}
for path in ("retry_queue.csv", "never_analysed_queue.csv"):
    with open(path, newline="", encoding="utf-8") as f:
        for row in csv.DictReader(f):
            EMAILS[row["lead_id"]] = row["email"]

CSV_PATH = "classified.csv"
JSONL_PATH = "classified.jsonl"


def append_results(results):
    """results: list of tuples matching RESULTS shape used across batches:
    (lead_id, domain, business_name, primary, secondary, confidence, summary,
     conv, cart, eng, followup, ci, ev_conv, ev_cart, ev_eng, ev_followup,
     open_gap_count, disqualifier)
    """
    rows = []
    for (lead_id, domain, business_name, primary, secondary, confidence, summary,
         conv, cart, eng, followup, ci, ev_conv, ev_cart, ev_eng, ev_followup,
         open_gap_count, disqualifier) in results:
        rows.append({
            "lead_id": lead_id,
            "domain": domain,
            "email": EMAILS.get(lead_id, ""),
            "business_name": business_name,
            "primary_segment": primary,
            "secondary_segment": secondary,
            "confidence": confidence,
            "business_summary": summary,
            "conversion_score": conv,
            "cart_recovery_score": cart,
            "customer_engagement_score": eng,
            "follow_up_score": followup,
            "customer_intelligence_score": ci,
            "evidence_conversion": ev_conv,
            "evidence_cart_recovery": ev_cart,
            "evidence_engagement": ev_eng,
            "evidence_follow_up": ev_followup,
            "open_gap_count": open_gap_count,
            "disqualifier": disqualifier,
            "pitch": "",
            "strategy": "",
            "classification_error": "",
        })

    write_header = not os.path.exists(CSV_PATH)
    with open(CSV_PATH, "a", newline="", encoding="utf-8") as f:
        w = csv.DictWriter(f, fieldnames=classify.OUTPUT_FIELDS)
        if write_header:
            w.writeheader()
        for row in rows:
            w.writerow(row)

    with open(JSONL_PATH, "a", encoding="utf-8") as f:
        for row in rows:
            f.write(json.dumps(row, ensure_ascii=False) + "\n")

    return len(rows)
