from fastapi import APIRouter, Depends, HTTPException
import pandas as pd
from api.deps import apply_filters, get_session_data
from api.schemas.inference import (
    EstimatorRequest, EstimatorOptions, 
    InferenceParams, IntervalsResponse,
    ConfidenceRegionsParams, ConfidenceRegionsResponse
)
from services.inference import get_estimators, calculate_ci, calculate_pi, calculate_regions

router = APIRouter()

@router.post("/estimators", response_model=EstimatorOptions)
def get_available_estimators(req: EstimatorRequest, df: pd.DataFrame = Depends(get_session_data)):
    if req.column not in df.columns:
        raise HTTPException(status_code=400, detail=f"Column {req.column} not found")
    data = df[req.column].dropna()
    res = get_estimators(data)
    return EstimatorOptions(**res)

@router.post("/ci", response_model=IntervalsResponse)
def compute_ci(params: InferenceParams, df: pd.DataFrame = Depends(get_session_data)):
    try:
        ci_table, ctx = calculate_ci(apply_filters(df, params.filters), params)
        return IntervalsResponse(table=ci_table.to_json(orient="records"), **ctx)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.post("/pi", response_model=IntervalsResponse)
def compute_pi(params: InferenceParams, df: pd.DataFrame = Depends(get_session_data)):
    try:
        pi_table, ctx = calculate_pi(apply_filters(df, params.filters), params)
        return IntervalsResponse(table=pi_table.to_json(orient="records"), **ctx)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.post("/regions", response_model=ConfidenceRegionsResponse)
def compute_regions(params: ConfidenceRegionsParams, df: pd.DataFrame = Depends(get_session_data)):
    try:
        return ConfidenceRegionsResponse(**calculate_regions(apply_filters(df, params.filters), params))
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
