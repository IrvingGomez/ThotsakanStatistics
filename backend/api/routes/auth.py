from fastapi import APIRouter, Depends, HTTPException, Response, status
from pydantic import BaseModel

from api.deps import require_user
from config import Settings, get_settings
from services.auth import (
    SESSION_COOKIE, AuthError, User, issue_session_token, verify_google_credential,
)

router = APIRouter()


class GoogleLoginRequest(BaseModel):
    credential: str


def _user_json(user: User) -> dict:
    return {"email": user.email, "name": user.name, "picture": user.picture}


@router.get("/config")
def auth_config(settings: Settings = Depends(get_settings)):
    """Public: lets the frontend get the (non-secret) client ID at runtime,
    so the same built image works for any deployment."""
    return {
        "enabled": not settings.auth_disabled,
        "clientId": settings.google_client_id,
        "allowedDomain": settings.allowed_domain,
    }


@router.post("/google")
def google_login(body: GoogleLoginRequest, response: Response,
                 settings: Settings = Depends(get_settings)):
    if settings.auth_disabled:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Authentication is disabled.")
    try:
        user = verify_google_credential(body.credential, settings)
    except AuthError as exc:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, str(exc))
    response.set_cookie(
        SESSION_COOKIE,
        issue_session_token(user, settings),
        max_age=settings.session_hours * 3600,
        httponly=True,
        secure=settings.cookie_secure,
        samesite="lax",
        path="/",
    )
    return _user_json(user)


@router.get("/me")
def me(user: User = Depends(require_user)):
    return _user_json(user)


@router.post("/logout")
def logout(response: Response):
    response.delete_cookie(SESSION_COOKIE, path="/")
    return {"status": "ok"}
