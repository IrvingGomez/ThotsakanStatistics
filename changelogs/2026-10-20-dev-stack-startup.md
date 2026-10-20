# 2026-10-20 — Faster dev stack startup

`docker compose -f docker-compose.dev.yml up` took several minutes on Windows on every start:

- The frontend ran `npm ci` on every start, which deletes and reinstalls all of `node_modules` (~2 min through the Windows bind mount).
- The backend imported numpy/scipy/matplotlib from a bind-mounted `/deps` (~35 s).

Changes:

- `frontend/dev-start.sh` (new) runs `npm ci` only when `package-lock.json` changed (hash stored in `node_modules/.package-lock-hash`), like `backend/dev-start.sh` already did for pip.
- pip installs (`/deps`) and `node_modules` now live in the named volumes `backend-deps` and `frontend-node-modules` instead of `dev-playground/`. This partly reverts 2026-10-06-dev-playground. Reset them with `docker compose -f docker-compose.dev.yml down -v`. Uploaded CSVs are still copied to `dev-playground/uploads/`. The old `dev-playground/backend` and `dev-playground/frontend` folders are no longer used and can be deleted.
- `.gitattributes` keeps `*.sh` files LF so they still run in the containers when checked out on Windows.
