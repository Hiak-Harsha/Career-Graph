-- Career Identity System Database Schema (PostgreSQL)

-- Enable UUID extension if not enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. Users table
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    headline VARCHAR(255),
    bio TEXT,
    location VARCHAR(255),
    education TEXT,
    career_goal TEXT,
    github_username VARCHAR(255) UNIQUE,
    github_access_token VARCHAR(255),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 2. Projects table
CREATE TABLE IF NOT EXISTS projects (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    status VARCHAR(50) DEFAULT 'ACTIVE', -- IDEA, EXPLORING, PLANNED, ACTIVE, COMPLETED, MAINTAINED, PAUSED, ABANDONED, ARCHIVED
    project_type VARCHAR(50) DEFAULT 'PERSONAL', -- PERSONAL, ACADEMIC, RESEARCH, PROFESSIONAL, HACKATHON, EXPERIMENT, OPEN_SOURCE, PRODUCT
    started_at TIMESTAMP WITH TIME ZONE,
    completed_at TIMESTAMP WITH TIME ZONE,
    repository_url VARCHAR(500),
    demo_url VARCHAR(500),
    complexity_score DOUBLE PRECISION DEFAULT 0.0,
    individual_or_team VARCHAR(50) DEFAULT 'INDIVIDUAL',
    sync_hash VARCHAR(255), -- Hash of files/README/langs to detect code changes and cache LLM responses
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 3. Ideas table
CREATE TABLE IF NOT EXISTS ideas (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    status VARCHAR(50) DEFAULT 'EXPLORING', -- EXPLORING, PROTOTYPE, MATURING, ABANDONED
    maturity VARCHAR(50) DEFAULT 'EARLY', -- EARLY, MID, MATURE
    parent_project_id UUID REFERENCES projects(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 4. Skills table
CREATE TABLE IF NOT EXISTS skills (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) UNIQUE NOT NULL,
    category VARCHAR(100), -- LANGUAGE, LIBRARY, FRAMEWORK, DATABASE, CONCEPT, TOOL, CLOUD
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 5. Domains table
CREATE TABLE IF NOT EXISTS domains (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) UNIQUE NOT NULL,
    parent_domain_id UUID REFERENCES domains(id) ON DELETE SET NULL,
    description TEXT,
    created_by VARCHAR(50) DEFAULT 'SYSTEM', -- SYSTEM, USER, AI_DISCOVERED
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 6. Project-Skills junction table
CREATE TABLE IF NOT EXISTS project_skills (
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    skill_id UUID NOT NULL REFERENCES skills(id) ON DELETE CASCADE,
    relationship VARCHAR(100) DEFAULT 'USES', -- USES, DEMONSTRATES, IMPLEMENTS
    confidence DOUBLE PRECISION DEFAULT 1.0,
    evidence_strength DOUBLE PRECISION DEFAULT 1.0,
    origin VARCHAR(50) DEFAULT 'DETERMINISTIC', -- DETERMINISTIC, AI_PROPOSED
    status VARCHAR(50) DEFAULT 'user_confirmed', -- ai_suggested, user_confirmed, user_rejected
    PRIMARY KEY (project_id, skill_id)
);

-- 7. Project-Domains junction table
CREATE TABLE IF NOT EXISTS project_domains (
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    domain_id UUID NOT NULL REFERENCES domains(id) ON DELETE CASCADE,
    confidence DOUBLE PRECISION DEFAULT 1.0,
    relevance DOUBLE PRECISION DEFAULT 1.0,
    origin VARCHAR(50) DEFAULT 'AI_PROPOSED', -- DETERMINISTIC, AI_PROPOSED
    status VARCHAR(50) DEFAULT 'ai_suggested', -- ai_suggested, user_confirmed, user_rejected
    PRIMARY KEY (project_id, domain_id)
);

-- 8. Evidence table (provenance records)
CREATE TABLE IF NOT EXISTS evidence (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    type VARCHAR(50) NOT NULL, -- GITHUB_COMMIT, GITHUB_PR, GITHUB_RELEASE, README, DOCUMENT, CERTIFICATE, PUBLICATION, BLOG_POST, MANUAL
    source VARCHAR(255) NOT NULL, -- 'github', 'devpost', 'medium', 'user_input'
    source_url VARCHAR(500),
    source_identifier VARCHAR(255), -- commit hash, PR number, etc.
    content TEXT,
    captured_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    confidence DOUBLE PRECISION DEFAULT 1.0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 9. Claims table (claims derived from projects and evidence)
CREATE TABLE IF NOT EXISTS claims (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
    claim TEXT NOT NULL,
    claim_type VARCHAR(100), -- TECHNICAL_ACHIEVEMENT, DOMAIN_EXPERTISE, ARCHITECTURE, OPTIMIZATION
    confidence DOUBLE PRECISION DEFAULT 1.0,
    origin VARCHAR(50) DEFAULT 'AI_PROPOSED', -- DETERMINISTIC, AI_PROPOSED
    status VARCHAR(50) DEFAULT 'ai_suggested', -- ai_suggested, user_confirmed, user_rejected
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 10. Claim-Evidence junction table
CREATE TABLE IF NOT EXISTS claim_evidence (
    claim_id UUID NOT NULL REFERENCES claims(id) ON DELETE CASCADE,
    evidence_id UUID NOT NULL REFERENCES evidence(id) ON DELETE CASCADE,
    relationship VARCHAR(100) DEFAULT 'PROVES',
    PRIMARY KEY (claim_id, evidence_id)
);

-- 11. Activities table (raw developer events log)
CREATE TABLE IF NOT EXISTS activities (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    project_id UUID REFERENCES projects(id) ON DELETE SET NULL,
    type VARCHAR(50) NOT NULL, -- COMMIT, PR_CREATED, PR_MERGED, RELEASE, POST_CREATED, IDEA_CREATED
    source VARCHAR(255) NOT NULL, -- 'github', 'medium', etc.
    source_id VARCHAR(255),
    timestamp TIMESTAMP WITH TIME ZONE NOT NULL,
    metadata JSONB, -- stores arbitrary data like commit messages, languages used, etc.
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 12. Domain Progress tracking
CREATE TABLE IF NOT EXISTS domain_progress (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    domain_id UUID NOT NULL REFERENCES domains(id) ON DELETE CASCADE,
    exposure_score DOUBLE PRECISION DEFAULT 0.0,
    activity_score DOUBLE PRECISION DEFAULT 0.0,
    evidence_score DOUBLE PRECISION DEFAULT 0.0,
    depth_score DOUBLE PRECISION DEFAULT 0.0,
    recency_score DOUBLE PRECISION DEFAULT 0.0,
    current_level VARCHAR(50) DEFAULT 'EXPOSURE', -- EXPOSURE, PRACTICING, DEVELOPING, PROFICIENT, STRONG, ADVANCED
    trajectory VARCHAR(50) DEFAULT 'STABLE', -- DECREASING, STABLE, INCREASING
    first_detected TIMESTAMP WITH TIME ZONE,
    last_active TIMESTAMP WITH TIME ZONE,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (user_id, domain_id)
);

-- 13. Skill Progress tracking
CREATE TABLE IF NOT EXISTS skill_progress (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    skill_id UUID NOT NULL REFERENCES skills(id) ON DELETE CASCADE,
    evidence_count INT DEFAULT 0,
    usage_frequency DOUBLE PRECISION DEFAULT 0.0,
    depth_score DOUBLE PRECISION DEFAULT 0.0,
    recency_score DOUBLE PRECISION DEFAULT 0.0,
    confidence DOUBLE PRECISION DEFAULT 1.0,
    trajectory VARCHAR(50) DEFAULT 'STABLE', -- DECREASING, STABLE, INCREASING
    current_level VARCHAR(50) DEFAULT 'EXPOSURE', -- EXPOSURE, PRACTICING, PROFICIENT, STRONG, ADVANCED
    first_seen TIMESTAMP WITH TIME ZONE,
    last_used TIMESTAMP WITH TIME ZONE,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (user_id, skill_id)
);

-- 14. Career Snapshots (longitudinal tracking)
CREATE TABLE IF NOT EXISTS career_snapshots (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    snapshot_date DATE NOT NULL DEFAULT CURRENT_DATE,
    dominant_domains JSONB, -- Array of dominant domains
    emerging_domains JSONB, -- Array of emerging domains
    strongest_skills JSONB, -- Array of strongest skills
    active_projects JSONB, -- Array of active projects
    career_direction TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (user_id, snapshot_date)
);

-- 15. Roles table
CREATE TABLE IF NOT EXISTS roles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) UNIQUE NOT NULL,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 16. Role Requirements table
CREATE TABLE IF NOT EXISTS role_requirements (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    role_id UUID NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
    skill_id UUID REFERENCES skills(id) ON DELETE CASCADE,
    domain_id UUID REFERENCES domains(id) ON DELETE CASCADE,
    importance DOUBLE PRECISION DEFAULT 0.5, -- scale from 0.0 to 1.0
    CHECK (
        (skill_id IS NOT NULL AND domain_id IS NULL) OR
        (skill_id IS NULL AND domain_id IS NOT NULL)
    ),
    UNIQUE (role_id, skill_id, domain_id)
);

-- 17. AI Inferences table (traceability/debugging logs)
CREATE TABLE IF NOT EXISTS ai_inferences (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    project_id UUID REFERENCES projects(id) ON DELETE SET NULL,
    prompt_type VARCHAR(255) NOT NULL, -- e.g. 'openai_extraction', 'anthropic_reasoning'
    input_payload TEXT NOT NULL,
    response_payload TEXT NOT NULL,
    error_message TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Insert baseline roles
INSERT INTO roles (name, description) VALUES
('Software Engineer', 'General software development, frontend, backend, system design, and software craftsmanship.'),
('Machine Learning Engineer', 'Building, evaluating, and deploying machine learning models, pipelines, and data engineering systems.'),
('Data Scientist', 'Data analysis, statistics, exploratory data analysis, visualizations, and modeling.'),
('Research Engineer', 'Experimental engineering, novel algorithmic development, academic/research implementations, and scientific programming.'),
('Backend Engineer', 'Building secure, scalable API services, database design, caching, system design, and infrastructure automation.')
ON CONFLICT (name) DO NOTHING;
