"use client";

import React, { useState, useEffect } from "react";
import styles from "./ResumeView.module.css";
import type {
  ResumeData,
  Claim,
  ResumePersonality,
  ResumeBlockRepresentation,
  ResumeBlockItem,
  IdentityBlockPayload,
  SignatureBlockPayload,
  PositioningBlockPayload,
  SelectedWorkBlockPayload,
  TechnicalDepthBlockPayload,
  TrajectoryBlockPayload,
  ExperienceBlockPayload,
  EducationBlockPayload,
  CertificationsBlockPayload,
  ResumeFormat,
  ResumeSaveRequest,
} from "../../types";
import { apiFetch } from "../../config";
import { ProfessionalSignature } from "./ProfessionalSignature";
import { ResumeStrategyDrawer } from "./ResumeStrategyDrawer";
import { AtsPreviewModal } from "./AtsPreviewModal";
import { EvidenceDrawer } from "../evidence/EvidenceDrawer";
import { FeaturedResumeView } from "./FeaturedResumeView";
import { AtsCleanResumeView } from "./AtsCleanResumeView";
import { ResumeStylePicker } from "./ResumeStylePicker";
import { EditableSection } from "./EditableSection";
import { exportVisualPdf, exportAtsPdf } from "../../utils/pdfExport";
import { GithubIcon } from "../ui/icons/GithubIcon";
import { motion, AnimatePresence } from "framer-motion";
import { personalityVariants } from "../../lib/motion";
import {
  Download,
  Eye,
  Sliders,
  ShieldCheck,
  MapPin,
  Mail,
  ArrowRight,
  Loader2,
  Edit3,
  Check,
  Sparkles,
  Award,
  ExternalLink,
  Palette,
} from "lucide-react";

interface ResumeViewProps {
  initialRole?: string;
  selectedRole?: string;
  onRoleChange?: (role: string) => void;
  onSave?: (data: Partial<ResumeData>) => Promise<unknown>;
  resumeData?: ResumeData | null;
  loading?: boolean;
  saving?: boolean;
  onAiImprove?: (
    fieldType: "summary" | "bullet",
    text: string,
    targetRole: string
  ) => Promise<{ improved_text?: string; suggestions?: string[] } | void>;
}

const ROLES = [
  "AI / ML Engineer",
  "Backend Systems Engineer",
  "Research Engineer",
  "Full Stack Engineer",
];

export function ResumeView({
  initialRole = "AI / ML Engineer",
  onRoleChange,
  onSave,
  resumeData,
  saving = false,
  onAiImprove,
}: ResumeViewProps) {
  const [selectedRole, setSelectedRole] = useState(initialRole);
  const [resumeFormat, setResumeFormat] = useState<ResumeFormat>(
    () => (resumeData?.resume_format as ResumeFormat) || "ats_clean"
  );
  const [personality, setPersonality] = useState<ResumePersonality>("modern_professional");
  const [visibleSections, setVisibleSections] = useState<string[]>(
    () =>
      resumeData?.visible_sections || [
        "summary",
        "skills",
        "experience",
        "achievements",
        "projects",
        "education",
        "certifications",
      ]
  );
  const [sectionOrder, setSectionOrder] = useState<string[]>(
    () =>
      resumeData?.section_order || [
        "summary",
        "skills",
        "experience",
        "achievements",
        "projects",
        "education",
        "certifications",
      ]
  );
  const [showStylePicker, setShowStylePicker] = useState(false);
  const [blocksRep, setBlocksRep] = useState<ResumeBlockRepresentation | null>(null);
  const [loading, setLoading] = useState(false);
  const [isAutoGenerating, setIsAutoGenerating] = useState(false);
  const [strategyDrawerOpen, setStrategyDrawerOpen] = useState(false);
  const [atsModalOpen, setAtsModalOpen] = useState(false);
  const [selectedProofClaim, setSelectedProofClaim] = useState<Claim | null>(null);

  // Full Structured Editing state
  const [isEditing, setIsEditing] = useState(false);
  const [editedResume, setEditedResume] = useState<Partial<ResumeSaveRequest>>({});
  const [editedPositioning, setEditedPositioning] = useState(() => resumeData?.summary || "");
  const [isImprovingSummary, setIsImprovingSummary] = useState(false);
  const [saveFeedback, setSaveFeedback] = useState<"idle" | "saved" | "error">("idle");
  const [saveErrorMessage, setSaveErrorMessage] = useState("");

  const handleAutoGenerate = async () => {
    try {
      setIsAutoGenerating(true);
      setLoading(true);
      const res = await apiFetch("/resume/featured/auto-generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });
      if (res.ok) {
        const data: ResumeBlockRepresentation = await res.json();
        setBlocksRep(data);
        setResumeFormat("ats_clean");
        setPersonality("featured");
        if (data.target_role) {
          setSelectedRole(data.target_role);
          if (onRoleChange) onRoleChange(data.target_role);
        }
      }
    } catch {
      // Handled gracefully
    } finally {
      setIsAutoGenerating(false);
      setLoading(false);
    }
  };

  // Fetch block-based structured representation
  useEffect(() => {
    let isMounted = true;
    async function fetchRepresentation() {
      try {
        setLoading(true);
        const res = await apiFetch("/resume/representation", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            target_role: selectedRole,
            layout_preference: personality,
            resume_format: resumeFormat,
          }),
        });

        if (res.ok && isMounted) {
          const data: ResumeBlockRepresentation = await res.json();
          setBlocksRep(data);
          const positioningPayload = data.blocks.find(
            (b) => b.block_type === "positioning"
          )?.content_payload as PositioningBlockPayload | undefined;
          if (positioningPayload?.statement && !editedPositioning) {
            setEditedPositioning(positioningPayload.statement);
          }
        }
      } catch {
        // Handled silently
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    fetchRepresentation();
    return () => {
      isMounted = false;
    };
  }, [selectedRole, personality, resumeFormat, editedPositioning]);

  const handleRoleSelect = (role: string) => {
    setSelectedRole(role);
    onRoleChange?.(role);
  };

  const handleExportPdf = () => {
    if (resumeData) {
      exportVisualPdf(
        {
          ...resumeData,
          resume_format: resumeFormat,
          visible_sections: visibleSections,
          section_order: sectionOrder,
        },
        resumeFormat === "ats_clean" ? "ats_clean" : personality
      );
    }
  };

  const handleExportAts = () => {
    if (resumeData) {
      exportAtsPdf(resumeData);
    }
  };

  const handleSaveResume = async () => {
    if (onSave) {
      try {
        setSaveFeedback("idle");
        setSaveErrorMessage("");
        await onSave({
          summary: editedResume.summary ?? editedPositioning,
          skills: (editedResume.skills as string[]) ?? resumeData?.skills,
          claims: (editedResume.claims as string[]) ?? resumeData?.claims,
          projects: editedResume.projects ?? resumeData?.projects,
          experience: editedResume.experience ?? resumeData?.experience,
          education: editedResume.education ?? resumeData?.education,
          certifications: editedResume.certifications ?? resumeData?.certifications,
          target_role: selectedRole,
          variant: personality,
          resume_format: resumeFormat,
          visible_sections: visibleSections,
          section_order: sectionOrder,
        });
        setSaveFeedback("saved");
        setIsEditing(false);
        setTimeout(() => setSaveFeedback("idle"), 3500);
      } catch (err: unknown) {
        setSaveFeedback("error");
        setSaveErrorMessage(err instanceof Error ? err.message : "Failed to save resume.");
      }
    }
  };

  const handleAiImproveSummary = async () => {
    if (!onAiImprove || !editedPositioning) return;
    try {
      setIsImprovingSummary(true);
      const res = await onAiImprove("summary", editedPositioning, selectedRole);
      if (res && res.improved_text) {
        setEditedPositioning(res.improved_text);
        setEditedResume((prev: Partial<ResumeSaveRequest>) => ({ ...prev, summary: res.improved_text }));
      }
    } catch {
      // Handled silently
    } finally {
      setIsImprovingSummary(false);
    }
  };

  // Helper to extract typed blocks
  const getBlock = (type: string): ResumeBlockItem | undefined => {
    return blocksRep?.blocks.find((b) => b.block_type === type);
  };

  const identityBlock = getBlock("identity")?.content_payload as IdentityBlockPayload | undefined;
  const signatureBlock = getBlock("signature")?.content_payload as SignatureBlockPayload | undefined;
  const positioningBlock = getBlock("positioning")?.content_payload as PositioningBlockPayload | undefined;
  const selectedWorkBlock = getBlock("selected_work")?.content_payload as SelectedWorkBlockPayload | undefined;
  const technicalDepthBlock = getBlock("technical_depth")?.content_payload as TechnicalDepthBlockPayload | undefined;
  const trajectoryBlock = getBlock("trajectory")?.content_payload as TrajectoryBlockPayload | undefined;
  const experienceBlock = getBlock("experience")?.content_payload as ExperienceBlockPayload | undefined;
  const educationBlock = getBlock("education")?.content_payload as EducationBlockPayload | undefined;
  const certsBlock = getBlock("certifications")?.content_payload as CertificationsBlockPayload | undefined;

  // Personality paper CSS class
  const paperClass =
    resumeFormat === "ats_clean"
      ? styles.paper
      : personality === "editorial"
      ? `${styles.paper} ${styles.paperEditorial}`
      : personality === "technical"
      ? `${styles.paper} ${styles.paperTechnical}`
      : personality === "research"
      ? `${styles.paper} ${styles.paperResearch}`
      : personality === "executive"
      ? `${styles.paper} ${styles.paperExecutive}`
      : styles.paper;

  return (
    <div className={styles.container}>
      {/* Top Toolbar */}
      <div className={styles.topBar}>
        <div className={styles.controlsGroup}>
          <div className={styles.roleSelectGroup}>
            <span className={styles.roleLabel}>Target Role:</span>
            <select
              className={styles.roleSelect}
              value={selectedRole}
              onChange={(e) => handleRoleSelect(e.target.value)}
              aria-label="Select target role"
            >
              {ROLES.map((r) => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
            </select>
          </div>

          <button
            type="button"
            className="btn btn-secondary"
            style={{
              display: "flex",
              alignItems: "center",
              gap: "0.35rem",
              borderColor: "rgba(56, 189, 248, 0.4)",
              background: "rgba(56, 189, 248, 0.06)",
            }}
            onClick={handleAutoGenerate}
            disabled={isAutoGenerating}
            title="Auto-evaluate best fitting role and ATS-clean featured layout"
          >
            {isAutoGenerating ? (
              <Loader2 size={13} className="animate-spin" />
            ) : (
              <Sparkles size={13} color="#38bdf8" />
            )}
            <span>Auto-Generate Featured</span>
          </button>

          <button
            type="button"
            className="btn btn-secondary"
            style={{
              display: "flex",
              alignItems: "center",
              gap: "0.35rem",
              borderColor: showStylePicker ? "#0284c7" : undefined,
              background: showStylePicker ? "rgba(2, 132, 199, 0.1)" : undefined,
            }}
            onClick={() => setShowStylePicker(!showStylePicker)}
            title="Choose format, visual personality, and section visibility"
          >
            <Palette size={14} color="#0284c7" />
            <span>Format & Style ({resumeFormat === "ats_clean" ? "ATS Clean" : personality})</span>
          </button>
        </div>

        <div className={styles.actionsGroup}>
          {onSave && (
            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
              <button
                type="button"
                className={`btn ${isEditing ? "btn-primary" : "btn-secondary"}`}
                onClick={() => {
                  if (isEditing) {
                    handleSaveResume();
                  } else {
                    setIsEditing(true);
                  }
                }}
                disabled={saving}
              >
                {saving ? (
                  <>
                    <Loader2 size={14} className="animate-spin" />
                    <span>Saving...</span>
                  </>
                ) : isEditing ? (
                  <>
                    <Check size={14} />
                    <span>Save Changes</span>
                  </>
                ) : (
                  <>
                    <Edit3 size={14} />
                    <span>Edit Resume</span>
                  </>
                )}
              </button>
              {saveFeedback === "saved" && (
                <span
                  style={{
                    color: "#34d399",
                    fontSize: "0.8rem",
                    fontWeight: 600,
                    display: "flex",
                    alignItems: "center",
                    gap: "0.25rem",
                  }}
                >
                  <Check size={13} /> Saved
                </span>
              )}
              {saveFeedback === "error" && (
                <span
                  style={{
                    color: "#f87171",
                    fontSize: "0.8rem",
                    fontWeight: 500,
                    display: "flex",
                    alignItems: "center",
                    gap: "0.25rem",
                  }}
                  title={saveErrorMessage}
                >
                  {saveErrorMessage || "Save failed"}
                </span>
              )}
            </div>
          )}

          <button
            type="button"
            className="btn btn-secondary"
            onClick={() => setStrategyDrawerOpen(true)}
          >
            <Sliders size={14} />
            <span>Strategy & Critic</span>
          </button>
          <button
            type="button"
            className="btn btn-secondary"
            onClick={() => setAtsModalOpen(true)}
          >
            <Eye size={14} />
            <span>ATS Plain</span>
          </button>
          <button type="button" className="btn btn-accent" onClick={handleExportPdf}>
            <Download size={14} />
            <span>Export PDF</span>
          </button>
        </div>
      </div>

      {/* Style & Format Customization Drawer / Panel */}
      {showStylePicker && (
        <ResumeStylePicker
          resumeFormat={resumeFormat}
          onFormatChange={setResumeFormat}
          personality={personality}
          onPersonalityChange={setPersonality}
          visibleSections={visibleSections}
          onVisibleSectionsChange={setVisibleSections}
          sectionOrder={sectionOrder}
          onSectionOrderChange={setSectionOrder}
        />
      )}

      {/* Main Resume Sheet or Structured Editor */}
      {isEditing ? (
        <div className={styles.paper} style={{ maxWidth: 780, margin: "0 auto", padding: "2rem" }}>
          <h2 style={{ fontSize: "1.25rem", fontWeight: 800, marginBottom: "1.25rem" }}>
            Structured Resume Editor
          </h2>

          <EditableSection
            title="Professional Summary & Positioning Bullets"
            itemLabel="Bullet"
            items={
              editedResume.summary
                ? editedResume.summary.split("\n\n").filter(Boolean)
                : positioningBlock?.summary_bullets || [editedPositioning || ""]
            }
            onChange={(bullets) => {
              const joined = bullets.join("\n\n");
              setEditedPositioning(joined);
              setEditedResume((prev: Partial<ResumeSaveRequest>) => ({ ...prev, summary: joined }));
            }}
          />

          <EditableSection
            title="Core Skills & Competencies"
            itemLabel="Skill"
            items={
              (editedResume.skills as string[]) ||
              resumeData?.skills ||
              (technicalDepthBlock?.clusters
                ?.flatMap((c) => c.capabilities.split(/[·•,]+/))
                .map((s) => s.trim())
                .filter(Boolean) || [
                "Python",
                "Distributed Systems",
                "FastAPI",
                "TypeScript",
              ])
            }
            onChange={(skills) => {
              setEditedResume((prev: Partial<ResumeSaveRequest>) => ({ ...prev, skills }));
            }}
          />

          <EditableSection
            title="Key Verified Achievements"
            itemLabel="Achievement"
            items={(editedResume.claims as string[]) || resumeData?.claims || []}
            onChange={(claims) => {
              setEditedResume((prev: Partial<ResumeSaveRequest>) => ({ ...prev, claims }));
            }}
          />
        </div>
      ) : loading && !blocksRep ? (
        <div style={{ display: "flex", justifyContent: "center", padding: "4rem 0" }}>
          <Loader2 size={28} className="animate-spin" color="#60a5fa" />
        </div>
      ) : (
        <AnimatePresence mode="wait">
          <motion.div
            key={`${resumeFormat}-${personality}`}
            variants={
              personalityVariants[resumeFormat === "ats_clean" ? "ats_clean" : personality] ||
              personalityVariants.modern_professional
            }
            initial="initial"
            animate="animate"
            exit="exit"
            className={paperClass}
            id="resume-document"
          >
            {resumeFormat === "ats_clean" ? (
              <AtsCleanResumeView
                blocksRep={blocksRep}
                resumeData={resumeData}
                visibleSections={visibleSections}
                sectionOrder={sectionOrder}
                onInspectProof={(id, text) =>
                  setSelectedProofClaim({
                    id,
                    claim: text,
                    confidence: 1.0,
                    status: "user_confirmed",
                    evidence: [],
                  })
                }
              />
            ) : personality === "featured" && blocksRep?.blocks ? (
              <FeaturedResumeView
                blocks={blocksRep.blocks}
                onInspectProof={setSelectedProofClaim}
              />
            ) : (
              <>
          {/* 1. Identity Block */}
          <div className={styles.headerBlock}>
            <div className={styles.nameRow}>
              <h1 className={styles.candidateName}>
                {identityBlock?.name || resumeData?.profile?.name || "Your Name"}
              </h1>
              <span className={styles.verifiedBadge}>
                <ShieldCheck size={14} />
                <span>Verified Career Graph</span>
              </span>
            </div>
            <p className={styles.headlineText}>
              {identityBlock?.headline || `${selectedRole.toUpperCase()} · VERIFIED ENGINEER`}
            </p>
            <div className={styles.contactRow}>
              <span className={styles.contactItem}>
                <Mail size={13} />
                <span>{identityBlock?.email || resumeData?.profile?.email || "your.email@example.com"}</span>
              </span>
              <span className={styles.contactItem}>
                <MapPin size={13} />
                <span>{identityBlock?.location || resumeData?.profile?.location || "San Francisco, CA"}</span>
              </span>
              <span className={styles.contactItem}>
                <GithubIcon size={13} />
                <span>github.com/{identityBlock?.github || resumeData?.profile?.github_username || "developer"}</span>
              </span>
            </div>
          </div>

          {/* 2. Professional Signature Block */}
          {signatureBlock?.nodes && signatureBlock.nodes.length > 0 && (
            <section aria-labelledby="heading-signature">
              <div className={styles.sectionHeader}>
                <h2 id="heading-signature" className={styles.sectionTitle}>
                  <span>Professional Signature</span>
                </h2>
                <span className={styles.sectionBadge}>Graph Architecture</span>
              </div>
              <ProfessionalSignature
                nodes={signatureBlock.nodes}
                edges={signatureBlock.edges || []}
                projectStyle={signatureBlock.project_style}
              />
            </section>
          )}

          {/* 3. Positioning Block */}
          <section aria-labelledby="heading-positioning">
            <div className={styles.sectionHeader}>
              <h2 id="heading-positioning" className={styles.sectionTitle}>
                <span>Core Profile & Positioning</span>
              </h2>
              {onAiImprove && (
                <button
                  type="button"
                  className={styles.aiImproveBtn}
                  onClick={handleAiImproveSummary}
                  disabled={isImprovingSummary}
                >
                  {isImprovingSummary ? (
                    <Loader2 size={12} className="animate-spin" />
                  ) : (
                    <Sparkles size={12} />
                  )}
                  <span>AI Critique & Polish</span>
                </button>
              )}
            </div>
            {isEditing ? (
              <textarea
                className={styles.editTextarea}
                value={editedPositioning}
                onChange={(e) => setEditedPositioning(e.target.value)}
                placeholder="Write your high-signal professional positioning statement..."
                rows={4}
              />
            ) : (
              <p className={styles.positioningStatement}>
                {editedPositioning ||
                  positioningBlock?.statement ||
                  resumeData?.summary ||
                  "Systems engineer specializing in high-performance architectures, verifiable technical execution, and algorithmic solvers."}
              </p>
            )}
          </section>

          {/* 4. Selected Work Block */}
          <section aria-labelledby="heading-selected-work">
            <div className={styles.sectionHeader}>
              <h2 id="heading-selected-work" className={styles.sectionTitle}>
                <span>Selected Work & Systems</span>
              </h2>
              <span className={styles.sectionBadge}>
                {blocksRep?.verification_rate ? `${Math.round(blocksRep.verification_rate * 100)}% Verified` : "Verifiable Proofs"}
              </span>
            </div>
            <div className={styles.projectsList}>
              {selectedWorkBlock?.projects?.map((proj) => (
                <div key={proj.id} className={styles.projectCard}>
                  <div className={styles.projectTop}>
                    <div className={styles.projectTitleArea}>
                      <span className={styles.projectTitle}>{proj.title}</span>
                      {proj.repository_url && (
                        <a
                          href={proj.repository_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className={styles.repoLink}
                        >
                          <ExternalLink size={12} />
                          <span>Code</span>
                        </a>
                      )}
                    </div>
                  </div>
                  <p className={styles.projectDesc}>{proj.description}</p>
                  
                  {proj.technologies && proj.technologies.length > 0 && (
                    <div className={styles.techChipsRow}>
                      {proj.technologies.map((t, idx) => (
                        <span key={idx} className={styles.techChip}>
                          {t}
                        </span>
                      ))}
                    </div>
                  )}

                  {proj.evidence_claims && proj.evidence_claims.length > 0 && (
                    <div className={styles.claimsList}>
                      {proj.evidence_claims.map((claim) => (
                        <div
                          key={claim.id}
                          className={styles.claimItem}
                          onClick={() => {
                            setSelectedProofClaim({
                              id: claim.id,
                              claim: claim.claim,
                              confidence: claim.confidence,
                              claim_type: claim.type,
                              status: "user_confirmed",
                              project_id: proj.id,
                            } as Claim);
                          }}
                        >
                          <span className={styles.claimCheck}>✓</span>
                          <span className={styles.claimText}>{claim.claim}</span>
                          <span className={styles.inspectProofHint}>Inspect Proof</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </section>

          {/* 5. Technical Depth Block */}
          {technicalDepthBlock?.clusters && technicalDepthBlock.clusters.length > 0 && (
            <section aria-labelledby="heading-tech-depth">
              <div className={styles.sectionHeader}>
                <h2 id="heading-tech-depth" className={styles.sectionTitle}>
                  <span>Technical Depth & Capabilities</span>
                </h2>
                <span className={styles.sectionBadge}>Evidence Clustered</span>
              </div>
              <div className={styles.clustersGrid}>
                {technicalDepthBlock.clusters.map((c, i) => (
                  <div key={i} className={styles.clusterCard}>
                    <span className={styles.clusterDomain}>{c.domain}</span>
                    <span className={styles.clusterCaps}>{c.capabilities}</span>
                    {c.evidence_note && (
                      <span className={styles.clusterNote}>{c.evidence_note}</span>
                    )}
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* 6. Current Trajectory Block */}
          {trajectoryBlock && (
            <section aria-labelledby="heading-trajectory">
              <div className={styles.sectionHeader}>
                <h2 id="heading-trajectory" className={styles.sectionTitle}>
                  <span>Current Trajectory & Growth</span>
                </h2>
                <span className={styles.sectionBadge}>Horizon Analysis</span>
              </div>
              <div className={styles.trajectoryCard}>
                <p className={styles.trajectoryText}>{trajectoryBlock.trajectory_text}</p>
                {trajectoryBlock.next_horizons && trajectoryBlock.next_horizons.length > 0 && (
                  <div className={styles.horizonsList}>
                    <span className={styles.horizonsLabel}>Active Horizons:</span>
                    {trajectoryBlock.next_horizons.map((h, i) => (
                      <span key={i} className={styles.horizonChip}>
                        <ArrowRight size={11} />
                        <span>{h}</span>
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </section>
          )}

          {/* 7. Experience Block */}
          {Boolean(experienceBlock?.experiences && experienceBlock.experiences.length > 0) && (
            <section aria-labelledby="heading-experience">
              <h2 id="heading-experience" className={styles.sectionTitle}>
                <span>Professional Experience</span>
              </h2>
              <div className={styles.historyList}>
                {experienceBlock?.experiences?.map((exp, i) => (
                  <div key={i} className={styles.historyItem}>
                    <div className={styles.historyHeader}>
                      <span className={styles.historyTitle}>{exp.role}</span>
                      <span className={styles.historyDates}>
                        {exp.start_date} – {exp.end_date}
                      </span>
                    </div>
                    <span className={styles.historySubtitle}>{exp.company}</span>
                    {exp.description && (
                      <p className={styles.historyDesc}>{exp.description}</p>
                    )}
                    {exp.bullets && exp.bullets.length > 0 && (
                      <ul className={styles.bulletsList}>
                        {exp.bullets.map((b, bIdx) => (
                          <li key={bIdx}>{b}</li>
                        ))}
                      </ul>
                    )}
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* 8. Education Block */}
          {Boolean(educationBlock?.educations && educationBlock.educations.length > 0) && (
            <section aria-labelledby="heading-education">
              <h2 id="heading-education" className={styles.sectionTitle}>
                <span>Education</span>
              </h2>
              <div className={styles.historyList}>
                {educationBlock?.educations?.map((edu, i) => (
                  <div key={i} className={styles.historyItem}>
                    <div className={styles.historyHeader}>
                      <span className={styles.historyTitle}>{edu.institution}</span>
                      {edu.start_year && (
                        <span className={styles.historyDates}>
                          {edu.start_year} – {edu.end_year || "Present"}
                        </span>
                      )}
                    </div>
                    <span className={styles.historySubtitle}>
                      {edu.degree} {edu.field_of_study ? `in ${edu.field_of_study}` : ""}
                    </span>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* 9. Certifications Block */}
          {Boolean(certsBlock?.certifications && certsBlock.certifications.length > 0) && (
            <section aria-labelledby="heading-certifications">
              <h2 id="heading-certifications" className={styles.sectionTitle}>
                <span>Certifications & Credentials</span>
              </h2>
              <div className={styles.historyList}>
                {certsBlock?.certifications?.map((cert, i) => (
                  <div key={i} className={styles.historyItem}>
                    <div className={styles.historyHeader}>
                      <span className={styles.historyTitle} style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}>
                        <Award size={13} color="var(--accent-primary)" />
                        <span>{cert.name}</span>
                      </span>
                      {cert.issue_date && (
                        <span className={styles.historyDates}>{cert.issue_date}</span>
                      )}
                    </div>
                    <span className={styles.historySubtitle}>
                      {cert.issuer}
                      {cert.credential_url && (
                        <a
                          href={cert.credential_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          style={{ marginLeft: "0.5rem", color: "var(--accent-primary)", display: "inline-flex", alignItems: "center", gap: "0.2rem" }}
                        >
                          <ExternalLink size={11} />
                        </a>
                      )}
                    </span>
                  </div>
                ))}
              </div>
            </section>
          )}
            </>
          )}
          </motion.div>
        </AnimatePresence>
      )}

      {/* Intelligence & Strategy Drawer */}
      {strategyDrawerOpen && (
        <ResumeStrategyDrawer
          targetRole={selectedRole}
          personality={personality}
          onClose={() => setStrategyDrawerOpen(false)}
          onApplyImprovement={(newRep) => setBlocksRep(newRep)}
        />
      )}

      {/* ATS Preview Modal */}
      {atsModalOpen && resumeData && (
        <AtsPreviewModal
          resumeData={resumeData}
          onClose={() => setAtsModalOpen(false)}
          onExportAts={handleExportAts}
        />
      )}

      {/* Inline Proof Drawer */}
      {selectedProofClaim && (
        <EvidenceDrawer
          claim={selectedProofClaim}
          onClose={() => setSelectedProofClaim(null)}
        />
      )}
    </div>
  );
}
