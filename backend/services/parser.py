import base64
import hashlib
import io
from pathlib import Path

import fitz  # PyMuPDF
import mammoth
import pandas as pd

from services.ocr import ocr_pdf_page

# 非 ZIP 容器的明確 magic
MAGIC_BYTES: dict[bytes, str] = {
    b"%PDF": "pdf",
    b"\xff\xd8\xff": "jpg",
    b"\x89PNG": "png",
}
ZIP_MAGIC = b"PK\x03\x04"  # docx / xlsx 共用，需靠副檔名/mime 進一步區分


def detect_file_type(data: bytes, filename: str = "", mime: str = "") -> str:
    for magic, ext in MAGIC_BYTES.items():
        if data[: len(magic)] == magic:
            return ext
    suffix = Path(filename).suffix.lower().lstrip(".")
    # ZIP 容器（docx/xlsx）：優先用副檔名，其次 mime，預設 docx
    if data[: len(ZIP_MAGIC)] == ZIP_MAGIC:
        if suffix in ("xlsx", "docx"):
            return suffix
        if "spreadsheet" in mime or "excel" in mime:
            return "xlsx"
        return "docx"
    if suffix in ("pdf", "docx", "txt", "csv", "xlsx", "jpg", "jpeg", "png"):
        return "jpg" if suffix == "jpeg" else suffix
    if "pdf" in mime:
        return "pdf"
    return "txt"


def sha256(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()


def chunk_text(text: str, size: int = 400, overlap: int = 80) -> list[str]:
    chunks, start = [], 0
    while start < len(text):
        end = start + size
        chunks.append(text[start:end])
        start += size - overlap
    return [c for c in chunks if c.strip()]


async def parse_file(data: bytes, file_type: str) -> str:
    if file_type == "pdf":
        return await _parse_pdf(data)
    elif file_type == "docx":
        return _parse_docx(data)
    elif file_type in ("csv", "xlsx"):
        return _parse_tabular(data, file_type)
    elif file_type in ("jpg", "jpeg", "png"):
        return await _parse_image(data, file_type)
    else:
        return data.decode("utf-8", errors="ignore")


async def _parse_pdf(data: bytes) -> str:
    doc = fitz.open(stream=data, filetype="pdf")
    pages_text = []
    for page in doc:
        text = page.get_text().strip()
        if len(text) < 100:
            pix = page.get_pixmap(dpi=150)
            text = await ocr_pdf_page(pix.tobytes("png"))
        pages_text.append(text)
    return "\n\n".join(pages_text)


def _parse_docx(data: bytes) -> str:
    result = mammoth.extract_raw_text(io.BytesIO(data))
    return result.value


def _parse_tabular(data: bytes, file_type: str) -> str:
    if file_type == "csv":
        df = pd.read_csv(io.BytesIO(data))
    else:
        df = pd.read_excel(io.BytesIO(data))
    return df.to_string(index=False)


async def _parse_image(data: bytes, file_type: str) -> str:
    mime = "image/jpeg" if file_type in ("jpg", "jpeg") else "image/png"
    b64 = base64.standard_b64encode(data).decode()
    from services.ocr import ocr_image
    return await ocr_image(b64, media_type=mime)
