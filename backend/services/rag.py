from supabase._async.client import AsyncClient
from services.embedding import embed_text


async def search_chunks(
    supabase: AsyncClient,
    kb_id: str,
    query: str,
    top_k: int = 5,
) -> list[dict]:
    query_embedding = await embed_text(query)

    result = await supabase.rpc(
        "match_chunks",
        {
            "query_embedding": query_embedding,
            "match_kb_id": kb_id,
            "match_count": top_k,
        },
    ).execute()

    return result.data or []


def build_context(chunks: list[dict]) -> str:
    parts = []
    for i, chunk in enumerate(chunks, 1):
        parts.append(f"[來源 {i}] {chunk.get('content', '')}")
    return "\n\n".join(parts)
