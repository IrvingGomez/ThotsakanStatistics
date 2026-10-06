from fastapi import APIRouter, UploadFile, File, HTTPException
import uuid
import pandas as pd
import io
import os
from pathlib import Path

from sessions.store import set_session

router = APIRouter()

@router.post("/upload")
async def upload_dataset(file: UploadFile = File(...)):
    if not file.filename.endswith('.csv'):
        raise HTTPException(status_code=400, detail="Only CSV files are supported")
    
    try:
        content = await file.read()
        
        # Parse CSV
        # We handle parsing using pandas as requested. 
        # Further schema improvements might be needed for dates, numerical, and categorical parsing.
        df = pd.read_csv(io.BytesIO(content))
        
        # Generate session ID
        session_id = str(uuid.uuid4())
        
        # Store df
        set_session(session_id, df)

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
