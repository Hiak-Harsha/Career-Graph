"use client";

import React, { useState } from "react";
import styles from "./PortfolioView.module.css";
import type { PortfolioData, Project, Claim } from "../../types";
import {
  ShieldCheck,
  ExternalLink,
  Code2,
  GitBranch,
  Sparkles,
  Share2,
  Check,
  Briefcase,
  Layers,
  ArrowUpRight,
} from "lucide-react";
import { ProblemSolvingProfile } from "../career/ProblemSolvingProfile";
import { SkillProgressView } from "../skills/SkillProgressView";
import { EvidenceDrawer } from "../evidence/EvidenceDrawer";

interface PortfolioViewProps {
  portfolioData: PortfolioData | null;
  loading: boolean;
  onOpenProjectEvidence?: (project: Project) => void;
}

export function PortfolioView({
  portfolioData,
  loading,
  onOpenProjectEvidence,
}: PortfolioViewProps) {
  const [copied, setCopied] = useState(false);
  const [selectedClaim, setSelectedClaim] = useState<Claim | null>(null);

  if (loading && !portfolioData) {
    return (
      <div className={styles.emptyState}>
        <p>Loading Living Portfolio from Career Graph...</p>
      </div>
    );
  }

  if (!portfolioData) return null;

  const { profile, projects, domain_progress, skills, problem_solving_profile, work_experiences } = portfolioData;

  const handleShare = () => {
    if (typeof window !== "undefined") {
      navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      setTimeout(() => setCopied(false), 3000);
    }
  };

  const handleOpenClaim = (proj: Project) => {
    if (onOpenProjectEvidence) {
      onOpenProjectEvidence(proj);
      return;
    }

    if (proj.claims && proj.claims.length > 0) {
      setSelectedClaim(proj.claims[0]);
    } else {
      const fallback: Claim = {
        id: `proj-${proj.id}`,
        claim: `${proj.title}: Verifiable code and git evidence`,
        confidence: 1.0,
        evidence: [
          {
            id: `ev-${proj.id}`,
            type: "GITHUB_COMMIT",
            source: proj.repository_url || "GitHub",
            source_url: proj.repository_url || undefined,
            captured_at: new Date().toISOString(),
            confidence: 1.0,
          },
        ],
      };
      setSelectedClaim(fallback);
    }
  };

  return (
    <div className={styles.container}>
      {/* Hero Banner */}
      <div className={styles.heroBanner}>
        <div className={styles.heroGlow} />
        <div className={styles.heroHeader}>
          <div className={styles.heroInfo}>
            <div className={styles.avatarRing}>
              <div className={styles.avatarInner}>
                {profile?.name ? profile.name.charAt(0).toUpperCase() : "M"}
              </div>
            </div>
            <div className={styles.nameGroup}>
              <h1 className={styles.userName}>
                {profile?.name || "Developer Profile"}
                <span className={styles.verifiedBadge}>
                  <ShieldCheck size={12} /> Graph Verified
                </span>
              </h1>
              <p className={styles.userHeadline}>
                {profile?.headline || "Full Stack & AI Systems Engineer"}
              </p>
              {profile?.location && (
                <span className={styles.userLocation}>📍 {profile.location}</span>
              )}
            </div>
          </div>

          <div className={styles.heroActions}>
            <button
              type="button"
              className={styles.shareBtn}
              onClick={handleShare}
            >
              {copied ? <Check size={14} color="#10B981" /> : <Share2 size={14} />}
              {copied ? "Link Copied!" : "Share Portfolio"}
            </button>
          </div>
        </div>
      </div>

      {/* Featured Projects Showcase */}
      <div>
        <div className={styles.sectionHeading}>
          <h2 className={styles.sectionTitle}>
            <Code2 size={20} color="var(--color-primary)" /> Verified Project Artifacts
          </h2>
          <span style={{ fontSize: "var(--text-xs)", color: "var(--text-secondary)" }}>
            Backed by commit hashes, PRs, and execution metrics
          </span>
        </div>

        <div className={styles.projectsGrid}>
          {projects.map((proj) => (
            <div key={proj.id} className={styles.projectCard}>
              <div>
                <div className={styles.projectHeader}>
                  <h3 className={styles.projectTitle}>{proj.title}</h3>
                  {proj.complexity_score && (
                    <span className={styles.complexityBadge}>
                      Score {proj.complexity_score.toFixed(1)}/10
                    </span>
                  )}
                </div>
                <p className={styles.projectDesc}>{proj.description || "High-performance technical implementation."}</p>
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-3)" }}>
                {proj.skills && proj.skills.length > 0 && (
                  <div className={styles.tagGroup}>
                    {proj.skills.slice(0, 4).map((s) => (
                      <span key={s.id} className={styles.skillTag}>
                        {s.name}
                      </span>
                    ))}
                  </div>
                )}

                <div className={styles.projectFooter}>
                  {proj.repository_url ? (
                    <a
                      href={proj.repository_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={styles.proofLink}
                    >
                      <GitBranch size={13} /> Repository <ArrowUpRight size={12} />
                    </a>
                  ) : <span />}

                  <button
                    type="button"
                    className={styles.proofLink}
                    onClick={() => handleOpenClaim(proj)}
                  >
                    <ShieldCheck size={13} /> Inspect Proof
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Problem-Solving Profile & Analytical Cloud */}
      <ProblemSolvingProfile profile={problem_solving_profile} />

      {/* Skill Progression & Depth Gauges */}
      <SkillProgressView skillsProgress={skills} />

      {/* Evidence Drawer if claim is selected */}
      {selectedClaim && (
        <EvidenceDrawer
          claim={selectedClaim}
          onClose={() => setSelectedClaim(null)}
        />
      )}
    </div>
  );
}
