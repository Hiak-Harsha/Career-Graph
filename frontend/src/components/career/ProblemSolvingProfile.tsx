"use client";

import React from "react";
import styles from "./ProblemSolvingProfile.module.css";
import type { ProblemSolvingProfile as ProfileData } from "../../types";
import { Cpu, Workflow, Sparkles, Layers } from "lucide-react";

interface ProblemSolvingProfileProps {
  profile: ProfileData | null;
}

export function ProblemSolvingProfile({ profile }: ProblemSolvingProfileProps) {
  if (!profile) return null;

  const frequentlyWorksWith = profile.frequently_works_with ?? [];
  const recurringPatterns = profile.recurring_patterns_detected ?? [];

  if (frequentlyWorksWith.length === 0 && recurringPatterns.length === 0) {
    return null;
  }

  return (
    <section className={`${styles.card} surface`} aria-label="Problem-Solving Profile">
      <div className={styles.header}>
        <div className={styles.titleGroup}>
          <div className={styles.iconWrap}>
            <Cpu size={16} />
          </div>
          <h3 className={styles.title}>Problem-Solving Profile</h3>
        </div>
        <span className={styles.badge}>Analytical Detection</span>
      </div>

      <div className={styles.grid}>
        {/* Recurring patterns */}
        <div className={styles.section}>
          <span className={styles.sectionLabel}>Recurring Solution Patterns</span>
          <div className={styles.clusterList}>
            {recurringPatterns.map((pattern, i) => (
              <div key={i} className={styles.patternPill}>
                <Workflow size={12} color="var(--accent)" />
                <span>{pattern}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Frequently works with */}
        <div className={styles.section}>
          <span className={styles.sectionLabel}>Frequently Works With</span>
          <div className={styles.tagCluster}>
            {frequentlyWorksWith.map((item, i) => (
              <span key={i} className={styles.tag}>
                {item}
              </span>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
