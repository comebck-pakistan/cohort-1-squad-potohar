from fastapi import APIRouter
from pydantic import BaseModel

router = APIRouter()

class OutcomeRequest(BaseModel):
    job_id: str
    outcome: str

@router.post("/outcomes")
def log_outcome(request: OutcomeRequest):
    # This will integrate with Supabase later in Phase 6
    return {"status": "recorded", "job_id": request.job_id, "outcome": request.outcome}
