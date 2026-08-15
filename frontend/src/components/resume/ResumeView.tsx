"use client";

import React, { useState } from "react";
import styles from "./ResumeView.module.css";
import type { ResumeData, Claim } from "../../types";
import { AtsPreviewModal } from "./AtsPreviewModal";
import { EvidenceDrawer } from "../evidence/EvidenceDrawer";
import {
  Download,
  FileText,
  ShieldCheck,
  Check,
  Loader2,
  ExternalLink,
  Eye,
} from "lucide-react";

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

export function ResumeView({
  resumeData,
  loading,
  selectedRole,
  onRoleChange,
}: ResumeViewProps) {
  const [viewMode, setViewMode] = useState<"standard" | "evidence">("standard");
  const [atsModalOpen, setAtsModalOpen] = useState(false);
  const [exportingPdf, setExportingPdf] = useState(false);
  const [drawerClaim, setDrawerClaim] = useState<Claim | null>(null);

  const evidencePct = resumeData?.evidence_coverage
    ? Math.round(resumeData.evidence_coverage * 100)
    : null;

  const handleExportPdf = async () => {
    const element = document.getElementById("resume-document");
    if (!element || !resumeData) return;

    setExportingPdf(true);
    try {
      const html2canvas = (await import("html2canvas")).default;
      const { jsPDF } = await import("jspdf");

      const canvas = await html2canvas(element, {
        scale: 2,
        useCORS: true,
        logging: false,
        backgroundColor: "#FFFFFF",
      });

      const imgData = canvas.toDataURL("image/png");
      const pdf = new jsPDF("p", "mm", "a4");
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (canvas.height * pdfWidth) / canvas.width;

      pdf.addImage(imgData, "PNG", 0, 0, pdfWidth, pdfHeight);
      pdf.save(
        `${resumeData.profile.name.replace(/\s+/g, "_")}_${resumeData.target_role.replace(/\s+/g, "_")}_Resume.pdf`
      );
    } catch (err) {
      console.error("PDF generation failed:", err);
      // Fallback to print
      window.print();
    } finally {
      setExportingPdf(false);
    }
  };

  const handleCitationClick = (label: string, url: string, contextTitle: string) => {
    // Construct verifiable claim object for EvidenceDrawer
    const syntheticClaim: Claim = {
      id: `citation-${label}`,
      claim: `${contextTitle}: ${label}`,
      confidence: 0.95,
      evidence: [
        {
          id: `ev-${label}`,
          type: "GITHUB_COMMIT",
          source: url || "GitHub Repository",
          source_url: url || undefined,
          captured_at: new Date().toISOString(),
          confidence: 0.95,
        },
      ],
    };
    setDrawerClaim(syntheticClaim);
  };

  return (
    <div className={styles.root}>
      {/* Page header */}
      <div className={styles.pageHeader}>
        <div>
          <h1 className={styles.pageTitle}>Resume</h1>
          <p className={styles.pageSubtitle}>
            Role-tailored projection of your career graph with verifiable evidence
          </p>
        </div>

        <div className={styles.roleSelector}>
          <label className="section-label" htmlFor="resume-role-select">
            Target role
          </label>
          <select
            id="resume-role-select"
            className={`input-base ${styles.roleSelect}`}
            value={selectedRole}
            onChange={(e) => onRoleChange(e.target.value)}
          >
            {ROLES.map((r) => (
              <option key={r} value={r}>
                {r}
              </option>
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

          {resumeData.claims_verified !== undefined &&
            resumeData.total_claims !== undefined && (
              <span className={styles.metaItem}>
                Claims verified:{" "}
                <strong>
                  {resumeData.claims_verified} / {resumeData.total_claims}
                </strong>
              </span>
            )}

          <span className={styles.metaItem}>
            Projects selected: <strong>{resumeData.projects.length}</strong>
          </span>
        </div>
      )}

      {/* Action bar & Mode toggle */}
      {resumeData && (
        <div className={styles.actionBar}>
          <div className={styles.actionBtnGroup}>
            <button
              type="button"
              className={`btn btn-primary ${styles.actionBtn}`}
              onClick={handleExportPdf}
              disabled={exportingPdf}
            >
              {exportingPdf ? (
                <Loader2 size={14} className="animate-spin" />
              ) : (
                <Download size={14} />
              )}
              <span>{exportingPdf ? "Generating PDF…" : "Download PDF"}</span>
            </button>

            <button
              type="button"
              className={`btn btn-secondary ${styles.actionBtn}`}
              onClick={() => setAtsModalOpen(true)}
            >
              <FileText size={14} />
              <span>ATS Preview</span>
            </button>
          </div>

          {/* Segmented View Mode Toggle */}
          <div className={styles.viewModeToggle} role="tablist" aria-label="Resume view mode">
            <button
              type="button"
              className={`${styles.viewModeBtn} ${
                viewMode === "standard" ? styles.viewModeBtnActive : ""
              }`}
              onClick={() => setViewMode("standard")}
              role="tab"
              aria-selected={viewMode === "standard"}
            >
              <Eye size={12} />
              <span>Standard View</span>
            </button>
            <button
              type="button"
              className={`${styles.viewModeBtn} ${
                viewMode === "evidence" ? styles.viewModeBtnActive : ""
              }`}
              onClick={() => setViewMode("evidence")}
              role="tab"
              aria-selected={viewMode === "evidence"}
            >
              <ShieldCheck size={12} />
              <span>Evidence View</span>
            </button>
          </div>
        </div>
      )}

      {loading && (
        <div className={styles.loading}>
          <p className={styles.loadingText}>Generating resume from career graph…</p>
        </div>
      )}

      {/* Resume document */}
      {resumeData && !loading && (
        <div className={styles.document} id="resume-document">
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
              <h3 className={styles.docSectionTitle}>
                Verifiable Projects &amp; Experience
              </h3>
              {resumeData.projects.map((p, pIdx) => (
                <div key={p.id} className={styles.docProject}>
                  <div className={styles.docProjHead}>
                    <h4 className={styles.docProjTitle}>
                      <span>{p.title}</span>
                      {viewMode === "evidence" && (
                        <button
                          type="button"
                          className={styles.citationChip}
                          onClick={() =>
                            handleCitationClick(
                              p.evidence_links[0]?.label ?? `Project Verification`,
                              p.evidence_links[0]?.url ?? "",
                              p.title
                            )
                          }
                          title="Click to inspect evidence in drawer"
                        >
                          <ShieldCheck size={10} />
                          <span>Proof #{pIdx + 1}</span>
                        </button>
                      )}
                    </h4>
                    <div className={styles.evidenceBadges}>
                      {p.evidence_links.map((link, i) => (
                        <span
                          key={i}
                          className={`${styles.evidenceBadge} ${
                            viewMode === "evidence" ? styles.evidenceBadgeClickable : ""
                          }`}
                          onClick={() => {
                            if (viewMode === "evidence") {
                              handleCitationClick(link.label, link.url, p.title);
                            }
                          }}
                        >
                          {link.label.length > 20
                            ? link.label.substring(0, 20) + "…"
                            : link.label}
                        </span>
                      ))}
                    </div>
                  </div>
                  {p.narrative && (
                    <p className={styles.docProjNarrative}>{p.narrative}</p>
                  )}

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
              <h3 className={styles.docSectionTitle}>
                Evidence-Backed Achievements
              </h3>
              <ul className={styles.claimsList}>
                {resumeData.claims.map((claim, i) => (
                  <li key={i} className={styles.claimItem}>
                    <span>{claim}</span>
                    {viewMode === "evidence" && (
                      <button
                        type="button"
                        className={styles.citationChip}
                        onClick={() =>
                          handleCitationClick(
                            `Claim #${i + 1}`,
                            "",
                            claim
                          )
                        }
                        title="Click to inspect proof in drawer"
                      >
                        <ShieldCheck size={10} />
                        <span>[{i + 1}]</span>
                      </button>
                    )}
                  </li>
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
                  <span key={i} className={styles.skillTag}>
                    {skill}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ATS Plain Text Modal */}
      {atsModalOpen && resumeData && (
        <AtsPreviewModal
          resumeData={resumeData}
          onClose={() => setAtsModalOpen(false)}
        />
      )}

      {/* Evidence Drawer triggered from citation chips */}
      {drawerClaim && (
        <EvidenceDrawer
          claim={drawerClaim}
          onClose={() => setDrawerClaim(null)}
        />
      )}
    </div>
  );
}
