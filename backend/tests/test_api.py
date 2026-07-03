"""核心 API 行為測試：認證、授權、輸入驗證。"""
from tests.conftest import make_query_result, TEST_USER


def test_health(client):
    res = client.get("/health")
    assert res.status_code == 200
    assert res.json() == {"status": "ok"}


def test_protected_routes_require_auth(client_unauthenticated):
    """未帶 token 的請求一律 401/403，不可放行。"""
    cases = [
        ("POST", "/chat/ask", {"kb_id": "x", "question": "q"}),
        ("GET", "/documents/kb/some-kb-id", None),
        ("GET", "/graph/some-kb-id", None),
        ("GET", "/chat/conversations?kb_id=x", None),
    ]
    for method, path, body in cases:
        res = client_unauthenticated.request(method, path, json=body)
        assert res.status_code in (401, 403), f"{method} {path} returned {res.status_code}"


def test_ask_rejects_foreign_kb(client, mock_sb):
    """問答時 KB 不屬於使用者 → 403。"""
    mock_sb._chain.execute.return_value = make_query_result([])  # KB 查無 → 拒絕
    res = client.post("/chat/ask", json={"kb_id": "not-mine", "question": "q", "stream": False})
    assert res.status_code == 403


def test_upload_rejects_oversized_file(client, mock_sb):
    """超過 50MB 的檔案 → 413。"""
    big = b"x" * (50 * 1024 * 1024 + 1)
    res = client.post(
        "/documents/upload",
        data={"kb_id": "kb1"},
        files={"file": ("big.txt", big, "text/plain")},
    )
    assert res.status_code == 413


def test_list_kbs_rejects_other_user(client):
    """查別人的 KB 清單 → 403。"""
    res = client.get("/chat/kb/another-user-id")
    assert res.status_code == 403


def test_list_kbs_returns_own(client, mock_sb):
    kbs = [{"id": "kb1", "name": "我的知識庫", "user_id": TEST_USER["user_id"]}]
    mock_sb._chain.execute.return_value = make_query_result(kbs)
    res = client.get(f"/chat/kb/{TEST_USER['user_id']}")
    assert res.status_code == 200
    assert res.json() == kbs


def test_register_validates_email(client):
    res = client.post("/auth/register", json={"email": "not-an-email", "password": "pw"})
    assert res.status_code == 422
