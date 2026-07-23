# Connects Budget Optimizer Prototype

This folder contains the working Upwork extension prototype for the Comeback Pakistan program.

## Current Architecture

The prototype keeps the original extraction source:

```text
Upwork job page
  -> document.body.innerText
  -> LLM stage 1: extraction
  -> structured JSON
  -> LLM stage 2: evaluation
  -> decision
  -> LLM stage 3: proposal generation
```

## What Changed

- The abandoned parser-heavy flow was removed from the prototype.
- Extraction still uses `document.body.innerText`.
- Stage 1 now converts raw page text into strict JSON.
- Stage 2 evaluates the extracted job with a Connects ROI rubric.
- Stage 3 generates a proposal only when the decision is not `Skip`.

## Files

- `content.js` captures the Upwork page text and renders the floating widget.
- `background.js` receives the page text and runs the staged pipeline.
- `pipeline.js` holds the Gemini API helpers plus the three prompt stages.

## Output Shape

Stage 1 returns structured job data with fields for:

- title
- description
- budget type and amount
- experience level
- skills
- payment verification
- proposal range
- posted time
- proposal count
- client metadata

Stage 2 returns:

- decision
- confidence
- score
- pros
- cons
- reasoning

Stage 3 returns:

- fit explanation
- proposal draft

## Notes

- Unknown values remain `null`.
- No regex parser is used for the LLM extraction step.
- If the Gemini API key is still the placeholder value, the extension will stop with a clear error.
