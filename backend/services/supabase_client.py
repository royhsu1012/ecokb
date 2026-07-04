from supabase import create_async_client
from supabase._async.client import AsyncClient
from config import get_settings

_client: AsyncClient | None = None
_admin_client: AsyncClient | None = None


async def get_supabase() -> AsyncClient:
    global _client
    if _client is None:
        s = get_settings()
        _client = await create_async_client(s.supabase_url, s.supabase_service_key)
    return _client


async def get_admin_client() -> AsyncClient:
    """專供 auth.admin.* 使用的獨立 service-key client。

    sign_up / sign_in 會把 client 的 session 設成該使用者，導致後續 auth.admin.*
    改用使用者 token 而非 service key → 被擋。此 client 從不登入，session 永遠空，
    確保 admin 操作一律以 service key 進行。
    """
    global _admin_client
    if _admin_client is None:
        s = get_settings()
        _admin_client = await create_async_client(s.supabase_url, s.supabase_service_key)
    return _admin_client
