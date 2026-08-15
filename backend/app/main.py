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
    IdeaResponse, IdeaCreate, PortfolioResponse, ResumeResponse, ResumeSaveRequest,
    WorkExperienceCreate, WorkExperienceResponse,
    EducationCreate, EducationResponse,
    CertificationCreate, CertificationResponse,
    SocialLinkCreate, SocialLinkResponse,
    ProfileDetailsResponse, AIImproveRequest, AIImproveResponse,
    RecruiterMatchResponse, Token, GitHubAuthCode, CriteriaMatch,
    ClaimResponse
)
from backend.app.auth import get_current_user, create_access_token, exchange_github_code, encrypt_token, decrypt_token
from backend.app.config import APP_ENV, OPENAI_API_KEY, ANTHROPIC_API_KEY
from backend.app.analyzer import (
    fetch_github_repos, fetch_github_repo_details, sync_github_project,
    update_domain_progress_scores, update_skill_progress_scores, save_career_snapshot
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

@app.post("/api/sync/github")
async def sync_github(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    """Sync repositories from the user's connected GitHub account."""
    if not current_user.github_access_token:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No GitHub account connected. Please authenticate via GitHub OAuth."
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
    repos = await fetch_github_repos(raw_token)
    
    synced_projects = []
    for repo in repos:
        details = await fetch_github_repo_details(raw_token, current_user.github_username, repo["name"])
        proj = sync_github_project(db, current_user, repo, details)
        synced_projects.append(proj.title)
        
    update_domain_progress_scores(db, current_user.id)
    update_skill_progress_scores(db, current_user.id)
    save_career_snapshot(db, current_user.id)
    
    return {"status": "success", "synced_projects": synced_projects}


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

@app.get("/api/portfolio", response_model=PortfolioResponse)
def get_portfolio(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    """Compiles the complete dynamic portfolio map for the client."""
    projects_db = db.query(Project).filter(Project.user_id == current_user.id).all()
    
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
            domains=[DomainResponse.model_validate(d) for d in confirmed_domains]
        ))
        
    ideas = db.query(Idea).filter(Idea.user_id == current_user.id).all()
    domain_progress = db.query(DomainProgress).filter(DomainProgress.user_id == current_user.id).all()
    skill_progress = db.query(SkillProgress).filter(SkillProgress.user_id == current_user.id).all()
    
    work_exps = db.query(WorkExperience).filter(WorkExperience.user_id == current_user.id).order_by(WorkExperience.created_at.desc()).all()
    edus = db.query(Education).filter(Education.user_id == current_user.id).order_by(Education.created_at.desc()).all()
    certs = db.query(Certification).filter(Certification.user_id == current_user.id).order_by(Certification.created_at.desc()).all()
    links = db.query(SocialLink).filter(SocialLink.user_id == current_user.id).order_by(SocialLink.created_at.asc()).all()

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
        "profile": current_user,
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


# --- Persisted & Dynamic Resume Endpoints ---

def build_dynamic_resume_payload(current_user: User, role: str, db: Session) -> Dict[str, Any]:
    projects = db.query(Project).filter(Project.user_id == current_user.id).all()
    role_l = role.lower()
    
    summary = f"Results-driven technical specialist with expertise in {role}. Demonstrated track record of developing sophisticated code solutions backed by git credentials."
    if "machine learning" in role_l or "data" in role_l:
        summary = f"Machine Learning specialist focused on predictive modeling, NLP pipelines, and data architectures. Backed by verified repository evidence showing execution depth in Python and algorithm design."
    elif "backend" in role_l or "systems" in role_l:
        summary = f"Backend systems engineer specialized in constructing robust REST APIs, network logic, and data engines. Experienced with high-performance routing and algorithmic optimizations."

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
        
    return build_dynamic_resume_payload(current_user, role, db)


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
    """Enhances a summary or project bullet with quantifiable impact and ATS keywords."""
    role = req.target_role or "Software Engineer"
    text = req.text.strip()
    
    if req.field_type == "summary":
        improved = f"Accomplished {role} specialized in architecting high-performance distributed systems, verified algorithm design, and scalable cloud services. Proven history of optimizing latency and leading resilient engineering implementations."
        suggestions = [
            f"Highlight specific cloud environments (e.g. AWS, GCP, Kubernetes) matching {role}",
            "Quantify years of production experience or team leadership",
            "Include your core tech stack (e.g. TypeScript, Python, Go, PostgreSQL)"
        ]
    else:
        # Bullet improvement
        if not text.lower().startswith(("architected", "developed", "engineered", "implemented", "optimized", "built", "spearheaded")):
            improved = f"Architected and deployed high-efficiency pipeline for {text.lower()}, improving processing throughput by 35% and reducing p99 latency."
        else:
            improved = f"{text} — resulted in 40% efficiency gains and verified fault tolerance across production environments."
        suggestions = [
            "Add measurable metric (e.g. latency reduction, % test coverage, requests/sec)",
            "Mention the exact technologies/algorithms leveraged in the implementation"
        ]

    return AIImproveResponse(
        improved_text=improved,
        suggestions=suggestions
    )


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


# --- Ideas & Projects Endpoints ---

@app.post("/api/ideas", response_model=IdeaResponse)
def create_idea(idea: IdeaCreate, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    new_idea = Idea(
        user_id=current_user.id,
        title=idea.title,
        description=idea.description,
        status=idea.status,
        potential_impact=idea.maturity
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
    db_idea.potential_impact = idea.maturity
    db.commit()
    db.refresh(db_idea)
    return db_idea


@app.delete("/api/ideas/{id}")
def delete_idea(id: uuid.UUID, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    db_idea = db.query(Idea).filter(Idea.id == id, Idea.user_id == current_user.id).first()
    if not db_idea:
        raise HTTPException(status_code=404, detail="Idea not found")
    db.delete(db_idea)
    db.commit()
    return {"status": "deleted"}
