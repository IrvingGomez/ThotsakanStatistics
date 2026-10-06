# 2026-10-06 — Local dev playground for the dev compose stack

`docker-compose.dev.yml` now keeps generated files in `./dev-playground/` (git-ignored) instead of named Docker volumes:

- `dev-playground/backend/site-packages` — pip installs (was `backend-site-packages` volume)
- `dev-playground/frontend/node_modules` — npm installs (was `frontend-node-modules` volume)
- `dev-playground/uploads` — raw copy of every CSV uploaded in dev, as `<session-id>.csv`

Uploads are copied only when `UPLOAD_DUMP_DIR` is set (dev compose sets it to `/playground/uploads`); production behavior is unchanged (in-memory only). The dir is outside `/app`, so writing uploads doesn't trigger uvicorn reload.

Reset everything with `rm -rf dev-playground`. Files may be root-owned on the host with rootful Docker. Not tested with a real `docker compose -f docker-compose.dev.yml up`.

## Fix: "No module named 'pip'" in the backend container
The first version bind-mounted the (empty) playground dir over `/usr/local/lib/python3.12/site-packages`, hiding pip itself (named volumes were pre-filled from the image; bind mounts are not). Now packages install with `pip install --target /deps`, with `PYTHONPATH=/deps` and `python -m uvicorn`, so the image's Python stays intact. Verified by running the dev stack: backend `/api/health` OK, frontend on :5173, and an upload through the Vite proxy wrote `dev-playground/uploads/<id>.csv`.

## Fix: silent backend dev container
`pip install -q` printed nothing for the several minutes a cold install takes, and Python buffered pip's output when not on a TTY. The dev command is now `backend/dev-start.sh`: it prints `[dev]` status lines and full pip progress (`PYTHONUNBUFFERED=1`), and skips the install on later starts when `requirements*.txt` are unchanged (hash stored in `/deps/.requirements-hash`). Verified cold (progress visible, server healthy) and warm restart.
