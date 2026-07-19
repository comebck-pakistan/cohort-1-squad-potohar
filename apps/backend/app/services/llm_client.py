import os
import anthropic
from pydantic import BaseModel
from dotenv import load_dotenv

load_dotenv()

client = anthropic.Anthropic(
    api_key=os.getenv("ANTHROPIC_API_KEY", "dummy_key")
)

ANALYST_MODEL = os.getenv("ANTHROPIC_MODEL_ANALYST", "claude-3-haiku-20240307")
PRICER_MODEL = os.getenv("ANTHROPIC_MODEL_PRICER", "claude-3-haiku-20240307")
WRITER_MODEL = os.getenv("ANTHROPIC_MODEL_WRITER", "claude-3-sonnet-20240229")

class AnalysisRequest(BaseModel):
    job_description: str
    freelancer_profile: dict

def analyze_fit(request: AnalysisRequest) -> dict:
    prompt = f"""
    You are an expert technical analyst. Explain why the following job is a good or weak fit for the freelancer.
    DO NOT decide whether they should apply or skip. The system has already decided to Apply or Caution.
    Just provide an analysis based on their profile.
    
    Job: {request.job_description}
    Profile: {request.freelancer_profile}
    """
    
    if os.getenv("ANTHROPIC_API_KEY") == "replace_me" or not os.getenv("ANTHROPIC_API_KEY"):
        return {"error": "Anthropic API key not configured. Placeholder analysis returned.", "match_score": 85, "reasoning": "Looks like a solid match based on skills."}
        
    response = client.messages.create(
        model=ANALYST_MODEL,
        max_tokens=500,
        messages=[{"role": "user", "content": prompt}]
    )
    
    return {
        "reasoning": response.content[0].text,
        "match_score": 85 # Mocked for now
    }
