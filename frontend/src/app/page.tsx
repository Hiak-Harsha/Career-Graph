"use client";

import React, { useState, useEffect } from "react";
import styles from "./page.module.css";
import { apiFetch } from "../config";
import { Sidebar } from "../components/Sidebar";
import { ProjectCard } from "../components/ProjectCard";
import { DomainCard } from "../components/DomainCard";
import { ReviewQueue } from "../components/ReviewQueue";

export default function CareerIdentityPage() {
  const [activeView, setActiveView] = useState<string>("dashboard");
  const [selectedRole, setSelectedRole] = useState<string>("Software Engineer");
  
  // Data States
  const [profile, setProfile] = useState<any>(null);
  const [projects, setProjects] = useState<any[]>([]);
  const [ideas, setIdeas] = useState<any[]>([]);
  const [domainProgress, setDomainProgress] = useState<any[]>([]);
  const [skillsProgress, setSkillsProgress] = useState<any[]>([]);
  const [problemSolving, setProblemSolving] = useState<any>(null);
  const [timeline, setTimeline] = useState<any[]>([]);
  
  // Dynamic Resume and Recruiter States
  const [resumeData, setResumeData] = useState<any>(null);
  const [recruiterData, setRecruiterData] = useState<any>(null);
  
  // UI States
  const [loading, setLoading] = useState<boolean>(true);
  const [syncing, setSyncing] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string>("");
  const [successMessage, setSuccessMessage] = useState<string>("");
  
  // Idea Form State
  const [ideaTitle, setIdeaTitle] = useState<string>("");
  const [ideaDesc, setIdeaDesc] = useState<string>("");
  const [ideaMaturity, setIdeaMaturity] = useState<string>("EARLY");

  // Recruiter Drawer State
  const [drawerOpen, setDrawerOpen] = useState<boolean>(false);
  const [selectedClaim, setSelectedClaim] = useState<any>(null);

  const fetchAllData = async () => {
    try {
      setLoading(true);
      const res = await apiFetch("/portfolio");
      const data = await res.json();
      setProfile(data.profile);
      setProjects(data.projects);
      setIdeas(data.ideas);
      setDomainProgress(data.domain_progress);
      setSkillsProgress(data.skills);
      setProblemSolving(data.problem_solving_profile);
      setTimeline(data.timeline);
      setErrorMessage("");
    } catch (err: any) {
      setErrorMessage(err.message || "Failed to connect to backend server.");
    } finally {
      setLoading(false);
    }
  };

  const fetchResume = async (roleName: string) => {
    try {
      const res = await apiFetch(`/resume?role=${encodeURIComponent(roleName)}`);
      const data = await res.json();
      setResumeData(data);
    } catch (err) {
      console.error("Error fetching dynamic resume:", err);
    }
  };

  const fetchRecruiterMatch = async (roleName: string) => {
    try {
      const res = await apiFetch(`/recruiter/match?role_name=${encodeURIComponent(roleName)}`);
      const data = await res.json();
      setRecruiterData(data);
    } catch (err) {
      console.error("Error fetching recruiter matching details:", err);
    }
  };

  useEffect(() => {
    fetchAllData();
  }, []);

  // Fetch role-specific details when the view or selected role changes
  useEffect(() => {
    if (activeView === "resume") {
      fetchResume(selectedRole);
    } else if (activeView === "recruiter") {
      fetchRecruiterMatch(selectedRole);
    }
  }, [activeView, selectedRole, projects]);

  const handleRunDemoSync = async () => {
    try {
      setSyncing(true);
      setSuccessMessage("");
      await apiFetch("/sync/demo", { method: "POST" });
      setSuccessMessage("Sandbox simulation initialized! 3 demonstration projects successfully loaded.");
      await fetchAllData();
    } catch (err: any) {
      setErrorMessage(err.message || "Failed to trigger sandbox.");
    } finally {
      setSyncing(false);
    }
  };

  const handleGithubSync = async () => {
    try {
      setSyncing(true);
      setSuccessMessage("");
      await apiFetch("/sync", { method: "POST" });
      setSuccessMessage("GitHub repositories synchronized successfully!");
      await fetchAllData();
    } catch (err: any) {
      setErrorMessage(err.message || "Connect GitHub credentials to enable OAuth syncing.");
    } finally {
      setSyncing(false);
    }
  };

  const handleAddIdea = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!ideaTitle) return;

    try {
      await apiFetch("/ideas", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: ideaTitle,
          description: ideaDesc,
          status: "EXPLORING",
          maturity: ideaMaturity
        })
      });
      setIdeaTitle("");
      setIdeaDesc("");
      setIdeaMaturity("EARLY");
      await fetchAllData();
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
          title: "", // server ignores empty fields for patch
          description: "",
          status: "MATURING",
          maturity: "MATURE"
        })
      });
      setSuccessMessage("Idea matured! Created active project entry in your Career Graph.");
      await fetchAllData();
    } catch (err) {
      console.error("Error maturing idea:", err);
    }
  };

  const openEvidenceDrawer = (claim: any) => {
    setSelectedClaim(claim);
    setDrawerOpen(true);
  };

  return (
    <div className={styles.container}>
      {/* Sidebar Navigation */}
      <Sidebar
        activeView={activeView}
        setActiveView={setActiveView}
        profile={profile}
        syncing={syncing}
        handleGithubSync={handleGithubSync}
        handleRunDemoSync={handleRunDemoSync}
      />

      {/* Main Viewport */}
      <main className={styles.main}>
        {/* Banner Messages */}
        {errorMessage && (
          <div style={{ background: "rgba(244, 63, 94, 0.1)", border: "1px solid rgba(244, 63, 94, 0.3)", color: "var(--accent-rose)", padding: "1rem", borderRadius: "12px", marginBottom: "2rem" }}>
            ⚠️ <strong>Backend Connection Alert:</strong> {errorMessage} <br />
            Make sure to start the FastAPI server at port 8000 and run the <em>Initialize Sandbox</em> button below to trigger demo assets.
          </div>
        )}
        {successMessage && (
          <div style={{ background: "rgba(16, 185, 129, 0.1)", border: "1px solid rgba(16, 185, 129, 0.3)", color: "var(--accent-emerald)", padding: "1rem", borderRadius: "12px", marginBottom: "2rem" }}>
            ✓ {successMessage}
          </div>
        )}

        {loading && projects.length === 0 ? (
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "60vh" }}>
            <h2 className="glow-text" style={{ fontSize: "2rem", marginBottom: "1rem" }}>Mapping Professional Identity...</h2>
            <p style={{ color: "var(--text-secondary)" }}>Connecting to the Career Graph Database.</p>
          </div>
        ) : projects.length === 0 ? (
          /* Empty onboarding state */
          <div className="glass" style={{ padding: "4rem", textAlign: "center", maxWidth: "800px", margin: "2rem auto" }}>
            <h1 className="glow-text" style={{ fontSize: "2.5rem", marginBottom: "1.5rem" }}>Your Professional Identity Evolving</h1>
            <p style={{ fontSize: "1.1rem", color: "var(--text-secondary)", lineHeight: "1.6", marginBottom: "2.5rem" }}>
              Welcome to the **Career Identity Platform**. Rather than filling out resume templates, the system acts as a living professional memory database that maps development credentials into dynamic portfolios and resumes.
            </p>
            <div style={{ display: "flex", gap: "1.5rem", justifyContent: "center" }}>
              <button className={styles.demoButton} style={{ padding: "1rem 2rem", fontSize: "1rem" }} onClick={handleRunDemoSync}>
                🚀 Run Sandbox Simulation
              </button>
              <button className={styles.syncButton} style={{ padding: "1rem 2rem", fontSize: "1rem" }} onClick={handleGithubSync}>
                🔗 OAuth Connect GitHub
              </button>
            </div>
          </div>
        ) : (
          <>
            {/* View renders */}
            {activeView === "dashboard" && renderDashboard()}
            {activeView === "portfolio" && renderPortfolio()}
            {activeView === "review" && <ReviewQueue onRefreshAll={fetchAllData} />}
            {activeView === "resume" && renderResume()}
            {activeView === "recruiter" && renderRecruiter()}
          </>
        )}
      </main>

      {/* Recruiter Drawer (Slide-out Panel) */}
      {drawerOpen && selectedClaim && (
        <>
          <div className={styles.drawerOverlay} onClick={() => setDrawerOpen(false)}></div>
          <div className={styles.drawer}>
            <div className={styles.drawerHeader}>
              <div>
                <h3 style={{ fontSize: "1.4rem", color: "#ffffff", marginBottom: "0.2rem" }}>Verifiable Evidence</h3>
                <p style={{ color: "var(--text-secondary)", fontSize: "0.85rem" }}>Provenance proof path matching this achievement claim</p>
              </div>
              <button className={styles.drawerClose} onClick={() => setDrawerOpen(false)}>×</button>
            </div>
            
            <div className={styles.drawerSection}>
              <h4 className={styles.drawerSub}>The Verified Claim</h4>
              <p style={{ fontSize: "1.05rem", lineHeight: "1.5", color: "#f8fafc", fontStyle: "italic" }}>
                "{selectedClaim.claim}"
              </p>
            </div>

            <div className={styles.drawerSection}>
              <h4 className={styles.drawerSub}>Claim Metadata</h4>
              <div style={{ display: "flex", flexDirection: "column", gap: "0.6rem", fontSize: "0.9rem" }}>
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <span style={{ color: "var(--text-secondary)" }}>Type:</span>
                  <span style={{ fontWeight: 600, color: "var(--accent-cyan)" }}>{selectedClaim.claim_type}</span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <span style={{ color: "var(--text-secondary)" }}>Evidence Confidence:</span>
                  <span style={{ color: "var(--accent-emerald)", fontWeight: 600 }}>{selectedClaim.confidence * 100}% Verified</span>
                </div>
              </div>
            </div>

            <div className={styles.drawerSection} style={{ flexGrow: 1 }}>
              <h4 className={styles.drawerSub}>Supporting Evidence Links</h4>
              {selectedClaim.evidence && selectedClaim.evidence.length > 0 ? (
                selectedClaim.evidence.map((ev: any, idx: number) => (
                  <div key={idx} className={styles.evidenceLinkItem}>
                    <span className={styles.evidenceLinkLabel}>
                      {ev.type === "GITHUB_COMMIT" ? "Git Commit: " + ev.source_identifier.substring(0, 7) : "Git File Reference"}
                    </span>
                    <p style={{ fontSize: "0.85rem", color: "var(--text-secondary)", margin: "0.3rem 0" }}>
                      {ev.content}
                    </p>
                    <a href={ev.source_url} target="_blank" rel="noopener noreferrer" className={styles.evidenceLinkUrl}>
                      🔗 Open in GitHub
                    </a>
                  </div>
                ))
              ) : (
                <div style={{ padding: "1rem", border: "1px dashed var(--border-light)", color: "var(--text-muted)", borderRadius: "8px" }}>
                  No explicit code file mappings loaded.
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );

  // --- Sub-View Render Functions ---

  function renderDashboard() {
    // Count totals
    const totalProjects = projects.length;
    const totalSkills = skillsProgress.length;
    const totalDomains = domainProgress.length;
    const activeProjects = projects.filter((p) => p.status === "ACTIVE");

    return (
      <div>
        <div className={styles.header}>
          <h1 className={styles.title}>Your Career, As It Happens</h1>
          <p className={styles.subtitle}>Continuous understanding of your professional development trajectory</p>
        </div>

        {/* Counter cards */}
        <div className={styles.statsContainer}>
          <div className={`${styles.statCard} glass`}>
            <span className={styles.statVal}>{totalProjects}</span>
            <span className={styles.statLabel}>Projects Detected</span>
          </div>
          <div className={`${styles.statCard} glass`}>
            <span className={styles.statVal}>{totalSkills}</span>
            <span className={styles.statLabel}>Skills Indexed</span>
          </div>
          <div className={`${styles.statCard} glass`}>
            <span className={styles.statVal}>{totalDomains}</span>
            <span className={styles.statLabel}>Domains Mapped</span>
          </div>
          <div className={`${styles.statCard} glass`}>
            <span className={styles.statVal}>
              {projects.reduce((acc, p) => acc + (p.complexity_score > 6 ? 1 : 0), 0)}
            </span>
            <span className={styles.statLabel}>High Depth Claims</span>
          </div>
        </div>

        <div className={styles.grid}>
          {/* Currently Building */}
          <div className={`${styles.cardHalf} ${styles.card} glass`}>
            <h3 className={styles.cardTitle}>🛠️ Currently Building</h3>
            <div className={styles.buildingList}>
              {activeProjects.length > 0 ? (
                activeProjects.map((p) => {
                  const progressValue = Math.min(Math.round(p.complexity_score * 10), 100);
                  return (
                    <div key={p.id} className={styles.buildingItem}>
                      <div className={styles.buildingInfo}>
                        <span className={styles.buildingTitle}>{p.title}</span>
                        <span className={styles.buildingTech}>{p.project_type}</span>
                      </div>
                      <div className={styles.buildingProgress}>
                        <div className={styles.progressTrack}>
                          <div className={styles.progressBar} style={{ width: `${progressValue}%` }}></div>
                        </div>
                        <span className={styles.progressPercent}>{progressValue}% Complex</span>
                      </div>
                    </div>
                  );
                })
              ) : (
                <div style={{ color: "var(--text-muted)", padding: "1rem", textAlign: "center" }}>
                  All projects currently cataloged as Completed.
                </div>
              )}
            </div>
          </div>

          {/* Emerging Interests */}
          <div className={`${styles.cardHalf} ${styles.card} glass`}>
            <h3 className={styles.cardTitle}>📈 Trajectory & Growth</h3>
            <div className={styles.trajectoryList}>
              {domainProgress.slice(0, 4).map((dp) => (
                <div key={dp.domain.id} className={styles.trajectoryItem}>
                  <span className={styles.trajectoryLabel}>{dp.domain.name}</span>
                  <span className={`${styles.trajectoryBadge} ${dp.trajectory === "INCREASING" ? styles.badgeUp : styles.badgeStable}`}>
                    {dp.trajectory === "INCREASING" ? "↑ Accelerating" : "Stable"}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Problem Solving Profile & Recent Activity */}
          <div className={`${styles.cardFull} ${styles.card} glass`}>
            <h3 className={styles.cardTitle}>🧠 Problem Solving Profile ("How I Think")</h3>
            <p style={{ color: "var(--text-secondary)", lineHeight: "1.6", marginBottom: "1.5rem" }}>
              The system automatically parses git files and code structures to detect problem-solving archetypes instead of subjective self-evaluations.
            </p>
            <div style={{ display: "flex", flexWrap: "wrap", gap: "1rem", marginBottom: "1.5rem" }}>
              {problemSolving?.frequently_works_with.map((pattern: string, idx: number) => (
                <span key={idx} className={styles.tag} style={{ background: "rgba(6, 182, 212, 0.08)", borderColor: "rgba(6, 182, 212, 0.2)", color: "var(--accent-cyan)", padding: "0.5rem 1rem", borderRadius: "8px", fontWeight: 600 }}>
                  ⚙️ {pattern}
                </span>
              ))}
            </div>
            <div style={{ fontSize: "0.9rem", color: "var(--text-secondary)", display: "flex", gap: "0.5rem", alignItems: "center" }}>
              <span>Primary pattern detected:</span>
              <strong style={{ color: "#ffffff" }}>
                {problemSolving?.recurring_patterns_detected.join(", ")}
              </strong>
            </div>
          </div>
        </div>
      </div>
    );
  }

  function renderPortfolio() {
    return (
      <div>
        <div className={styles.header}>
          <h1 className={styles.title}>Living Portfolio</h1>
          <p className={styles.subtitle}>A structural trace of your capabilities and intellectual timeline</p>
        </div>

        {/* Domain Explorer Grid */}
        <h2 style={{ fontSize: "1.6rem", marginBottom: "1.5rem" }}>🧩 Domain Explorer</h2>
        <div className={styles.domainGrid} style={{ marginBottom: "3rem" }}>
          {domainProgress.map((dp) => (
            <DomainCard key={dp.domain.id} dp={dp} />
          ))}
        </div>

        {/* Synced Projects List */}
        <h2 style={{ fontSize: "1.6rem", marginBottom: "1.5rem" }}>📁 Synced Projects Feed</h2>
        <div style={{ marginBottom: "3rem" }}>
          {projects.map((project) => (
            <ProjectCard key={project.id} project={project} />
          ))}
        </div>

        {/* Timeline & Ideas pipeline */}
        <div className={styles.ideasGrid}>
          {/* Journey Timeline */}
          <div>
            <h2 style={{ fontSize: "1.6rem", marginBottom: "1.5rem" }}>🕒 Journey Timeline</h2>
            <div className={styles.timeline}>
              {timeline.map((entry, idx) => (
                <div key={idx} className={styles.timelineItem}>
                  <div className={styles.timelineMarker}></div>
                  <div className={styles.timelineDate}>{entry.date}</div>
                  <div className={styles.timelineTitle}>{entry.title}</div>
                  <div className={styles.timelineDesc}>{entry.description}</div>
                  <div className={styles.timelineTags}>
                    {entry.skills.map((skill: string, sIdx: number) => (
                      <span key={sIdx} className={styles.tag}>{skill}</span>
                    ))}
                    <span className={styles.tag} style={{ borderColor: "rgba(139, 92, 246, 0.3)", color: "var(--accent-violet)", fontWeight: 600 }}>
                      Complexity: {entry.complexity}/10
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Ideas board */}
          <div>
            <h2 style={{ fontSize: "1.6rem", marginBottom: "1.5rem" }}>💡 Ideas Pipeline</h2>
            <div className={styles.ideasContainer}>
              {/* Form */}
              <form onSubmit={handleAddIdea} className={`${styles.ideaForm} glass`} style={{ marginBottom: "1.5rem" }}>
                <h4 style={{ fontSize: "1rem", textTransform: "uppercase", letterSpacing: "0.05em", color: "var(--accent-rose)", marginBottom: "0.5rem" }}>Capture Idea</h4>
                <div className={styles.inputGroup}>
                  <input
                    type="text"
                    placeholder="Idea Title"
                    className={styles.inputField}
                    value={ideaTitle}
                    onChange={(e) => setIdeaTitle(e.target.value)}
                  />
                </div>
                <div className={styles.inputGroup}>
                  <textarea
                    placeholder="Describe your concept or hypothesis..."
                    className={styles.textareaField}
                    rows={3}
                    value={ideaDesc}
                    onChange={(e) => setIdeaDesc(e.target.value)}
                  />
                </div>
                <div className={styles.inputGroup}>
                  <label>Maturity</label>
                  <select
                    className={styles.selectField}
                    value={ideaMaturity}
                    onChange={(e) => setIdeaMaturity(e.target.value)}
                  >
                    <option value="EARLY">Early Concept</option>
                    <option value="MID">Prototype Stage</option>
                    <option value="MATURE">Mature Hypothesis</option>
                  </select>
                </div>
                <button type="submit" className={styles.demoButton} style={{ marginTop: "0.5rem" }}>
                  Save Concept
                </button>
              </form>

              {/* List */}
              {ideas.map((idea) => (
                <div key={idea.id} className={`${styles.ideaCard} glass`}>
                  <div className={styles.ideaHeader}>
                    <strong style={{ fontSize: "1.05rem" }}>{idea.title}</strong>
                    <span className={`${styles.ideaMaturity} ${styles[`maturity${idea.maturity}`]}`}>
                      {idea.maturity}
                    </span>
                  </div>
                  <p className={styles.ideaDesc}>{idea.description}</p>
                  {idea.status !== "MATURED" ? (
                    <button className={styles.ideaButton} onClick={() => handleMatureIdea(idea.id)}>
                      ⚙️ Mature to Active Project
                    </button>
                  ) : (
                    <span style={{ fontSize: "0.75rem", color: "var(--accent-emerald)", fontWeight: 700, marginTop: "0.5rem" }}>
                      ✓ Matured into Project
                    </span>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  function renderResume() {
    if (!resumeData) return null;

    return (
      <div>
        <div className={styles.header} style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end" }}>
          <div>
            <h1 className={styles.title}>Dynamic Resume</h1>
            <p className={styles.subtitle}>Role-tailored representations rendered directly from graph evidence</p>
          </div>
          
          <div className={styles.inputGroup} style={{ width: "250px" }}>
            <label style={{ color: "var(--accent-cyan)", fontWeight: 700 }}>Select Target Role</label>
            <select
              className={styles.selectField}
              value={selectedRole}
              onChange={(e) => setSelectedRole(e.target.value)}
            >
              <option value="Software Engineer">Software Engineer</option>
              <option value="Machine Learning Engineer">Machine Learning Engineer</option>
              <option value="Backend Engineer">Backend Engineer</option>
              <option value="Research Engineer">Research Engineer</option>
            </select>
          </div>
        </div>

        {/* Paper Sheet Preview */}
        <div className={styles.resumeSection}>
          <div className={styles.resumeHeader}>
            <div>
              <h2 className={styles.resumeTitle}>{resumeData.profile.name}</h2>
              <span className={styles.resumeRole}>{resumeData.target_role}</span>
            </div>
            <div className={styles.resumeContact}>
              <span>{resumeData.profile.email}</span>
              <span>github.com/{resumeData.profile.github_username}</span>
              <span>{resumeData.profile.location || "USA"}</span>
            </div>
          </div>

          <div className={styles.resumeSummary}>
            {resumeData.summary}
          </div>

          <h3 className={styles.resumeSub}>Verifiable Projects & Evidence</h3>
          {resumeData.projects.map((p: any) => (
            <div key={p.id} className={styles.resumeProject}>
              <div className={styles.resumeProjHead}>
                <h4 className={styles.resumeProjTitle}>{p.title}</h4>
                <div className={styles.resumeEvidenceRow}>
                  {p.evidence_links.map((link: any, lIdx: number) => (
                    <span key={lIdx} className={styles.evidenceBadge}>
                      📁 {link.label.substring(0, 15)}...
                    </span>
                  ))}
                </div>
              </div>
              <p className={styles.resumeProjNarr}>{p.narrative}</p>
            </div>
          ))}

          <h3 className={styles.resumeSub}>Evidence-Backed Achievements</h3>
          <ul style={{ paddingLeft: "1.2rem", marginBottom: "2rem", display: "flex", flexDirection: "column", gap: "0.5rem" }}>
            {resumeData.claims.map((claim: string, cIdx: number) => (
              <li key={cIdx} style={{ fontSize: "0.9rem", color: "#334155", lineHeight: "1.5" }}>
                {claim}
              </li>
            ))}
          </ul>

          <h3 className={styles.resumeSub}>Demonstrated Skills</h3>
          <div className={styles.resumeSkillsList}>
            {resumeData.skills.map((skill: string, sIdx: number) => (
              <span key={sIdx} className={styles.resumeSkillTag}>
                {skill}
              </span>
            ))}
          </div>
        </div>
      </div>
    );
  }

  function renderRecruiter() {
    if (!recruiterData) return null;

    return (
      <div>
        <div className={styles.header} style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end" }}>
          <div>
            <h1 className={styles.title}>Recruiter Mode</h1>
            <p className={styles.subtitle}>Evaluate candidate credentials mapped to concrete codebase provenance</p>
          </div>
          
          <div className={styles.inputGroup} style={{ width: "250px" }}>
            <label style={{ color: "var(--accent-cyan)", fontWeight: 700 }}>Select Benchmark Role</label>
            <select
              className={styles.selectField}
              value={selectedRole}
              onChange={(e) => setSelectedRole(e.target.value)}
            >
              <option value="Software Engineer">Software Engineer</option>
              <option value="Machine Learning Engineer">Machine Learning Engineer</option>
              <option value="Backend Engineer">Backend Engineer</option>
              <option value="Research Engineer">Research Engineer</option>
            </select>
          </div>
        </div>

        {/* Recruiter Evaluation Report */}
        <div className={styles.recruiterHeader}>
          <div className={styles.recruiterMatch}>
            <span style={{ fontSize: "0.8rem", textTransform: "uppercase", color: "var(--text-secondary)", fontWeight: 700 }}>
              AI Evaluator Alignment
            </span>
            <h2 style={{ fontSize: "1.8rem" }}>Benchmarking against {recruiterData.role_name}</h2>
            <p style={{ color: "var(--text-secondary)", fontSize: "0.95rem" }}>{recruiterData.why_text}</p>
          </div>
          <div className={`${styles.recruiterBadge} ${recruiterData.overall_match === "Strong Match" ? styles.badgeStrongMatch : styles.badgeModerateMatch}`}>
            {recruiterData.overall_match}
          </div>
        </div>

        <div className={styles.grid}>
          {/* Strengths and Gaps */}
          <div className={`${styles.cardHalf} ${styles.card} glass`}>
            <h3 className={styles.cardTitle} style={{ color: "var(--accent-emerald)" }}>✓ Strengths Detected</h3>
            <ul style={{ paddingLeft: "1.2rem", display: "flex", flexDirection: "column", gap: "0.5rem" }}>
              {recruiterData.strengths.length > 0 ? (
                recruiterData.strengths.map((str: string, sIdx: number) => (
                  <li key={sIdx} style={{ fontSize: "0.95rem", color: "var(--text-secondary)" }}>{str}</li>
                ))
              ) : (
                <li style={{ color: "var(--text-muted)", listStyleType: "none" }}>No advanced strengths cataloged yet.</li>
              )}
            </ul>
          </div>

          <div className={`${styles.cardHalf} ${styles.card} glass`}>
            <h3 className={styles.cardTitle} style={{ color: "var(--accent-rose)" }}>△ Emerging Skill Gaps</h3>
            <ul style={{ paddingLeft: "1.2rem", display: "flex", flexDirection: "column", gap: "0.5rem" }}>
              {recruiterData.gaps.length > 0 ? (
                recruiterData.gaps.map((gap: string, gIdx: number) => (
                  <li key={gIdx} style={{ fontSize: "0.95rem", color: "var(--text-secondary)" }}>{gap}</li>
                ))
              ) : (
                <li style={{ color: "var(--accent-emerald)", listStyleType: "none" }}>All benchmarked criteria satisfied.</li>
              )}
            </ul>
          </div>

          {/* Benchmark criteria table */}
          <div className={`${styles.cardFull} ${styles.card} glass`}>
            <h3 className={styles.cardTitle}>📊 Competency Benchmark Matrix</h3>
            <div className={styles.tableContainer}>
              <table className={styles.matchTable}>
                <thead>
                  <tr>
                    <th>Requirement Item</th>
                    <th>Type</th>
                    <th>Status</th>
                    <th>Evidence Summary Details</th>
                  </tr>
                </thead>
                <tbody>
                  {recruiterData.criteria_matches.map((criterion: any, idx: number) => (
                    <tr key={idx}>
                      <td style={{ fontWeight: 600 }}>{criterion.item_name}</td>
                      <td style={{ textTransform: "capitalize", color: "var(--text-secondary)" }}>{criterion.type}</td>
                      <td>
                        <span className={`${styles.matchBadge} ${styles[`match${criterion.status}`]}`}>
                          {criterion.status}
                        </span>
                      </td>
                      <td style={{ fontSize: "0.9rem", color: "var(--text-secondary)" }}>{criterion.details}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Verifiable claims list */}
          <div className={`${styles.cardFull} ${styles.card} glass`}>
            <h3 className={styles.cardTitle}>🕵️ Verified Claims Feed</h3>
            <p style={{ color: "var(--text-secondary)", fontSize: "0.9rem", marginBottom: "1.5rem" }}>
              Every accomplishment listed here corresponds to direct codebase signatures. Click any claim to inspect the source code files and commit path details.
            </p>
            <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
              {recruiterData.evidence_backed_claims.map((claim: any) => (
                <div
                  key={claim.id}
                  className={styles.buildingItem}
                  style={{ cursor: "pointer", transition: "all 0.2s" }}
                  onClick={() => openEvidenceDrawer(claim)}
                >
                  <div className={styles.buildingInfo}>
                    <span style={{ fontWeight: 600 }}>"{claim.claim}"</span>
                    <span style={{ fontSize: "0.8rem", color: "var(--accent-cyan)" }}>
                      Type: {claim.claim_type} • Verified Level: {claim.confidence * 100}%
                    </span>
                  </div>
                  <span style={{ color: "var(--accent-violet)", fontSize: "0.85rem", fontWeight: 700 }}>
                    Inspect Proof 📂
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }
}
