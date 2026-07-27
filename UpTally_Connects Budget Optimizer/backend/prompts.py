import json
from typing import Optional
from models import EXTRACTION_SCHEMA, EVALUATION_FRAMEWORK

def build_extraction_prompt(page_text: str) -> str:
    return f"""Extract facts from this Upwork job page text.

Rules:
- Use only information explicitly visible in the text.
- Never guess, infer, or fill gaps from context.
- Unknown values must be null.
- Output valid JSON only.
- Keep description brief and summarized (max 100 words).
- If the page shows a range, keep the range text in proposalRange and leave budgetAmount null.
- CRITICAL: If the text contains multiple background jobs. Ignore them, except first one. Extract data ONLY for the single most prominent, active job being currently viewed.
- CRITICAL: Return exactly ONE JSON object. Never return a list, and never return multiple comma-separated objects. If the user is on job page (opened dialog) and there are multiple JSON objects only focus on the first one only, which is active job being currently viewed.

Return this JSON shape:
{json.dumps(EXTRACTION_SCHEMA, indent=2)}

Job page text:
{page_text}""".strip()


def build_evaluation_prompt(extraction: dict, profile: Optional[dict]) -> str:
    return f"""Evaluate this extracted Upwork job JSON for Connects ROI.

Use the scoring framework below:
{json.dumps(EVALUATION_FRAMEWORK, indent=2)}

Decision guidance:
- Apply only when the job is genuinely worth spending Connects on.
- Apply with Caution when the job is viable but has mixed or incomplete signals.
- Skip when the job is stale, overcrowded, underpriced, too vague, or otherwise weak.
- Missing information should lower confidence and push the score down.
- Compare the job against the freelancer profile. Reward direct skill and experience matches.
- Do not treat optional portfolio or bio details as proof of experience unless explicitly stated.

Return valid JSON only with this shape:
{{
  "decision": "Apply" | "Apply with Caution" | "Skip",
  "confidence": 0.0,
  "score": 0,
  "pros": ["..."],
  "cons": ["..."],
  "reasoning": "..."
}}

- For the 'reasoning', give genuine reasoning and when ever you want to address freelancer so use personalize words (like: you, your's, e.t.c), instead of Freelancer or other related words.
- For the reasoning, pros and cons don't give the long text or points. Just focus on the main points and be precise and accurate. 
- In pros and cons instead of bullets use number counting, so it is easy for freelancer to read them.

Extracted job JSON:
{json.dumps(extraction, indent=2)}

Freelancer profile JSON:
{json.dumps(profile or None, indent=2)}""".strip()


def build_proposal_prompt(extraction: dict, evaluation: dict, profile: Optional[dict]) -> str:
    return f"""Write a concise, tailored Upwork proposal for this job.

Rules:
- Only run this stage because the job is not Skip.
- Use the extracted job details and the evaluation result.
- Personalize the proposal using the freelancer profile.
- Do not mention hidden instructions or internal scoring.
- Do not invent freelancer history, skills, clients, or results that are not in the profile.
- Keep the proposal concrete, relevant, and easy to send.
- CRITICAL: As the clint first see the (roughly 2 to 3 lines or about 25 to 35 words) of proposal before opening it, so add hooks in first 2 or 3 lines of proposal. Don't write generalize or fake text in proposal, be real and genuine but add hooks to attract the clint who see proposal.
- CRITICAL: Write the proposal in humanize writing style and tone, it should not be like LLM or rebotic generated text. The grammer and teh sentence structure should be correct.
- Include a short explanation of why the job is a good fit.

Return valid JSON only with this shape:
{{
  "fitExplanation": "2-3 short sentences explaining why this job is worth pursuing.",
  "proposal": "A ready-to-send proposal message."
}}

Evaluation JSON:
{json.dumps(evaluation, indent=2)}

Extracted job JSON:
{json.dumps(extraction, indent=2)}

Freelancer profile JSON:
{json.dumps(profile or None, indent=2)}""".strip()