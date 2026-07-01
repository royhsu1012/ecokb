from fastapi import APIRouter, HTTPException, UploadFile, File, Form, Depends, BackgroundTasks
from supabase import AsyncClient
from services.supabase_client import get_supabase
from services.parser import detect_file_type, sha256, parse_file, chunk_text
from services.embedding import embed_batch
from services.storage import store_file, delete_file
from dependencies import get_current_user

router = APIRouter(prefix="/documents", tags=["documents"])


async def _process_document(doc_id: str, kb_id: str, data: bytes, file_type: str, sb: AsyncClient):
    try:
        await sb.table("documents").update({"status": "parsing"}).eq("id", doc_id).execute()

        text = await parse_file(data, file_type)

        await sb.table("documents").update({"status": "embedding"}).eq("id", doc_id).execute()

        chunks = chunk_text(text, size=400, overlap=80)
        if not chunks:
            await sb.table("documents").update({"status": "ready", "chunk_count": 0}).eq("id", doc_id).execute()
            return

        embeddings = await embed_batch(chunks)

        rows = [
            {
                "doc_id": doc_id,
                "kb_id": kb_id,
                "content": chunk,
                "chunk_index": i,
                "embedding": emb,
            }
            for i, (chunk, emb) in enumerate(zip(chunks, embeddings))
        ]

        await sb.table("chunks").insert(rows).execute()
        await sb.table("documents").update({"status": "ready", "chunk_count": len(chunks)}).eq("id", doc_id).execute()

    except Exception as e:
        await sb.table("documents").update({"status": "error"}).eq("id", doc_id).execute()
        raise


@router.post("/upload")
async def upload_document(
    background_tasks: BackgroundTasks,
    kb_id: str = Form(...),
    file: UploadFile = File(...),
    sb: AsyncClient = Depends(get_supabase),
    current_user: dict = Depends(get_current_user),
):
    user_id = current_user["user_id"]

    data = await file.read()
    if len(data) > 50 * 1024 * 1024:
        raise HTTPException(status_code=413, detail="File too large (max 50MB)")
    file_hash = sha256(data)

    # Verify kb belongs to this user
    kb = await sb.table("knowledge_bases").select("id").eq("id", kb_id).eq("user_id", user_id).execute()
    if not kb.data:
        raise HTTPException(status_code=403, detail="Knowledge base not found or access denied")

    # Dedup check
    existing = await sb.table("documents").select("id").eq("hash", file_hash).eq("kb_id", kb_id).execute()
    if existing.data:
        raise HTTPException(status_code=409, detail="File already exists in this knowledge base")

    file_type = detect_file_type(data, file.filename or "", file.content_type or "")

    drive_info = await store_file(data, user_id, file.filename or "upload", file.content_type or "application/octet-stream")

    doc = await sb.table("documents").insert({
        "kb_id": kb_id,
        "user_id": user_id,
        "filename": file.filename,
        "file_type": file_type,
        "status": "pending",
        "hash": file_hash,
        "drive_file_id": drive_info["drive_file_id"],
        "drive_url": drive_info["drive_url"],
    }).execute()

    doc_id = doc.data[0]["id"]
    background_tasks.add_task(_process_document, doc_id, kb_id, data, file_type, sb)

    return {"doc_id": doc_id, "status": "pending"}


@router.get("/kb/{kb_id}")
async def list_documents(
    kb_id: str,
    sb: AsyncClient = Depends(get_supabase),
    current_user: dict = Depends(get_current_user),
):
    result = await sb.table("documents").select("*").eq("kb_id", kb_id).eq("user_id", current_user["user_id"]).order("created_at", desc=True).execute()
    return result.data


@router.delete("/{doc_id}")
async def delete_document(
    doc_id: str,
    sb: AsyncClient = Depends(get_supabase),
    current_user: dict = Depends(get_current_user),
):
    doc = await sb.table("documents").select("drive_file_id").eq("id", doc_id).eq("user_id", current_user["user_id"]).single().execute()
    if not doc.data:
        raise HTTPException(status_code=404, detail="Document not found")

    await sb.table("chunks").delete().eq("doc_id", doc_id).execute()

    drive_file_id = doc.data.get("drive_file_id")
    if drive_file_id:
        try:
            await delete_file(drive_file_id)
        except Exception:
            pass

    await sb.table("documents").delete().eq("id", doc_id).execute()
    return {"message": "Deleted"}


@router.get("/{doc_id}/status")
async def get_document_status(
    doc_id: str,
    sb: AsyncClient = Depends(get_supabase),
    current_user: dict = Depends(get_current_user),
):
    result = await sb.table("documents").select("status,chunk_count").eq("id", doc_id).eq("user_id", current_user["user_id"]).single().execute()
    if not result.data:
        raise HTTPException(status_code=404, detail="Document not found")
    return result.data
