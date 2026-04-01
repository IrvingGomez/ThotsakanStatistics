from fastapi import HTTPException, status, Header
import pandas as pd
from typing import Annotated

from sessions.store import get_session

# We will read session_id from the 'x-session-id' header
async def get_session_data(x_session_id: Annotated[str | None, Header()] = None) -> pd.DataFrame:
    if not x_session_id:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Missing x-session-id header")
    
    data = get_session(x_session_id)
    if data is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, 
            detail="Session expired or not found. Please upload the dataset again."
        )
    
    return data
