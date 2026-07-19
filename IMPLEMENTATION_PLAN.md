# Technical Implementation Plan

## Product Direction

Build the final MVP as a Chrome extension for developer freelancers on Upwork. The existing `extension-prototype` proves the client-side page detection and floating overlay behavior, so the first implementation should preserve that UX while replacing the current LLM-driven decision flow with the deterministic gate required by `srs.md`.

The final product uses the full requested stack:

- Extension: Plasmo, Manifest V3, TypeScript, React, Tailwind
- Backend: FastAPI
- Database: Supabase
- LLM provider: Anthropic, config-driven
- Tests: Vitest for TypeScript, pytest for Python
- Formatting/linting: ESLint, Prettier, Ruff, Black

Credentials are not available yet, so all provider, Supabase, and deployment values should be scaffolded as placeholders in `.env.example` files only. No real secrets belong in the repo.

## Core Architecture

```text
apps/
  extension/
    src/
      contents/
        upwork-job-overlay.tsx
      modules/
        extraction/
          extractJobData.ts
          parseUpworkText.ts
        decision-engine/
          calculateScore.ts
          decisionTypes.ts
        profile/
          profileStorage.ts
          profileTypes.ts
        api/
          backendClient.ts
        ui/
          FloatingOverlay.tsx
          ProfileSetup.tsx
          JobScorePanel.tsx
          AiActionsPanel.tsx
  backend/
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
packages/
  shared/
    src/
      skillTaxonomy.ts
      types.ts
```

For the MVP, profile data is local-first in Chrome storage. Backend/Supabase integration should be scaffolded and ready, but extension scoring must not depend on a remote profile fetch.

## Non-Negotiable Boundaries

- The extension only reads the currently open Upwork tab.
- No background crawling, polling of unopened pages, bulk collection, or automatic applying.
- The deterministic Decision Engine makes Apply/Caution/Skip decisions.
- The LLM never makes or overrides the Apply/Caution/Skip decision.
- Skip path makes zero LLM calls.
- The extension never calls Anthropic or any model provider directly.
- The extension should not store full raw HTML. Keep structured fields and only the raw description text needed for scoring/proposals.
- Manifest permissions stay narrow: Upwork host permissions plus `storage`.

## Phase 0: Scaffold and Migration Foundation

### Goals

- Convert from raw prototype files to a maintainable Plasmo extension.
- Preserve the floating overlay interaction from `extension-prototype/content.js`.
- Establish module boundaries before adding features.

### Tasks

1. Create workspace structure for `apps/extension`, `apps/backend`, and `packages/shared`.
2. Scaffold Plasmo extension with React, TypeScript, Tailwind, ESLint, Prettier, and Vitest.
3. Scaffold FastAPI backend with Ruff, Black, pytest, and `.env.example`.
4. Move the prototype page detection behavior into `apps/extension/src/contents/upwork-job-overlay.tsx`.
5. Remove direct Gemini/provider host permissions from the extension manifest.
6. Add placeholder environment examples:
   - `ANTHROPIC_API_KEY=replace_me`
   - `ANTHROPIC_MODEL_ANALYST=replace_me`
   - `ANTHROPIC_MODEL_PRICER=replace_me`
   - `ANTHROPIC_MODEL_WRITER=replace_me`
   - `SUPABASE_URL=replace_me`
   - `SUPABASE_SERVICE_ROLE_KEY=replace_me`
   - `BACKEND_API_BASE_URL=http://localhost:8000`

### Acceptance

- Extension still detects Upwork job pages and displays a floating overlay.
- No LLM call exists in the extension.
- Backend starts locally with a health endpoint.

## Phase 1: Extraction Module

### Goals

Turn the prototype's raw `document.body.innerText` collection into structured job data matching SRS Section 7.

### Data Shape

```ts
type ExtractedJobData = {
  sourcePlatform: "upwork";
  rawDescription: string;
  clientRating: number | null;
  paymentVerified: "yes" | "no" | "unknown";
  proposalCount: number | null;
  budgetAmount: number | null;
  budgetType: "hourly" | "fixed" | "unknown";
  postedAt: string | null;
  totalClientSpend: number | null;
  clientHireCount: number | null;
  offPlatformFlag: boolean;
  unpaidTestFlag: boolean;
  extractionMethod: "auto_scrape" | "manual_fallback";
};
```

### Tasks

1. Add `extractJobData(pageText: string): ExtractedJobData`.
2. Add parser helpers for:
   - proposal count brackets such as `Less than 5`, `10 to 15`, `50+`
   - posted time such as `10 minutes ago`, `2 hours ago`, `yesterday`
   - fixed and hourly budgets
   - client rating
   - payment verification
   - total client spend
   - hire count
3. Add keyword checks for:
   - off-platform payment/contact
   - unpaid test work
4. Add editable field state in the overlay so users can correct missing or wrong values.

### Acceptance

- Extraction always returns a stable object, even when fields are missing.
- Fixed-price and hourly jobs both parse into the same shape.
- Missing fields degrade gracefully rather than blocking scoring.

## Phase 2: Local Profile Setup

### Goals

Implement FR-1 locally first using Chrome storage.

### Profile Shape

```ts
type FreelancerProfile = {
  name: string;
  skills: string[];
  yearsExp: number;
  targetRateHourly: number | null;
  targetRateProject: number | null;
  portfolioUrls: string[];
  bio: string;
};
```

### Tasks

1. Build `profileStorage.ts` on top of `chrome.storage.local`.
2. Add a floating-overlay profile setup state when no profile exists.
3. Use Appendix A skill taxonomy as selectable skill tags.
4. Validate required fields before allowing AI actions.
5. Keep scoring available only when profile data required by the Decision Engine is present.

### Acceptance

- Profile persists locally.
- No downstream LLM action can be triggered without profile data.
- The user can update their profile without reinstalling the extension.

## Phase 3: Deterministic Decision Engine

### Goals

Build SRS Section 8 as a pure, fully tested function.

### Public API

```ts
calculateScore(
  jobData: ExtractedJobData,
  freelancerProfile: FreelancerProfile
): {
  score: number;
  decision: "Apply" | "Caution" | "Skip";
  reason: string;
  factors?: {
    clientQuality: number;
    competition: number;
    budget: number;
    scopeClarity: number;
    skillMatch: number;
  };
};
```

### Tasks

1. Implement hard disqualifiers first:
   - off-platform contact/payment
   - unpaid test work
   - pay rate anomaly
2. Implement weighted factor scoring:
   - client quality: 30%
   - competition: 25%
   - budget realism: 20%
   - scope clarity: 15%
   - skill match: 10%
3. Compute `proposals_per_hour` from proposal count and posted timestamp.
4. Match job text against the freelancer's declared skill tags.
5. Return the lowest scoring factor as the one-line reason.
6. Add unit tests for hard disqualifiers and weighted scoring.

### Acceptance

- Same input always returns same output.
- No network calls, storage calls, or LLM imports exist in the module.
- Skip path is test-covered separately from weighted scoring.

## Phase 4: Overlay Scoring Flow

### Goals

Wire extraction, local profile, and deterministic scoring into the existing floating overlay UX.

### Tasks

1. On job page detection:
   - read page text
   - extract structured job data
   - load local profile
   - calculate score
   - render decision immediately
2. For Skip:
   - show reason
   - hide/disable AI actions
   - log local event
3. For Apply/Caution:
   - show score, reason, and extracted fields
   - show user-triggered AI action buttons
4. Keep field corrections local to the current job snapshot and recalculate score when edited.

### Acceptance

- Decision appears without an AI call.
- Skip has no AI buttons.
- User can correct extracted values and see the score update.

## Phase 5: Backend and LLM Workers

### Goals

Add backend-owned Anthropic calls for Analyst, Pricer, and Writer.

### Tasks

1. Add FastAPI endpoints:
   - `POST /analysis`
   - `POST /pricing`
   - `POST /proposal`
   - `POST /outcomes`
2. Add config-driven Anthropic client.
3. Add strict request/response schemas.
4. Rewrite prompts so workers do not decide Apply/Caution/Skip.
5. Ensure prompts forbid fabricated freelancer experience.
6. Enforce Pricer minimum-rate warning.
7. Return clear errors when placeholder credentials are still configured.

### Acceptance

- Extension calls backend only after Apply/Caution and user action.
- Backend holds model provider credentials.
- Analyst/Pricer/Writer cannot override the deterministic decision.

## Phase 6: Supabase Persistence

### Goals

Persist data according to SRS Section 7 once credentials exist.

### Tasks

1. Add migration SQL for:
   - freelancers
   - job_snapshots
   - scores
   - proposals
   - outcomes
   - events
2. Add backend repository layer.
3. Store job snapshots only after scoring.
4. Store proposal drafts and edited text separately.
5. Add manual outcome logging.

### Acceptance

- App works with placeholder Supabase config in local-only mode.
- Once real credentials are provided, backend can persist SRS data model records.

## Phase 7: Demo Polish

### Goals

Make the MVP usable and credible for demo day.

### Tasks

1. Add concise privacy copy in-product.
2. Add demo metrics:
   - jobs scored
   - jobs skipped
   - estimated connects saved
   - proposals drafted
   - outcomes logged
3. Add loading, error, and empty profile states.
4. Clean encoding issues in docs/comments.
5. Add setup instructions to README.

### Acceptance

- New developer can run extension and backend from README.
- Demo flow works without real credentials up to deterministic scoring.
- AI buttons clearly report missing credentials until real keys are configured.

## Build Order

1. Scaffold extension/backend/shared structure.
2. Port floating overlay behavior.
3. Implement extraction.
4. Implement local profile setup.
5. Implement and test Decision Engine.
6. Wire instant scoring into overlay.
7. Add backend endpoints with placeholder-safe config.
8. Add LLM workers.
9. Add Supabase persistence.
10. Add outcome logging and demo metrics.

## Key Risks

- Upwork DOM text format may vary across job layouts. Mitigation: keep parsers tolerant and make extracted fields editable.
- Proposal count brackets are approximate. Mitigation: convert brackets conservatively and document the conversion.
- Posted time parsing can be ambiguous. Mitigation: preserve `null` and use neutral competition score when timestamp is unknown.
- Skill keyword matching can miss synonyms. Mitigation: start with Appendix A and add aliases later.
- Credentials are unavailable. Mitigation: scaffold placeholder config and make deterministic scoring fully usable without backend credentials.

## Immediate Next Step

Start Phase 0 by scaffolding the final project structure, then port the prototype's page detection and floating overlay into the Plasmo extension before changing behavior.
