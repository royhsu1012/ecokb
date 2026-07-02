import asyncio
import google.generativeai as genai
from config import get_settings

_configured = False


def _ensure_configured() -> None:
    global _configured
    if not _configured:
        genai.configure(api_key=get_settings().google_api_key)
        _configured = True


async def embed_text(text: str) -> list[float]:
    _ensure_configured()
    result = await asyncio.to_thread(
        genai.embed_content,
        model="models/text-embedding-004",
        content=text,
        task_type="retrieval_document",
    )
    return result["embedding"]


async def embed_batch(texts: list[str]) -> list[list[float]]:
    _ensure_configured()
    results = await asyncio.gather(*[
        asyncio.to_thread(
            genai.embed_content,
            model="models/text-embedding-004",
            content=t,
            task_type="retrieval_document",
        )
        for t in texts
    ])
    return [r["embedding"] for r in results]
