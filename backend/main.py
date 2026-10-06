import asyncio
from contextlib import asynccontextmanager

from fastapi import Depends, FastAPI
from fastapi.middleware.cors import CORSMiddleware
from api.deps import require_user
from api.routes import auth, data, descriptive, inference, graphical, hypothesis, probability
from config import get_settings, validate_settings
from sessions.store import clean_expired_sessions


@asynccontextmanager
async def lifespan(app: FastAPI):
    validate_settings(get_settings())

    async def cleanup_loop():
        while True:
            await asyncio.sleep(300)  # 5 minutes
            clean_expired_sessions()

    task = asyncio.create_task(cleanup_loop())
    yield
    task.cancel()
    try:
        await task
    except asyncio.CancelledError:
        pass


app = FastAPI(title="ThotsakanStatistics API", lifespan=lifespan)

# Configure CORS for Vite dev server
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router, prefix="/api/auth", tags=["auth"])

# Everything below requires a signed-in @cmkl.ac.th user (see api/deps.require_user).
_protected = [Depends(require_user)]
app.include_router(data.router, prefix="/api/data", tags=["data"], dependencies=_protected)
app.include_router(descriptive.router, prefix="/api/descriptive", tags=["descriptive"], dependencies=_protected)
app.include_router(inference.router, dependencies=_protected)  # defines its own prefix /api/inference
app.include_router(graphical.router, dependencies=_protected)  # defines its own prefix /api/graphical
app.include_router(hypothesis.router, dependencies=_protected)  # defines its own prefix /api/hypothesis
app.include_router(probability.router, prefix="/api/probability", tags=["probability"], dependencies=_protected)

@app.get("/api/health")
def health_check():
    return {"status": "ok"}
