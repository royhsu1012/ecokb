"""API 請求/回應模型：集中管理，router 只負責流程。"""
from pydantic import BaseModel, EmailStr


class RegisterRequest(BaseModel):
    email: EmailStr
    password: str
    admin_key: str = ""


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class ChatRequest(BaseModel):
    kb_id: str
    question: str
    conversation_id: str | None = None
    stream: bool = True


class KBRequest(BaseModel):
    name: str
