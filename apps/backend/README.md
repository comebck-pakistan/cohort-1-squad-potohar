# Connects Budget Optimizer (Backend)

This is a FastAPI backend designed to power the AI features of the Connects Budget Optimizer Chrome extension.

## Features
- **Analyst AI:** Analyzes the fit between a freelancer profile and an Upwork job description.
- **Pricer AI:** Recommends pricing based on market rates and the freelancer's target rates.
- **Writer AI:** Drafts a cover letter and hook for a given job.
- **Supabase Integration:** (Optional) Persists job snapshots, scored events, and proposals.

## Prerequisites

- Python 3.10+
- Anthropic API Key (for LLM calls)
- Supabase Project URL and Service Role Key (for database storage)

## Getting Started

1. Set up a virtual environment (optional but recommended):
```bash
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
```

2. Install dependencies:
```bash
pip install -r requirements.txt
```

3. Configure Environment Variables:
Copy `.env.example` to `.env` and fill in your Anthropic API Key and Supabase credentials.
```bash
cp .env.example .env
```

4. Run the development server:
```bash
python -m uvicorn app.main:app --reload
```

## Running Tests

```bash
python -m pytest
```
