from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel, EmailStr
from supabase._async.client import AsyncClient
from services.supabase_client import get_supabase
from config import get_settings

router = APIRouter(prefix="/auth", tags=["auth"])


class RegisterRequest(BaseModel):
    email: EmailStr
    password: str
    admin_key: str = ""


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


@router.post("/register")
async def register(req: RegisterRequest, sb: AsyncClient = Depends(get_supabase)):
    settings = get_settings()
    is_admin = req.admin_key == settings.admin_secret_key

    try:
        res = await sb.auth.sign_up({"email": req.email, "password": req.password})
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

    user = res.user
    if not user:
        raise HTTPException(status_code=400, detail="Registration failed")

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
    except Exception as e:
        raise HTTPException(status_code=401, detail="Invalid credentials")

    session = res.session
    if not session:
        raise HTTPException(status_code=401, detail="Login failed")

    return {
        "access_token": session.access_token,
        "refresh_token": session.refresh_token,
        "user_id": res.user.id,
        "email": res.user.email,
    }


@router.post("/logout")
async def logout():
    # JWT is stateless; actual invalidation happens client-side by clearing the token.
    return {"message": "Logged out"}
