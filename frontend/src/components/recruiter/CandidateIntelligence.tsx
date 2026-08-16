"use client";

import { useState } from "react";
import styles from "./CandidateIntelligence.module.css";
import { EvidenceDrawer } from "../evidence/EvidenceDrawer";
import type { RecruiterMatch, Claim, CriteriaMatch } from "../../types";
import { Check, AlertCircle, ArrowRight } from "lucide-react";

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
  recruiterData: RecruiterMatch | null;
  loading: boolean;
  selectedRole: string;
  onRoleChange: (role: string) => void;
}

export function CandidateIntelligence({
  recruiterData,
  loading,
  selectedRole,
  onRoleChange,
}: CandidateIntelligenceProps) {
  const [drawerClaim, setDrawerClaim] = useState<Claim | null>(null);

  return (
    <div className={styles.root}>
      {/* Header */}
      <div className={styles.pageHeader}>
        <div>
          <h1 className={styles.pageTitle}>Candidate Intelligence</h1>
          <p className={styles.pageSubtitle}>
            Objective, evidence-backed evaluation tailored to specific role criteria.
          </p>
        </div>

        {/* Role selector */}
        <div className={styles.roleSelector}>
          <label htmlFor="role-select" className="section-label">Target Role</label>
          <select
            id="role-select"
            className={`input ${styles.roleSelect}`}
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
          <p className={styles.loadingText}>Evaluating candidate against {selectedRole} criteria…</p>
        </div>
      )}

      {recruiterData && !loading && (
        <>
          {/* Identity summary panel */}
          <div className={styles.identityPanel}>
            <p className="section-label">Candidate</p>
            <h2 className={styles.candidateName}>{recruiterData.candidate_name}</h2>
            <p className={styles.roleLabel}>
              Evaluating for <strong>{recruiterData.role_name}</strong>
            </p>
          </div>

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
                <p className={styles.empty}>No domain data.</p>
              )}
            </div>

            {/* Demonstrated vs gaps */}
            <div className={styles.card}>
              <p className={`section-label ${styles.cardSectionLabel}`}>
                Role: {recruiterData.role_name}
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
              <p className={`section-label ${styles.whySectionLabel}`}>Why this candidate?</p>
              <p className={styles.whyText}>{recruiterData.why_text}</p>
            </div>
          )}

          {/* Competency matrix */}
          {recruiterData.criteria_matches.length > 0 && (
            <div className={styles.card}>
              <p className={`section-label ${styles.cardSectionLabel}`}>Competency Matrix</p>
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
                    {recruiterData.criteria_matches.map((c: CriteriaMatch, idx: number) => (
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
          {Boolean(recruiterData.evidence_backed_claims?.length) && (
            <div className={styles.card}>
              <p className={`section-label ${styles.verifiedClaimsLabel}`}>Verified Claims</p>
              <p className={styles.claimsNote}>
                Each claim maps to direct codebase evidence. Click to inspect the proof chain.
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
