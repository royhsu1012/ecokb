from fastapi import APIRouter, Depends
from supabase._async.client import AsyncClient
from services.supabase_client import get_supabase
from dependencies import get_current_user, require_kb_ownership

router = APIRouter(prefix="/graph", tags=["graph"])


@router.get("/{kb_id}")
async def get_graph(
    kb_id: str,
    sb: AsyncClient = Depends(get_supabase),
    current_user: dict = Depends(get_current_user),
):
    await require_kb_ownership(sb, kb_id, current_user["user_id"])

    docs = await sb.table("documents").select("id,filename,file_type,status").eq("kb_id", kb_id).execute()
    chunks = await sb.table("chunks").select("id,doc_id,content").eq("kb_id", kb_id).limit(200).execute()

    nodes = []
    links = []

    for doc in docs.data:
        nodes.append({
            "id": doc["id"],
            "label": doc["filename"],
            "type": "document",
            "meta": {"file_type": doc["file_type"], "status": doc["status"]},
        })

    # Extract simple keyword nodes from chunk content
    keyword_set: dict[str, str] = {}
    for chunk in chunks.data:
        words = set(chunk["content"].split())
        for w in words:
            w = w.strip("，。！？、（）()[]【】")
            if 2 <= len(w) <= 6 and w not in keyword_set:
                keyword_set[w] = chunk["doc_id"]
                if len(keyword_set) >= 80:
                    break
        if len(keyword_set) >= 80:
            break

    for kw, doc_id in keyword_set.items():
        kw_id = f"kw_{kw}"
        nodes.append({"id": kw_id, "label": kw, "type": "keyword", "meta": {}})
        links.append({"source": doc_id, "target": kw_id})

    return {"nodes": nodes, "links": links}
