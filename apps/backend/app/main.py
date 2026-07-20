from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.routers import analysis, proposals, outcomes

app = FastAPI(title="Connects Budget Optimizer API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], # Since it's a Chrome extension, we allow all origins or specifically chrome-extension://
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/health")
def health_check():
    return {"status": "ok"}

app.include_router(analysis.router)
app.include_router(proposals.router)
app.include_router(outcomes.router)
