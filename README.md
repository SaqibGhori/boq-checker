# BOQ Checker

Upload a contractor invoice and the original BOQ (Bill of Quantities) — get every
overcharge and out-of-scope item flagged automatically.

Construction projects start with a BOQ, a plan stating exactly what's needed and
what it should cost. Invoices come in later, and almost nobody has time to check
every line item against that original plan by hand. This tool automates that
check.

## How it works

1. Both documents (PDF) are read and their line items extracted via LLM
   tool-calling (same pattern as [invoice-extractor](https://github.com/SaqibGhori/invoice-extractor)).
2. The invoice's items are semantically matched against the BOQ's items —
   matching is done by meaning, not exact text (e.g. "OPC Cement 50kg bags" and
   "Cement bags" are recognized as the same item).
3. Each invoice item is flagged: `match`, `rate_mismatch` (priced higher than
   planned), or `not_in_scope` (never in the BOQ at all).
4. If the invoice and BOQ are in different currencies, amount totals are
   suppressed rather than shown as a misleading comparison — only the
   item-level scope flags are reported.

## Stack

- Backend: FastAPI + Groq (Llama 3.3 70B) via OpenAI-compatible tool-calling,
  `pdfplumber` for PDF text extraction.
- Frontend: React + Vite + Tailwind.

## Status

Early — validated on clean, simple synthetic documents. Real-world BOQs with
hundreds of line items and messier formatting haven't been tested yet.

Built by Haris.
