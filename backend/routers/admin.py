from fastapi import APIRouter, HTTPException, Depends
from supabase._async.client import AsyncClient

from services.supabase_client import get_supabase
from services.storage import delete_file
from dependencies import require_admin

router = APIRouter(prefix="/admin", tags=["admin"])


@router.get("/members")
async def list_members(
    sb: AsyncClient = Depends(get_supabase),
    admin: dict = Depends(require_admin),
):
    """列出所有會員（管理員限定）。"""
    res = await sb.auth.admin.list_users()
    users = res if isinstance(res, list) else getattr(res, "users", [])
    return [
        {
            "id": u.id,
            "email": u.email,
            "created_at": str(u.created_at) if u.created_at else None,
            "is_admin": bool((u.app_metadata or {}).get("is_admin")),
        }
        for u in users
    ]


@router.delete("/members/{user_id}")
async def delete_member(
    user_id: str,
    sb: AsyncClient = Depends(get_supabase),
    admin: dict = Depends(require_admin),
):
    """刪除會員及其所有資料（管理員限定，不可刪自己）。"""
    if user_id == admin["user_id"]:
        raise HTTPException(status_code=400, detail="無法刪除自己的帳號")

    # 先清 Storage 原始檔（不在 DB cascade 內），再刪 auth user（DB 靠 on delete cascade 連動）
    docs = await sb.table("documents").select("storage_path").eq("user_id", user_id).execute()
    for d in docs.data or []:
        path = d.get("storage_path")
        if path:
            await delete_file(sb, path)

    try:
        await sb.auth.admin.delete_user(user_id)
    except Exception as e:  # noqa: BLE001
        print(f"[admin] delete user failed: {e}")
        raise HTTPException(status_code=404, detail="會員不存在或刪除失敗")

    return {"message": "Member deleted"}
