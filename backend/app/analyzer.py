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

import json
import math
import hashlib
from datetime import datetime, timezone, timedelta
from typing import Dict, Any, List, Optional
import httpx
from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from backend.app.config import OPENAI_API_KEY, ANTHROPIC_API_KEY
from backend.app.models import (
    User, Project, Skill, Domain, Evidence, Claim, Activity,
    DomainProgress, SkillProgress, CareerSnapshot, AIInference,
    project_skills, project_domains, claim_evidence
)

# Initialize API clients only if keys are present
openai_client = None
if OPENAI_API_KEY:
    try:
        from openai import OpenAI
        openai_client = OpenAI(api_key=OPENAI_API_KEY)
    except Exception as e:
        print(f"Failed to initialize OpenAI client: {e}")

anthropic_client = None
if ANTHROPIC_API_KEY:
    try:
        from anthropic import Anthropic
        anthropic_client = Anthropic(api_key=ANTHROPIC_API_KEY)
    except Exception as e:
        print(f"Failed to initialize Anthropic client: {e}")


def calculate_sync_hash(readme: str, languages: Dict[str, Any], files: List[str]) -> str:
    """Calculates a unique MD5 hash for the repository's current state."""
    raw_str = f"{readme}::{json.dumps(sorted(languages.items()))}::{json.dumps(sorted(files))}"
    return hashlib.md5(raw_str.encode("utf-8")).hexdigest()


async def fetch_github_repos(access_token: str, username: Optional[str] = None) -> List[Dict[str, Any]]:
    """Fetches user's repositories from GitHub API using PAT or OAuth token."""
    headers = {
        "Authorization": f"Bearer {access_token}",
        "Accept": "application/vnd.github.v3+json",
        "User-Agent": "Career-Graph-App"
    }
    
    async with httpx.AsyncClient(timeout=15.0) as client:
        # Try authenticated /user/repos
        response = await client.get("https://api.github.com/user/repos?type=owner&sort=updated&per_page=100", headers=headers)
        if response.status_code == 200:
            return response.json()
        
        # If fine-grained PAT or public user repos needed and username provided:
        if username:
            user_url = f"https://api.github.com/users/{username}/repos?type=owner&sort=updated&per_page=100"
            res_user = await client.get(user_url, headers=headers)
            if res_user.status_code == 200:
                return res_user.json()
        
        if response.status_code == 401:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid or expired GitHub Personal Access Token.")
        elif response.status_code == 403:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="GitHub API rate limit exceeded or access forbidden.")
        else:
            raise HTTPException(status_code=response.status_code, detail=f"GitHub API error: {response.text}")


async def fetch_github_repo_details(access_token: str, owner: str, repo_name: str) -> Dict[str, Any]:
    """Fetches specific details of a repository, including languages and README."""
    headers = {
        "Authorization": f"Bearer {access_token}",
        "Accept": "application/vnd.github.v3+json",
        "User-Agent": "Career-Graph-App"
    }

    
    async with httpx.AsyncClient() as client:
        # Fetch README
        readme_content = ""
        readme_url = f"https://api.github.com/repos/{owner}/{repo_name}/readme"
        res_readme = await client.get(readme_url, headers=headers)
        if res_readme.status_code == 200:
            readme_data = res_readme.json()
            import base64
            try:
                readme_content = base64.b64decode(readme_data.get("content", "")).decode("utf-8")
            except Exception:
                readme_content = ""

        # Fetch Languages
        languages = {}
        langs_url = f"https://api.github.com/repos/{owner}/{repo_name}/languages"
        res_langs = await client.get(langs_url, headers=headers)
        if res_langs.status_code == 200:
            languages = res_langs.json()

        # Fetch recent commits (last 10)
        commits = []
        commits_url = f"https://api.github.com/repos/{owner}/{repo_name}/commits?per_page=10"
        res_commits = await client.get(commits_url, headers=headers)
        if res_commits.status_code == 200:
            commits_data = res_commits.json()
            for c in commits_data:
                commits.append({
                    "sha": c.get("sha"),
                    "message": c.get("commit", {}).get("message"),
                    "author": c.get("commit", {}).get("author", {}).get("name"),
                    "date": c.get("commit", {}).get("author", {}).get("date")
                })

        # Fetch contents/file structure (recursive file listing up to 50 files)
        files = []
        tree_url = f"https://api.github.com/repos/{owner}/{repo_name}/git/trees/main?recursive=1"
        res_tree = await client.get(tree_url, headers=headers)
        if res_tree.status_code != 200:
            tree_url = f"https://api.github.com/repos/{owner}/{repo_name}/git/trees/master?recursive=1"
            res_tree = await client.get(tree_url, headers=headers)
            
        if res_tree.status_code == 200:
            tree_data = res_tree.json()
            for file_entry in tree_data.get("tree", []):
                if file_entry.get("type") == "blob":
                    files.append(file_entry.get("path"))
                    if len(files) >= 50:
                        break

    return {
        "readme": readme_content,
        "languages": languages,
        "commits": commits,
        "files": files
    }


def analyze_project_openai(
    repo_name: str, description: str, languages: Dict[str, Any], files: List[str],
    db: Optional[Session] = None, project_id: Optional[str] = None, content_hash: Optional[str] = None
) -> Dict[str, Any]:
    """Uses OpenAI GPT-4o for deterministic taxonomy extraction (skills, domains, technologies)."""
    if not openai_client:
        return {}
        
    prompt = f"""
    Analyze the following repository details and classify its technologies, technical skills, and parent domains.
    
    Repository Name: {repo_name}
    Description: {description}
    Languages Used: {json.dumps(languages)}
    Sample Files: {json.dumps(files[:30])}
    
    Return a valid JSON object matching this structure EXACTLY. Do not include markdown code block formatting:
    {{
        "domains": [
            {{"name": "Domain Name", "confidence": 0.8, "relevance": 0.9}}
        ],
        "skills": [
            {{"name": "Skill Name", "category": "LANGUAGE|LIBRARY|FRAMEWORK|CONCEPT|TOOL", "relationship": "USES|DEMONSTRATES|IMPLEMENTS"}}
        ],
        "technologies": ["Python", "FastAPI", "SQLite"]
    }}
    """
    
    content = ""
    error_msg = None
    try:
        response = openai_client.chat.completions.create(
            model="gpt-4o",
            messages=[
                {"role": "system", "content": "You are a professional software engineer and taxonomy classifier. You return only raw JSON output."},
                {"role": "user", "content": prompt}
            ],
            temperature=0.2
        )
        content = response.choices[0].message.content.strip()
        if content.startswith("```"):
            content = content.split("```json")[-1].split("```")[0].strip()
        result = json.loads(content)
        return result
    except Exception as e:
        error_msg = str(e)
        print(f"OpenAI analysis error: {e}")
        return {}
    finally:
        # Log to ai_inferences table if session is provided
        if db:
            try:
                log_entry = AIInference(
                    project_id=project_id,
                    prompt_type="openai_extraction",
                    content_hash=content_hash,
                    input_payload=prompt,
                    response_payload=content or "Failed to retrieve",
                    error_message=error_msg
                )
                db.add(log_entry)
                db.flush()
            except Exception as le:
                print(f"Failed to write OpenAI inference log: {le}")


def analyze_project_anthropic(
    repo_name: str, description: str, readme: str, languages: Dict[str, Any], 
    files: List[str], openai_extracts: Dict[str, Any],
    db: Optional[Session] = None, project_id: Optional[str] = None, content_hash: Optional[str] = None
) -> Dict[str, Any]:
    """Uses Anthropic Claude 3.5 Sonnet for reasoning, complexity rating, and claim/evidence extraction."""
    if not anthropic_client:
        return {}

    prompt = f"""
    Review this project repository to evaluate its engineering depth, complexity, status, and formulate concrete, evidence-backed claims of what the user achieved.
    
    Repository Name: {repo_name}
    Description: {description}
    Languages: {json.dumps(languages)}
    OpenAI Extracted Skills: {json.dumps(openai_extracts.get("skills", []))}
    Sample Files: {json.dumps(files[:40])}
    README:
    {readme[:4000]}
    
    Provide:
    1. A complexity score between 1.0 (trivial script) and 10.0 (high sophistication: distributed system, custom model, complex algorithm).
    2. A list of 2-5 concrete, factual claims of accomplishments (e.g. "Implemented Dijkstra's shortest-path algorithm in C").
         - Attach each claim to the exact source files from the file list that back it up.
    3. A set of 3-5 problem-solving patterns/methodologies used (e.g., "graph modeling", "optimization", "automation").
    4. Project Status: Completed, Active, Idea, or Paused.
    
    Return a valid JSON object matching this structure EXACTLY. Do not include markdown code block formatting:
    {{
        "complexity_score": 6.8,
        "status": "ACTIVE",
        "problem_solving_patterns": ["graph modeling", "algorithmic optimization", "iterative prototyping"],
        "claims": [
            {{
                "claim": "Implemented Dijkstra shortest path algorithm with grid visualization",
                "claim_type": "TECHNICAL_ACHIEVEMENT",
                "evidence_files": ["algorithms/dijkstra.c", "gui/grid.py"]
            }}
        ]
    }}
    """

    content = ""
    error_msg = None
    try:
        response = anthropic_client.messages.create(
            model="claude-3-5-sonnet-20240620",
            max_tokens=2000,
            temperature=0.2,
            system="You are a senior technical recruiter and principal software architect. You output only raw, valid JSON.",
            messages=[{"role": "user", "content": prompt}]
        )
        content = response.content[0].text.strip()
        if content.startswith("```"):
            content = content.split("```json")[-1].split("```")[0].strip()
        result = json.loads(content)
        return result
    except Exception as e:
        error_msg = str(e)
        print(f"Anthropic analysis error: {e}")
        return {}
    finally:
        if db:
            try:
                log_entry = AIInference(
                    project_id=project_id,
                    prompt_type="anthropic_reasoning",
                    content_hash=content_hash,
                    input_payload=prompt,
                    response_payload=content or "Failed to retrieve",
                    error_message=error_msg
                )
                db.add(log_entry)
                db.flush()
            except Exception as le:
                print(f"Failed to write Anthropic inference log: {le}")


def fallback_heuristics_analyzer(repo_name: str, description: str, languages: Dict[str, Any], files: List[str]) -> Dict[str, Any]:
    """Heuristic fallback analyzer if no API keys are provided."""
    print("Using local fallback heuristics analyzer...")
    detected_tech = list(languages.keys())
    
    skills = []
    domains = []
    claims = []
    patterns = ["iterative prototyping"]
    complexity = 3.0
    status = "COMPLETED"
    
    file_str = " ".join(files).lower()
    desc_str = (description or "").lower()
    name_str = repo_name.lower()
    
    if "model" in file_str or "train" in file_str or "dataset" in file_str or "tensorflow" in file_str or "torch" in file_str or "ai" in name_str or "ml" in name_str:
        domains.append({"name": "Machine Learning", "confidence": 0.9, "relevance": 0.9})
        skills.append({"name": "Machine Learning", "category": "CONCEPT", "relationship": "DEMONSTRATES"})
        skills.append({"name": "Model Evaluation", "category": "CONCEPT", "relationship": "USES"})
        patterns.append("experimentation")
        complexity = 6.5
        claims.append({
            "claim": f"Built a machine learning classification/prediction model for {repo_name}",
            "claim_type": "TECHNICAL_ACHIEVEMENT",
            "evidence_files": [f for f in files if "train" in f or "model" in f][:2]
        })
    
    if "api" in file_str or "controller" in file_str or "route" in file_str or "fastapi" in file_str or "app" in file_str or "web" in name_str:
        domains.append({"name": "Web Development", "confidence": 0.85, "relevance": 0.85})
        domains.append({"name": "Backend Development", "confidence": 0.8, "relevance": 0.8})
        skills.append({"name": "API Development", "category": "CONCEPT", "relationship": "DEMONSTRATES"})
        skills.append({"name": "Web Architectures", "category": "CONCEPT", "relationship": "USES"})
        patterns.append("automation")
        complexity = 5.0
        claims.append({
            "claim": "Designed and built RESTful web API routes and service logic",
            "claim_type": "ARCHITECTURE",
            "evidence_files": [f for f in files if "route" in f or "api" in f or "app" in f][:2]
        })
        
    if "dijkstra" in file_str or "algorithm" in file_str or "sort" in file_str or "graph" in file_str or "nav" in name_str:
        domains.append({"name": "Algorithms / DSA", "confidence": 0.95, "relevance": 0.95})
        skills.append({"name": "Algorithm Design", "category": "CONCEPT", "relationship": "DEMONSTRATES"})
        skills.append({"name": "Graph Algorithms", "category": "CONCEPT", "relationship": "DEMONSTRATES"})
        patterns.append("graph modeling")
        patterns.append("algorithmic optimization")
        complexity = 7.0
        claims.append({
            "claim": "Implemented key algorithmic solvers (such as graphs or optimizations) with structured evaluations",
            "claim_type": "TECHNICAL_ACHIEVEMENT",
            "evidence_files": [f for f in files if "alg" in f or "dijkstra" in f or "graph" in f][:2]
        })

    if not domains:
        domains.append({"name": "Software Engineering", "confidence": 0.8, "relevance": 0.8})
    if not skills:
        skills.append({"name": "Software Engineering", "category": "CONCEPT", "relationship": "USES"})
    if not claims:
        claims.append({
            "claim": f"Created custom developer software project {repo_name}",
            "claim_type": "TECHNICAL_ACHIEVEMENT",
            "evidence_files": files[:2] if files else []
        })

    for tech in detected_tech:
        skills.append({"name": tech, "category": "LANGUAGE", "relationship": "USES"})

    return {
        "domains": domains,
        "skills": skills,
        "technologies": detected_tech,
        "complexity_score": complexity,
        "status": status,
        "problem_solving_patterns": patterns,
        "claims": claims
    }


def update_domain_progress_scores(db: Session, user_id: str):
    """Calculates exposure, activity, depth, evidence, and recency scores for domains and updates levels."""
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        return
        
    projects = db.query(Project).filter(Project.user_id == user_id).all()
    domains = db.query(Domain).all()
    for domain in domains:
        # ONLY look at user_confirmed project mappings for progress scoring!
        user_confirmed_projects = []
        for p in projects:
            # Query junction table mapping
            mapping = db.execute(
                project_domains.select().where(
                    project_domains.c.project_id == p.id,
                    project_domains.c.domain_id == domain.id,
                    project_domains.c.status == "user_confirmed"
                )
            ).first()
            if mapping:
                user_confirmed_projects.append(p)

        if not user_confirmed_projects:
            # Remove or zero out progress if no confirmed projects exist in this domain anymore
            prog = db.query(DomainProgress).filter(
                DomainProgress.user_id == user_id,
                DomainProgress.domain_id == domain.id
            ).first()
            if prog:
                prog.exposure_score = 0.0
                prog.activity_score = 0.0
                prog.evidence_score = 0.0
                prog.depth_score = 0.0
                prog.current_level = "EXPOSURE"
            continue
            
        exposure = len(user_confirmed_projects)
        exposure_score = min(exposure / 5.0, 1.0)
        
        depth_val = 0.0
        for p in user_confirmed_projects:
            relevance = db.execute(
                project_domains.select().where(
                    project_domains.c.project_id == p.id,
                    project_domains.c.domain_id == domain.id
                )
            ).first()
            rel_score = relevance.relevance if relevance else 1.0
            depth_val += (p.complexity_score / 10.0) * rel_score
            
        depth_score = min(depth_val / max(exposure, 1), 1.0)
        
        # Evidence: user_confirmed claims linked to domain's projects
        evidence_count = 0
        for p in user_confirmed_projects:
            evidence_count += db.query(Claim).filter(
                Claim.project_id == p.id,
                Claim.status == "user_confirmed"
            ).count()
        evidence_score = min(evidence_count / 10.0, 1.0)
        
        # Recency score
        last_date = datetime.now(timezone.utc) - timedelta(days=365)
        for p in user_confirmed_projects:
            p_date = p.completed_at or p.started_at or p.created_at
            if p_date:
                if p_date.tzinfo is None:
                    p_date = p_date.replace(tzinfo=timezone.utc)
                if p_date > last_date:
                    last_date = p_date
                    
        days_delta = (datetime.now(timezone.utc) - last_date).days
        recency_score = math.exp(-0.003 * max(days_delta, 0))
        
        # Activity score (commits / actions)
        recent_activity_count = db.query(Activity).filter(
            Activity.user_id == user_id,
            Activity.project_id.in_([p.id for p in user_confirmed_projects]),
            Activity.timestamp >= datetime.now(timezone.utc) - timedelta(days=90)
        ).count()
        activity_score = min(recent_activity_count / 30.0, 1.0)
        
        combined = (
            exposure_score * 0.2 +
            depth_score * 0.3 +
            evidence_score * 0.2 +
            recency_score * 0.15 +
            activity_score * 0.15
        ) * 100.0
        
        level = "EXPOSURE"
        if combined >= 85:
            level = "ADVANCED"
        elif combined >= 70:
            level = "STRONG"
        elif combined >= 50:
            level = "PROFICIENT"
        elif combined >= 30:
            level = "DEVELOPING"
        elif combined >= 15:
            level = "PRACTICING"
            
        trajectory = "STABLE"
        if activity_score > 0.6 and recency_score > 0.9:
            trajectory = "INCREASING"
        elif recency_score < 0.4:
            trajectory = "DECREASING"
            
        prog = db.query(DomainProgress).filter(
            DomainProgress.user_id == user_id,
            DomainProgress.domain_id == domain.id
        ).first()
        
        if not prog:
            prog = DomainProgress(
                user_id=user_id,
                domain_id=domain.id,
                first_detected=datetime.now(timezone.utc)
            )
            db.add(prog)
            
        prog.exposure_score = exposure_score
        prog.activity_score = activity_score
        prog.evidence_score = evidence_score
        prog.depth_score = depth_score
        prog.recency_score = recency_score
        prog.current_level = level
        prog.trajectory = trajectory
        prog.last_active = last_date
        prog.updated_at = datetime.now(timezone.utc)
    db.commit()


def update_skill_progress_scores(db: Session, user_id: str):
    """Calculates metrics for individual skills and updates current levels based on confirmed usage."""
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        return
        
    projects = db.query(Project).filter(Project.user_id == user_id).all()
    skills = db.query(Skill).all()
    for skill in skills:
        user_confirmed_projects = []
        for p in projects:
            mapping = db.execute(
                project_skills.select().where(
                    project_skills.c.project_id == p.id,
                    project_skills.c.skill_id == skill.id,
                    project_skills.c.status == "user_confirmed"
                )
            ).first()
            if mapping:
                user_confirmed_projects.append(p)

        if not user_confirmed_projects:
            prog = db.query(SkillProgress).filter(
                SkillProgress.user_id == user_id,
                SkillProgress.skill_id == skill.id
            ).first()
            if prog:
                prog.evidence_count = 0
                prog.usage_frequency = 0.0
                prog.depth_score = 0.0
                prog.current_level = "EXPOSURE"
            continue
            
        evidence_count = len(user_confirmed_projects)
        
        depth_val = sum(p.complexity_score for p in user_confirmed_projects)
        depth_score = min((depth_val / max(evidence_count, 1)) / 10.0, 1.0)
        
        last_date = datetime.now(timezone.utc) - timedelta(days=365)
        for p in user_confirmed_projects:
            p_date = p.completed_at or p.started_at or p.created_at
            if p_date:
                if p_date.tzinfo is None:
                    p_date = p_date.replace(tzinfo=timezone.utc)
                if p_date > last_date:
                    last_date = p_date
                    
        days_delta = (datetime.now(timezone.utc) - last_date).days
        recency_score = math.exp(-0.003 * max(days_delta, 0))
        
        usage_frequency = min(evidence_count / 4.0, 1.0)
        
        combined = (
            depth_score * 0.4 +
            recency_score * 0.3 +
            usage_frequency * 0.3
        ) * 100.0
        
        level = "EXPOSURE"
        if combined >= 85:
            level = "ADVANCED"
        elif combined >= 70:
            level = "STRONG"
        elif combined >= 50:
            level = "PROFICIENT"
        elif combined >= 25:
            level = "PRACTICING"
            
        trajectory = "STABLE"
        if recency_score > 0.9 and usage_frequency > 0.5:
            trajectory = "INCREASING"
        elif recency_score < 0.4:
            trajectory = "DECREASING"
            
        prog = db.query(SkillProgress).filter(
            SkillProgress.user_id == user_id,
            SkillProgress.skill_id == skill.id
        ).first()
        
        if not prog:
            prog = SkillProgress(
                user_id=user_id,
                skill_id=skill.id,
                first_seen=datetime.now(timezone.utc)
            )
            db.add(prog)
            
        prog.evidence_count = evidence_count
        prog.usage_frequency = usage_frequency
        prog.depth_score = depth_score
        prog.recency_score = recency_score
        prog.current_level = level
        prog.trajectory = trajectory
        prog.last_used = last_date
        prog.updated_at = datetime.now(timezone.utc)
    db.commit()


def save_career_snapshot(db: Session, user_id: str):
    """Saves a daily career snapshot of domains, skills, projects, and trajectory."""
    today = datetime.now(timezone.utc).date()
    
    domains_progress = db.query(DomainProgress).filter(DomainProgress.user_id == user_id).all()
    skills_progress = db.query(SkillProgress).filter(SkillProgress.user_id == user_id).all()
    active_projects_list = db.query(Project).filter(Project.user_id == user_id, Project.status == "ACTIVE").all()
    
    dominant_domains = [
        {"domain": dp.domain.name, "level": dp.current_level}
        for dp in domains_progress if dp.current_level in ["STRONG", "ADVANCED"]
    ]
    emerging_domains = [
        {"domain": dp.domain.name, "level": dp.current_level}
        for dp in domains_progress if dp.current_level in ["DEVELOPING", "PRACTICING"] and dp.trajectory == "INCREASING"
    ]
    strongest_skills = [
        {"skill": sp.skill.name, "level": sp.current_level}
        for sp in skills_progress if sp.current_level in ["STRONG", "ADVANCED"]
    ]
    active_projects = [p.title for p in active_projects_list]
    
    direction = "Exploring diverse areas of software engineering."
    if dominant_domains:
        top_doms = ", ".join([d["domain"] for d in dominant_domains[:2]])
        direction = f"Strengthening focus in {top_doms}."
        if emerging_domains:
            direction += f" Emerging interests in {emerging_domains[0]['domain']}."
            
    snapshot = db.query(CareerSnapshot).filter(
        CareerSnapshot.user_id == user_id,
        CareerSnapshot.snapshot_date == today
    ).first()
    
    if not snapshot:
        snapshot = CareerSnapshot(user_id=user_id, snapshot_date=today)
        db.add(snapshot)
        
    snapshot.dominant_domains = dominant_domains
    snapshot.emerging_domains = emerging_domains
    snapshot.strongest_skills = strongest_skills
    snapshot.active_projects = active_projects
    snapshot.career_direction = direction


import re

def sync_github_project(db: Session, user: User, repo_data: Dict[str, Any], details: Dict[str, Any], auto_confirm: bool = False):
    """Integrates a single GitHub repository into the Career Graph with caching, uniqueness checking, and transaction atomicity."""
    # 0. Validate repository URL format
    html_url = repo_data.get("html_url", "")
    github_url_pattern = re.compile(r"^https://github\.com/[a-zA-Z0-9_-]+/[a-zA-Z0-9_\.-]+$")
    if not html_url or not github_url_pattern.match(html_url):
        raise HTTPException(status_code=400, detail="Invalid repository URL format.")
        
    # Check if project already exists
    project = db.query(Project).filter(
        Project.user_id == user.id,
        Project.repository_url == html_url
    ).first()
    
    # 1. Compute Sync Hash to check cache
    current_hash = calculate_sync_hash(
        details.get("readme", ""),
        details.get("languages", {}),
        details.get("files", [])
    )
    
    cached = False
    ai_res = {}
    
    if project and project.sync_hash == current_hash:
        print(f"Project '{repo_data['name']}' has not changed (hash matches: {current_hash}). Skipping LLM calls.")
        cached = True
    else:
        # Check global cache (AIInference table)
        cached_openai = db.query(AIInference).filter(
            AIInference.content_hash == current_hash,
            AIInference.prompt_type == "openai_extraction",
            AIInference.error_message == None
        ).first()
        
        cached_anthropic = db.query(AIInference).filter(
            AIInference.content_hash == current_hash,
            AIInference.prompt_type == "anthropic_reasoning",
            AIInference.error_message == None
        ).first()
        
        if cached_openai and (not anthropic_client or cached_anthropic):
            print(f"Global cache hit for content hash: {current_hash}. Skipping API calls.")
            try:
                openai_res = json.loads(cached_openai.response_payload)
                if cached_anthropic:
                    ai_res = json.loads(cached_anthropic.response_payload)
                else:
                    ai_res = {}
                
                # Reconstruct keys
                ai_res["domains"] = openai_res.get("domains", [])
                ai_res["skills"] = openai_res.get("skills", [])
                ai_res["technologies"] = openai_res.get("technologies", [])
                
                # Update association
                if project:
                    cached_openai.project_id = project.id
                    if cached_anthropic:
                        cached_anthropic.project_id = project.id
            except Exception as e:
                print(f"Error parsing cached payloads: {e}")
                ai_res = {}
                
        if not ai_res:
            # Cache Miss: Call OpenAI + Anthropic Hybrid
            openai_res = analyze_project_openai(
                repo_data["name"], 
                repo_data.get("description") or "", 
                details.get("languages", {}), 
                details.get("files", []),
                db=db,
                project_id=project.id if project else None,
                content_hash=current_hash
            )
            
            if openai_res and anthropic_client:
                ai_res = analyze_project_anthropic(
                    repo_data["name"], 
                    repo_data.get("description") or "", 
                    details.get("readme", ""), 
                    details.get("languages", {}), 
                    details.get("files", []), 
                    openai_res,
                    db=db,
                    project_id=project.id if project else None,
                    content_hash=current_hash
                )
            
            if not ai_res:
                ai_res = fallback_heuristics_analyzer(
                    repo_data["name"], 
                    repo_data.get("description") or "", 
                    details.get("languages", {}), 
                    details.get("files", [])
                )
            else:
                ai_res["domains"] = openai_res.get("domains", [])
                ai_res["skills"] = openai_res.get("skills", [])
                ai_res["technologies"] = openai_res.get("technologies", [])

    # 2. Upsert project record
    if not project:
        project = Project(
            user_id=user.id,
            title=repo_data["name"],
            repository_url=repo_data["html_url"],
            created_at=datetime.now(timezone.utc)
        )
        db.add(project)
        db.flush() # Populate ID

    project.title = repo_data["name"]
    project.description = repo_data.get("description") or ""
    
    # Only update AI-analyzed fields if not cached
    if not cached:
        project.status = ai_res.get("status", "COMPLETED").upper()
        project.complexity_score = ai_res.get("complexity_score", 3.0)
        project.sync_hash = current_hash

    # Set dates from github metadata
    created_at_str = repo_data.get("created_at")
    updated_at_str = repo_data.get("updated_at")
    if created_at_str:
        project.started_at = datetime.fromisoformat(created_at_str.replace("Z", "+00:00"))
    if updated_at_str and project.status == "COMPLETED":
        project.completed_at = datetime.fromisoformat(updated_at_str.replace("Z", "+00:00"))

    # Convert user.id to string to prevent type mismatch in SQLite comparison
    user_id_str = str(user.id)

    # 3. Only rewrite AI Skills / Domains if we had a cache miss
    if not cached:
        # A. Domains processing
        # Keep existing user_confirmed domains! Only clear system / ai_suggested ones
        existing_domain_mappings = db.execute(
            project_domains.select().where(project_domains.c.project_id == project.id)
        ).fetchall()
        
        confirmed_domain_ids = {m.domain_id for m in existing_domain_mappings if m.status == "user_confirmed"}
        
        # Clear domains, keeping confirmed ones
        project.domains = [d for d in project.domains if d.id in confirmed_domain_ids]
        
        for dom_entry in ai_res.get("domains", []):
            domain_name = dom_entry["name"]
            domain = db.query(Domain).filter(Domain.name == domain_name).first()
            if not domain:
                domain = Domain(name=domain_name, created_by="SYSTEM")
                db.add(domain)
                db.flush()
            
            if domain.id not in confirmed_domain_ids:
                if domain not in project.domains:
                    project.domains.append(domain)
                db.flush()
                
                status_str = "user_confirmed" if auto_confirm else "ai_suggested"
                db.execute(
                    project_domains.update().where(
                        project_domains.c.project_id == project.id,
                        project_domains.c.domain_id == domain.id
                    ).values(
                        confidence=dom_entry.get("confidence", 1.0),
                        relevance=dom_entry.get("relevance", 1.0),
                        origin="AI_PROPOSED",
                        status=status_str
                    )
                )

        # B. Skills processing
        # Separate DETERMINISTIC tech-stacks (which auto-confirm) from AI skills (which suggest)
        existing_skill_mappings = db.execute(
            project_skills.select().where(project_skills.c.project_id == project.id)
        ).fetchall()
        
        confirmed_skill_ids = {m.skill_id for m in existing_skill_mappings if m.status == "user_confirmed"}
        
        # Clear skills, keeping confirmed ones
        project.skills = [s for s in project.skills if s.id in confirmed_skill_ids]

        for skill_entry in ai_res.get("skills", []):
            skill_name = skill_entry["name"]
            skill = db.query(Skill).filter(Skill.name == skill_name).first()
            if not skill:
                skill = Skill(name=skill_name, category=skill_entry.get("category", "TOOL"))
                db.add(skill)
                db.flush()
                
            if skill.id not in confirmed_skill_ids:
                if skill not in project.skills:
                    project.skills.append(skill)
                db.flush()
                
                # Auto-confirm languages/deterministic tech, suggest concepts/AI skills
                is_language = skill_entry.get("category") == "LANGUAGE" or skill_name in details.get("languages", {})
                origin = "DETERMINISTIC" if is_language else "AI_PROPOSED"
                status_str = "user_confirmed" if (auto_confirm or is_language) else "ai_suggested"
                
                db.execute(
                    project_skills.update().where(
                        project_skills.c.project_id == project.id,
                        project_skills.c.skill_id == skill.id
                    ).values(
                        relationship=skill_entry.get("relationship", "USES"),
                        confidence=skill_entry.get("confidence", 1.0),
                        evidence_strength=skill_entry.get("evidence_strength", 1.0),
                        origin=origin,
                        status=status_str
                    )
                )

        # C. Claims & Evidence mapping (on cache miss)
        # Clear existing unconfirmed claims for this project
        db.query(Claim).filter(
            Claim.project_id == project.id,
            Claim.status != "user_confirmed"
        ).delete()
        
        # Extract claims & map back to evidence
        for claim_entry in ai_res.get("claims", []):
            claim_text = claim_entry["claim"]
            status_str = "user_confirmed" if auto_confirm else "ai_suggested"
            claim = Claim(
                user_id=user.id,
                project_id=project.id,
                claim=claim_text,
                claim_type=claim_entry.get("claim_type", "TECHNICAL_ACHIEVEMENT"),
                confidence=1.0,
                origin="AI_PROPOSED",
                status=status_str
            )
            db.add(claim)
            db.flush()

            for filename in claim_entry.get("evidence_files", []):
                # Uniqueness check on file evidence to avoid duplicate rows
                file_ev = db.query(Evidence).filter(
                    Evidence.user_id == user_id_str,
                    Evidence.type == "DOCUMENT",
                    Evidence.source_identifier == filename,
                    Evidence.source_url == f"{project.repository_url}/blob/main/{filename}"
                ).first()
                
                if not file_ev:
                    file_ev = Evidence(
                        user_id=user.id,
                        project_id=project.id,
                        type="DOCUMENT",
                        source="github",
                        source_url=f"{project.repository_url}/blob/main/{filename}",
                        source_identifier=filename,
                        content=f"Verifiable source file: {filename}",
                        confidence=1.0
                    )
                    db.add(file_ev)
                    db.flush()
                
                # Map claim to evidence
                db.execute(
                    claim_evidence.insert().values(
                        claim_id=claim.id,
                        evidence_id=file_ev.id,
                        relationship="PROVES"
                    )
                )

    # 4. Git Commits and README Evidence Ingestion (always run to verify new activities)
    # A. Ingest README as evidence with uniqueness check
    if details.get("readme"):
        readme_url = f"{project.repository_url}/blob/main/README.md"
        readme_ev = db.query(Evidence).filter(
            Evidence.user_id == user_id_str,
            Evidence.type == "README",
            Evidence.source_url == readme_url
        ).first()
        
        if not readme_ev:
            readme_ev = Evidence(
                user_id=user.id,
                type="README",
                source="github",
                source_url=readme_url,
                content=details["readme"][:5000],
                confidence=1.0
            )
            db.add(readme_ev)
            db.flush()

    # B. Ingest Commits with uniqueness check
    for commit in details.get("commits", [])[:5]:
        sha_val = commit.get("sha") or commit.get("hash") or "unknown_sha"
        commit_url = commit.get("url") or f"{project.repository_url}/commit/{sha_val}"
        commit_ev = db.query(Evidence).filter(
            Evidence.user_id == user_id_str,
            Evidence.type == "GITHUB_COMMIT",
            Evidence.source_identifier == sha_val
        ).first()
        
        commit_date_str = commit.get("date") or commit.get("timestamp")
        captured_dt = datetime.fromisoformat(commit_date_str.replace("Z", "+00:00")) if commit_date_str else datetime.now(timezone.utc)
        author_name = commit.get("author") or user.name

        if not commit_ev:
            commit_ev = Evidence(
                user_id=user.id,
                project_id=project.id,
                type="GITHUB_COMMIT",
                source="github",
                source_url=commit_url,
                source_identifier=sha_val,
                content=f"Commit: {commit.get('message', '')} (by {author_name})",
                captured_at=captured_dt,
                confidence=1.0
            )
            db.add(commit_ev)
            db.flush()

        # Ingest Activities with uniqueness check
        act_exists = db.query(Activity).filter(
            Activity.user_id == user_id_str,
            Activity.source_id == sha_val
        ).first()
        
        if not act_exists:
            activity = Activity(
                user_id=user.id,
                project_id=project.id,
                type="COMMIT",
                source="github",
                source_id=sha_val,
                timestamp=captured_dt,
                activity_metadata={
                    "message": commit.get("message", ""),
                    "author": author_name,
                    "url": commit_url
                }
            )
            db.add(activity)

    # 5. Domain & Skill progress score recalculations
    update_domain_progress_scores(db, user.id)
    update_skill_progress_scores(db, user.id)
    save_career_snapshot(db, user.id)

    # 6. Single atomic commit at the very end of the sync transaction!
    db.commit()
    return project

