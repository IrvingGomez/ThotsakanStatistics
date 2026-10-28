from fastapi import APIRouter, Depends, UploadFile, File, HTTPException
import uuid
import pandas as pd
import io
import os
from pathlib import Path

from config import Settings, get_settings
from sessions.store import set_session

MB = 1024 * 1024

router = APIRouter()

# The Data tab (frontend/src/utils/parseFile.ts) lists a column as numeric when at least 80 % of its
# filled cells are numbers, and ignores the rest. The server reads the column the same way, so an
# analysis does not fail on a stray "?" or "n/a".
NUMERIC_SHARE = 0.8


def _read_numbers_as_numbers(df: pd.DataFrame) -> pd.DataFrame:
    for col in df.select_dtypes(include=["object"]).columns:  # text only; a True/False column stays
        filled = df[col].notna().sum()
        numbers = pd.to_numeric(df[col], errors="coerce")
        if filled and numbers.notna().sum() / filled >= NUMERIC_SHARE:
            df[col] = numbers
    return df


@router.post("/upload")
async def upload_dataset(file: UploadFile = File(...), settings: Settings = Depends(get_settings)):
    if not file.filename.endswith('.csv'):
        raise HTTPException(status_code=400, detail="Only CSV files are supported")

    content = await file.read()
    if len(content) > settings.max_upload_mb * MB:
        raise HTTPException(status_code=413, detail=f"The file is larger than {settings.max_upload_mb} MB.")

    try:
        # Parse CSV
        # We handle parsing using pandas as requested. 
        # Further schema improvements might be needed for dates, numerical, and categorical parsing.
        df = _read_numbers_as_numbers(pd.read_csv(io.BytesIO(content)))
        
        # Generate session ID
        session_id = str(uuid.uuid4())
        
        # Store df
        set_session(session_id, df, max_total_bytes=settings.session_memory_mb * MB)

        # Dev only: keep a copy of the raw upload on disk (see docker-compose.dev.yml).
        dump_dir = os.getenv("UPLOAD_DUMP_DIR")
        if dump_dir:
            Path(dump_dir).mkdir(parents=True, exist_ok=True)
            (Path(dump_dir) / f"{session_id}.csv").write_bytes(content)
        
        numeric_cols = df.select_dtypes(include=['number']).columns.tolist()
        categorical_cols = df.select_dtypes(exclude=['number']).columns.tolist()
        
        return {
            "session_id": session_id,
            "filename": file.filename,
            "rows": len(df),
            "columns": len(df.columns),
            "numeric_columns": numeric_cols,
            "categorical_columns": categorical_cols
        }
        
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Failed to parse CSV: {str(e)}")
