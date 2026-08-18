import datetime
from typing import List, Optional, Dict, Any
# pyrefly: ignore [missing-import]
from sqlalchemy.orm import Session

from backend.app.models import User, Project, DomainProgress, SkillProgress, Claim, WorkExperience, Education, Certification
from backend.app.schemas import (
    ResumeStrategyResponse,
    ResumeBlockItem,
    ResumeBlockRepresentation,
    ResumeCritiqueResponse,
    ReadinessDimension,
    RoleFitBreakdown,
)
from backend.app.intelligence.identity_engine import compute_candidate_professional_identity
from backend.app.intelligence.recruiter_engine import compute_mathematical_role_fit, get_role_competency_matrix


def generate_resume_strategy_for_role(
    user: User,
    role: str,
    db: Session,
    layout_pref: Optional[str] = None
) -> ResumeStrategyResponse:
    """
    Curates role-specific representation strategy from genuine Career Graph evidence.
    Does NOT manufacture default skills, fake 0.92 scores, or generic fabricated weaknesses.
    """
    identity = compute_candidate_professional_identity(user, db)
    role_fit, criteria_matches, proven, partial, no_evidence = compute_mathematical_role_fit(user, role, db)
    
    projects = db.query(Project).filter(Project.user_id == user.id).all()
    
    if not identity.is_sufficient_evidence:
        return ResumeStrategyResponse(
            target_role=role,
            candidate_positioning=f"Candidate profile ingestion required. Connect GitHub repositories to discover role-aligned capabilities for {role}.",
            primary_domains=[],
            supporting_domains=[],
            projects_to_highlight=[],
            skills_to_emphasize=[],
            evidence_priorities=["Connect GitHub account to establish initial evidence baseline"],
            weak_areas=[],
            unsupported_capabilities=no_evidence,
            suggested_layout=layout_pref or "modern_professional",
            role_alignment_score=0.0,
            role_fit=role_fit,
            is_sufficient_evidence=False
        )
        
    role_lower = role.lower()
    
    # 1. Filter & rank candidate projects for target role
    scored_projects = []
    for p in projects:
        score = p.complexity_score or 0.5
        p_title = (p.title or "").lower()
        p_desc = (p.description or "").lower()
        
        # Match project keywords against role
        if any(k in role_lower for k in ["ml", "machine learning", "ai", "intelligence"]):
            if any(k in p_title or k in p_desc for k in ["ml", "ai", "model", "nlp", "classification", "learn", "data"]):
                score += 0.5
        elif any(k in role_lower for k in ["backend", "system", "distributed", "server"]):
            if any(k in p_title or k in p_desc for k in ["backend", "api", "server", "repo", "analyzer", "database", "graph"]):
                score += 0.5
        elif "research" in role_lower:
            if any(k in p_title or k in p_desc for k in ["algorithm", "detector", "analyzer", "graph", "paper", "theory"]):
                score += 0.5
        else:
            score += 0.2
            
        scored_projects.append((p.title, score))
        
    scored_projects.sort(key=lambda x: x[1], reverse=True)
    highlight_projects = [sp[0] for sp in scored_projects[:3]] or [p.title for p in projects[:3]]
    
    # 2. Derive genuine skills to emphasize from candidate's proven capabilities
    skills_to_emphasize = proven[:5] if proven else (identity.strong_capabilities[:5] if identity.strong_capabilities else [])
    
    # 3. Honest positioning thesis
    if proven:
        candidate_positioning = f"Engineer specializing in {', '.join(identity.primary_domains[:2]) if identity.primary_domains else 'software systems'} with proven evidence in {', '.join(proven[:3])}."
    elif identity.primary_domains:
        candidate_positioning = f"Practitioner with verified project concentration across {', '.join(identity.primary_domains)}."
    else:
        candidate_positioning = f"Practicing engineer with initial projects in {role}."
        
    suggested_layout = layout_pref or ("technical" if "backend" in role_lower or "systems" in role_lower else ("research" if "research" in role_lower else "modern_professional"))
    
    # Mathematical role alignment score (0.0 - 1.0)
    role_alignment_score = round(role_fit.fit_score / 100.0, 2)
    
    return ResumeStrategyResponse(
        target_role=role,
        candidate_positioning=candidate_positioning,
        primary_domains=identity.primary_domains,
        supporting_domains=identity.emerging_domains,
        projects_to_highlight=highlight_projects,
        skills_to_emphasize=skills_to_emphasize,
        evidence_priorities=[f"Verified commits across {p}" for p in highlight_projects[:2]],
        weak_areas=[],  # Never fabricate generic weaknesses
        unsupported_capabilities=no_evidence,  # Honest "No Evidence Detected" capabilities
        suggested_layout=suggested_layout,
        role_alignment_score=role_alignment_score,
        role_fit=role_fit,
        is_sufficient_evidence=True
    )


def generate_blocks_representation_from_strategy(
    user: User,
    strategy: ResumeStrategyResponse,
    db: Session,
    layout_personality: Optional[str] = None
) -> ResumeBlockRepresentation:
    """
    Constructs structured modular block representation for the resume.
    Ensures zero fabricated claims or synthetic fallback technologies.
    """
    identity = compute_candidate_professional_identity(user, db)
    projects = db.query(Project).filter(Project.user_id == user.id).all()
    domain_progress = db.query(DomainProgress).filter(DomainProgress.user_id == user.id).all()
    claims = db.query(Claim).filter(Claim.user_id == user.id, Claim.status == "user_confirmed").all()
    work_exps = db.query(WorkExperience).filter(WorkExperience.user_id == user.id).all()
    educations = db.query(Education).filter(Education.user_id == user.id).all()
    certs = db.query(Certification).filter(Certification.user_id == user.id).all()
    
    personality = layout_personality or strategy.suggested_layout or "modern_professional"
    blocks: List[ResumeBlockItem] = []
    
    # Block 1: Identity Block
    blocks.append(ResumeBlockItem(
        block_type="identity",
        title="Identity",
        order=1,
        content_payload={
            "name": user.name or "Candidate",
            "headline": f"{strategy.target_role.upper()} · {identity.primary_domains[0].upper()}" if identity.primary_domains else strategy.target_role.upper(),
            "email": user.email or "",
            "location": user.location or "",
            "github": user.github_username or "",
            "evidence_strength": identity.evidence_strength
        }
    ))
    
    # Block 2: Professional Signature (if graph nodes exist)
    if identity.signature_nodes:
        blocks.append(ResumeBlockItem(
            block_type="signature",
            title="Professional Signature Graph",
            order=2,
            content_payload={
                "nodes": [n.model_dump() for n in identity.signature_nodes],
                "edges": [e.model_dump() for e in identity.signature_edges],
                "primary_domains": identity.primary_domains,
                "project_style": identity.project_style
            }
        ))
        
    # Block 3: Core Positioning Block
    blocks.append(ResumeBlockItem(
        block_type="positioning",
        title="Positioning",
        order=3,
        content_payload={
            "statement": strategy.candidate_positioning,
            "evidence_strength": identity.evidence_strength,
            "summary_bullets": [
                f"Demonstrated concentration across {', '.join(identity.primary_domains)}" if identity.primary_domains else "Active engineering repository baseline",
                f"Research & algorithmic orientation: {identity.research_orientation}",
                f"Observed project velocity: {identity.current_trajectory}"
            ]
        }
    ))
    
    # Block 4: Selected Work Block (Real candidate projects only)
    selected_projs = []
    for p in projects:
        if strategy.projects_to_highlight and p.title not in strategy.projects_to_highlight and len(selected_projs) >= 2:
            continue
            
        proj_claims = [c for c in claims if c.project_id == p.id]
        evidence_claim_items = []
        for c in proj_claims:
            has_evidence = len(c.evidence) > 0 if hasattr(c, "evidence") and c.evidence else False
            provenance = "EVIDENCE_VERIFIED" if (has_evidence and c.status == "user_confirmed") else "USER_DECLARED" if c.status == "user_confirmed" else "UNVERIFIED"
            evidence_claim_items.append({
                "id": str(c.id),
                "claim": c.claim,
                "confidence": c.confidence,
                "type": c.claim_type or "SYSTEM",
                "has_evidence": has_evidence,
                "provenance": provenance
            })
            
        # Collect genuine project skills
        proj_techs = [s.name for s in p.skills] if p.skills else []
        
        selected_projs.append({
            "id": str(p.id),
            "title": p.title,
            "description": p.description or "",
            "technologies": proj_techs,
            "complexity_score": p.complexity_score or 0.5,
            "evidence_claims": evidence_claim_items,
            "repository_url": getattr(p, "repository_url", None) or getattr(p, "github_url", None) or ""
        })
        
    blocks.append(ResumeBlockItem(
        block_type="selected_work",
        title="Selected Work & Systems",
        order=4,
        content_payload={
            "projects": selected_projs
        }
    ))
    
    # Block 5: Technical Depth Block (Evidence-backed clusters from candidate's actual data)
    depth_clusters = []
    for dp in domain_progress[:4]:
        # Gather observed skills for this domain
        domain_skills = [sp.skill.name for sp in db.query(SkillProgress).filter(SkillProgress.user_id == user.id).all()[:3]]
        linked_count = len([p for p in projects if any(d.id == dp.domain_id for d in p.domains)])
        depth_clusters.append({
            "domain": dp.domain.name,
            "capabilities": " · ".join(domain_skills) if domain_skills else "Core Domain Practice",
            "evidence_note": f"{linked_count} verified project artifacts · {dp.current_level.capitalize()}"
        })
        
    blocks.append(ResumeBlockItem(
        block_type="technical_depth",
        title="Technical Depth & Capabilities",
        order=5,
        content_payload={
            "clusters": depth_clusters
        }
    ))
    
    # Block 6: Trajectory Block
    blocks.append(ResumeBlockItem(
        block_type="trajectory",
        title="Current Trajectory & Next Horizons",
        order=6,
        content_payload={
            "trajectory_text": identity.current_trajectory,
            "next_horizons": identity.emerging_domains
        }
    ))
    
    # Block 7: Experience Block
    if work_exps:
        blocks.append(ResumeBlockItem(
            block_type="experience",
            title="Work Experience",
            order=7,
            content_payload={
                "experiences": [
                    {
                        "role": exp.role,
                        "company": exp.company,
                        "start_date": exp.start_date,
                        "end_date": exp.end_date,
                        "bullets": exp.bullets or []
                    }
                    for exp in work_exps
                ]
            }
        ))
        
    # Block 8: Education Block
    if educations:
        blocks.append(ResumeBlockItem(
            block_type="education",
            title="Education",
            order=8,
            content_payload={
                "educations": [
                    {
                        "degree": edu.degree,
                        "institution": edu.institution,
                        "field_of_study": edu.field_of_study,
                        "start_year": edu.start_year,
                        "end_year": edu.end_year
                    }
                    for edu in educations
                ]
            }
        ))
        
    # Block 9: Certifications Block
    if certs:
        blocks.append(ResumeBlockItem(
            block_type="certifications",
            title="Certifications & Validations",
            order=9,
            content_payload={
                "certifications": [
                    {
                        "name": cert.name,
                        "issuer": cert.issuer,
                        "issue_date": cert.issue_date,
                        "credential_url": cert.credential_url
                    }
                    for cert in certs
                ]
            }
        ))

    # Block 10: Achievements Block
    top_claims = (
        db.query(Claim)
        .filter(Claim.user_id == user.id, Claim.status != "user_rejected")
        .order_by(Claim.confidence.desc())
        .limit(4)
        .all()
    )
    achievements = []
    for i, c in enumerate(top_claims):
        has_evidence = len(c.evidence) > 0 if hasattr(c, "evidence") and c.evidence else False
        provenance = "EVIDENCE_VERIFIED" if (has_evidence and c.status == "user_confirmed") else "USER_DECLARED" if c.status == "user_confirmed" else "UNVERIFIED"
        achievements.append({
            "icon": "Award" if i == 0 else "ShieldCheck" if i == 1 else "Zap" if i == 2 else "Code",
            "title": c.claim[:50],
            "description": c.claim,
            "confidence": c.confidence,
            "claim_id": str(c.id),
            "has_evidence": has_evidence,
            "provenance": provenance
        })

    blocks.append(ResumeBlockItem(
        block_type="achievements",
        title="Key Achievements & Verified Proofs",
        order=len(blocks) + 1,
        content_payload={"achievements": achievements}
    ))
        
    # Calculate genuine verification and evidence coverage rates
    all_claim_items = [c for p in selected_projs for c in p.get("evidence_claims", [])] + achievements
    total_claims_in_rep = len(all_claim_items)
    verified_claims_in_rep = sum(1 for c in all_claim_items if c.get("provenance") == "EVIDENCE_VERIFIED")
    
    verification_rate = round(verified_claims_in_rep / max(1, total_claims_in_rep), 2) if total_claims_in_rep > 0 else 0.0
    
    # Evidence coverage rate: claim-level ratio across all selected projects
    total_proj_claims = sum(len(p.get("evidence_claims", [])) for p in selected_projs)
    proj_claims_with_evidence = sum(sum(1 for c in p.get("evidence_claims", []) if c.get("has_evidence")) for p in selected_projs)
    ev_coverage = round(proj_claims_with_evidence / max(1, total_proj_claims), 2) if total_proj_claims > 0 else (1.0 if selected_projs and not total_proj_claims else 0.0)
    
    return ResumeBlockRepresentation(
        target_role=strategy.target_role,
        layout_personality=personality,
        resume_format="ats_clean" if personality in ("featured", "ats_clean") else "visual",
        positioning_statement=strategy.candidate_positioning,
        blocks=blocks,
        evidence_coverage_rate=ev_coverage,
        verification_rate=verification_rate,
        generated_at=datetime.datetime.now(datetime.timezone.utc)
    )


def build_featured_resume(user: User, db: Session, resume_format: str = "ats_clean") -> ResumeBlockRepresentation:
    """Evaluates candidate competencies against available roles and returns the optimal Featured Resume."""
    candidate_roles = [
        "AI / ML Engineer",
        "Backend Systems Engineer",
        "Research Engineer",
        "Full Stack Engineer"
    ]
    scored = [
        (role, generate_resume_strategy_for_role(user, role, db, "featured"))
        for role in candidate_roles
    ]
    _, best_strategy = max(scored, key=lambda pair: pair[1].role_alignment_score)
    rep = generate_blocks_representation_from_strategy(user, best_strategy, db, "featured")
    rep.resume_format = resume_format
    return rep


def generate_recruiter_critique_for_role(
    user: User,
    role: str,
    db: Session
) -> ResumeCritiqueResponse:
    """Generates genuine recruiter 10-second attention breakdown and multi-dimensional readiness scores."""
    identity = compute_candidate_professional_identity(user, db)
    role_fit, criteria_matches, proven, partial, no_evidence = compute_mathematical_role_fit(user, role, db)
    
    # 1. Multi-dimensional readiness scores with mathematical grounding
    readiness_dims: List[ReadinessDimension] = [
        ReadinessDimension(
            dimension="Role Relevance",
            rating="Strong" if role_fit.required_capability_coverage >= 70 else ("Moderate" if role_fit.required_capability_coverage >= 40 else "Developing"),
            score=int(role_fit.required_capability_coverage),
            insight=f"{int(role_fit.required_capability_coverage)}% of required capabilities for {role} are verified in your Career Graph."
        ),
        ReadinessDimension(
            dimension="Direct Project Evidence",
            rating="Strong" if role_fit.direct_evidence_coverage >= 60 else ("Moderate" if role_fit.direct_evidence_coverage >= 30 else "Developing"),
            score=int(role_fit.direct_evidence_coverage),
            insight=f"{int(role_fit.direct_evidence_coverage)}% of requirements are substantiated by direct repository code commits."
        ),
        ReadinessDimension(
            dimension="Evidence Freshness & Recency",
            rating="Strong" if role_fit.recent_relevance >= 70 else ("Moderate" if role_fit.recent_relevance >= 40 else "Developing"),
            score=int(role_fit.recent_relevance),
            insight=f"{int(role_fit.recent_relevance)}% of demonstrated technical skills reflect active recent engineering activity."
        ),
        ReadinessDimension(
            dimension="Demonstrated Technical Depth",
            rating="Strong" if role_fit.demonstrated_depth >= 60 else ("Moderate" if role_fit.demonstrated_depth >= 35 else "Developing"),
            score=int(role_fit.demonstrated_depth),
            insight=f"Evaluated engineering depth of {int(role_fit.demonstrated_depth)}% across verified domain topologies."
        ),
    ]
    
    # 2. 10-Second Recruiter Attention Model
    attention_hierarchy = {
        "0_to_3s": f"Candidate Identity: {user.name or 'Candidate'} · Specialization: {', '.join(identity.primary_domains[:2]) if identity.primary_domains else 'Software Engineering'}.",
        "3_to_8s": f"Demonstrated Skills: {', '.join(proven[:3]) if proven else 'General Systems Practice'}.",
        "8_to_18s": f"Project Systems: {identity.total_repositories} verified repositories with {identity.total_verified_claims} empirical claims.",
        "18_to_30s": f"Longitudinal Trajectory: {identity.current_trajectory}"
    }
    
    # 3. Discover genuine communication gaps (unhighlighted strengths or missing evidence)
    gaps: List[str] = []
    if no_evidence:
        gaps.append(f"No direct code evidence observed for: {', '.join(no_evidence[:3])}. Consider adding projects in these areas.")
    if len(identity.primary_domains) > 2 and not any(k in role.lower() for k in ["full stack", "general"]):
        gaps.append(f"Your Career Graph shows substantial depth in {identity.primary_domains[-1]}, which is currently omitted from your {role} positioning.")
        
    improvements = [
        "Include clickable proof drawer links on key systems claims",
        f"Foreground verified code commits for {proven[0]}" if proven else "Connect active GitHub repositories"
    ]
    
    return ResumeCritiqueResponse(
        target_role=role,
        readiness_dimensions=readiness_dims,
        overall_readiness=role_fit.overall_fit,
        recruiter_attention_hierarchy=attention_hierarchy,
        fails_to_communicate_gaps=gaps,
        recommended_improvements=improvements
    )
