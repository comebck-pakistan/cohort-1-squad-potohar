import re
from app.schemas.proposal import ActionRequest
from app.services.llm_client import client
from app.config import settings

def execute_writer(request: ActionRequest) -> dict:
    if settings.is_placeholder_llm():
        return {"draft_text": "Hi there! I am a great fit for this job... (Placeholder)", "hook_text": "I noticed you need React expertise. (Placeholder)"}

    prompt = f"""
    You are an expert freelance proposal writer.
    Draft a proposal for this job based ONLY on the freelancer's profile.
    DO NOT fabricate or hallucinate any experience, tools, or skills not explicitly listed.
    Reference at least one concrete specific from their profile.
    
    Job Description:
    {request.jobData.rawDescription}
    
    Freelancer Profile:
    Name: {request.freelancerProfile.name}
    Skills: {', '.join(request.freelancerProfile.skills)}
    Experience: {request.freelancerProfile.yearsExp} years
    Bio: {request.freelancerProfile.bio}
    
    Provide your response in this exact format:
    HOOK: [A strong 1-2 sentence opening hook]
    DRAFT: [The rest of the proposal draft]
    """
    
    response = client.messages.create(
        model=settings.anthropic_model_writer,
        max_tokens=800,
        messages=[{"role": "user", "content": prompt}]
    )
    
    text = response.content[0].text
    
    hook_match = re.search(r"HOOK:\s*(.*?)(?=DRAFT:|$)", text, re.DOTALL)
    draft_match = re.search(r"DRAFT:\s*(.*)", text, re.DOTALL)
    
    hook = hook_match.group(1).strip() if hook_match else "I'd love to help you with this project."
    draft = draft_match.group(1).strip() if draft_match else text

    return {
        "hook_text": hook,
        "draft_text": draft
    }
