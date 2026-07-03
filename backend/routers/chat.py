import json

from fastapi import APIRouter, HTTPException, Depends
from fastapi.responses import StreamingResponse
from supabase._async.client import AsyncClient

from services.supabase_client import get_supabase
from services.rag import search_chunks, build_context
from services.llm import (
    stream_answer, complete_answer, stream_general, complete_general,
    GENERAL_DISCLAIMER, LLMError,
)
from schemas import ChatRequest, KBRequest, ConversationRequest
from dependencies import get_current_user, require_kb_ownership, require_conversation_ownership

router = APIRouter(prefix="/chat", tags=["chat"])

STREAM_ERROR_TEXT = "\n\n⚠️ 生成失敗，請稍後再試。"


async def _save_messages(sb: AsyncClient, conversation_id: str, question: str, answer: str) -> None:
    await sb.table("messages").insert([
        {"conversation_id": conversation_id, "role": "user", "content": question},
        {"conversation_id": conversation_id, "role": "assistant", "content": answer},
    ]).execute()


def _sources_of(chunks: list[dict]) -> list[dict]:
    return [{"index": i + 1, "content": c["content"][:200]} for i, c in enumerate(chunks)]


@router.post("/ask")
async def ask(
    req: ChatRequest,
    sb: AsyncClient = Depends(get_supabase),
    current_user: dict = Depends(get_current_user),
):
    await require_kb_ownership(sb, req.kb_id, current_user["user_id"])
    # 有帶 conversation_id 時，驗證該對話屬於此使用者且屬於此知識庫（防跨對話寫入）
    if req.conversation_id:
        await require_conversation_ownership(sb, req.conversation_id, current_user["user_id"], req.kb_id)

    chunks = await search_chunks(sb, req.kb_id, req.question)
    if not chunks:
        # 混合模式：知識庫無相關資料 → 用 AI 通用知識回答，並標註來源以區分
        if req.stream:
            async def _general():
                full = [GENERAL_DISCLAIMER]
                yield "data: " + json.dumps({"text": GENERAL_DISCLAIMER}) + "\n\n"
                try:
                    async for text in stream_general(req.question):
                        full.append(text)
                        yield "data: " + json.dumps({"text": text}) + "\n\n"
                except LLMError:
                    # 生成失敗：對外泛化訊息、不存入對話
                    yield "data: " + json.dumps({"text": STREAM_ERROR_TEXT}) + "\n\n"
                    yield "data: [DONE]\n\n"
                    return
                if req.conversation_id:
                    await _save_messages(sb, req.conversation_id, req.question, "".join(full))
                yield "data: [DONE]\n\n"
            return StreamingResponse(_general(), media_type="text/event-stream")
        answer = GENERAL_DISCLAIMER + await complete_general(req.question)
        if req.conversation_id:
            await _save_messages(sb, req.conversation_id, req.question, answer)
        return {"answer": answer, "sources": []}

    context = build_context(chunks)
    sources = _sources_of(chunks)

    if req.stream:
        async def _stream():
            full_answer = []
            try:
                async for text in stream_answer(req.question, context):
                    full_answer.append(text)
                    yield "data: " + json.dumps({"text": text}) + "\n\n"
            except LLMError:
                yield "data: " + json.dumps({"text": STREAM_ERROR_TEXT}) + "\n\n"
                yield "data: [DONE]\n\n"
                return
            # 串流結束前補送來源，並在 [DONE] 前保存（避免斷線遺失）
            yield "data: " + json.dumps({"sources": sources}) + "\n\n"
            if req.conversation_id:
                await _save_messages(sb, req.conversation_id, req.question, "".join(full_answer))
            yield "data: [DONE]\n\n"
        return StreamingResponse(_stream(), media_type="text/event-stream")

    answer = await complete_answer(req.question, context)
    if req.conversation_id:
        await _save_messages(sb, req.conversation_id, req.question, answer)
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
