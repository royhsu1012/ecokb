import hmac

from fastapi import APIRouter, HTTPException, Depends
from supabase._async.client import AsyncClient

from services.supabase_client import get_supabase
from schemas import RegisterRequest, LoginRequest
from config import get_settings

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/register")
async def register(req: RegisterRequest, sb: AsyncClient = Depends(get_supabase)):
    settings = get_settings()
    # 常數時間比較避免時序側信道；金鑰未設定（空字串）時一律視為非管理員
    is_admin = bool(settings.admin_secret_key) and hmac.compare_digest(
        req.admin_key, settings.admin_secret_key
    )

    try:
        res = await sb.auth.sign_up({"email": req.email, "password": req.password})
    except Exception as e:  # noqa: BLE001
        # 內部細節僅記錄於伺服器，對外泛化避免資訊洩漏 / 使用者列舉
        print(f"[auth] register failed: {e}")
        raise HTTPException(status_code=400, detail="註冊失敗，請確認 email 格式與密碼強度後再試")

    user = res.user
    if not user:
        raise HTTPException(status_code=400, detail="註冊失敗，請稍後再試")

    # 管理員身份存進 app_metadata（伺服器控制、使用者無法竄改）
    if is_admin:
        try:
            await sb.auth.admin.update_user_by_id(user.id, {"app_metadata": {"is_admin": True}})
        except Exception as e:  # noqa: BLE001
            print(f"[auth] set admin metadata failed: {e}")

    # Create default knowledge base
    await sb.table("knowledge_bases").insert({
        "user_id": user.id,
        "name": "我的知識庫",
    }).execute()

    return {"user_id": user.id, "email": user.email, "is_admin": is_admin}


@router.post("/login")
async def login(req: LoginRequest, sb: AsyncClient = Depends(get_supabase)):
    try:
        res = await sb.auth.sign_in_with_password({"email": req.email, "password": req.password})
    except Exception:
        raise HTTPException(status_code=401, detail="Invalid credentials")

    session = res.session
    if not session:
        raise HTTPException(status_code=401, detail="Login failed")

    return {
        "access_token": session.access_token,
        "refresh_token": session.refresh_token,
        "user_id": res.user.id,
        "email": res.user.email,
        "is_admin": bool((res.user.app_metadata or {}).get("is_admin")),
    }


@router.post("/logout")
async def logout():
    # JWT is stateless; actual invalidation happens client-side by clearing the token.
    return {"message": "Logged out"}
