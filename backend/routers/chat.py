import json
from fastapi import APIRouter, HTTPException, Depends
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from supabase import AsyncClient
from services.supabase_client import get_supabase
from services.rag import search_chunks, build_context
from services.llm import stream_answer, complete_answer
from dependencies import get_current_user

router = APIRouter(prefix="/chat", tags=["chat"])


class ChatRequest(BaseModel):
    kb_id: str
    question: str
    conversation_id: str | None = None
    stream: bool = True


@router.post("/ask")
async def ask(
    req: ChatRequest,
    sb: AsyncClient = Depends(get_supabase),
    current_user: dict = Depends(get_current_user),
):
    kb = await sb.table("knowledge_bases").select("id").eq("id", req.kb_id).eq("user_id", current_user["user_id"]).execute()
    if not kb.data:
        raise HTTPException(status_code=403, detail="Knowledge base not found or access denied")

    chunks = await search_chunks(sb, req.kb_id, req.question)
    if not chunks:
        if req.stream:
            async def _no_data():
                yield "data: " + json.dumps({"text": "知識庫中未找到相關資料。"}) + "\n\n"
                yield "data: [DONE]\n\n"
            return StreamingResponse(_no_data(), media_type="text/event-stream")
        return {"answer": "知識庫中未找到相關資料。", "sources": []}

    context = build_context(chunks)

    if req.stream:
        async def _stream():
            async for text in stream_answer(req.question, context):
                yield "data: " + json.dumps({"text": text}) + "\n\n"
            yield "data: [DONE]\n\n"
        return StreamingResponse(_stream(), media_type="text/event-stream")

    answer = await complete_answer(req.question, context)
    sources = [{"index": i + 1, "content": c["content"][:200]} for i, c in enumerate(chunks)]
    return {"answer": answer, "sources": sources}


class KBRequest(BaseModel):
    name: str


@router.get("/kb/{user_id}")
async def list_kbs(
    user_id: str,
    sb: AsyncClient = Depends(get_supabase),
    current_user: dict = Depends(get_current_user),
):
    if user_id != current_user["user_id"]:
        raise HTTPException(status_code=403, detail="Access denied")
    result = await sb.table("knowledge_bases").select("*").eq("user_id", user_id).execute()
    return result.data


@router.post("/kb")
async def create_kb(
    req: KBRequest,
    sb: AsyncClient = Depends(get_supabase),
    current_user: dict = Depends(get_current_user),
):
    result = await sb.table("knowledge_bases").insert({"user_id": current_user["user_id"], "name": req.name}).execute()
    return result.data[0]
