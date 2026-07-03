import re
import uuid
from pathlib import Path

from supabase._async.client import AsyncClient

BUCKET = "documents"


def _safe_key(filename: str) -> str:
    """產生 ASCII-safe 的 storage object key。

    Supabase Storage 的 object key 不接受非 ASCII 字元（中文檔名會導致上傳失敗），
    故僅保留副檔名，主檔名以隨機碼取代；原始檔名另存於 DB filename 欄位。
    """
    ext = Path(filename).suffix.lower()
    ext = ext if re.fullmatch(r"\.[A-Za-z0-9]{1,8}", ext or "") else ""
    return f"{uuid.uuid4().hex}{ext}"


async def store_file(
    sb: AsyncClient,
    file_bytes: bytes,
    user_id: str,
    filename: str,
    mime_type: str = "application/octet-stream",
) -> dict:
    path = f"{user_id}/{_safe_key(filename)}"

    await sb.storage.from_(BUCKET).upload(
        path,
        file_bytes,
        file_options={"content-type": mime_type, "upsert": "true"},
    )
    url = await sb.storage.from_(BUCKET).get_public_url(path)
    return {"storage_path": path, "public_url": url}


async def delete_file(sb: AsyncClient, storage_path: str) -> None:
    try:
        await sb.storage.from_(BUCKET).remove([storage_path])
    except Exception:
        pass
