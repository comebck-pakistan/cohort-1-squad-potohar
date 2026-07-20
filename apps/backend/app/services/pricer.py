import re
from app.schemas.proposal import ActionRequest
from app.services.llm_client import client
from app.config import settings

def execute_pricer(request: ActionRequest) -> dict:
    if settings.is_placeholder_llm():
        return {"suggested_rate_min": 50, "suggested_rate_max": 75, "rationale": "Based on market rates for this stack. (Placeholder)"}

    prompt = f"""
    You are an expert technical pricing strategist.
    Suggest a pricing strategy (hourly rate or fixed budget) for this job based on the freelancer's target rates.
    Freelancer Hourly Target: ${request.freelancerProfile.targetRateHourly or 'Not set'}
    Freelancer Project Target: ${request.freelancerProfile.targetRateProject or 'Not set'}
    
    Job Budget: {request.jobData.budgetAmount or 'Unknown'} {request.jobData.budgetType}
    Job Description: {request.jobData.rawDescription}
    
    Provide your response in this exact format:
    MIN: [number]
    MAX: [number]
    RATIONALE: [your reasoning]
    
    Ensure your MIN is NOT below the freelancer's target rate unless the job specifically justifies it. Do not silently undercut.
    """
    
    response = client.messages.create(
        model=settings.anthropic_model_pricer,
        max_tokens=500,
        messages=[{"role": "user", "content": prompt}]
    )
    
    text = response.content[0].text
    
    min_match = re.search(r"MIN:\s*(\d+(?:\.\d+)?)", text)
    max_match = re.search(r"MAX:\s*(\d+(?:\.\d+)?)", text)
    rationale_match = re.search(r"RATIONALE:\s*(.*)", text, re.DOTALL)
    
    s_min = float(min_match.group(1)) if min_match else 0
    s_max = float(max_match.group(1)) if max_match else 0
    rationale = rationale_match.group(1).strip() if rationale_match else text

    return {
        "suggested_rate_min": s_min,
        "suggested_rate_max": s_max,
        "rationale": rationale
    }
