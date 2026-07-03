import asyncio
import google.generativeai as genai

from services.gemini import EMBEDDING_MODEL, ensure_configured

# Google 免費方案 embedding API 有速率限制，限制並發避免 429
_semaphore = asyncio.Semaphore(8)


async def embed_text(text: str, task_type: str = "retrieval_query") -> list[float]:
    ensure_configured()
    result = await asyncio.to_thread(
        genai.embed_content,
        model=EMBEDDING_MODEL,
        content=text,
        task_type=task_type,
    )
    return result["embedding"]


async def _embed_one(text: str) -> list[float]:
    async with _semaphore:
        return await embed_text(text, task_type="retrieval_document")


async def embed_batch(texts: list[str]) -> list[list[float]]:
    return list(await asyncio.gather(*[_embed_one(t) for t in texts]))
