from reportlab.pdfgen import canvas

def make_pdf(path, title, lines):
    c = canvas.Canvas(path)
    c.setFont("Helvetica-Bold", 14)
    c.drawString(50, 800, title)
    c.setFont("Helvetica", 11)
    y = 760
    for line in lines:
        c.drawString(50, y, line)
        y -= 20
    c.save()

make_pdf(
    "test_boq.pdf",
    "BILL OF QUANTITIES - Project Alpha Tower",
    [
        "Item                          Qty    Rate      Amount",
        "OPC Cement 50kg bags          200    800       160000",
        "TMT Steel Bars 12mm (ton)     10     95000     950000",
        "Excavation work (cum)         500    150       75000",
    ],
)

make_pdf(
    "test_invoice.pdf",
    "INVOICE #INV-2201 - BuildRight Suppliers",
    [
        "Item                          Qty    Rate      Amount",
        "Cement bags 50kg              200    950       190000",
        "TMT Steel 12mm ton            10     95000     950000",
        "Site Security Services        1      40000     40000",
    ],
)

print("done")
