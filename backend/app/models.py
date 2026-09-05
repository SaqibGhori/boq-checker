from pydantic import BaseModel, Field


class LineItem(BaseModel):
    description: str
    quantity: float
    unit_rate: float
    amount: float


class DocumentItems(BaseModel):
    currency: str = Field(pattern=r"^[A-Z]{3}$")
    items: list[LineItem]


class ItemFlag(BaseModel):
    description: str
    invoice_amount: float
    boq_amount: float | None  # None if no match found in the BOQ at all
    status: str  # "match" | "rate_mismatch" | "not_in_scope"
    note: str


class ComparisonResult(BaseModel):
    currency: str
    currency_mismatch: bool  # true if the BOQ and invoice were in different currencies
    flags: list[ItemFlag]
    total_invoice: float
    total_boq_matched: float
    total_overcharge: float
