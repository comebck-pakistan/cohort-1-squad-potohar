from fastapi import FastAPI
from app.services.llm_client import analyze_fit, AnalysisRequest

app = FastAPI(title="Connects Budget Optimizer API")

@app.get("/health")
def health_check():
    return {"status": "ok"}

@app.post("/analysis")
def get_analysis(request: AnalysisRequest):
    return analyze_fit(request)

@app.post("/pricing")
def get_pricing(request: AnalysisRequest):
    return {"suggested_rate_min": 50, "suggested_rate_max": 75, "rationale": "Based on market rates for this stack."}

@app.post("/proposal")
def get_proposal(request: AnalysisRequest):
    return {"draft_text": "Hi there! I am a great fit for this job...", "hook_text": "I noticed you need React expertise."}

