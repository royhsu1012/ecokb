import json
from fastapi import APIRouter, HTTPException, Depends
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from supabase import AsyncClient
from services.supabase_client import get_supabase
from services.rag import search_chunks, build_context
from services.llm import generate_answer

router = APIRouter(prefix="/chat", tags=["chat"])


class ChatRequest(BaseModel):
    kb_id: str
    question: str
    conversation_id: str | None = None
    stream: bool = True


@router.post("/ask")
async def ask(req: ChatRequest, sb: AsyncClient = Depends(get_supabase)):
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
            async with await generate_answer(req.question, context, stream=True) as s:
                async for text in s.text_stream:
                    yield "data: " + json.dumps({"text": text}) + "\n\n"
            yield "data: [DONE]\n\n"
        return StreamingResponse(_stream(), media_type="text/event-stream")

    answer = await generate_answer(req.question, context, stream=False)
    sources = [{"index": i + 1, "content": c["content"][:200]} for i, c in enumerate(chunks)]
    return {"answer": answer, "sources": sources}


class KBRequest(BaseModel):
    user_id: str
    name: str


@router.get("/kb/{user_id}")
async def list_kbs(user_id: str, sb: AsyncClient = Depends(get_supabase)):
    result = await sb.table("knowledge_bases").select("*").eq("user_id", user_id).execute()
    return result.data


@router.post("/kb")
async def create_kb(req: KBRequest, sb: AsyncClient = Depends(get_supabase)):
    result = await sb.table("knowledge_bases").insert({"user_id": req.user_id, "name": req.name}).execute()
    return result.data[0]
