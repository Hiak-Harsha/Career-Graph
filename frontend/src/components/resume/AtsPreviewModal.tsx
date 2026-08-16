"use client";

import React, { useState, useMemo } from "react";
import styles from "./AtsPreviewModal.module.css";
import type { ResumeData } from "../../types";
import { X, Copy, Check, Download, FileText } from "lucide-react";
import { useFocusTrap } from "../../hooks/useFocusTrap";

interface AtsPreviewModalProps {
  resumeData: ResumeData;
  onClose: () => void;
  onExportAts?: () => void;
}

export function AtsPreviewModal({ resumeData, onClose, onExportAts }: AtsPreviewModalProps) {
  const trapRef = useFocusTrap<HTMLDivElement>({ onEscape: onClose });
  const [copied, setCopied] = useState(false);

  // Generate clean ATS plain text representation
  const plainText = useMemo(() => {
    const lines: string[] = [];

    // Header
    lines.push(resumeData.profile.name.toUpperCase());
    lines.push(resumeData.target_role);
    const contactParts: string[] = [];
    if (resumeData.profile.email) contactParts.push(`Email: ${resumeData.profile.email}`);
    if (resumeData.profile.github_username) contactParts.push(`GitHub: github.com/${resumeData.profile.github_username}`);
    if (resumeData.profile.location) contactParts.push(`Location: ${resumeData.profile.location}`);
    if (contactParts.length > 0) lines.push(contactParts.join(" | "));
    lines.push("");

    // Summary
    if (resumeData.summary) {
      lines.push("PROFESSIONAL SUMMARY");
      lines.push("-".repeat(40));
      lines.push(resumeData.summary);
      lines.push("");
    }

    // Skills
    if (resumeData.skills && resumeData.skills.length > 0) {
      lines.push("TECHNICAL SKILLS");
      lines.push("-".repeat(40));
      lines.push(resumeData.skills.join(", "));
      lines.push("");
    }

    // Experience
    if (resumeData.experience && resumeData.experience.length > 0) {
      lines.push("PROFESSIONAL EXPERIENCE");
      lines.push("-".repeat(40));
      for (const exp of resumeData.experience) {
        lines.push(`${exp.role} | ${exp.company} (${exp.start_date} - ${exp.end_date})`);
        if (exp.description) lines.push(exp.description);
        if (exp.bullets) {
          for (const b of exp.bullets) {
            lines.push(`* ${b}`);
          }
        }
        lines.push("");
      }
    }

    // Projects
    if (resumeData.projects && resumeData.projects.length > 0) {
      lines.push("VERIFIABLE PROJECTS & EXPERIENCE");
      lines.push("-".repeat(40));
      for (const p of resumeData.projects) {
        if (p.included === false) continue;
        lines.push(`${p.title} ${p.skills?.length ? `[${p.skills.slice(0, 4).join(", ")}]` : ""}`);
        if (p.description) lines.push(p.description);
        const bullets = p.custom_bullets?.length
          ? p.custom_bullets
          : (p.narrative || "").split(" • ").filter(Boolean);
        for (const b of bullets) {
          lines.push(`* ${b}`);
        }
        lines.push("");
      }
    }

    // Education
    if (resumeData.education && resumeData.education.length > 0) {
      lines.push("EDUCATION");
      lines.push("-".repeat(40));
      for (const edu of resumeData.education) {
        lines.push(`${edu.degree} - ${edu.institution} (${edu.start_year || ""} - ${edu.end_year || ""})`);
      }
      lines.push("");
    }

    // Certifications
    if (resumeData.certifications && resumeData.certifications.length > 0) {
      lines.push("CERTIFICATIONS");
      lines.push("-".repeat(40));
      for (const cert of resumeData.certifications) {
        lines.push(`${cert.name} - ${cert.issuer}`);
      }
    }

    return lines.join("\n");
  }, [resumeData]);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(plainText);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Handled silently
    }
  };

  const handleDownloadTxt = () => {
    const blob = new Blob([plainText], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${resumeData.profile.name.replace(/\s+/g, "_")}_Resume_ATS.txt`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className={styles.overlay} onClick={onClose} role="dialog" aria-modal="true">
      <div ref={trapRef} className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <div className={styles.header}>
          <div className={styles.titleGroup}>
            <FileText size={18} color="var(--accent)" />
            <h2 className={styles.title}>ATS Plain Text Preview</h2>
            <span className={styles.badge}>ATS-Safe</span>
          </div>
          <button
            type="button"
            className={styles.closeBtn}
            onClick={onClose}
            aria-label="Close modal"
          >
            <X size={18} />
          </button>
        </div>

        <div className={styles.body}>
          <p className={styles.instructions}>
            This clean ASCII formatting contains standard headers and bullets, stripped of CSS columns and graphics for 100% ATS parser compatibility.
          </p>
          <pre className={styles.textContainer}>{plainText}</pre>
        </div>

        <div className={styles.footer}>
          {onExportAts && (
            <button
              type="button"
              className={`btn btn-secondary ${styles.actionBtn}`}
              onClick={onExportAts}
            >
              <Download size={14} />
              <span>Download ATS PDF</span>
            </button>
          )}
          <button
            type="button"
            className={`btn btn-secondary ${styles.actionBtn}`}
            onClick={handleDownloadTxt}
          >
            <Download size={14} />
            <span>Download .txt</span>
          </button>
          <button
            type="button"
            className={`btn btn-primary ${styles.actionBtn}`}
            onClick={handleCopy}
          >
            {copied ? <Check size={14} /> : <Copy size={14} />}
            <span>{copied ? "Copied to Clipboard!" : "Copy Plain Text"}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
