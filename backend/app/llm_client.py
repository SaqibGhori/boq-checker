import json
import os
from openai import OpenAI

from app.models import DocumentItems, ComparisonResult

client = OpenAI(
    api_key=os.environ["GROQ_API_KEY"],
    base_url="https://api.groq.com/openai/v1",
    timeout=60.0,
    max_retries=1,
)

MODEL = os.environ["LLM_MODEL"]


LINE_ITEMS_TOOL = {
    "type": "function",
    "function": {
        "name": "record_line_items",
        "description": "Record every line item found in this document (a BOQ or an invoice).",
        "parameters": {
            "type": "object",
            "properties": {
                "currency": {
                    "type": "string",
                    "description": (
                        "ISO 4217 code of the currency the amounts are stated in (e.g. SAR, AED, PKR, USD, EGP). "
                        "Infer it from currency symbols, codes, or context (country, company location) even if "
                        "not explicitly labeled next to every number. Default to USD only if truly no signal exists."
                    ),
                },
                "items": {
                    "type": "array",
                    "items": {
                        "type": "object",
                        "properties": {
                            "description": {"type": "string", "description": "The item/work description as written."},
                            "quantity": {"type": "number"},
                            "unit_rate": {"type": "number", "description": "Rate per unit. 0 if not stated."},
                            "amount": {"type": "number", "description": "Line total for this item."},
                        },
                        "required": ["description", "quantity", "unit_rate", "amount"],
                    },
                },
            },
            "required": ["currency", "items"],
        },
    },
}


COMPARISON_TOOL = {
    "type": "function",
    "function": {
        "name": "record_comparison",
        "description": (
            "Compare an invoice's line items against the original BOQ (Bill of Quantities) line items. "
            "Match items by meaning, not exact text — e.g. 'OPC Cement 50kg bags' and 'Cement bags' are the same item. "
            "For every invoice item, decide: "
            "'match' (found in BOQ, amount is the same or reasonably close), "
            "'rate_mismatch' (found in BOQ, but invoice amount is higher than the BOQ amount for it), "
            "'not_in_scope' (no reasonable match exists in the BOQ at all — this item was never planned)."
        ),
        "parameters": {
            "type": "object",
            "properties": {
                "flags": {
                    "type": "array",
                    "items": {
                        "type": "object",
                        "properties": {
                            "description": {
                                "type": "string",
                                "description": "The invoice item's own description, copied exactly as it appears on the invoice. Never leave this blank, even for not_in_scope items.",
                            },
                            "invoice_amount": {"type": "number"},
                            "boq_amount": {
                                "type": "number",
                                "description": "The matched BOQ amount. Use -1 if no match was found (not_in_scope).",
                            },
                            "status": {"type": "string", "enum": ["match", "rate_mismatch", "not_in_scope"]},
                            "note": {
                                "type": "string",
                                "description": "One short sentence explaining the flag, e.g. 'BOQ allowed 45,000 for this, invoice shows 60,000'.",
                            },
                        },
                        "required": ["description", "invoice_amount", "boq_amount", "status", "note"],
                    },
                }
            },
            "required": ["flags"],
        },
    },
}


def _call_llm(prompt: str, tool: dict) -> dict:
    last_error: Exception | None = None
    for attempt in range(2):
        try:
            response = client.chat.completions.create(
                model=MODEL,
                max_tokens=4096,
                temperature=0,
                tools=[tool],
                tool_choice={"type": "function", "function": {"name": tool["function"]["name"]}},
                messages=[{"role": "user", "content": prompt}],
            )
            tool_calls = response.choices[0].message.tool_calls
            if not tool_calls:
                raise RuntimeError("Model did not return a tool call")
            return json.loads(tool_calls[0].function.arguments)
        except Exception as e:
            last_error = e
    raise last_error


def extract_line_items(document_text: str) -> DocumentItems:
    prompt = f"Extract every line item from this document:\n\n{document_text}"
    raw = _call_llm(prompt, LINE_ITEMS_TOOL)
    return DocumentItems(**raw)


def compare_documents(invoice_items: DocumentItems, boq_items: DocumentItems) -> ComparisonResult:
    currency_mismatch = invoice_items.currency != boq_items.currency

    currency_note = (
        f"WARNING: the invoice is in {invoice_items.currency} but the BOQ is in {boq_items.currency} — "
        "these are different currencies and the raw amounts are NOT directly comparable. "
        "Still match items by description as best you can, but every status should be 'rate_mismatch' or "
        "'not_in_scope' only based on whether the item/scope matches, not the raw amount — do not claim an "
        "amount overcharge across two different currencies.\n\n"
        if currency_mismatch
        else ""
    )

    prompt = (
        f"{currency_note}"
        f"Invoice line items (currency: {invoice_items.currency}):\n"
        f"{json.dumps([i.model_dump() for i in invoice_items.items], indent=2)}\n\n"
        f"BOQ / original plan line items (currency: {boq_items.currency}):\n"
        f"{json.dumps([i.model_dump() for i in boq_items.items], indent=2)}\n\n"
        "Compare every invoice item against the BOQ and flag it."
    )
    raw = _call_llm(prompt, COMPARISON_TOOL)

    flags = []
    for f in raw["flags"]:
        boq_amount = None if f["boq_amount"] == -1 else f["boq_amount"]
        flags.append({**f, "boq_amount": boq_amount})

    total_invoice = sum(i.amount for i in invoice_items.items)

    # If currencies differ, BOQ amounts and overcharge totals in the invoice's
    # currency would be meaningless — only report the invoice-side total and
    # let the flags (item-level, not amount-level) carry the finding.
    if currency_mismatch:
        total_boq_matched = 0.0
        total_overcharge = 0.0
    else:
        total_boq_matched = sum(f["boq_amount"] for f in flags if f["boq_amount"] is not None)
        total_overcharge = sum(
            f["invoice_amount"] - f["boq_amount"]
            for f in flags
            if f["status"] == "rate_mismatch" and f["boq_amount"] is not None
        ) + sum(f["invoice_amount"] for f in flags if f["status"] == "not_in_scope")

    return ComparisonResult(
        currency=invoice_items.currency,
        currency_mismatch=currency_mismatch,
        flags=flags,
        total_invoice=total_invoice,
        total_boq_matched=total_boq_matched,
        total_overcharge=total_overcharge,
    )
