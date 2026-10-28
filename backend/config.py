"""Environment-driven settings. Everything here comes from the root `.env`
(docker compose forwards it) or the process environment."""
import os
from dataclasses import dataclass
from functools import lru_cache
from pathlib import Path

from dotenv import load_dotenv

# Local (non-Docker) runs: pick up <repo>/.env. Real environment variables win.
load_dotenv(Path(__file__).resolve().parent.parent / ".env", override=False)


def _flag(name: str, default: bool = False) -> bool:
    raw = os.getenv(name)
    if raw is None or not raw.strip():
        return default
    return raw.strip().lower() in {"1", "true", "yes", "on"}


def _megabytes(name: str, default: int) -> int:
    raw = os.getenv(name)
    if raw is None or not raw.strip():
        return default
    return int(raw)


# Demo mode (public events) caps what one open, login-free server will hold.
DEMO_MAX_UPLOAD_MB = 10
DEMO_SESSION_MEMORY_MB = 1024
MAX_UPLOAD_MB = 100  # matches nginx's default client_max_body_size


@dataclass(frozen=True)
class Settings:
    auth_disabled: bool
    google_client_id: str
    allowed_domain: str
    secret_key: str
    session_hours: int
    cookie_secure: bool
    demo_mode: bool = False
    max_upload_mb: int = MAX_UPLOAD_MB
    session_memory_mb: int = 0  # 0 = no limit on the datasets held in memory

    @property
    def login_required(self) -> bool:
        return not (self.auth_disabled or self.demo_mode)


@lru_cache
def get_settings() -> Settings:
    demo = _flag("DEMO_MODE")
    return Settings(
        auth_disabled=_flag("AUTH_DISABLED"),
        google_client_id=os.getenv("GOOGLE_CLIENT_ID", "").strip(),
        allowed_domain=os.getenv("AUTH_ALLOWED_DOMAIN", "cmkl.ac.th").strip().lower().lstrip("@"),
        secret_key=os.getenv("AUTH_SECRET_KEY", "").strip(),
        session_hours=int(os.getenv("AUTH_SESSION_HOURS", "12") or 12),
        cookie_secure=_flag("AUTH_COOKIE_SECURE"),
        demo_mode=demo,
        max_upload_mb=_megabytes("MAX_UPLOAD_MB", DEMO_MAX_UPLOAD_MB if demo else MAX_UPLOAD_MB),
        session_memory_mb=_megabytes("SESSION_MEMORY_MB", DEMO_SESSION_MEMORY_MB if demo else 0),
    )


def validate_settings(s: Settings) -> None:
    """Fail fast at startup instead of rejecting every login at runtime."""
    if not s.login_required:
        return
    problems = []
    if not s.google_client_id:
        problems.append("GOOGLE_CLIENT_ID is not set")
    if len(s.secret_key) < 32:
        problems.append("AUTH_SECRET_KEY must be set to at least 32 characters")
    if problems:
        raise RuntimeError(
            "Authentication is misconfigured: " + "; ".join(problems)
            + ". See .env.example (or set AUTH_DISABLED=true for local development)."
        )
