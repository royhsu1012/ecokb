from supabase import create_async_client
from supabase._async.client import AsyncClient
from config import get_settings

_client: AsyncClient | None = None


async def get_supabase() -> AsyncClient:
    global _client
    if _client is None:
        s = get_settings()
        _client = await create_async_client(s.supabase_url, s.supabase_service_key)
    return _client
