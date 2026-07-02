from supabase import AsyncClient

BUCKET = "documents"


async def store_file(
    sb: AsyncClient,
    file_bytes: bytes,
    user_id: str,
    filename: str,
    mime_type: str = "application/octet-stream",
) -> dict:
    safe_name = filename.replace("/", "_").replace("\\", "_")
    path = f"{user_id}/{safe_name}"

    await sb.storage.from_(BUCKET).upload(
        path,
        file_bytes,
        file_options={"content-type": mime_type, "upsert": "true"},
    )
    url = sb.storage.from_(BUCKET).get_public_url(path)
    return {"drive_file_id": path, "drive_url": url}


async def delete_file(sb: AsyncClient, storage_path: str) -> None:
    try:
        await sb.storage.from_(BUCKET).remove([storage_path])
    except Exception:
        pass
