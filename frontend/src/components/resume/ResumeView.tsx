"use client";

import styles from "./ResumeView.module.css";
import type { ResumeData } from "../../types";
import { Download, FileText, ShieldCheck, Check } from "lucide-react";

const ROLES = [
  "Software Engineer",
  "Machine Learning Engineer",
  "Backend Engineer",
  "Research Engineer",
];

interface ResumeViewProps {
  resumeData: ResumeData | null;
  loading: boolean;
  selectedRole: string;
  onRoleChange: (role: string) => void;
}

export function ResumeView({ resumeData, loading, selectedRole, onRoleChange }: ResumeViewProps) {
  const evidencePct = resumeData?.evidence_coverage
    ? Math.round(resumeData.evidence_coverage * 100)
    : null;

  return (
    <div className={styles.root}>
      {/* Page header */}
      <div className={styles.pageHeader}>
        <div>
          <h1 className={styles.pageTitle}>Resume</h1>
          <p className={styles.pageSubtitle}>
            Role-tailored projection of your career graph
          </p>
        </div>

        <div className={styles.roleSelector}>
          <label className="section-label" htmlFor="resume-role-select">Target role</label>
          <select
            id="resume-role-select"
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

      {/* Generation metadata */}
      {resumeData && (
        <div className={styles.metaBar}>
          <span className={styles.metaItem}>
            Generated from <strong>Career Graph</strong>
            {resumeData.generated_at && (
              <> · {new Date(resumeData.generated_at).toLocaleDateString()}</>
            )}
          </span>

          {evidencePct !== null && (
            <div className={styles.coverageBlock}>
              <span className={styles.coverageLabel}>Evidence coverage</span>
              <div className={styles.coverageBar}>
                <div
                  className={styles.coverageFill}
                  style={{ width: `${evidencePct}%` }}
                  role="meter"
                  aria-valuenow={evidencePct}
                  aria-valuemin={0}
                  aria-valuemax={100}
                />
              </div>
              <span className={styles.coveragePct}>{evidencePct}%</span>
            </div>
          )}

          {resumeData.claims_verified !== undefined && resumeData.total_claims !== undefined && (
            <span className={styles.metaItem}>
              Claims verified: <strong>{resumeData.claims_verified} / {resumeData.total_claims}</strong>
            </span>
          )}

          <span className={styles.metaItem}>
            Projects selected: <strong>{resumeData.projects.length}</strong>
          </span>
        </div>
      )}

      {/* Action bar */}
      {resumeData && (
        <div className={styles.actionBar}>
          <button
            type="button"
            className={`btn btn-primary ${styles.actionBtn}`}
            onClick={() => window.print()}
          >
            <Download size={14} />
            <span>Download PDF</span>
          </button>
          <button type="button" className={`btn btn-secondary ${styles.actionBtn}`}>
            <FileText size={14} />
            <span>ATS Preview</span>
          </button>
          <button type="button" className={`btn btn-ghost ${styles.actionBtn}`}>
            <ShieldCheck size={14} />
            <span>Evidence View</span>
          </button>
        </div>
      )}

      {loading && (
        <div className={styles.loading}>
          <p className={styles.loadingText}>Generating resume from career graph…</p>
        </div>
      )}

      {/* Resume document */}
      {resumeData && !loading && (
        <div className={styles.document}>
          {/* Header */}
          <div className={styles.docHeader}>
            <div>
              <h2 className={styles.docName}>{resumeData.profile.name}</h2>
              <p className={styles.docRole}>{resumeData.target_role}</p>
            </div>
            <div className={styles.docContact}>
              {resumeData.profile.email && <span>{resumeData.profile.email}</span>}
              {resumeData.profile.github_username && (
                <span>github.com/{resumeData.profile.github_username}</span>
              )}
              {/* Fix: omit location if not provided — never invent data */}
              {resumeData.profile.location && (
                <span>{resumeData.profile.location}</span>
              )}
            </div>
          </div>

          {/* Summary */}
          {resumeData.summary && (
            <div className={styles.docSection}>
              <p className={styles.docBody}>{resumeData.summary}</p>
            </div>
          )}

          {/* Projects */}
          {resumeData.projects.length > 0 && (
            <div className={styles.docSection}>
              <h3 className={styles.docSectionTitle}>Verifiable Projects &amp; Evidence</h3>
              {resumeData.projects.map((p) => (
                <div key={p.id} className={styles.docProject}>
                  <div className={styles.docProjHead}>
                    <h4 className={styles.docProjTitle}>{p.title}</h4>
                    <div className={styles.evidenceBadges}>
                      {p.evidence_links.map((link, i) => (
                        <span key={i} className={styles.evidenceBadge}>
                          {link.label.length > 20 ? link.label.substring(0, 20) + "…" : link.label}
                        </span>
                      ))}
                    </div>
                  </div>
                  {p.narrative && <p className={styles.docProjNarrative}>{p.narrative}</p>}

                  {/* Why selected — internal annotation */}
                  {p.selected_reasons && p.selected_reasons.length > 0 && (
                    <div className={styles.selectionAnnotation}>
                      <p className={styles.annotationLabel}>Selected because</p>
                      <div className={styles.annotationReasons}>
                        {p.selected_reasons.map((reason, i) => (
                          <span key={i} className={styles.annotationReason}>
                            <Check size={11} />
                            <span>{reason}</span>
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Claims */}
          {resumeData.claims.length > 0 && (
            <div className={styles.docSection}>
              <h3 className={styles.docSectionTitle}>Evidence-Backed Achievements</h3>
              <ul className={styles.claimsList}>
                {resumeData.claims.map((claim, i) => (
                  <li key={i} className={styles.claimItem}>{claim}</li>
                ))}
              </ul>
            </div>
          )}

          {/* Skills */}
          {resumeData.skills.length > 0 && (
            <div className={styles.docSection}>
              <h3 className={styles.docSectionTitle}>Demonstrated Skills</h3>
              <div className={styles.skillsGrid}>
                {resumeData.skills.map((skill, i) => (
                  <span key={i} className={styles.skillTag}>{skill}</span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
