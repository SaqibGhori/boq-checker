import truststore

truststore.inject_into_ssl()

from dotenv import load_dotenv

load_dotenv()

from app.llm_client import extract_line_items, compare_documents

BOQ_TEXT = """
BILL OF QUANTITIES - Project Alpha Tower
Item                          Qty    Rate      Amount
OPC Cement 50kg bags          200    800       160000
TMT Steel Bars 12mm (ton)     10     95000     950000
Excavation work (cum)         500    150       75000
"""

INVOICE_TEXT = """
INVOICE #INV-2201
From: BuildRight Suppliers
Item                          Qty    Rate      Amount
Cement bags 50kg              200    950       190000
TMT Steel 12mm ton            10     95000     950000
Site Security Services        1      40000     40000
"""

print("Extracting BOQ...")
boq_items = extract_line_items(BOQ_TEXT)
print(boq_items.model_dump_json(indent=2))

print("\nExtracting Invoice...")
invoice_items = extract_line_items(INVOICE_TEXT)
print(invoice_items.model_dump_json(indent=2))

print("\nComparing...")
result = compare_documents(invoice_items, boq_items)
print(result.model_dump_json(indent=2))
