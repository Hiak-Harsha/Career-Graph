"use client";

import { useEffect } from "react";
import styles from "./EvidenceDrawer.module.css";
import type { Claim } from "../../types";

interface EvidenceDrawerProps {
  claim: Claim;
  onClose: () => void;
}

const EVIDENCE_TYPE_LABEL: Record<string, string> = {
  GITHUB_COMMIT:  "Git Commit",
  GITHUB_PR:      "Pull Request",
  GITHUB_RELEASE: "Release",
  README:         "README",
  SOURCE_FILE:    "Source File",
  DOCUMENT:       "Document",
};

export function EvidenceDrawer({ claim, onClose }: EvidenceDrawerProps) {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [onClose]);

  // Derive project name from claim — best effort
  const projectName = "Project";

  return (
    <>
      <div className="overlay animate-fade-in" onClick={onClose} aria-hidden="true" />

      <aside className={`${styles.drawer} animate-slide-right`} aria-label="Evidence proof chain">
        <div className={styles.header}>
          <div>
            <p className="section-label" style={{ marginBottom: "0.4rem" }}>Verified Claim</p>
            <p className={styles.claimText}>&ldquo;{claim.claim}&rdquo;</p>
          </div>
          <button
            type="button"
            className={`btn btn-ghost ${styles.closeBtn}`}
            onClick={onClose}
            aria-label="Close"
          >
            ×
          </button>
        </div>

        <div className={styles.body}>
          {/* Claim metadata */}
          <div className={styles.metaGrid}>
            <div>
              <span className={styles.metaLabel}>Type</span>
              <span className={styles.metaValue}>{claim.claim_type ?? "—"}</span>
            </div>
            <div>
              <span className={styles.metaLabel}>Confidence</span>
              <span className={styles.metaValue}>{Math.round(claim.confidence * 100)}% verified</span>
            </div>
            <div>
              <span className={styles.metaLabel}>Origin</span>
              <span className={styles.metaValue}>{claim.origin ?? "—"}</span>
            </div>
            <div>
              <span className={styles.metaLabel}>Status</span>
              <span className={styles.metaValue}>{claim.status ?? "—"}</span>
            </div>
          </div>

          {/* Proof chain */}
          <div className={styles.section}>
            <p className="section-label" style={{ marginBottom: "1rem" }}>Proof Chain</p>

            <div className={styles.proofChain}>
              {/* Step 1 — Claim */}
              <div className={styles.proofNode}>
                <span className={styles.proofNodeLabel}>Verified Claim</span>
                <div className={styles.proofNodeContent}>
                  <p className={styles.proofNodeText}>{claim.claim}</p>
                </div>
              </div>

              {/* Connector */}
              <div className={styles.proofConnector}>↓</div>

              {/* Step 2 — Project */}
              <div className={styles.proofNode}>
                <span className={styles.proofNodeLabel}>Project</span>
                <div className={styles.proofNodeContent}>
                  <p className={styles.proofNodeText}>{projectName}</p>
                </div>
              </div>

              {/* Connector */}
              <div className={styles.proofConnector}>↓</div>

              {/* Step 3 — Evidence items */}
              <div className={styles.proofNode}>
                <span className={styles.proofNodeLabel}>Evidence</span>
                {claim.evidence && claim.evidence.length > 0 ? (
                  <div className={styles.evidenceList}>
                    {claim.evidence.map((ev, idx) => (
                      <div key={idx} className={styles.evidenceItem}>
                        <div className={styles.evidenceItemHeader}>
                          <span className={`badge badge-accent`}>
                            {EVIDENCE_TYPE_LABEL[ev.type] ?? ev.type}
                          </span>
                          {ev.source_identifier && (
                            <span className={styles.evidenceId}>
                              {ev.type === "GITHUB_COMMIT"
                                ? ev.source_identifier.substring(0, 7)
                                : ev.source_identifier}
                            </span>
                          )}
                        </div>
                        {ev.content && (
                          <p className={styles.evidenceContent}>{ev.content}</p>
                        )}
                        {ev.source_url && (
                          <a
                            href={ev.source_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className={styles.evidenceLink}
                          >
                            Open in GitHub ↗
                          </a>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className={styles.proofNodeContent}>
                    <p className={styles.noEvidence}>No explicit evidence links available.</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </aside>
    </>
  );
}
