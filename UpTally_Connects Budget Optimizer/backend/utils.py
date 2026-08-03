import re
import json
from typing import Any

EVALUATION_WEIGHTS = {
    "freelancerAlignment": 0.35,
    "opportunityVisibility": 0.25,
    "clientQuality": 0.25,
    "budgetRealism": 0.10,
    "scopeClarity": 0.05,
}

def normalize_job_text(text: str) -> str:
    normalized = str(text or "")
    normalized = normalized.replace("\u00a0", " ")
    normalized = re.sub(r"[ \t]+", " ", normalized)
    normalized = re.sub(r"\n{3,}", "\n\n", normalized).strip()

    if len(normalized) <= 50000:
        return normalized
    return f"{normalized[:50000]}\n\n[Page text truncated for request safety.]"

def strip_code_fences(text: str) -> str:
    text = re.sub(r"^```(?:json)?\s*", "", str(text or ""), flags=re.IGNORECASE)
    text = re.sub(r"```$", "", text, flags=re.IGNORECASE)
    return text.strip()

def extract_json_substring(text: str) -> str:
    stripped = strip_code_fences(text)
    first_brace = stripped.find("{")
    last_brace = stripped.rfind("}")
    if first_brace == -1 or last_brace == -1 or last_brace <= first_brace:
        return stripped
    return stripped[first_brace:last_brace + 1]

def parse_json(text: str, label: str) -> dict:
    cleaned = extract_json_substring(text)
    
    # Attempt 1: Standard single object parse
    try:
        parsed = json.loads(cleaned, strict=False)
        if isinstance(parsed, list) and len(parsed) > 0:
            return parsed[0]
        if isinstance(parsed, dict):
            return parsed
    except Exception:
        pass

    # Attempt 2: Raw stream decode (Grabs the first valid object and ignores trailing noise)
    try:
        decoder = json.JSONDecoder(strict=False)
        start_brace = cleaned.find('{')
        start_bracket = cleaned.find('[')
        valid_starts = [i for i in [start_brace, start_bracket] if i != -1]
        
        if valid_starts:
            start_idx = min(valid_starts)
            parsed, _ = decoder.raw_decode(cleaned[start_idx:])
            if isinstance(parsed, list) and len(parsed) > 0:
                return parsed[0]
            if isinstance(parsed, dict):
                return parsed
    except Exception:
        pass

    # Attempt 3: Auto-repair if the AI genuinely ran out of tokens
    repaired = cleaned
    if repaired.count('"') % 2 != 0:
        repaired += '"'
    open_brackets = repaired.count('[') - repaired.count(']')
    if open_brackets > 0:
        repaired += ']' * open_brackets
    open_braces = repaired.count('{') - repaired.count('}')
    if open_braces > 0:
        repaired += '}' * open_braces

    try:
        parsed = json.loads(repaired, strict=False)
        if isinstance(parsed, list) and len(parsed) > 0:
            return parsed[0]
        if isinstance(parsed, dict):
            return parsed
    except Exception:
        pass

    raise ValueError(f"Could not parse {label} JSON. Received Text:\n{cleaned[:1000]}")

def normalize_decision(decision: Any) -> str:
    value = str(decision or "").lower()
    if "apply" in value and "caution" in value:
        return "Apply with Caution"
    if "apply" in value:
        return "Apply"
    if "skip" in value:
        return "Skip"
    return "Apply with Caution"


def validate_evaluation(evaluation: Any) -> dict:
    """Validate the LLM's scoring arithmetic without making the decision for it."""
    if not isinstance(evaluation, dict):
        raise ValueError("Evaluation must be a JSON object.")

    score = evaluation.get("score")
    if isinstance(score, bool) or not isinstance(score, int) or not 0 <= score <= 100:
        raise ValueError("Evaluation score must be an integer from 0 to 100.")

    confidence = evaluation.get("confidence")
    if (
        isinstance(confidence, bool)
        or not isinstance(confidence, (int, float))
        or not 0 <= confidence <= 1
    ):
        raise ValueError("Evaluation confidence must be a number from 0 to 1.")

    factor_scores = evaluation.get("factorScores")
    if not isinstance(factor_scores, dict):
        raise ValueError("Evaluation factorScores must be an object.")

    weighted_score = 0.0
    for factor, weight in EVALUATION_WEIGHTS.items():
        value = factor_scores.get(factor)
        if isinstance(value, bool) or not isinstance(value, (int, float)) or not 0 <= value <= 100:
            raise ValueError(f"Evaluation factor {factor} must be a number from 0 to 100.")
        weighted_score += value * weight

    normalized_decision = normalize_decision(evaluation.get("decision"))
    hard_skip_evidence = evaluation.get("hardSkipEvidence")

    if hard_skip_evidence:
        if normalized_decision != "Skip" or score != 0:
            raise ValueError("A hard Skip must return decision Skip and score 0.")
        evaluation["decision"] = normalized_decision
        return evaluation

    # Allow one point for ordinary rounding differences, but not invented totals.
    if abs(float(score) - round(weighted_score)) > 1:
        raise ValueError(
            f"Evaluation score {score} does not match weighted factor score {round(weighted_score)}."
        )

    expected_decision = (
        "Apply" if score >= 70 else "Apply with Caution" if score >= 40 else "Skip"
    )
    if normalized_decision != expected_decision:
        raise ValueError(
            f"Evaluation decision {normalized_decision} does not match score band {expected_decision}."
        )

    # Store the canonical label, but never change its score-derived band.
    evaluation["decision"] = normalized_decision
    return evaluation
