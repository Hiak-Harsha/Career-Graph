"use client";

import React, { useState, useEffect } from "react";
import styles from "./ResumeView.module.css";
import type { ResumeData, Claim, ResumeProject } from "../../types";
import { AtsPreviewModal } from "./AtsPreviewModal";
import { EvidenceDrawer } from "../evidence/EvidenceDrawer";
import { exportAtsPdf, exportVisualPdf } from "../../utils/pdfExport";
import {
  Download,
  FileText,
  ShieldCheck,
  Check,
  Loader2,
  Sparkles,
  Edit3,
  Save,
  Plus,
  Trash2,
  CheckSquare,
  Square,
  X,
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
  onSave?: (data: Partial<ResumeData>) => Promise<unknown>;
  onAiImprove?: (
    fieldType: "summary" | "bullet",
    text: string,
    targetRole: string
  ) => Promise<{ improved_text: string; suggestions?: string[] } | null>;
  saving?: boolean;
}

export function ResumeView({
  resumeData,
  loading,
  selectedRole,
  onRoleChange,
  onSave,
  onAiImprove,
  saving = false,
}: ResumeViewProps) {
  const [activeVariant, setActiveVariant] = useState<"visual" | "ats">("visual");
  const [viewMode, setViewMode] = useState<"standard" | "evidence">("standard");
  const [isEditing, setIsEditing] = useState(false);
  const [atsModalOpen, setAtsModalOpen] = useState(false);
  const [drawerClaim, setDrawerClaim] = useState<Claim | null>(null);
  const [savedSuccess, setSavedSuccess] = useState(false);

  // Local editable state
  const [summary, setSummary] = useState(resumeData?.summary || "");
  const [projects, setProjects] = useState<ResumeProject[]>(resumeData?.projects || []);
  const [skills, setSkills] = useState<string[]>(resumeData?.skills || []);
  const [experience, setExperience] = useState(resumeData?.experience || []);
  const [education, setEducation] = useState(resumeData?.education || []);
  const [certifications, setCertifications] = useState(resumeData?.certifications || []);
  const [newSkillInput, setNewSkillInput] = useState("");
  const [aiPolishing, setAiPolishing] = useState(false);

  // Sync state when incoming resumeData changes
  useEffect(() => {
    if (!resumeData) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setSummary(resumeData.summary || "");
    setProjects(resumeData.projects || []);
    setSkills(resumeData.skills || []);
    setExperience(resumeData.experience || []);
    setEducation(resumeData.education || []);
    setCertifications(resumeData.certifications || []);
  }, [resumeData]);

  const handleCitationClick = (label: string, url: string, contextTitle: string) => {
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

  const handleSave = async () => {
    if (!onSave || !resumeData) return;
    try {
      await onSave({
        ...resumeData,
        summary,
        projects,
        skills,
        experience,
        education,
        certifications,
        target_role: selectedRole,
        variant: activeVariant,
      });
      setSavedSuccess(true);
      setIsEditing(false);
      setTimeout(() => setSavedSuccess(false), 3000);
    } catch {
      // handled
    }
  };

  const handleAiPolishSummary = async () => {
    if (!onAiImprove) return;
    setAiPolishing(true);
    try {
      const data = await onAiImprove("summary", summary, selectedRole);
      if (data && data.improved_text) {
        setSummary(data.improved_text);
      }
    } catch {
      // ignore
    } finally {
      setAiPolishing(false);
    }
  };

  const handleAiPolishBullet = async (pIndex: number, bIndex: number, bulletText: string) => {
    if (!onAiImprove) return;
    try {
      const data = await onAiImprove("bullet", bulletText, selectedRole);
      if (data && data.improved_text) {
        handleUpdateBullet(pIndex, bIndex, data.improved_text);
      }
    } catch {
      // ignore
    }
  };

  const toggleProjectInclusion = (index: number) => {
    setProjects((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], included: next[index].included === false ? true : false };
      return next;
    });
  };

  const handleUpdateBullet = (pIndex: number, bIndex: number, text: string) => {
    setProjects((prev) => {
      const next = [...prev];
      const bullets = [...(next[pIndex].custom_bullets || next[pIndex].narrative.split(" • "))];
      bullets[bIndex] = text;
      next[pIndex] = { ...next[pIndex], custom_bullets: bullets, narrative: bullets.join(" • ") };
      return next;
    });
  };

  const handleAddBullet = (pIndex: number) => {
    setProjects((prev) => {
      const next = [...prev];
      const bullets = [...(next[pIndex].custom_bullets || next[pIndex].narrative.split(" • "))];
      bullets.push("Engineered new feature with verified code implementation");
      next[pIndex] = { ...next[pIndex], custom_bullets: bullets, narrative: bullets.join(" • ") };
      return next;
    });
  };

  const handleDeleteBullet = (pIndex: number, bIndex: number) => {
    setProjects((prev) => {
      const next = [...prev];
      const bullets = [...(next[pIndex].custom_bullets || next[pIndex].narrative.split(" • "))];
      bullets.splice(bIndex, 1);
      next[pIndex] = { ...next[pIndex], custom_bullets: bullets, narrative: bullets.join(" • ") };
      return next;
    });
  };

  const handleAddSkill = () => {
    const trimmed = newSkillInput.trim();
    if (!trimmed || skills.includes(trimmed)) return;
    setSkills((prev) => [...prev, trimmed]);
    setNewSkillInput("");
  };

  const handleRemoveSkill = (skillToRemove: string) => {
    setSkills((prev) => prev.filter((s) => s !== skillToRemove));
  };

  if (loading && !resumeData) {
    return (
      <div className={styles.loadingBox}>
        <Loader2 className="animate-spin" size={32} />
        <p>Analyzing Career Graph and generating tailored resume...</p>
      </div>
    );
  }

  if (!resumeData) return null;

  const currentPayload: ResumeData = {
    ...resumeData,
    summary,
    projects,
    skills,
    experience,
    education,
    certifications,
    target_role: selectedRole,
    variant: activeVariant,
  };

  return (
    <div className={styles.container}>
      {/* Top Toolbar */}
      <div className={styles.topBar}>
        <div className={styles.controlsGroup}>
          <div className={styles.roleSelectGroup}>
            <label htmlFor="role-select" className={styles.roleLabel}>
              Role
            </label>
            <select
              id="role-select"
              className={styles.roleSelect}
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

          {/* Variant Switcher */}
          <div className={styles.modeToggle} role="tablist">
            <button
              type="button"
              role="tab"
              aria-selected={activeVariant === "visual"}
              className={`${styles.modeBtn} ${activeVariant === "visual" ? styles.modeBtnActive : ""}`}
              onClick={() => setActiveVariant("visual")}
            >
              Visual View
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={activeVariant === "ats"}
              className={`${styles.modeBtn} ${activeVariant === "ats" ? styles.modeBtnActive : ""}`}
              onClick={() => setActiveVariant("ats")}
            >
              ATS Pure Text
            </button>
          </div>

          {/* Evidence Toggle in Visual Mode */}
          {activeVariant === "visual" && (
            <div className={styles.modeToggle} role="tablist">
              <button
                type="button"
                role="tab"
                aria-selected={viewMode === "standard"}
                className={`${styles.modeBtn} ${viewMode === "standard" ? styles.modeBtnActive : ""}`}
                onClick={() => setViewMode("standard")}
              >
                Standard
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={viewMode === "evidence"}
                className={`${styles.modeBtn} ${viewMode === "evidence" ? styles.modeBtnActive : ""}`}
                onClick={() => setViewMode("evidence")}
              >
                <ShieldCheck size={13} />
                Evidence View
              </button>
            </div>
          )}
        </div>

        <div className={styles.actionsGroup}>
          {onSave && (
            <>
              <button
                type="button"
                className={`${styles.actionBtn} ${isEditing ? styles.actionBtnPrimary : ""}`}
                onClick={() => setIsEditing(!isEditing)}
              >
                <Edit3 size={14} />
                {isEditing ? "Done Editing" : "Edit Resume"}
              </button>

              <button
                type="button"
                className={`${styles.actionBtn} ${savedSuccess ? styles.actionBtnSuccess : styles.actionBtnPrimary}`}
                onClick={handleSave}
                disabled={saving}
              >
                {saving ? (
                  <Loader2 className="animate-spin" size={14} />
                ) : savedSuccess ? (
                  <Check size={14} />
                ) : (
                  <Save size={14} />
                )}
                {savedSuccess ? "Saved!" : "Save"}
              </button>
            </>
          )}

          <button
            type="button"
            className={styles.actionBtn}
            onClick={() => setAtsModalOpen(true)}
            title="Preview plain text for copy-pasting into ATS forms"
          >
            <FileText size={14} />
            ATS Text
          </button>

          <button
            type="button"
            className={`${styles.actionBtn} ${styles.actionBtnPrimary}`}
            onClick={() => {
              if (activeVariant === "ats") {
                exportAtsPdf(currentPayload);
              } else {
                exportVisualPdf(currentPayload);
              }
            }}
          >
            <Download size={14} />
            {activeVariant === "ats" ? "Export ATS PDF" : "Export PDF"}
          </button>
        </div>
      </div>

      {isEditing && (
        <div className={styles.editModeBar}>
          <span>
            <strong>Edit Mode Active:</strong> Modify your summary, skills, custom bullet points, and included projects.
          </span>
          {onAiImprove && (
            <button
              type="button"
              className={styles.btnSmall}
              onClick={handleAiPolishSummary}
              disabled={aiPolishing}
            >
              <Sparkles size={12} />
              {aiPolishing ? "Enhancing..." : "AI Rephrase Summary"}
            </button>
          )}
        </div>
      )}

      {/* Rendered Resume Document */}
      <div
        id="resume-document"
        className={`${styles.resumePaper} ${activeVariant === "ats" ? styles.atsPaper : ""}`}
      >
        {/* Header */}
        <div className={styles.resumeHeader}>
          <h1 className={styles.headerName}>{resumeData.profile?.name || "Candidate"}</h1>
          <div className={styles.headerRole}>{selectedRole}</div>
          <div className={styles.headerContact}>
            {resumeData.profile?.email && <span>{resumeData.profile.email}</span>}
            {resumeData.profile?.location && <span>• {resumeData.profile.location}</span>}
            {resumeData.profile?.github_username && (
              <span>• github.com/{resumeData.profile.github_username}</span>
            )}
          </div>
        </div>

        {/* Professional Summary */}
        <div className={styles.section}>
          <h2 className={styles.sectionTitle}>Professional Summary</h2>
          {isEditing ? (
            <textarea
              className={styles.editableTextarea}
              rows={3}
              value={summary}
              onChange={(e) => setSummary(e.target.value)}
            />
          ) : (
            <p className={styles.summaryText}>{summary}</p>
          )}
        </div>

        {/* Technical Skills */}
        <div className={styles.section}>
          <h2 className={styles.sectionTitle}>Technical Skills</h2>
          {isEditing ? (
            <div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 8 }}>
                {skills.map((s, idx) => (
                  <span
                    key={idx}
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 4,
                      padding: "2px 8px",
                      borderRadius: 4,
                      background: "#e0f2fe",
                      color: "#0369a1",
                      fontSize: 12,
                    }}
                  >
                    {s}
                    <button
                      type="button"
                      onClick={() => handleRemoveSkill(s)}
                      style={{ border: "none", background: "none", cursor: "pointer", padding: 0 }}
                    >
                      <X size={12} />
                    </button>
                  </span>
                ))}
              </div>
              <div style={{ display: "flex", gap: 6, maxWidth: 320 }}>
                <input
                  type="text"
                  placeholder="Add skill (e.g. Docker, Rust)..."
                  className={styles.bulletInput}
                  value={newSkillInput}
                  onChange={(e) => setNewSkillInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      handleAddSkill();
                    }
                  }}
                />
                <button type="button" className={styles.btnSmall} onClick={handleAddSkill}>
                  Add
                </button>
              </div>
            </div>
          ) : (
            <div className={styles.skillsRow}>
              <span className={styles.skillsLabel}>Core Competencies: </span>
              {skills.map((s, idx) => (
                <React.Fragment key={idx}>
                  <span>{s}</span>
                  {idx < skills.length - 1 && ", "}
                </React.Fragment>
              ))}
            </div>
          )}
        </div>

        {/* Work Experience */}
        {experience.length > 0 && (
          <div className={styles.section}>
            <h2 className={styles.sectionTitle}>Professional Experience</h2>
            {experience.map((exp, expIdx) => (
              <div key={expIdx} className={styles.projectCard}>
                <div className={styles.projectHeader}>
                  <h3 className={styles.projectTitle}>
                    {exp.role} — <span style={{ color: "#2563eb" }}>{exp.company}</span>
                  </h3>
                  <span className={styles.projectTech}>
                    {exp.start_date} – {exp.end_date}
                  </span>
                </div>
                {exp.description && <p className={styles.summaryText}>{exp.description}</p>}
                {exp.bullets && exp.bullets.length > 0 && (
                  <ul className={styles.bulletList}>
                    {exp.bullets.map((b, bIdx) => (
                      <li key={bIdx} className={styles.bulletItem}>
                        {b}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Projects */}
        <div className={styles.section}>
          <h2 className={styles.sectionTitle}>
            {activeVariant === "ats" ? "Technical Projects & Experience" : "Verified Projects & Experience"}
          </h2>

          {projects.map((p, pIdx) => {
            const isIncluded = p.included !== false;
            if (!isEditing && !isIncluded) return null;

            const bullets = p.custom_bullets?.length
              ? p.custom_bullets
              : (p.narrative || "").split(" • ").filter(Boolean);

            return (
              <div
                key={p.id || pIdx}
                className={styles.projectCard}
                style={{ opacity: isIncluded ? 1 : 0.4 }}
              >
                <div className={styles.projectHeader}>
                  <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    {isEditing && (
                      <button
                        type="button"
                        style={{ border: "none", background: "none", cursor: "pointer", padding: 0 }}
                        onClick={() => toggleProjectInclusion(pIdx)}
                      >
                        {isIncluded ? <CheckSquare size={16} color="#2563eb" /> : <Square size={16} color="#94a3b8" />}
                      </button>
                    )}
                    <h3 className={styles.projectTitle}>{p.title}</h3>
                    {viewMode === "evidence" && activeVariant === "visual" && (
                      <span
                        className={`${styles.evidenceBadge} ${styles.evidenceBadgeClickable}`}
                        onClick={() => {
                          if (p.evidence_links?.[0]) {
                            handleCitationClick(p.evidence_links[0].label, p.evidence_links[0].url, p.title);
                          }
                        }}
                      >
                        <ShieldCheck size={10} />
                        Proof #{pIdx + 1}
                      </span>
                    )}
                  </div>

                  {p.skills && p.skills.length > 0 && (
                    <span className={styles.projectTech}>[{p.skills.slice(0, 4).join(", ")}]</span>
                  )}
                </div>

                {isEditing ? (
                  <div style={{ marginTop: 8 }}>
                    {bullets.map((b, bIdx) => (
                      <div key={bIdx} className={styles.bulletEditRow}>
                        <input
                          type="text"
                          className={styles.bulletInput}
                          value={b}
                          onChange={(e) => handleUpdateBullet(pIdx, bIdx, e.target.value)}
                        />
                        {onAiImprove && (
                          <button
                            type="button"
                            className={styles.btnSmall}
                            onClick={() => handleAiPolishBullet(pIdx, bIdx, b)}
                            title="AI Rephrase Bullet"
                          >
                            <Sparkles size={11} />
                          </button>
                        )}
                        <button
                          type="button"
                          className={`${styles.btnSmall} ${styles.btnSmallDanger}`}
                          onClick={() => handleDeleteBullet(pIdx, bIdx)}
                          title="Delete bullet"
                        >
                          <Trash2 size={12} />
                        </button>
                      </div>
                    ))}
                    <button
                      type="button"
                      className={styles.btnSmall}
                      onClick={() => handleAddBullet(pIdx)}
                      style={{ marginTop: 4 }}
                    >
                      <Plus size={12} /> Add Bullet Point
                    </button>
                  </div>
                ) : (
                  <ul className={styles.bulletList}>
                    {bullets.map((b, bIdx) => (
                      <li key={bIdx} className={styles.bulletItem}>
                        {b}
                        {viewMode === "evidence" && activeVariant === "visual" && (
                          <span
                            className={styles.citationChip}
                            onClick={() => {
                              const link = p.evidence_links?.[bIdx % (p.evidence_links.length || 1)];
                              handleCitationClick(link?.label || `Proof-${bIdx + 1}`, link?.url || "#", p.title);
                            }}
                          >
                            [{bIdx + 1}]
                          </span>
                        )}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            );
          })}
        </div>

        {/* Education & Credentials */}
        {(education.length > 0 || certifications.length > 0) && (
          <div className={styles.section}>
            <h2 className={styles.sectionTitle}>Education & Credentials</h2>
            {education.map((edu, idx) => (
              <div key={idx} style={{ marginBottom: 8, fontSize: 13, color: "#334155" }}>
                <strong>{edu.degree}</strong> — {edu.institution} ({edu.start_year || ""} - {edu.end_year || ""})
              </div>
            ))}
            {certifications.map((cert, idx) => (
              <div key={idx} style={{ fontSize: 13, color: "#334155" }}>
                <strong>{cert.name}</strong> — {cert.issuer} {cert.issue_date && `(${cert.issue_date})`}
              </div>
            ))}
          </div>
        )}

        {/* Claims / Verified Achievements */}
        {resumeData.claims && resumeData.claims.length > 0 && (
          <div className={styles.section}>
            <h2 className={styles.sectionTitle}>Key Technical Achievements</h2>
            <ul className={styles.bulletList}>
              {resumeData.claims.map((claim, idx) => (
                <li key={idx} className={styles.bulletItem}>
                  {claim}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      {/* Plain Text ATS Preview Modal */}
      {atsModalOpen && (
        <AtsPreviewModal
          resumeData={currentPayload}
          onClose={() => setAtsModalOpen(false)}
        />
      )}

      {/* Evidence Verification Drawer */}
      {drawerClaim && (
        <EvidenceDrawer
          claim={drawerClaim}
          onClose={() => setDrawerClaim(null)}
        />
      )}
    </div>
  );
}
