from fastapi import Depends, HTTPException, Request, status, Header
import pandas as pd
from typing import Annotated

from config import Settings, get_settings
from services.auth import SESSION_COOKIE, User, read_session_token
from sessions.store import get_session


def require_user(request: Request, settings: Settings = Depends(get_settings)) -> User:
    """Gate for every data route: a valid signed session cookie for an allowed domain."""
    if settings.auth_disabled:
        return User(email=f"dev@{settings.allowed_domain}", name="Development user")
    token = request.cookies.get(SESSION_COOKIE)
    user = read_session_token(token, settings) if token else None
    if user is None:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Sign in with your CMKL Google account.")
    return user


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


def apply_filters(df: pd.DataFrame, filters: dict | None) -> pd.DataFrame:
    """Restrict rows to the Data tab's active categorical filters."""
    if filters:
        for col, allowed in filters.items():
            if col in df.columns and allowed:
                df = df[df[col].astype(str).isin(allowed)]
    return df
