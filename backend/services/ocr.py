import asyncio
import base64
import google.generativeai as genai
from config import get_settings


async def ocr_pdf_page(page_pixmap_bytes: bytes) -> str:
    b64 = base64.standard_b64encode(page_pixmap_bytes).decode()
    return await asyncio.to_thread(_ocr_sync, b64)


def _ocr_sync(b64_png: str) -> str:
    genai.configure(api_key=get_settings().google_api_key)
    model = genai.GenerativeModel("gemini-2.0-flash")
    response = model.generate_content([
        {"inline_data": {"mime_type": "image/png", "data": b64_png}},
        "請將圖片中的所有文字完整轉錄出來，保持原有段落結構，支援繁體中文、英文及數字。只輸出文字內容，不要加說明。",
    ])
    return response.text
