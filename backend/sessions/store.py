import time
import pandas as pd
from typing import Dict, TypedDict

class SessionEntry(TypedDict):
    data: pd.DataFrame
    last_accessed: float
    nbytes: int

# In-memory session store mapping session_id -> SessionEntry
# TODO: In production, switch to Redis if deploying with multiple workers.
_session_store: Dict[str, SessionEntry] = {}
SESSION_TTL_SECONDS = 30 * 60  # 30 minutes

def get_session(session_id: str) -> pd.DataFrame | None:
    """Retrieve the DataFrame for a session, updating its last_accessed time."""
    entry = _session_store.get(session_id)
    if not entry:
        return None
    
    # Check expiration
    if time.time() - entry["last_accessed"] > SESSION_TTL_SECONDS:
        del _session_store[session_id]
        return None
        
    entry["last_accessed"] = time.time()
    return entry["data"]

def set_session(session_id: str, data: pd.DataFrame, max_total_bytes: int = 0):
    """Store exactly one DataFrame per session. With max_total_bytes > 0, the least recently
    used sessions are dropped until all datasets together fit (the new one is always kept)."""
    _session_store[session_id] = {
        "data": data,
        "last_accessed": time.time(),
        "nbytes": int(data.memory_usage(deep=True).sum()),
    }
    if max_total_bytes > 0:
        _evict_to_fit(max_total_bytes, keep=session_id)


def _evict_to_fit(max_total_bytes: int, keep: str):
    total = sum(entry["nbytes"] for entry in _session_store.values())
    for sid in sorted(_session_store, key=lambda s: _session_store[s]["last_accessed"]):
        if total <= max_total_bytes:
            break
        if sid != keep:
            total -= _session_store.pop(sid)["nbytes"]


def clean_expired_sessions():
    """Cleanup utility that can be run periodically."""
    now = time.time()
    expired = [
        sid for sid, entry in _session_store.items()
        if now - entry["last_accessed"] > SESSION_TTL_SECONDS
    ]
    for sid in expired:
        del _session_store[sid]
