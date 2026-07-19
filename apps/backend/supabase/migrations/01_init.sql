-- freelancers
CREATE TABLE freelancers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    skills TEXT[] NOT NULL,
    years_exp INTEGER NOT NULL,
    target_rate_hourly NUMERIC,
    target_rate_project NUMERIC,
    portfolio_urls TEXT[],
    bio TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- job_snapshots
CREATE TABLE job_snapshots (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    freelancer_id UUID REFERENCES freelancers(id),
    source_platform TEXT DEFAULT 'upwork',
    raw_description TEXT,
    client_rating NUMERIC,
    payment_verified TEXT,
    proposal_count INTEGER,
    budget_amount NUMERIC,
    budget_type TEXT,
    posted_at TIMESTAMPTZ,
    total_client_spend NUMERIC,
    client_hire_count INTEGER,
    off_platform_flag BOOLEAN DEFAULT FALSE,
    unpaid_test_flag BOOLEAN DEFAULT FALSE,
    extraction_method TEXT DEFAULT 'auto_scrape',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- scores
CREATE TABLE scores (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    job_id UUID REFERENCES job_snapshots(id),
    decision_score INTEGER,
    decision TEXT,
    reason TEXT,
    match_score INTEGER,
    suggested_rate_min NUMERIC,
    suggested_rate_max NUMERIC,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- proposals
CREATE TABLE proposals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    job_id UUID REFERENCES job_snapshots(id),
    draft_text TEXT,
    edited_text TEXT,
    hook_text TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- outcomes
CREATE TABLE outcomes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    job_id UUID REFERENCES job_snapshots(id),
    outcome TEXT,
    noted_at TIMESTAMPTZ DEFAULT NOW()
);

-- events
CREATE TABLE events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    freelancer_id UUID REFERENCES freelancers(id),
    event_type TEXT,
    metadata JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
