from fastapi import APIRouter, Depends, HTTPException
import pandas as pd
from typing import Annotated

from api.deps import get_session_data
from api.schemas.descriptive import DescriptiveRequest, DescriptiveResponse
from services.descriptive import calculate_descriptive

router = APIRouter()

@router.post("/compute", response_model=DescriptiveResponse)
def compute_descriptive(
    request: DescriptiveRequest,
    df: Annotated[pd.DataFrame, Depends(get_session_data)]
):
    try:
        return calculate_descriptive(df, request)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Internal Server Error: {str(e)}")
