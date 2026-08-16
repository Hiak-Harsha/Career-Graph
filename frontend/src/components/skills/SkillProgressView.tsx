"use client";

import React from "react";
import { motion } from "framer-motion";
import styles from "./SkillProgressView.module.css";
import type { SkillProgress } from "../../types";
import { TrendingUp, TrendingDown, Minus, ShieldCheck } from "lucide-react";

interface SkillProgressViewProps {
  skillsProgress: SkillProgress[];
}

function getTrajectoryBadge(trajectory: string) {
  switch (trajectory) {
    case "INCREASING":
      return (
        <span className={`traj-up ${styles.trajBadge}`}>
          <TrendingUp size={12} />
          <span>Growing</span>
        </span>
      );
    case "DECREASING":
      return (
        <span className={`traj-down ${styles.trajBadge}`}>
          <TrendingDown size={12} />
          <span>Declining</span>
        </span>
      );
    default:
      return (
        <span className={`traj-stable ${styles.trajBadge}`}>
          <Minus size={12} />
          <span>Stable</span>
        </span>
      );
  }
}

export function SkillProgressView({ skillsProgress }: SkillProgressViewProps) {
  // Sort skills by depth_score or usage descending
  const sorted = [...skillsProgress].sort((a, b) => b.depth_score - a.depth_score);

  return (
    <div className={styles.root}>
      <div className={styles.pageHeader}>
        <h1 className={styles.pageTitle}>Skill Progression</h1>
        <p className={styles.pageSubtitle}>
          Evidence-backed mastery and growth trajectory across your codebase
        </p>
      </div>

      {sorted.length === 0 ? (
        <p className={styles.empty}>No skill progression data detected yet. Sync GitHub to analyze.</p>
      ) : (
        <div className={styles.skillsGrid}>
          {sorted.map((sp, i) => {
            const pct = Math.round(sp.depth_score * 100);
            return (
              <motion.div
                key={sp.id ?? sp.skill.id ?? i}
                className={`${styles.skillCard} surface`}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.25, delay: i * 0.03 }}
              >
                <div className={styles.skillHeader}>
                  <h3 className={styles.skillName}>{sp.skill.name}</h3>
                  <span className={styles.skillLevelBadge}>
                    {sp.current_level.charAt(0) + sp.current_level.slice(1).toLowerCase()}
                  </span>
                </div>

                <div className={styles.progressSection}>
                  <div className={styles.progressHeader}>
                    <span className={styles.progressLabel}>Depth Score</span>
                    <span className={styles.progressPct}>{pct}%</span>
                  </div>
                  <div className={styles.progressTrack}>
                    <div className={styles.progressFill} style={{ width: `${pct}%` }} />
                  </div>
                </div>

                <div className={styles.metaRow}>
                  <div className={styles.evidenceCount}>
                    <ShieldCheck size={13} color="var(--accent)" />
                    <span>{sp.evidence_count} evidence item{sp.evidence_count !== 1 ? "s" : ""}</span>
                  </div>
                  {getTrajectoryBadge(sp.trajectory)}
                </div>
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
}
