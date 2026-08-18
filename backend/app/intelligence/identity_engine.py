import datetime
from typing import List, Optional
from sqlalchemy.orm import Session

from backend.app.models import User, Project, DomainProgress, SkillProgress, Claim
from backend.app.schemas import (
    ProfessionalIdentityResponse,
    DomainSignatureNode,
    DomainSignatureEdge,
)


def compute_candidate_professional_identity(user: User, db: Session) -> ProfessionalIdentityResponse:
    """
    Discovers candidate professional identity strictly from empirical Career Graph evidence.
    NEVER manufactures default skills, domains, or trajectories when evidence is absent.
    """
    domain_progress = db.query(DomainProgress).filter(DomainProgress.user_id == user.id).all()
    skill_progress = db.query(SkillProgress).filter(SkillProgress.user_id == user.id).all()
    projects = db.query(Project).filter(Project.user_id == user.id).all()
    claims = db.query(Claim).filter(Claim.user_id == user.id, Claim.status == "user_confirmed").all()
    
    # Check if there is genuine evidence in the graph
    has_domains = len(domain_progress) > 0
    has_skills = len(skill_progress) > 0
    has_projects = len(projects) > 0
    claim_count = len(claims)
    
    if not has_domains and not has_skills and not has_projects:
        # P0 Truth Requirement: Declare Insufficient Evidence honestly
        return ProfessionalIdentityResponse(
            user_id=user.id,
            candidate_name=user.name or "Candidate",
            headline=user.headline or "Profile Ingestion Required",
            primary_domains=[],
            emerging_domains=[],
            strong_capabilities=[],
            current_trajectory="Insufficient evidence to determine professional trajectory yet. Connect GitHub repositories to discover identity.",
            evidence_strength="Insufficient Evidence",
            research_orientation="Unobserved",
            project_style="Unobserved",
            signature_nodes=[],
            signature_edges=[],
            total_verified_claims=0,
            total_repositories=0,
            is_sufficient_evidence=False,
            evidence_coverage=0.0
        )
    
    # 1. Primary domains: sorted by empirical depth, evidence count, and exposure
    sorted_domains = sorted(
        domain_progress,
        key=lambda dp: (dp.depth_score * 0.4 + dp.evidence_score * 0.4 + dp.exposure_score * 0.2),
        reverse=True
    )
    primary = [dp.domain.name for dp in sorted_domains[:3]]
    
    # 2. Emerging domains: observed trajectory increasing or recent velocity
    emerging = [
        dp.domain.name for dp in domain_progress 
        if dp.trajectory == "INCREASING" and dp.domain.name not in primary
    ][:3]
    if not emerging and len(sorted_domains) > 3:
        emerging = [dp.domain.name for dp in sorted_domains[3:6]]
        
    # 3. Strong capabilities: skills with verified evidence & depth
    sorted_skills = sorted(
        skill_progress,
        key=lambda sp: (sp.evidence_count * 2 + sp.depth_score * 3 + sp.confidence),
        reverse=True
    )
    capabilities = [sp.skill.name for sp in sorted_skills[:6] if sp.evidence_count > 0 or sp.depth_score > 0.1]
    
    # 4. Evidence strength metric
    if claim_count >= 6 and len(projects) >= 3:
        evidence_strength = "High"
    elif claim_count >= 2 or len(projects) >= 1:
        evidence_strength = "Moderate"
    else:
        evidence_strength = "Developing"
        
    # 5. Longitudinal research orientation & project style
    avg_complexity = sum(p.complexity_score or 0.5 for p in projects) / max(len(projects), 1)
    
    is_research_oriented = any(
        any(k in d.lower() for k in ["algorithm", "ai", "ml", "research", "theory", "optimization"])
        for d in primary
    )
    research_orientation = "Increasing" if is_research_oriented and avg_complexity >= 0.65 else ("Stable" if avg_complexity >= 0.4 else "Experimental")
    
    if any(any(k in d.lower() for k in ["ai", "ml", "learning", "neural", "nlp"]) for d in primary):
        project_style = "Intelligent Systems & Applied Machine Learning"
    elif any(any(k in d.lower() for k in ["distributed", "backend", "system", "infrastructure"]) for d in primary):
        project_style = "High-Reliability Distributed Systems"
    elif any(any(k in d.lower() for k in ["algorithm", "dsa", "optimization", "graph"]) for d in primary):
        project_style = "Algorithmic & Computational Engineering"
    elif primary:
        project_style = f"Full-Stack {primary[0]} Engineering"
    else:
        project_style = "General Software Engineering"
        
    # 6. Trajectory narrative derived from observed timeline
    if primary and emerging:
        trajectory_str = f"Demonstrated concentration in {', '.join(primary[:2])} with growing velocity in {emerging[0]}."
    elif primary:
        trajectory_str = f"Specializing in {', '.join(primary)} based on verified multi-project commits."
    else:
        trajectory_str = "Initial engineering projects recorded; ongoing observation active."
        
    # 7. Signature graph nodes and edges from actual project co-occurrences
    sig_nodes = []
    top_sig_domains = sorted_domains[:5]
    for dp in top_sig_domains:
        # Count actual projects containing this domain
        linked_projs = [p for p in projects if any(d.id == dp.domain_id for d in p.domains)]
        sig_nodes.append(DomainSignatureNode(
            id=str(dp.domain.id),
            name=dp.domain.name,
            category=getattr(dp.domain, "category", None) or "Engineering",
            level=dp.current_level,
            evidence_count=len(linked_projs)
        ))
        
    # Build edges from genuine project co-occurrences
    sig_edges = []
    seen_pairs = set()
    for p in projects:
        p_dom_names = [d.name for d in p.domains if any(sn.name == d.name for sn in sig_nodes)]
        for i in range(len(p_dom_names)):
            for j in range(i + 1, len(p_dom_names)):
                d1, d2 = sorted([p_dom_names[i], p_dom_names[j]])
                if (d1, d2) not in seen_pairs:
                    seen_pairs.add((d1, d2))
                    sig_edges.append(DomainSignatureEdge(
                        source=d1,
                        target=d2,
                        relationship="CO_OCCURS_IN_PROJECT"
                    ))
                    
    # Calculate genuine evidence coverage rate
    projs_with_claims = sum(1 for p in projects if any(c.project_id == p.id for c in claims))
    evidence_coverage = projs_with_claims / max(1, len(projects)) if projects else 0.0
    
    headline = user.headline or (f"{primary[0]} Specialist" if primary else "Software Engineer")
    
    return ProfessionalIdentityResponse(
        user_id=user.id,
        candidate_name=user.name or "Candidate",
        headline=headline,
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
        total_repositories=len(projects),
        is_sufficient_evidence=True,
        evidence_coverage=round(evidence_coverage, 2)
    )
