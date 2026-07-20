from pydantic import BaseModel
from typing import Optional

class ExtractedJobData(BaseModel):
    sourcePlatform: str
    rawDescription: str
    clientRating: Optional[float] = None
    paymentVerified: str
    proposalCount: Optional[int] = None
    budgetAmount: Optional[float] = None
    budgetType: str
    postedAt: Optional[str] = None
    totalClientSpend: Optional[float] = None
    clientHireCount: Optional[int] = None
    offPlatformFlag: bool
    unpaidTestFlag: bool
    extractionMethod: str
