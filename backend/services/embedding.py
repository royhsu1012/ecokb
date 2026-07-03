import asyncio
import google.generativeai as genai
from config import get_settings

_configured = False

# Google 免費方案 embedding API 有速率限制，限制並發避免 429
_semaphore = asyncio.Semaphore(8)


def _ensure_configured() -> None:
    global _configured
    if not _configured:
        genai.configure(api_key=get_settings().google_api_key)
        _configured = True


async def embed_text(text: str, task_type: str = "retrieval_query") -> list[float]:
    _ensure_configured()
    result = await asyncio.to_thread(
        genai.embed_content,
        model="models/text-embedding-004",
        content=text,
        task_type=task_type,
    )
    return result["embedding"]


async def _embed_one(text: str) -> list[float]:
    async with _semaphore:
        return await embed_text(text, task_type="retrieval_document")


async def embed_batch(texts: list[str]) -> list[list[float]]:
    _ensure_configured()
    return list(await asyncio.gather(*[_embed_one(t) for t in texts]))
