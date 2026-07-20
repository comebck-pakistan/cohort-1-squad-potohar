# Connects Budget Optimizer (Extension)

This is a Chrome extension built with [Plasmo](https://docs.plasmo.com/), React, and Tailwind CSS. It overlays a deterministic job matching score on Upwork job posts to help you save Connects.

## Features
- Automatically parses Upwork job descriptions.
- Deterministic matching score based on your profile skills and job parameters.
- Direct integration with a FastAPI backend to optionally analyze jobs, price them, and draft proposals using AI.
- Privacy-first: Profile data and job parsing happen locally in your browser.

## Getting Started

First, install dependencies:

```bash
npm install
```

Then, run the development server:

```bash
npm run dev
```

Open your browser and load the appropriate development build. For example, if you are developing for the chrome browser, using manifest v3, use: `build/chrome-mv3-dev`.

To build for production:

```bash
npm run build
```

The production build will be placed in `build/chrome-mv3-prod`.
