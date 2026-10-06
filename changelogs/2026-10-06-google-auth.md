# 2026-10-06 — Google sign-in restricted to @cmkl.ac.th

## Summary
The app now requires signing in with a Google account whose verified email ends in `@cmkl.ac.th`. All statistics/data API routes return `401` without a valid session.

## How it works
1. The browser shows a Google Identity Services button (`LoginGate`) and receives a Google **ID token**.
2. `POST /api/auth/google` verifies it server-side (signature, audience = `GOOGLE_CLIENT_ID`, expiry, `email_verified`, email suffix `@AUTH_ALLOWED_DOMAIN`).
3. On success the backend sets an **HttpOnly, SameSite=Lax** cookie holding its own HS256-signed JWT (`AUTH_SESSION_HOURS`, default 12h).
4. `api/deps.require_user` checks that cookie on every protected router; the domain is re-checked per request.
5. A `401` from any data call returns the UI to the login screen.

No client secret is used (ID-token flow). The client ID is served at runtime from `GET /api/auth/config`, so the same Docker image works for any deployment — no build args.

## Configuration (`.env`, see `.env.example`)
| Variable | Purpose |
|---|---|
| `GOOGLE_CLIENT_ID` | OAuth Web client ID (required unless auth disabled) |
| `AUTH_SECRET_KEY` | Session-signing key, ≥ 32 chars (required) |
| `AUTH_ALLOWED_DOMAIN` | Default `cmkl.ac.th` |
| `AUTH_SESSION_HOURS` | Default `12` |
| `AUTH_COOKIE_SECURE` | Set `true` behind HTTPS |
| `AUTH_DISABLED` | Local-dev bypass; never in production |

The backend refuses to start if auth is enabled and `GOOGLE_CLIENT_ID`/`AUTH_SECRET_KEY` are missing.

## Docker
- `docker-compose.yml` and `docker-compose.dev.yml` forward the variables from the root `.env` to the backend.
- `.env` files are excluded from both image build contexts.
- CI smoke test sets `AUTH_DISABLED=true` (no credentials in CI; the gate is covered by pytest).

## Files
- Backend: `config.py`, `services/auth.py`, `api/routes/auth.py`, `api/deps.py` (`require_user`), `main.py`, `requirements.txt` (+ `google-auth`, `requests`, `PyJWT`, `python-dotenv`)
- Frontend: `context/AuthContext.tsx`, `components/LoginGate.tsx`, `google-identity.d.ts`, `main.tsx`, `layout/LogoBar.tsx` (sign-out button)
- Tests: `backend/tests/api/test_auth.py`, `backend/tests/conftest.py` (existing API tests run as a signed-in user)
- Docs: `.env.example`, `README.md`, `CLAUDE.md`

## Verification
- Backend: 153 pytest tests pass (new auth tests cover domain lookalikes, unverified email, tampered/expired/wrong-key tokens, 401 gating, login/logout cookie, disabled mode).
- Frontend: `npm run build` passes. `npm test` has 2 failures in `LabBench.test.tsx` that also occur without these changes.
- **Not tested:** a real Google login and a real `docker compose up` (needs your OAuth client ID).

## Setup you must do
1. Google Cloud Console → Credentials → OAuth client ID (Web application). Add authorized JavaScript origins: `http://localhost:8080`, `http://localhost:5173`, and your production origin.
2. `cp .env.example .env`; set `GOOGLE_CLIENT_ID` and `AUTH_SECRET_KEY` (`python3 -c "import secrets; print(secrets.token_urlsafe(48))"`).

## Notes
- Domain enforcement is by verified email suffix (exact `@cmkl.ac.th`; subdomains not allowed). Switching the consent screen to "Internal" in Google Workspace adds a second layer.
- Dataset session IDs are not yet tied to the signed-in user.
