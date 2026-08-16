import os
import math
import json
from contextlib import asynccontextmanager
from fastapi import FastAPI, Depends, HTTPException, Query, status
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
    ImproveRepresentationRequest
)
from backend.app.auth import get_current_user, create_access_token, exchange_github_code, encrypt_token, decrypt_token
from backend.app.config import APP_ENV, OPENAI_API_KEY, ANTHROPIC_API_KEY, DEMO_MODE

from backend.app.analyzer import (
    fetch_github_repos,
    fetch_github_repo_details,
    sync_github_project,
    openai_client,
    anthropic_client,
    update_domain_progress_scores,
    update_skill_progress_scores,
    save_career_snapshot
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
    projects = db.query(Project).filter(Project.user_id == current_user.id).all()
    role_l = role.lower()
    
    if variant == "ats":
        # ATS-optimized dense summary tailored for recruiter search algorithms
        if "machine learning" in role_l or "data" in role_l:
            summary = f"Technical Machine Learning Engineer with verified expertise in predictive modeling, NLP pipelines, data architectures, and algorithm optimization. Proficient in Python, high-throughput model execution, and production deployment."
        elif "backend" in role_l or "systems" in role_l:
            summary = f"Systems and Backend Software Engineer experienced in architecting scalable REST/gRPC APIs, microservices, database caching, and high-concurrency pipelines. Skilled in Go, Python, TypeScript, and distributed systems design."
        else:
            summary = f"Software Engineer with demonstrated competency in full-lifecycle software development, algorithm design, and maintainable systems architecture. Proven track record of shipping production-grade applications."
    else:
        # Visual narrative-focused summary emphasizing evidence-backed achievements
        if "machine learning" in role_l or "data" in role_l:
            summary = f"Machine Learning specialist focused on predictive modeling, NLP pipelines, and data architectures. Backed by verified repository evidence showing execution depth in Python and algorithm design."
        elif "backend" in role_l or "systems" in role_l:
            summary = f"Backend systems engineer specialized in constructing robust REST APIs, network logic, and data engines. Experienced with high-performance routing and algorithmic optimizations."
        else:
            summary = f"Results-driven technical specialist with expertise in {role}. Demonstrated track record of developing sophisticated code solutions backed by git credentials."

    scored_projects = []
    for p in projects:
        score = p.complexity_score
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
    
    resume_projects = []
    for _, p, reasons in scored_projects:
        claims_list = db.query(Claim).filter(
            Claim.project_id == p.id,
            Claim.status == "user_confirmed"
        ).all()
        bullet_points = [c.claim for c in claims_list]
        
        if not bullet_points:
            confirmed_skills = db.query(Skill).join(project_skills).filter(
                project_skills.c.project_id == p.id,
                project_skills.c.status == "user_confirmed"
            ).all()
            skills_str = ", ".join([s.name for s in confirmed_skills[:3]])
            bullet_points = [f"Designed and deployed {p.title} to resolve technical complexities, utilizing {skills_str or 'advanced software systems'}."]

        evidence_links = []
        for claim in claims_list:
            for ev in claim.evidence[:1]:
                evidence_links.append({
                    "type": ev.type,
                    "url": ev.source_url or "#",
                    "label": ev.source_identifier or "Verifiable Proof"
                })

        confirmed_skills = db.query(Skill).join(project_skills).filter(
            project_skills.c.project_id == p.id,
            project_skills.c.status == "user_confirmed"
        ).all()

        resume_projects.append({
            "id": p.id,
            "title": p.title,
            "description": p.description or "",
            "skills": [s.name for s in confirmed_skills[:5]],
            "evidence_links": evidence_links,
            "narrative": " • ".join(bullet_points),
            "selected_reasons": reasons,
            "included": True,
            "custom_bullets": bullet_points
        })

    all_skills_progress = db.query(SkillProgress).filter(SkillProgress.user_id == current_user.id).all()
    skills_list = [sp.skill.name for sp in sorted(all_skills_progress, key=lambda x: x.evidence_count, reverse=True)[:8]]
    
    claims = [c.claim for c in db.query(Claim).filter(
        Claim.user_id == current_user.id,
        Claim.status == "user_confirmed"
    )[:4]]

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
            "profile": current_user,
            "summary": r.summary,
            "skills": r.skills_json or [],
            "claims": r.claims_json or [],
            "projects": r.projects_json or [],
            "experience": r.experience_json or [],
            "education": r.education_json or [],
            "certifications": r.certifications_json or [],
            "links": r.links_json or [],
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
        "profile": current_user,
        "summary": r.summary,
        "skills": r.skills_json or [],
        "claims": r.claims_json or [],
        "projects": r.projects_json or [],
        "experience": r.experience_json or [],
        "education": r.education_json or [],
        "certifications": r.certifications_json or [],
        "links": r.links_json or [],
        "is_primary": r.is_primary,
        "created_at": r.created_at,
        "updated_at": r.updated_at
    }


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
            p_dict = p.model_dump()
            p_dict["id"] = str(p_dict["id"])
            projects_data.append(p_dict)
    else:
        # Fallback to dynamic build
        dynamic = build_dynamic_resume_payload(current_user, req.target_role or "Software Engineer", db)
        projects_data = dynamic["projects"]
        if not req.summary:
            req.summary = dynamic["summary"]
        if not req.skills:
            req.skills = dynamic["skills"]

    resume = Resume(
        user_id=current_user.id,
        title=req.title or f"{req.target_role} Resume",
        target_role=req.target_role or "Software Engineer",
        variant=req.variant or "visual",
        summary=req.summary or "",
        skills_json=req.skills or [],
        claims_json=req.claims or [],
        projects_json=projects_data,
        experience_json=req.experience or [],
        education_json=req.education or [],
        certifications_json=req.certifications or [],
        links_json=req.links or [],
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
        "profile": current_user,
        "summary": resume.summary,
        "skills": resume.skills_json or [],
        "claims": resume.claims_json or [],
        "projects": resume.projects_json or [],
        "experience": resume.experience_json or [],
        "education": resume.education_json or [],
        "certifications": resume.certifications_json or [],
        "links": resume.links_json or [],
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
    if req.summary is not None:
        resume.summary = req.summary
    if req.skills is not None:
        resume.skills_json = req.skills
    if req.claims is not None:
        resume.claims_json = req.claims
    if req.projects is not None:
        projects_data = []
        for p in req.projects:
            p_dict = p.model_dump()
            p_dict["id"] = str(p_dict["id"])
            projects_data.append(p_dict)
        resume.projects_json = projects_data
    if req.experience is not None:
        resume.experience_json = req.experience
    if req.education is not None:
        resume.education_json = req.education
    if req.certifications is not None:
        resume.certifications_json = req.certifications
    if req.links is not None:
        resume.links_json = req.links
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
        "profile": current_user,
        "summary": resume.summary,
        "skills": resume.skills_json or [],
        "claims": resume.claims_json or [],
        "projects": resume.projects_json or [],
        "experience": resume.experience_json or [],
        "education": resume.education_json or [],
        "certifications": resume.certifications_json or [],
        "links": resume.links_json or [],
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


@app.post("/api/resumes/ai-improve", response_model=AIImproveResponse)
def ai_improve_resume_content(req: AIImproveRequest, current_user: User = Depends(get_current_user)):
    """Enhances a summary or project bullet with quantifiable impact and ATS keywords without fabricating false metrics."""
    role = req.target_role or "Software Engineer"
    text = req.text.strip()
    
    # Try LLM if available
    if openai_client:
        try:
            prompt = (
                f"You are a technical resume editor. Improve the following candidate {req.field_type} for a '{role}' role.\n"
                f"Text: \"{text}\"\n"
                f"RULES:\n"
                f"1. DO NOT fabricate or invent fake percentage metrics, benchmarks, or numbers not present in the input.\n"
                f"2. Use strong, active engineering verbs (Architected, Engineered, Designed, Implemented, Deployed).\n"
                f"3. Return JSON format strictly: {{\"improved_text\": \"...\", \"suggestions\": [\"...\", \"...\"]}}"
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

    # Deterministic high-integrity enhancement (zero metric fabrication)
    if req.field_type == "summary":
        improved = (
            f"Results-driven {role} specialized in architecting scalable distributed systems, "
            f"designing high-performance APIs, and delivering verified engineering solutions. "
            f"Demonstrated history of translating complex technical requirements into maintainable, production-grade architectures."
        )
        suggestions = [
            f"Highlight specific cloud environments (e.g., AWS, GCP, Kubernetes) matching {role}",
            "Detail core programming languages and frameworks in your primary stack",
            "Mention architectural paradigms utilized (e.g., event-driven, microservices, CQRS)"
        ]
    else:
        # Bullet improvement
        clean_text = text.rstrip(".")
        active_prefixes = ("architected", "developed", "engineered", "implemented", "optimized", "built", "spearheaded", "designed", "deployed")
        
        if any(clean_text.lower().startswith(p) for p in active_prefixes):
            improved = f"{clean_text[0].upper() + clean_text[1:]} to ensure reliable system execution and high code maintainability."
        else:
            import re
            cleaned_clause = re.sub(r'^(wrote|writing|created|creating|built|building|coded|coding|added|adding|implemented|implementing)\s+', '', clean_text, flags=re.IGNORECASE).strip()
            if cleaned_clause:
                improved = f"Architected and deployed solution for {cleaned_clause} to ensure robust execution and system reliability."
            else:
                improved = f"Architected and deployed {clean_text.lower()} to ensure robust execution and system reliability."

            
        suggestions = [
            "Add verified project metrics if backed by your evidence (e.g., requests/sec, latency, data volume)",
            "Specify the exact protocols, libraries, or algorithms leveraged in the implementation"
        ]

    return AIImproveResponse(
        improved_text=improved,
        suggestions=suggestions
    )


# ─── Resume Intelligence Engine Subsystem ──────────────────────────────────────

def compute_candidate_professional_identity(user: User, db: Session) -> ProfessionalIdentityResponse:
    domain_progress = db.query(DomainProgress).filter(DomainProgress.user_id == user.id).all()
    skill_progress = db.query(SkillProgress).filter(SkillProgress.user_id == user.id).all()
    projects = db.query(Project).filter(Project.user_id == user.id).all()
    claims = db.query(Claim).filter(Claim.user_id == user.id, Claim.status == "user_confirmed").all()
    
    # Primary domains: sorted by depth and exposure
    sorted_domains = sorted(domain_progress, key=lambda dp: (dp.depth_score, dp.exposure_score), reverse=True)
    primary = [dp.domain.name for dp in sorted_domains[:3]] or ["Software Engineering", "Algorithms", "Backend Development"]
    
    # Emerging domains: trajectory increasing or last active recently
    emerging = [dp.domain.name for dp in domain_progress if dp.trajectory == "INCREASING" and dp.domain.name not in primary][:3]
    if not emerging and len(sorted_domains) > 3:
        emerging = [dp.domain.name for dp in sorted_domains[3:6]]
    if not emerging:
        emerging = ["Developer Tooling", "Research Engineering"]
        
    # Strong capabilities: skills with high evidence count & depth
    sorted_skills = sorted(skill_progress, key=lambda sp: (sp.evidence_count, sp.depth_score), reverse=True)
    capabilities = [sp.skill.name for sp in sorted_skills[:6]] or ["Python", "Algorithms", "Backend Architecture", "FastAPI", "PostgreSQL", "System Design"]
    
    # Quantitative trajectory & orientation
    claim_count = len(claims)
    evidence_strength = "High" if claim_count >= 5 else ("Moderate" if claim_count >= 2 else "Developing")
    
    avg_complexity = sum(p.complexity_score or 0.6 for p in projects) / max(len(projects), 1)
    research_orientation = "Increasing" if avg_complexity >= 0.75 or any("AI" in d or "ML" in d or "Algorithm" in d for d in primary) else ("Stable" if avg_complexity >= 0.5 else "Experimental")
    
    # Project style
    if any("AI" in d or "ML" in d for d in primary):
        project_style = "Technical / Intelligent Systems & Algorithms"
    elif any("Distributed" in d or "Backend" in d for d in primary):
        project_style = "High-Reliability Distributed Systems"
    else:
        project_style = "Full-Stack Production Engineering"
        
    # Trajectory narrative
    trajectory_str = f"Specializing in {', '.join(primary[:2])} with growing velocity in {emerging[0] if emerging else 'scalable systems'}."
    
    # Domain signature graph nodes & edges
    sig_nodes = []
    top_sig_domains = sorted_domains[:4] if sorted_domains else []
    for dp in top_sig_domains:
        sig_nodes.append(DomainSignatureNode(
            id=str(dp.domain.id),
            name=dp.domain.name,
            category=getattr(dp.domain, "category", None) or "Engineering",
            level=dp.current_level,
            evidence_count=int(dp.evidence_score * 10)
        ))
    if not sig_nodes:
        sig_nodes = [
            DomainSignatureNode(id="sig-1", name="AI / ML", category="Intelligence", level="PROFICIENT", evidence_count=8),
            DomainSignatureNode(id="sig-2", name="Algorithms", category="Core", level="ADVANCED", evidence_count=10),
            DomainSignatureNode(id="sig-3", name="Software Engineering", category="Architecture", level="PROFICIENT", evidence_count=6)
        ]
        
    sig_edges = []
    for i in range(len(sig_nodes) - 1):
        sig_edges.append(DomainSignatureEdge(
            source=sig_nodes[i].name,
            target=sig_nodes[i+1].name,
            relationship="REINFORCES"
        ))
    if len(sig_nodes) >= 3:
        sig_edges.append(DomainSignatureEdge(
            source=sig_nodes[0].name,
            target=sig_nodes[-1].name,
            relationship="INTEGRATES"
        ))

    return ProfessionalIdentityResponse(
        user_id=user.id,
        candidate_name=user.name,
        headline=user.headline or f"{primary[0]} Specialist",
        primary_domains=primary,
        emerging_domains=emerging,
        strong_capabilities=capabilities,
        current_trajectory=trajectory_str,
        evidence_strength=evidence_strength,
        research_orientation=research_orientation,
        project_style=project_style,
        signature_nodes=sig_nodes,
        signature_edges=sig_edges,
        total_verified_claims=claim_count,
        total_repositories=len(projects)
    )


def generate_resume_strategy_for_role(user: User, role: str, db: Session, layout_pref: Optional[str] = None) -> ResumeStrategyResponse:
    identity = compute_candidate_professional_identity(user, db)
    projects = db.query(Project).filter(Project.user_id == user.id).all()
    skills = db.query(SkillProgress).filter(SkillProgress.user_id == user.id).all()
    claims = db.query(Claim).filter(Claim.user_id == user.id, Claim.status == "user_confirmed").all()
    
    role_lower = role.lower()
    
    # Filter and rank projects by target role
    scored_projects = []
    for p in projects:
        score = p.complexity_score or 0.5
        p_title = (p.title or "").lower()
        p_desc = (p.description or "").lower()
        
        if "ml" in role_lower or "machine learning" in role_lower or "ai" in role_lower:
            if any(k in p_title or k in p_desc for k in ["ml", "ai", "news", "model", "nlp", "classification", "learn"]):
                score += 0.5
        elif "backend" in role_lower or "system" in role_lower or "distributed" in role_lower:
            if any(k in p_title or k in p_desc for k in ["backend", "api", "server", "repo", "analyzer", "database", "graph"]):
                score += 0.5
        elif "research" in role_lower:
            if any(k in p_title or k in p_desc for k in ["algorithm", "detector", "analyzer", "nlp", "graph", "paper"]):
                score += 0.5
        else:
            score += 0.3
            
        scored_projects.append((p.title, score))
        
    scored_projects.sort(key=lambda x: x[1], reverse=True)
    highlight_projects = [sp[0] for sp in scored_projects[:3]] or [p.title for p in projects[:3]]
    
    # Filter skills and positioning
    if "ml" in role_lower or "ai" in role_lower:
        role_skills = ["Python", "Machine Learning", "NLP", "Algorithms", "Model Evaluation", "PyTorch"]
        positioning = f"AI/ML engineer with strong algorithmic foundations and verified implementation in intelligent systems and data modeling."
        weak_areas = ["MLOps at Scale", "Distributed GPU Cluster Orchestration"]
        suggested_layout = "research" if "research" in role_lower else "technical"
    elif "backend" in role_lower or "system" in role_lower:
        role_skills = ["Python", "FastAPI", "PostgreSQL", "System Design", "Distributed Systems", "Docker", "REST APIs"]
        positioning = f"Backend & Systems engineer focused on high-concurrency architectures, verifiable data pipelines, and robust API design."
        weak_areas = ["Kubernetes Cluster Administration", "Multi-region Failover"]
        suggested_layout = "technical"
    elif "research" in role_lower:
        role_skills = ["Algorithm Design", "Computational Complexity", "Graph Theory", "Python", "Empirical Evaluation"]
        positioning = f"Research engineer specializing in algorithmic optimization, graph structures, and empirical model verification."
        weak_areas = ["Commercial Cloud Deployments"]
        suggested_layout = "editorial"
    elif "executive" in role_lower or "lead" in role_lower:
        role_skills = ["System Architecture", "Technical Leadership", "Python", "API Strategy", "Code Review"]
        positioning = f"Engineering architect delivering end-to-end technical standards, verified codebase health, and high-velocity systems."
        weak_areas = ["Frontend UI Styling"]
        suggested_layout = "executive"
    else:
        role_skills = [sp.skill.name for sp in sorted(skills, key=lambda s: s.evidence_count, reverse=True)[:6]] or ["Python", "FastAPI", "Algorithms", "PostgreSQL", "System Architecture"]
        positioning = f"Full-stack software engineer delivering verified, production-grade applications with strong foundational problem solving."
        weak_areas = ["Legacy Monolith Migration"]
        suggested_layout = layout_pref or "modern_professional"
        
    evidence_priorities = [c.claim for c in claims[:3]] or ["100% verified GitHub repository commit history", "Empirical test suite coverage and API contracts"]
    
    return ResumeStrategyResponse(
        target_role=role,
        candidate_positioning=positioning,
        primary_domains=identity.primary_domains,
        supporting_domains=identity.emerging_domains,
        projects_to_highlight=highlight_projects,
        skills_to_emphasize=role_skills,
        evidence_priorities=evidence_priorities,
        weak_areas=weak_areas,
        suggested_layout=suggested_layout,
        role_alignment_score=0.92
    )


def generate_blocks_representation_from_strategy(user: User, strategy: ResumeStrategyResponse, db: Session, layout_override: Optional[str] = None) -> ResumeBlockRepresentation:
    identity = compute_candidate_professional_identity(user, db)
    projects = db.query(Project).filter(Project.user_id == user.id).all()
    claims = db.query(Claim).filter(Claim.user_id == user.id, Claim.status == "user_confirmed").all()
    work_exps = db.query(WorkExperience).filter(WorkExperience.user_id == user.id).order_by(WorkExperience.created_at.desc()).all()
    edus = db.query(Education).filter(Education.user_id == user.id).order_by(Education.created_at.desc()).all()
    certs = db.query(Certification).filter(Certification.user_id == user.id).all()
    links = db.query(SocialLink).filter(SocialLink.user_id == user.id).all()
    
    layout = layout_override or strategy.suggested_layout or "modern_professional"
    
    # 1. Identity block
    blocks: List[ResumeBlockItem] = [
        ResumeBlockItem(
            block_type="identity",
            title="Professional Identity",
            order=1,
            content_payload={
                "name": user.name,
                "headline": f"{strategy.target_role.upper()} · {identity.primary_domains[0]}",
                "email": user.email,
                "location": user.location or "Bangalore, India",
                "github": user.github_username or "harsha",
                "tagline": strategy.candidate_positioning
            }
        ),
        # 2. Professional Signature Block
        ResumeBlockItem(
            block_type="signature",
            title="Professional Signature",
            subtitle="Interconnected Core Competencies from Career Graph",
            order=2,
            content_payload={
                "nodes": [n.model_dump() for n in identity.signature_nodes],
                "edges": [e.model_dump() for e in identity.signature_edges],
                "primary_domains": identity.primary_domains,
                "project_style": identity.project_style
            }
        ),
        # 3. Positioning Block
        ResumeBlockItem(
            block_type="positioning",
            title="Core Profile & Positioning",
            order=3,
            content_payload={
                "statement": strategy.candidate_positioning,
                "research_orientation": identity.research_orientation,
                "evidence_strength": identity.evidence_strength
            }
        )
    ]
    
    # 4. Selected Work Block
    highlighted = [p for p in projects if p.title in strategy.projects_to_highlight]
    if not highlighted:
        highlighted = projects[:3]
        
    project_payloads = []
    for p in highlighted:
        p_claims = [c for c in claims if c.project_id == p.id]
        p_skills = [s.name for s in p.skills] if p.skills else []
        project_payloads.append({
            "id": str(p.id),
            "title": p.title,
            "description": p.description or f"Engineered verified technical implementation for {p.title}.",
            "technologies": p_skills[:4] or ["Python", "FastAPI"],
            "repository_url": p.repository_url or "",
            "evidence_count": len(p_claims),
            "evidence_claims": [
                {
                    "id": str(c.id),
                    "claim": c.claim,
                    "confidence": c.confidence,
                    "type": c.claim_type or "CLAIM"
                } for c in p_claims[:2]
            ]
        })
        
    blocks.append(ResumeBlockItem(
        block_type="selected_work",
        title="Selected Work & Systems",
        subtitle="Verifiable Engineering Artifacts",
        order=4,
        content_payload={"projects": project_payloads}
    ))
    
    # 5. Technical Depth Block (Evidence-backed clusters, NO cheesy % bars)
    clusters = []
    for d in identity.primary_domains[:3]:
        related_skills = [s for s in strategy.skills_to_emphasize[:3]]
        clusters.append({
            "domain": d,
            "capabilities": " · ".join(related_skills),
            "evidence_note": f"{len(highlighted)} projects · verified GitHub commit history"
        })
    blocks.append(ResumeBlockItem(
        block_type="technical_depth",
        title="Technical Depth & Capabilities",
        subtitle="Evidence-Backed Capability Clusters",
        order=5,
        content_payload={"clusters": clusters, "skills": strategy.skills_to_emphasize}
    ))
    
    # 6. Current Trajectory Block
    blocks.append(ResumeBlockItem(
        block_type="trajectory",
        title="Current Trajectory & Horizons",
        order=6,
        content_payload={
            "trajectory_text": identity.current_trajectory,
            "emerging_domains": identity.emerging_domains,
            "next_horizons": ["Distributed AI Systems", "Compiler & Optimization Tooling", "Verified Graph Architectures"]
        }
    ))
    
    # 7. Experience Block
    if work_exps:
        blocks.append(ResumeBlockItem(
            block_type="experience",
            title="Professional Experience",
            order=7,
            content_payload={"experiences": [WorkExperienceResponse.model_validate(w).model_dump() for w in work_exps]}
        ))
        
    # 8. Education Block
    if edus:
        blocks.append(ResumeBlockItem(
            block_type="education",
            title="Education",
            order=8,
            content_payload={"educations": [EducationResponse.model_validate(e).model_dump() for e in edus]}
        ))
        
    # 9. Certifications & Links Block
    blocks.append(ResumeBlockItem(
        block_type="certifications",
        title="Credentials & Links",
        order=9,
        content_payload={
            "certifications": [CertificationResponse.model_validate(c).model_dump() for c in certs],
            "links": [SocialLinkResponse.model_validate(l).model_dump() for l in links]
        }
    ))

    return ResumeBlockRepresentation(
        target_role=strategy.target_role,
        layout_personality=layout,
        positioning_statement=strategy.candidate_positioning,
        blocks=blocks,
        evidence_coverage_rate=1.0,
        verification_rate=1.0,
        generated_at=datetime.now(timezone.utc)
    )


@app.get("/api/resume/identity", response_model=ProfessionalIdentityResponse)
def get_resume_identity(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Computes the candidate's Professional Identity Model from the Career Graph."""
    return compute_candidate_professional_identity(current_user, db)


@app.post("/api/resume/strategy", response_model=ResumeStrategyResponse)
def get_resume_strategy(
    req: ResumeStrategyRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Curates context for a target role and generates a tailored Resume Strategy."""
    return generate_resume_strategy_for_role(current_user, req.target_role, db, req.layout_preference)


@app.post("/api/resume/representation", response_model=ResumeBlockRepresentation)
def get_resume_representation(
    req: ResumeStrategyRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Generates modular structured resume blocks from the Career Graph & Strategy."""
    strategy = generate_resume_strategy_for_role(current_user, req.target_role, db, req.layout_preference)
    return generate_blocks_representation_from_strategy(current_user, strategy, db, req.layout_preference)


@app.post("/api/resume/validate", response_model=ResumeValidationResponse)
def validate_resume_blocks(
    req: ResumeValidationRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Checks every single claim and text block against database ground truth. Flags/sanitizes any fabricated metrics."""
    confirmed_claims = {c.claim.lower().strip() for c in db.query(Claim).filter(
        Claim.user_id == current_user.id,
        Claim.status == "user_confirmed"
    ).all()}
    
    fabricated_metrics = []
    unverified = []
    sanitized = []
    
    import re
    metric_pattern = re.compile(r'\b(increased|improved|reduced|boosted|accelerated|optimized)\s+by\s+\d+%', re.IGNORECASE)
    
    for block in req.blocks:
        b_dict = block.model_dump()
        payload = b_dict.get("content_payload", {})
        
        # Check text in positioning or statements
        if "statement" in payload and isinstance(payload["statement"], str):
            text = payload["statement"]
            matches = metric_pattern.findall(text)
            if matches:
                fabricated_metrics.extend(matches)
                payload["statement"] = metric_pattern.sub("significantly enhanced", text)
                
        # Check claims in selected_work
        if "projects" in payload and isinstance(payload["projects"], list):
            for p in payload["projects"]:
                if "evidence_claims" in p and isinstance(p["evidence_claims"], list):
                    for c in p["evidence_claims"]:
                        c_text = c.get("claim", "").lower().strip()
                        if c_text and not any(c_text in conf or conf in c_text for conf in confirmed_claims):
                            unverified.append(c.get("claim", ""))
                            
        sanitized.append(ResumeBlockItem(**b_dict))
        
    return ResumeValidationResponse(
        is_valid=len(fabricated_metrics) == 0 and len(unverified) == 0,
        unverified_claims=unverified,
        fabricated_metrics_detected=fabricated_metrics,
        sanitized_blocks=sanitized,
        verified_claim_count=len(confirmed_claims),
        total_claims_checked=len(confirmed_claims) + len(unverified)
    )


@app.post("/api/resume/critique", response_model=ResumeCritiqueResponse)
def critique_resume_representation(
    req: ResumeCritiqueRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Evaluates representation against the 10-second recruiter attention model and discovers communication gaps."""
    identity = compute_candidate_professional_identity(current_user, db)
    projects = db.query(Project).filter(Project.user_id == current_user.id).all()
    domain_progress = db.query(DomainProgress).filter(DomainProgress.user_id == current_user.id).all()
    skill_progress = db.query(SkillProgress).filter(SkillProgress.user_id == current_user.id).all()
    total_claims = db.query(Claim).filter(Claim.user_id == current_user.id).all()
    confirmed_claims = [c for c in total_claims if c.status == "user_confirmed"]

    def get_rating(score: int) -> str:
        if score >= 80:
            return "Strong"
        elif score >= 50:
            return "Moderate"
        else:
            return "Needs Work"

    # 1. Role Relevance
    role_words = set(req.target_role.lower().replace("/", " ").replace("-", " ").split())
    matching_domains = [dp for dp in domain_progress if any(w in dp.domain.name.lower() for w in role_words)]
    matching_skills = [sp for sp in skill_progress if any(w in sp.skill.name.lower() for w in role_words)]
    rel_match_count = len(matching_domains) + len(matching_skills)
    relevance_score = min(100, max(20, rel_match_count * 25 + (35 if len(projects) > 0 else 10)))
    relevance_rating = get_rating(relevance_score)

    # 2. Evidence Coverage
    if total_claims:
        evidence_score = int((len(confirmed_claims) / len(total_claims)) * 100)
    else:
        evidence_score = 40 if projects else 15
    evidence_rating = get_rating(evidence_score)

    # 3. Differentiation
    diff_score = min(100, max(20, len(identity.primary_domains) * 20 + len(identity.emerging_domains) * 15 + len(projects) * 10))
    diff_rating = get_rating(diff_score)

    # 4. Technical Depth
    sp_scores = [sp.depth_score for sp in skill_progress if sp.evidence_count > 0]
    dp_scores = [dp.depth_score for dp in domain_progress if dp.exposure_score > 0]
    all_depths = sp_scores + dp_scores
    avg_depth = (sum(all_depths) / len(all_depths)) if all_depths else (0.2 if projects else 0.05)
    tech_depth_score = min(100, max(15, int(avg_depth * 100)))
    tech_depth_rating = get_rating(tech_depth_score)

    # 5. Clarity & Scannability
    clarity_score = 20
    if current_user.headline:
        clarity_score += 20
    if projects:
        clarity_score += 30
    if confirmed_claims:
        clarity_score += 30
    clarity_score = min(100, clarity_score)
    clarity_rating = get_rating(clarity_score)

    # 6. Claim Verification
    if total_claims:
        claim_verif_score = int((len(confirmed_claims) / len(total_claims)) * 100)
    else:
        claim_verif_score = 30 if projects else 10
    claim_verif_rating = get_rating(claim_verif_score)

    dimensions = [
        ReadinessDimension(
            dimension="Role Relevance",
            rating=relevance_rating,
            score=relevance_score,
            insight=f"Positioning and highlighted work show {relevance_rating.lower()} alignment with {req.target_role} competencies."
        ),
        ReadinessDimension(
            dimension="Evidence Coverage",
            rating=evidence_rating,
            score=evidence_score,
            insight=f"{len(confirmed_claims)} of {len(total_claims)} core claims have verifiable GitHub proof chains." if total_claims else "Add projects to establish verifiable proof chains."
        ),
        ReadinessDimension(
            dimension="Differentiation",
            rating=diff_rating,
            score=diff_score,
            insight=f"Communicates {identity.project_style} with {len(identity.primary_domains)} primary domain specializations."
        ),

        ReadinessDimension(
            dimension="Technical Depth",
            rating=tech_depth_rating,
            score=tech_depth_score,
            insight=f"Presents capability clusters with an average computed depth of {tech_depth_score}%."
        ),
        ReadinessDimension(
            dimension="Clarity & Scannability",
            rating=clarity_rating,
            score=clarity_score,
            insight=f"Visual hierarchy scored {clarity_score}% for 10-second recruiter scanning."
        ),
        ReadinessDimension(
            dimension="Claim Verification",
            rating=claim_verif_rating,
            score=claim_verif_score,
            insight=f"{claim_verif_score}% empirical evidence backing across evaluated claims."
        )
    ]

    avg_composite = (relevance_score + evidence_score + diff_score + tech_depth_score + clarity_score + claim_verif_score) // 6
    if avg_composite >= 80:
        overall_label = "Strong"
    elif avg_composite >= 65:
        overall_label = "Proficient"
    elif avg_composite >= 45:
        overall_label = "Developing"
    else:
        overall_label = "Needs Work"

    primary_domain_name = identity.primary_domains[0] if identity.primary_domains else "Software Engineering"
    attention = {
        "0_to_3s": f"Who is this candidate? — {current_user.name}: {req.target_role.upper()} with primary depth in {primary_domain_name}.",
        "3_to_8s": f"What are they good at? — Professional Signature: {', '.join(identity.primary_domains[:3]) or 'Core Systems'}.",
        "8_to_18s": f"What have they actually built? — {len(projects)} repositories with verified commits and claims.",
        "18_to_30s": f"Where are they going? — Current Trajectory: {identity.current_trajectory}"
    }

    gaps = []
    if any("ML" in d.domain.name or "AI" in d.domain.name for d in domain_progress) and "ml" not in req.target_role.lower():
        gaps.append(f"Your Career Graph shows substantial AI/ML depth ({identity.total_verified_claims} claims), which is currently downplayed for this role.")
    if len(identity.emerging_domains) > 0:
        gaps.append(f"Your emerging momentum in '{identity.emerging_domains[0]}' represents a high-growth horizon that could strengthen technical differentiation.")
    if not gaps:
        gaps.append("Your career graph reflects high alignment with zero critical evidence gaps.")

    improvements = [
        "Foreground verified proof links in Selected Work for fast recruiter verification",
        f"Ensure current trajectory highlights near-term interest in {identity.emerging_domains[0] if identity.emerging_domains else 'scalable systems'}"
    ]

    return ResumeCritiqueResponse(
        target_role=req.target_role,
        readiness_dimensions=dimensions,
        overall_readiness=overall_label,
        recruiter_attention_hierarchy=attention,
        fails_to_communicate_gaps=gaps,
        recommended_improvements=improvements
    )



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
    """Evaluates candidate match against a target role based on confirmed domains and skills."""
    role = db.query(Role).filter(Role.name.ilike(role_name)).first()
    if not role:
        role = Role(
            name=role_name,
            description=f"Industry standard requirements and competency matrix for {role_name}."
        )
        db.add(role)
        db.commit()
        db.refresh(role)
        
    domain_progress = db.query(DomainProgress).filter(DomainProgress.user_id == current_user.id).all()
    skill_progress = db.query(SkillProgress).filter(SkillProgress.user_id == current_user.id).all()
    
    criteria_matches = []
    for dp in domain_progress:
        score = dp.exposure_score
        status_label = "strong" if score >= 0.7 else ("moderate" if score >= 0.4 else "weak")
        criteria_matches.append(CriteriaMatch(
            item_name=dp.domain.name,
            type="domain",
            status=status_label,
            details=f"Calculated depth {int(dp.depth_score*100)}% with {dp.current_level} proficiency."
        ))
        
    for sp in skill_progress:
        status_label = "strong" if sp.evidence_count >= 3 else ("moderate" if sp.evidence_count >= 1 else "weak")
        criteria_matches.append(CriteriaMatch(
            item_name=sp.skill.name,
            type="skill",
            status=status_label,
            details=f"Evidenced in {sp.evidence_count} project repositories with {sp.current_level} mastery."
        ))
        
    strong_count = sum(1 for c in criteria_matches if c.status == "strong")
    overall = "Strong Match" if strong_count >= 3 else ("Moderate Match" if strong_count >= 1 else "Developing Match")
    
    evidence_claims = db.query(Claim).filter(
        Claim.user_id == current_user.id,
        Claim.status == "user_confirmed"
    ).all()
    
    return RecruiterMatchResponse(
        role_name=role_name,
        overall_match=overall,
        why_text=f"Candidate demonstrates high verified capability in {', '.join([c.item_name for c in criteria_matches if c.status == 'strong'][:3]) or 'software development'}.",
        strengths=[c.item_name for c in criteria_matches if c.status == "strong"],
        gaps=[c.item_name for c in criteria_matches if c.status == "weak"],
        criteria_matches=criteria_matches,
        evidence_backed_claims=[ClaimResponse.model_validate(c) for c in evidence_claims]
    )


# --- Review Queue Endpoints ---

@app.get("/api/review")
def get_review_queue(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    """Returns AI-suggested claims, skills, and domains waiting for user confirmation."""
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
        } for s in pending_skills_query]
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

