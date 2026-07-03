import asyncio
import base64

from services.gemini import get_model

OCR_PROMPT = "請將圖片中的所有文字完整轉錄出來，保持原有段落結構，支援繁體中文、英文及數字。只輸出文字內容，不要加說明。"


async def ocr_image(base64_img: str, media_type: str = "image/jpeg") -> str:
    return await asyncio.to_thread(_ocr_sync, base64_img, media_type)


async def ocr_pdf_page(page_pixmap_bytes: bytes) -> str:
    b64 = base64.standard_b64encode(page_pixmap_bytes).decode()
    return await ocr_image(b64, media_type="image/png")


def _ocr_sync(b64_img: str, mime_type: str) -> str:
    model = get_model()
    response = model.generate_content([
        {"inline_data": {"mime_type": mime_type, "data": b64_img}},
        OCR_PROMPT,
    ])
    return response.text
