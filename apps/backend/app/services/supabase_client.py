from supabase import create_client, Client
from app.config import settings
import logging

logger = logging.getLogger(__name__)

def get_supabase_client() -> Client | None:
    if settings.is_placeholder_db():
        logger.warning("Supabase credentials not set. Mocking DB operations.")
        return None
    try:
        return create_client(settings.supabase_url, settings.supabase_service_role_key)
    except Exception as e:
        logger.error(f"Failed to init Supabase client: {e}")
        return None

client = get_supabase_client()

def store_freelancer(profile: dict) -> str | None:
    if not client:
        return "mock_freelancer_id"
    try:
        res = client.table("freelancers").insert({
            "name": profile.get("name"),
            "skills": profile.get("skills", []),
            "years_exp": profile.get("yearsExp", 0),
            "target_rate_hourly": profile.get("targetRateHourly"),
            "target_rate_project": profile.get("targetRateProject"),
            "portfolio_urls": profile.get("portfolioUrls", []),
            "bio": profile.get("bio")
        }).execute()
        return res.data[0]["id"] if res.data else None
    except Exception as e:
        logger.error(f"Failed to store freelancer: {e}")
        return None

def store_job_snapshot(freelancer_id: str, job_data: dict) -> str | None:
    if not client:
        return "mock_job_id"
    try:
        res = client.table("job_snapshots").insert({
            "freelancer_id": freelancer_id,
            "raw_description": job_data.get("rawDescription"),
            "client_rating": job_data.get("clientRating"),
            "payment_verified": job_data.get("paymentVerified"),
            "proposal_count": job_data.get("proposalCount"),
            "budget_amount": job_data.get("budgetAmount"),
            "budget_type": job_data.get("budgetType"),
            "total_client_spend": job_data.get("totalClientSpend"),
            "client_hire_count": job_data.get("clientHireCount"),
            "off_platform_flag": job_data.get("offPlatformFlag"),
            "unpaid_test_flag": job_data.get("unpaidTestFlag")
        }).execute()
        return res.data[0]["id"] if res.data else None
    except Exception as e:
        logger.error(f"Failed to store job snapshot: {e}")
        return None

def store_score(job_id: str, decision: dict) -> str | None:
    if not client or job_id == "mock_job_id":
        return "mock_score_id"
    try:
        res = client.table("scores").insert({
            "job_id": job_id,
            "decision_score": decision.get("score"),
            "decision": decision.get("decision"),
            "reason": decision.get("reason"),
            "match_score": decision.get("match_score")
        }).execute()
        return res.data[0]["id"] if res.data else None
    except Exception as e:
        logger.error(f"Failed to store score: {e}")
        return None

def store_proposal(job_id: str, draft_text: str, hook_text: str) -> str | None:
    if not client or job_id == "mock_job_id":
        return "mock_proposal_id"
    try:
        res = client.table("proposals").insert({
            "job_id": job_id,
            "draft_text": draft_text,
            "hook_text": hook_text
        }).execute()
        return res.data[0]["id"] if res.data else None
    except Exception as e:
        logger.error(f"Failed to store proposal: {e}")
        return None

def store_outcome(job_id: str, outcome: str) -> str | None:
    if not client or job_id == "mock_job_id":
        return "mock_outcome_id"
    try:
        res = client.table("outcomes").insert({
            "job_id": job_id,
            "outcome": outcome
        }).execute()
        return res.data[0]["id"] if res.data else None
    except Exception as e:
        logger.error(f"Failed to store outcome: {e}")
        return None
