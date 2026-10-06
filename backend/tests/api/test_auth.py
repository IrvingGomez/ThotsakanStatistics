import time

import jwt
import pytest
from fastapi.testclient import TestClient

import api.routes.auth as auth_routes
from api.deps import require_user
from config import Settings, get_settings
from main import app
from services.auth import AuthError, SESSION_COOKIE, User, is_allowed_email, read_session_token, issue_session_token

SECRET = "x" * 40


def make_settings(**kw) -> Settings:
    base = dict(auth_disabled=False, google_client_id="client-id", allowed_domain="cmkl.ac.th",
                secret_key=SECRET, session_hours=12, cookie_secure=False)
    base.update(kw)
    return Settings(**base)


@pytest.fixture
def client(request):
    settings = getattr(request, "param", None) or make_settings()
    app.dependency_overrides.pop(require_user, None)  # real gate
    app.dependency_overrides[get_settings] = lambda: settings
    yield TestClient(app)
    app.dependency_overrides.pop(get_settings, None)


def test_domain_check():
    assert is_allowed_email("Ada@CMKL.ac.th", "cmkl.ac.th")
    assert not is_allowed_email("ada@gmail.com", "cmkl.ac.th")
    assert not is_allowed_email("ada@evil-cmkl.ac.th", "cmkl.ac.th")
    assert not is_allowed_email("ada@cmkl.ac.th.evil.com", "cmkl.ac.th")
    assert not is_allowed_email("ada@sub.cmkl.ac.th", "cmkl.ac.th")


def test_data_routes_require_login(client):
    assert client.post("/api/descriptive/compute", json={}).status_code == 401
    assert client.post("/api/data/upload").status_code == 401
    assert client.get("/api/auth/me").status_code == 401


def test_open_routes(client):
    assert client.get("/api/health").status_code == 200
    body = client.get("/api/auth/config").json()
    assert body == {"enabled": True, "clientId": "client-id", "allowedDomain": "cmkl.ac.th"}


def test_login_sets_cookie_and_grants_access(client, monkeypatch):
    monkeypatch.setattr(auth_routes, "verify_google_credential",
                        lambda cred, s: User(email="ada@cmkl.ac.th", name="Ada"))
    r = client.post("/api/auth/google", json={"credential": "good"})
    assert r.status_code == 200 and r.json()["email"] == "ada@cmkl.ac.th"
    assert "httponly" in r.headers["set-cookie"].lower()
    assert client.get("/api/auth/me").json()["email"] == "ada@cmkl.ac.th"
    client.post("/api/auth/logout")
    assert client.get("/api/auth/me").status_code == 401


def test_rejected_credential(client, monkeypatch):
    def boom(cred, s):
        raise AuthError("Only @cmkl.ac.th accounts can sign in.")
    monkeypatch.setattr(auth_routes, "verify_google_credential", boom)
    r = client.post("/api/auth/google", json={"credential": "bad"})
    assert r.status_code == 401 and SESSION_COOKIE not in r.cookies


@pytest.mark.parametrize("claims,ok", [
    ({"email": "a@cmkl.ac.th", "email_verified": True}, True),
    ({"email": "a@cmkl.ac.th", "email_verified": False}, False),
    ({"email": "a@gmail.com", "email_verified": True}, False),
])
def test_google_claim_checks(monkeypatch, claims, ok):
    import services.auth as svc
    monkeypatch.setattr(svc.id_token, "verify_oauth2_token", lambda *a, **k: claims)
    if ok:
        assert svc.verify_google_credential("t", make_settings()).email == "a@cmkl.ac.th"
    else:
        with pytest.raises(AuthError):
            svc.verify_google_credential("t", make_settings())


def test_session_token_tamper_and_expiry():
    s = make_settings()
    good = issue_session_token(User(email="a@cmkl.ac.th"), s)
    assert read_session_token(good, s).email == "a@cmkl.ac.th"
    assert read_session_token(good, make_settings(secret_key="y" * 40)) is None
    assert read_session_token(good, make_settings(allowed_domain="other.ac.th")) is None
    expired = jwt.encode({"iss": "thotsakan-stats", "sub": "a@cmkl.ac.th", "exp": int(time.time()) - 5},
                         SECRET, algorithm="HS256")
    assert read_session_token(expired, s) is None
    forged = jwt.encode({"iss": "thotsakan-stats", "sub": "a@cmkl.ac.th", "exp": int(time.time()) + 99}, "z" * 40, algorithm="HS256")
    assert read_session_token(forged, s) is None


@pytest.mark.parametrize("client", [make_settings(auth_disabled=True)], indirect=True)
def test_auth_disabled_bypass(client):
    assert client.get("/api/auth/me").status_code == 200
    assert client.post("/api/auth/google", json={"credential": "x"}).status_code == 400
