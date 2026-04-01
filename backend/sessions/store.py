import time
import pandas as pd
from typing import Dict, TypedDict

class SessionEntry(TypedDict):
    data: pd.DataFrame
    last_accessed: float

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

def set_session(session_id: str, data: pd.DataFrame):
    """Store exactly one DataFrame per session."""
    _session_store[session_id] = {
        "data": data,
        "last_accessed": time.time()
    }
    
def clean_expired_sessions():
    """Cleanup utility that can be run periodically."""
    now = time.time()
    expired = [
        sid for sid, entry in _session_store.items()
        if now - entry["last_accessed"] > SESSION_TTL_SECONDS
    ]
    for sid in expired:
        del _session_store[sid]
