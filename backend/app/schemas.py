from pydantic import BaseModel, EmailStr, HttpUrl
from typing import List, Optional, Dict, Any
from datetime import datetime, date
from uuid import UUID

# User Schemas
class UserBase(BaseModel):
    name: str
    email: EmailStr
    headline: Optional[str] = None
    bio: Optional[str] = None
    location: Optional[str] = None
    education: Optional[str] = None
    career_goal: Optional[str] = None
    github_username: Optional[str] = None

class UserUpdate(BaseModel):
    name: Optional[str] = None
    email: Optional[EmailStr] = None
    headline: Optional[str] = None
    bio: Optional[str] = None
    location: Optional[str] = None
    education: Optional[str] = None
    career_goal: Optional[str] = None
    github_username: Optional[str] = None
    github_access_token: Optional[str] = None

class UserResponse(UserBase):
    id: UUID
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True

# Skill Schemas
class SkillResponse(BaseModel):
    id: UUID
    name: str
    category: Optional[str] = None
    description: Optional[str] = None

    class Config:
        from_attributes = True

# Domain Schemas
class DomainResponse(BaseModel):
    id: UUID
    name: str
    parent_domain_id: Optional[UUID] = None
    description: Optional[str] = None
    created_by: str

    class Config:
        from_attributes = True

# Project Schemas
class ProjectBase(BaseModel):
    title: str
    description: Optional[str] = None
    status: str
    project_type: str
    started_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None
    repository_url: Optional[str] = None
    demo_url: Optional[str] = None
    complexity_score: float = 0.0
    individual_or_team: str = "INDIVIDUAL"

class ProjectCreate(ProjectBase):
    pass

class ProjectResponse(ProjectBase):
    id: UUID
    user_id: UUID
    skills: List[SkillResponse] = []
    domains: List[DomainResponse] = []
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True

# Idea Schemas
class IdeaBase(BaseModel):
    title: str
    description: Optional[str] = None
    status: str = "EXPLORING"
    maturity: str = "EARLY"
    parent_project_id: Optional[UUID] = None

class IdeaCreate(IdeaBase):
    pass

class IdeaResponse(IdeaBase):
    id: UUID
    user_id: UUID
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True

# Evidence Schemas
class EvidenceResponse(BaseModel):
    id: UUID
    type: str
    source: str
    source_url: Optional[str] = None
    source_identifier: Optional[str] = None
    content: Optional[str] = None
    captured_at: datetime
    confidence: float

    class Config:
        from_attributes = True

# Claim Schemas
class ClaimResponse(BaseModel):
    id: UUID
    claim: str
    claim_type: Optional[str] = None
    confidence: float
    status: str
    project_id: Optional[UUID] = None
    evidence: List[EvidenceResponse] = []

    class Config:
        from_attributes = True

# Progress Schemas
class DomainProgressResponse(BaseModel):
    domain: DomainResponse
    exposure_score: float
    activity_score: float
    evidence_score: float
    depth_score: float
    recency_score: float
    current_level: str
    trajectory: str
    first_detected: Optional[datetime] = None
    last_active: Optional[datetime] = None

    class Config:
        from_attributes = True

class SkillProgressResponse(BaseModel):
    skill: SkillResponse
    evidence_count: int
    usage_frequency: float
    depth_score: float
    recency_score: float
    confidence: float
    trajectory: str
    current_level: str
    first_seen: Optional[datetime] = None
    last_used: Optional[datetime] = None

    class Config:
        from_attributes = True

# Portfolio response wrapper
class PortfolioResponse(BaseModel):
    profile: UserResponse
    projects: List[ProjectResponse]
    ideas: List[IdeaResponse]
    domain_progress: List[DomainProgressResponse]
    skills: List[SkillProgressResponse]
    problem_solving_profile: Dict[str, Any]
    timeline: List[Dict[str, Any]]

# Dynamic Resume Schemas
class ResumeItem(BaseModel):
    id: UUID
    title: str
    description: str
    skills: List[str]
    evidence_links: List[Dict[str, str]]
    narrative: str

class ResumeResponse(BaseModel):
    target_role: str
    profile: UserResponse
    summary: str
    projects: List[ResumeItem]
    skills: List[str]
    claims: List[str]

# Recruiter Role Match Schemas
class CriteriaMatch(BaseModel):
    item_name: str
    type: str  # 'skill' or 'domain'
    status: str  # 'strong', 'moderate', 'weak', 'missing'
    details: str

class RecruiterMatchResponse(BaseModel):
    role_name: str
    overall_match: str  # 'Strong Match', 'Moderate Match', 'Developing Match'
    why_text: str
    strengths: List[str]
    gaps: List[str]
    criteria_matches: List[CriteriaMatch]
    evidence_backed_claims: List[ClaimResponse]

# Auth Schemas
class Token(BaseModel):
    access_token: str
    token_type: str
    user_id: UUID

class GitHubAuthCode(BaseModel):
    code: str
