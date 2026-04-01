import sys
import json
from pydantic import BaseModel
from typing import Optional, Literal

class StatRow(BaseModel):
    category: Literal['Quantiles', 'Central Tendency', 'Dispersion', 'Shape', 'Extremes']
    measure: str
    value: float | None
    consistencyCorr: float | None
    robust: bool = False
    advancedId: Optional[str] = None
    warning: Optional[str] = None

row = StatRow(
    category='Dispersion',
    measure='Variance (ddof=0)',
    value=1.0,
    consistencyCorr=None,
    robust=False,
    advancedId='variance_0'
)

print(json.dumps(row.model_dump()))
