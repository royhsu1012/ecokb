import asyncio

from fastapi import APIRouter, Depends
from supabase._async.client import AsyncClient
from services.supabase_client import get_supabase
from services.keywords import jieba_keywords
from dependencies import get_current_user, require_kb_ownership

router = APIRouter(prefix="/graph", tags=["graph"])

KEYWORDS_PER_DOC = 8


@router.get("/{kb_id}")
async def get_graph(
    kb_id: str,
    sb: AsyncClient = Depends(get_supabase),
    current_user: dict = Depends(get_current_user),
):
    await require_kb_ownership(sb, kb_id, current_user["user_id"])

    # keywords 欄位若尚未建立（migration 未跑）則退回無此欄位查詢，全部走 jieba 即時補
    try:
        docs = await sb.table("documents").select("id,filename,file_type,status,keywords").eq("kb_id", kb_id).execute()
    except Exception:
        docs = await sb.table("documents").select("id,filename,file_type,status").eq("kb_id", kb_id).execute()

    nodes = []
    links = []
    doc_keywords: dict[str, list[str]] = {}
    missing: list[str] = []  # 尚無已存關鍵字的文件（舊資料）

    for doc in docs.data:
        nodes.append({
            "id": doc["id"],
            "label": doc["filename"],
            "type": "document",
            "meta": {"file_type": doc["file_type"], "status": doc["status"]},
        })
        kws = doc.get("keywords") or []
        if kws:
            doc_keywords[doc["id"]] = kws
        else:
            missing.append(doc["id"])

    # 舊文件無已存關鍵字 → 即時用 jieba 補（無 API），不回填 DB（只影響本次顯示）
    if missing:
        chunks = await sb.table("chunks").select("doc_id,content").in_("doc_id", missing).limit(500).execute()
        text_by_doc: dict[str, list[str]] = {}
        for c in chunks.data:
            text_by_doc.setdefault(c["doc_id"], []).append(c["content"])

        def _fallback() -> dict[str, list[str]]:
            return {d: jieba_keywords("\n".join(parts), KEYWORDS_PER_DOC) for d, parts in text_by_doc.items()}

        doc_keywords.update(await asyncio.to_thread(_fallback))

    kw_nodes: dict[str, dict] = {}
    for doc_id, kws in doc_keywords.items():
        for kw in kws:
            kw_id = f"kw_{kw}"
            if kw_id not in kw_nodes:
                kw_nodes[kw_id] = {"id": kw_id, "label": kw, "type": "keyword", "meta": {}}
            links.append({"source": doc_id, "target": kw_id})

    nodes.extend(kw_nodes.values())
    return {"nodes": nodes, "links": links}
