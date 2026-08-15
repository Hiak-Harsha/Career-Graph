from pydantic import BaseModel, EmailStr, HttpUrl, ConfigDict
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
    phone: Optional[str] = None
    education: Optional[str] = None
    career_goal: Optional[str] = None
    github_username: Optional[str] = None

class UserUpdate(BaseModel):
    name: Optional[str] = None
    email: Optional[EmailStr] = None
    headline: Optional[str] = None
    bio: Optional[str] = None
    location: Optional[str] = None
    phone: Optional[str] = None
    education: Optional[str] = None
    career_goal: Optional[str] = None
    github_username: Optional[str] = None
    github_access_token: Optional[str] = None

class UserResponse(UserBase):
    id: UUID
    created_at: datetime
    updated_at: datetime
    model_config = ConfigDict(from_attributes=True)

# Structured Career History Schemas
class WorkExperienceCreate(BaseModel):
    company: str
    role: str
    location: Optional[str] = None
    start_date: str
    end_date: str = "Present"
    description: Optional[str] = None
    bullets: List[str] = []
    is_current: bool = False

class WorkExperienceResponse(WorkExperienceCreate):
    id: UUID
    user_id: UUID
    created_at: datetime
    updated_at: datetime
    model_config = ConfigDict(from_attributes=True)

class EducationCreate(BaseModel):
    institution: str
    degree: str
    field_of_study: Optional[str] = None
    start_year: Optional[str] = None
    end_year: Optional[str] = None
    grade_or_gpa: Optional[str] = None

class EducationResponse(EducationCreate):
    id: UUID
    user_id: UUID
    created_at: datetime
    updated_at: datetime
    model_config = ConfigDict(from_attributes=True)

class CertificationCreate(BaseModel):
    name: str
    issuer: str
    issue_date: Optional[str] = None
    credential_url: Optional[str] = None

class CertificationResponse(CertificationCreate):
    id: UUID
    user_id: UUID
    created_at: datetime
    model_config = ConfigDict(from_attributes=True)

class SocialLinkCreate(BaseModel):
    platform: str
    url: str
    label: Optional[str] = None

class SocialLinkResponse(SocialLinkCreate):
    id: UUID
    user_id: UUID
    created_at: datetime
    model_config = ConfigDict(from_attributes=True)

class ProfileDetailsResponse(BaseModel):
    profile: UserResponse
    work_experiences: List[WorkExperienceResponse]
    educations: List[EducationResponse]
    certifications: List[CertificationResponse]
    social_links: List[SocialLinkResponse]
    model_config = ConfigDict(from_attributes=True)

# Skill Schemas
class SkillResponse(BaseModel):
    id: UUID
    name: str
    category: Optional[str] = None
    description: Optional[str] = None
    model_config = ConfigDict(from_attributes=True)

# Domain Schemas
class DomainResponse(BaseModel):
    id: UUID
    name: str
    parent_domain_id: Optional[UUID] = None
    description: Optional[str] = None
    created_by: str
    model_config = ConfigDict(from_attributes=True)

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
    model_config = ConfigDict(from_attributes=True)

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
    model_config = ConfigDict(from_attributes=True)

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
    model_config = ConfigDict(from_attributes=True)

# Claim Schemas
class ClaimResponse(BaseModel):
    id: UUID
    claim: str
    claim_type: Optional[str] = None
    confidence: float
    status: str
    project_id: Optional[UUID] = None
    evidence: List[EvidenceResponse] = []
    model_config = ConfigDict(from_attributes=True)

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
    model_config = ConfigDict(from_attributes=True)

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
    model_config = ConfigDict(from_attributes=True)

# Portfolio response wrapper
class PortfolioResponse(BaseModel):
    profile: UserResponse
    projects: List[ProjectResponse]
    ideas: List[IdeaResponse]
    domain_progress: List[DomainProgressResponse]
    skills: List[SkillProgressResponse]
    problem_solving_profile: Dict[str, Any]
    timeline: List[Dict[str, Any]]
    work_experiences: List[WorkExperienceResponse] = []
    educations: List[EducationResponse] = []
    certifications: List[CertificationResponse] = []
    social_links: List[SocialLinkResponse] = []

# Persisted Resume Schemas
class ResumeItem(BaseModel):
    id: UUID
    title: str
    description: str
    skills: List[str]
    evidence_links: List[Dict[str, str]]
    narrative: str
    selected_reasons: Optional[List[str]] = []
    included: Optional[bool] = True
    custom_bullets: Optional[List[str]] = []

class ResumeResponse(BaseModel):
    id: Optional[UUID] = None
    target_role: str
    profile: UserResponse
    summary: str
    projects: List[ResumeItem]
    skills: List[str]
    claims: List[str]
    variant: Optional[str] = "visual"
    title: Optional[str] = "Master Resume"
    experience: Optional[List[Dict[str, Any]]] = []
    education: Optional[List[Dict[str, Any]]] = []
    certifications: Optional[List[Dict[str, Any]]] = []
    links: Optional[List[Dict[str, Any]]] = []
    is_primary: Optional[bool] = False
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

class ResumeSaveRequest(BaseModel):
    title: Optional[str] = "Master Resume"
    target_role: Optional[str] = "Software Engineer"
    variant: Optional[str] = "visual"
    summary: Optional[str] = ""
    skills: Optional[List[str]] = []
    claims: Optional[List[str]] = []
    projects: Optional[List[ResumeItem]] = []
    experience: Optional[List[Dict[str, Any]]] = []
    education: Optional[List[Dict[str, Any]]] = []
    certifications: Optional[List[Dict[str, Any]]] = []
    links: Optional[List[Dict[str, Any]]] = []
    is_primary: Optional[bool] = False

class AIImproveRequest(BaseModel):
    field_type: str  # 'summary' or 'bullet'
    text: str
    target_role: Optional[str] = "Software Engineer"
    context: Optional[str] = None

class AIImproveResponse(BaseModel):
    improved_text: str
    suggestions: Optional[List[str]] = []

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
