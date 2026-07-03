"""Gemini API 統一設定層：所有服務透過這裡取得 client，避免設定散落各處。

使用新版 google-genai SDK（google-generativeai 已於 2025 停止維護）。
"""
from google import genai
from config import get_settings

LLM_MODEL = "gemini-2.0-flash"
EMBEDDING_MODEL = "text-embedding-004"

_client: genai.Client | None = None


def get_client() -> genai.Client:
    global _client
    if _client is None:
        _client = genai.Client(api_key=get_settings().google_api_key)
    return _client
