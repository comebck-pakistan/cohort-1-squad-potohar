from app.schemas.proposal import ActionRequest
from app.services.llm_client import client
from app.config import settings

def execute_analyst(request: ActionRequest) -> dict:
    if settings.is_placeholder_llm():
        return {"error": "Anthropic API key not configured. Placeholder analysis returned.", "match_score": 85, "reasoning": "Looks like a solid match based on skills."}
        
    prompt = f"""
    You are an expert technical analyst. Explain why the following job is a good or weak fit for the freelancer.
    The deterministic decision is already final. Do NOT decide Apply/Caution/Skip. The system has decided: {request.decision.decision}.
    Just provide an analysis based on their profile.
    
    Job Description:
    {request.jobData.rawDescription}
    
    Freelancer Profile:
    Name: {request.freelancerProfile.name}
    Skills: {', '.join(request.freelancerProfile.skills)}
    Experience: {request.freelancerProfile.yearsExp} years
    Bio: {request.freelancerProfile.bio}
    """
    
    response = client.messages.create(
        model=settings.anthropic_model_analyst,
        max_tokens=500,
        messages=[{"role": "user", "content": prompt}]
    )
    
    return {
        "reasoning": response.content[0].text,
        "match_score": request.decision.score
    }
