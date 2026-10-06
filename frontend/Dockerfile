# Official images via a mirror that needs no Docker Hub login; override with BASE_REGISTRY.
ARG BASE_REGISTRY=mirror.gcr.io/library
FROM ${BASE_REGISTRY}/node:22-alpine AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
RUN npm run build

ARG BASE_REGISTRY
FROM ${BASE_REGISTRY}/nginx:1.27-alpine
# BACKEND_URL is substituted into the template at container start (nginx image feature).
ENV BACKEND_URL=http://backend:8000
COPY nginx.conf.template /etc/nginx/templates/default.conf.template
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 80
HEALTHCHECK --interval=30s --timeout=5s --retries=3 \
    CMD wget -qO- http://127.0.0.1/ >/dev/null || exit 1
