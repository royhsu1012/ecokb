import json

from fastapi import APIRouter, HTTPException, Depends
from fastapi.responses import StreamingResponse
from supabase._async.client import AsyncClient

from services.supabase_client import get_supabase
from services.rag import search_chunks, build_context
from services.llm import stream_answer, complete_answer
from schemas import ChatRequest, KBRequest, ConversationRequest
from dependencies import get_current_user, require_kb_ownership

router = APIRouter(prefix="/chat", tags=["chat"])


async def _save_messages(sb: AsyncClient, conversation_id: str, question: str, answer: str) -> None:
    await sb.table("messages").insert([
        {"conversation_id": conversation_id, "role": "user", "content": question},
        {"conversation_id": conversation_id, "role": "assistant", "content": answer},
    ]).execute()


@router.post("/ask")
async def ask(
    req: ChatRequest,
    sb: AsyncClient = Depends(get_supabase),
    current_user: dict = Depends(get_current_user),
):
    await require_kb_ownership(sb, req.kb_id, current_user["user_id"])

    chunks = await search_chunks(sb, req.kb_id, req.question)
    if not chunks:
        no_data = "知識庫中未找到相關資料。"
        if req.conversation_id:
            await _save_messages(sb, req.conversation_id, req.question, no_data)
        if req.stream:
            async def _no_data():
                yield "data: " + json.dumps({"text": no_data}) + "\n\n"
                yield "data: [DONE]\n\n"
            return StreamingResponse(_no_data(), media_type="text/event-stream")
        return {"answer": no_data, "sources": []}

    context = build_context(chunks)

    if req.stream:
        async def _stream():
            full_answer = []
            async for text in stream_answer(req.question, context):
                full_answer.append(text)
                yield "data: " + json.dumps({"text": text}) + "\n\n"
            # 在送出 [DONE] 前先保存，避免客戶端斷線導致 generator 被取消、訊息遺失
            if req.conversation_id:
                await _save_messages(sb, req.conversation_id, req.question, "".join(full_answer))
            yield "data: [DONE]\n\n"
        return StreamingResponse(_stream(), media_type="text/event-stream")

    answer = await complete_answer(req.question, context)
    if req.conversation_id:
        await _save_messages(sb, req.conversation_id, req.question, answer)
    sources = [{"index": i + 1, "content": c["content"][:200]} for i, c in enumerate(chunks)]
    return {"answer": answer, "sources": sources}


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


# ---- Conversations（對話持久化）----

@router.get("/conversations")
async def list_conversations(
    kb_id: str,
    sb: AsyncClient = Depends(get_supabase),
    current_user: dict = Depends(get_current_user),
):
    await require_kb_ownership(sb, kb_id, current_user["user_id"])
    result = await sb.table("conversations").select("*").eq("kb_id", kb_id).eq("user_id", current_user["user_id"]).order("created_at", desc=True).execute()
    return result.data


@router.post("/conversations")
async def create_conversation(
    req: ConversationRequest,
    sb: AsyncClient = Depends(get_supabase),
    current_user: dict = Depends(get_current_user),
):
    await require_kb_ownership(sb, req.kb_id, current_user["user_id"])
    result = await sb.table("conversations").insert({
        "kb_id": req.kb_id,
        "user_id": current_user["user_id"],
        "title": req.title or "新對話",
    }).execute()
    return result.data[0]


@router.get("/conversations/{conversation_id}/messages")
async def list_messages(
    conversation_id: str,
    sb: AsyncClient = Depends(get_supabase),
    current_user: dict = Depends(get_current_user),
):
    conv = await sb.table("conversations").select("id").eq("id", conversation_id).eq("user_id", current_user["user_id"]).limit(1).execute()
    if not conv.data:
        raise HTTPException(status_code=404, detail="Conversation not found")
    result = await sb.table("messages").select("role,content,created_at").eq("conversation_id", conversation_id).order("created_at").execute()
    return result.data


@router.patch("/conversations/{conversation_id}")
async def rename_conversation(
    conversation_id: str,
    req: ConversationRequest,
    sb: AsyncClient = Depends(get_supabase),
    current_user: dict = Depends(get_current_user),
):
    result = await sb.table("conversations").update({"title": req.title}).eq("id", conversation_id).eq("user_id", current_user["user_id"]).execute()
    if not result.data:
        raise HTTPException(status_code=404, detail="Conversation not found")
    return result.data[0]


@router.delete("/conversations/{conversation_id}")
async def delete_conversation(
    conversation_id: str,
    sb: AsyncClient = Depends(get_supabase),
    current_user: dict = Depends(get_current_user),
):
    result = await sb.table("conversations").delete().eq("id", conversation_id).eq("user_id", current_user["user_id"]).execute()
    if not result.data:
        raise HTTPException(status_code=404, detail="Conversation not found")
    return {"message": "Deleted"}
