import truststore

truststore.inject_into_ssl()

from dotenv import load_dotenv

load_dotenv()

from app.llm_client import extract_line_items, compare_documents

BOQ_TEXT_SAR = """
BILL OF QUANTITIES - Riyadh Tower Project
Currency: SAR
Item                          Qty    Rate      Amount
OPC Cement 50kg bags          200    80        16000
TMT Steel Bars 12mm (ton)     10     9500      95000
"""

INVOICE_TEXT_PKR = """
INVOICE #INV-991
Amounts in PKR
Item                          Qty    Rate      Amount
Cement bags 50kg              200    950       190000
Extra Labor Charges           1      40000     40000
"""

print("=== Currency mismatch test (SAR BOQ vs PKR invoice) ===")
boq_items = extract_line_items(BOQ_TEXT_SAR)
invoice_items = extract_line_items(INVOICE_TEXT_PKR)
print("BOQ currency:", boq_items.currency)
print("Invoice currency:", invoice_items.currency)

result = compare_documents(invoice_items, boq_items)
print(result.model_dump_json(indent=2))
