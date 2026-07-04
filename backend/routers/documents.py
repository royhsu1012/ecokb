from fastapi import APIRouter, HTTPException, UploadFile, File, Form, Depends, BackgroundTasks
from supabase._async.client import AsyncClient
from constants import MAX_UPLOAD_BYTES, CHUNK_SIZE, CHUNK_OVERLAP
from services.supabase_client import get_supabase
from services.parser import detect_file_type, sha256, parse_file, chunk_text
from services.embedding import embed_batch
from services.storage import store_file, delete_file
from services.keywords import extract_keywords
from dependencies import get_current_user, require_kb_ownership

router = APIRouter(prefix="/documents", tags=["documents"])


async def _set_status(sb: AsyncClient, doc_id: str, fields: dict) -> None:
    """狀態更新獨立包 try，避免更新本身失敗導致文件永久卡在中間狀態。"""
    try:
        await sb.table("documents").update(fields).eq("id", doc_id).execute()
    except Exception as e:  # noqa: BLE001
        print(f"[process] status update failed for {doc_id}: {e}")


async def _process_document(doc_id: str, kb_id: str, data: bytes, file_type: str, sb: AsyncClient):
    try:
        await _set_status(sb, doc_id, {"status": "parsing"})

        text = await parse_file(data, file_type)

        chunks = chunk_text(text, size=CHUNK_SIZE, overlap=CHUNK_OVERLAP)
        if not chunks:
            # 有檔案但解析不出內容（空白/純圖無字）→ 標 empty 而非 ready，避免誤導
            await _set_status(sb, doc_id, {"status": "empty", "chunk_count": 0})
            return

        await _set_status(sb, doc_id, {"status": "embedding"})
        embeddings = await embed_batch(chunks)

        rows = [
            {"doc_id": doc_id, "kb_id": kb_id, "content": chunk, "chunk_index": i, "embedding": emb}
            for i, (chunk, emb) in enumerate(zip(chunks, embeddings))
        ]
        await sb.table("chunks").insert(rows).execute()
        await _set_status(sb, doc_id, {"status": "ready", "chunk_count": len(chunks)})

        # 關鍵字供知識圖譜（混合：RPM 充裕走 Gemini，吃緊降級 jieba）。
        # 與 ready 狀態解耦、best-effort：keywords 欄位未建或抽取失敗都不影響文件完成。
        try:
            keywords = await extract_keywords(text, top_k=8)
            await sb.table("documents").update({"keywords": keywords}).eq("id", doc_id).execute()
        except Exception as e:  # noqa: BLE001
            print(f"[process] keyword store skipped for {doc_id}: {e}")

    except Exception as e:  # noqa: BLE001
        # 背景任務無 caller 承接 raise，改為記錄並確保狀態落地為 error
        print(f"[process] doc {doc_id} failed: {e}")
        await _set_status(sb, doc_id, {"status": "error"})


@router.post("/upload")
async def upload_document(
    background_tasks: BackgroundTasks,
    kb_id: str = Form(...),
    file: UploadFile = File(...),
    sb: AsyncClient = Depends(get_supabase),
    current_user: dict = Depends(get_current_user),
):
    user_id = current_user["user_id"]

    # 有界讀取：逐塊累積，超過上限即中止，避免惡意超大 body 吃光記憶體（Render 免費方案）
    data = b""
    while True:
        block = await file.read(1024 * 1024)
        if not block:
            break
        data += block
        if len(data) > MAX_UPLOAD_BYTES:
            raise HTTPException(status_code=413, detail="File too large (max 50MB)")
    if not data:
        raise HTTPException(status_code=400, detail="Empty file")
    file_hash = sha256(data)

    await require_kb_ownership(sb, kb_id, user_id)

    existing = await sb.table("documents").select("id").eq("hash", file_hash).eq("kb_id", kb_id).execute()
    if existing.data:
        raise HTTPException(status_code=409, detail="File already exists in this knowledge base")

    file_type = detect_file_type(data, file.filename or "", file.content_type or "")

    storage_info = await store_file(sb, data, user_id, file.filename or "upload", file.content_type or "application/octet-stream")

    doc = await sb.table("documents").insert({
        "kb_id": kb_id,
        "user_id": user_id,
        "filename": file.filename,
        "file_type": file_type,
        "status": "pending",
        "hash": file_hash,
        "storage_path": storage_info["storage_path"],
        "public_url": storage_info["public_url"],
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
    doc = await sb.table("documents").select("storage_path").eq("id", doc_id).eq("user_id", current_user["user_id"]).limit(1).execute()
    if not doc.data:
        raise HTTPException(status_code=404, detail="Document not found")

    await sb.table("chunks").delete().eq("doc_id", doc_id).execute()

    storage_path = doc.data[0].get("storage_path")
    if storage_path:
        await delete_file(sb, storage_path)

    await sb.table("documents").delete().eq("id", doc_id).execute()
    return {"message": "Deleted"}


@router.get("/{doc_id}/status")
async def get_document_status(
    doc_id: str,
    sb: AsyncClient = Depends(get_supabase),
    current_user: dict = Depends(get_current_user),
):
    result = await sb.table("documents").select("status,chunk_count").eq("id", doc_id).eq("user_id", current_user["user_id"]).limit(1).execute()
    if not result.data:
        raise HTTPException(status_code=404, detail="Document not found")
    return result.data[0]
