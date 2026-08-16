"use client";

import React, { useState, useMemo } from "react";
import styles from "./AtsPreviewModal.module.css";
import type { ResumeData } from "../../types";
import { X, Copy, Check, Download, FileText } from "lucide-react";

interface AtsPreviewModalProps {
  resumeData: ResumeData;
  onClose: () => void;
  onExportAts?: () => void;
}

export function AtsPreviewModal({ resumeData, onClose, onExportAts }: AtsPreviewModalProps) {
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
      lines.push("--------------------");
      lines.push(resumeData.summary);
      lines.push("");
    }

    // Skills
    if (resumeData.skills && resumeData.skills.length > 0) {
      lines.push("TECHNICAL SKILLS");
      lines.push("----------------");
      lines.push(resumeData.skills.join(", "));
      lines.push("");
    }

    // Projects
    if (resumeData.projects && resumeData.projects.length > 0) {
      lines.push("VERIFIABLE PROJECTS & EXPERIENCE");
      lines.push("--------------------------------");
      resumeData.projects.forEach((p) => {
        lines.push(`* ${p.title.toUpperCase()}`);
        if (p.narrative) {
          lines.push(`  ${p.narrative}`);
        }
        if (p.evidence_links && p.evidence_links.length > 0) {
          const links = p.evidence_links.map((l) => l.label).join("; ");
          lines.push(`  Verified Evidence: ${links}`);
        }
        lines.push("");
      });
    }

    // Claims
    if (resumeData.claims && resumeData.claims.length > 0) {
      lines.push("EVIDENCE-BACKED ACHIEVEMENTS");
      lines.push("----------------------------");
      resumeData.claims.forEach((c) => {
        lines.push(`* ${c}`);
      });
      lines.push("");
    }

    return lines.join("\n");
  }, [resumeData]);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(plainText);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      // fallback
    }
  };

  const handleDownloadTxt = () => {
    const element = document.createElement("a");
    const file = new Blob([plainText], { type: "text/plain;charset=utf-8" });
    element.href = URL.createObjectURL(file);
    element.download = `${resumeData.profile.name.replace(/\s+/g, "_")}_Resume_ATS.txt`;
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
  };

  return (
    <div className={styles.overlay} onClick={onClose} role="dialog" aria-modal="true">
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
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
