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
- A first-run profile form stores the freelancer profile in `chrome.storage.local`.
- The saved profile is reused for every job and improves skill-match evaluation and proposal personalization.
- The widget supports both conventional `/jobs/~...` pages and selected-job panels in Upwork Find Work. It does not call Gemini until the user selects **Analyze this job**.
- Navigation handling is debounced and ignores responses from a job page that is no longer open.

## Files

- `content.js` captures the Upwork page text and renders the floating widget.
- `background.js` receives the page text and runs the staged pipeline.
- `pipeline.js` holds the Gemini API helpers plus the three prompt stages.
- `manifest.json` grants the extension permission to persist the profile locally.

## Freelancer Profile

On the first supported Upwork jobs or Find Work page, the extension asks for:

- name (required)
- experience level (required)
- skills (required, comma-separated)
- portfolio URLs (optional)
- bio (optional)

The profile is saved once in the browser under `freelancerProfile`. It is passed to stages 2 and 3, but it is not sent to Gemini during stage 1 extraction. The prototype does not require a backend to work; the existing FastAPI/Supabase backend can be connected later for account-based syncing and cross-device storage.

## Navigation and Request Safety

The content script is present throughout Upwork so that Find Work, search, and conventional job routes behave consistently. It never automatically analyzes a page: it reads `document.body.innerText` exactly once only after the user selects **Analyze this job**, and it invalidates an in-flight response when the user navigates away.

The background worker accepts messages only from Upwork content scripts. Gemini requests have a 45-second timeout and page text is capped before sending. The extension does not click, scroll, submit, navigate, or fetch Upwork pages.

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
- If the Gemini API key is still the placeholder value, the extension will stop with a clear error. A real deployment must move this key behind an authenticated backend; any client-side key can be extracted by an extension user.
