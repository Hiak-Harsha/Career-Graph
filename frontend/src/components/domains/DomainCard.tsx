"use client";

import { useState } from "react";
import styles from "./DomainCard.module.css";
import { DomainDrawer } from "./DomainDrawer";
import type { DomainProgress, Project } from "../../types";
import { TrendingUp, TrendingDown, Minus, ChevronRight } from "lucide-react";

interface DomainCardProps {
  dp: DomainProgress;
  projects?: Project[];
}

function getTrajectoryBadge(trajectory: string) {
  switch (trajectory) {
    case "INCREASING":
      return (
        <span className={`${styles.traj} traj-up`}>
          <TrendingUp size={12} />
          <span>Growing</span>
        </span>
      );
    case "DECREASING":
      return (
        <span className={`${styles.traj} traj-down`}>
          <TrendingDown size={12} />
          <span>Declining</span>
        </span>
      );
    default:
      return (
        <span className={`${styles.traj} traj-stable`}>
          <Minus size={12} />
          <span>Stable</span>
        </span>
      );
  }
}

const LEVEL_DISPLAY: Record<string, string> = {
  EXPOSURE:   "Exposure",
  PRACTICING: "Practicing",
  DEVELOPING: "Developing",
  PROFICIENT: "Proficient",
  STRONG:     "Strong",
  ADVANCED:   "Advanced",
};

function scoreToLabel(score: number): string {
  if (score >= 0.8) return "Strong";
  if (score >= 0.6) return "Good";
  if (score >= 0.4) return "Moderate";
  if (score >= 0.2) return "Early";
  return "Minimal";
}

export function DomainCard({ dp, projects = [] }: DomainCardProps) {
  const [drawerOpen, setDrawerOpen] = useState(false);

  const domainProjects = projects.filter((p) =>
    p.domains?.some((d) => d.id === dp.domain.id || d.name === dp.domain.name)
  );

  return (
    <>
      <article
        className={styles.card}
        onClick={() => setDrawerOpen(true)}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => e.key === "Enter" && setDrawerOpen(true)}
        aria-label={`${dp.domain.name} domain detail`}
      >
        {/* Header row */}
        <div className={styles.header}>
          <div>
            <h3 className={styles.name}>{dp.domain.name}</h3>
            <div className={styles.levelRow}>
              <span className={styles.level}>
                {LEVEL_DISPLAY[dp.current_level] ?? dp.current_level}
              </span>
              {getTrajectoryBadge(dp.trajectory)}
            </div>
          </div>
          <span className={styles.chevron} aria-hidden="true">
            <ChevronRight size={18} />
          </span>
        </div>

        <div className={styles.divider} />

        {/* Dimension grid */}
        <dl className={styles.dims}>
          <div className={styles.dim}>
            <dt>Evidence</dt>
            <dd>{scoreToLabel(dp.evidence_score)}</dd>
          </div>
          <div className={styles.dim}>
            <dt>Recent activity</dt>
            <dd>{scoreToLabel(dp.recency_score)}</dd>
          </div>
          <div className={styles.dim}>
            <dt>Depth</dt>
            <dd>{scoreToLabel(dp.depth_score)}</dd>
          </div>
          <div className={styles.dim}>
            <dt>Projects</dt>
            <dd>{domainProjects.length > 0 ? domainProjects.length : "—"}</dd>
          </div>
        </dl>
      </article>

      {drawerOpen && (
        <DomainDrawer
          dp={dp}
          projects={domainProjects}
          onClose={() => setDrawerOpen(false)}
        />
      )}
    </>
  );
}
