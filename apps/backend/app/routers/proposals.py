from fastapi import APIRouter
from app.schemas.proposal import ActionRequest
from app.services.pricer import execute_pricer
from app.services.writer import execute_writer
from app.services.supabase_client import store_freelancer, store_job_snapshot, store_proposal

router = APIRouter()

@router.post("/pricing")
def get_pricing(request: ActionRequest):
    # Store job context if this is the first AI action the user clicked
    f_id = store_freelancer(request.freelancerProfile.model_dump())
    j_id = store_job_snapshot(f_id, request.jobData.model_dump())
    
    return execute_pricer(request)

@router.post("/proposal")
def get_proposal(request: ActionRequest):
    f_id = store_freelancer(request.freelancerProfile.model_dump())
    j_id = store_job_snapshot(f_id, request.jobData.model_dump())
    
    res = execute_writer(request)
    
    # Store generated proposal in DB
    if not res.get("error"):
        store_proposal(j_id, res.get("draft_text", ""), res.get("hook_text", ""))
        
    return res
