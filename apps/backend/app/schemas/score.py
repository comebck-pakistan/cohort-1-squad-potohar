from pydantic import BaseModel
from typing import Optional

class DecisionFactors(BaseModel):
    clientQuality: float
    competition: float
    budget: float
    scopeClarity: float
    skillMatch: float

class DecisionResult(BaseModel):
    score: int
    decision: str
    reason: str
    factors: Optional[DecisionFactors] = None
