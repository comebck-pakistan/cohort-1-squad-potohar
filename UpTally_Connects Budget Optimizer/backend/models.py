from pydantic import BaseModel
from typing import Optional, Dict, Any

# Payloads
class AnalyzePayload(BaseModel):
    pageText: str
    profile: Optional[Dict[str, Any]] = None


# Exact Schemas and Frameworks
EXTRACTION_SCHEMA = {
  "title": "string | null",
  "description": "string | null",
  "budgetType": '"Hourly" | "Fixed" | null',
  "budgetAmount": "number | null",
  "experienceLevel": "string | null",
  "skills": ["string"],
  "paymentVerified": "boolean | null",
  "proposalRange": "string | null",
  "postedAt": "string | null",
  "proposalCount": "number | null",
  "client": {
    "hireRate": "number | null",
    "totalSpent": "string | null",
    "country": "string | null"
  }
}

EVALUATION_FRAMEWORK = {
  "weights": {
    "freshness": 30,
    "competition": 25,
    "clientQuality": 25,
    "budgetRealism": 10,
    "scopeClarity": 10
  },
  "decisionBands": {
    "apply": "80-100",
    "caution": "50-79",
    "skip": "0-49"
  },
  "rules": [
    "Use missing information conservatively instead of guessing.",
    "A job with weak competition signals or stale timing should lose score quickly.",
    "A job with strong client quality but poor budget or heavy competition should usually be Apply with Caution, not Apply.",
    "Return Skip when the job is not worth spending Connects on."
  ]
}