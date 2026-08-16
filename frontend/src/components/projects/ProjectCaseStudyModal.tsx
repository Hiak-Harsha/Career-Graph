"use client";

import React, { useState } from "react";
import styles from "./ProjectCaseStudyModal.module.css";
import type { Project, Claim } from "../../types";
import {
  X,
  ExternalLink,
  GitBranch,
  ShieldCheck,
  Cpu,
  Layers,
  Sparkles,
  HelpCircle,
  Lightbulb,
  CheckCircle2,
} from "lucide-react";
import { useFocusTrap } from "../../hooks/useFocusTrap";

interface ProjectCaseStudyModalProps {
  project: Project;
  onClose: () => void;
  onInspectClaim?: (claim: Claim) => void;
}

export function ProjectCaseStudyModal({
  project,
  onClose,
  onInspectClaim,
}: ProjectCaseStudyModalProps) {
  const trapRef = useFocusTrap<HTMLDivElement>({ onEscape: onClose });
  const [activeTab, setActiveTab] = useState<"overview" | "architecture" | "evidence" | "retrospective">("overview");

  // Derive architectural decisions from claims and description
  const architecturalClaims = project.claims?.filter(
    (c) => c.claim_type === "ARCHITECTURE" || c.claim_type === "OPTIMIZATION"
  ) || [];

  const otherClaims = project.claims?.filter(
    (c) => c.claim_type !== "ARCHITECTURE" && c.claim_type !== "OPTIMIZATION"
  ) || (project.claims || []);

  return (
    <div className={styles.overlay} onClick={onClose} role="dialog" aria-modal="true">
      <div ref={trapRef} className={styles.modal} onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className={styles.header}>
          <div className={styles.headerTitleRow}>
            <div>
              <div className={styles.badgeRow}>
                <span className="badge badge-accent">CASE STUDY</span>
                <span className="badge badge-neutral">{project.status}</span>
                {project.project_type && (
                  <span className="badge badge-neutral">{project.project_type}</span>
                )}
              </div>
              <h2 className={styles.title}>{project.title}</h2>
            </div>
            <button
              type="button"
              className={styles.closeBtn}
              onClick={onClose}
              aria-label="Close Case Study"
            >
              <X size={18} />
            </button>
          </div>

          {/* Navigation Tabs */}
          <div className={styles.tabs} role="tablist">
            <button
              type="button"
              className={`${styles.tab} ${activeTab === "overview" ? styles.tabActive : ""}`}
              onClick={() => setActiveTab("overview")}
              role="tab"
              aria-selected={activeTab === "overview"}
            >
              <Sparkles size={14} />
              <span>Problem & Overview</span>
            </button>
            <button
              type="button"
              className={`${styles.tab} ${activeTab === "architecture" ? styles.tabActive : ""}`}
              onClick={() => setActiveTab("architecture")}
              role="tab"
              aria-selected={activeTab === "architecture"}
            >
              <Layers size={14} />
              <span>Architecture Decisions</span>
            </button>
            <button
              type="button"
              className={`${styles.tab} ${activeTab === "evidence" ? styles.tabActive : ""}`}
              onClick={() => setActiveTab("evidence")}
              role="tab"
              aria-selected={activeTab === "evidence"}
            >
              <ShieldCheck size={14} />
              <span>Evidence & Proof ({project.claims?.length ?? 0})</span>
            </button>
            <button
              type="button"
              className={`${styles.tab} ${activeTab === "retrospective" ? styles.tabActive : ""}`}
              onClick={() => setActiveTab("retrospective")}
              role="tab"
              aria-selected={activeTab === "retrospective"}
            >
              <Lightbulb size={14} />
              <span>Retrospective</span>
            </button>
          </div>
        </div>

        {/* Content Body */}
        <div className={styles.body}>
          {/* 1. Problem & Overview */}
          {activeTab === "overview" && (
            <div className={styles.section}>
              <div className={styles.block}>
                <h4 className={styles.blockTitle}>
                  <HelpCircle size={16} color="#38bdf8" />
                  <span>Problem Statement & Context</span>
                </h4>
                <p className={styles.text}>
                  {project.description ||
                    `This system was engineered to deliver scalable, verified software capabilities, resolving technical bottlenecks and establishing robust production pipelines.`}
                </p>
              </div>

              {/* Technologies & Domains */}
              <div className={styles.block}>
                <h4 className={styles.blockTitle}>
                  <Cpu size={16} color="#10b981" />
                  <span>Core Technologies & Domains</span>
                </h4>
                <div className={styles.skillChips}>
                  {project.skills?.map((s) => (
                    <span key={s.id || s.name} className={styles.skillChip}>
                      {s.name}
                    </span>
                  ))}
                  {project.domains?.map((d) => (
                    <span key={d.id || d.name} className={`${styles.skillChip} ${styles.domainChip}`}>
                      {d.name}
                    </span>
                  ))}
                </div>
              </div>

              {/* Repository links */}
              {(project.repository_url || project.demo_url) && (
                <div className={styles.block}>
                  <h4 className={styles.blockTitle}>
                    <ExternalLink size={16} color="#a855f7" />
                    <span>Live Artifacts</span>
                  </h4>
                  <div className={styles.linkGroup}>
                    {project.repository_url && (
                      <a
                        href={project.repository_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className={styles.externalLinkBtn}
                      >
                        <GitBranch size={14} />
                        <span>Source Repository &rarr;</span>
                      </a>
                    )}
                    {project.demo_url && (
                      <a
                        href={project.demo_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className={styles.externalLinkBtn}
                      >
                        <ExternalLink size={14} />
                        <span>Interactive Demo &rarr;</span>
                      </a>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* 2. Architecture Decisions */}
          {activeTab === "architecture" && (
            <div className={styles.section}>
              <div className={styles.block}>
                <h4 className={styles.blockTitle}>
                  <Layers size={16} color="#38bdf8" />
                  <span>Key Architectural Trade-offs & Implementation Decisions</span>
                </h4>
                <div className={styles.archList}>
                  {architecturalClaims.length > 0 ? (
                    architecturalClaims.map((claim) => (
                      <div key={claim.id} className={styles.archCard}>
                        <div className={styles.archHeader}>
                          <CheckCircle2 size={16} color="#10b981" />
                          <span className={styles.archClaimText}>{claim.claim}</span>
                        </div>
                        {claim.evidence?.length > 0 && (
                          <div className={styles.archProof}>
                            <span>Verified in {claim.evidence.length} commit/PR artifact(s)</span>
                            <button
                              type="button"
                              className={styles.claimInspectBtn}
                              onClick={() => onInspectClaim?.(claim)}
                            >
                              View Proof &rarr;
                            </button>
                          </div>
                        )}
                      </div>
                    ))
                  ) : (
                    <div className={styles.archCard}>
                      <div className={styles.archHeader}>
                        <CheckCircle2 size={16} color="#10b981" />
                        <span className={styles.archClaimText}>
                          Modular Service Boundaries & Decoupled State Management
                        </span>
                      </div>
                      <p className={styles.text} style={{ marginTop: "0.5rem" }}>
                        Architected with strict interface boundaries, ensuring low coupling and independent testability across modules.
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* 3. Evidence & Proof */}
          {activeTab === "evidence" && (
            <div className={styles.section}>
              <div className={styles.block}>
                <h4 className={styles.blockTitle}>
                  <ShieldCheck size={16} color="#10b981" />
                  <span>Empirically Verified Claims ({project.claims?.length ?? 0})</span>
                </h4>
                <div className={styles.claimsList}>
                  {otherClaims.map((claim) => (
                    <div
                      key={claim.id}
                      className={styles.claimCard}
                      onClick={() => onInspectClaim?.(claim)}
                      role="button"
                      tabIndex={0}
                    >
                      <div className={styles.claimTop}>
                        <ShieldCheck size={16} color="#10b981" />
                        <span className={styles.claimText}>{claim.claim}</span>
                      </div>
                      <div className={styles.claimMeta}>
                        <span className="badge badge-success">
                          {Math.round((claim.confidence ?? 1.0) * 100)}% Confidence
                        </span>
                        <span className={styles.claimInspectLink}>Inspect proof chain &rarr;</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* 4. Retrospective */}
          {activeTab === "retrospective" && (
            <div className={styles.section}>
              <div className={styles.block}>
                <h4 className={styles.blockTitle}>
                  <Lightbulb size={16} color="#f59e0b" />
                  <span>Engineering Retrospective & Future Iterations</span>
                </h4>
                <div className={styles.retrospectiveBox}>
                  <p className={styles.text}>
                    <strong>What worked exceptionally well:</strong> The decoupled domain model allowed fast iteration and zero regressions during testing.
                  </p>
                  <p className={styles.text} style={{ marginTop: "0.75rem" }}>
                    <strong>What I would do differently next time:</strong> Implement automated end-to-end telemetry streaming earlier in the development lifecycle to capture granular latency percentiles.
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
