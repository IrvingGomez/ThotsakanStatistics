"""Google sign-in verification + our own session token.

Flow: the browser gets a Google ID token, we verify it (signature, audience,
expiry, verified email, allowed domain) and answer with an HttpOnly cookie
holding a short-lived signed JWT of our own.
"""
import time
from dataclasses import dataclass

import jwt
from google.auth.transport import requests as google_requests
from google.oauth2 import id_token

from config import Settings

SESSION_COOKIE = "thotsakan_session"
_ISSUER = "thotsakan-stats"


class AuthError(Exception):
    """Credential rejected; the message is safe to show to the user."""


@dataclass(frozen=True)
class User:
    email: str
    name: str = ""
    picture: str = ""


def is_allowed_email(email: str, domain: str) -> bool:
    return email.lower().endswith("@" + domain)


def verify_google_credential(credential: str, settings: Settings) -> User:
    try:
        claims = id_token.verify_oauth2_token(
            credential, google_requests.Request(), settings.google_client_id
        )
    except ValueError as exc:
        raise AuthError("Google sign-in could not be verified.") from exc

    email = str(claims.get("email", ""))
    if not claims.get("email_verified") or not email:
        raise AuthError("Your Google email address is not verified.")
    if not is_allowed_email(email, settings.allowed_domain):
        raise AuthError(f"Only @{settings.allowed_domain} accounts can sign in.")
    return User(email=email.lower(), name=claims.get("name", ""), picture=claims.get("picture", ""))


def issue_session_token(user: User, settings: Settings) -> str:
    now = int(time.time())
    return jwt.encode(
        {
            "iss": _ISSUER,
            "sub": user.email,
            "name": user.name,
            "picture": user.picture,
            "iat": now,
            "exp": now + settings.session_hours * 3600,
        },
        settings.secret_key,
        algorithm="HS256",
    )


def read_session_token(token: str, settings: Settings) -> User | None:
    try:
        claims = jwt.decode(
            token, settings.secret_key, algorithms=["HS256"], issuer=_ISSUER,
            options={"require": ["exp", "sub"]},
        )
    except jwt.PyJWTError:
        return None
    email = str(claims["sub"])
    # Re-check on every request so narrowing AUTH_ALLOWED_DOMAIN takes effect immediately.
    if not is_allowed_email(email, settings.allowed_domain):
        return None
    return User(email=email, name=claims.get("name", ""), picture=claims.get("picture", ""))
