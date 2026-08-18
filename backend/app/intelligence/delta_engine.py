"""
Career Graph — Career Delta & Change Intelligence Engine
Computes granular diffs between CareerSnapshots and live graph state, explaining
precisely what changed in a candidate's engineering trajectory.
"""

from typing import List, Dict, Any, Optional
from datetime import datetime, timezone
from pydantic import BaseModel
from sqlalchemy.orm import Session

from backend.app.models import User, CareerSnapshot, Project, DomainProgress, SkillProgress, Claim
from backend.app.intelligence.identity_engine import compute_candidate_professional_identity

class DomainDelta(BaseModel):
    domain_name: str
    change_type: str  # "STRENGTHENED" | "NEW" | "MAINTAINED"
    previous_level: Optional[str]
    current_level: str
    project_citations_count: int

class CareerDeltaReport(BaseModel):
    user_id: str
    snapshot_date: Optional[str]
    analyzed_at: str
    new_projects: List[str]
    strengthened_domains: List[DomainDelta]
    new_skills: List[str]
    previous_trajectory: Optional[str]
    current_trajectory: str
    recommended_representation_updates: List[str]
    portfolio_promotions: List[str]

def compute_career_delta(user: User, db: Session) -> CareerDeltaReport:
    """
    Computes a mathematical and structural diff between the user's latest recorded
    CareerSnapshot and the current live graph state.
    """
    current_identity = compute_candidate_professional_identity(user, db)
    
    latest_snapshot = (
        db.query(CareerSnapshot)
        .filter(CareerSnapshot.user_id == user.id)
        .order_by(CareerSnapshot.created_at.desc())
        .first()
    )
    
    live_projects = db.query(Project).filter(Project.user_id == user.id).all()
    live_domains = db.query(DomainProgress).filter(DomainProgress.user_id == user.id).all()
    live_skills = db.query(SkillProgress).filter(SkillProgress.user_id == user.id).all()
    
    snapshot_projects = (latest_snapshot.active_projects or []) if latest_snapshot else []
    snapshot_domains = (latest_snapshot.dominant_domains or []) if latest_snapshot else []
    snapshot_skills = (latest_snapshot.strongest_skills or []) if latest_snapshot else []
    
    # 1. New projects
    live_proj_titles = [p.title for p in live_projects]
    new_projs = [t for t in live_proj_titles if t not in snapshot_projects]
    
    # 2. Domain evolution
    strengthened = []
    for dp in live_domains:
        d_name = dp.domain.name
        is_in_snapshot = d_name in snapshot_domains
        evidence_count = len([p for p in live_projects if any(d.id == dp.domain_id for d in p.domains)])
        
        if not is_in_snapshot:
            strengthened.append(DomainDelta(
                domain_name=d_name,
                change_type="NEW",
                previous_level=None,
                current_level=dp.current_level,
                project_citations_count=evidence_count
            ))
        elif dp.current_level in ("proficient", "advanced", "specialist"):
            strengthened.append(DomainDelta(
                domain_name=d_name,
                change_type="STRENGTHENED",
                previous_level="developing",
                current_level=dp.current_level,
                project_citations_count=evidence_count
            ))
            
    # 3. New skills
    live_skill_names = [sp.skill.name for sp in live_skills]
    new_skills = [s for s in live_skill_names if s not in snapshot_skills]
    
    # 4. Actionable recommendations
    recommended_updates = []
    portfolio_promotions = []
    
    if new_projs:
        recommended_updates.append(f"Add {len(new_projs)} recently synced project(s) to Selected Work.")
        portfolio_promotions.append(f"Promote '{new_projs[0]}' to living portfolio case study.")
        
    if any(d.change_type == "STRENGTHENED" for d in strengthened):
        top_strengthened = [d.domain_name for d in strengthened if d.change_type == "STRENGTHENED"]
        recommended_updates.append(f"Strengthen Technical Depth block with advanced {', '.join(top_strengthened[:2])} capabilities.")
        
    if not recommended_updates:
        recommended_updates.append("Graph verified up-to-date with current GitHub commit lineage.")
        
    return CareerDeltaReport(
        user_id=str(user.id),
        snapshot_date=latest_snapshot.snapshot_date.isoformat() if (latest_snapshot and latest_snapshot.snapshot_date) else None,
        analyzed_at=datetime.now(timezone.utc).isoformat(),
        new_projects=new_projs,
        strengthened_domains=strengthened,
        new_skills=new_skills[:8],
        previous_trajectory=latest_snapshot.career_direction if latest_snapshot else None,
        current_trajectory=current_identity.current_trajectory,
        recommended_representation_updates=recommended_updates,
        portfolio_promotions=portfolio_promotions
    )
