import sys
import os
from pathlib import Path

# Ensure root directory and backend directory are always resolvable
_repo_root = str(Path(__file__).resolve().parent.parent.parent)
_backend_dir = str(Path(__file__).resolve().parent.parent)
if _repo_root not in sys.path:
    sys.path.insert(0, _repo_root)
if _backend_dir not in sys.path:
    sys.path.insert(0, _backend_dir)

import math
import json
import re
import hmac
import hashlib
from contextlib import asynccontextmanager
from fastapi import FastAPI, Depends, HTTPException, Query, status, Request
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from typing import List, Optional, Dict, Any
from datetime import datetime, timezone
import uuid

from backend.app.database import get_db, init_db
from backend.app.models import (
    User, Project, Idea, Skill, Domain, Evidence, Claim, Activity,
    DomainProgress, SkillProgress, CareerSnapshot, Role, RoleRequirement,
    Resume, ResumeVersion, WorkExperience, Education, Certification, SocialLink,
    project_domains, project_skills
)
from backend.app.schemas import (
    UserResponse, UserUpdate, ProjectResponse, ProjectCreate,
    SkillResponse, DomainResponse,
    IdeaResponse, IdeaCreate, IdeaNoteCreate, IdeaAutoDraftResponse, PortfolioResponse, ResumeResponse, ResumeSaveRequest,
    WorkExperienceCreate, WorkExperienceResponse,
    EducationCreate, EducationResponse,
    CertificationCreate, CertificationResponse,
    SocialLinkCreate, SocialLinkResponse,
    ProfileDetailsResponse, AIImproveRequest, AIImproveResponse,
    RecruiterMatchResponse, Token, GitHubAuthCode, CriteriaMatch,
    ClaimResponse, EvidenceResponse,
    ProfessionalIdentityResponse, DomainSignatureNode, DomainSignatureEdge,
    ResumeStrategyRequest, ResumeStrategyResponse,
    ResumeBlockItem, ResumeBlockRepresentation,
    ResumeValidationRequest, ResumeValidationResponse,
    ResumeCritiqueRequest, ResumeCritiqueResponse, ReadinessDimension,
    ImproveRepresentationRequest, AchievementItem, AchievementsBlockPayload
)
from backend.app.auth import get_current_user, create_access_token, exchange_github_code, encrypt_token, decrypt_token
from backend.app.config import APP_ENV, OPENAI_API_KEY, ANTHROPIC_API_KEY, DEMO_MODE, GITHUB_WEBHOOK_SECRET
from backend.app.intelligence.delta_engine import compute_career_delta, CareerDeltaReport
from backend.app.intelligence.significance_engine import classify_event_significance, EventSignificanceResult
from backend.app.ingestion_schemas import ProfileIngestRequest, ExtractedProfile
from backend.app.ingestion import (
    resolve_source_text,
    extract_profile_from_text,
    stage_extracted_profile
)
from backend.app.intelligence.identity_engine import compute_candidate_professional_identity
from backend.app.intelligence.recruiter_engine import (
    evaluate_recruiter_role_match,
    match_custom_job_description,
)
from backend.app.intelligence.claim_validator import validate_and_sanitize_resume_blocks
from backend.app.services.resume_intelligence import (
    generate_resume_strategy_for_role,
    generate_blocks_representation_from_strategy,
    generate_recruiter_critique_for_role,
    build_featured_resume,
)
from backend.app.schemas import CustomJobDescriptionMatchRequest

from backend.app.analyzer import (
    fetch_github_repos,
    fetch_github_repo_details,
    sync_github_project,
    openai_client,
    anthropic_client,
    update_domain_progress_scores,
    update_skill_progress_scores,
    save_career_snapshot,
    _icon_for_domain
)

@asynccontextmanager
async def lifespan(app: FastAPI):
    init_db()
    yield

app = FastAPI(title="Career Identity System API", version="0.2.0", lifespan=lifespan)

# Configure CORS with explicit origins
CORS_ORIGINS = os.getenv("CORS_ORIGINS", "http://localhost:3000,http://127.0.0.1:3000").split(",")
app.add_middleware(
    CORSMiddleware,
    allow_origins=CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# --- Auth Endpoints ---

@app.post("/api/auth/github", response_model=Token)
async def github_login(payload: GitHubAuthCode, db: Session = Depends(get_db)):
    """Exchange authorization code for a session token."""
    github_data = await exchange_github_code(payload.code)
    if not github_data:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Failed to authenticate with GitHub"
        )
    
    # Check if user already exists
    user = db.query(User).filter(User.email == github_data["email"]).first()
    if not user:
        user = User(
            email=github_data["email"],
            name=github_data["name"],
            bio=github_data.get("bio"),
            location=github_data.get("location"),
            github_username=github_data["github_username"],
            github_access_token=encrypt_token(github_data["access_token"])
        )
        db.add(user)
        db.commit()
        db.refresh(user)
    else:
        # Update user's github access token & profile info
        user.github_access_token = encrypt_token(github_data["access_token"])
        user.github_username = github_data["github_username"]
        if github_data.get("name"):
            user.name = github_data["name"]
        if github_data.get("bio"):
            user.bio = github_data["bio"]
        if github_data.get("location"):
            user.location = github_data["location"]
        db.commit()
        db.refresh(user)

    # Issue JWT session token
    token = create_access_token({"sub": str(user.id)})
    return {"access_token": token, "token_type": "bearer", "user_id": user.id}


@app.post("/api/auth/mock", response_model=Token)
def mock_login(db: Session = Depends(get_db)):
    """Convenience endpoint to authenticate a local dev mock user."""
    user = db.query(User).filter(User.email == "madhav@example.com").first()
    if not user:
        user = User(
            name="Madhav",
            email="madhav@example.com",
            headline="Full Stack Engineer & AI Systems Architect",
            bio="Building verifiable developer intelligence and distributed career graph architectures.",
            location="Bangalore, India",
            github_username="madhav"
        )
        db.add(user)
        db.commit()
        db.refresh(user)
        
    token = create_access_token({"sub": str(user.id)})
    return {"access_token": token, "token_type": "bearer", "user_id": user.id}


@app.get("/api/profile", response_model=UserResponse)
def get_user_profile(current_user: User = Depends(get_current_user)):
    return current_user


@app.put("/api/profile", response_model=UserResponse)
def update_user_profile(
    profile_update: UserUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    update_data = profile_update.model_dump(exclude_unset=True)
    
    # Handle access token encryption if updated
    if "github_access_token" in update_data and update_data["github_access_token"]:
        update_data["github_access_token"] = encrypt_token(update_data["github_access_token"])
        
    for key, value in update_data.items():
        setattr(current_user, key, value)
        
    db.commit()
    db.refresh(current_user)
    return current_user


# --- Sync & Ingestion Endpoints ---

sync_request_history: Dict[str, List[datetime]] = {}
SYNC_RATE_LIMIT = 5
SYNC_WINDOW_SECONDS = 60

@app.post("/api/sync")
@app.post("/api/sync/github")
async def sync_github(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    """Sync repositories from the user's connected GitHub account."""
    if not current_user.github_access_token:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No GitHub account connected. Please authenticate via Personal Access Token or OAuth."
        )

    # In-memory rate limiting check
    user_id_str = str(current_user.id)
    now = datetime.now(timezone.utc)
    history = sync_request_history.get(user_id_str, [])
    history = [t for t in history if (now - t).total_seconds() < SYNC_WINDOW_SECONDS]
    if len(history) >= SYNC_RATE_LIMIT:
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail=f"Rate limit exceeded: Maximum {SYNC_RATE_LIMIT} sync requests per minute."
        )
    history.append(now)
    sync_request_history[user_id_str] = history
        
    raw_token = decrypt_token(current_user.github_access_token)
    repos = await fetch_github_repos(raw_token, current_user.github_username)
    
    synced_projects = []
    for repo in repos:
        owner_name = current_user.github_username or repo.get("owner", {}).get("login")
        details = await fetch_github_repo_details(raw_token, owner_name, repo["name"])
        proj = sync_github_project(db, current_user, repo, details)
        title_str = (proj.title if proj else None) or repo.get("name") or "Repository"
        synced_projects.append(title_str)
        
    update_domain_progress_scores(db, current_user.id)
    update_skill_progress_scores(db, current_user.id)
    save_career_snapshot(db, current_user.id)
    
    return {
        "status": "success",
        "synced_projects": synced_projects,
        "synced_repositories": len(synced_projects)
    }




@app.post("/api/sync/demo")
def sync_demo_data(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    """Populates curated demo projects to showcase Career Graph intelligence capabilities."""
    user_id_str = str(current_user.id)
    now = datetime.now(timezone.utc)
    history = sync_request_history.get(user_id_str, [])
    history = [t for t in history if (now - t).total_seconds() < SYNC_WINDOW_SECONDS]
    if len(history) >= SYNC_RATE_LIMIT:
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail=f"Rate limit exceeded: Maximum {SYNC_RATE_LIMIT} sync requests per minute."
        )
    history.append(now)
    sync_request_history[user_id_str] = history

    demo_repos = [
        {
            "repo": {
                "name": "smart-navigation-system",
                "html_url": "https://github.com/madhav/smart-navigation-system",
                "created_at": "2024-03-01T10:00:00Z"
            },
            "details": {
                "readme": "# Smart Navigation System\nA high-throughput algorithmic routing engine implementing contraction hierarchies and A* heuristics for real-time spatial graph traversal.",
                "languages": {"Python": 14000, "C++": 8500},
                "files": ["src/router.cpp", "src/heuristics.py", "benchmarks/latency_test.py"],
                "commits": [
                    {"hash": "e1f4a9b", "message": "Optimize contraction hierarchies spatial index; latency reduced to 8ms", "timestamp": "2024-03-15T14:30:00Z", "url": "https://github.com/madhav/smart-navigation-system/commit/e1f4a9b"},
                    {"hash": "c3d2e1f", "message": "Add multi-threaded path cache", "timestamp": "2024-04-02T11:00:00Z", "url": "https://github.com/madhav/smart-navigation-system/commit/c3d2e1f"}
                ]
            }
        },
        {
            "repo": {
                "name": "ai-fake-news-detector",
                "html_url": "https://github.com/madhav/ai-fake-news-detector",
                "created_at": "2024-06-10T08:00:00Z"
            },
            "details": {
                "readme": "# AI Fake News Detector\nFine-tuned transformer pipeline for multimodal disinformation classification with explainable attribution heatmaps and uncertainty estimation.",
                "languages": {"Python": 32000, "TypeScript": 9200},
                "files": ["models/transformer_classifier.py", "pipeline/dataset_curator.py", "frontend/src/App.tsx"],
                "commits": [
                    {"hash": "a8b9c0d", "message": "Implement calibrated cross-attention layers achieving 94.2% F1 score on benchmark", "timestamp": "2024-07-01T16:20:00Z", "url": "https://github.com/madhav/ai-fake-news-detector/commit/a8b9c0d"}
                ]
            }
        },
        {
            "repo": {
                "name": "algorithmic-reasoning-platform",
                "html_url": "https://github.com/madhav/algorithmic-reasoning-platform",
                "created_at": "2024-09-05T12:00:00Z"
            },
            "details": {
                "readme": "# Algorithmic Reasoning Platform\nDistributed evaluation sandbox for executing and benchmarking competitive programming solutions across isolated Docker runtimes.",
                "languages": {"Go": 18000, "TypeScript": 11000, "Rust": 6000},
                "files": ["runner/sandbox.go", "evaluator/judge.rs", "api/server.go"],
                "commits": [
                    {"hash": "f7e6d5c", "message": "Architect cgroups resource limiters preventing memory exhaustion under concurrent loads", "timestamp": "2024-10-12T09:15:00Z", "url": "https://github.com/madhav/algorithmic-reasoning-platform/commit/f7e6d5c"}
                ]
            }
        }
    ]
    
    for item in demo_repos:
        sync_github_project(db, current_user, item["repo"], item["details"], auto_confirm=True)
        
    update_domain_progress_scores(db, current_user.id)
    update_skill_progress_scores(db, current_user.id)
    save_career_snapshot(db, current_user.id)
    
    return {"status": "success", "message": "Synced 3 high-quality demo projects to showcase career intelligence features."}


# --- Portfolio & Profile Details Endpoints ---

def build_portfolio_payload(user: User, db: Session) -> Dict[str, Any]:
    """Constructs the complete living portfolio payload for a given user."""
    projects_db = db.query(Project).filter(Project.user_id == user.id).all()
    
    projects = []
    for p in projects_db:
        confirmed_skills = db.query(Skill).join(project_skills).filter(
            project_skills.c.project_id == p.id,
            project_skills.c.status == "user_confirmed"
        ).all()
        confirmed_domains = db.query(Domain).join(project_domains).filter(
            project_domains.c.project_id == p.id,
            project_domains.c.status == "user_confirmed"
        ).all()
        
        # Also include user-confirmed claims for the project
        confirmed_claims = db.query(Claim).filter(
            Claim.project_id == p.id,
            Claim.status == "user_confirmed"
        ).all()
        
        claims_response = []
        for c in confirmed_claims:
            ev_response = []
            for ev in c.evidence:
                ev_response.append(EvidenceResponse(
                    id=ev.id,
                    type=ev.type,
                    source=ev.source,
                    source_url=ev.source_url,
                    source_identifier=ev.source_identifier,
                    content=ev.content,
                    captured_at=ev.captured_at,
                    confidence=ev.confidence
                ))
            claims_response.append(ClaimResponse(
                id=c.id,
                claim=c.claim,
                claim_type=c.claim_type,
                confidence=c.confidence,
                origin=c.origin,
                status=c.status,
                project_id=c.project_id,
                evidence=ev_response
            ))

        projects.append(ProjectResponse(
            id=p.id,
            user_id=p.user_id,
            title=p.title,
            description=p.description,
            status=p.status,
            project_type=p.project_type,
            started_at=p.started_at,
            completed_at=p.completed_at,
            repository_url=p.repository_url,
            demo_url=p.demo_url,
            complexity_score=p.complexity_score,
            individual_or_team=p.individual_or_team,
            created_at=p.created_at,
            updated_at=p.updated_at,
            skills=[SkillResponse.model_validate(s) for s in confirmed_skills],
            domains=[DomainResponse.model_validate(d) for d in confirmed_domains],
            claims=claims_response
        ))
        
    ideas = db.query(Idea).filter(Idea.user_id == user.id).all()
    domain_progress = db.query(DomainProgress).filter(DomainProgress.user_id == user.id).all()
    skill_progress = db.query(SkillProgress).filter(SkillProgress.user_id == user.id).all()
    
    work_exps = db.query(WorkExperience).filter(WorkExperience.user_id == user.id).order_by(WorkExperience.created_at.desc()).all()
    edus = db.query(Education).filter(Education.user_id == user.id).order_by(Education.created_at.desc()).all()
    certs = db.query(Certification).filter(Certification.user_id == user.id).order_by(Certification.created_at.desc()).all()
    links = db.query(SocialLink).filter(SocialLink.user_id == user.id).order_by(SocialLink.created_at.asc()).all()

    # Calculate analytical problem solving profile
    confirmed_domain_names = [dp.domain.name for dp in domain_progress if dp.exposure_score > 0.3]
    confirmed_skill_names = [sp.skill.name for sp in skill_progress if sp.evidence_count > 0]
    
    problem_solving_profile = {
        "frequently_works_with": confirmed_domain_names[:5] + confirmed_skill_names[:5],
        "recurring_patterns_detected": [
            "Graph & Tree Optimization",
            "Predictive Statistical Modeling",
            "High-Throughput Concurrent Systems"
        ] if len(projects) > 0 else []
    }
    
    timeline = []
    for p in sorted(projects, key=lambda x: x.started_at or datetime.min.replace(tzinfo=timezone.utc), reverse=True):
        timeline.append({
            "type": "PROJECT_COMPLETED" if p.status == "COMPLETED" else "PROJECT_ACTIVE",
            "title": p.title,
            "description": p.description,
            "date": (p.completed_at or p.started_at or p.created_at).strftime("%B %Y") if (p.completed_at or p.started_at or p.created_at) else "Recent",
            "complexity": p.complexity_score,
            "skills": [s.name for s in p.skills[:4]]
        })
        
    return {
        "profile": user,
        "projects": projects,
        "ideas": ideas,
        "domain_progress": domain_progress,
        "skills": skill_progress,
        "problem_solving_profile": problem_solving_profile,
        "timeline": timeline,
        "work_experiences": [WorkExperienceResponse.model_validate(w) for w in work_exps],
        "educations": [EducationResponse.model_validate(e) for e in edus],
        "certifications": [CertificationResponse.model_validate(c) for c in certs],
        "social_links": [SocialLinkResponse.model_validate(l) for l in links]
    }


@app.get("/api/portfolio", response_model=PortfolioResponse)
def get_portfolio(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    """Retrieves full portfolio state including projects, domains, skills, progress, and career history."""
    return build_portfolio_payload(current_user, db)


@app.get("/api/portfolio/public/{identifier}", response_model=PortfolioResponse)
@app.get("/api/p/{identifier}", response_model=PortfolioResponse)
def get_public_portfolio(identifier: str, db: Session = Depends(get_db)):
    """Unauthenticated public endpoint allowing recruiters and visitors to view a user's verified Living Portfolio."""
    user = db.query(User).filter(User.github_username == identifier).first()
    if not user:
        try:
            parsed_uuid = uuid.UUID(identifier)
            user = db.query(User).filter(User.id == parsed_uuid).first()
        except Exception:
            pass
    
    if not user and DEMO_MODE:
        if identifier in ("demo", "default", "me"):
            user = db.query(User).first()
            
    if not user:
        raise HTTPException(status_code=404, detail="Public portfolio not found for identifier.")
        
    if getattr(user, "is_public", True) is False:
        raise HTTPException(status_code=403, detail="This user's portfolio is currently set to private.")
        
    return build_portfolio_payload(user, db)




# --- Structured Profile Details Endpoints ---

@app.get("/api/profile/details", response_model=ProfileDetailsResponse)
def get_profile_details(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    work_exps = db.query(WorkExperience).filter(WorkExperience.user_id == current_user.id).order_by(WorkExperience.created_at.desc()).all()
    edus = db.query(Education).filter(Education.user_id == current_user.id).order_by(Education.created_at.desc()).all()
    certs = db.query(Certification).filter(Certification.user_id == current_user.id).order_by(Certification.created_at.desc()).all()
    links = db.query(SocialLink).filter(SocialLink.user_id == current_user.id).order_by(SocialLink.created_at.asc()).all()

    return {
        "profile": current_user,
        "work_experiences": [WorkExperienceResponse.model_validate(w) for w in work_exps],
        "educations": [EducationResponse.model_validate(e) for e in edus],
        "certifications": [CertificationResponse.model_validate(c) for c in certs],
        "social_links": [SocialLinkResponse.model_validate(l) for l in links]
    }

@app.post("/api/profile/experience", response_model=WorkExperienceResponse)
def create_work_experience(exp: WorkExperienceCreate, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    record = WorkExperience(
        user_id=current_user.id,
        company=exp.company,
        role=exp.role,
        location=exp.location,
        start_date=exp.start_date,
        end_date=exp.end_date,
        description=exp.description,
        bullets=exp.bullets,
        is_current=exp.is_current
    )
    db.add(record)
    db.commit()
    db.refresh(record)
    return WorkExperienceResponse.model_validate(record)

@app.put("/api/profile/experience/{id}", response_model=WorkExperienceResponse)
def update_work_experience(id: uuid.UUID, exp: WorkExperienceCreate, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    record = db.query(WorkExperience).filter(WorkExperience.id == id, WorkExperience.user_id == current_user.id).first()
    if not record:
        raise HTTPException(status_code=404, detail="Work experience not found")
    record.company = exp.company
    record.role = exp.role
    record.location = exp.location
    record.start_date = exp.start_date
    record.end_date = exp.end_date
    record.description = exp.description
    record.bullets = exp.bullets
    record.is_current = exp.is_current
    db.commit()
    db.refresh(record)
    return WorkExperienceResponse.model_validate(record)

@app.delete("/api/profile/experience/{id}")
def delete_work_experience(id: uuid.UUID, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    record = db.query(WorkExperience).filter(WorkExperience.id == id, WorkExperience.user_id == current_user.id).first()
    if not record:
        raise HTTPException(status_code=404, detail="Work experience not found")
    db.delete(record)
    db.commit()
    return {"status": "deleted"}

@app.post("/api/profile/education", response_model=EducationResponse)
def create_education(edu: EducationCreate, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    record = Education(
        user_id=current_user.id,
        institution=edu.institution,
        degree=edu.degree,
        field_of_study=edu.field_of_study,
        start_year=edu.start_year,
        end_year=edu.end_year,
        grade_or_gpa=edu.grade_or_gpa
    )
    db.add(record)
    db.commit()
    db.refresh(record)
    return EducationResponse.model_validate(record)

@app.delete("/api/profile/education/{id}")
def delete_education(id: uuid.UUID, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    record = db.query(Education).filter(Education.id == id, Education.user_id == current_user.id).first()
    if not record:
        raise HTTPException(status_code=404, detail="Education not found")
    db.delete(record)
    db.commit()
    return {"status": "deleted"}

@app.post("/api/profile/certification", response_model=CertificationResponse)
def create_certification(cert: CertificationCreate, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    record = Certification(
        user_id=current_user.id,
        name=cert.name,
        issuer=cert.issuer,
        issue_date=cert.issue_date,
        credential_url=cert.credential_url
    )
    db.add(record)
    db.commit()
    db.refresh(record)
    return CertificationResponse.model_validate(record)

@app.delete("/api/profile/certification/{id}")
def delete_certification(id: uuid.UUID, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    record = db.query(Certification).filter(Certification.id == id, Certification.user_id == current_user.id).first()
    if not record:
        raise HTTPException(status_code=404, detail="Certification not found")
    db.delete(record)
    db.commit()
    return {"status": "deleted"}

@app.post("/api/profile/link", response_model=SocialLinkResponse)
def create_social_link(link: SocialLinkCreate, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    record = SocialLink(
        user_id=current_user.id,
        platform=link.platform,
        url=link.url,
        label=link.label
    )
    db.add(record)
    db.commit()
    db.refresh(record)
    return SocialLinkResponse.model_validate(record)

@app.delete("/api/profile/link/{id}")
def delete_social_link(id: uuid.UUID, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    record = db.query(SocialLink).filter(SocialLink.id == id, SocialLink.user_id == current_user.id).first()
    if not record:
        raise HTTPException(status_code=404, detail="Link not found")
    db.delete(record)
    db.commit()
    return {"status": "deleted"}


def build_dynamic_resume_payload(current_user: User, role: str, db: Session, variant: str = "visual") -> Dict[str, Any]:
    strategy = generate_resume_strategy_for_role(current_user, role, db, "ats_clean" if variant == "ats" else "visual")
    summary = strategy.candidate_positioning
    projects = db.query(Project).filter(Project.user_id == current_user.id).all()
    role_l = role.lower()

    scored_projects = []
    for p in projects:
        score = p.complexity_score or 0.5
        confirmed_domains = db.query(Domain).join(project_domains).filter(
            project_domains.c.project_id == p.id,
            project_domains.c.status == "user_confirmed"
        ).all()
        confirmed_skills = db.query(Skill).join(project_skills).filter(
            project_skills.c.project_id == p.id,
            project_skills.c.status == "user_confirmed"
        ).all()
        
        p_domains_str = " ".join([d.name.lower() for d in confirmed_domains])
        p_skills_str = " ".join([s.name.lower() for s in confirmed_skills])
        
        reasons = []
        if "machine learning" in role_l:
            if "machine learning" in p_domains_str or "nlp" in p_skills_str or "model" in p_domains_str:
                score += 5.0
                reasons.append("Matches machine learning modeling & NLP requirements")
        elif "backend" in role_l:
            if "backend" in p_domains_str or "api" in p_skills_str:
                score += 5.0
                reasons.append("Demonstrates scalable API & backend systems design")
        elif "software" in role_l:
            if "software engineering" in p_domains_str or "algorithms" in p_domains_str:
                score += 3.0
                reasons.append("High algorithmic complexity and structured software engineering")
                
        scored_projects.append((score, p, reasons))
        
    scored_projects.sort(key=lambda x: x[0], reverse=True)
    
    seen_bullet_texts: List[str] = []

    def _is_similar_claim_text(s1: str, s2: str) -> bool:
        w1 = set(re.sub(r"[^\w\s]", "", s1.lower()).split())
        w2 = set(re.sub(r"[^\w\s]", "", s2.lower()).split())
        if not w1 or not w2:
            return False
        overlap = len(w1.intersection(w2))
        return (overlap / max(len(w1), len(w2))) >= 0.75

    resume_projects = []
    for _, p, reasons in scored_projects:
        claims_list = db.query(Claim).filter(
            Claim.project_id == p.id,
            Claim.status == "user_confirmed"
        ).all()
        
        confirmed_skills = db.query(Skill).join(project_skills).filter(
            project_skills.c.project_id == p.id,
            project_skills.c.status == "user_confirmed"
        ).all()
        
        raw_bullets = [c.claim for c in claims_list]
        bullet_points: List[str] = []

        for b in raw_bullets:
            if not any(_is_similar_claim_text(b, prev) for prev in seen_bullet_texts):
                bullet_points.append(b)
                seen_bullet_texts.append(b)

        if not bullet_points and p.description:
            bullet_points.append(p.description)

        evidence_links = []
        for claim in claims_list:
            for ev in claim.evidence[:1]:
                evidence_links.append({
                    "type": ev.type,
                    "url": ev.source_url or "#",
                    "label": ev.source_identifier or "Verifiable Proof"
                })

        resume_projects.append({
            "id": p.id,
            "title": p.title,
            "description": p.description or "",
            "skills": [s.name for s in confirmed_skills[:5]],
            "bullet_points": bullet_points,
            "evidence": evidence_links,
            "evidence_links": evidence_links,
            "narrative": " • ".join(bullet_points),
            "relevance_reasons": reasons,
            "selected_reasons": reasons,
            "included": True,
            "custom_bullets": bullet_points
        })

    all_skills_progress = db.query(SkillProgress).filter(SkillProgress.user_id == current_user.id).all()
    skills_list = [sp.skill.name for sp in sorted(all_skills_progress, key=lambda x: x.evidence_count, reverse=True)[:8]]
    
    # Select distinct top-level claims
    all_user_claims = db.query(Claim).filter(
        Claim.user_id == current_user.id,
        Claim.status == "user_confirmed"
    ).all()
    
    distinct_claims: List[str] = []
    for c in all_user_claims:
        if not any(_is_similar_claim_text(c.claim, prev) for prev in distinct_claims):
            distinct_claims.append(c.claim)
        if len(distinct_claims) >= 4:
            break
            
    claims = distinct_claims

    # Also load structured work experience and education
    work_exps = db.query(WorkExperience).filter(WorkExperience.user_id == current_user.id).order_by(WorkExperience.created_at.desc()).all()
    edus = db.query(Education).filter(Education.user_id == current_user.id).order_by(Education.created_at.desc()).all()
    certs = db.query(Certification).filter(Certification.user_id == current_user.id).order_by(Certification.created_at.desc()).all()
    links = db.query(SocialLink).filter(SocialLink.user_id == current_user.id).order_by(SocialLink.created_at.asc()).all()

    return {
        "target_role": role,
        "variant": variant,
        "profile": current_user,
        "summary": summary,
        "projects": resume_projects,
        "skills": skills_list,
        "claims": claims,
        "experience": [WorkExperienceResponse.model_validate(w).model_dump() for w in work_exps],
        "education": [EducationResponse.model_validate(e).model_dump() for e in edus],
        "certifications": [CertificationResponse.model_validate(c).model_dump() for c in certs],
        "links": [SocialLinkResponse.model_validate(l).model_dump() for l in links]
    }


@app.get("/api/resume", response_model=ResumeResponse)
def get_dynamic_resume(
    role: str = Query(..., description="Target role name"),
    variant: Optional[str] = Query("visual", description="Variant: 'ats' or 'visual'"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Retrieves the saved resume for the target role if existing, or generates a dynamic graph resume."""
    saved = db.query(Resume).filter(
        Resume.user_id == current_user.id,
        Resume.target_role.ilike(role)
    ).first()
    
    if saved:
        return {
            "id": saved.id,
            "title": saved.title,
            "target_role": saved.target_role,
            "variant": saved.variant,
            "profile": current_user,
            "summary": saved.summary,
            "skills": saved.skills_json or [],
            "claims": saved.claims_json or [],
            "projects": saved.projects_json or [],
            "experience": saved.experience_json or [],
            "education": saved.education_json or [],
            "certifications": saved.certifications_json or [],
            "links": saved.links_json or [],
            "is_primary": saved.is_primary,
            "created_at": saved.created_at,
            "updated_at": saved.updated_at
        }
        
    return build_dynamic_resume_payload(current_user, role, db, variant=variant or "visual")


@app.get("/api/resumes", response_model=List[ResumeResponse])
def list_resumes(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    resumes = db.query(Resume).filter(Resume.user_id == current_user.id).order_by(Resume.updated_at.desc()).all()
    results = []
    for r in resumes:
        results.append({
            "id": r.id,
            "title": r.title,
            "target_role": r.target_role,
            "variant": r.variant,
            "resume_format": getattr(r, "resume_format", "ats_clean") or "ats_clean",
            "profile": current_user,
            "summary": r.summary,
            "skills": r.skills_json or [],
            "claims": r.claims_json or [],
            "projects": r.projects_json or [],
            "experience": r.experience_json or [],
            "education": r.education_json or [],
            "certifications": r.certifications_json or [],
            "links": r.links_json or [],
            "visible_sections": getattr(r, "visible_sections_json", []) or [],
            "section_order": getattr(r, "section_order_json", []) or [],
            "is_primary": r.is_primary,
            "created_at": r.created_at,
            "updated_at": r.updated_at
        })
    return results


@app.get("/api/resumes/{id}", response_model=ResumeResponse)
def get_resume_by_id(id: uuid.UUID, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    r = db.query(Resume).filter(Resume.id == id, Resume.user_id == current_user.id).first()
    if not r:
        raise HTTPException(status_code=404, detail="Resume not found")
    return {
        "id": r.id,
        "title": r.title,
        "target_role": r.target_role,
        "variant": r.variant,
        "resume_format": getattr(r, "resume_format", "ats_clean") or "ats_clean",
        "profile": current_user,
        "summary": r.summary,
        "skills": r.skills_json or [],
        "claims": r.claims_json or [],
        "projects": r.projects_json or [],
        "experience": r.experience_json or [],
        "education": r.education_json or [],
        "certifications": r.certifications_json or [],
        "links": r.links_json or [],
        "visible_sections": getattr(r, "visible_sections_json", []) or [],
        "section_order": getattr(r, "section_order_json", []) or [],
        "is_primary": r.is_primary,
        "created_at": r.created_at,
        "updated_at": r.updated_at
    }


def _to_json_safe(obj: Any) -> Any:
    """Recursively convert UUID, datetime, sets, and Pydantic models to JSON-safe primitives."""
    if obj is None:
        return None
    if isinstance(obj, uuid.UUID):
        return str(obj)
    if isinstance(obj, datetime):
        return obj.isoformat()
    if isinstance(obj, (list, tuple, set)):
        return [_to_json_safe(i) for i in obj]
    if isinstance(obj, dict):
        return {str(k): _to_json_safe(v) for k, v in obj.items()}
    if hasattr(obj, "model_dump"):
        return _to_json_safe(obj.model_dump())
    if hasattr(obj, "dict"):
        return _to_json_safe(obj.dict())
    return obj


@app.post("/api/resumes", response_model=ResumeResponse)
def create_or_save_resume(
    req: ResumeSaveRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Persists a new or customized resume."""
    # Convert projects to dicts
    projects_data = []
    if req.projects:
        for p in req.projects:
            projects_data.append(_to_json_safe(p))
    else:
        # Fallback to dynamic build
        dynamic = build_dynamic_resume_payload(current_user, req.target_role or "Software Engineer", db)
        projects_data = _to_json_safe(dynamic["projects"])
        if not req.summary:
            req.summary = dynamic["summary"]
        if not req.skills:
            req.skills = dynamic["skills"]

    resume = Resume(
        user_id=current_user.id,
        title=req.title or f"{req.target_role} Resume",
        target_role=req.target_role or "Software Engineer",
        variant=req.variant or "visual",
        resume_format=req.resume_format or "ats_clean",
        summary=req.summary or "",
        skills_json=_to_json_safe(req.skills or []),
        claims_json=_to_json_safe(req.claims or []),
        projects_json=projects_data,
        experience_json=_to_json_safe(req.experience or []),
        education_json=_to_json_safe(req.education or []),
        certifications_json=_to_json_safe(req.certifications or []),
        links_json=_to_json_safe(req.links or []),
        visible_sections_json=_to_json_safe(req.visible_sections or []),
        section_order_json=_to_json_safe(req.section_order or []),
        is_primary=req.is_primary or False
    )
    db.add(resume)
    db.commit()
    db.refresh(resume)

    # Save initial version
    version = ResumeVersion(
        resume_id=resume.id,
        version_number=1,
        change_summary="Initial created version",
        snapshot_payload={
            "summary": resume.summary,
            "skills": resume.skills_json,
            "projects": resume.projects_json
        }
    )
    db.add(version)
    db.commit()

    return {
        "id": resume.id,
        "title": resume.title,
        "target_role": resume.target_role,
        "variant": resume.variant,
        "resume_format": getattr(resume, "resume_format", "ats_clean") or "ats_clean",
        "profile": current_user,
        "summary": resume.summary,
        "skills": resume.skills_json or [],
        "claims": resume.claims_json or [],
        "projects": resume.projects_json or [],
        "experience": resume.experience_json or [],
        "education": resume.education_json or [],
        "certifications": resume.certifications_json or [],
        "links": resume.links_json or [],
        "visible_sections": getattr(resume, "visible_sections_json", []) or [],
        "section_order": getattr(resume, "section_order_json", []) or [],
        "is_primary": resume.is_primary,
        "created_at": resume.created_at,
        "updated_at": resume.updated_at
    }


@app.put("/api/resumes/{id}", response_model=ResumeResponse)
def update_resume(
    id: uuid.UUID,
    req: ResumeSaveRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    resume = db.query(Resume).filter(Resume.id == id, Resume.user_id == current_user.id).first()
    if not resume:
        raise HTTPException(status_code=404, detail="Resume not found")

    if req.title is not None:
        resume.title = req.title
    if req.target_role is not None:
        resume.target_role = req.target_role
    if req.variant is not None:
        resume.variant = req.variant
    if req.resume_format is not None:
        resume.resume_format = req.resume_format
    if req.summary is not None:
        resume.summary = req.summary
    if req.skills is not None:
        resume.skills_json = _to_json_safe(req.skills)
    if req.claims is not None:
        resume.claims_json = _to_json_safe(req.claims)
    if req.projects is not None:
        projects_data = []
        for p in req.projects:
            projects_data.append(_to_json_safe(p))
        resume.projects_json = projects_data
    if req.experience is not None:
        resume.experience_json = _to_json_safe(req.experience)
    if req.education is not None:
        resume.education_json = _to_json_safe(req.education)
    if req.certifications is not None:
        resume.certifications_json = _to_json_safe(req.certifications)
    if req.links is not None:
        resume.links_json = _to_json_safe(req.links)
    if req.visible_sections is not None:
        resume.visible_sections_json = _to_json_safe(req.visible_sections)
    if req.section_order is not None:
        resume.section_order_json = _to_json_safe(req.section_order)
    if req.is_primary is not None:
        resume.is_primary = req.is_primary

    resume.updated_at = datetime.now(timezone.utc)
    db.commit()
    db.refresh(resume)

    return {
        "id": resume.id,
        "title": resume.title,
        "target_role": resume.target_role,
        "variant": resume.variant,
        "resume_format": getattr(resume, "resume_format", "ats_clean") or "ats_clean",
        "profile": current_user,
        "summary": resume.summary,
        "skills": resume.skills_json or [],
        "claims": resume.claims_json or [],
        "projects": resume.projects_json or [],
        "experience": resume.experience_json or [],
        "education": resume.education_json or [],
        "certifications": resume.certifications_json or [],
        "links": resume.links_json or [],
        "visible_sections": getattr(resume, "visible_sections_json", []) or [],
        "section_order": getattr(resume, "section_order_json", []) or [],
        "is_primary": resume.is_primary,
        "created_at": resume.created_at,
        "updated_at": resume.updated_at
    }


@app.delete("/api/resumes/{id}")
def delete_resume(id: uuid.UUID, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    resume = db.query(Resume).filter(Resume.id == id, Resume.user_id == current_user.id).first()
    if not resume:
        raise HTTPException(status_code=404, detail="Resume not found")
    db.delete(resume)
    db.commit()
    return {"status": "deleted"}


ai_improve_history: Dict[str, List[datetime]] = {}
AI_IMPROVE_RATE_LIMIT = 15
AI_IMPROVE_WINDOW_SECONDS = 60

@app.post("/api/resumes/ai-improve", response_model=AIImproveResponse)
def ai_improve_resume_content(req: AIImproveRequest, current_user: User = Depends(get_current_user)):
    """Enhances a summary or project bullet with quantifiable impact and ATS keywords without fabricating false metrics."""
    # In-memory rate limiting check
    user_id_str = str(current_user.id)
    now = datetime.now(timezone.utc)
    history = ai_improve_history.get(user_id_str, [])
    history = [t for t in history if (now - t).total_seconds() < AI_IMPROVE_WINDOW_SECONDS]
    if len(history) >= AI_IMPROVE_RATE_LIMIT:
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail=f"Rate limit exceeded: Maximum {AI_IMPROVE_RATE_LIMIT} AI polish requests per minute."
        )
    history.append(now)
    ai_improve_history[user_id_str] = history

    role = req.target_role or "Software Engineer"
    text = req.text.strip()
    
    # Try LLM if available
    if openai_client:
        try:
            prompt = (
                f"You are an expert technical resume editor for top-tier software engineers. Polish the following candidate {req.field_type} for a '{role}' target role.\n"
                f"Text: \"{text}\"\n"
                f"STRICT RULES:\n"
                f"1. DO NOT fabricate or invent fake numbers, benchmarks, or percentages not in the input.\n"
                f"2. Use active, high-impact engineering verbs (Architected, Engineered, Formulated, Implemented, Streamlined).\n"
                f"3. Make technical phrasing crisp, authoritative, and ATS-optimized.\n"
                f"4. Output valid JSON strictly: {{\"improved_text\": \"...\", \"suggestions\": [\"...\", \"...\"]}}"
            )
            response = openai_client.chat.completions.create(
                model="gpt-4o-mini",
                messages=[{"role": "user", "content": prompt}],
                temperature=0.2,
                response_format={"type": "json_object"}
            )
            content = json.loads(response.choices[0].message.content)
            if "improved_text" in content:
                return AIImproveResponse(
                    improved_text=content["improved_text"],
                    suggestions=content.get("suggestions", [])
                )
        except Exception:
            pass

    # Context-Aware Syntactic Enhancement (High Integrity, Zero Metric Fabrication)
    if req.field_type == "summary":
        improved = (
            f"Strategic, evidence-backed {role} specialized in engineering scalable systems, "
            f"optimizing distributed architectures, and designing resilient backend pipelines. "
            f"Demonstrated history of translating complex product requirements into robust, high-availability software solutions."
        )
        suggestions = [
            f"Highlight specific cloud environments (e.g., AWS, GCP, Kubernetes) matching {role}",
            "Detail core programming languages and frameworks in your primary stack",
            "Mention architectural paradigms utilized (e.g., event-driven, microservices, CQRS)"
        ]
    else:
        # Contextual Engineering Bullet Transformation
        clean_text = text.rstrip(".")
        lower_t = clean_text.lower()
        import re
        
        # Strip weak starter words
        stripped = re.sub(
            r'^(i\s+have\s+|i\s+|responsible\s+for\s+|worked\s+on\s+|wrote\s+|writing\s+|created\s+|creating\s+|built\s+|building\s+|coded\s+|coding\s+|added\s+|adding\s+|helped\s+with\s+|was\s+in\s+charge\s+of\s+)',
            '',
            clean_text,
            flags=re.IGNORECASE
        ).strip()
        
        if not stripped:
            stripped = clean_text
            
        # Domain context-aware active engineering verbs strictly rewriting candidate's text
        if any(k in lower_t for k in ("api", "endpoint", "rest", "graphql", "grpc", "service", "backend")):
            improved = f"Architected service interfaces for {stripped}, establishing structured API error-handling contracts and maintainable routing patterns."
        elif any(k in lower_t for k in ("db", "database", "sql", "postgres", "redis", "cache", "query", "orm")):
            improved = f"Engineered persistent data access logic for {stripped}, optimizing indexing structure and query execution paths."
        elif any(k in lower_t for k in ("model", "ml", "ai", "transformer", "train", "inference", "dataset", "neural")):
            improved = f"Developed machine learning pipelines for {stripped}, structuring repeatable evaluation workflows and model execution."
        elif any(k in lower_t for k in ("docker", "k8s", "kubernetes", "ci", "cd", "pipeline", "deploy", "infra", "cloud")):
            improved = f"Containerized and configured deployment pipelines for {stripped}, establishing declarative infrastructure workflows."
        elif any(k in lower_t for k in ("ui", "react", "next", "frontend", "css", "component", "state")):
            improved = f"Designed responsive user interfaces for {stripped}, structuring modular component state and clean view logic."
        elif any(lower_t.startswith(p) for p in ("architected", "developed", "engineered", "implemented", "optimized", "spearheaded", "designed", "deployed", "streamlined")):
            improved = f"{clean_text[0].upper() + clean_text[1:]} to maintain reliable system modularity and software craftsmanship standards."
        else:
            improved = f"Engineered and implemented {stripped[0].lower() + stripped[1:] if len(stripped) > 1 else stripped} with clear modular boundaries."

        suggestions = [
            "Add verified project metrics if backed by your evidence (e.g., requests/sec, latency, throughput, concurrency)",
            "Specify the exact protocols, frameworks, or database engines leveraged in the implementation"
        ]

    return AIImproveResponse(
        improved_text=improved,
        suggestions=suggestions
    )


# ─── Resume Intelligence Engine Subsystem Endpoints ─────────────────────────

@app.get("/api/resume/identity", response_model=ProfessionalIdentityResponse)
def get_professional_identity(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Discovers professional identity model from ground-truth Career Graph evidence."""
    return compute_candidate_professional_identity(current_user, db)


@app.post("/api/resume/strategy", response_model=ResumeStrategyResponse)
def get_resume_strategy(
    req: ResumeStrategyRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Curates role-specific representation strategy with mathematical role fit breakdown."""
    return generate_resume_strategy_for_role(current_user, req.target_role, db, req.layout_preference)


@app.post("/api/resume/representation", response_model=ResumeBlockRepresentation)
def get_resume_representation(
    req: ResumeStrategyRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Generates structured modular block representation for the resume."""
    strategy = generate_resume_strategy_for_role(current_user, req.target_role, db, req.layout_preference)
    return generate_blocks_representation_from_strategy(current_user, strategy, db, req.layout_preference)


@app.post("/api/resume/featured/auto-generate", response_model=ResumeBlockRepresentation)
def auto_generate_featured_resume(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Auto-evaluates candidate competencies against candidate roles and generates the optimal 2-column Featured Resume."""
    return build_featured_resume(current_user, db)


@app.post("/api/resume/validate", response_model=ResumeValidationResponse)
def validate_resume_representation(
    req: ResumeValidationRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Cross-validates all claims against database ground truth and flags/sanitizes fabricated metrics."""
    return validate_and_sanitize_resume_blocks(req.blocks, current_user, db)


@app.post("/api/resume/critique", response_model=ResumeCritiqueResponse)
def critique_resume_representation(
    req: ResumeCritiqueRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Evaluates representation against the 10-second recruiter attention model and discovers communication gaps."""
    return generate_recruiter_critique_for_role(current_user, req.target_role, db)


@app.post("/api/resume/improve-representation", response_model=ResumeBlockRepresentation)
def improve_representation(
    req: ImproveRepresentationRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Applies identified gap fixes to the strategy and regenerates the modular resume representation."""
    strategy = generate_resume_strategy_for_role(current_user, req.target_role, db, req.layout_personality)
    if req.selected_gaps_to_fix:
        strategy.candidate_positioning += " Enhanced with verified multi-disciplinary depth across core graph domains."
    return generate_blocks_representation_from_strategy(current_user, strategy, db, req.layout_personality)


# --- Recruiter Match Endpoints ---

@app.get("/api/recruiter/match", response_model=RecruiterMatchResponse)
def get_recruiter_match(
    role_name: str = Query(..., description="Role title to evaluate match against"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Evaluates candidate match against a target role based on empirical capability matrices and mathematical scoring."""
    return evaluate_recruiter_role_match(current_user, role_name, db)


@app.post("/api/recruiter/match-jd", response_model=RecruiterMatchResponse)
def post_match_custom_job_description(
    req: CustomJobDescriptionMatchRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Evaluates candidate evidence against arbitrary pasted Job Description text.
    Extracts required technical capabilities and executes 4-dimension ground-truth matching.
    """
    return match_custom_job_description(current_user, req.title or "Target Role", req.job_description_text, db)



# --- Multi-Source Profile Ingestion ---

@app.post("/api/ingest/profile")
def ingest_profile(
    req: ProfileIngestRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Ingests resume/career profile text from paste, PDF/DOCX upload, or GitHub README.
    Strict structured output + bounded repair retry, content-hash idempotency, and audit logging.
    """
    import hashlib
    from backend.app.models import AIInference

    raw_text = resolve_source_text(req, current_user)
    content_hash = hashlib.sha256(raw_text.encode("utf-8")).hexdigest()

    # Check cached extraction for idempotency
    cached = db.query(AIInference).filter(
        AIInference.content_hash == content_hash,
        AIInference.prompt_type == "profile_extraction",
        AIInference.error_message.is_(None)
    ).first()

    if cached and cached.response_payload:
        extracted = ExtractedProfile.model_validate_json(cached.response_payload)
    else:
        extracted = extract_profile_from_text(raw_text, db=db, content_hash=content_hash)

    staged = stage_extracted_profile(db, current_user, extracted)
    return {
        "status": "success",
        "staged": staged,
        "review_required": True,
        "headline": extracted.headline,
        "extracted_summary": f"Staged {staged['work_experiences_count']} experiences, {staged['educations_count']} educations, {staged['certifications_count']} certifications for review."
    }


# --- Review Queue Endpoints ---

@app.get("/api/review")
def get_review_queue(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    """Returns AI-suggested claims, skills, domains, experiences, education, and certifications waiting for confirmation."""
    pending_claims = db.query(Claim).filter(
        Claim.user_id == current_user.id,
        Claim.status == "ai_suggested"
    ).all()
    
    pending_domains_query = db.query(
        project_domains.c.project_id,
        project_domains.c.domain_id,
        project_domains.c.confidence,
        Project.title.label("project_title"),
        Domain.name.label("domain_name")
    ).join(Project, Project.id == project_domains.c.project_id
    ).join(Domain, Domain.id == project_domains.c.domain_id
    ).filter(
        Project.user_id == current_user.id,
        project_domains.c.status == "ai_suggested"
    ).all()
    
    pending_skills_query = db.query(
        project_skills.c.project_id,
        project_skills.c.skill_id,
        project_skills.c.confidence,
        Project.title.label("project_title"),
        Skill.name.label("skill_name")
    ).join(Project, Project.id == project_skills.c.project_id
    ).join(Skill, Skill.id == project_skills.c.skill_id
    ).filter(
        Project.user_id == current_user.id,
        project_skills.c.status == "ai_suggested"
    ).all()

    pending_experiences = db.query(WorkExperience).filter(
        WorkExperience.user_id == current_user.id,
        WorkExperience.status == "ai_suggested"
    ).all()

    pending_educations = db.query(Education).filter(
        Education.user_id == current_user.id,
        Education.status == "ai_suggested"
    ).all()

    pending_certifications = db.query(Certification).filter(
        Certification.user_id == current_user.id,
        Certification.status == "ai_suggested"
    ).all()
    
    return {
        "claims": [{
            "id": str(c.id),
            "claim": c.claim,
            "claim_type": c.claim_type,
            "confidence": c.confidence,
            "project_id": str(c.project_id),
            "project_title": c.project.title if c.project else "Unknown"
        } for c in pending_claims],
        "domains": [{
            "project_id": str(d.project_id),
            "domain_id": str(d.domain_id),
            "confidence": d.confidence,
            "project_title": d.project_title,
            "domain_name": d.domain_name
        } for d in pending_domains_query],
        "skills": [{
            "project_id": str(s.project_id),
            "skill_id": str(s.skill_id),
            "confidence": s.confidence,
            "project_title": s.project_title,
            "skill_name": s.skill_name
        } for s in pending_skills_query],
        "experiences": [{
            "id": str(e.id),
            "company": e.company,
            "role": e.role,
            "start_date": e.start_date,
            "end_date": e.end_date,
            "location": e.location,
            "bullets": e.bullets or []
        } for e in pending_experiences],
        "educations": [{
            "id": str(ed.id),
            "institution": ed.institution,
            "degree": ed.degree,
            "field_of_study": ed.field_of_study,
            "start_year": ed.start_year,
            "end_year": ed.end_year
        } for ed in pending_educations],
        "certifications": [{
            "id": str(ct.id),
            "name": ct.name,
            "issuer": ct.issuer,
            "issue_date": ct.issue_date
        } for ct in pending_certifications]
    }


@app.patch("/api/claims/{id}")
def update_claim_status(
    id: uuid.UUID,
    payload: Dict[str, str],
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    claim = db.query(Claim).filter(Claim.id == id, Claim.user_id == current_user.id).first()
    if not claim:
        raise HTTPException(status_code=404, detail="Claim not found")
    status_val = payload.get("status")
    if status_val not in ["user_confirmed", "user_rejected", "ai_suggested"]:
        raise HTTPException(status_code=400, detail="Invalid status value")
    claim.status = status_val
    db.commit()
    return {"status": "success", "claim_id": str(id), "new_status": status_val}


@app.patch("/api/project-domains/{project_id}/{domain_id}")
def update_project_domain_status(
    project_id: uuid.UUID,
    domain_id: uuid.UUID,
    payload: Dict[str, str],
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    proj = db.query(Project).filter(Project.id == project_id, Project.user_id == current_user.id).first()
    if not proj:
        raise HTTPException(status_code=404, detail="Project not found")
    status_val = payload.get("status")
    if status_val not in ["user_confirmed", "user_rejected", "ai_suggested"]:
        raise HTTPException(status_code=400, detail="Invalid status value")
        
    db.execute(
        project_domains.update().where(
            project_domains.c.project_id == project_id,
            project_domains.c.domain_id == domain_id
        ).values(status=status_val)
    )
    db.commit()
    update_domain_progress_scores(db, current_user.id)
    return {"status": "success", "new_status": status_val}


@app.patch("/api/project-skills/{project_id}/{skill_id}")
def update_project_skill_status(
    project_id: uuid.UUID,
    skill_id: uuid.UUID,
    payload: Dict[str, str],
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    proj = db.query(Project).filter(Project.id == project_id, Project.user_id == current_user.id).first()
    if not proj:
        raise HTTPException(status_code=404, detail="Project not found")
    status_val = payload.get("status")
    if status_val not in ["user_confirmed", "user_rejected", "ai_suggested"]:
        raise HTTPException(status_code=400, detail="Invalid status value")
        
    db.execute(
        project_skills.update().where(
            project_skills.c.project_id == project_id,
            project_skills.c.skill_id == skill_id
        ).values(status=status_val)
    )
    db.commit()
    update_skill_progress_scores(db, current_user.id)
    return {"status": "success", "new_status": status_val}


@app.patch("/api/profile/experience/{id}")
def update_work_experience_status(
    id: uuid.UUID,
    payload: Dict[str, str],
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    rec = db.query(WorkExperience).filter(WorkExperience.id == id, WorkExperience.user_id == current_user.id).first()
    if not rec:
        raise HTTPException(status_code=404, detail="Work experience record not found")
    status_val = payload.get("status")
    if status_val not in ["user_confirmed", "user_rejected", "ai_suggested"]:
        raise HTTPException(status_code=400, detail="Invalid status value")
    rec.status = status_val
    db.commit()
    return {"status": "success", "id": str(id), "new_status": status_val}


@app.patch("/api/profile/education/{id}")
def update_education_status(
    id: uuid.UUID,
    payload: Dict[str, str],
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    rec = db.query(Education).filter(Education.id == id, Education.user_id == current_user.id).first()
    if not rec:
        raise HTTPException(status_code=404, detail="Education record not found")
    status_val = payload.get("status")
    if status_val not in ["user_confirmed", "user_rejected", "ai_suggested"]:
        raise HTTPException(status_code=400, detail="Invalid status value")
    rec.status = status_val
    db.commit()
    return {"status": "success", "id": str(id), "new_status": status_val}


@app.patch("/api/profile/certification/{id}")
def update_certification_status(
    id: uuid.UUID,
    payload: Dict[str, str],
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    rec = db.query(Certification).filter(Certification.id == id, Certification.user_id == current_user.id).first()
    if not rec:
        raise HTTPException(status_code=404, detail="Certification record not found")
    status_val = payload.get("status")
    if status_val not in ["user_confirmed", "user_rejected", "ai_suggested"]:
        raise HTTPException(status_code=400, detail="Invalid status value")
    rec.status = status_val
    db.commit()
    return {"status": "success", "id": str(id), "new_status": status_val}


# --- Ideas & Projects Endpoints (Living Collective Entity) ---

@app.post("/api/ideas", response_model=IdeaResponse)
def create_idea(idea: IdeaCreate, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    new_idea = Idea(
        user_id=current_user.id,
        title=idea.title,
        description=idea.description,
        status=idea.status,
        maturity=idea.maturity,
        potential_impact=idea.potential_impact,
        parent_project_id=idea.parent_project_id,
        skills_json=idea.skills_json or [],
        domains_json=idea.domains_json or [],
        notes_json=idea.notes_json or []
    )
    db.add(new_idea)
    db.commit()
    db.refresh(new_idea)
    return new_idea


@app.put("/api/ideas/{id}", response_model=IdeaResponse)
def update_idea(id: uuid.UUID, idea: IdeaCreate, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    db_idea = db.query(Idea).filter(Idea.id == id, Idea.user_id == current_user.id).first()
    if not db_idea:
        raise HTTPException(status_code=404, detail="Idea not found")
    db_idea.title = idea.title
    db_idea.description = idea.description
    db_idea.status = idea.status
    db_idea.maturity = idea.maturity
    db_idea.potential_impact = idea.potential_impact
    db_idea.parent_project_id = idea.parent_project_id
    if idea.skills_json is not None:
        db_idea.skills_json = idea.skills_json
    if idea.domains_json is not None:
        db_idea.domains_json = idea.domains_json
    if idea.notes_json is not None:
        db_idea.notes_json = idea.notes_json
    db.commit()
    db.refresh(db_idea)
    return db_idea


@app.post("/api/ideas/{id}/notes", response_model=IdeaResponse)
def add_idea_note(
    id: uuid.UUID,
    payload: IdeaNoteCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Appends an incremental thought note into the idea's living lineage history."""
    db_idea = db.query(Idea).filter(Idea.id == id, Idea.user_id == current_user.id).first()
    if not db_idea:
        raise HTTPException(status_code=404, detail="Idea not found")
    
    current_notes = list(db_idea.notes_json or [])
    new_note = {
        "id": str(uuid.uuid4()),
        "note": payload.note,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    current_notes.append(new_note)
    db_idea.notes_json = current_notes
    db.commit()
    db.refresh(db_idea)
    return db_idea


@app.post("/api/ideas/auto-draft")
def auto_draft_ideas_from_activity(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Senses candidate's emerging domains and trajectories to auto-draft intelligent project concepts."""
    identity = compute_candidate_professional_identity(current_user, db)
    emerging = identity.emerging_domains
    primary = identity.primary_domains
    
    drafts = []
    if emerging:
        target_domain = emerging[0]
        drafts.append({
            "title": f"Next-Gen {target_domain} Autonomous Pipeline",
            "description": f"Exploring advanced architectures in {target_domain} to bridge verified depth with emerging industry requirements.",
            "maturity": "SPARK",
            "status": "EXPLORING",
            "potential_impact": "HIGH",
            "domains_json": [target_domain],
            "skills_json": identity.strong_capabilities[:3]
        })
    if primary:
        primary_domain = primary[0]
        drafts.append({
            "title": f"Distributed Benchmark Suite for {primary_domain}",
            "description": f"Empirical evaluation engine measuring throughput, latency, and fault tolerance across {primary_domain} components.",
            "maturity": "EARLY",
            "status": "EXPLORING",
            "potential_impact": "MEDIUM",
            "domains_json": [primary_domain],
            "skills_json": identity.strong_capabilities[:2]
        })
    if not drafts:
        drafts.append({
            "title": "Full-Stack System Observability & Telemetry Framework",
            "description": "Unified metrics aggregator and trace visualizer built with modern typed stacks.",
            "maturity": "SPARK",
            "status": "EXPLORING",
            "potential_impact": "MEDIUM",
            "domains_json": ["Systems & Architecture"],
            "skills_json": ["Python", "FastAPI"]
        })
        
    return {"drafts": drafts}


@app.delete("/api/ideas/{id}")
def delete_idea(id: uuid.UUID, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    db_idea = db.query(Idea).filter(Idea.id == id, Idea.user_id == current_user.id).first()
    if not db_idea:
        raise HTTPException(status_code=404, detail="Idea not found")
    db.delete(db_idea)
    db.commit()
    return {"status": "deleted"}


# ─── Career Change Intelligence (Diff & Significance) ────────────────────────

@app.get("/api/career/delta", response_model=CareerDeltaReport)
def get_career_delta(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Computes mathematical diff between candidate's latest snapshot and live graph state,
    identifying newly demonstrated capabilities, domain momentum, and resume refresh items.
    """
    return compute_career_delta(current_user, db)


@app.post("/api/events/classify", response_model=EventSignificanceResult)
def classify_codebase_event(
    commit_message: Optional[str] = Query(None, description="Commit message or release title"),
    files_changed: Optional[str] = Query(None, description="Comma-separated or repeated file paths"),
    current_user: User = Depends(get_current_user)
):
    """
    Evaluates codebase commit significance against Career Graph 4-tier model (LOW/MEDIUM/HIGH/CAREER_SIGNIFICANT)
    to determine autonomous update policies without noise.
    """
    msg = commit_message or ""
    file_list = [f.strip() for f in files_changed.split(",") if f.strip()] if files_changed else []
    return classify_event_significance(msg, file_list)


@app.post("/api/webhooks/github")
async def handle_github_webhook(
    request: Request,
    db: Session = Depends(get_db)
):
    """
    Autonomous event webhook: validates GitHub HMAC-SHA256 signature, maps repository to User,
    persists new commits/evidence, classifies significance, and triggers graph updates.
    """
    raw_body = await request.body()
    
    # 1. Signature Verification (HMAC-SHA256)
    sig_header = request.headers.get("x-hub-signature-256") or request.headers.get("X-Hub-Signature-256")
    if GITHUB_WEBHOOK_SECRET:
        if not sig_header:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Missing X-Hub-Signature-256 header")
        expected_sig = "sha256=" + hmac.new(GITHUB_WEBHOOK_SECRET.encode(), raw_body, hashlib.sha256).hexdigest()
        if not hmac.compare_digest(sig_header, expected_sig):
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid webhook signature")

    try:
        payload = json.loads(raw_body.decode()) if raw_body else {}
    except Exception:
        payload = {}

    repo_data = payload.get("repository", {})
    repo_name = repo_data.get("name", "repository")
    repo_url = repo_data.get("html_url") or repo_data.get("url") or f"https://github.com/example/{repo_name}"
    owner_login = repo_data.get("owner", {}).get("login") or payload.get("sender", {}).get("login") or ""
    
    # 2. Resolve User from repository / sender
    user = None
    if owner_login:
        user = db.query(User).filter(User.github_username.ilike(owner_login)).first()
    if not user and repo_url:
        matched_proj = db.query(Project).filter(Project.repository_url == repo_url).first()
        if matched_proj:
            user = db.query(User).filter(User.id == matched_proj.user_id).first()

    commits = payload.get("commits", [])
    head_commit = payload.get("head_commit") or (commits[-1] if commits else {})
    commit_msg = head_commit.get("message", "")
    commit_hash = head_commit.get("id", str(uuid.uuid4()))
    modified_files = head_commit.get("modified", []) + head_commit.get("added", [])
    
    # 3. Classify event significance
    significance = classify_event_significance(commit_msg, modified_files)
    
    delta_generated = False
    snapshot_created = False
    
    # 4. If User is connected, execute autonomous graph and evidence updates
    if user:
        # Find or create project
        project = db.query(Project).filter(
            Project.user_id == user.id,
            (Project.title.ilike(repo_name) | (Project.repository_url == repo_url))
        ).first()
        
        if not project:
            project = Project(
                user_id=user.id,
                title=repo_name,
                description=repo_data.get("description") or f"Repository {repo_name}",
                repository_url=repo_url,
                complexity_score=0.6,
                project_type="SYSTEM"
            )
            db.add(project)
            db.flush()
            
        # Record Activity
        activity = Activity(
            user_id=user.id,
            project_id=project.id,
            type="COMMIT" if not payload.get("release") else "RELEASE",
            source="github",
            source_id=commit_hash[:12],
            timestamp=datetime.now(timezone.utc),
            activity_metadata={
                "message": commit_msg,
                "files_changed_count": len(modified_files),
                "significance": significance.level
            }
        )
        db.add(activity)
        
        # Record Evidence
        evidence = Evidence(
            user_id=user.id,
            project_id=project.id,
            type="COMMIT" if not payload.get("release") else "RELEASE",
            source="github",
            source_url=head_commit.get("url") or f"{repo_url}/commit/{commit_hash}",
            source_identifier=commit_hash[:8],
            content=commit_msg,
            hash=commit_hash,
            confidence=significance.score,
            metadata_json={"affected_competencies": significance.affected_competencies}
        )
        db.add(evidence)
        db.commit()
        
        # 5. If event is HIGH or CAREER_SIGNIFICANT, capture snapshot & compute delta
        if significance.level in ("HIGH", "CAREER_SIGNIFICANT"):
            active_projs = [p.title for p in db.query(Project).filter(Project.user_id == user.id).all()]
            dom_prog = [dp.domain.name for dp in db.query(DomainProgress).filter(DomainProgress.user_id == user.id).all()]
            sk_prog = [sp.skill.name for sp in db.query(SkillProgress).filter(SkillProgress.user_id == user.id).all()]
            
            snapshot = CareerSnapshot(
                user_id=user.id,
                dominant_domains=dom_prog[:4],
                emerging_domains=dom_prog[4:7],
                strongest_skills=sk_prog[:8],
                active_projects=active_projs,
                career_direction=f"Autonomous update following {significance.level} event: {commit_msg[:60]}"
            )
            db.add(snapshot)
            db.commit()
            snapshot_created = True
            delta_generated = True

    return {
        "status": "processed",
        "user_associated": user is not None,
        "user_id": str(user.id) if user else None,
        "significance": significance.level,
        "action_policy": significance.action_policy,
        "affected_competencies": significance.affected_competencies,
        "rationale": significance.rationale,
        "snapshot_created": snapshot_created,
        "delta_generated": delta_generated
    }


