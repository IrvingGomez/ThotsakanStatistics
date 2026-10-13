# Authentication Setup (Google Sign-In)

Thotsakan Statistics is gated: nobody can reach the Data, Probability, Estimation, Hypothesis or Regression features (or any `/api` data route) without signing in with a Google account whose **verified email ends in `@cmkl.ac.th`**.

## How it works

```
Browser                         Backend (FastAPI)                 Google
  │  GET /api/auth/config ───────▶ client ID, allowed domain
  │  show "Sign in with Google" ─────────────────────────────────▶ account chooser
  │ ◀──────────────────────────── ID token (JWT) ─────────────────
  │  POST /api/auth/google {credential} ▶ verify signature, audience,
  │                                       expiry, email_verified, @cmkl.ac.th
  │ ◀── Set-Cookie: thotsakan_session (HttpOnly, signed JWT, 12 h)
  │  every /api request sends the cookie ▶ api/deps.require_user
```

- Only the **client ID** is needed (public by design). There is **no client secret** and no redirect URI.
- Open routes: `/api/health`, `/api/auth/*`. Everything else returns `401` without a valid session, and the UI drops back to the login screen.
- The domain is re-checked on every request, so narrowing `AUTH_ALLOWED_DOMAIN` takes effect immediately.

Code: `backend/config.py`, `backend/services/auth.py`, `backend/api/routes/auth.py`, `backend/api/deps.py`; frontend `src/context/AuthContext.tsx`, `src/components/LoginGate.tsx`.

## 1. Create the Google OAuth client

You need a Google account that can create projects (ideally your `@cmkl.ac.th` Workspace account).

1. Open <https://console.cloud.google.com/> and create (or pick) a project, e.g. `thotsakan-stats`.
2. **Google Auth Platform** (older UI: *APIs & Services → OAuth consent screen*) → **Get started** / configure:
   - **App name:** Thotsakan Statistics; **User support email:** yours.
   - **Audience:** choose **Internal** if the project belongs to the `cmkl.ac.th` Google Workspace organisation. Google then rejects every other account itself (a second layer on top of our email check). Choose **External** otherwise; our backend still enforces the domain, but you may need to publish the app or add test users.
   - Scopes: the defaults (`openid`, `email`, `profile`) are all that is used; no sensitive scopes.
3. **Clients → Create client** (older UI: *Credentials → Create credentials → OAuth client ID*):
   - **Application type:** Web application; name e.g. `thotsakan-web`.
   - **Authorized JavaScript origins** (exact scheme + host + port, no trailing slash, no path):

     | Where you run it | Origin to add |
     |---|---|
     | `docker compose up` (production-style) | `http://localhost:8080` (or your `WEB_PORT`) |
     | Dev stack / `npm run dev` | `http://localhost:5173` |
     | Deployed | `https://your-domain.example` |

   - **Authorized redirect URIs:** leave empty (not used).
4. Click **Create** and copy the **Client ID** (`123…apps.googleusercontent.com`). You can ignore any client secret shown.

Origin changes can take a few minutes (occasionally longer) to apply.

## 2. Configure `.env`

```bash
cp .env.example .env      # .env is git-ignored; never commit it
```

Edit `.env`:

```dotenv
GOOGLE_CLIENT_ID=123456789-abc.apps.googleusercontent.com
AUTH_SECRET_KEY=<paste output of the command below>
AUTH_ALLOWED_DOMAIN=cmkl.ac.th
AUTH_SESSION_HOURS=12
AUTH_COOKIE_SECURE=false      # true when served over HTTPS
AUTH_DISABLED=false           # must be false (or unset) to require login
```

Generate the signing key (≥ 32 chars):

```bash
python3 -c "import secrets; print(secrets.token_urlsafe(48))"
```

| Variable | Required | Meaning |
|---|---|---|
| `GOOGLE_CLIENT_ID` | yes | OAuth Web client ID from step 1 |
| `AUTH_SECRET_KEY` | yes | Signs the session cookie. Changing it signs everyone out. Keep it secret |
| `AUTH_ALLOWED_DOMAIN` | no (`cmkl.ac.th`) | Only emails ending `@<domain>` (exact; subdomains are not allowed) |
| `AUTH_SESSION_HOURS` | no (`12`) | Lifetime of a login |
| `AUTH_COOKIE_SECURE` | no (`false`) | Set `true` behind HTTPS so the cookie is HTTPS-only |
| `AUTH_DISABLED` | no (`false`) | **Dev only.** Skips login and treats everyone as a dev user. The UI shows an amber "Auth disabled (dev)" badge. Never use in production |

If auth is enabled and `GOOGLE_CLIENT_ID` or `AUTH_SECRET_KEY` is missing/short, the backend **refuses to start** with a message saying what to fix.

## 3. Run

Docker (both compose files read the root `.env`):

```bash
docker compose up --build                       # http://localhost:8080
docker compose -f docker-compose.dev.yml up     # http://localhost:5173
docker compose logs -f backend                  # watch for startup errors
```

Without Docker (the backend also loads `<repo>/.env`):

```bash
cd backend && uvicorn main:app --reload         # :8000
cd frontend && npm run dev                      # :5173
```

Open the app: you should see the "Sign in with your @cmkl.ac.th Google account" screen. After signing in, the top bar shows your name and a **Sign out** button.

## Quick verification

```bash
curl -s localhost:8080/api/auth/config                       # {"enabled":true,"clientId":"…","allowedDomain":"cmkl.ac.th"}
curl -s -o /dev/null -w "%{http_code}\n" -X POST localhost:8080/api/descriptive/compute \
     -H 'content-type: application/json' -d '{}'             # 401 when not signed in
```

`"enabled": false` means `AUTH_DISABLED=true` is set somewhere (check `.env` and your shell environment, which overrides `.env`).

## Production checklist

- Serve over **HTTPS**, add the HTTPS origin in Google Cloud, and set `AUTH_COOKIE_SECURE=true`.
- Use a unique, random `AUTH_SECRET_KEY` per environment; inject it as a secret, not in the image. `.env` files are excluded from the Docker build contexts.
- `AUTH_DISABLED` must be `false`.
- Keep the backend at a **single uvicorn worker** (already the case): datasets are held in memory.
- CI (`.github/workflows/docker.yml`) runs the compose smoke test with `AUTH_DISABLED=true` because it has no Google credentials; the auth gate itself is covered by `backend/tests/api/test_auth.py`.

## Troubleshooting

| Symptom | Likely cause / fix |
|---|---|
| Google button missing or "Could not load Google sign-in." | Browser/network blocks `accounts.google.com/gsi/client` (ad blockers, offline, strict CSP) |
| Popup says *Error 400: origin_mismatch* / "not a valid origin" | The exact origin in the address bar (scheme, host, **port**) isn't in *Authorized JavaScript origins*; wait a few minutes after saving |
| *Access blocked: app not verified / not authorized* | Audience is External in testing mode: add the user as a test user, publish, or switch to Internal |
| "Only @cmkl.ac.th accounts can sign in." | Signed in with another domain; pick the CMKL account in the chooser |
| "Your Google email address is not verified." | Google reports `email_verified=false` for that account |
| "Google sign-in could not be verified." | Wrong `GOOGLE_CLIENT_ID` for this token (client ID in `.env` ≠ the one in the console), or the server clock is badly off |
| Backend exits with "Authentication is misconfigured" | Fill `GOOGLE_CLIENT_ID` / `AUTH_SECRET_KEY` (≥ 32 chars) in `.env` |
| Login succeeds but next request is 401 | `AUTH_COOKIE_SECURE=true` over plain `http://`, so the browser drops the cookie; use HTTPS or set it to `false` locally |
| Everyone suddenly signed out | `AUTH_SECRET_KEY` changed, or `AUTH_SESSION_HOURS` elapsed |
| App opens with no login screen | `AUTH_DISABLED=true`; see the badge in the top bar |
| Env change not picked up | Recreate the container: `docker compose up -d --force-recreate backend` |
