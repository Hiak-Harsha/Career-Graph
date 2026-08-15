"use client";

import { useEffect } from "react";
import styles from "./DomainDrawer.module.css";
import type { DomainProgress, Project } from "../../types";

interface DomainDrawerProps {
  dp: DomainProgress;
  projects: Project[];
  onClose: () => void;
}

const LEVEL_DISPLAY: Record<string, string> = {
  EXPOSURE:   "Exposure",
  PRACTICING: "Practicing",
  DEVELOPING: "Developing",
  PROFICIENT: "Proficient",
  STRONG:     "Strong",
  ADVANCED:   "Advanced",
};

const TRAJECTORY_LABEL: Record<string, string> = {
  INCREASING: "↑ Increasing",
  STABLE:     "→ Stable",
  DECREASING: "↓ Declining",
};

function formatDate(str?: string): string {
  if (!str) return "—";
  return new Date(str).toLocaleDateString("en-US", { month: "short", year: "numeric" });
}

function scoreToBar(score: number): number {
  return Math.round(Math.min(1, Math.max(0, score)) * 100);
}

export function DomainDrawer({ dp, projects, onClose }: DomainDrawerProps) {
  // Close on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [onClose]);

  // Collect all skills from projects in this domain
  const allSkills = Array.from(
    new Map(
      projects.flatMap((p) => p.skills ?? []).map((s) => [s.id, s])
    ).values()
  );

  const evidenceCount = projects.reduce(
    (acc, p) => acc + (p.claims?.length ?? 0),
    0
  );

  return (
    <>
      <div className="overlay animate-fade-in" onClick={onClose} aria-hidden="true" />

      <aside className={`${styles.drawer} animate-slide-right`} aria-label={`${dp.domain.name} details`}>
        {/* Header */}
        <div className={styles.header}>
          <div>
            <p className="section-label" style={{ marginBottom: "0.5rem" }}>Domain</p>
            <h2 className={styles.title}>{dp.domain.name}</h2>
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
          {/* Key metrics row */}
          <div className={styles.metricRow}>
            <div className={styles.metric}>
              <span className={styles.metricLabel}>Level</span>
              <span className={styles.metricValue}>
                {LEVEL_DISPLAY[dp.current_level] ?? dp.current_level}
              </span>
            </div>
            <div className={styles.metric}>
              <span className={styles.metricLabel}>Trajectory</span>
              <span className={`${styles.metricValue} ${dp.trajectory === "INCREASING" ? "traj-up" : dp.trajectory === "DECREASING" ? "traj-down" : "traj-stable"}`}>
                {TRAJECTORY_LABEL[dp.trajectory] ?? dp.trajectory}
              </span>
            </div>
            <div className={styles.metric}>
              <span className={styles.metricLabel}>First detected</span>
              <span className={styles.metricValue}>{formatDate(dp.first_detected)}</span>
            </div>
            <div className={styles.metric}>
              <span className={styles.metricLabel}>Last active</span>
              <span className={styles.metricValue}>{formatDate(dp.last_active)}</span>
            </div>
          </div>

          {/* Dimension bars */}
          <div className={styles.section}>
            <p className="section-label" style={{ marginBottom: "1rem" }}>Dimensions</p>
            <div className={styles.barList}>
              {[
                { label: "Evidence", value: dp.evidence_score },
                { label: "Depth", value: dp.depth_score },
                { label: "Recent activity", value: dp.recency_score },
                { label: "Exposure", value: dp.exposure_score },
              ].map(({ label, value }) => (
                <div key={label} className={styles.barRow}>
                  <span className={styles.barLabel}>{label}</span>
                  <div className={styles.barTrack}>
                    <div
                      className={`${styles.barFill} progress-fill`}
                      style={{ width: `${scoreToBar(value)}%` }}
                    />
                  </div>
                  <span className={styles.barPct}>{scoreToBar(value)}%</span>
                </div>
              ))}
            </div>
          </div>

          {/* Project evidence */}
          {projects.length > 0 && (
            <div className={styles.section}>
              <p className="section-label" style={{ marginBottom: "0.75rem" }}>Project Evidence</p>
              <div className={styles.projectList}>
                {projects.map((p) => (
                  <div key={p.id} className={styles.projectItem}>
                    <span className={styles.projectTitle}>{p.title}</span>
                    <span className={styles.projectStatus}>{p.status.charAt(0) + p.status.slice(1).toLowerCase()}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Skills */}
          {allSkills.length > 0 && (
            <div className={styles.section}>
              <p className="section-label" style={{ marginBottom: "0.75rem" }}>Skills in this Domain</p>
              <div className={styles.skillsList}>
                {allSkills.map((s) => (
                  <span key={s.id} className="chip">{s.name}</span>
                ))}
              </div>
            </div>
          )}

          {/* Evidence counts */}
          <div className={styles.section}>
            <p className="section-label" style={{ marginBottom: "0.75rem" }}>Evidence</p>
            <div className={styles.evidenceCounts}>
              <div className={styles.evidenceCount}>
                <span className={styles.evidenceNum}>{projects.length}</span>
                <span className={styles.evidenceCountLabel}>projects</span>
              </div>
              <div className={styles.evidenceCount}>
                <span className={styles.evidenceNum}>{evidenceCount}</span>
                <span className={styles.evidenceCountLabel}>claims</span>
              </div>
              <div className={styles.evidenceCount}>
                <span className={styles.evidenceNum}>
                  {projects.filter(p => p.repository_url).length}
                </span>
                <span className={styles.evidenceCountLabel}>repositories</span>
              </div>
            </div>
          </div>
        </div>
      </aside>
    </>
  );
}
