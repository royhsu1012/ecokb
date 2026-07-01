import base64
import anthropic
from config import get_settings

_client: anthropic.AsyncAnthropic | None = None


def _get_client() -> anthropic.AsyncAnthropic:
    global _client
    if _client is None:
        _client = anthropic.AsyncAnthropic(api_key=get_settings().anthropic_api_key)
    return _client


async def ocr_image(base64_img: str, media_type: str = "image/jpeg") -> str:
    client = _get_client()
    response = await client.messages.create(
        model="claude-sonnet-4-6",
        max_tokens=4096,
        messages=[
            {
                "role": "user",
                "content": [
                    {
                        "type": "image",
                        "source": {
                            "type": "base64",
                            "media_type": media_type,
                            "data": base64_img,
                        },
                    },
                    {
                        "type": "text",
                        "text": "請將圖片中的所有文字完整轉錄出來，保持原有段落結構，支援繁體中文、英文及數字。只輸出文字內容，不要加說明。",
                    },
                ],
            }
        ],
    )
    return response.content[0].text


async def ocr_pdf_page(page_pixmap_bytes: bytes) -> str:
    b64 = base64.standard_b64encode(page_pixmap_bytes).decode()
    return await ocr_image(b64, media_type="image/png")
