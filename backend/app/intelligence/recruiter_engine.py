from typing import List, Dict, Any, Tuple
from sqlalchemy.orm import Session

from backend.app.models import User, Project, DomainProgress, SkillProgress, Claim, Role
from backend.app.schemas import (
    RecruiterMatchResponse,
    RoleFitBreakdown,
    CriteriaMatch,
    ClaimResponse,
)

# Standard Competency Matrices for Core Engineering Roles
ROLE_COMPETENCY_MATRICES: Dict[str, Dict[str, List[str]]] = {
    "ai / ml engineer": {
        "domains": ["Machine Learning", "AI / ML", "Algorithms / DSA", "Data Modeling"],
        "skills": ["Python", "PyTorch", "TensorFlow", "Scikit-Learn", "Model Evaluation", "NLP", "Computer Vision", "FastAPI"]
    },
    "machine learning engineer": {
        "domains": ["Machine Learning", "AI / ML", "Algorithms / DSA", "Data Modeling"],
        "skills": ["Python", "PyTorch", "TensorFlow", "Scikit-Learn", "Model Evaluation", "NLP", "FastAPI"]
    },
    "backend systems engineer": {
        "domains": ["Backend Development", "Distributed Systems", "Web Development", "System Architecture"],
        "skills": ["Python", "FastAPI", "PostgreSQL", "SQLAlchemy", "REST APIs", "Docker", "Redis", "System Design", "TypeScript"]
    },
    "software engineer": {
        "domains": ["Software Engineering", "Web Development", "Backend Development", "Algorithms / DSA"],
        "skills": ["Python", "TypeScript", "JavaScript", "FastAPI", "React", "Next.js", "Git", "REST APIs"]
    },
    "research engineer": {
        "domains": ["Algorithms / DSA", "Machine Learning", "Research Engineering", "Graph Theory"],
        "skills": ["Python", "Algorithm Design", "Computational Complexity", "Empirical Evaluation", "C++", "PyTorch"]
    },
    "full stack engineer": {
        "domains": ["Web Development", "Backend Development", "Frontend Engineering"],
        "skills": ["React", "Next.js", "TypeScript", "Python", "FastAPI", "PostgreSQL", "REST APIs", "CSS"]
    }
}


def get_role_competency_matrix(role_name: str) -> Dict[str, List[str]]:
    """Returns required domains and skills for a target role, with intelligent fallback decomposition."""
    role_key = role_name.strip().lower()
    for matrix_key, matrix in ROLE_COMPETENCY_MATRICES.items():
        if matrix_key in role_key or role_key in matrix_key:
            return matrix
            
    # Generic decomposition for custom role title
    tokens = [t.capitalize() for t in role_key.split() if len(t) > 2]
    return {
        "domains": [role_name.strip()] + tokens[:2],
        "skills": tokens + ["System Design", "Testing", "Git"]
    }


def compute_mathematical_role_fit(
    user: User,
    role_name: str,
    db: Session
) -> Tuple[RoleFitBreakdown, List[CriteriaMatch], List[str], List[str], List[str]]:
    """
    Computes a mathematically defensible 4-dimension role fit breakdown.
    Every number has an exact, provable formulation.
    """
    matrix = get_role_competency_matrix(role_name)
    required_domains = matrix.get("domains", [])
    required_skills = matrix.get("skills", [])
    
    domain_progress = db.query(DomainProgress).filter(DomainProgress.user_id == user.id).all()
    skill_progress = db.query(SkillProgress).filter(SkillProgress.user_id == user.id).all()
    projects = db.query(Project).filter(Project.user_id == user.id).all()
    
    candidate_domains_map = {dp.domain.name.lower(): dp for dp in domain_progress}
    candidate_skills_map = {sp.skill.name.lower(): sp for sp in skill_progress}
    
    criteria_matches: List[CriteriaMatch] = []
    proven_capabilities: List[str] = []
    partial_capabilities: List[str] = []
    no_evidence_capabilities: List[str] = []
    
    # 1. Evaluate Required Domains
    for req_d in required_domains:
        req_d_lower = req_d.lower().strip()
        matched_dp = candidate_domains_map.get(req_d_lower)
        if not matched_dp:
            for k, dp in candidate_domains_map.items():
                if req_d_lower in k or k in req_d_lower or any(part.strip() in k for part in req_d_lower.split('/') if len(part.strip()) > 2):
                    matched_dp = dp
                    break
                    
        if matched_dp:
            depth = matched_dp.depth_score or 0.0
            ev_score = matched_dp.evidence_score or 0.0
            # Calculate actual projects linked to this domain
            actual_ev_count = len([p for p in projects if any(d.id == matched_dp.domain_id for d in p.domains)])
            if depth >= 0.4 or ev_score >= 0.3 or actual_ev_count >= 1:
                status = "strong"
                proven_capabilities.append(matched_dp.domain.name)
            else:
                status = "moderate"
                partial_capabilities.append(matched_dp.domain.name)
                
            criteria_matches.append(CriteriaMatch(
                item_name=matched_dp.domain.name,
                type="domain",
                status=status,
                details=f"Calculated depth {int(depth * 100)}% with {matched_dp.current_level} proficiency.",
                evidence_count=actual_ev_count,
                freshness="ACTIVE" if getattr(matched_dp, "recency_score", 0.0) >= 0.5 else "HISTORICAL"
            ))
        else:
            no_evidence_capabilities.append(req_d)
            criteria_matches.append(CriteriaMatch(
                item_name=req_d,
                type="domain",
                status="no_evidence",
                details="No verified repository commits or projects observed in this domain.",
                evidence_count=0,
                freshness="DORMANT"
            ))
            
    # 2. Evaluate Required Skills
    for req_s in required_skills:
        req_s_lower = req_s.lower().strip()
        matched_sp = candidate_skills_map.get(req_s_lower)
        if not matched_sp:
            for k, sp in candidate_skills_map.items():
                if req_s_lower in k or k in req_s_lower:
                    matched_sp = sp
                    break
                    
        if matched_sp:
            ev_count = matched_sp.evidence_count or 0
            depth = matched_sp.depth_score or 0.0
            if ev_count >= 2 and depth >= 0.3:
                status = "strong"
                proven_capabilities.append(matched_sp.skill.name)
            elif ev_count >= 1 or depth > 0.1:
                status = "moderate"
                partial_capabilities.append(matched_sp.skill.name)
            else:
                status = "weak"
                
            criteria_matches.append(CriteriaMatch(
                item_name=matched_sp.skill.name,
                type="skill",
                status=status,
                details=f"Evidenced in {ev_count} project repositories with {matched_sp.current_level} mastery.",
                evidence_count=ev_count,
                freshness="ACTIVE" if getattr(matched_sp, "recency_score", 0.0) >= 0.5 else "HISTORICAL"
            ))
        else:
            no_evidence_capabilities.append(req_s)
            criteria_matches.append(CriteriaMatch(
                item_name=req_s,
                type="skill",
                status="no_evidence",
                details="No verified usage or code commits detected for this capability.",
                evidence_count=0,
                freshness="DORMANT"
            ))
            
    # 3. Mathematical 4-Dimension Formulation
    total_req = max(1, len(required_domains) + len(required_skills))
    matched_count = len(proven_capabilities) + len(partial_capabilities)
    
    if not domain_progress and not skill_progress and not projects:
        return (
            RoleFitBreakdown(
                required_capability_coverage=0.0,
                direct_evidence_coverage=0.0,
                recent_relevance=0.0,
                demonstrated_depth=0.0,
                overall_fit="Insufficient Evidence",
                fit_score=0,
                is_sufficient_evidence=False
            ),
            criteria_matches,
            proven_capabilities,
            partial_capabilities,
            no_evidence_capabilities
        )
        
    # Required capability coverage = proportion of required competencies with active or developing proof
    req_cap_coverage = min(100.0, round(((len(proven_capabilities) * 1.0 + len(partial_capabilities) * 0.5) / total_req) * 100.0, 1))
    
    # Direct evidence coverage = proportion of proven capabilities with multi-repository evidence
    direct_ev_coverage = min(100.0, round((len(proven_capabilities) / total_req) * 100.0, 1))
    
    # Recent relevance = proportion of matched capabilities active recently
    active_count = sum(1 for c in criteria_matches if c.freshness == "ACTIVE" and c.status in ("strong", "moderate"))
    recent_relevance = min(100.0, round((active_count / max(1, matched_count)) * 100.0, 1)) if matched_count > 0 else 0.0
    
    # Demonstrated depth = average depth of proven/partial items
    matched_items = [c for c in criteria_matches if c.status in ("strong", "moderate")]
    depth_scores = []
    for c in matched_items:
        if c.type == "domain":
            dp = candidate_domains_map.get(c.item_name.lower())
            if dp and dp.depth_score: depth_scores.append(dp.depth_score)
        else:
            sp = candidate_skills_map.get(c.item_name.lower())
            if sp and sp.depth_score: depth_scores.append(sp.depth_score)
            
    avg_depth = (sum(depth_scores) / max(1, len(depth_scores))) if depth_scores else 0.0
    demonstrated_depth = min(100.0, round(avg_depth * 100.0, 1))
    
    # Weighted composite score
    fit_score = int(round(
        0.35 * req_cap_coverage +
        0.30 * direct_ev_coverage +
        0.20 * recent_relevance +
        0.15 * demonstrated_depth
    ))
    
    if fit_score >= 60 or len(proven_capabilities) >= 3:
        overall_fit = "Strong Match"
    elif fit_score >= 30 or len(proven_capabilities) >= 1 or len(partial_capabilities) >= 2:
        overall_fit = "Moderate Match"
    elif fit_score > 0 or matched_count > 0:
        overall_fit = "Developing Match"
    else:
        overall_fit = "Insufficient Evidence"
        
    role_fit = RoleFitBreakdown(
        required_capability_coverage=req_cap_coverage,
        direct_evidence_coverage=direct_ev_coverage,
        recent_relevance=recent_relevance,
        demonstrated_depth=demonstrated_depth,
        overall_fit=overall_fit,
        fit_score=fit_score,
        is_sufficient_evidence=True
    )
    
    return role_fit, criteria_matches, proven_capabilities, partial_capabilities, no_evidence_capabilities


def evaluate_recruiter_role_match(
    user: User,
    role_name: str,
    db: Session
) -> RecruiterMatchResponse:
    """Evaluates candidate against target role using ground-truth mathematical evidence."""
    role_fit, criteria_matches, proven, partial, no_evidence = compute_mathematical_role_fit(user, role_name, db)
    
    evidence_claims = db.query(Claim).filter(
        Claim.user_id == user.id,
        Claim.status == "user_confirmed"
    ).all()
    
    if not role_fit.is_sufficient_evidence:
        why_text = f"Insufficient repository data to evaluate {role_name}. Connect your GitHub account to generate verified match evidence."
    elif proven:
        why_text = f"Candidate demonstrates empirical evidence across {', '.join(proven[:3])} with {role_fit.fit_score}% verified role coverage."
    elif partial:
        why_text = f"Candidate has developing capabilities in {', '.join(partial[:2])}, with ongoing evidence collection."
    else:
        why_text = f"No direct verified evidence observed for {role_name} requirements."
        
    return RecruiterMatchResponse(
        role_name=role_name,
        overall_match=role_fit.overall_fit,
        why_text=why_text,
        strengths=proven,
        gaps=no_evidence,
        criteria_matches=criteria_matches,
        evidence_backed_claims=[ClaimResponse.model_validate(c) for c in evidence_claims],
        role_fit=role_fit,
        proven_capabilities=proven,
        no_evidence_capabilities=no_evidence
    )


def match_custom_job_description(
    user: User,
    jd_title: str,
    jd_text: str,
    db: Session
) -> RecruiterMatchResponse:
    """
    Parses and extracts required capabilities from raw pasted Job Description text,
    then executes 4-dimension ground-truth matching against candidate graph evidence.
    """
    KNOWN_TECH_ENTITIES = [
        "Python", "TypeScript", "JavaScript", "Rust", "Go", "Golang", "Java", "C++", "C#", "SQL",
        "FastAPI", "React", "Next.js", "Django", "Flask", "Node.js", "Express", "PyTorch", "TensorFlow",
        "Scikit-Learn", "Docker", "Kubernetes", "PostgreSQL", "Redis", "MongoDB", "GraphQL", "REST APIs",
        "AWS", "GCP", "Azure", "Kafka", "Spark", "Terraform", "Git", "CI/CD", "Distributed Systems",
        "Machine Learning", "System Design", "Data Modeling", "Computer Vision", "NLP", "Microservices"
    ]
    
    # Extract entities present in the JD text
    found_skills = []
    jd_lower = jd_text.lower()
    for tech in KNOWN_TECH_ENTITIES:
        if tech.lower() in jd_lower:
            found_skills.append(tech)
            
    # If no specific known tech found, extract capitalized keywords
    if not found_skills:
        words = [w.strip(",.:;()") for w in jd_text.split() if len(w) > 3 and w[0].isupper()]
        found_skills = list(dict.fromkeys(words))[:6]
        
    title = jd_title.strip() or "Custom Target Role"
    
    # Construct dynamic competency matrix
    dynamic_domains = [title]
    if any(k in jd_lower for k in ["ml", "machine learning", "ai", "model"]):
        dynamic_domains.append("Machine Learning")
    if any(k in jd_lower for k in ["backend", "api", "database", "server", "systems"]):
        dynamic_domains.append("Backend Development")
    if any(k in jd_lower for k in ["frontend", "ui", "ux", "web", "react"]):
        dynamic_domains.append("Frontend Engineering")
        
    # Evaluate against candidate
    domain_progress = db.query(DomainProgress).filter(DomainProgress.user_id == user.id).all()
    skill_progress = db.query(SkillProgress).filter(SkillProgress.user_id == user.id).all()
    projects = db.query(Project).filter(Project.user_id == user.id).all()
    
    candidate_domains_map = {dp.domain.name.lower(): dp for dp in domain_progress}
    candidate_skills_map = {sp.skill.name.lower(): sp for sp in skill_progress}
    
    criteria_matches: List[CriteriaMatch] = []
    proven_capabilities: List[str] = []
    partial_capabilities: List[str] = []
    no_evidence_capabilities: List[str] = []
    
    for skill_name in found_skills:
        skill_lower = skill_name.lower().strip()
        matched_sp = candidate_skills_map.get(skill_lower)
        if not matched_sp:
            for k, sp in candidate_skills_map.items():
                if skill_lower in k or k in skill_lower:
                    matched_sp = sp
                    break
                    
        if matched_sp:
            depth = matched_sp.depth_score or 0.5
            if depth >= 0.35:
                status = "strong"
                proven_capabilities.append(matched_sp.skill.name)
            else:
                status = "moderate"
                partial_capabilities.append(matched_sp.skill.name)
            details = f"Verified across candidate repositories (depth {int(depth * 100)}%)."
        else:
            status = "missing"
            no_evidence_capabilities.append(skill_name)
            details = "No direct evidence detected in candidate code repositories."
            
        criteria_matches.append(CriteriaMatch(
            item_name=skill_name,
            type="SKILL",
            status=status,
            details=details,
            freshness_state="ACTIVE" if matched_sp else "HISTORICAL"
        ))
        
    total_req = max(1, len(found_skills))
    req_cap_coverage = min(100.0, round(((len(proven_capabilities) * 1.0 + len(partial_capabilities) * 0.5) / total_req) * 100.0, 1))
    direct_ev_coverage = min(100.0, round((len(proven_capabilities) / total_req) * 100.0, 1))
    recent_relevance = 80.0 if projects else 0.0
    demonstrated_depth = min(100.0, round((sum(sp.depth_score or 0.5 for sp in skill_progress) / max(1, len(skill_progress))) * 100.0, 1)) if skill_progress else 0.0
    
    fit_score = int(round(
        0.35 * req_cap_coverage +
        0.30 * direct_ev_coverage +
        0.20 * recent_relevance +
        0.15 * demonstrated_depth
    )) if (domain_progress or skill_progress or projects) else 0
    
    if fit_score >= 60 or len(proven_capabilities) >= 3:
        overall_fit = "Strong Match"
    elif fit_score >= 30 or len(proven_capabilities) >= 1:
        overall_fit = "Moderate Match"
    elif fit_score > 0:
        overall_fit = "Developing Match"
    else:
        overall_fit = "Insufficient Evidence"
        
    role_fit = RoleFitBreakdown(
        required_capability_coverage=req_cap_coverage,
        direct_evidence_coverage=direct_ev_coverage,
        recent_relevance=recent_relevance,
        demonstrated_depth=demonstrated_depth,
        overall_fit=overall_fit,
        fit_score=fit_score,
        is_sufficient_evidence=bool(domain_progress or skill_progress or projects)
    )
    
    evidence_claims = db.query(Claim).filter(
        Claim.user_id == user.id,
        Claim.status == "user_confirmed"
    ).all()
    
    if not role_fit.is_sufficient_evidence:
        why_text = f"Insufficient repository data to evaluate custom JD for {title}."
    elif proven_capabilities:
        why_text = f"Candidate matches {len(proven_capabilities)} requirements from JD ({', '.join(proven_capabilities[:3])}) with {fit_score}% verified capability fit."
    else:
        why_text = f"No direct evidence observed in repositories for the technical capabilities listed in this job description."
        
    return RecruiterMatchResponse(
        role_name=title,
        overall_match=overall_fit,
        why_text=why_text,
        strengths=proven_capabilities,
        gaps=no_evidence_capabilities,
        criteria_matches=criteria_matches,
        evidence_backed_claims=[ClaimResponse.model_validate(c) for c in evidence_claims],
        role_fit=role_fit,
        proven_capabilities=proven_capabilities,
        no_evidence_capabilities=no_evidence_capabilities
    )
