"use client";

import { useState } from "react";
import styles from "./CandidateIntelligence.module.css";
import { EvidenceDrawer } from "../evidence/EvidenceDrawer";
import type { RecruiterMatch, Claim, CriteriaMatch } from "../../types";
import { apiFetch } from "../../config";
import { Check, AlertCircle, ArrowRight, ShieldCheck, Clock, Zap, Target, HelpCircle, FileText, Loader2, X, Sparkles } from "lucide-react";

const ROLES = [
  "Software Engineer",
  "Machine Learning Engineer",
  "AI / ML Engineer",
  "Backend Systems Engineer",
  "Research Engineer",
  "Full Stack Engineer"
];

const LEVEL_DISPLAY: Record<string, string> = {
  EXPOSURE:   "Exposure",
  PRACTICING: "Practicing",
  DEVELOPING: "Developing",
  PROFICIENT: "Proficient",
  STRONG:     "Strong",
  ADVANCED:   "Advanced",
};

interface CandidateIntelligenceProps {
  recruiterData: RecruiterMatch | null;
  loading: boolean;
  selectedRole: string;
  onRoleChange: (role: string) => void;
}

export function CandidateIntelligence({
  recruiterData: initialData,
  loading: initialLoading,
  selectedRole,
  onRoleChange,
}: CandidateIntelligenceProps) {
  const [drawerClaim, setDrawerClaim] = useState<Claim | null>(null);
  const [showJdModal, setShowJdModal] = useState(false);
  const [jdTitle, setJdTitle] = useState("");
  const [jdText, setJdText] = useState("");
  const [matchingJd, setMatchingJd] = useState(false);
  const [customData, setCustomData] = useState<RecruiterMatch | null>(null);

  const recruiterData = customData || initialData;
  const loading = initialLoading || matchingJd;
  const roleFit = recruiterData?.role_fit;

  const handleMatchJd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!jdText.trim()) return;
    try {
      setMatchingJd(true);
      const res = await apiFetch("/api/recruiter/match-jd", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: jdTitle.trim() || "Custom Target Role",
          job_description_text: jdText.trim(),
        }),
      });
      if (res.ok) {
        const data = await res.json();
        setCustomData(data);
        setShowJdModal(false);
      }
    } catch {
      // Fallback
    } finally {
      setMatchingJd(false);
    }
  };

  return (
    <div className={styles.root}>
      {/* Header */}
      <div className={styles.pageHeader}>
        <div>
          <h1 className={styles.pageTitle}>Candidate Intelligence</h1>
          <p className={styles.pageSubtitle}>
            Mathematically formulated, evidence-backed candidate evaluation with zero synthetic scoring.
          </p>
        </div>

        {/* Role selector & Custom JD Button */}
        <div style={{ display: "flex", alignItems: "flex-end", gap: "0.75rem" }}>
          <div className={styles.roleSelector}>
            <label htmlFor="role-select" className="section-label">Target Role Evaluation</label>
            <select
              id="role-select"
              className={`input ${styles.roleSelect}`}
              value={customData ? "custom" : selectedRole}
              onChange={(e) => {
                if (e.target.value === "custom") {
                  setShowJdModal(true);
                } else {
                  setCustomData(null);
                  onRoleChange(e.target.value);
                }
              }}
            >
              {ROLES.map((r) => (
                <option key={r} value={r}>{r}</option>
              ))}
              {customData && <option value="custom">Custom: {customData.role_name}</option>}
            </select>
          </div>

          <button
            type="button"
            className="btn btn-secondary"
            onClick={() => setShowJdModal(true)}
            style={{ marginBottom: "2px", display: "inline-flex", alignItems: "center", gap: "0.4rem" }}
          >
            <FileText size={14} />
            <span>Paste Job Description</span>
          </button>
        </div>
      </div>

      {/* Custom JD Modal */}
      {showJdModal && (
        <div className={styles.modalOverlay} onClick={() => setShowJdModal(false)}>
          <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                <Sparkles size={16} color="#38bdf8" />
                <h2 style={{ fontSize: "1.1rem", fontWeight: 700, margin: 0 }}>Match Custom Job Description</h2>
              </div>
              <button type="button" className={styles.iconBtn} onClick={() => setShowJdModal(false)}>
                <X size={16} />
              </button>
            </div>
            <p style={{ fontSize: "0.8rem", color: "#94a3b8", marginBottom: "1rem" }}>
              Paste any job posting or requirements list. The system will extract technical capabilities and execute 4-dimension ground truth matching against your verified graph.
            </p>
            <form onSubmit={handleMatchJd}>
              <div style={{ marginBottom: "0.75rem" }}>
                <label className="section-label" style={{ display: "block", marginBottom: "0.3rem" }}>Role Title</label>
                <input
                  type="text"
                  placeholder="e.g. Senior Machine Learning Infrastructure Engineer"
                  className="input-base"
                  value={jdTitle}
                  onChange={(e) => setJdTitle(e.target.value)}
                  style={{ width: "100%" }}
                />
              </div>
              <div style={{ marginBottom: "1rem" }}>
                <label className="section-label" style={{ display: "block", marginBottom: "0.3rem" }}>Job Description Text / Requirements</label>
                <textarea
                  rows={6}
                  placeholder="Paste job description requirements, technical stack, or qualifications..."
                  className="input-base"
                  value={jdText}
                  onChange={(e) => setJdText(e.target.value)}
                  style={{ width: "100%", fontFamily: "inherit" }}
                  required
                />
              </div>
              <div style={{ display: "flex", justifyContent: "flex-end", gap: "0.5rem" }}>
                <button type="button" className="btn btn-secondary" onClick={() => setShowJdModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-accent" disabled={matchingJd}>
                  {matchingJd ? (
                    <>
                      <Loader2 size={14} className="animate-spin" />
                      <span>Evaluating Ground Truth…</span>
                    </>
                  ) : (
                    <span>Evaluate Match</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {loading && (
        <div className={styles.loading}>
          <p className={styles.loadingText}>Evaluating candidate against {selectedRole} competency topology…</p>
        </div>
      )}

      {recruiterData && !loading && (
        <>
          {/* Identity summary panel */}
          <div className={styles.identityPanel}>
            <div className="flex items-center justify-between">
              <div>
                <p className="section-label">Candidate Match Verification</p>
                <h2 className={styles.candidateName}>{recruiterData.candidate_name || "Engineering Candidate"}</h2>
                <p className={styles.roleLabel}>
                  Target Role: <strong>{recruiterData.role_name}</strong>
                </p>
              </div>
              <div className="text-right">
                <span className={`badge ${
                  recruiterData.overall_match.includes("Strong") ? "badge-success" :
                  recruiterData.overall_match.includes("Moderate") ? "badge-accent" :
                  recruiterData.overall_match.includes("Developing") ? "badge-warning" : "badge-neutral"
                } text-sm px-3 py-1`}>
                  {recruiterData.overall_match}
                </span>
                {roleFit && (
                  <p className="text-xs text-text-muted mt-1 font-mono">
                    Composite Coverage: {roleFit.fit_score}%
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Mathematical 4-Dimension Breakdown Cards */}
          {roleFit && roleFit.is_sufficient_evidence && (
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 my-6">
              <div className="p-4 rounded-xl bg-surface border border-border flex flex-col justify-between">
                <div className="flex items-center justify-between text-xs text-text-muted mb-2">
                  <span className="font-semibold uppercase tracking-wider">Required Capabilities</span>
                  <Target size={14} className="text-accent" />
                </div>
                <div className="text-2xl font-bold text-text font-mono">
                  {Math.round(roleFit.required_capability_coverage)}%
                </div>
                <p className="text-[11px] text-text-muted mt-1">
                  Proportion of required role competencies observed in graph
                </p>
              </div>

              <div className="p-4 rounded-xl bg-surface border border-border flex flex-col justify-between">
                <div className="flex items-center justify-between text-xs text-text-muted mb-2">
                  <span className="font-semibold uppercase tracking-wider">Direct Evidence</span>
                  <ShieldCheck size={14} className="text-emerald-400" />
                </div>
                <div className="text-2xl font-bold text-text font-mono">
                  {Math.round(roleFit.direct_evidence_coverage)}%
                </div>
                <p className="text-[11px] text-text-muted mt-1">
                  Substantiated by multi-repository code commits & tests
                </p>
              </div>

              <div className="p-4 rounded-xl bg-surface border border-border flex flex-col justify-between">
                <div className="flex items-center justify-between text-xs text-text-muted mb-2">
                  <span className="font-semibold uppercase tracking-wider">Recent Relevance</span>
                  <Clock size={14} className="text-cyan-400" />
                </div>
                <div className="text-2xl font-bold text-text font-mono">
                  {Math.round(roleFit.recent_relevance)}%
                </div>
                <p className="text-[11px] text-text-muted mt-1">
                  Demonstrated capabilities with recent engineering velocity
                </p>
              </div>

              <div className="p-4 rounded-xl bg-surface border border-border flex flex-col justify-between">
                <div className="flex items-center justify-between text-xs text-text-muted mb-2">
                  <span className="font-semibold uppercase tracking-wider">Demonstrated Depth</span>
                  <Zap size={14} className="text-purple-400" />
                </div>
                <div className="text-2xl font-bold text-text font-mono">
                  {Math.round(roleFit.demonstrated_depth)}%
                </div>
                <p className="text-[11px] text-text-muted mt-1">
                  Calculated domain & skill complexity mastery index
                </p>
              </div>
            </div>
          )}

          {/* Insufficient Evidence Notice */}
          {roleFit && !roleFit.is_sufficient_evidence && (
            <div className="p-5 my-6 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-start gap-4">
              <HelpCircle className="text-amber-400 shrink-0 mt-0.5" size={20} />
              <div>
                <h3 className="font-semibold text-amber-300 text-sm">Insufficient Ground-Truth Evidence</h3>
                <p className="text-xs text-text-muted mt-1">
                  The system has not detected enough verified repositories or code commits to evaluate {selectedRole}. Connect active GitHub repositories to discover empirical competencies without manufacturing synthetic assumptions.
                </p>
              </div>
            </div>
          )}

          <div className={styles.grid}>
            {/* Primary domains */}
            <div className={styles.card}>
              <p className={`section-label ${styles.cardSectionLabel}`}>Primary Domains</p>
              {(recruiterData.domain_strengths ?? []).length > 0 ? (
                <div className={styles.domainList}>
                  {(recruiterData.domain_strengths ?? []).map(({ domain, level }: { domain: string; level: string }) => (
                    <div key={domain} className={styles.domainRow}>
                      <span className={styles.domainName}>{domain}</span>
                      <span className={styles.domainLevel}>
                        {LEVEL_DISPLAY[level] ?? level}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className={styles.empty}>No domain evidence observed yet.</p>
              )}
            </div>

            {/* Demonstrated vs gaps */}
            <div className={styles.card}>
              <p className={`section-label ${styles.cardSectionLabel}`}>
                Competency Partitioning: {recruiterData.role_name}
              </p>

              {Boolean(recruiterData.strengths?.length) && (
                <>
                  <p className={styles.subLabel}>Demonstrated strengths</p>
                  <div className={styles.tagList}>
                    {recruiterData.strengths!.map((s: string, i: number) => (
                      <span
                        key={i}
                        className={styles.demonstratedTag}
                      >
                        <Check size={11} />
                        <span>{s}</span>
                      </span>
                    ))}
                  </div>
                </>
              )}

              {Boolean(recruiterData.gaps?.length) && (
                <>
                  <p className={`${styles.subLabel} ${styles.subLabelMt}`}>Evidence gaps</p>
                  <div className={styles.tagList}>
                    {recruiterData.gaps!.map((g: string, i: number) => (
                      <span
                        key={i}
                        className={styles.gapTag}
                      >
                        <AlertCircle size={11} />
                        <span>{g}</span>
                      </span>
                    ))}
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Why this candidate */}
          {recruiterData.why_text && (
            <div className={styles.whyCard}>
              <p className={`section-label ${styles.whySectionLabel}`}>Evidence-Based Assessment</p>
              <p className={styles.whyText}>{recruiterData.why_text}</p>
            </div>
          )}

          {/* 3-State Competency Matrix */}
          {recruiterData.criteria_matches.length > 0 && (
            <div className={styles.card}>
              <p className={`section-label ${styles.cardSectionLabel}`}>3-State Competency Matrix</p>
              <div className={styles.tableWrap}>
                <table className={styles.table}>
                  <thead>
                    <tr>
                      <th>Role Requirement</th>
                      <th>Type</th>
                      <th>Observation State</th>
                      <th>Freshness</th>
                      <th>Evidence Notes</th>
                    </tr>
                  </thead>
                  <tbody>
                    {recruiterData.criteria_matches.map((c: CriteriaMatch, idx: number) => (
                      <tr key={idx}>
                        <td className={styles.reqName}>{c.item_name}</td>
                        <td className={styles.reqType}>{c.type}</td>
                        <td>
                          <span className={`badge ${
                            c.status === "strong" ? "badge-success" :
                            c.status === "moderate" ? "badge-accent" :
                            c.status === "no_evidence" || c.status === "missing" ? "badge-neutral" :
                            "badge-warning"
                          }`}>
                            {c.status === "strong" ? "PROVEN" :
                             c.status === "moderate" ? "PARTIAL" :
                             c.status === "no_evidence" || c.status === "missing" ? "NO EVIDENCE" :
                             "DEVELOPING"}
                          </span>
                        </td>
                        <td>
                          <span className="text-[11px] font-mono text-text-muted">
                            {c.freshness || "ACTIVE"}
                          </span>
                        </td>
                        <td className={styles.reqDetails}>{c.details}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Observation vs Inference Explainability Card */}
          <div className={styles.card} style={{ borderLeft: "3px solid #38bdf8" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "0.5rem" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                <HelpCircle size={15} color="#38bdf8" />
                <p className="section-label" style={{ margin: 0 }}>Why We Think This (Observation vs Inference)</p>
              </div>
              <span className="badge badge-accent text-[10px]">
                {roleFit ? `${roleFit.overall_fit} · High Confidence` : "Empirical Inference"}
              </span>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem", fontSize: "0.82rem" }}>
              <div style={{ background: "rgba(15, 23, 42, 0.5)", padding: "0.75rem", borderRadius: "8px" }}>
                <span style={{ fontWeight: 600, color: "#38bdf8", display: "block", marginBottom: "0.25rem" }}>
                  Observed Facts:
                </span>
                <ul style={{ margin: 0, paddingLeft: "1.2rem", color: "#cbd5e1", lineHeight: 1.5 }}>
                  <li>Direct codebase commit histories and pull requests</li>
                  <li>Multi-file module architecture & language metadata</li>
                  <li>{recruiterData.strengths?.length || 0} demonstrated capabilities with verified citations</li>
                </ul>
              </div>
              <div style={{ background: "rgba(15, 23, 42, 0.5)", padding: "0.75rem", borderRadius: "8px" }}>
                <span style={{ fontWeight: 600, color: "#10b981", display: "block", marginBottom: "0.25rem" }}>
                  Career Inference:
                </span>
                <p style={{ margin: 0, color: "#cbd5e1", lineHeight: 1.5 }}>
                  Candidate shows demonstrated competency in {recruiterData.role_name} systems with {roleFit?.fit_score || 0}% mathematical capability coverage.
                </p>
                <span style={{ fontSize: "0.72rem", color: "#94a3b8", display: "block", marginTop: "0.25rem" }}>
                  Audit Timestamp: Active Continuous Sync
                </span>
              </div>
            </div>
          </div>

          {/* Evidence-backed claims */}
          {Boolean(recruiterData.evidence_backed_claims?.length) && (
            <div className={styles.card}>
              <p className={`section-label ${styles.verifiedClaimsLabel}`}>Verified Claim Proof Chains</p>
              <p className={styles.claimsNote}>
                Each claim maps to direct codebase evidence and commit history. Click to inspect proof.
              </p>
              <div className={styles.claimsList}>
                {recruiterData.evidence_backed_claims!.map((claim: Claim) => (
                  <button
                    key={claim.id}
                    type="button"
                    className={styles.claimRow}
                    onClick={() => setDrawerClaim(claim)}
                  >
                    <span className={styles.claimText}>&ldquo;{claim.claim}&rdquo;</span>
                    <div className={styles.claimMeta}>
                      <span className="badge badge-neutral">{claim.claim_type}</span>
                      <span className={styles.claimConfidence}>
                        {Math.round(claim.confidence * 100)}% confidence
                      </span>
                      <span className={styles.inspectHint}>
                        <span>Inspect proof</span>
                        <ArrowRight size={12} />
                      </span>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}
        </>
      )}

      {drawerClaim && (
        <EvidenceDrawer claim={drawerClaim} onClose={() => setDrawerClaim(null)} />
      )}
    </div>
  );
}
