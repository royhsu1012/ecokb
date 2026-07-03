import asyncio

from google.genai import types

from services.gemini import EMBEDDING_MODEL, get_client

# Google 免費方案 embedding API 有速率限制，限制並發避免 429
_semaphore = asyncio.Semaphore(8)


def _embed_sync(text: str, task_type: str) -> list[float]:
    result = get_client().models.embed_content(
        model=EMBEDDING_MODEL,
        contents=text,
        config=types.EmbedContentConfig(task_type=task_type),
    )
    return list(result.embeddings[0].values)


async def embed_text(text: str, task_type: str = "RETRIEVAL_QUERY") -> list[float]:
    return await asyncio.to_thread(_embed_sync, text, task_type)


async def _embed_one(text: str) -> list[float]:
    async with _semaphore:
        return await embed_text(text, task_type="RETRIEVAL_DOCUMENT")


async def embed_batch(texts: list[str]) -> list[list[float]]:
    return list(await asyncio.gather(*[_embed_one(t) for t in texts]))
