"use client";

import React, { useMemo } from "react";
import styles from "./GitHubHeatmap.module.css";
import type { Evidence } from "../../types";
import { GitCommit, Flame } from "lucide-react";

interface GitHubHeatmapProps {
  evidenceList: Evidence[];
}

export function GitHubHeatmap({ evidenceList }: GitHubHeatmapProps) {
  // Aggregate commit counts by day over the past 20 weeks (140 days)
  const { weeks, totalCommits, activeDays } = useMemo(() => {
    const today = new Date();
    const dayCounts = new Map<string, number>();

    evidenceList.forEach((ev) => {
      const d = ev.captured_at ? new Date(ev.captured_at) : new Date();
      const dateKey = d.toISOString().split("T")[0];
      dayCounts.set(dateKey, (dayCounts.get(dateKey) || 0) + 1);
    });

    const weeksData: { dateStr: string; count: number; level: number; dayOfWeek: number }[][] = [];
    let currentWeek: { dateStr: string; count: number; level: number; dayOfWeek: number }[] = [];
    let max = 1;
    let distinctActive = 0;

    // Generate past 20 weeks (140 days)
    for (let i = 139; i >= 0; i--) {
      const date = new Date(today);
      date.setDate(date.getDate() - i);
      const dateKey = date.toISOString().split("T")[0];
      const count = dayCounts.get(dateKey) || 0;
      if (count > max) max = count;
      if (count > 0) distinctActive++;

      // Compute visual intensity level (0 to 4)
      const level = count === 0 ? 0 : count <= 1 ? 1 : count <= 3 ? 2 : count <= 5 ? 3 : 4;
      const dayOfWeek = date.getDay(); // 0 is Sunday

      currentWeek.push({
        dateStr: dateKey,
        count,
        level,
        dayOfWeek,
      });

      if (currentWeek.length === 7 || i === 0) {
        weeksData.push(currentWeek);
        currentWeek = [];
      }
    }

    return {
      weeks: weeksData,
      totalCommits: evidenceList.length,
      maxDayCommits: max,
      activeDays: distinctActive,
    };
  }, [evidenceList]);

  return (
    <div className={styles.heatmapCard}>
      <div className={styles.headerRow}>
        <div className={styles.titleGroup}>
          <GitCommit size={16} color="#38bdf8" />
          <span className={styles.title}>Verified Development Activity</span>
        </div>
        <div className={styles.statsGroup}>
          <span className={styles.statPill}>
            <Flame size={13} color="#f59e0b" />
            <span>{totalCommits} verified commits & artifacts</span>
          </span>
          <span className="badge badge-neutral">{activeDays} active days</span>
        </div>
      </div>

      {/* Grid of contribution squares */}
      <div className={styles.gridContainer}>
        <div className={styles.grid}>
          {weeks.map((week, wIdx) => (
            <div key={wIdx} className={styles.weekColumn}>
              {week.map((day) => (
                <div
                  key={day.dateStr}
                  className={`${styles.cell} ${styles[`level${day.level}`]}`}
                  title={`${day.dateStr}: ${day.count} verified artifact(s)`}
                />
              ))}
            </div>
          ))}
        </div>
      </div>

      {/* Legend */}
      <div className={styles.legendRow}>
        <span className={styles.legendLabel}>Less</span>
        <div className={`${styles.cell} ${styles.level0}`} />
        <div className={`${styles.cell} ${styles.level1}`} />
        <div className={`${styles.cell} ${styles.level2}`} />
        <div className={`${styles.cell} ${styles.level3}`} />
        <div className={`${styles.cell} ${styles.level4}`} />
        <span className={styles.legendLabel}>More</span>
      </div>
    </div>
  );
}
