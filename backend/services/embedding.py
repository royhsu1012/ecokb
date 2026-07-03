import asyncio

from google.genai import types

from services.gemini import EMBEDDING_MODEL, EMBEDDING_DIM, get_client
from services.rate_limit import embedding_limiter, with_retry

# 並發上限（配合 rate limiter 一起壓）
_semaphore = asyncio.Semaphore(8)


def _embed_sync(text: str, task_type: str) -> list[float]:
    result = get_client().models.embed_content(
        model=EMBEDDING_MODEL,
        contents=text,
        config=types.EmbedContentConfig(task_type=task_type, output_dimensionality=EMBEDDING_DIM),
    )
    return list(result.embeddings[0].values)


async def embed_text(text: str, task_type: str = "RETRIEVAL_QUERY") -> list[float]:
    async def _call() -> list[float]:
        await embedding_limiter.acquire()
        return await asyncio.to_thread(_embed_sync, text, task_type)

    return await with_retry(_call)


async def _embed_one(text: str) -> list[float]:
    async with _semaphore:
        return await embed_text(text, task_type="RETRIEVAL_DOCUMENT")


async def embed_batch(texts: list[str]) -> list[list[float]]:
    return list(await asyncio.gather(*[_embed_one(t) for t in texts]))
