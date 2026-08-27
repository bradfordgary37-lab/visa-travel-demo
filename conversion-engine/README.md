# Conversion Engine

A standalone Python pipeline that fetches lead websites, extracts hard
signals from the markup, and classifies each lead by conversion gap (cart
recovery, engagement, follow-up, conversion, or multi-opportunity) using the
Claude API. It is unrelated to the rest of this repository (a Next.js travel
inquiry demo) — it lives in this subfolder as a self-contained tool.

## Pipeline

```
retry_queue.csv ─┐
                  ├─▶ fetcher.py ──▶ html/*.html, fetch_log.csv, dead_domains.csv
never_analysed_queue.csv ─┘

html/*.html + fetch_log.csv ──▶ extractor.py ──▶ signals.csv, signals.jsonl

signals.jsonl ──▶ classify.py ──▶ classified.csv, classified.jsonl  (Claude API, one call per lead)
```

1. **`fetcher.py`** (Layer 1, fetch) — async `httpx` fetcher, 12 concurrent
   workers, 25s timeout, https-first with http fallback only on outright
   connection failure, browser headers, one retry (3s backoff) on connection
   reset, DNS pre-check (dead domains go to `dead_domains.csv` and are not
   retried), homepage + one commerce page (`/cart`, `/checkout`, `/shop`,
   `/store`, `/products`) if linked from the homepage.

2. **`extractor.py`** (Layer 1, extract) — parses the saved HTML with
   `selectolax` into hard booleans/integers/strings: platform, commerce
   surface, lead-capture mechanisms, engagement widgets, trust/CTA signals,
   and the visible page text (whitespace-collapsed, capped at 6000 chars).
   **Absent is never inferred as `false`** — a field is `null` only when it
   genuinely can't be determined from the markup; everything else is a real
   boolean read off the DOM.

3. **`classify.py`** (Layer 3) — one Claude API call per lead, sends
   `business_name`, `domain`, the signals object (minus `page_text`), and
   `page_text` (capped at 6000 chars). Deliberately leaves out the lead's
   email (joined back locally by `lead_id` after classification) and
   pitch/strategy copy (joined in from an optional `--segment-matrix` CSV
   instead of being sent on every call). The system prompt enforces the
   rule that a `null` signal is "undetermined" (score 50, say so) while
   `false` is "affirmatively absent" (score the gap) — collapsing that
   distinction was the single biggest source of bad classifications in the
   run this pipeline replaces.

4. **`validate_sample.py`** — the required gate before a full run: classifies
   a 30-lead sample, pulls every lead scored `follow_up_score > 70`, and
   automatically cross-checks the raw HTML for a capture form. More than two
   or three mismatches means the prompt still needs work.

## Setup

```bash
cd conversion-engine
pip install -r requirements.txt
export ANTHROPIC_API_KEY=sk-ant-...
```

Place `retry_queue.csv` and `never_analysed_queue.csv` (columns: `lead_id`,
`domain`, `email`) in this directory. They are inputs to the pipeline and are
not included in this repo.

## Running

```bash
# Layer 1 — fetch, then extract
python3 fetcher.py
python3 extractor.py

# Layer 3 — validate on a 30-lead sample before spending the full budget
python3 validate_sample.py --sample 30

# Layer 3 — full run, once the sample looks right
python3 classify.py --segment-matrix segment_matrix.csv --business-names business_names.csv
```

Every script accepts `--help` for its full flag list (input/output paths,
concurrency, model, sample size).

### Optional joins

- `--business-names business_names.csv` — columns `lead_id,business_name`.
  Without it, `classify.py` derives a display name from the domain.
- `--segment-matrix segment_matrix.csv` — columns `segment,pitch,strategy`.
  Joined into the output by `primary_segment` after classification; never
  sent to the model.

## Outputs

| File | Written by | Contents |
|---|---|---|
| `html/{lead_id}.html`, `html/{lead_id}__page2.html` | `fetcher.py` | raw fetched HTML |
| `fetch_log.csv` | `fetcher.py` | lead_id, domain, final_url, http_status, bytes, page_count, fetch_status, error_detail |
| `dead_domains.csv` | `fetcher.py` | leads whose domain never resolved |
| `signals.csv`, `signals.jsonl` | `extractor.py` | one row/object per lead of extracted signals |
| `classified.csv`, `classified.jsonl` | `classify.py` | segment, scores, evidence per lead (email rejoined locally) |
| `validation_sample.csv`, `validation_sample.jsonl` | `validate_sample.py` | classification output for the 30-lead sample |
