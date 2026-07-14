# Software Requirements Specification — v2.1
## Freelancer's Co-Pilot — Developer Edition MVP

> **Note for the AI coding agent:** This supersedes SRS v2.0. The core requirements, data model, and decision logic are largely unchanged from v2.0 — what changed in this revision is Section 8 (the Decision Engine formula), which was rebuilt from research into what actually predicts a good Upwork outcome, not just first-principles guessing. Read Section 4 before touching any code — you are refactoring working software, not building from a blank repo.

---

## Changelog

| Version | Change | Why |
|---|---|---|
| v2.0 | Job intake automatic (content-script scraping) instead of manual paste-and-tag | Team validated a ToS-safe client-side scraping approach across multiple live Upwork job pages |
| v2.0 | Added Section 4: Current State Assessment + Migration Plan | Existing prototype is functional but relies entirely on the LLM for decisions — needed a deterministic gate retrofit, not a rebuild |
| v2.0 | Decision Engine explicitly separated from LLM calls | Prototype currently makes every decision via LLM — this is the single most important architectural fix |
| v2.0 | Added Profile Setup as a first-class, required feature | Needed for personalized matching/proposals |
| v2.0 | LLM role redefined: explanation and content generation, not decision-making | LLM should never decide Apply/Skip — it writes reasoning and proposals *after* the Decision Engine has already decided |
| v2.1 | Decision Engine rebuilt from 5 factors to a hard-disqualifier gate + 5 weighted factors, with research-backed weights | First-principles weights weren't good enough for a trust-critical feature — see Section 8 for sourcing |
| v2.1 | Added deterministic Skill Match and Scope Clarity sub-scores (no LLM needed) | Both are strong, cheaply computable predictors of proposal outcome that v2.0's formula was missing |
| v2.1 | Added freshness/time-decay to the Competition factor | Raw proposal count alone hides how fast a job is filling up — timing matters as much as volume |

---

## 1. Product Overview

**Problem:** Freelance software developers waste time and money applying to jobs they were never going to win, then submit generic AI-written proposals that clients ignore.

**Solution:** A Chrome extension that automatically reads the currently open job page (client-side, ToS-safe, already validated by the team) and runs it through a deterministic Decision Engine *before* any AI is involved. Only jobs that clear the gate get AI-assisted analysis, pricing, and a personalized proposal draft — the developer edits and submits manually.

**Niche:** Software development freelancers (frontend, backend, full-stack, mobile, DevOps, data engineering).

**Core value proposition:** *"Know if a dev job is worth your time the moment you open it — then get a proposal that actually sounds like you."*

---

## 2. Target User (Persona)

**Primary — "Early-Growth Dev Freelancer"**
- 3+ completed jobs or a public portfolio (GitHub, personal site)
- Applies to 8-15 jobs/week
- Codes well, prices and filters inconsistently
- Feels the cost of bad bids directly — money and time both

**Not the target for this MVP:** freelancers with zero portfolio or work history (no signal for matching to work against).

---

## 3. Non-Goals (Do Not Build These)

- No server-side scraping of Upwork or any platform — client-side DOM reading of the currently authenticated, currently open tab only
- No bulk crawling, background polling, or reading pages the user hasn't actively opened
- No automatic submission of proposals or applications — the human always clicks submit, manually, on the platform
- No storing scraped page data beyond what's needed for scoring (don't archive full page HTML)
- No support for non-technical freelance niches in this MVP
- No LLM call ever making the Apply/Caution/Skip decision — that's the Decision Engine's job, always

---

## 4. Current State Assessment & Migration Plan

**What already works (per team validation):**
- Client-side content script reads Upwork job pages successfully across multiple real jobs tested live
- Extension shell exists and functions in-browser

**What needs to change — this is refactor work, not a rewrite:**

| Component | Current state | Target state |
|---|---|---|
| Data extraction | Working — keep as-is, isolate into its own module if not already | Unchanged, just modularized |
| Decision-making | Entirely LLM-driven | Deterministic Decision Engine (Section 8) becomes the gate; LLM is called only after |
| Personalization | None | Profile Setup (FR-1) feeds every downstream LLM call |
| LLM output role | Currently produces the verdict itself | Redefined to produce *reasoning, matching, pricing rationale, and proposal text* — never the go/no-go decision |

**Migration steps, in order:**
1. Extract the existing scraping logic into an isolated `extraction` module with a clean output shape (see Section 7 field list). Don't touch its internals yet — just make sure it returns structured data.
2. Build the Decision Engine (Section 8) as a pure function, completely separate from the existing LLM call. Unit test it in isolation before wiring it to anything.
3. Insert the Decision Engine between extraction output and the existing LLM call — the LLM call only fires if the Decision Engine returns Apply or Caution.
4. Build Profile Setup (FR-1) and start passing profile data into the LLM calls.
5. Rewrite the LLM prompts so they explain and generate rather than decide — audit the current prompt for any "should I apply?" framing and remove it; the model should assume the answer is already yes and its job is analysis/writing.

---

## 5. Core User Journey

1. **One-time setup:** Developer fills in profile — skills, experience, target rate, portfolio links.
2. **Automatic on page load:** When the developer opens a job page, the extension's content script extracts job + client data automatically. No manual paste required.
3. **Instant decision:** Decision Engine scores the job (Apply / Caution / Skip) in real time, shown in the extension UI, with a one-line reason. No LLM call has happened yet.
4. **If Skip:** Flow ends. Reason shown. Event logged. Zero LLM cost.
5. **If Apply/Caution:** Developer can request AI analysis — Analyst worker returns a match score and plain-language fit reasoning.
6. **Proposal draft:** Developer requests a proposal/hook — Writer worker generates a personalized draft using their real profile.
7. **Edit and apply:** Developer edits the draft, copies it, submits manually on the platform.
8. **Outcome logging:** Developer later marks the job Won / Lost / No Response.

---

## 6. Functional Requirements

### FR-1: Freelancer Profile Setup
- Name, skill tags (Appendix A), years of experience, target rate (hourly/project), portfolio URLs, short bio.
- Persists in DB, filled once, reused everywhere.
- **Acceptance:** No downstream LLM call fires without profile data available.

### FR-2: Automatic Job Data Extraction
- Content script reads the currently open, authenticated job page and extracts: job description (full text), client rating, payment-verified status, proposal count, budget, time posted, total client spend, client hire count (if visible), and any explicit mentions of off-platform payment/contact or unpaid test work in the description text.
- Runs only on the active tab the user has open — no background polling, no other tabs touched.
- Extracted fields must be user-editable in the UI in case a field is missing or misread — never block the flow on an extraction gap; degrade gracefully.
- **Acceptance:** Extraction module returns a consistent structured object regardless of fixed-price vs. hourly job page layout differences.

### FR-3: Decision Engine (Deterministic Gate)
- Pure function, zero network calls, zero LLM calls. Input: extracted job data + freelancer profile. Output: score 0-100, decision (Apply/Caution/Skip), one-line reason.
- Runs hard disqualifier checks *before* weighted scoring — a disqualifier always results in Skip regardless of how well the job scores otherwise (see Section 8).
- See Section 8 for full formula.
- **Acceptance:** Same inputs always produce the same output. Fully unit-testable without mocks. Hard disqualifiers are tested independently from the weighted scoring path.

### FR-4: Skip Path
- Skip decisions stop the flow immediately with the reason shown. No AI action available for this job.
- **Acceptance:** Zero LLM API calls occur on this path — verify via request logs.

### FR-5: Analyst Worker (LLM)
- Explains *why* a job is a good/weak fit, in plain, humanized language — not a raw score dump. References the freelancer's actual skills/experience.
- Does not make or override the Apply/Skip decision — that's already been decided by FR-3.
- **Acceptance:** Output is grounded in the freelancer's real profile data; strict JSON schema for the numeric fields, natural text for the reasoning.

### FR-6: Pricer Worker (LLM)
- Suggests a rate range with a short rationale.
- **Acceptance:** Never suggests below the freelancer's stated minimum without an explicit warning surfaced to the user.

### FR-7: Writer Worker (LLM) — Proposals & Hooks
- Generates a proposal draft and/or a short opening "hook" line, referencing at least one concrete specific from the freelancer's real profile.
- Always editable before copying. Never auto-submitted.
- **Acceptance:** No fabricated claims — system prompt explicitly forbids inventing experience not present in the profile.

### FR-8: Outcome Logging (Should-Have)
- Manual Won/Lost/No Response tagging on past jobs.
- **Acceptance:** Logging works standalone; automated recalibration of Decision Engine weights is post-MVP.

### FR-9: Extension UI
- Reactive to the currently open tab — shows the decision the moment a job page is detected, no manual trigger needed for the base score.
- AI actions (Analyst, Writer) remain user-triggered — never fire automatically, to keep LLM cost tied to genuine intent.
- **Acceptance:** Manifest permissions stay minimal — only the specific host permission needed for the target platform(s) plus `storage`. No broad `<all_urls>` access.

---

## 7. Data Model

```sql
-- freelancers
id, name, skills text[], years_exp, target_rate_hourly, target_rate_project,
portfolio_urls text[], bio, created_at

-- job_snapshots
id, freelancer_id, source_platform, raw_description, client_rating,
payment_verified, proposal_count, budget_amount, budget_type,
posted_at timestamptz,               -- needed to compute proposals-per-hour freshness
total_client_spend numeric nullable,
client_hire_count int nullable,
off_platform_flag boolean default false,   -- detected mention of off-platform pay/contact
unpaid_test_flag boolean default false,    -- detected mention of unpaid test work
extraction_method text default 'auto_scrape',  -- vs 'manual_fallback' if user had to correct/enter
created_at

-- scores
id, job_id, decision_score int, decision text, reason,
match_score int nullable, suggested_rate_min numeric nullable, suggested_rate_max numeric nullable,
created_at

-- proposals
id, job_id, draft_text, edited_text nullable, hook_text nullable, created_at

-- outcomes
id, job_id, outcome, noted_at

-- events
id, freelancer_id, event_type, metadata jsonb, created_at
```

---

## 8. Decision Engine — Scoring Formula

*(Rebuilt in v2.1. Sourced from Upwork's own help documentation on Job Success Score and red-flag guidance, plus multiple independent freelancer-analytics writeups on client screening, proposal timing, and win-rate data. Weights are still a calibrated starting point, not final — recalibrate against real outcome data via FR-8 once it accumulates. This logic doesn't depend on how the data arrived, so it's identical whether fed by scraping or manual entry.)*

### Step 1 — Hard Disqualifiers (checked first, override everything)

If any of these are true, the decision is **Skip** immediately, with that reason shown. The weighted score in Step 2 is not computed — these are not "soft penalties," they're categorical stop conditions, because they signal scam risk or platform ToS violations, not just a weaker opportunity.

```
off_platform_flag == true          -> Skip: "Requests off-platform payment/contact — against ToS, common scam pattern"
unpaid_test_flag == true           -> Skip: "Requires unpaid test work — against ToS"
pay_rate_anomaly == true           -> Skip: "Pay rate far above market + vague description — likely too good to be true"
  where pay_rate_anomaly = (offered_rate > 2x freelancer's category-typical rate) AND (description_word_count < 40)
```

### Step 2 — Weighted Score (only if no disqualifier triggered)

```
score = (client_quality_weight   * client_quality_score)
      + (competition_weight      * competition_score)
      + (budget_realism_weight   * budget_score)
      + (scope_clarity_weight    * scope_clarity_score)
      + (skill_match_weight      * skill_match_score)

client_quality_weight = 30 | competition_weight = 25 | budget_realism_weight = 20
scope_clarity_weight  = 15 | skill_match_weight  = 10
```

**client_quality_score (0-100)** — the single most-cited screening factor across every source consulted:
```
payment_verified = Yes/Unknown/No          -> +50 / +25 / +0
client_rating 4.5-5 / 3-4 / unrated-2      -> +50 / +30 / +10
```
*(If total_client_spend and client_hire_count are both available: a client with high spend and a hire count that roughly matches their job-post count is a confirmed reliable payer — nudge +10. A client with high spend but zero or near-zero hires signals posting without genuine intent to hire — nudge -10. Skip this adjustment if either field is unavailable; don't penalize missing data.)*

**competition_score (0-100)** — proposal density is much less informative alone than density *relative to time posted*. The first several proposals on a job get disproportionately more client attention than everything after, and that advantage decays within roughly the first hour or two:
```
proposals_per_hour = proposal_count / hours_since_posted

<1/hr   -> 100   (Low pressure, plenty of time to submit a considered proposal)
1-4/hr  -> 60    (Medium — worth applying soon, don't sit on it)
4+/hr   -> 20    (High — job is filling fast, marginal odds unless applying within minutes)
Unknown -> 50    (neutral, don't punish missing timestamp data)
```

**budget_score (0-100)** — compare against an *adjusted* budget, not the raw posted number. Posted budgets are commonly understated relative to what the work actually ends up paying, so scoring against the raw figure over-penalizes otherwise-good jobs:
```
adjusted_budget = posted_budget * 1.3   -- accounts for typical client underquoting

adjusted_budget >= freelancer_target_rate           -> 100
adjusted_budget within 20% below target              -> 60
adjusted_budget more than 20% below target            -> 20
```

**scope_clarity_score (0-100)** — vague job posts correlate strongly with scope creep, unclear expectations, and difficult clients later. Computed from the description text alone, no LLM needed:
```
description_word_count >= 100 AND contains >= 2 specific tech/skill keywords  -> 100
description_word_count 50-99  OR  contains exactly 1 specific keyword         -> 60
description_word_count < 50   AND  contains 0 specific keywords               -> 20
```
*(Keyword match against the freelancer's own skill tag list, e.g. "React", "PostgreSQL", "AWS" — reuse the Appendix A taxonomy as the keyword source.)*

**skill_match_score (0-100)** — deterministic keyword overlap between job description and the freelancer's declared skills, computed here as a fast pre-check. The richer, qualitative version of this lives in the Analyst LLM worker (FR-5) post-gate — this is a cheap proxy so skill relevance already influences the initial score before any AI is involved:
```
overlap_ratio = (freelancer skill tags found in job description) / (freelancer's total skill tags)

overlap_ratio >= 0.4  -> 100
overlap_ratio 0.15-0.39 -> 60
overlap_ratio < 0.15  -> 20
```

### Step 3 — Decision Threshold
```
score >= 70   -> Apply
score 40-69   -> Caution
score < 40    -> Skip
```

Implement as `calculateScore(jobData, freelancerProfile) -> { score, decision, reason }`, isolated from all extraction and LLM code. `reason` should name the single lowest-scoring factor in plain language, or the specific disqualifier if Step 1 triggered.

---

## 9. LLM Worker Specifications

| Worker | Model tier | Role | Never does |
|---|---|---|---|
| Analyst | Cheap/fast (e.g. Haiku) | Explains fit in plain language, returns match_score | Decide Apply/Skip |
| Pricer | Cheap/fast | Suggests rate range + rationale | Undercut freelancer's stated minimum silently |
| Writer | Higher quality (e.g. Sonnet) | Drafts proposal/hook using real profile data | Fabricate experience or auto-submit |

Model provider stays config-driven, not hardcoded, at all three call sites.

---

## 10. Non-Functional Requirements

- **Scraping ethics/ToS boundary:** Only reads the currently open, user-authenticated tab. No background access, no bulk collection, no storing raw page HTML beyond the structured fields needed for scoring. This boundary is what makes the approach safe — do not erode it for convenience later.
- **Cost control:** LLM calls only after the Decision Engine gate passes. Skip = zero LLM calls, always.
- **Performance:** Decision Engine returns in <500ms.
- **Security:** No secrets in repo. Backend holds the LLM API key; extension never calls the provider directly.
- **Privacy:** Scraped and profile data belongs to the user, not sold or shared. State this in-product.
- **Extensibility:** LLM provider swappable via config.

---

## 11. Tech Stack

Unchanged from v1: Plasmo (Manifest V3, side panel) + TypeScript/React/Tailwind for the extension; FastAPI backend; Supabase; Anthropic API; Railway/Render hosting; `pytest`/`vitest`; `ruff`+`black`/`eslint`+`prettier`.

---

## 12. Coding Standards

- Extraction, Decision Engine, and LLM-calling code live in **three separate modules** that don't import each other's internals. This is the structural enforcement of Section 3's non-goals — if the Decision Engine module has no import of the LLM client, it *cannot* accidentally become LLM-dependent.
- Same naming/commit/testing conventions as v1 (see AGENTS.md for the condensed operating rules).

---

## 13. MVP Build Phases

**Phase 0 (Migration — do this first):** Isolate existing extraction logic into its own module. Build and unit-test the Decision Engine standalone. Insert it as a gate in front of the existing LLM call.

**Phase 1 (Must-Have):** Profile Setup (FR-1), verify auto-extraction across job types (FR-2), Skip path (FR-4).

**Phase 2 (Must-Have):** Analyst (FR-5), Pricer (FR-6) — rewritten to explain, not decide.

**Phase 3 (Must-Have):** Writer/proposals & hooks (FR-7).

**Phase 4 (Should-Have):** Outcome logging (FR-8).

**Post-MVP:** Automated Decision Engine weight recalibration from outcome data; additional platform support beyond Upwork; team accounts.

---

## 14. Demo-Day Success Metrics

Same four as v1, now automatically populated per page view instead of per paste: jobs scored, jobs skipped (application cost saved), proposals drafted, outcomes logged.

---

## Appendix A: Dev Skill Taxonomy

`Frontend`, `Backend`, `Full-Stack`, `Mobile-iOS`, `Mobile-Android`, `React`, `Vue`, `Node.js`, `Python`, `Django`, `FastAPI`, `Go`, `DevOps`, `AWS`, `Docker`, `Kubernetes`, `Data Engineering`, `Machine Learning`, `WordPress`, `PHP`, `Ruby on Rails`
