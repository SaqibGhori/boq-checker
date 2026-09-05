import truststore

truststore.inject_into_ssl()

import os

from dotenv import load_dotenv

load_dotenv()

from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from openai import OpenAIError

from app.extraction import extract_text_from_pdf
from app.llm_client import extract_line_items, compare_documents

MAX_FILE_SIZE = 5 * 1024 * 1024  # 5 MB

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=os.environ.get("FRONTEND_ORIGIN", "http://localhost:5173").split(","),
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health")
async def health():
    return {"status": "ok"}


async def _read_pdf_text(file: UploadFile, label: str) -> str:
    if file.content_type != "application/pdf":
        raise HTTPException(status_code=400, detail=f"{label}: only PDF files are supported")

    file_bytes = await file.read()
    if len(file_bytes) > MAX_FILE_SIZE:
        raise HTTPException(status_code=413, detail=f"{label}: file too large (max 5 MB)")

    try:
        text = extract_text_from_pdf(file_bytes)
    except Exception:
        raise HTTPException(status_code=422, detail=f"{label}: could not read this PDF — it may be corrupted")

    if not text.strip():
        raise HTTPException(
            status_code=422,
            detail=f"{label}: no extractable text found — this looks like a scanned/image PDF, which isn't supported yet",
        )
    return text


@app.post("/compare")
async def compare(invoice: UploadFile = File(...), boq: UploadFile = File(...)):
    invoice_text = await _read_pdf_text(invoice, "Invoice")
    boq_text = await _read_pdf_text(boq, "BOQ")

    try:
        invoice_items = extract_line_items(invoice_text)
        boq_items = extract_line_items(boq_text)
        result = compare_documents(invoice_items, boq_items)
    except OpenAIError:
        raise HTTPException(status_code=502, detail="The AI service is unavailable right now — please try again in a moment")
    except (RuntimeError, ValueError, KeyError):
        raise HTTPException(status_code=502, detail="The AI returned an unexpected response — please try again")

    return result
