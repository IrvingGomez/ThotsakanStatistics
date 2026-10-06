# 2026-10-06 — Base images pulled from a login-free mirror

Pulling `node`/`python`/`nginx` from Docker Hub returned "unauthorized". Base images now come from `${BASE_REGISTRY}`, default `mirror.gcr.io/library` (Google's mirror of the official images; anonymous pulls).

- `backend/Dockerfile`, `frontend/Dockerfile`: `ARG BASE_REGISTRY` (default set in the Dockerfile, so CI builds work unchanged).
- `docker-compose.yml`: passes `BASE_REGISTRY` as a build arg. `docker-compose.dev.yml`: uses it in `image:`.
- `.env.example`: documents `BASE_REGISTRY`. Alternatives: `public.ecr.aws/docker/library`, or `docker.io/library` for Docker Hub.

History: the first default was `public.ecr.aws/docker/library`, but it returned `toomanyrequests` (anonymous rate limit), so the default moved to `mirror.gcr.io/library`.

Verified: both compose files validate; `python:3.12-slim`, `node:22-alpine` and `nginx:1.27-alpine` all pulled from `mirror.gcr.io`. Full image builds were not run.
