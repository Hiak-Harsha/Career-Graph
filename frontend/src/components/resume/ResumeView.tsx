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
  SelectedWorkProject,
  EvidenceClaimItem,
  TechnicalDepthCluster,
} from "../../types";
import { apiFetch } from "../../config";
import { ProfessionalSignature } from "./ProfessionalSignature";
import { ResumeStrategyDrawer } from "./ResumeStrategyDrawer";
import { AtsPreviewModal } from "./AtsPreviewModal";
import { EvidenceDrawer } from "../evidence/EvidenceDrawer";
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

const PERSONALITIES: { id: ResumePersonality; label: string }[] = [
  { id: "modern_professional", label: "Modern" },
  { id: "technical", label: "Technical" },
  { id: "editorial", label: "Editorial" },
  { id: "research", label: "Research" },
  { id: "executive", label: "Executive" },
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
  const [personality, setPersonality] = useState<ResumePersonality>("modern_professional");
  const [blocksRep, setBlocksRep] = useState<ResumeBlockRepresentation | null>(null);
  const [loading, setLoading] = useState(false);
  const [strategyDrawerOpen, setStrategyDrawerOpen] = useState(false);
  const [atsModalOpen, setAtsModalOpen] = useState(false);
  const [selectedProofClaim, setSelectedProofClaim] = useState<Claim | null>(null);

  // Editing state
  const [isEditing, setIsEditing] = useState(false);
  const [editedPositioning, setEditedPositioning] = useState(() => resumeData?.summary || "");
  const [isImprovingSummary, setIsImprovingSummary] = useState(false);
  const [saveFeedback, setSaveFeedback] = useState<"idle" | "saved" | "error">("idle");
  const [saveErrorMessage, setSaveErrorMessage] = useState("");

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
  }, [selectedRole, personality, editedPositioning]);


  const handleRoleSelect = (role: string) => {
    setSelectedRole(role);
    onRoleChange?.(role);
  };

  const handleInspectClaim = (claimId: string, claimText: string) => {
    setSelectedProofClaim({
      id: claimId,
      claim: claimText,
      confidence: 1.0,
      status: "user_confirmed",
      evidence: [],
    });
  };

  const handleExportPdf = () => {
    if (blocksRep && resumeData) {
      exportVisualPdf(resumeData, personality);
    } else if (resumeData) {
      exportVisualPdf(resumeData, personality);
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
          summary: editedPositioning,
          target_role: selectedRole,
          variant: personality,
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
    personality === "editorial"
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

          <div className={styles.personalityGroup}>
            {PERSONALITIES.map((p) => (
              <button
                key={p.id}
                type="button"
                className={`${styles.personalityBtn} ${
                  personality === p.id ? styles.personalityBtnActive : ""
                }`}
                onClick={() => setPersonality(p.id)}
              >
                {p.label}
              </button>
            ))}
          </div>
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
                <span style={{ color: "#34d399", fontSize: "0.8rem", fontWeight: 600, display: "flex", alignItems: "center", gap: "0.25rem" }}>
                  <Check size={13} /> Saved
                </span>
              )}
              {saveFeedback === "error" && (
                <span style={{ color: "#f87171", fontSize: "0.8rem", fontWeight: 500, display: "flex", alignItems: "center", gap: "0.25rem" }} title={saveErrorMessage}>
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
            <span>ATS View</span>
          </button>
          <button type="button" className="btn btn-accent" onClick={handleExportPdf}>
            <Download size={14} />
            <span>Export PDF</span>
          </button>
        </div>
      </div>

      {/* Main Resume Sheet with Personality Transition Signature */}
      {loading && !blocksRep ? (
        <div style={{ display: "flex", justifyContent: "center", padding: "4rem 0" }}>
          <Loader2 size={28} className="animate-spin" color="#60a5fa" />
        </div>
      ) : (
        <AnimatePresence mode="wait">
          <motion.div
            key={personality}
            variants={personalityVariants[personality] || personalityVariants.modern_professional}
            initial="initial"
            animate="animate"
            exit="exit"
            className={paperClass}
            id="resume-document"
          >
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
                <span>{identityBlock?.location || resumeData?.profile?.location || "City, Country"}</span>
              </span>
              <span className={styles.contactItem}>
                <GithubIcon size={13} />
                <span>github.com/{identityBlock?.github || resumeData?.profile?.github_username || "username"}</span>
              </span>
            </div>
          </div>

          {/* 2. Professional Graph Signature */}
          {signatureBlock?.nodes && signatureBlock.nodes.length > 0 && (
            <ProfessionalSignature
              nodes={signatureBlock.nodes}
              edges={signatureBlock.edges || []}
              projectStyle={signatureBlock.project_style}
            />
          )}

          {/* 3. Core Positioning Block */}
          <section aria-labelledby="heading-positioning">
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <h2 id="heading-positioning" className={styles.sectionTitle}>
                <span>Core Profile & Positioning</span>
                <span className={styles.sectionSubtitle}>
                  Evidence Strength: {positioningBlock?.evidence_strength || "High"}
                </span>
              </h2>
              {isEditing && onAiImprove && (
                <button
                  type="button"
                  className="btn btn-secondary"
                  style={{ fontSize: "0.75rem", padding: "0.25rem 0.5rem", gap: "0.3rem" }}
                  onClick={handleAiImproveSummary}
                  disabled={isImprovingSummary}
                >
                  {isImprovingSummary ? (
                    <Loader2 size={12} className="animate-spin" />
                  ) : (
                    <Sparkles size={12} />
                  )}
                  <span>AI Polish</span>
                </button>
              )}
            </div>

            {isEditing ? (
              <textarea
                className={styles.positioningText}
                style={{
                  width: "100%",
                  minHeight: "80px",
                  background: "rgba(15, 23, 42, 0.4)",
                  border: "1px solid var(--border-subtle)",
                  borderRadius: "6px",
                  padding: "0.6rem",
                  color: "inherit",
                  fontFamily: "inherit",
                  fontSize: "0.9rem",
                  lineHeight: "1.5",
                  resize: "vertical",
                }}
                value={editedPositioning}
                onChange={(e) => setEditedPositioning(e.target.value)}
                placeholder="Enter your professional summary or positioning statement..."
              />
            ) : (
              <p className={styles.positioningText}>
                {editedPositioning ||
                  positioningBlock?.statement ||
                  resumeData?.summary ||
                  "Engineer focused on intelligent systems with strong algorithmic foundations."}
              </p>
            )}
          </section>

          {/* 4. Selected Work & Systems */}
          {selectedWorkBlock?.projects && selectedWorkBlock.projects.length > 0 && (
            <section aria-labelledby="heading-selected-work">
              <h2 id="heading-selected-work" className={styles.sectionTitle}>
                <span>Selected Work & Systems</span>
                <span className={styles.sectionSubtitle}>Verifiable Engineering Artifacts</span>
              </h2>
              <div className={styles.projectList}>
                {selectedWorkBlock.projects.map((proj: SelectedWorkProject) => (
                  <div key={proj.id || proj.title} className={styles.projectCard}>
                    <div className={styles.projectHeader}>
                      <div className={styles.projectTitleGroup}>
                        <h3 className={styles.projectTitle}>{proj.title}</h3>
                        <div className={styles.projectTechs}>
                          {proj.technologies?.map((t: string) => (
                            <span key={t} className={styles.techChip}>
                              {t}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>

                    <p className={styles.projectDesc}>{proj.description}</p>

                    {/* Verified Claims */}
                    {proj.evidence_claims && proj.evidence_claims.length > 0 && (
                      <div className={styles.claimsList}>
                        {proj.evidence_claims.map((c: EvidenceClaimItem) => (
                          <div key={c.id || c.claim} className={styles.claimRow}>
                            <span className={styles.claimText}>&ldquo;{c.claim}&rdquo;</span>
                            <button
                              type="button"
                              className={styles.inspectBtn}
                              onClick={() => handleInspectClaim(c.id || "", c.claim)}
                            >
                              <span>Inspect proof</span>
                              <ArrowRight size={11} />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* 5. Technical Depth Block */}
          {technicalDepthBlock?.clusters && technicalDepthBlock.clusters.length > 0 && (
            <section aria-labelledby="heading-technical-depth">
              <h2 id="heading-technical-depth" className={styles.sectionTitle}>
                <span>Technical Depth</span>
                <span className={styles.sectionSubtitle}>Evidence-Backed Capability Clusters</span>
              </h2>
              <div className={styles.depthGrid}>
                {technicalDepthBlock.clusters.map((cluster: TechnicalDepthCluster, idx: number) => (
                  <div key={idx} className={styles.depthCard}>
                    <span className={styles.depthDomain}>{cluster.domain}</span>
                    <span className={styles.depthCaps}>{cluster.capabilities}</span>
                    {cluster.evidence_note && (
                      <span className={styles.depthNote}>{cluster.evidence_note}</span>
                    )}
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* 6. Current Trajectory Block */}
          {trajectoryBlock && (
            <section aria-labelledby="heading-trajectory">
              <h2 id="heading-trajectory" className={styles.sectionTitle}>
                <span>Current Trajectory</span>
                <span className={styles.sectionSubtitle}>Next Horizons</span>
              </h2>
              <div className={styles.trajectoryCard}>
                <p className={styles.trajectoryText}>{trajectoryBlock.trajectory_text}</p>
                {trajectoryBlock.next_horizons && (
                  <div className={styles.horizonsRow}>
                    {trajectoryBlock.next_horizons.map((h: string) => (
                      <span key={h} className={styles.horizonChip}>
                        {h}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </section>
          )}

          {/* 7. Work Experience Block */}
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
                    {exp.bullets?.map((b: string, bIdx: number) => (
                      <p key={bIdx} className={styles.historyBullet}>
                        &bull; {b}
                      </p>
                    ))}
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
                      <span className={styles.historyDates}>
                        {edu.start_year} – {edu.end_year}
                      </span>
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
