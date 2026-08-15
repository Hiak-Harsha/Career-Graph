"use client";

import styles from "./CurrentlyBuilding.module.css";
import type { Project } from "../../types";
import {
  ArrowRight,
  CircleDot,
  CheckCircle2,
  Clock,
  RotateCw,
  PauseCircle,
  HelpCircle,
} from "lucide-react";

interface CurrentlyBuildingProps {
  projects: Project[];
  onViewAll?: () => void;
}

function getStatusIcon(status: string) {
  switch (status) {
    case "COMPLETED":
      return <CheckCircle2 size={11} />;
    case "ACTIVE":
      return <CircleDot size={11} />;
    case "EXPLORING":
    case "PLANNED":
    case "IDEA":
      return <Clock size={11} />;
    case "MAINTAINED":
      return <RotateCw size={11} />;
    case "PAUSED":
      return <PauseCircle size={11} />;
    default:
      return <HelpCircle size={11} />;
  }
}

const STATUS_CLASS: Record<string, string> = {
  IDEA:       "status-idea",
  EXPLORING:  "status-exploring",
  PLANNED:    "status-planned",
  ACTIVE:     "status-active",
  COMPLETED:  "status-completed",
  MAINTAINED: "status-maintained",
  PAUSED:     "status-paused",
};

function formatLastUpdated(dateStr?: string): string {
  if (!dateStr) return "";
  const date = new Date(dateStr);
  const days = Math.floor((Date.now() - date.getTime()) / 86400000);
  if (days === 0) return "today";
  if (days === 1) return "yesterday";
  if (days < 7) return `${days} days ago`;
  if (days < 30) return `${Math.floor(days / 7)}w ago`;
  return `${Math.floor(days / 30)}mo ago`;
}

export function CurrentlyBuilding({ projects, onViewAll }: CurrentlyBuildingProps) {
  const active = projects.filter((p) =>
    ["ACTIVE", "EXPLORING", "MAINTAINED"].includes(p.status)
  );

  return (
    <div className={styles.card}>
      <div className={styles.header}>
        <span className="section-label">Currently Building</span>
        {onViewAll && (
          <button className={`btn btn-ghost ${styles.viewAll}`} onClick={onViewAll} type="button">
            <span>View all</span>
            <ArrowRight size={13} />
          </button>
        )}
      </div>

      {active.length === 0 ? (
        <p className={styles.empty}>No active projects.</p>
      ) : (
        <div className={styles.list}>
          {active.slice(0, 4).map((p) => (
            <div key={p.id} className={styles.item}>
              <div className={styles.itemMain}>
                <span className={styles.title}>{p.title}</span>
                <span className={styles.type}>{p.project_type.charAt(0) + p.project_type.slice(1).toLowerCase()}</span>
              </div>
              <div className={`${styles.statusPill} ${styles[STATUS_CLASS[p.status] ?? ""]}`}>
                <span className={styles.statusIcon}>{getStatusIcon(p.status)}</span>
                <span>{p.status.charAt(0) + p.status.slice(1).toLowerCase()}</span>
                {p.updated_at && (
                  <span className={styles.lastActivity}>
                    · {formatLastUpdated(p.updated_at)}
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
