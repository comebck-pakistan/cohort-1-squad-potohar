# Project Completion Handoff

This file is the working handoff for any agent continuing the project.

## Source Of Truth

Read these files before changing behavior:

- `D:\Comebck\cohort-1-squad-potohar\IMPLEMENTATION_PLAN.md`
- `D:\Comebck\cohort-1-squad-potohar\srs.md`

The implementation must preserve the SRS boundaries:

- The extension only reads the currently open Upwork tab.
- No background crawling, bulk collection, or auto-applying.
- The deterministic Decision Engine owns Apply/Caution/Skip.
- LLM workers never decide or override Apply/Caution/Skip.
- Skip path makes zero LLM calls.
- The extension never calls Anthropic or any model provider directly.
- Manifest permissions stay narrow: Upwork host permissions plus `storage`.

## Current State

The extension has been partially repaired in `apps/extension`:

- Default Plasmo popup was replaced with product copy.
- Manifest now includes `storage` permission.
- `profileStorage.ts` now uses `chrome.storage.local` directly.
- Local events are stored for `job_scored`, `job_skipped`, and `ai_action_requested`.
- Extraction was split into:
  - `src/modules/extraction/extractJobData.ts`
  - `src/modules/extraction/parseUpworkText.ts`
- Added extraction tests in `src/modules/extraction/extractJobData.test.ts`.
- Added type re-export modules:
  - `src/modules/decision-engine/decisionTypes.ts`
  - `src/modules/profile/profileTypes.ts`
- Decision engine was rewritten to remove encoding issues and keep the deterministic SRS formula isolated.
- Overlay was split into:
  - `src/modules/ui/FloatingOverlay.tsx`
  - `src/modules/ui/JobScorePanel.tsx`
  - `src/modules/ui/AiActionsPanel.tsx`
- `src/modules/api/backendClient.ts` was added.
- AI buttons now call the backend only for Apply/Caution decisions.
- Skip decisions hide AI buttons.
- README in `apps/extension` was replaced with project-specific setup instructions.

Dependency verification was interrupted. Treat the current source as patched but not fully verified.

## Immediate First Step

From `apps/extension`, repair dependencies:

```bash
npm install --no-optional --no-audit --no-fund
```

If that hangs, inspect npm logs under:

```text
C:\Users\Dell\AppData\Local\npm-cache\_logs
```

Then confirm these exist:

```text
node_modules/vitest
node_modules/plasmo
node_modules/eslint
node_modules/@typescript-eslint/parser
```

If a `package-lock.json` is generated, keep it.

## Extension Verification

Run these from `apps/extension`:

```bash
npm run test
npm run typecheck
npm run lint
npm run build
```

Fix all failures. Do not skip verification unless dependency installation is genuinely blocked.

Expected risk areas:

- ESLint may need config tuning for React/TypeScript.
- Plasmo may require generated `.plasmo/index.d.ts`.
- `process.env.PLASMO_PUBLIC_BACKEND_API_BASE_URL` in `backendClient.ts` may need Plasmo-compatible typing.
- `chrome.storage` types depend on `@types/chrome`.
- Parser regexes may need small corrections after tests run.

## Extension Completion Checklist

Complete these items against the implementation plan:

- Ensure profile creation and profile editing both work from the floating overlay.
- Ensure extracted fields are editable and score recalculates immediately.
- Ensure changing editable fields marks `extractionMethod` as `manual_fallback`.
- Ensure Skip hides/disables all AI actions.
- Ensure Apply/Caution show AI actions only after profile exists.
- Ensure AI action errors are visible in the overlay.
- Ensure backend calls include job data, freelancer profile, and deterministic decision.
- Ensure no provider SDK or provider host permission exists in the extension.
- Ensure no full raw HTML is stored.
- Add or improve tests for:
  - hourly budget extraction
  - fixed budget extraction
  - proposal bracket extraction
  - posted time extraction including `yesterday`
  - off-platform flag
  - unpaid-test flag
  - hard disqualifiers
  - weighted scoring thresholds

## Backend Completion Checklist

Backend files are under:

```text
D:\Comebck\cohort-1-squad-potohar\apps\backend
```

Complete the planned structure:

```text
app/
  main.py
  config.py
  routers/
    analysis.py
    proposals.py
    outcomes.py
  services/
    llm_client.py
    analyst.py
    pricer.py
    writer.py
    supabase_client.py
  schemas/
    profile.py
    job.py
    score.py
    proposal.py
tests/
```

Required endpoints:

- `GET /health`
- `POST /analysis`
- `POST /pricing`
- `POST /proposal`
- `POST /outcomes`

Backend behavior requirements:

- Load config from environment.
- Keep `.env.example` placeholder-only.
- Return clear placeholder/missing-credential errors.
- Hold Anthropic credentials only in backend.
- Analyst explains fit but does not decide Apply/Caution/Skip.
- Pricer suggests a rate range and warns if below freelancer minimum.
- Writer generates hook/proposal text without fabricating experience.
- All worker prompts must state that the deterministic decision is already final.

## Supabase Persistence

Migration exists at:

```text
apps/backend/supabase/migrations/01_init.sql
```

Finish persistence by adding a repository/client layer that can store:

- freelancers
- job_snapshots
- scores
- proposals
- outcomes
- events

Requirements:

- Store job snapshots only after scoring.
- Store proposal drafts and edited proposal text separately.
- Keep the app usable in local-only mode when Supabase values are placeholders.

## Backend Verification

Add and run:

```bash
pytest
ruff check .
black --check .
```

Tests should cover:

- `/health`
- placeholder credentials
- `/analysis`
- `/pricing`
- `/proposal`
- `/outcomes`
- no worker can override deterministic decision
- pricer minimum-rate warning behavior

## Demo Polish

Before final handoff:

- Add demo metrics:
  - jobs scored
  - jobs skipped
  - estimated connects saved
  - proposals drafted
  - outcomes logged
- Add visible but concise privacy copy.
- Clean any remaining mojibake/encoding text such as `â`.
- Update root and app READMEs so a new developer can run extension and backend.
- Test the full flow on real Upwork job pages:
  - no profile
  - profile setup
  - fixed-price job
  - hourly job
  - Skip job
  - Apply/Caution job
  - backend unavailable
  - backend placeholder credentials

## Done Criteria

The project is complete when:

- Extension tests, typecheck, lint, and build pass.
- Backend tests, Ruff, and Black checks pass.
- Extension demo works without real credentials through deterministic scoring.
- AI buttons clearly report missing backend/provider credentials.
- With real backend credentials, Analyst/Pricer/Writer return grounded outputs.
- Skip path performs no backend or LLM request.
- Manifest permissions are limited to Upwork host permissions plus `storage`.
- Implementation matches `IMPLEMENTATION_PLAN.md` and `srs.md`.
