# Connects Budget Optimizer (v1.0 Prototype)

### 🚨 The Problem

On Upwork, Connects act as digital currency with tangible cash value. Submitting a single proposal can cost up to 26 Connects. Freelancers currently bleed significant operational capital by blindly bidding on jobs that are statistical dead-ends (e.g., highly saturated posts, stale posts abandoned by clients, or lowball traps).

### 💡 The Solution

A real-time Connects ROI (Return on Investment) gatekeeper. This Chrome Extension programmatically audits active job posts, calculates the probability of a positive financial return, and issues an instant operational verdict (**APPLY**, **CAUTION**, or **SKIP**). For viable jobs, it extracts technical requirements to auto-generate hyper-targeted proposal hooks.

### ⚙️ How It Works (The Workflow)

The extension enforces a strict, multi-tiered sequence of mathematical gates to evaluate risk:

- **Tier 1: Freshness Gate (Primary):** Evaluates timestamps. Jobs older than a few hours with high competition are immediately flagged as unviable.
- **Tier 2: Competition Gate (Volume):** Checks active proposal brackets. High volume triggers an automatic "SKIP" to prevent wasted budget.
- **Tier 3: Client Quality Support:** Assesses metadata (hire rate, average hourly rate, historical spend) to ensure the client pays market rates.
- **Tier 4: Contextual Extraction:** Isolates technical requirements to draft punchy, problem-first opening hooks (bypassed entirely if the job fails Tiers 1 or 2).

### 🛠️ Technical Architecture & Techniques

- **DOM Mutation Resilience:** Bypasses unpredictable Single Page Application (SPA) CSS class changes by scraping `document.body.innerText`. This mimics human reading and makes the extension immune to Upwork's frequent UI code updates.
- **Event-Driven UI State:** Replaces sluggish polling intervals with a global click listener, creating a responsive, zero-lag UI that syncs perfectly with Upwork's modals.
- **Isolated Background Orchestration:** Uses Manifest V3 Service Workers (`background.js`) to handle asynchronous HTTP fetch requests to the Gemini API, protected by multi-tier error catching.
- **Strict Prompt Constraints:** Enforces JSON-only schema outputs and utilizes negative constraints to prevent the AI from leaking its underlying systemic rules to the user.

### 🎯 Core Benefits

- **Budget Protection:** Mathematically prevents users from spending money on jobs with a <2% chance of being viewed.
- **Time Optimization:** Instantly filters out bad clients so freelancers can focus exclusively on high-ROI contracts.
- **Conversion Boost:** Provides copy-and-paste proposal hooks tailored to the exact technical needs of the validated job post.
