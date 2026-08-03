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
  "budgetMin": "number | null",
  "budgetMax": "number | null",
  "currency": "string | null",
  "experienceLevel": "string | null",
  "skills": ["string"],
  "paymentVerified": "boolean | null",
  "proposalRange": "string | null",
  "proposalMin": "number | null",
  "proposalMax": "number | null",
  "postedAt": "string | null",
  "proposalCount": "number | null",
  "client": {
    "rating": "number | null",
    "reviewCount": "number | null",
    "hireRate": "number | null",
    "jobsPosted": "number | null",
    "totalHires": "number | null",
    "totalSpent": "string | null",
    "country": "string | null"
  },
  "activity": {
    "lastViewedByClient": "string | null",
    "interviewingCount": "number | null",
    "invitesSent": "number | null",
    "unansweredInvites": "number | null",
    "hiresForThisJob": "number | null"
  }
}

# Provisional LLM scoring framework. The qualitative factors come from the
# project's user research; the numerical weights and bands must be calibrated
# against reviewed job examples rather than presented as research findings.
EVALUATION_FRAMEWORK = {
  "weights": {
    "freelancerAlignment": 35,
    "opportunityVisibility": 25,
    "clientQuality": 25,
    "budgetRealism": 10,
    "scopeClarity": 5
  },
  "decisionBands": {
    "apply": "70-100",
    "caution": "40-69",
    "skip": "0-39"
  },
  "unknownEvidenceRule": (
    "Missing information is uncertainty, not negative evidence. Give a factor "
    "with insufficient evidence a neutral score of 50 and lower confidence."
  ),
  "factorRubrics": {
    "freelancerAlignment": {
      "90-100": "Direct match across nearly all core skills and experience.",
      "70-89": "Strong match with only minor, learnable, or optional gaps.",
      "50-69": "Partial match with meaningful relevant capability.",
      "25-49": "Weak or mostly adjacent match.",
      "0-24": "No meaningful relevant skills or a clear experience mismatch."
    },
    "opportunityVisibility": {
      "80-100": "Fresh job, manageable competition, and positive client activity.",
      "60-79": "Generally favorable visibility with limited pressure.",
      "40-59": "Mixed, unknown, or moderate competition/activity signals.",
      "20-39": "Stale or crowded job with weak activity.",
      "0-19": "Strong combined evidence of abandonment or extreme saturation."
    },
    "clientQuality": {
      "80-100": "Verified client with strong rating and credible hiring/spend history.",
      "60-79": "Several positive credibility or hiring signals.",
      "50": "Insufficient client history; new or unknown is neutral.",
      "30-49": "Some concerns but no explicit scam evidence.",
      "0-29": "Strong explicit legitimacy, payment, or behavior concerns."
    },
    "budgetRealism": {
      "80-100": "Budget is clearly realistic for the stated scope.",
      "60-79": "Generally reasonable with minor uncertainty.",
      "40-59": "Unknown, negotiable, or difficult to judge from the scope.",
      "20-39": "Materially low for the stated work.",
      "0-19": "Clearly exploitative or implausible for the requirements."
    },
    "scopeClarity": {
      "80-100": "Specific deliverables, requirements, and outcome.",
      "60-79": "Mostly clear with limited ambiguity.",
      "40-59": "Mixed or incomplete scope.",
      "20-39": "Vague requirements with meaningful delivery risk.",
      "0-19": "Contradictory or effectively undefined scope."
    }
  },
  "hardSkipEvidence": [
    "Explicit scam behavior or a request for off-platform payment.",
    "Required unpaid work presented as a condition of being hired.",
    "No meaningful freelancer skill match for specialized work.",
    "Clearly exploitative compensation relative to the explicit scope.",
    "Strong combined ghost-job evidence; age or missing activity alone is insufficient."
  ]
}
