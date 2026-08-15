"use client";

import { useState } from "react";
import styles from "./CandidateIntelligence.module.css";
import { EvidenceDrawer } from "../evidence/EvidenceDrawer";
import type { RecruiterData, Claim } from "../../types";

const ROLES = [
  "Software Engineer",
  "Machine Learning Engineer",
  "Backend Engineer",
  "Research Engineer",
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
  recruiterData: RecruiterData | null;
  loading: boolean;
  selectedRole: string;
  onRoleChange: (role: string) => void;
  profileName?: string;
}

export function CandidateIntelligence({
  recruiterData,
  loading,
  selectedRole,
  onRoleChange,
  profileName,
}: CandidateIntelligenceProps) {
  const [drawerClaim, setDrawerClaim] = useState<Claim | null>(null);

  return (
    <div className={styles.root}>
      {/* Page header */}
      <div className={styles.pageHeader}>
        <div>
          <h1 className={styles.pageTitle}>Candidate Intelligence</h1>
          <p className={styles.pageSubtitle}>Evidence-backed longitudinal role fit</p>
        </div>

        <div className={styles.roleSelector}>
          <label className="section-label" htmlFor="role-select">Role</label>
          <select
            id="role-select"
            className={`input-base ${styles.roleSelect}`}
            value={selectedRole}
            onChange={(e) => onRoleChange(e.target.value)}
          >
            {ROLES.map((r) => (
              <option key={r} value={r}>{r}</option>
            ))}
          </select>
        </div>
      </div>

      {loading && (
        <div className={styles.loading}>
          <p className={styles.loadingText}>Generating candidate profile…</p>
        </div>
      )}

      {recruiterData && !loading && (
        <>
          {/* Identity panel */}
          <div className={styles.identityPanel}>
            <div className={styles.candidateName}>
              {profileName ?? "Candidate"}
            </div>
            <p className={styles.roleLabel}>Evaluated for: {recruiterData.role_name}</p>
          </div>

          <div className={styles.grid}>
            {/* Primary domains */}
            <div className={styles.card}>
              <p className="section-label" style={{ marginBottom: "1rem" }}>Primary Domains</p>
              {(recruiterData.domain_strengths ?? []).length > 0 ? (
                <div className={styles.domainList}>
                  {(recruiterData.domain_strengths ?? []).map(({ domain, level }) => (
                    <div key={domain} className={styles.domainRow}>
                      <span className={styles.domainName}>{domain}</span>
                      <span className={styles.domainLevel}>
                        {LEVEL_DISPLAY[level] ?? level}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className={styles.empty}>No domain data.</p>
              )}
            </div>

            {/* Demonstrated vs gaps */}
            <div className={styles.card}>
              <p className="section-label" style={{ marginBottom: "1rem" }}>
                Role: {recruiterData.role_name}
              </p>

              {(recruiterData.demonstrated_skills ?? recruiterData.strengths).length > 0 && (
                <>
                  <p className={styles.subLabel}>Demonstrated</p>
                  <div className={styles.tagList}>
                    {(recruiterData.demonstrated_skills ?? recruiterData.strengths).map((s, i) => (
                      <span key={i} className={styles.demonstratedTag}>✓ {s}</span>
                    ))}
                  </div>
                </>
              )}

              {recruiterData.gaps.length > 0 && (
                <>
                  <p className={styles.subLabel} style={{ marginTop: "1rem" }}>Evidence gaps</p>
                  <div className={styles.tagList}>
                    {recruiterData.gaps.map((g, i) => (
                      <span key={i} className={styles.gapTag}>△ {g}</span>
                    ))}
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Why this candidate */}
          {recruiterData.why_text && (
            <div className={styles.whyCard}>
              <p className="section-label" style={{ marginBottom: "0.75rem" }}>Why this candidate?</p>
              <p className={styles.whyText}>{recruiterData.why_text}</p>
            </div>
          )}

          {/* Competency matrix */}
          {recruiterData.criteria_matches.length > 0 && (
            <div className={styles.card}>
              <p className="section-label" style={{ marginBottom: "1rem" }}>Competency Matrix</p>
              <div className={styles.tableWrap}>
                <table className={styles.table}>
                  <thead>
                    <tr>
                      <th>Requirement</th>
                      <th>Type</th>
                      <th>Status</th>
                      <th>Notes</th>
                    </tr>
                  </thead>
                  <tbody>
                    {recruiterData.criteria_matches.map((c, idx) => (
                      <tr key={idx}>
                        <td className={styles.reqName}>{c.item_name}</td>
                        <td className={styles.reqType}>{c.type}</td>
                        <td>
                          <span className={`badge ${
                            c.status === "strong" ? "badge-success" :
                            c.status === "moderate" ? "badge-accent" :
                            c.status === "weak" ? "badge-warning" :
                            "badge-neutral"
                          }`}>
                            {c.status}
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

          {/* Evidence-backed claims */}
          {recruiterData.evidence_backed_claims.length > 0 && (
            <div className={styles.card}>
              <p className="section-label" style={{ marginBottom: "0.5rem" }}>Verified Claims</p>
              <p className={styles.claimsNote}>
                Each claim maps to direct codebase evidence. Click to inspect the proof chain.
              </p>
              <div className={styles.claimsList}>
                {recruiterData.evidence_backed_claims.map((claim) => (
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
                      <span className={styles.inspectHint}>Inspect proof →</span>
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
