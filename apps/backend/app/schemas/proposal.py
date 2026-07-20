from pydantic import BaseModel
from typing import Optional
from app.schemas.profile import FreelancerProfile
from app.schemas.job import ExtractedJobData
from app.schemas.score import DecisionResult

class ActionRequest(BaseModel):
    jobData: ExtractedJobData
    freelancerProfile: FreelancerProfile
    decision: DecisionResult
