from openai import AsyncOpenAI
from config import get_settings

_client: AsyncOpenAI | None = None


def _get_client() -> AsyncOpenAI:
    global _client
    if _client is None:
        _client = AsyncOpenAI(api_key=get_settings().openai_api_key)
    return _client


async def embed_text(text: str) -> list[float]:
    response = await _get_client().embeddings.create(
        model="text-embedding-3-small",
        input=text,
    )
    return response.data[0].embedding


async def embed_batch(texts: list[str]) -> list[list[float]]:
    response = await _get_client().embeddings.create(
        model="text-embedding-3-small",
        input=texts,
    )
    return [d.embedding for d in sorted(response.data, key=lambda x: x.index)]
