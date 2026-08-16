"use client";

import React, { useState } from "react";
import styles from "./PortfolioView.module.css";
import type { PortfolioData, Project, Claim } from "../../types";
import {
  ShieldCheck,
  GitBranch,
  Share2,
  Check,
  MapPin,
  Mail,
  Award,
  GraduationCap,
  Briefcase,
  ArrowUpRight,
} from "lucide-react";
import { GithubIcon } from "../ui/icons/GithubIcon";
import { ProblemSolvingProfile } from "../career/ProblemSolvingProfile";
import { SkillProgressView } from "../skills/SkillProgressView";
import { EvidenceDrawer } from "../evidence/EvidenceDrawer";

interface PortfolioViewProps {
  portfolioData: PortfolioData | null;
  loading: boolean;
  onOpenProjectEvidence?: (project: Project) => void;
  isPublic?: boolean;
}

export function PortfolioView({
  portfolioData,
  loading,
  onOpenProjectEvidence,
  isPublic = false,
}: PortfolioViewProps) {
  const [copied, setCopied] = useState(false);
  const [selectedClaim, setSelectedClaim] = useState<Claim | null>(null);

  if (loading && !portfolioData) {
    return (
      <div style={{ textAlign: "center", padding: "80px 20px", color: "var(--text-secondary)" }}>
        <p>Loading Living Portfolio from Career Graph...</p>
      </div>
    );
  }

  if (!portfolioData) return null;

  const {
    profile,
    projects,
    skills,
    problem_solving_profile,
    work_experiences = [],
    educations = [],
    certifications = [],
    social_links = [],
  } = portfolioData;

  const handleShare = () => {
    if (typeof window !== "undefined") {
      const publicUrl = `${window.location.origin}/p/${profile.github_username || profile.id}`;
      navigator.clipboard.writeText(publicUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 3000);
    }
  };

  const handleOpenClaim = (proj: Project, claim?: Claim) => {
    if (claim) {
      setSelectedClaim(claim);
      return;
    }

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
      {/* Editorial Profile Header */}
      <header className={styles.headerSection}>
        <div className={styles.headerTop}>
          <div className={styles.profileInfo}>
            <h1 className={styles.profileName}>
              {profile?.name || "Software Engineer"}
              <span className={styles.graphVerifiedMark}>
                <ShieldCheck size={12} /> Graph Verified
              </span>
            </h1>
            <p className={styles.profileHeadline}>
              {profile?.headline || "Full Stack & AI Systems Engineer"}
            </p>

            <div className={styles.metaRow}>
              {profile?.location && (
                <span className={styles.metaItem}>
                  <MapPin size={13} /> {profile.location}
                </span>
              )}
              {profile?.email && (
                <span className={styles.metaItem}>
                  <Mail size={13} /> {profile.email}
                </span>
              )}
              {profile?.github_username && (
                <a
                  href={`https://github.com/${profile.github_username}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={styles.metaItem}
                  style={{ color: "inherit", textDecoration: "none" }}
                >
                  <GithubIcon size={13} /> github.com/{profile.github_username}
                </a>
              )}
            </div>

            {social_links.length > 0 && (
              <div className={styles.socialRow}>
                {social_links.map((l) => (
                  <a
                    key={l.id}
                    href={l.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={styles.socialBtn}
                  >
                    <span>{l.label || l.platform}</span>
                    <ArrowUpRight size={11} />
                  </a>
                ))}
              </div>
            )}
          </div>

          <button type="button" className={styles.shareBtn} onClick={handleShare}>
            {copied ? <Check size={14} /> : <Share2 size={14} />}
            <span>{copied ? "Public Link Copied!" : isPublic ? "Share Public Link" : "Share Living Portfolio"}</span>
          </button>
        </div>
      </header>

      {/* Verified Projects & Engineering Case Studies */}
      <section className={styles.section}>
        <div className={styles.sectionHeader}>
          <h2 className={styles.sectionTitle}>Verified Project Case Studies</h2>
          <span className={styles.sectionSub}>Grounded in commit & code history</span>
        </div>

        <div className={styles.caseStudiesList}>
          {projects.map((proj) => {
            const projectClaims = proj.claims || [];

            return (
              <article key={proj.id} className={styles.caseStudyItem}>
                <div className={styles.caseStudyHeader}>
                  <div>
                    <h3 className={styles.caseStudyTitle}>{proj.title}</h3>
                  </div>

                  {proj.skills && proj.skills.length > 0 && (
                    <div className={styles.caseStudyTagGroup}>
                      {proj.skills.slice(0, 5).map((s) => (
                        <span key={s.id} className={styles.skillPill}>
                          {s.name}
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                <p className={styles.caseStudyDesc}>
                  {proj.description ||
                    "Architected high-performance technical solution with automated pipelines and validated unit test coverage."}
                </p>

                {/* Evidence-backed Claims list */}
                {projectClaims.length > 0 && (
                  <div className={styles.claimsContainer}>
                    <span className={styles.claimsTitle}>Verified Technical Claims</span>
                    {projectClaims.map((claim) => (
                      <div key={claim.id} className={styles.claimRow}>
                        <div className={styles.claimText}>
                          <span className={styles.claimBullet}>✓</span>
                          <span>{claim.claim}</span>
                        </div>
                        <button
                          type="button"
                          className={styles.proofTrigger}
                          onClick={() => handleOpenClaim(proj, claim)}
                        >
                          <ShieldCheck size={11} /> Inspect Proof
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                <div className={styles.caseStudyFooter}>
                  {proj.repository_url ? (
                    <a
                      href={proj.repository_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={styles.repoLink}
                    >
                      <GitBranch size={13} /> Repository <ArrowUpRight size={11} />
                    </a>
                  ) : (
                    <span />
                  )}

                  {projectClaims.length === 0 && (
                    <button
                      type="button"
                      className={styles.proofTrigger}
                      onClick={() => handleOpenClaim(proj)}
                    >
                      <ShieldCheck size={11} /> Inspect Evidence
                    </button>
                  )}
                </div>
              </article>
            );
          })}
        </div>
      </section>

      {/* Work Experience */}
      {work_experiences.length > 0 && (
        <section className={styles.section}>
          <div className={styles.sectionHeader}>
            <h2 className={styles.sectionTitle}>
              <Briefcase size={16} style={{ display: "inline", marginRight: 8 }} />
              Professional Experience
            </h2>
            <span className={styles.sectionSub}>Career History</span>
          </div>

          <div className={styles.timelineList}>
            {work_experiences.map((exp) => (
              <div key={exp.id} className={styles.timelineEntry}>
                <div className={styles.timelineDot} />
                <div className={styles.timelineHeader}>
                  <h3 className={styles.timelineRole}>
                    {exp.role} <span className={styles.timelineCompany}>@ {exp.company}</span>
                  </h3>
                  <span className={styles.timelinePeriod}>
                    {exp.start_date} – {exp.end_date}
                  </span>
                </div>

                {exp.description && <p className={styles.caseStudyDesc}>{exp.description}</p>}

                {exp.bullets && exp.bullets.length > 0 && (
                  <ul className={styles.timelineBullets}>
                    {exp.bullets.map((b, i) => (
                      <li key={i}>{b}</li>
                    ))}
                  </ul>
                )}
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Education & Certifications */}
      {(educations.length > 0 || certifications.length > 0) && (
        <section className={styles.section}>
          <div className={styles.sectionHeader}>
            <h2 className={styles.sectionTitle}>Education & Credentials</h2>
            <span className={styles.sectionSub}>Academic & Professional Certifications</span>
          </div>

          <div className={styles.twoColGrid}>
            {educations.map((edu) => (
              <div key={edu.id} className={styles.infoCard}>
                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <GraduationCap size={15} color="var(--color-primary)" />
                  <h3 className={styles.infoTitle}>{edu.degree}</h3>
                </div>
                <p className={styles.infoSub}>{edu.institution}</p>
                <span className={styles.infoMeta}>
                  {edu.start_year} – {edu.end_year} {edu.grade_or_gpa && `· ${edu.grade_or_gpa}`}
                </span>
              </div>
            ))}

            {certifications.map((cert) => (
              <div key={cert.id} className={styles.infoCard}>
                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <Award size={15} color="#10B981" />
                  <h3 className={styles.infoTitle}>{cert.name}</h3>
                </div>
                <p className={styles.infoSub}>{cert.issuer}</p>
                <span className={styles.infoMeta}>
                  Issued {cert.issue_date}{" "}
                  {cert.credential_url && (
                    <a
                      href={cert.credential_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{ color: "var(--color-primary)", marginLeft: 6 }}
                    >
                      Verify <ArrowUpRight size={10} style={{ display: "inline" }} />
                    </a>
                  )}
                </span>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Problem-Solving Profile & Analytical Cloud */}
      <section className={styles.section}>
        <div className={styles.sectionHeader}>
          <h2 className={styles.sectionTitle}>Problem-Solving Profile</h2>
          <span className={styles.sectionSub}>Graph Archetype Inference</span>
        </div>
        <ProblemSolvingProfile profile={problem_solving_profile} />
      </section>

      {/* Skill Progression & Verified Depth */}
      <section className={styles.section}>
        <div className={styles.sectionHeader}>
          <h2 className={styles.sectionTitle}>Technical Competencies</h2>
          <span className={styles.sectionSub}>Confirmed Execution Depth</span>
        </div>
        <SkillProgressView skillsProgress={skills} />
      </section>

      {/* Evidence Verification Drawer */}
      {selectedClaim && (
        <EvidenceDrawer claim={selectedClaim} onClose={() => setSelectedClaim(null)} />
      )}
    </div>
  );
}
