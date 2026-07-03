"""Gemini API 統一設定層：所有服務透過這裡取得模型，避免設定散落各處。"""
import google.generativeai as genai
from config import get_settings

LLM_MODEL = "gemini-2.0-flash"
EMBEDDING_MODEL = "models/text-embedding-004"

_configured = False


def ensure_configured() -> None:
    global _configured
    if not _configured:
        genai.configure(api_key=get_settings().google_api_key)
        _configured = True


def get_model(system_instruction: str | None = None) -> genai.GenerativeModel:
    ensure_configured()
    return genai.GenerativeModel(LLM_MODEL, system_instruction=system_instruction)
