from pydantic import BaseModel
from typing import List, Optional

class FreelancerProfile(BaseModel):
    name: str
    skills: List[str]
    yearsExp: int
    targetRateHourly: Optional[float] = None
    targetRateProject: Optional[float] = None
    portfolioUrls: List[str]
    bio: str
