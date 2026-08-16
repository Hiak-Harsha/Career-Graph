"use client";

import React, { useState } from "react";
import styles from "./Sidebar.module.css";
import type { UserProfile } from "../../types";
import {
  LayoutDashboard,
  Network,
  FolderGit2,
  Lightbulb,
  CheckSquare,
  Compass,
  Award,
  ShieldCheck,
  FileText,
  UserCheck,
  History,
  Sparkles,
  Globe,
  Menu,
  X,
} from "lucide-react";
import { GithubIcon } from "./icons/GithubIcon";
import { motion } from "framer-motion";
import { staggerContainer, staggerItem } from "../../lib/motion";

type NavItem = {
  id: string;
  label: string;
  icon: React.ComponentType<{ size?: number; className?: string }>;
  showBadge?: boolean;
};

type NavSection = {
  label?: string;
  items: NavItem[];
};

const NAV_SECTIONS: NavSection[] = [
  {
    items: [
      { id: "dashboard", label: "Overview", icon: LayoutDashboard },
      { id: "portfolio", label: "Living Portfolio", icon: Globe },
      { id: "graph", label: "Career Graph", icon: Network },
    ],
  },
  {
    label: "Work",
    items: [
      { id: "projects", label: "Projects", icon: FolderGit2 },
      { id: "ideas", label: "Ideas", icon: Lightbulb },
      { id: "review", label: "Review", icon: CheckSquare, showBadge: true },
    ],
  },
  {
    items: [
      { id: "domains", label: "Domains", icon: Compass },
      { id: "skills", label: "Skills", icon: Award },
      { id: "evidence", label: "Evidence", icon: ShieldCheck },
    ],
  },
  {
    label: "Profiles",
    items: [
      { id: "resume", label: "Resume", icon: FileText },
      { id: "recruiter", label: "Recruiter view", icon: UserCheck },
      { id: "timeline", label: "Timeline", icon: History },
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
  pendingReviewCount?: number;
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
  pendingReviewCount = 0,
}: SidebarProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const dotClass =
    syncing
      ? "status-dot status-dot-syncing animate-pulse-dot"
      : syncStatus === "connected"
      ? "status-dot status-dot-active"
      : syncStatus === "error"
      ? "status-dot status-dot-error"
      : "status-dot status-dot-inactive";

  const handleNavClick = (id: string) => {
    setActiveView(id);
    setMobileMenuOpen(false);
  };

  return (
    <>
      {/* Mobile Top Header */}
      <div className={styles.mobileHeader}>
        <div className={styles.brandHeader}>
          <div className={styles.brandLogo}>
            <Network size={16} />
          </div>
          <div className={styles.brandTitleGroup}>
            <span className={styles.brandName}>Career Graph</span>
            <span className={styles.brandBadge}>Core</span>
          </div>
        </div>

        <button
          type="button"
          className={styles.mobileToggleBtn}
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          aria-label={mobileMenuOpen ? "Close menu" : "Open menu"}
        >
          {mobileMenuOpen ? <X size={18} /> : <Menu size={18} />}
        </button>
      </div>

      {/* Main Sidebar (Desktop fixed + Mobile expandable drawer) */}
      <aside
        className={`${styles.sidebar} ${mobileMenuOpen ? styles.sidebarOpen : ""}`}
        aria-label="Primary navigation"
      >
        {/* Brand (Desktop) */}
        <div className={styles.brand}>
          <div className={styles.brandHeader}>
            <div className={styles.brandLogo}>
              <Network size={16} />
            </div>
            <div className={styles.brandTitleGroup}>
              <span className={styles.brandName}>Career Graph</span>
              <span className={styles.brandBadge}>Core</span>
            </div>
          </div>
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
        <motion.nav
          className={styles.nav}
          aria-label="Main navigation"
          variants={staggerContainer}
          initial="hidden"
          animate="visible"
        >
          {NAV_SECTIONS.map((section, idx) => (
            <div key={idx} className={styles.navSection}>
              {section.label && (
                <span className={`${styles.navSectionLabel} section-label`}>
                  {section.label}
                </span>
              )}
              {section.items.map(({ id, label, icon: Icon, showBadge }) => (
                <motion.button
                  key={id}
                  type="button"
                  variants={staggerItem}
                  className={`${styles.navButton} ${
                    activeView === id ? styles.navActive : ""
                  }`}
                  onClick={() => handleNavClick(id)}
                  aria-current={activeView === id ? "page" : undefined}
                >
                  <Icon size={16} className={styles.navIcon} />
                  <span>{label}</span>
                  {showBadge && pendingReviewCount > 0 && (
                    <span className={styles.navBadge}>{pendingReviewCount}</span>
                  )}
                </motion.button>
              ))}
            </div>
          ))}
        </motion.nav>

        {/* Footer actions */}
        <div className={styles.footer}>
          <button
            type="button"
            className={`btn btn-secondary ${styles.footerBtn}`}
            onClick={() => {
              handleGithubSync();
              setMobileMenuOpen(false);
            }}
            disabled={syncing}
          >
            <GithubIcon size={15} />
            <span>Sync GitHub</span>
          </button>
          <button
            type="button"
            className={`btn btn-ghost ${styles.footerBtn}`}
            onClick={() => {
              handleRunDemoSync();
              setMobileMenuOpen(false);
            }}
            disabled={syncing}
          >
            <Sparkles size={14} />
            <span>Load demo data</span>
          </button>
        </div>
      </aside>
    </>
  );
}

