"use client";

import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import styles from "./page.module.css";
import { apiFetch } from "../config";

// Hooks
import { useCareerGraph } from "../hooks/useCareerGraph";
import { useResume } from "../hooks/useResume";
import { useRecruiter } from "../hooks/useRecruiter";

// UI
import { Sidebar } from "../components/ui/Sidebar";

// Career
import { IdentityHero } from "../components/career/IdentityHero";
import { TrajectoryTable } from "../components/career/TrajectoryTable";
import { CurrentlyBuilding } from "../components/career/CurrentlyBuilding";
import { EmergingDomains } from "../components/career/EmergingDomains";
import { ProblemSolvingProfile } from "../components/career/ProblemSolvingProfile";

// Graph
import { CareerGraphView } from "../components/graph/CareerGraphView";

// Domains & Skills
import { DomainCard } from "../components/domains/DomainCard";
import { DomainDrawer } from "../components/domains/DomainDrawer";
import { SkillProgressView } from "../components/skills/SkillProgressView";

// Review Queue
import { ReviewQueue } from "../components/review/ReviewQueue";

// Projects
import { ProjectCard } from "../components/projects/ProjectCard";

// Recruiter
import { CandidateIntelligence } from "../components/recruiter/CandidateIntelligence";

// Resume
import { ResumeView } from "../components/resume/ResumeView";

// Portfolio
import { PortfolioView } from "../components/portfolio/PortfolioView";

// Strata
import { StrataView } from "../components/strata/StrataView";

// Evidence
import { EvidenceDrawer } from "../components/evidence/EvidenceDrawer";
import { GitHubAuthModal } from "../components/ui/GitHubAuthModal";

// Icons
import {
  Check,
  CircleDot,
  Circle,
  ArrowRight,
  Plus,
  Sparkles,
} from "lucide-react";
import { GithubIcon } from "../components/ui/icons/GithubIcon";

// Types
import type { ActiveView, Idea, Claim, Project, DomainProgress, TimelineEntry } from "../types";

// ─── Helpers ──────────────────────────────────────────────────────────────────

type IdeaMaturity = "EARLY" | "MID" | "MATURE";

const MATURITY_LABEL: Record<string, string> = {
  EARLY:  "Early concept",
  MID:    "Prototype stage",
  MATURE: "Mature hypothesis",
};

// ─── Loading screen ───────────────────────────────────────────────────────────

function LoadingScreen() {
  const steps = [
    "Reading repositories",
    "Identifying projects",
    "Extracting technologies",
    "Mapping skills",
    "Detecting domains",
    "Building career graph",
  ];
  const [step, setStep] = useState(0);

  useEffect(() => {
    if (step >= steps.length - 1) return;
    const t = setTimeout(() => setStep((s) => s + 1), 600);
    return () => clearTimeout(t);
  }, [step, steps.length]);

  return (
    <div className={styles.loadingScreen}>
      <p className={`section-label ${styles.loadingLabel}`}>
        Understanding your work
      </p>
      <div className={styles.loadingSteps}>
        {steps.map((label, i) => (
          <div
            key={i}
            className={`${styles.loadingStep} ${
              i < step
                ? styles.stepDone
                : i === step
                ? styles.stepActive
                : styles.stepPending
            }`}
          >
            <span className={styles.stepIcon}>
              {i < step ? (
                <Check size={14} color="var(--success)" />
              ) : i === step ? (
                <CircleDot size={14} color="var(--accent)" />
              ) : (
                <Circle size={14} color="var(--text-muted)" />
              )}
            </span>
            <span>{label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Onboarding empty state ───────────────────────────────────────────────────

function OnboardingScreen({
  onDemo,
  onSync,
  syncing,
}: {
  onDemo: () => void;
  onSync: () => void;
  syncing: boolean;
}) {
  return (
    <div className={styles.onboarding}>
      <h1 className={styles.onboardingTitle}>
        Build your professional identity automatically.
      </h1>
      <p className={styles.onboardingSubtitle}>
        Connect the places where your work already exists.
      </p>
      <div className={styles.onboardingActions}>
        <button
          type="button"
          className={`btn btn-primary ${styles.onboardingConnectBtn}`}
          onClick={onSync}
          disabled={syncing}
        >
          <GithubIcon size={16} />
          <span>Connect GitHub</span>
        </button>
        <button
          type="button"
          className={`btn btn-ghost ${styles.onboardingDemoBtn}`}
          onClick={onDemo}
          disabled={syncing}
        >
          <Sparkles size={14} />
          <span>{syncing ? "Loading…" : "Load demo data"}</span>
        </button>
      </div>
    </div>
  );
}

// ─── Main Application ─────────────────────────────────────────────────────────

export default function CareerGraphApp() {
  const [activeView, setActiveView] = useState<ActiveView>("dashboard");
  const [selectedRole, setSelectedRole] = useState("Software Engineer");

  const {
    profile,
    projects,
    ideas,
    domainProgress,
    skillsProgress,
    problemSolving,
    timeline,
    workExperiences,
    educations,
    certifications,
    socialLinks,
    pendingReviewCount,
    loading,
    syncing,
    error,
    success,
    lastUpdated,
    refresh,
    runDemo,
    clearMessages,
  } = useCareerGraph();

  const {
    resumeData,
    loading: resumeLoading,
    saving: resumeSaving,
    fetchResume,
    saveCurrentResume,
    aiImprove,
  } = useResume();
  const { recruiterData, loading: recruiterLoading, fetchMatch } = useRecruiter();

  // Fetch role-specific data when view or role changes
  useEffect(() => {
    if (activeView === "resume") fetchResume(selectedRole);
    else if (activeView === "recruiter") fetchMatch(selectedRole);
  }, [activeView, selectedRole]); // eslint-disable-line react-hooks/exhaustive-deps

  // Clear messages after 5s
  useEffect(() => {
    if (!error && !success) return;
    const t = setTimeout(clearMessages, 5000);
    return () => clearTimeout(t);
  }, [error, success, clearMessages]);

  // Ideas form state
  const [ideaTitle, setIdeaTitle] = useState("");
  const [ideaDesc, setIdeaDesc] = useState("");
  const [ideaMaturity, setIdeaMaturity] = useState<IdeaMaturity>("EARLY");

  // Graph interaction drawer state
  const [selectedGraphClaim, setSelectedGraphClaim] = useState<Claim | null>(null);
  const [selectedGraphDomain, setSelectedGraphDomain] = useState<DomainProgress | null>(null);

  // GitHub connection modal state
  const [githubModalOpen, setGithubModalOpen] = useState(false);
  const [localError, setLocalError] = useState("");
  const [localSuccess, setLocalSuccess] = useState("");

  const handleAddIdea = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!ideaTitle.trim()) return;
    try {
      await apiFetch("/ideas", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: ideaTitle,
          description: ideaDesc,
          status: "EXPLORING",
          maturity: ideaMaturity,
        }),
      });
      setIdeaTitle("");
      setIdeaDesc("");
      setIdeaMaturity("EARLY");
      await refresh();
    } catch (err) {
      console.error("Error adding idea:", err);
    }
  };

  const handleMatureIdea = async (ideaId: string) => {
    try {
      await apiFetch(`/ideas/${ideaId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: "",
          description: "",
          status: "MATURING",
          maturity: "MATURE",
        }),
      });
      await refresh();
    } catch (err) {
      console.error("Error maturing idea:", err);
    }
  };

  const isEmpty = !loading && projects.length === 0;
  const displaySuccess = success || localSuccess;
  const displayError = displaySuccess ? "" : (error || localError);

  // Clear local messages after 5s
  useEffect(() => {
    if (!localError && !localSuccess) return;
    const t = setTimeout(() => {
      setLocalError("");
      setLocalSuccess("");
    }, 5000);
    return () => clearTimeout(t);
  }, [localError, localSuccess]);

  const handleRunDemo = async () => {
    setLocalError("");
    await runDemo();
  };


  return (
    <div className={styles.layout}>
      <Sidebar
        activeView={activeView}
        setActiveView={(view: string) => setActiveView(view as ActiveView)}
        profile={profile}
        syncing={syncing}
        lastUpdated={lastUpdated}
        syncStatus={
          displayError
            ? "error"
            : syncing
            ? "syncing"
            : projects.length > 0
            ? "connected"
            : "idle"
        }
        handleGithubSync={() => setGithubModalOpen(true)}
        handleRunDemoSync={handleRunDemo}
        pendingReviewCount={pendingReviewCount}
      />


      <main
        className={`${styles.main} ${
          activeView === "graph" || activeView === "recruiter" || activeView === "portfolio"
            ? styles.mainWide
            : ""
        }`}
        id="main-content"
      >
        {/* Banner messages */}
        {displayError && (
          <div className={styles.banner} data-type="error" role="alert">
            <strong>Connection issue:</strong> {displayError}
            {(displayError.toLowerCase().includes("failed to fetch") ||
              displayError.toLowerCase().includes("failed to connect")) && (
              <> — Start the FastAPI server on port 8000, then load demo data.</>
            )}
          </div>
        )}
        {displaySuccess && (
          <div className={styles.banner} data-type="success" role="status">
            {displaySuccess}
          </div>
        )}

        {/* Loading screen */}
        {loading && projects.length === 0 && <LoadingScreen />}

        {/* Onboarding */}
        {isEmpty && (
          <OnboardingScreen
            onDemo={runDemo}
            onSync={() => setGithubModalOpen(true)}
            syncing={syncing}
          />
        )}

        {/* Views with Framer Motion transitions */}
        {!loading && !isEmpty && (
          <AnimatePresence mode="wait">
            <motion.div
              key={activeView}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
            >
              {activeView === "dashboard" && (
                <DashboardView
                  projects={projects}
                  domainProgress={domainProgress}
                  problemSolving={problemSolving}
                  profile={profile}
                  lastUpdated={lastUpdated}
                  setActiveView={setActiveView}
                />
              )}
              {activeView === "portfolio" && profile && (
                <PortfolioView
                  portfolioData={{
                    profile,
                    projects,
                    ideas,
                    domain_progress: domainProgress,
                    skills: skillsProgress,
                    problem_solving_profile: problemSolving || {
                      frequently_works_with: [],
                      recurring_patterns_detected: [],
                    },
                    timeline,
                    work_experiences: workExperiences,
                    educations: educations,
                    certifications: certifications,
                    social_links: socialLinks,
                  }}
                  loading={loading}
                  onRefresh={refresh}
                  onOpenProjectEvidence={(proj) => {
                    if (proj.claims && proj.claims.length > 0) {
                      setSelectedGraphClaim(proj.claims[0]);
                    }
                  }}
                />

              )}
              {activeView === "strata" && (
                <StrataView
                  domainProgress={domainProgress}
                  skillProgress={skillsProgress}
                  projects={projects}
                  onInspectDomain={(domId) => {
                    const dp = domainProgress.find((d) => d.domain?.id === domId);
                    if (dp) setSelectedGraphDomain(dp);
                  }}
                />
              )}
              {activeView === "graph" && (
                <CareerGraphView
                  projects={projects}
                  domainProgress={domainProgress}
                  skillsProgress={skillsProgress}
                  onSelectProject={(proj) => {
                    if (proj.claims && proj.claims.length > 0) {
                      setSelectedGraphClaim(proj.claims[0]);
                    }
                  }}
                  onSelectDomain={(dp) => setSelectedGraphDomain(dp)}
                />
              )}
              {activeView === "projects" && <ProjectsView projects={projects} />}
              {activeView === "ideas" && (
                <IdeasView
                  ideas={ideas}
                  ideaTitle={ideaTitle}
                  setIdeaTitle={setIdeaTitle}
                  ideaDesc={ideaDesc}
                  setIdeaDesc={setIdeaDesc}
                  ideaMaturity={ideaMaturity}
                  setIdeaMaturity={setIdeaMaturity}
                  onAddIdea={handleAddIdea}
                  onMatureIdea={handleMatureIdea}
                />
              )}
              {activeView === "review" && (
                <ReviewQueue onRefreshAll={refresh} />
              )}
              {activeView === "domains" && (
                <DomainsView domainProgress={domainProgress} projects={projects} />
              )}
              {activeView === "skills" && (
                <SkillProgressView skillsProgress={skillsProgress} />
              )}
              {activeView === "evidence" && <EvidenceView projects={projects} />}
              {activeView === "resume" && (
                <ResumeView
                  resumeData={resumeData}
                  loading={resumeLoading}
                  selectedRole={selectedRole}
                  onRoleChange={setSelectedRole}
                  onSave={saveCurrentResume}
                  onAiImprove={aiImprove}
                  saving={resumeSaving}
                />
              )}
              {activeView === "recruiter" && (
                <CandidateIntelligence
                  recruiterData={recruiterData}
                  loading={recruiterLoading}
                  selectedRole={selectedRole}
                  onRoleChange={setSelectedRole}
                />
              )}
              {activeView === "timeline" && <TimelineView timeline={timeline} />}
            </motion.div>
          </AnimatePresence>
        )}
      </main>

      {/* Graph-triggered Evidence & Domain Drawers */}
      {selectedGraphClaim && (
        <EvidenceDrawer
          claim={selectedGraphClaim}
          onClose={() => setSelectedGraphClaim(null)}
        />
      )}

      {selectedGraphDomain && (
        <DomainDrawer
          dp={selectedGraphDomain}
          projects={projects}
          onClose={() => setSelectedGraphDomain(null)}
        />
      )}

      {githubModalOpen && (
        <GitHubAuthModal
          onClose={() => setGithubModalOpen(false)}
          onSuccess={(msg) => setLocalSuccess(msg)}
          onRefresh={refresh}
          defaultUsername={profile?.github_username || ""}
        />
      )}
    </div>
  );
}

// ─── Dashboard ────────────────────────────────────────────────────────────────

function DashboardView({
  projects,
  domainProgress,
  problemSolving,
  profile,
  lastUpdated,
  setActiveView,
}: {
  projects: Project[];
  domainProgress: DomainProgress[];
  problemSolving: import("../types").ProblemSolvingProfile | null;
  profile: import("../types").UserProfile | null;
  lastUpdated: Date | null;
  setActiveView: (v: ActiveView) => void;
}) {
  const highDepthProjects = projects.filter((p) => (p.complexity_score ?? 0) > 6).length;

  return (
    <div className={styles.view}>
      <IdentityHero profile={profile} domainProgress={domainProgress} lastUpdated={lastUpdated} />

      {/* Stats row */}
      <div className={styles.statsRow}>
        <div className={styles.statCard}>
          <span className={styles.statNum}>{projects.length}</span>
          <span className={styles.statLabel}>Projects</span>
        </div>
        <div className={styles.statCard}>
          <span className={styles.statNum}>{domainProgress.length}</span>
          <span className={styles.statLabel}>Domains mapped</span>
        </div>
        <div className={styles.statCard}>
          <span className={styles.statNum}>{highDepthProjects}</span>
          <span className={styles.statLabel}>High-depth projects</span>
        </div>
      </div>

      {/* Problem Solving Profile */}
      <ProblemSolvingProfile profile={problemSolving} />

      <div className={styles.dashGrid}>
        <TrajectoryTable domainProgress={domainProgress} onViewAll={() => setActiveView("domains")} />
        <CurrentlyBuilding projects={projects} onViewAll={() => setActiveView("projects")} />
      </div>

      <EmergingDomains domainProgress={domainProgress} />
    </div>
  );
}

// ─── Projects view ────────────────────────────────────────────────────────────

function ProjectsView({ projects }: { projects: Project[] }) {
  return (
    <div className={styles.view}>
      <div className={styles.pageHeader}>
        <h1 className={styles.pageTitle}>Projects</h1>
        <p className={styles.pageSubtitle}>
          {projects.length} project{projects.length !== 1 ? "s" : ""} — evidence of your work
        </p>
      </div>
      <div className={styles.projectGrid}>
        {projects.map((p, i) => (
          <motion.div
            key={p.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.25, delay: i * 0.04 }}
          >
            <ProjectCard project={p} />
          </motion.div>
        ))}
      </div>
    </div>
  );
}

// ─── Domains view ─────────────────────────────────────────────────────────────

function DomainsView({
  domainProgress,
  projects,
}: {
  domainProgress: DomainProgress[];
  projects: Project[];
}) {
  return (
    <div className={styles.view}>
      <div className={styles.pageHeader}>
        <h1 className={styles.pageTitle}>Domains</h1>
        <p className={styles.pageSubtitle}>Your professional territory</p>
      </div>
      <div className={styles.domainGrid}>
        {domainProgress.map((dp, i) => (
          <motion.div
            key={dp.domain.id ?? dp.domain.name}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.25, delay: i * 0.04 }}
          >
            <DomainCard dp={dp} projects={projects} />
          </motion.div>
        ))}
      </div>
    </div>
  );
}

// ─── Evidence view ────────────────────────────────────────────────────────────

function EvidenceView({ projects }: { projects: Project[] }) {
  const [selectedClaim, setSelectedClaim] = useState<Claim | null>(null);

  const allClaims: (Claim & { projectTitle: string })[] = projects.flatMap((p) =>
    (p.claims ?? []).map((c) => ({ ...c, projectTitle: p.title }))
  );

  return (
    <div className={styles.view}>
      <div className={styles.pageHeader}>
        <h1 className={styles.pageTitle}>Evidence</h1>
        <p className={styles.pageSubtitle}>
          {allClaims.length} verified claim{allClaims.length !== 1 ? "s" : ""} — click any to inspect the proof chain
        </p>
      </div>

      <div className={styles.claimsGrid}>
        {allClaims.map((claim, i) => (
          <motion.button
            key={claim.id}
            type="button"
            className={styles.claimCard}
            onClick={() => setSelectedClaim(claim)}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.25, delay: i * 0.03 }}
          >
            <div className={styles.claimCardHeader}>
              <span className="badge badge-accent">{claim.claim_type ?? "CLAIM"}</span>
              <span className={styles.claimProjectName}>{claim.projectTitle}</span>
            </div>
            <p className={styles.claimCardText}>&ldquo;{claim.claim}&rdquo;</p>
            <div className={styles.claimCardFooter}>
              <span className={styles.claimConfidence}>
                {Math.round(claim.confidence * 100)}% confidence
              </span>
              <span className={styles.claimInspect}>
                <span>Inspect proof</span>
                <ArrowRight size={12} />
              </span>
            </div>
          </motion.button>
        ))}

        {allClaims.length === 0 && (
          <p className={styles.gridEmptyText}>
            No evidence claims yet. Sync GitHub to generate them.
          </p>
        )}
      </div>

      {selectedClaim && (
        <EvidenceDrawer claim={selectedClaim} onClose={() => setSelectedClaim(null)} />
      )}
    </div>
  );
}

// ─── Ideas view ───────────────────────────────────────────────────────────────

function IdeasView({
  ideas,
  ideaTitle,
  setIdeaTitle,
  ideaDesc,
  setIdeaDesc,
  ideaMaturity,
  setIdeaMaturity,
  onAddIdea,
  onMatureIdea,
}: {
  ideas: Idea[];
  ideaTitle: string;
  setIdeaTitle: (v: string) => void;
  ideaDesc: string;
  setIdeaDesc: (v: string) => void;
  ideaMaturity: IdeaMaturity;
  setIdeaMaturity: (v: IdeaMaturity) => void;
  onAddIdea: (e: React.FormEvent) => void;
  onMatureIdea: (id: string) => void;
}) {
  return (
    <div className={styles.view}>
      <div className={styles.pageHeader}>
        <h1 className={styles.pageTitle}>Ideas</h1>
        <p className={styles.pageSubtitle}>What you&apos;re thinking about</p>
      </div>

      <div className={styles.ideasLayout}>
        {/* Capture form */}
        <form onSubmit={onAddIdea} className={styles.captureForm}>
          <p className={`section-label ${styles.formLabel}`}>Capture an idea</p>
          <input
            type="text"
            placeholder="What are you thinking about?"
            className={`input-base ${styles.formInput}`}
            value={ideaTitle}
            onChange={(e) => setIdeaTitle(e.target.value)}
            required
          />
          <textarea
            placeholder="Describe your concept or hypothesis…"
            className={`input-base ${styles.formTextarea}`}
            rows={3}
            value={ideaDesc}
            onChange={(e) => setIdeaDesc(e.target.value)}
          />
          <div className={styles.formActionsRow}>
            <select
              className={`input-base ${styles.formSelect}`}
              value={ideaMaturity}
              onChange={(e) => setIdeaMaturity(e.target.value as IdeaMaturity)}
            >
              {(["EARLY", "MID", "MATURE"] as IdeaMaturity[]).map((m) => (
                <option key={m} value={m}>
                  {MATURITY_LABEL[m]}
                </option>
              ))}
            </select>
            <button
              type="submit"
              className={`btn btn-primary ${styles.formSubmitBtn}`}
            >
              <Plus size={14} />
              <span>Save idea</span>
            </button>
          </div>
        </form>

        {/* Ideas list */}
        <div className={styles.ideasList}>
          {ideas.length === 0 && (
            <p className={styles.emptyIdeasText}>
              No ideas yet. Capture your first concept above.
            </p>
          )}
          {ideas.map((idea, i) => (
            <motion.div
              key={idea.id}
              className={styles.ideaCard}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.25, delay: i * 0.04 }}
            >
              <div className={styles.ideaCardHeader}>
                <h3 className={styles.ideaTitle}>{idea.title}</h3>
                <div className={styles.ideaBadgeRow}>
                  <span
                    className={`badge ${
                      idea.maturity === "MATURE"
                        ? "badge-success"
                        : idea.maturity === "MID"
                        ? "badge-warning"
                        : "badge-neutral"
                    }`}
                  >
                    {MATURITY_LABEL[idea.maturity] ?? idea.maturity}
                  </span>
                  <span className="badge badge-neutral">{idea.status}</span>
                </div>
              </div>

              {idea.description && (
                <p className={styles.ideaDesc}>{idea.description}</p>
              )}

              {idea.status !== "MATURED" ? (
                <button
                  type="button"
                  className={`btn btn-ghost ${styles.matureBtn}`}
                  onClick={() => onMatureIdea(idea.id)}
                >
                  <span>Mature to project</span>
                  <ArrowRight size={12} />
                </button>
              ) : (
                <span className={styles.maturedText}>
                  <Check size={12} />
                  <span>Matured into project</span>
                </span>
              )}
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── Timeline view ────────────────────────────────────────────────────────────

function TimelineView({ timeline }: { timeline: TimelineEntry[] }) {
  return (
    <div className={styles.view}>
      <div className={styles.pageHeader}>
        <h1 className={styles.pageTitle}>Timeline</h1>
        <p className={styles.pageSubtitle}>Your professional journey</p>
      </div>

      <div className={styles.timeline}>
        {timeline.map((entry: TimelineEntry, idx: number) => (
          <div key={idx} className={styles.timelineItem}>
            <div className={styles.timelineMarker} />
            <div className={styles.timelineContent}>
              <span className={styles.timelineDate}>{entry.date}</span>
              <h3 className={styles.timelineTitle}>{entry.title}</h3>
              {entry.description && (
                <p className={styles.timelineDesc}>{entry.description}</p>
              )}
              <div className={styles.timelineTags}>
                {entry.skills.map((s, i) => (
                  <span key={i} className="chip chip-neutral">
                    {s}
                  </span>
                ))}
              </div>
            </div>
          </div>
        ))}
        {timeline.length === 0 && (
          <p className={styles.emptyTimelineText}>No timeline events yet.</p>
        )}
      </div>
    </div>
  );
}
