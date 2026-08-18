"use client";

import React from "react";
import styles from "./AtsCleanResumeView.module.css";
import type {
  ResumeBlockRepresentation,
  ResumeData,
  IdentityBlockPayload,
  PositioningBlockPayload,
  SelectedWorkBlockPayload,
  TechnicalDepthBlockPayload,
  ExperienceBlockPayload,
  EducationBlockPayload,
  CertificationsBlockPayload,
  AchievementsBlockPayload,
  EvidenceClaimItem,
} from "../../types";
import { Mail, Phone, MapPin, Globe, ShieldCheck, ExternalLink } from "lucide-react";
import { GithubIcon } from "../ui/icons/GithubIcon";

interface AtsCleanResumeViewProps {
  blocksRep?: ResumeBlockRepresentation | null;
  resumeData?: ResumeData | null;
  visibleSections?: string[];
  sectionOrder?: string[];
  onInspectProof?: (claimId: string, claimText: string) => void;
}

export function AtsCleanResumeView({
  blocksRep,
  resumeData,
  visibleSections,
  sectionOrder,
  onInspectProof,
}: AtsCleanResumeViewProps) {
  // Helper to extract typed block payloads from ResumeBlockRepresentation
  const getBlock = <T,>(type: string): T | undefined => {
    const block = blocksRep?.blocks?.find((b) => b.block_type === type);
    return block ? (block.content_payload as unknown as T) : undefined;
  };

  const identity = getBlock<IdentityBlockPayload>("identity");
  const positioning = getBlock<PositioningBlockPayload>("positioning");
  const selectedWork = getBlock<SelectedWorkBlockPayload>("selected_work");
  const technicalDepth = getBlock<TechnicalDepthBlockPayload>("technical_depth");
  const experience = getBlock<ExperienceBlockPayload>("experience");
  const education = getBlock<EducationBlockPayload>("education");
  const certifications = getBlock<CertificationsBlockPayload>("certifications");
  const achievements = getBlock<AchievementsBlockPayload>("achievements");

  // Fallback / merged candidate profile info
  const name = identity?.name || resumeData?.profile?.name || "Candidate Profile";
  const headline = identity?.headline || resumeData?.profile?.headline || resumeData?.target_role || "";
  const email = identity?.email || resumeData?.profile?.email || "";
  const phone = resumeData?.profile?.phone || "";
  const location = identity?.location || resumeData?.profile?.location || "";
  const github = identity?.github || resumeData?.profile?.github_username || "";

  // Contact links
  const socialLinks = resumeData?.links || [];
  const linkedinLink = socialLinks.find((l) => l.platform.toLowerCase() === "linkedin")?.url;

  // Flattened Skills Line (deduped capabilities joined with " • ")
  const skillsList: string[] = [];
  if (technicalDepth?.clusters && technicalDepth.clusters.length > 0) {
    for (const c of technicalDepth.clusters) {
      if (c.capabilities) {
        const parts = c.capabilities.split(/[·•,]+/).map((s) => s.trim()).filter(Boolean);
        skillsList.push(...parts);
      }
    }
  }
  if (skillsList.length === 0 && resumeData?.skills && resumeData.skills.length > 0) {
    skillsList.push(...resumeData.skills);
  }
  const uniqueSkills = Array.from(new Set(skillsList));

  // Summary bullets
  let summaryBullets: string[] = positioning?.summary_bullets || [];
  if (summaryBullets.length === 0 && (positioning?.statement || resumeData?.summary)) {
    const statement = positioning?.statement || resumeData?.summary || "";
    summaryBullets = statement
      .split(/(?<=[.!?])\s+/)
      .map((s) => s.trim())
      .filter(Boolean)
      .slice(0, 3);
  }

  // Work experience list
  const experienceList = experience?.experiences || resumeData?.experience || [];

  // Education list
  const educationList = education?.educations || resumeData?.education || [];

  // Achievements list (flat claims)
  const achievementsList = achievements?.achievements || [];
  const verifiedClaims = resumeData?.claims || [];

  // Projects list
  const projectsList = selectedWork?.projects || resumeData?.projects || [];

  // Certifications list
  const certificationsList = certifications?.certifications || resumeData?.certifications || [];

  // Default section ordering
  const defaultOrder = [
    "summary",
    "skills",
    "experience",
    "achievements",
    "projects",
    "education",
    "certifications",
  ];
  const activeOrder = sectionOrder && sectionOrder.length > 0 ? sectionOrder : defaultOrder;

  const isSectionVisible = (secKey: string) => {
    if (!visibleSections || visibleSections.length === 0) return true;
    return visibleSections.includes(secKey);
  };

  const renderSectionContent = (secKey: string) => {
    switch (secKey) {
      case "summary":
        if (summaryBullets.length === 0) return null;
        return (
          <section key="summary" className={styles.section} aria-label="Professional Summary">
            <h3 className={styles.sectionTitle}>Summary</h3>
            <ul className={styles.bulletList}>
              {summaryBullets.map((bullet, idx) => (
                <li key={idx} className={styles.bulletItem}>
                  {bullet}
                </li>
              ))}
            </ul>
          </section>
        );

      case "skills":
        if (uniqueSkills.length === 0) return null;
        return (
          <section key="skills" className={styles.section} aria-label="Core Technical Skills">
            <h3 className={styles.sectionTitle}>Core Skills & Competencies</h3>
            <p className={styles.skillsLine}>
              {uniqueSkills.join(" • ")}
            </p>
          </section>
        );

      case "experience":
        if (experienceList.length === 0) return null;
        return (
          <section key="experience" className={styles.section} aria-label="Professional Experience">
            <h3 className={styles.sectionTitle}>Professional Experience</h3>
            {experienceList.map((exp, idx) => {
              const expLocation = "location" in exp ? (exp.location as string) : undefined;
              const expId = "id" in exp ? (exp.id as string) : undefined;
              return (
                <div key={expId || idx} className={styles.itemCard}>
                  <div className={styles.itemHeader}>
                    <span className={styles.itemTitle}>{exp.role}</span>
                    <span className={styles.itemDates}>
                      {exp.start_date} – {exp.end_date || "Present"}
                    </span>
                  </div>
                  <div className={styles.itemSubtitle}>
                    {exp.company} {expLocation ? `· ${expLocation}` : ""}
                  </div>
                  {exp.bullets && exp.bullets.length > 0 && (
                    <ul className={styles.bulletList}>
                      {exp.bullets.map((b, bi) => (
                        <li key={bi} className={styles.bulletItem}>
                          {b}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              );
            })}
          </section>
        );

      case "achievements":
        if (achievementsList.length === 0 && verifiedClaims.length === 0) return null;
        return (
          <section key="achievements" className={styles.section} aria-label="Key Achievements">
            <h3 className={styles.sectionTitle}>Key Achievements & Verified Proofs</h3>
            <ul className={styles.bulletList}>
              {achievementsList.length > 0
                ? achievementsList.map((item, idx) => (
                    <li key={idx} className={styles.bulletItem}>
                      <strong>{item.title}:</strong> {item.description}
                      {item.claim_id && onInspectProof && (
                        <button
                          type="button"
                          className={styles.proofBadge}
                          onClick={() => onInspectProof(item.claim_id!, item.description)}
                          title="Inspect cryptographic commit proof"
                        >
                          <ShieldCheck size={11} /> Proof
                        </button>
                      )}
                    </li>
                  ))
                : verifiedClaims.slice(0, 4).map((claimText, idx) => (
                    <li key={idx} className={styles.bulletItem}>
                      {claimText}
                    </li>
                  ))}
            </ul>
          </section>
        );

      case "projects":
        if (projectsList.length === 0) return null;
        return (
          <section key="projects" className={styles.section} aria-label="Project Experience">
            <h3 className={styles.sectionTitle}>Project Experience</h3>
            {projectsList.map((proj, idx) => {
              const projDesc = proj.description || ("narrative" in proj ? (proj.narrative as string) : "");
              const evidenceClaims = "evidence_claims" in proj ? (proj.evidence_claims as EvidenceClaimItem[]) : undefined;
              return (
                <div key={proj.id || idx} className={styles.itemCard}>
                  <div className={styles.itemHeader}>
                    <div>
                      <span className={styles.projectTitle}>{proj.title}</span>
                      {proj.repository_url && (
                        <a
                          href={proj.repository_url}
                          target="_blank"
                          rel="noreferrer"
                          className={styles.proofBadge}
                          style={{ textDecoration: "none" }}
                        >
                          <ExternalLink size={10} /> Repository
                        </a>
                      )}
                    </div>
                  </div>
                  {projDesc && <p className={styles.projectDesc}>{projDesc}</p>}
                  {evidenceClaims && evidenceClaims.length > 0 && (
                    <ul className={styles.bulletList}>
                      {evidenceClaims.map((claim, ci) => (
                        <li key={claim.id || ci} className={styles.bulletItem}>
                          {claim.claim}
                          {claim.id && onInspectProof && (
                            <button
                              type="button"
                              className={styles.proofBadge}
                              onClick={() => onInspectProof(claim.id!, claim.claim)}
                            >
                              <ShieldCheck size={11} /> Verified
                            </button>
                          )}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              );
            })}
          </section>
        );

      case "education":
        if (educationList.length === 0) return null;
        return (
          <section key="education" className={styles.section} aria-label="Education">
            <h3 className={styles.sectionTitle}>Education</h3>
            {educationList.map((edu, idx) => {
              const eduId = "id" in edu ? (edu.id as string) : undefined;
              return (
                <div key={eduId || idx} className={styles.itemCard}>
                  <div className={styles.itemHeader}>
                    <span className={styles.itemTitle}>{edu.institution}</span>
                    <span className={styles.itemDates}>
                      {edu.start_year ? `${edu.start_year} – ` : ""}{edu.end_year || "Graduated"}
                    </span>
                  </div>
                  <div className={styles.itemSubtitle}>
                    {edu.degree} {edu.field_of_study ? `in ${edu.field_of_study}` : ""}
                  </div>
                </div>
              );
            })}
          </section>
        );

      case "certifications":
        if (certificationsList.length === 0) return null;
        return (
          <section key="certifications" className={styles.section} aria-label="Certifications">
            <h3 className={styles.sectionTitle}>Certifications & Credentials</h3>
            <ul className={styles.bulletList}>
              {certificationsList.map((cert, idx) => {
                const certId = "id" in cert ? (cert.id as string) : undefined;
                return (
                  <li key={certId || idx} className={styles.bulletItem}>
                    <strong>{cert.name}</strong> – {cert.issuer} {cert.issue_date ? `(${cert.issue_date})` : ""}
                  </li>
                );
              })}
            </ul>
          </section>
        );

      default:
        return null;
    }
  };

  return (
    <article className={styles.container} aria-label="ATS Clean Resume">
      {/* ─── Header ───────────────────────────────────────────────────────── */}
      <header className={styles.header}>
        <h1 className={styles.name}>{name}</h1>
        <div className={styles.headline}>{headline}</div>
        <div className={styles.contactLine}>
          {email && (
            <a href={`mailto:${email}`} className={styles.contactItem}>
              <Mail size={13} />
              <span>{email}</span>
            </a>
          )}
          {phone && (
            <span className={styles.contactItem}>
              <Phone size={13} />
              <span>{phone}</span>
            </span>
          )}
          {location && (
            <span className={styles.contactItem}>
              <MapPin size={13} />
              <span>{location}</span>
            </span>
          )}
          {linkedinLink && (
            <a href={linkedinLink} target="_blank" rel="noreferrer" className={styles.contactItem}>
              <Globe size={13} />
              <span>LinkedIn</span>
            </a>
          )}
          {github && (
            <a href={`https://github.com/${github}`} target="_blank" rel="noreferrer" className={styles.contactItem}>
              <GithubIcon size={13} />
              <span>github.com/{github}</span>
            </a>
          )}
        </div>
      </header>

      {/* ─── Render Sections According to activeOrder and visibleSections ── */}
      {activeOrder.filter(isSectionVisible).map((secKey) => renderSectionContent(secKey))}
    </article>
  );
}
