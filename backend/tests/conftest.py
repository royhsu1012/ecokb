"""測試共用 fixtures：用 dependency override 換掉 Supabase 與認證，不需要真實 DB。"""
import sys
from pathlib import Path
from unittest.mock import AsyncMock, MagicMock

import pytest
from fastapi.testclient import TestClient

sys.path.insert(0, str(Path(__file__).parent.parent))

from main import app  # noqa: E402
from services.supabase_client import get_supabase  # noqa: E402
from dependencies import get_current_user  # noqa: E402

TEST_USER = {"user_id": "00000000-0000-0000-0000-000000000001", "email": "test@example.com"}


def make_query_result(data):
    result = MagicMock()
    result.data = data
    return result


@pytest.fixture
def mock_sb():
    """可鏈式呼叫的 Supabase mock：table().select().eq()...execute() 回傳預設空資料。"""
    sb = MagicMock()
    chain = MagicMock()
    for method in ("select", "eq", "order", "limit", "insert", "update", "delete"):
        getattr(chain, method).return_value = chain
    chain.execute = AsyncMock(return_value=make_query_result([]))
    sb.table.return_value = chain
    sb.rpc.return_value = chain
    sb._chain = chain  # 測試中可直接調整 execute 回傳值
    return sb


@pytest.fixture
def client(mock_sb):
    app.dependency_overrides[get_supabase] = lambda: mock_sb
    app.dependency_overrides[get_current_user] = lambda: TEST_USER
    yield TestClient(app)
    app.dependency_overrides.clear()


@pytest.fixture
def client_unauthenticated(mock_sb):
    app.dependency_overrides[get_supabase] = lambda: mock_sb
    yield TestClient(app)
    app.dependency_overrides.clear()
