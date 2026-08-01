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

# --- REBALANCED EVALUATION FRAMEWORK ---
EVALUATION_FRAMEWORK = {
  "weights": {
    "freelancerAlignment": 35,
    "clientQuality": 20,
    "competition": 20,
    "freshness": 15,
    "budgetRealism": 10
  },
  "decisionBands": {
    "apply": "75-100",
    "caution": "50-74",
    "skip": "0-49"
  },
  "rules": [
    "PRIMARY FOCUS: The freelancer's skill and experience alignment is the most important metric (35% of the score).",
    "SKILL FORGIVENESS: If the freelancer possesses a strong majority of the required skills (e.g., 8 out of 10), score this highly. Do not severely penalize the score for 1 or 2 missing minor skills.",
    "APPLY BAND ENCOURAGEMENT: If the job has a verified client, a realistic budget, and is a strong match for the freelancer, confidently award a score in the 80s or 90s (Apply).",
    "Return 'Apply with Caution' if the job is viable but has mixed signals (e.g., a perfect skill match but unverified payment, or a great client but high competition).",
    "Return 'Skip' ONLY when the job is clearly a scam, severely lowballing, heavily overcrowded, or the freelancer has zero relevant skills."
  ]
}