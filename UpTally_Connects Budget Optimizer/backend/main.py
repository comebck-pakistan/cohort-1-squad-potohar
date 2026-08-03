import json

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from models import AnalyzePayload
from utils import normalize_job_text, normalize_decision, validate_evaluation
from prompts import (
    build_extraction_prompt,
    build_evaluation_prompt,
    build_proposal_prompt,
)
from services import call_gemini_stage

app = FastAPI()

# Render Keep-Alive Route
@app.get("/")
async def health_check():
    return {"status": "awake"}

app.add_middleware(
    CORSMiddleware,
    allow_origin_regex=r"chrome-extension://hbiacnmbakabgindndoepmmenajbddao",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.post("/api/analyze")
async def run_job_analysis_pipeline(payload: AnalyzePayload):
    try:
        normalized_text = normalize_job_text(payload.pageText)

        # Stage 1: Extraction
        extraction_prompt = build_extraction_prompt(normalized_text)
        extraction = await call_gemini_stage(
            stage_name="stage 1 extraction",
            system_instruction="You are stage 1 of a three-stage Upwork analysis pipeline. Extract only explicit facts and output strict JSON.",
            prompt=extraction_prompt,
            temperature=0.1,
            max_tokens=1500
        )

        # Stage 2: Evaluation
        evaluation_prompt = build_evaluation_prompt(extraction, payload.profile)
        evaluation = await call_gemini_stage(
            stage_name="stage 2 evaluation",
            system_instruction="You are stage 2 of a three-stage Upwork analysis pipeline. Evaluate the extracted job JSON and output strict JSON.",
            prompt=evaluation_prompt,
            temperature=0.2,
            max_tokens=1500
        )

        # The LLM still owns the evaluation. Validation only catches arithmetic
        # or band inconsistencies and gives the model one chance to correct them.
        try:
            evaluation = validate_evaluation(evaluation)
        except ValueError as validation_error:
            correction_prompt = f"""{evaluation_prompt}

Your previous response failed structural validation:
{validation_error}

Previous response:
{json.dumps(evaluation, indent=2)}

Return the complete corrected evaluation JSON only. Recalculate every factor,
the weighted score, and the matching decision band. Do not change job facts."""
            evaluation = await call_gemini_stage(
                stage_name="stage 2 evaluation correction",
                system_instruction="You are correcting an internally inconsistent Upwork evaluation. Output strict JSON only.",
                prompt=correction_prompt,
                temperature=0.1,
                max_tokens=1500
            )
            evaluation = validate_evaluation(evaluation)

        # Stage 3: Proposal (Conditional)
        proposal = None
        proposal_error = None
        if normalize_decision(evaluation.get("decision")) != "Skip":
            try:
                proposal_prompt = build_proposal_prompt(extraction, evaluation, payload.profile)
                proposal = await call_gemini_stage(
                    stage_name="stage 3 proposal generation",
                    system_instruction="You are stage 3 of a three-stage Upwork analysis pipeline. Write a concise proposal and fit explanation, and output strict JSON.",
                    prompt=proposal_prompt,
                    temperature=0.5,
                    max_tokens=900
                )
            except Exception as e:
                proposal_error = str(e) if isinstance(e, Exception) else "Proposal generation failed."

        result_data = {
            "profile": payload.profile,
            "extraction": extraction,
            "evaluation": evaluation,
            "proposal": proposal,
            "proposalError": proposal_error
        }

        return {"success": True, "data": result_data}

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
