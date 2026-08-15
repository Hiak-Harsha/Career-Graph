"use client";

import styles from "./Sidebar.module.css";
import type { UserProfile } from "../../types";

type NavSection = {
  label?: string;
  items: { id: string; label: string }[];
};

const NAV_SECTIONS: NavSection[] = [
  {
    items: [
      { id: "dashboard", label: "Overview" },
      { id: "graph",     label: "Career Graph" },
    ],
  },
  {
    label: "Work",
    items: [
      { id: "projects", label: "Projects" },
      { id: "ideas",    label: "Ideas" },
    ],
  },
  {
    items: [
      { id: "domains",  label: "Domains" },
      { id: "evidence", label: "Evidence" },
    ],
  },
  {
    label: "Profiles",
    items: [
      { id: "resume",    label: "Resume" },
      { id: "recruiter", label: "Recruiter view" },
      { id: "timeline",  label: "Timeline" },
    ],
  },
];

type SidebarProps = {
  activeView: string;
  setActiveView: (view: string) => void;
  profile: UserProfile | null;
  syncing: boolean;
  lastUpdated: Date | null;
  syncStatus: "connected" | "syncing" | "error" | "idle";
  handleGithubSync: () => void;
  handleRunDemoSync: () => void;
};

function formatRelativeTime(date: Date): string {
  const seconds = Math.floor((Date.now() - date.getTime()) / 1000);
  if (seconds < 60) return "just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  return `${hours}h ago`;
}

export function Sidebar({
  activeView,
  setActiveView,
  profile,
  syncing,
  lastUpdated,
  syncStatus,
  handleGithubSync,
  handleRunDemoSync,
}: SidebarProps) {
  const dotClass =
    syncing ? "status-dot status-dot-syncing animate-pulse-dot" :
    syncStatus === "connected" ? "status-dot status-dot-active" :
    syncStatus === "error"     ? "status-dot status-dot-error"  :
    "status-dot status-dot-inactive";

  return (
    <aside className={styles.sidebar} aria-label="Primary navigation">
      {/* Brand */}
      <div className={styles.brand}>
        <span className={styles.brandName}>Career Graph</span>
        {profile?.headline && (
          <span className={styles.brandSub}>{profile.headline}</span>
        )}
      </div>

      {/* Sync status */}
      <div className={styles.syncStatus}>
        <span className={dotClass} />
        <span className={styles.syncLabel}>
          {syncing
            ? "Syncing…"
            : lastUpdated
            ? `Updated ${formatRelativeTime(lastUpdated)}`
            : "Not connected"}
        </span>
      </div>

      {/* Navigation */}
      <nav className={styles.nav} aria-label="Main navigation">
        {NAV_SECTIONS.map((section, idx) => (
          <div key={idx} className={styles.navSection}>
            {section.label && (
              <span className={`${styles.navSectionLabel} section-label`}>
                {section.label}
              </span>
            )}
            {section.items.map(({ id, label }) => (
              <button
                key={id}
                type="button"
                className={`${styles.navButton} ${activeView === id ? styles.navActive : ""}`}
                onClick={() => setActiveView(id)}
                aria-current={activeView === id ? "page" : undefined}
              >
                {label}
              </button>
            ))}
          </div>
        ))}
      </nav>

      {/* Footer actions */}
      <div className={styles.footer}>
        <button
          type="button"
          className={`btn btn-secondary ${styles.footerBtn}`}
          onClick={handleGithubSync}
          disabled={syncing}
        >
          Sync GitHub
        </button>
        <button
          type="button"
          className={`btn btn-ghost ${styles.footerBtn}`}
          onClick={handleRunDemoSync}
          disabled={syncing}
        >
          Load demo data
        </button>
      </div>
    </aside>
  );
}
