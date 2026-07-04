from supabase._async.client import AsyncClient
from constants import SIMILARITY_THRESHOLD
from services.embedding import embed_text

# 相似度門檻（SIMILARITY_THRESHOLD，定義於 constants.py）：match_chunks 一律回傳最接近
# 的 top_k 筆（無論相關與否），低於此值視為「知識庫無相關資料」，交由上層改用通用模式。
# 依 gemini-embedding-001 實測：切題約 0.7+、不切題約 0.5，0.6 為安全分界。


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

    rows = result.data or []
    return [r for r in rows if r.get("similarity", 0) >= SIMILARITY_THRESHOLD]


def build_context(chunks: list[dict]) -> str:
    parts = []
    for i, chunk in enumerate(chunks, 1):
        parts.append(f"[來源 {i}] {chunk.get('content', '')}")
    return "\n\n".join(parts)
