"use client";

import React, { useState, useEffect } from "react";
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

// Domains
import { DomainCard } from "../components/domains/DomainCard";

// Projects
import { ProjectCard } from "../components/projects/ProjectCard";

// Recruiter
import { CandidateIntelligence } from "../components/recruiter/CandidateIntelligence";

// Resume
import { ResumeView } from "../components/resume/ResumeView";

// Evidence
import { EvidenceDrawer } from "../components/evidence/EvidenceDrawer";
import { GitHubAuthModal } from "../components/ui/GitHubAuthModal";

// Types
import type { ActiveView, Idea, Claim } from "../types";

// ─── Helpers ──────────────────────────────────────────────────────────────────

const ROLES = [
  "Software Engineer",
  "Machine Learning Engineer",
  "Backend Engineer",
  "Research Engineer",
];

type IdeaStatus = "EXPLORING" | "PROTOTYPE" | "MATURING" | "ABANDONED" | "MATURED";
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
      <p className="section-label" style={{ marginBottom: "1.5rem", letterSpacing: "0.12em" }}>
        Understanding your work
      </p>
      <div className={styles.loadingSteps}>
        {steps.map((label, i) => (
          <div key={i} className={`${styles.loadingStep} ${i < step ? styles.stepDone : i === step ? styles.stepActive : styles.stepPending}`}>
            <span className={styles.stepIcon}>{i < step ? "✓" : i === step ? "●" : "○"}</span>
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
          className="btn btn-primary"
          style={{ padding: "0.75rem 2rem", fontSize: "0.95rem" }}
          onClick={onSync}
          disabled={syncing}
        >
          Connect GitHub
        </button>
        <button
          type="button"
          className="btn btn-ghost"
          style={{ fontSize: "0.875rem" }}
          onClick={onDemo}
          disabled={syncing}
        >
          {syncing ? "Loading…" : "Load demo data"}
        </button>
      </div>
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function CareerGraphPage() {
  const [activeView, setActiveView] = useState<ActiveView>("dashboard");
  const [selectedRole, setSelectedRole] = useState("Software Engineer");

  const {
    profile, projects, ideas, domainProgress, skillsProgress,
    problemSolving, timeline,
    loading, syncing, error, success, lastUpdated,
    refresh, syncGitHub, runDemo, clearMessages,
  } = useCareerGraph();

  const { resumeData, loading: resumeLoading, fetchResume } = useResume();
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
        body: JSON.stringify({ title: ideaTitle, description: ideaDesc, status: "EXPLORING", maturity: ideaMaturity }),
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
        body: JSON.stringify({ title: "", description: "", status: "MATURING", maturity: "MATURE" }),
      });
      await refresh();
    } catch (err) {
      console.error("Error maturing idea:", err);
    }
  };

  const isEmpty = !loading && projects.length === 0;
  const displayError = error || localError;
  const displaySuccess = success || localSuccess;

  // Clear local messages after 5s
  useEffect(() => {
    if (!localError && !localSuccess) return;
    const t = setTimeout(() => {
      setLocalError("");
      setLocalSuccess("");
    }, 5000);
    return () => clearTimeout(t);
  }, [localError, localSuccess]);

  return (
    <div className={styles.layout}>
      <Sidebar
        activeView={activeView}
        setActiveView={(view: string) => setActiveView(view as ActiveView)}
        profile={profile}
        syncing={syncing}
        lastUpdated={lastUpdated}
        syncStatus={displayError ? "error" : syncing ? "syncing" : projects.length > 0 ? "connected" : "idle"}
        handleGithubSync={() => setGithubModalOpen(true)}
        handleRunDemoSync={runDemo}
      />

      <main className={styles.main} id="main-content">
        {/* Banner messages */}
        {displayError && (
          <div className={styles.banner} data-type="error" role="alert">
            <strong>Connection issue:</strong> {displayError}
            {(displayError.toLowerCase().includes("failed to fetch") || displayError.toLowerCase().includes("failed to connect")) && (
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
          <OnboardingScreen onDemo={runDemo} onSync={() => setGithubModalOpen(true)} syncing={syncing} />
        )}

        {/* Views */}
        {!loading && !isEmpty && (
          <>
            {activeView === "dashboard"  && <DashboardView projects={projects} domainProgress={domainProgress} profile={profile} lastUpdated={lastUpdated} setActiveView={setActiveView} />}
            {activeView === "graph"      && <GraphPlaceholder />}
            {activeView === "projects"   && <ProjectsView projects={projects} />}
            {activeView === "ideas"      && <IdeasView ideas={ideas} ideaTitle={ideaTitle} setIdeaTitle={setIdeaTitle} ideaDesc={ideaDesc} setIdeaDesc={setIdeaDesc} ideaMaturity={ideaMaturity} setIdeaMaturity={setIdeaMaturity} onAddIdea={handleAddIdea} onMatureIdea={handleMatureIdea} />}
            {activeView === "domains"    && <DomainsView domainProgress={domainProgress} projects={projects} />}
            {activeView === "evidence"   && <EvidenceView projects={projects} />}
            {activeView === "resume"     && <ResumeView resumeData={resumeData} loading={resumeLoading} selectedRole={selectedRole} onRoleChange={setSelectedRole} />}
            {activeView === "recruiter"  && <CandidateIntelligence recruiterData={recruiterData} loading={recruiterLoading} selectedRole={selectedRole} onRoleChange={setSelectedRole} profileName={profile?.name} />}
            {activeView === "timeline"   && <TimelineView timeline={timeline} />}
          </>
        )}
      </main>

      {githubModalOpen && (
        <GitHubAuthModal
          onClose={() => setGithubModalOpen(false)}
          onSuccess={(msg) => setLocalSuccess(msg)}
          onRefresh={refresh}
        />
      )}
    </div>
  );
}

// ─── Dashboard ────────────────────────────────────────────────────────────────

function DashboardView({ projects, domainProgress, profile, lastUpdated, setActiveView }: {
  projects: import("../types").Project[];
  domainProgress: import("../types").DomainProgress[];
  profile: import("../types").UserProfile | null;
  lastUpdated: Date | null;
  setActiveView: (v: ActiveView) => void;
}) {
  const highDepthProjects = projects.filter((p) => (p.complexity_score ?? 0) > 6).length;

  return (
    <div className={styles.view}>
      <IdentityHero profile={profile} domainProgress={domainProgress} lastUpdated={lastUpdated} />

      {/* Stats row — honest labels only */}
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

      <div className={styles.dashGrid}>
        <TrajectoryTable domainProgress={domainProgress} onViewAll={() => setActiveView("domains")} />
        <CurrentlyBuilding projects={projects} onViewAll={() => setActiveView("projects")} />
      </div>

      <EmergingDomains domainProgress={domainProgress} />
    </div>
  );
}

// ─── Graph placeholder ────────────────────────────────────────────────────────

function GraphPlaceholder() {
  return (
    <div className={styles.view}>
      <div className={styles.pageHeader}>
        <h1 className={styles.pageTitle}>Career Graph</h1>
        <p className={styles.pageSubtitle}>Interactive visualization of your professional network</p>
      </div>
      <div className={styles.placeholder}>
        <p className="section-label" style={{ marginBottom: "0.75rem" }}>Coming soon</p>
        <p style={{ color: "var(--text-muted)", fontSize: "0.9rem" }}>
          An interactive node graph of your domains, skills, and projects is planned for the next release.
        </p>
      </div>
    </div>
  );
}

// ─── Projects view ────────────────────────────────────────────────────────────

function ProjectsView({ projects }: { projects: import("../types").Project[] }) {
  return (
    <div className={styles.view}>
      <div className={styles.pageHeader}>
        <h1 className={styles.pageTitle}>Projects</h1>
        <p className={styles.pageSubtitle}>
          {projects.length} project{projects.length !== 1 ? "s" : ""} — evidence of your work
        </p>
      </div>
      <div className={styles.projectGrid}>
        {projects.map((p) => (
          <ProjectCard key={p.id} project={p} />
        ))}
      </div>
    </div>
  );
}

// ─── Domains view ─────────────────────────────────────────────────────────────

function DomainsView({ domainProgress, projects }: {
  domainProgress: import("../types").DomainProgress[];
  projects: import("../types").Project[];
}) {
  return (
    <div className={styles.view}>
      <div className={styles.pageHeader}>
        <h1 className={styles.pageTitle}>Domains</h1>
        <p className={styles.pageSubtitle}>Your professional territory</p>
      </div>
      <div className={styles.domainGrid}>
        {domainProgress.map((dp) => (
          <DomainCard key={dp.domain.id ?? dp.domain.name} dp={dp} projects={projects} />
        ))}
      </div>
    </div>
  );
}

// ─── Evidence view ────────────────────────────────────────────────────────────

function EvidenceView({ projects }: { projects: import("../types").Project[] }) {
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
        {allClaims.map((claim) => (
          <button
            key={claim.id}
            type="button"
            className={styles.claimCard}
            onClick={() => setSelectedClaim(claim)}
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
              <span className={styles.claimInspect}>Inspect proof →</span>
            </div>
          </button>
        ))}

        {allClaims.length === 0 && (
          <p style={{ color: "var(--text-muted)", gridColumn: "1 / -1" }}>
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
  ideaTitle, setIdeaTitle,
  ideaDesc, setIdeaDesc,
  ideaMaturity, setIdeaMaturity,
  onAddIdea,
  onMatureIdea,
}: {
  ideas: Idea[];
  ideaTitle: string; setIdeaTitle: (v: string) => void;
  ideaDesc: string; setIdeaDesc: (v: string) => void;
  ideaMaturity: IdeaMaturity; setIdeaMaturity: (v: IdeaMaturity) => void;
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
          <p className="section-label" style={{ marginBottom: "1rem" }}>Capture an idea</p>
          <input
            type="text"
            placeholder="What are you thinking about?"
            className="input-base"
            style={{ marginBottom: "0.75rem" }}
            value={ideaTitle}
            onChange={(e) => setIdeaTitle(e.target.value)}
            required
          />
          <textarea
            placeholder="Describe your concept or hypothesis…"
            className="input-base"
            rows={3}
            style={{ resize: "vertical", marginBottom: "0.75rem" }}
            value={ideaDesc}
            onChange={(e) => setIdeaDesc(e.target.value)}
          />
          <div style={{ display: "flex", gap: "0.75rem", alignItems: "center" }}>
            <select
              className="input-base"
              style={{ flex: 1 }}
              value={ideaMaturity}
              onChange={(e) => setIdeaMaturity(e.target.value as IdeaMaturity)}
            >
              {(["EARLY", "MID", "MATURE"] as IdeaMaturity[]).map((m) => (
                <option key={m} value={m}>{MATURITY_LABEL[m]}</option>
              ))}
            </select>
            <button type="submit" className="btn btn-primary" style={{ whiteSpace: "nowrap" }}>
              Save idea
            </button>
          </div>
        </form>

        {/* Ideas list */}
        <div className={styles.ideasList}>
          {ideas.length === 0 && (
            <p style={{ color: "var(--text-muted)", fontSize: "0.875rem" }}>
              No ideas yet. Capture your first concept above.
            </p>
          )}
          {ideas.map((idea) => (
            <div key={idea.id} className={styles.ideaCard}>
              <div className={styles.ideaCardHeader}>
                <h3 className={styles.ideaTitle}>{idea.title}</h3>
                <div style={{ display: "flex", gap: "0.4rem" }}>
                  <span className={`badge ${
                    idea.maturity === "MATURE" ? "badge-success" :
                    idea.maturity === "MID"    ? "badge-warning" :
                    "badge-neutral"
                  }`}>
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
                  className="btn btn-ghost"
                  style={{ fontSize: "0.8rem", alignSelf: "flex-start", color: "var(--success)" }}
                  onClick={() => onMatureIdea(idea.id)}
                >
                  Mature to project →
                </button>
              ) : (
                <span style={{ fontSize: "0.78rem", color: "var(--success)", fontWeight: 600 }}>
                  ✓ Matured into project
                </span>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── Timeline view ────────────────────────────────────────────────────────────

function TimelineView({ timeline }: { timeline: import("../types").TimelineEntry[] }) {
  return (
    <div className={styles.view}>
      <div className={styles.pageHeader}>
        <h1 className={styles.pageTitle}>Timeline</h1>
        <p className={styles.pageSubtitle}>Your professional journey</p>
      </div>

      <div className={styles.timeline}>
        {timeline.map((entry, idx) => (
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
                  <span key={i} className="chip chip-neutral">{s}</span>
                ))}
              </div>
            </div>
          </div>
        ))}
        {timeline.length === 0 && (
          <p style={{ color: "var(--text-muted)", fontSize: "0.875rem" }}>
            No timeline events yet.
          </p>
        )}
      </div>
    </div>
  );
}
