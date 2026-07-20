from fastapi import APIRouter
from app.schemas.proposal import ActionRequest
from app.services.analyst import execute_analyst
from app.services.supabase_client import store_freelancer, store_job_snapshot, store_score

router = APIRouter()

@router.post("/analysis")
def get_analysis(request: ActionRequest):
    # Store freelancer profile if we haven't already or just update
    f_id = store_freelancer(request.freelancerProfile.model_dump())
    
    # Store job snapshot
    j_id = store_job_snapshot(f_id, request.jobData.model_dump())
    
    # Store deterministic score
    s_id = store_score(j_id, request.decision.model_dump())
    
    # Get the AI analysis
    res = execute_analyst(request)
    
    return res
