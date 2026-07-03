from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from services.supabase_client import get_supabase
from supabase._async.client import AsyncClient

bearer_scheme = HTTPBearer(auto_error=False)


async def get_current_user(
    credentials: HTTPAuthorizationCredentials | None = Depends(bearer_scheme),
    sb: AsyncClient = Depends(get_supabase),
) -> dict:
    if not credentials:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Not authenticated")
    try:
        res = await sb.auth.get_user(credentials.credentials)
    except Exception:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid or expired token")
    if not res.user:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid or expired token")
    return {"user_id": res.user.id, "email": res.user.email}


async def require_kb_ownership(sb: AsyncClient, kb_id: str, user_id: str) -> None:
    """驗證知識庫屬於該使用者，否則拋 403。"""
    kb = await sb.table("knowledge_bases").select("id").eq("id", kb_id).eq("user_id", user_id).execute()
    if not kb.data:
        raise HTTPException(status_code=403, detail="Knowledge base not found or access denied")
