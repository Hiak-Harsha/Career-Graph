"use client";

import React from "react";
import styles from "./FeaturedResumeView.module.css";
import type {
  ResumeBlockItem,
  IdentityBlockPayload,
  PositioningBlockPayload,
  SelectedWorkBlockPayload,
  TechnicalDepthBlockPayload,
  TrajectoryBlockPayload,
  ExperienceBlockPayload,
  EducationBlockPayload,
  CertificationsBlockPayload,
  AchievementsBlockPayload,
  Claim,
} from "../../types";
import { motion } from "framer-motion";
import { sidebarAssemble, fadeUp } from "../../lib/motion";
import {
  Zap,
  ShieldCheck,
  Target,
  BarChart2,
  TrendingUp,
  Award,
  ExternalLink,
  MapPin,
  Mail,
  Compass,
  FolderGit2,
  BookOpen,
} from "lucide-react";
import { GithubIcon } from "../ui/icons/GithubIcon";

interface FeaturedResumeViewProps {
  blocks: ResumeBlockItem[];
  onInspectProof?: (claim: Claim) => void;
}

const ICON_MAP: Record<string, React.ComponentType<{ size?: number; color?: string }>> = {
  zap: Zap,
  "shield-check": ShieldCheck,
  target: Target,
  "bar-chart": BarChart2,
  "trending-up": TrendingUp,
  award: Award,
};

export function FeaturedResumeView({ blocks, onInspectProof }: FeaturedResumeViewProps) {
  const getBlock = <T,>(type: string): T | null => {
    const item = blocks.find((b) => b.block_type === type);
    return item ? (item.content_payload as unknown as T) : null;
  };

  const identity = getBlock<IdentityBlockPayload>("identity");
  const positioning = getBlock<PositioningBlockPayload>("positioning");
  const selectedWork = getBlock<SelectedWorkBlockPayload>("selected_work");
  const techDepth = getBlock<TechnicalDepthBlockPayload>("technical_depth");
  const trajectory = getBlock<TrajectoryBlockPayload>("trajectory");
  const experience = getBlock<ExperienceBlockPayload>("experience");
  const education = getBlock<EducationBlockPayload>("education");
  const certs = getBlock<CertificationsBlockPayload>("certifications");
  const achievementsPayload = getBlock<AchievementsBlockPayload>("achievements");
  const achievements = achievementsPayload?.achievements || [];

  return (
    <div className={styles.container} data-testid="featured-resume-container">
      {/* ─── Main Column (Summary, Projects, Experience, Education) ────────── */}
      <motion.div
        className={styles.mainCol}
        variants={fadeUp}
        initial="hidden"
        animate="visible"
      >
        {/* Header Block */}
        <div className={styles.headerArea}>
          <div className={styles.nameRow}>
            <div>
              <h1 className={styles.candidateName}>{identity?.name || "Professional Candidate"}</h1>
              <div className={styles.roleHeadline}>{identity?.headline || "Senior Systems Engineer"}</div>
            </div>
          </div>

          <div className={styles.contactRow}>
            {identity?.email && (
              <span className={styles.contactItem}>
                <Mail size={13} color="#60a5fa" />
                {identity.email}
              </span>
            )}
            {identity?.location && (
              <span className={styles.contactItem}>
                <MapPin size={13} color="#60a5fa" />
                {identity.location}
              </span>
            )}
            {identity?.github && (
              <span className={styles.contactItem}>
                <GithubIcon size={13} />
                github.com/{identity.github}
              </span>
            )}
          </div>
        </div>

        {/* Professional Summary */}
        {positioning?.statement && (
          <div className={styles.summaryCard}>
            {positioning.statement}
          </div>
        )}

        {/* Selected Work & Engineering Systems */}
        {selectedWork?.projects && selectedWork.projects.length > 0 && (
          <div>
            <div className={styles.sectionHeader}>
              <FolderGit2 size={16} color="#60a5fa" />
              <span>Selected Work & Technical Artifacts</span>
            </div>

            {selectedWork.projects.map((proj) => (
              <div key={proj.id} className={styles.projectCard}>
                <div className={styles.projectTitleRow}>
                  <span className={styles.projectTitle}>{proj.title}</span>
                  {proj.repository_url && (
                    <a
                      href={proj.repository_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={styles.inspectHint}
                    >
                      <span>Repository</span>
                      <ExternalLink size={12} />
                    </a>
                  )}
                </div>

                {proj.technologies && proj.technologies.length > 0 && (
                  <div className={styles.projectSkills}>
                    {proj.technologies.map((t, idx) => (
                      <span key={idx} className={styles.skillPill}>
                        {t}
                      </span>
                    ))}
                  </div>
                )}

                {proj.description && (
                  <p style={{ fontSize: "0.82rem", color: "#94a3b8", margin: "0 0 0.4rem 0", lineHeight: 1.5 }}>
                    {proj.description}
                  </p>
                )}

                {proj.evidence_claims && proj.evidence_claims.length > 0 && (
                  <ul className={styles.bulletList}>
                    {proj.evidence_claims.map((c) => (
                      <li
                        key={c.id}
                        className={styles.bulletItem}
                        style={{ cursor: onInspectProof ? "pointer" : "default" }}
                        onClick={() => {
                          if (onInspectProof) {
                            onInspectProof({
                              id: c.id,
                              claim: c.claim,
                              confidence: c.confidence,
                              claim_type: c.type,
                              status: "user_confirmed",
                              project_id: proj.id,
                            } as Claim);
                          }
                        }}
                      >
                        {c.claim}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Professional Experience */}
        {experience?.experiences && experience.experiences.length > 0 && (
          <div>
            <div className={styles.sectionHeader}>
              <Award size={16} color="#60a5fa" />
              <span>Professional Experience</span>
            </div>

            {experience.experiences.map((exp, idx) => (
              <div key={idx} className={styles.experienceItem}>
                <div className={styles.expHeader}>
                  <span>{exp.role} · {exp.company}</span>
                  <span style={{ fontSize: "0.75rem", color: "#94a3b8" }}>
                    {exp.start_date} – {exp.end_date}
                  </span>
                </div>
                {exp.description && (
                  <p style={{ fontSize: "0.8rem", color: "#cbd5e1", margin: "0.25rem 0", lineHeight: 1.5 }}>
                    {exp.description}
                  </p>
                )}
                {exp.bullets && exp.bullets.length > 0 && (
                  <ul className={styles.bulletList}>
                    {exp.bullets.map((b, bIdx) => (
                      <li key={bIdx} className={styles.bulletItem}>
                        {b}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Education */}
        {education?.educations && education.educations.length > 0 && (
          <div>
            <div className={styles.sectionHeader}>
              <BookOpen size={16} color="#60a5fa" />
              <span>Education</span>
            </div>

            {education.educations.map((edu, idx) => (
              <div key={idx} className={styles.experienceItem}>
                <div className={styles.expHeader}>
                  <span>{edu.degree}</span>
                  <span style={{ fontSize: "0.75rem", color: "#94a3b8" }}>
                    {edu.start_year || ""} – {edu.end_year || ""}
                  </span>
                </div>
                <div className={styles.expMeta}>{edu.institution}</div>
              </div>
            ))}
          </div>
        )}
      </motion.div>

      {/* ─── Sidebar Column (Achievements, Skills, Credentials, Exploring) ─── */}
      <motion.div
        className={styles.sidebarCol}
        variants={sidebarAssemble}
        initial="hidden"
        animate="visible"
      >
        {/* Achievements Section */}
        <div>
          <div className={styles.sectionHeader}>
            <ShieldCheck size={16} color="#34d399" />
            <span>Key Achievements</span>
          </div>

          {achievements.length === 0 ? (
            <div style={{ fontSize: "0.78rem", color: "#94a3b8", fontStyle: "italic" }}>
              Confirmed GitHub claims will appear here as verified achievement highlights.
            </div>
          ) : (
            achievements.map((ach, idx) => {
              const IconComp = ICON_MAP[ach.icon] || Award;
              return (
                <div
                  key={idx}
                  className={styles.achievementCard}
                  onClick={() => {
                    if (onInspectProof && ach.claim_id) {
                      onInspectProof({
                        id: ach.claim_id,
                        claim: ach.description,
                        confidence: ach.confidence ?? 0,
                        claim_type: "TECHNICAL_ACHIEVEMENT",
                        status: "user_confirmed",
                      } as Claim);
                    }
                  }}
                >
                  <div className={styles.iconBadge}>
                    <IconComp size={16} color="#38bdf8" />
                  </div>
                  <div className={styles.achievementInfo}>
                    <div className={styles.achievementTitle}>{ach.title}</div>
                    <div className={styles.achievementDesc}>{ach.description}</div>
                    <div className={styles.inspectHint}>
                      <span>Inspect evidence</span>
                      <ExternalLink size={10} />
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Technical Skills & Depth */}
        <div>
          <div className={styles.sectionHeader}>
            <Zap size={16} color="#60a5fa" />
            <span>Core Competencies</span>
          </div>

          <div className={styles.skillPillGrid}>
            {techDepth?.clusters?.map((c, idx) => (
              <span key={`domain-${idx}`} className={styles.skillPill}>
                {c.domain}
              </span>
            ))}
            {(techDepth?.skills || []).slice(0, 8).map((s, idx) => (
              <span key={`skill-${idx}`} className={styles.skillPill}>
                {s}
              </span>
            ))}
            {(!techDepth?.clusters || techDepth.clusters.length === 0) && (!techDepth?.skills || techDepth.skills.length === 0) && (
              <span style={{ fontSize: "0.75rem", color: "#94a3b8", fontStyle: "italic" }}>
                No verified competencies recorded yet.
              </span>
            )}
          </div>
        </div>

        {/* Currently Exploring (Ground truth from trajectory next_horizons) */}
        {trajectory?.next_horizons && trajectory.next_horizons.length > 0 && (
          <div>
            <div className={styles.sectionHeader}>
              <Compass size={16} color="#34d399" />
              <span>Currently Exploring</span>
            </div>

            {trajectory.next_horizons.map((horizon, idx) => (
              <div key={idx} className={styles.exploringCard}>
                <div className={styles.exploringTitle}>{horizon}</div>
                <div className={styles.exploringDesc}>
                  Active research and prototyping trajectory from career graph momentum.
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Certifications */}
        {certs?.certifications && certs.certifications.length > 0 && (
          <div>
            <div className={styles.sectionHeader}>
              <Award size={16} color="#f59e0b" />
              <span>Credentials</span>
            </div>

            {certs.certifications.map((cert, idx) => (
              <div key={idx} style={{ marginBottom: "0.5rem" }}>
                <div style={{ fontSize: "0.8rem", fontWeight: 600, color: "#ffffff" }}>
                  {cert.name}
                </div>
                <div style={{ fontSize: "0.72rem", color: "#94a3b8" }}>
                  {cert.issuer} {cert.issue_date ? `(${cert.issue_date})` : ""}
                </div>
              </div>
            ))}
          </div>
        )}
      </motion.div>
    </div>
  );
}
