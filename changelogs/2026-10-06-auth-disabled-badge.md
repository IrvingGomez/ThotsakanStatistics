# 2026-10-06 — Visible "Auth disabled (dev)" badge

When `AUTH_DISABLED=true` the login screen is skipped (by design, for local dev), which looked like "already signed in". The logo bar now shows an amber "Auth disabled (dev)" badge in that mode, and hides the user/sign-out controls.

Verified with real auth on (placeholder credentials): `/api/data|descriptive|probability|inference|graphical|hypothesis` all return 401 without a session; `/api/health` stays open. The dev stack was stopped afterwards: it needs a real `.env`.
