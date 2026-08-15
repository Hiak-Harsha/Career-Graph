import os
from fastapi import FastAPI, Depends, HTTPException, Query, status
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from typing import List, Optional, Dict, Any
from datetime import datetime, timezone

from backend.app.database import get_db, init_db
from backend.app.models import (
    User, Project, Idea, Skill, Domain, Evidence, Claim, Activity,
    DomainProgress, SkillProgress, CareerSnapshot, Role, RoleRequirement,
    project_domains, project_skills
)
from backend.app.schemas import (
    UserResponse, UserUpdate, ProjectResponse, ProjectCreate,
    SkillResponse, DomainResponse,
    IdeaResponse, IdeaCreate, PortfolioResponse, ResumeResponse,
    RecruiterMatchResponse, Token, GitHubAuthCode, CriteriaMatch,
    ClaimResponse
)
from backend.app.auth import get_current_user, create_access_token, exchange_github_code, encrypt_token, decrypt_token
from backend.app.config import APP_ENV
from backend.app.analyzer import (
    fetch_github_repos, fetch_github_repo_details, sync_github_project,
    update_domain_progress_scores, update_skill_progress_scores, save_career_snapshot
)

app = FastAPI(title="Career Identity System API", version="0.1.0")

# Configure CORS with explicit origins
CORS_ORIGINS = os.getenv("CORS_ORIGINS", "http://localhost:3000,http://127.0.0.1:3000").split(",")
app.add_middleware(
    CORSMiddleware,
    allow_origins=CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("startup")
def on_startup():
    init_db()

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
            github_username=github_data["github_username"],
            bio=github_data["bio"],
            location=github_data["location"],
            headline="Software Engineer"
        )
        db.add(user)
        db.flush()
    
    # Update token
    user.github_access_token = encrypt_token(github_data["access_token"])
    user.github_username = github_data["github_username"]
    db.commit()
    db.refresh(user)
    
    access_token = create_access_token(data={"sub": str(user.id)})
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "user_id": user.id
    }

@app.post("/api/auth/mock", response_model=Token)
def mock_login(db: Session = Depends(get_db)):
    """Mock login endpoint for quick local development without GitHub OAuth."""
    if APP_ENV == "production":
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Not found")
    user = db.query(User).first()
    if not user:
        user = User(
            name="Madhav",
            email="madhav@example.com",
            headline="Full Stack Engineer & AI Explorer",
            bio="Building intelligent systems and career identity maps.",
            location="San Francisco, CA",
            github_username="madhav-demo"
        )
        db.add(user)
        db.commit()
        db.refresh(user)
        
    access_token = create_access_token(data={"sub": str(user.id)})
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "user_id": user.id
    }


# --- Profile Endpoints ---

@app.get("/api/profile", response_model=UserResponse)
def get_profile(current_user: User = Depends(get_current_user)):
    return current_user

@app.put("/api/profile", response_model=UserResponse)
def update_profile(payload: UserUpdate, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    update_data = payload.dict(exclude_unset=True)
    for key, val in update_data.items():
        if key == "github_access_token" and val:
            setattr(current_user, key, encrypt_token(val))
        else:
            setattr(current_user, key, val)
    db.commit()
    db.refresh(current_user)
    return current_user


# Simple in-memory rate-limiter: maps user_id -> list of sync timestamps
from collections import defaultdict
import time

sync_request_history = defaultdict(list)

def check_sync_rate_limit(user_id: str):
    now = time.time()
    # Keep only requests within the last 15 minutes (900 seconds)
    user_history = [t for t in sync_request_history[user_id] if now - t < 900]
    sync_request_history[user_id] = user_history
    
    if len(user_history) >= 5:
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="Rate limit exceeded. You can only sync up to 5 times per 15 minutes."
        )
    sync_request_history[user_id].append(now)


@app.post("/api/sync")
async def trigger_sync(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    """Triggers GitHub synchronization for the user's repositories."""
    check_sync_rate_limit(str(current_user.id))
    encrypted_token = current_user.github_access_token
    if not encrypted_token:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="GitHub account not authenticated. Please authenticate using OAuth."
        )
    
    token = decrypt_token(encrypted_token)
    try:
        repos = await fetch_github_repos(token)
        sync_count = 0
        # Sync top 3 repositories for performance in demo/test
        for repo in repos[:3]:
            details = await fetch_github_repo_details(token, repo["owner"]["login"], repo["name"])
            sync_github_project(db, current_user, repo, details)
            sync_count += 1
            
        return {"status": "success", "synced_repositories": sync_count}
    except HTTPException as he:
        raise he
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"GitHub sync error: {str(e)}"
        )

@app.post("/api/sync/demo")
def trigger_demo_sync(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    """Simulates a sync by injecting high-quality mock project data to showcase V1 features."""
    check_sync_rate_limit(str(current_user.id))
    mock_repos = [
        {
            "name": "smart-navigation-system",
            "html_url": "https://github.com/demo/smart-navigation-system",
            "description": "Interactive layout engine implementing Dijkstra and A* pathfinding algorithms with real-time grid renderings.",
            "created_at": "2025-01-10T12:00:00Z",
            "updated_at": "2025-06-21T18:30:00Z"
        },
        {
            "name": "ai-fake-news-detector",
            "html_url": "https://github.com/demo/ai-fake-news-detector",
            "description": "Natural Language Processing classifier analyzing social media claims using TF-IDF, Logistic Regression and Transformers.",
            "created_at": "2026-02-15T09:00:00Z",
            "updated_at": "2026-07-10T15:00:00Z"
        },
        {
            "name": "algorithmic-reasoning-platform",
            "html_url": "https://github.com/demo/algorithmic-reasoning-platform",
            "description": "An interactive education platform designed to teach data structures by visualizing execution states step-by-step.",
            "created_at": "2026-04-01T10:00:00Z",
            "updated_at": "2026-08-11T20:00:00Z"
        }
    ]
    
    mock_details = [
        {
            "readme": "# Smart Navigation System\nOptimized routing backend using Dijkstra's algorithm. Written in pure C with Pygame visualization.",
            "languages": {"C": 60000, "Python": 40000},
            "commits": [
                {"sha": "c1a2b3c", "message": "Optimize Dijkstra relaxation loop", "author": current_user.name, "date": "2025-05-12T10:00:00Z"},
                {"sha": "d4e5f6g", "message": "Setup pygame visualization frame", "author": current_user.name, "date": "2025-06-20T17:00:00Z"}
            ],
            "files": ["algorithms/dijkstra.c", "gui/grid.py", "main.py", "README.md"]
        },
        {
            "readme": "# AI Fake News Detector\nClassifies social media text using custom Scikit-learn pipelines and transformer embeddings.",
            "languages": {"Python": 120000},
            "commits": [
                {"sha": "e7f8g9h", "message": "Add TF-IDF vectorizer pipeline", "author": current_user.name, "date": "2026-05-10T11:00:00Z"},
                {"sha": "h8i9j0k", "message": "Fine-tune model hyper-parameters", "author": current_user.name, "date": "2026-07-09T14:30:00Z"}
            ],
            "files": ["model/train.py", "api/routes.py", "utils/helpers.py", "README.md"]
        },
        {
            "readme": "# Algorithmic Reasoning Platform\nLearn data structures visually. Built with React and TypeScript backend engine.",
            "languages": {"TypeScript": 85000, "CSS": 15000},
            "commits": [
                {"sha": "k0l1m2n", "message": "Write BST state execution tracer", "author": current_user.name, "date": "2026-07-15T09:15:00Z"},
                {"sha": "n3o4p5q", "message": "Fix React DOM rerendering issue", "author": current_user.name, "date": "2026-08-10T19:45:00Z"}
            ],
            "files": ["src/components/BSTVisualizer.tsx", "src/engine/state_tracer.ts", "package.json", "README.md"]
        }
    ]

    for repo, details in zip(mock_repos, mock_details):
        sync_github_project(db, current_user, repo, details, auto_confirm=True)
        
    return {"status": "success", "message": "Synced 3 high-quality demo projects to showcase career intelligence features."}


# --- Portfolio Endpoints ---

@app.get("/api/portfolio", response_model=PortfolioResponse)
def get_portfolio(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    """Compiles the complete dynamic portfolio map for the client."""
    # Retrieve project list
    projects_db = db.query(Project).filter(Project.user_id == current_user.id).all()
    
    # Process projects: only return user_confirmed skills and domains
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
        
    # Retrieve ideas list
    ideas = db.query(Idea).filter(Idea.user_id == current_user.id).all()
    
    # Retrieve progress lists
    domain_progress = db.query(DomainProgress).filter(DomainProgress.user_id == current_user.id).all()
    skill_progress = db.query(SkillProgress).filter(SkillProgress.user_id == current_user.id).all()
    
    # Extract problem solving patterns dynamically based on confirmed domains and skills
    patterns_set = set()
    for p in projects_db:
        confirmed_skills = db.query(Skill).join(project_skills).filter(
            project_skills.c.project_id == p.id,
            project_skills.c.status == "user_confirmed"
        ).all()
        confirmed_domains = db.query(Domain).join(project_domains).filter(
            project_domains.c.project_id == p.id,
            project_domains.c.status == "user_confirmed"
        ).all()
        
        domains_lower = {d.name.lower() for d in confirmed_domains}
        skills_lower = {s.name.lower() for s in confirmed_skills}
        
        if "machine learning" in domains_lower or "model evaluation" in skills_lower:
            patterns_set.update(["data experimentation", "predictive modeling", "natural language processing"])
        if "algorithms / dsa" in domains_lower or "algorithm design" in skills_lower or "c" in skills_lower:
            patterns_set.update(["graph modeling", "algorithmic optimization", "iterative prototyping"])
        if "web development" in domains_lower or "api development" in skills_lower or "typescript" in skills_lower:
            patterns_set.update(["visual state decomposition", "interactive systems", "developer tooling"])
            
    # Fallback default patterns
    if not patterns_set:
        patterns_set.update(["iterative prototyping", "functional abstraction", "problem decomposition"])
        
    problem_solving_profile = {
        "frequently_works_with": list(patterns_set)[:5],
        "recurring_patterns_detected": [
            "algorithmic approaches", "interactive visualization", "developer tooling" if any("platform" in p.title.lower() or "tool" in p.title.lower() for p in projects_db) else "automation"
        ]
    }
    
    # Construct a chronological timeline
    timeline = []
    # Mix completed projects and manual activities/commits
    for p in sorted(projects, key=lambda x: x.started_at or datetime.min, reverse=True):
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
        "timeline": timeline
    }


# --- Dynamic Resume Endpoint ---

@app.get("/api/resume", response_model=ResumeResponse)
def get_dynamic_resume(
    role: str = Query(..., description="Target role name, e.g. 'Software Engineer' or 'Machine Learning Engineer'"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Generates a dynamic resume tailored specifically to a target role by querying the Career Graph."""
    projects = db.query(Project).filter(Project.user_id == current_user.id).all()
    
    # 1. Match domains/skills of projects against requirements for the role
    role_entity = db.query(Role).filter(Role.name.ilike(role)).first()
    
    # Tailored summary text based on role
    role_l = role.lower()
    summary = f"Results-driven technical specialist with expertise in {role}. Demonstrated track record of developing sophisticated code solutions backed by git credentials."
    if "machine learning" in role_l or "data" in role_l:
        summary = f"Machine Learning specialist focused on predictive modeling, NLP pipelines, and data architectures. Backed by verified repository evidence showing execution depth in Python and algorithm design."
    elif "backend" in role_l or "systems" in role_l:
        summary = f"Backend systems engineer specialized in constructing robust REST APIs, network logic, and data engines. Experienced with high-performance routing and algorithmic optimizations."
    
    # 2. Sort projects based on relevance to the target role using only confirmed domains/skills
    scored_projects = []
    for p in projects:
        score = p.complexity_score
        
        # Get user_confirmed domains and skills
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
        
        if "machine learning" in role_l:
            if "machine learning" in p_domains_str or "nlp" in p_skills_str or "model" in p_domains_str:
                score += 5.0
        elif "backend" in role_l:
            if "backend" in p_domains_str or "api" in p_skills_str:
                score += 5.0
        elif "software" in role_l:
            if "software engineering" in p_domains_str or "algorithms" in p_domains_str:
                score += 3.0
                
        scored_projects.append((score, p))
        
    scored_projects.sort(key=lambda x: x[0], reverse=True)
    
    # 3. Formulate tailored narratives for top projects dynamically using confirmed claims
    resume_projects = []
    for _, p in scored_projects:
        # Fetch user_confirmed claims as project bullet points
        claims_list = db.query(Claim).filter(
            Claim.project_id == p.id,
            Claim.status == "user_confirmed"
        ).all()
        bullet_points = [c.claim for c in claims_list]
        
        # Fallback narrative if no claims are present/confirmed yet
        if not bullet_points:
            confirmed_skills = db.query(Skill).join(project_skills).filter(
                project_skills.c.project_id == p.id,
                project_skills.c.status == "user_confirmed"
            ).all()
            skills_str = ", ".join([s.name for s in confirmed_skills[:3]])
            bullet_points = [f"Designed and deployed {p.title} to resolve technical complexities, utilizing {skills_str or 'advanced software systems'}."]

        evidence_links = []
        for claim in claims_list:
            for ev in claim.evidence[:1]: # pick first evidence link
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
            "description": p.description,
            "skills": [s.name for s in confirmed_skills[:5]],
            "evidence_links": evidence_links,
            "narrative": " • ".join(bullet_points)
        })

    # Gather skills matching the role
    all_skills_progress = db.query(SkillProgress).filter(SkillProgress.user_id == current_user.id).all()
    skills_list = [sp.skill.name for sp in sorted(all_skills_progress, key=lambda x: x.evidence_count, reverse=True)[:8]]
    
    # Gather user_confirmed claims
    claims = [c.claim for c in db.query(Claim).filter(
        Claim.user_id == current_user.id,
        Claim.status == "user_confirmed"
    )[:4]]
    
    return {
        "target_role": role,
        "profile": current_user,
        "summary": summary,
        "projects": resume_projects,
        "skills": skills_list,
        "claims": claims
    }


# --- Recruiter Match Endpoint ---

@app.get("/api/recruiter/match", response_model=RecruiterMatchResponse)
def get_recruiter_match(
    role_name: str = Query(..., description="Name of the target role to match against"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Benchmarks user capabilities against role requirements and provides verifiable evidence links."""
    # Find matching role
    role = db.query(Role).filter(Role.name.ilike(role_name)).first()
    if not role:
        raise HTTPException(
            status_code=404,
            detail=f"Role '{role_name}' not found. Supported roles: Software Engineer, Machine Learning Engineer, Data Scientist, Research Engineer, Backend Engineer"
        )
        
    user_skills_progress = db.query(SkillProgress).filter(SkillProgress.user_id == current_user.id).all()
    user_domains_progress = db.query(DomainProgress).filter(DomainProgress.user_id == current_user.id).all()
    
    # Compile match matrix
    criteria_matches = []
    strengths = []
    gaps = []
    
    # Define rules-based criteria mapping if role requirements aren't fully seeded
    required_keywords = []
    if "machine learning" in role_name.lower():
        required_keywords = [
            ("Machine Learning", "domain", "HIGH"),
            ("Python", "skill", "HIGH"),
            ("Model Evaluation", "skill", "MEDIUM"),
            ("NLP", "skill", "MEDIUM")
        ]
    elif "backend" in role_name.lower():
        required_keywords = [
            ("Backend Development", "domain", "HIGH"),
            ("API Development", "skill", "HIGH"),
            ("Python", "skill", "MEDIUM"),
            ("C", "skill", "MEDIUM")
        ]
    else: # Software Engineer
        required_keywords = [
            ("Software Engineering", "domain", "HIGH"),
            ("Algorithms / DSA", "domain", "HIGH"),
            ("TypeScript", "skill", "MEDIUM"),
            ("Python", "skill", "MEDIUM")
        ]

    for name, item_type, importance in required_keywords:
        match_status = "missing"
        details = f"No evidence detected for {name}."
        
        if item_type == "domain":
            prog = next((dp for dp in user_domains_progress if dp.domain.name.lower() == name.lower()), None)
            if prog:
                if prog.current_level in ["STRONG", "ADVANCED"]:
                    match_status = "strong"
                    details = f"Strong evidence across {prog.exposure_score * 5:.0f} projects. Level: {prog.current_level}."
                    strengths.append(name)
                elif prog.current_level in ["PROFICIENT", "DEVELOPING"]:
                    match_status = "moderate"
                    details = f"Moderate practice detected. Level: {prog.current_level}."
                else:
                    match_status = "weak"
                    details = f"Limited exposure. Level: {prog.current_level}."
                    gaps.append(name)
            else:
                gaps.append(name)
        else: # skill
            prog = next((sp for sp in user_skills_progress if sp.skill.name.lower() == name.lower()), None)
            if prog:
                if prog.current_level in ["STRONG", "ADVANCED"]:
                    match_status = "strong"
                    details = f"Utilized in {prog.evidence_count} project(s) with high frequency."
                    strengths.append(name)
                elif prog.current_level in ["PROFICIENT", "PRACTICING"]:
                    match_status = "moderate"
                    details = f"Practiced in {prog.evidence_count} project(s)."
                else:
                    match_status = "weak"
                    details = "Limited usage."
                    gaps.append(name)
            else:
                gaps.append(name)
                
        criteria_matches.append(CriteriaMatch(
            item_name=name,
            type=item_type,
            status=match_status,
            details=details
        ))

    # Overall match score narrative
    strong_count = sum(1 for c in criteria_matches if c.status == "strong")
    overall_match = "Developing Match"
    why_text = f"Candidate is developing skills for this role, with gaps in {', '.join(gaps[:2])}."
    
    if strong_count >= 3:
        overall_match = "Strong Match"
        why_text = f"Candidate shows strong verifiable alignment, particularly in {', '.join(strengths[:2])}."
    elif strong_count >= 1:
        overall_match = "Moderate Match"
        why_text = f"Candidate shows moderate practice, with strengths in {', '.join(strengths[:1])} but emerging skill requirements in {', '.join(gaps[:1])}."

    # Fetch claims with evidence
    claims = db.query(Claim).filter(
        Claim.user_id == current_user.id,
        Claim.status == "user_confirmed"
    ).all()
    
    return {
        "role_name": role_name,
        "overall_match": overall_match,
        "why_text": why_text,
        "strengths": strengths,
        "gaps": gaps,
        "criteria_matches": criteria_matches,
        "evidence_backed_claims": claims
    }


# --- Ideas Endpoints ---

@app.post("/api/ideas", response_model=IdeaResponse)
def create_idea(payload: IdeaCreate, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    idea = Idea(
        user_id=current_user.id,
        title=payload.title,
        description=payload.description,
        status=payload.status,
        maturity=payload.maturity,
        parent_project_id=payload.parent_project_id
    )
    db.add(idea)
    db.commit()
    db.refresh(idea)
    
    # Log activity
    activity = Activity(
        user_id=current_user.id,
        type="IDEA_CREATED",
        source="user_input",
        timestamp=datetime.utcnow(),
        activity_metadata={"title": idea.title}
    )
    db.add(activity)
    db.commit()
    
    return idea

@app.put("/api/ideas/{idea_id}", response_model=IdeaResponse)
def update_idea(idea_id: str, payload: IdeaCreate, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    idea = db.query(Idea).filter(Idea.id == idea_id, Idea.user_id == current_user.id).first()
    if not idea:
        raise HTTPException(status_code=404, detail="Idea not found")
        
    for key, val in payload.dict().items():
        setattr(idea, key, val)
        
    # If idea is matured to active project, update and link
    if payload.status == "MATURING" and payload.parent_project_id is None:
        # Create a blank project placeholder
        project = Project(
            user_id=current_user.id,
            title=idea.title,
            description=idea.description,
            status="ACTIVE",
            project_type="PERSONAL",
            started_at=datetime.utcnow()
        )
        db.add(project)
        db.flush()
        idea.parent_project_id = project.id
        idea.status = "MATURED"
        
    db.commit()
    db.refresh(idea)
    return idea


# --- Review & Governance Endpoints ---

@app.get("/api/review")
def get_review_queue(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Fetches all items currently in 'ai_suggested' status for the user's review."""
    # 1. Suggested claims
    claims = db.query(Claim).filter(
        Claim.user_id == current_user.id,
        Claim.status == "ai_suggested"
    ).all()
    
    # 2. Suggested domains
    domains_query = db.execute(
        project_domains.select().where(
            project_domains.c.status == "ai_suggested"
        )
    ).fetchall()
    
    suggested_domains = []
    for m in domains_query:
        proj = db.query(Project).filter(Project.id == m.project_id, Project.user_id == current_user.id).first()
        if proj:
            dom = db.query(Domain).filter(Domain.id == m.domain_id).first()
            if dom:
                suggested_domains.append({
                    "project_id": proj.id,
                    "project_title": proj.title,
                    "domain_id": dom.id,
                    "domain_name": dom.name,
                    "confidence": m.confidence,
                    "origin": m.origin,
                    "status": m.status
                })
                
    # 3. Suggested skills
    skills_query = db.execute(
        project_skills.select().where(
            project_skills.c.status == "ai_suggested"
        )
    ).fetchall()
    
    suggested_skills = []
    for m in skills_query:
        proj = db.query(Project).filter(Project.id == m.project_id, Project.user_id == current_user.id).first()
        if proj:
            sk = db.query(Skill).filter(Skill.id == m.skill_id).first()
            if sk:
                suggested_skills.append({
                    "project_id": proj.id,
                    "project_title": proj.title,
                    "skill_id": sk.id,
                    "skill_name": sk.name,
                    "category": sk.category,
                    "confidence": m.confidence,
                    "origin": m.origin,
                    "status": m.status
                })
                
    return {
        "claims": claims,
        "domains": suggested_domains,
        "skills": suggested_skills
    }


@app.patch("/api/project-skills/{project_id}/{skill_id}")
def update_project_skill(
    project_id: str,
    skill_id: str,
    payload: Dict[str, str],
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    status_val = payload.get("status")
    if status_val not in ["user_confirmed", "user_rejected"]:
        raise HTTPException(status_code=400, detail="Invalid status. Must be user_confirmed or user_rejected")
        
    project = db.query(Project).filter(Project.id == project_id, Project.user_id == current_user.id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
        
    result = db.execute(
        project_skills.update().where(
            project_skills.c.project_id == project_id,
            project_skills.c.skill_id == skill_id
        ).values(status=status_val)
    )
    if result.rowcount == 0:
        raise HTTPException(status_code=404, detail="Skill mapping not found")
        
    update_skill_progress_scores(db, current_user.id)
    update_domain_progress_scores(db, current_user.id)
    save_career_snapshot(db, current_user.id)
    db.commit()
    return {"status": "success", "message": f"Project skill updated to {status_val}"}


@app.patch("/api/project-domains/{project_id}/{domain_id}")
def update_project_domain(
    project_id: str,
    domain_id: str,
    payload: Dict[str, str],
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    status_val = payload.get("status")
    if status_val not in ["user_confirmed", "user_rejected"]:
        raise HTTPException(status_code=400, detail="Invalid status. Must be user_confirmed or user_rejected")
        
    project = db.query(Project).filter(Project.id == project_id, Project.user_id == current_user.id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
        
    result = db.execute(
        project_domains.update().where(
            project_domains.c.project_id == project_id,
            project_domains.c.domain_id == domain_id
        ).values(status=status_val)
    )
    if result.rowcount == 0:
        raise HTTPException(status_code=404, detail="Domain mapping not found")
        
    update_domain_progress_scores(db, current_user.id)
    save_career_snapshot(db, current_user.id)
    db.commit()
    return {"status": "success", "message": f"Project domain updated to {status_val}"}


@app.patch("/api/claims/{claim_id}")
def update_claim_status(
    claim_id: str,
    payload: Dict[str, str],
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    status_val = payload.get("status")
    if status_val not in ["user_confirmed", "user_rejected"]:
        raise HTTPException(status_code=400, detail="Invalid status. Must be user_confirmed or user_rejected")
        
    claim = db.query(Claim).filter(Claim.id == claim_id, Claim.user_id == current_user.id).first()
    if not claim:
        raise HTTPException(status_code=404, detail="Claim not found")
        
    claim.status = status_val
    update_domain_progress_scores(db, current_user.id)
    save_career_snapshot(db, current_user.id)
    db.commit()
    return {"status": "success", "message": f"Claim updated to {status_val}"}
