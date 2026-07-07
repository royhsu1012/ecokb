"""API 請求/回應模型：集中管理，router 只負責流程。"""
from pydantic import BaseModel, EmailStr, Field

from constants import MAX_QUESTION_CHARS


class RegisterRequest(BaseModel):
    email: EmailStr
    password: str
    admin_key: str = ""


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class ChatRequest(BaseModel):
    kb_id: str
    question: str = Field(min_length=1, max_length=MAX_QUESTION_CHARS)
    conversation_id: str | None = None
    stream: bool = True


class KBRequest(BaseModel):
    name: str


class ConversationRequest(BaseModel):
    kb_id: str = ""
    title: str = "新對話"
