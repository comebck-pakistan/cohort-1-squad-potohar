# Connects Budget Optimizer Extension

Chrome extension for Upwork developer freelancers. It reads the currently open
job page, extracts visible job/client fields, runs a deterministic
Apply/Caution/Skip score, and only enables AI actions after the score passes the
gate.

## Stack

- Plasmo, Manifest V3
- React, TypeScript, Tailwind
- Vitest for unit tests
- Chrome `storage` permission for local profile and event storage

## Setup

```bash
npm install
npm run dev
```

Load the generated Chrome MV3 development build from:

```text
build/chrome-mv3-dev
```

Open an Upwork job page. The floating overlay appears on matching Upwork job
URLs and scores the current page without an AI call.

## Backend URL

AI action buttons call the backend only when the deterministic decision is
Apply or Caution. By default the extension uses:

```text
http://localhost:8000
```

To override it for Plasmo builds, create a local env file with:

```text
PLASMO_PUBLIC_BACKEND_API_BASE_URL=http://localhost:8000
```

## Scripts

```bash
npm run test
npm run typecheck
npm run lint
npm run build
```

## Privacy Boundary

The extension only reads the currently open Upwork tab. It does not crawl,
auto-apply, or call model providers directly. Profile data and local scoring
events are stored in browser storage.
