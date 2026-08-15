// ─── Core Entity Types ──────────────────────────────────────────────────────

export interface UserProfile {
  id: string;
  name: string;
  email: string;
  headline?: string;
  bio?: string;
  location?: string;
  github_username?: string;
  career_goal?: string;
  education?: string;
  created_at: string;
  updated_at: string;
}

export interface Skill {
  id: string;
  name: string;
  category?: string; // LANGUAGE | LIBRARY | FRAMEWORK | DATABASE | CONCEPT | TOOL | CLOUD
  description?: string;
}

export interface Domain {
  id: string;
  name: string;
  description?: string;
  parent_domain_id?: string;
  created_by?: string;
}

export interface Evidence {
  id: string;
  type: string; // GITHUB_COMMIT | GITHUB_PR | GITHUB_RELEASE | README | DOCUMENT | SOURCE_FILE
  source: string;
  source_url?: string;
  source_identifier?: string;
  content?: string;
  captured_at: string;
  confidence: number;
}

export interface Claim {
  id: string;
  claim: string;
  claim_type?: string; // TECHNICAL_ACHIEVEMENT | DOMAIN_EXPERTISE | ARCHITECTURE | OPTIMIZATION
  confidence: number;
  origin?: string; // DETERMINISTIC | AI_PROPOSED
  status?: string; // ai_suggested | user_confirmed | user_rejected
  project_id?: string;
  evidence: Evidence[];
}

// ─── Project Types ───────────────────────────────────────────────────────────

export type ProjectStatus =
  | "IDEA"
  | "EXPLORING"
  | "PLANNED"
  | "ACTIVE"
  | "COMPLETED"
  | "MAINTAINED"
  | "PAUSED";

export type ProjectType =
  | "PERSONAL"
  | "ACADEMIC"
  | "RESEARCH"
  | "PROFESSIONAL"
  | "HACKATHON";

export interface Project {
  id: string;
  title: string;
  description?: string;
  status: ProjectStatus;
  project_type: ProjectType;
  complexity_score?: number;
  repository_url?: string;
  demo_url?: string;
  started_at?: string;
  completed_at?: string;
  updated_at?: string;
  skills?: Skill[];
  domains?: Domain[];
  claims?: Claim[];
}

// ─── Progress Types ──────────────────────────────────────────────────────────

export type ProgressLevel =
  | "EXPOSURE"
  | "PRACTICING"
  | "DEVELOPING"
  | "PROFICIENT"
  | "STRONG"
  | "ADVANCED";

export type Trajectory = "DECREASING" | "STABLE" | "INCREASING";

export interface DomainProgress {
  id?: string;
  domain: Domain;
  exposure_score: number;
  activity_score: number;
  evidence_score: number;
  depth_score: number;
  recency_score: number;
  current_level: ProgressLevel;
  trajectory: Trajectory;
  first_detected?: string;
  last_active?: string;
}

export interface SkillProgress {
  id?: string;
  skill: Skill;
  evidence_count: number;
  usage_frequency: number;
  depth_score: number;
  recency_score: number;
  confidence: number;
  trajectory: Trajectory;
  current_level: ProgressLevel;
  first_seen?: string;
  last_used?: string;
}

// ─── Idea Types ──────────────────────────────────────────────────────────────

export type IdeaStatus = "EXPLORING" | "PROTOTYPE" | "MATURING" | "ABANDONED" | "MATURED";
export type IdeaMaturity = "EARLY" | "MID" | "MATURE";

export interface Idea {
  id: string;
  title: string;
  description?: string;
  status: IdeaStatus;
  maturity: IdeaMaturity;
  parent_project_id?: string;
  created_at: string;
  updated_at: string;
}

// ─── Problem Solving / Profile Types ────────────────────────────────────────

export interface ProblemSolvingProfile {
  frequently_works_with: string[];
  recurring_patterns_detected: string[];
  primary_archetype?: string;
}

// ─── Timeline Types ──────────────────────────────────────────────────────────

export interface TimelineEntry {
  date: string;
  title: string;
  description?: string;
  skills: string[];
  complexity?: number;
  project_id?: string;
}

// ─── Portfolio Response ──────────────────────────────────────────────────────

export interface PortfolioData {
  profile: UserProfile;
  projects: Project[];
  ideas: Idea[];
  domain_progress: DomainProgress[];
  skills: SkillProgress[];
  problem_solving_profile: ProblemSolvingProfile;
  timeline: TimelineEntry[];
}

// ─── Resume Types ────────────────────────────────────────────────────────────

export interface ResumeEvidenceLink {
  label: string;
  url: string;
  type?: string;
}

export interface ResumeProject {
  id: string;
  title: string;
  narrative?: string;
  evidence_links: ResumeEvidenceLink[];
  selected_reasons?: string[]; // why this project was selected for this role
}

export interface ResumeData {
  profile: UserProfile;
  target_role: string;
  summary?: string;
  projects: ResumeProject[];
  claims: string[];
  skills: string[];
  evidence_coverage?: number; // 0–1
  claims_verified?: number;
  total_claims?: number;
  generated_at?: string;
  graph_version?: string;
}

// ─── Recruiter Types ─────────────────────────────────────────────────────────

export interface CriteriaMatch {
  item_name: string;
  type: string;
  status: "strong" | "moderate" | "weak" | "missing";
  details?: string;
}

export interface RecruiterData {
  candidate_name?: string;
  role_name: string;
  overall_match: "Strong Match" | "Moderate Match" | "Weak Match";
  why_text?: string;
  strengths: string[];
  gaps: string[];
  criteria_matches: CriteriaMatch[];
  evidence_backed_claims: Claim[];
  domain_strengths?: Array<{ domain: string; level: string }>;
  demonstrated_skills?: string[];
  evidence_gaps?: string[];
}

export type RecruiterMatch = RecruiterData;

// ─── Change Feed ─────────────────────────────────────────────────────────────

export interface ChangeFeedEntry {
  id?: string;
  timestamp: string;
  label: string;
  description?: string;
  type?: "domain" | "project" | "skill" | "evidence";
}

// ─── UI State ────────────────────────────────────────────────────────────────

export type ActiveView =
  | "dashboard"
  | "graph"
  | "projects"
  | "ideas"
  | "review"
  | "domains"
  | "skills"
  | "evidence"
  | "resume"
  | "recruiter"
  | "timeline";
