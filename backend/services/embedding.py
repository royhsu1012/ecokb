import voyageai
from config import get_settings

_client: voyageai.AsyncClient | None = None


def _get_client() -> voyageai.AsyncClient:
    global _client
    if _client is None:
        _client = voyageai.AsyncClient(api_key=get_settings().voyage_api_key)
    return _client


async def embed_text(text: str) -> list[float]:
    result = await _get_client().embed([text], model="voyage-3-lite")
    return result.embeddings[0]


async def embed_batch(texts: list[str]) -> list[list[float]]:
    result = await _get_client().embed(texts, model="voyage-3-lite")
    return result.embeddings
