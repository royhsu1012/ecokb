import asyncio
import base64

from google.genai import types

from services.gemini import LLM_MODEL, get_client

OCR_PROMPT = "請將圖片中的所有文字完整轉錄出來，保持原有段落結構，支援繁體中文、英文及數字。只輸出文字內容，不要加說明。"


async def ocr_image(base64_img: str, media_type: str = "image/jpeg") -> str:
    img_bytes = base64.standard_b64decode(base64_img)
    return await asyncio.to_thread(_ocr_sync, img_bytes, media_type)


async def ocr_pdf_page(page_pixmap_bytes: bytes) -> str:
    return await asyncio.to_thread(_ocr_sync, page_pixmap_bytes, "image/png")


def _ocr_sync(img_bytes: bytes, mime_type: str) -> str:
    response = get_client().models.generate_content(
        model=LLM_MODEL,
        contents=[
            types.Part.from_bytes(data=img_bytes, mime_type=mime_type),
            OCR_PROMPT,
        ],
    )
    return response.text or ""
