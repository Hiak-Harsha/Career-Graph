"use client";

import React from "react";
import styles from "./ResumeStylePicker.module.css";
import type { ResumeFormat, ResumePersonality } from "../../types";
import { Sliders, FileText, Layout, ArrowUp, ArrowDown, Check } from "lucide-react";

interface ResumeStylePickerProps {
  resumeFormat: ResumeFormat;
  onFormatChange: (format: ResumeFormat) => void;
  personality: ResumePersonality;
  onPersonalityChange: (p: ResumePersonality) => void;
  visibleSections: string[];
  onVisibleSectionsChange: (sections: string[]) => void;
  sectionOrder: string[];
  onSectionOrderChange: (order: string[]) => void;
}

const SECTION_LABELS: Record<string, string> = {
  summary: "Professional Summary",
  skills: "Core Skills & Competencies",
  experience: "Professional Experience",
  achievements: "Key Achievements & Proofs",
  projects: "Project Experience",
  education: "Education",
  certifications: "Certifications & Credentials",
};

const PERSONALITIES: { id: ResumePersonality; label: string }[] = [
  { id: "modern_professional", label: "Modern Pro" },
  { id: "technical", label: "Technical" },
  { id: "featured", label: "Featured 2-Col" },
  { id: "editorial", label: "Editorial" },
  { id: "research", label: "Research" },
  { id: "executive", label: "Executive" },
];

export function ResumeStylePicker({
  resumeFormat,
  onFormatChange,
  personality,
  onPersonalityChange,
  visibleSections,
  onVisibleSectionsChange,
  sectionOrder,
  onSectionOrderChange,
}: ResumeStylePickerProps) {
  const toggleSection = (secKey: string) => {
    if (visibleSections.includes(secKey)) {
      if (visibleSections.length > 1) {
        onVisibleSectionsChange(visibleSections.filter((s) => s !== secKey));
      }
    } else {
      onVisibleSectionsChange([...visibleSections, secKey]);
    }
  };

  const moveOrderUp = (index: number) => {
    if (index === 0) return;
    const next = [...sectionOrder];
    const temp = next[index - 1];
    next[index - 1] = next[index];
    next[index] = temp;
    onSectionOrderChange(next);
  };

  const moveOrderDown = (index: number) => {
    if (index === sectionOrder.length - 1) return;
    const next = [...sectionOrder];
    const temp = next[index + 1];
    next[index + 1] = next[index];
    next[index] = temp;
    onSectionOrderChange(next);
  };

  return (
    <div className={styles.container} aria-label="Resume Style and Format Controls">
      <div className={styles.titleGroup}>
        <Sliders size={16} color="#0284c7" />
        <h3 className={styles.title}>Resume Format & Style Customization</h3>
      </div>

      {/* 1. Format Selection */}
      <div>
        <div className={styles.groupLabel}>1. Select Target Format</div>
        <div className={styles.formatToggle}>
          <button
            type="button"
            className={`${styles.formatBtn} ${
              resumeFormat === "ats_clean" ? styles.formatBtnActive : ""
            }`}
            onClick={() => onFormatChange("ats_clean")}
          >
            <FileText size={15} />
            <span>ATS Clean (Single-Column Dense)</span>
          </button>
          <button
            type="button"
            className={`${styles.formatBtn} ${
              resumeFormat === "visual" ? styles.formatBtnActive : ""
            }`}
            onClick={() => onFormatChange("visual")}
          >
            <Layout size={15} />
            <span>Visual Showcase (Multi-Personality)</span>
          </button>
        </div>
      </div>

      {/* 2. Personality Selection (Visual Format Only) */}
      {resumeFormat === "visual" && (
        <div>
          <div className={styles.groupLabel}>2. Select Visual Personality</div>
          <div className={styles.personalityGrid}>
            {PERSONALITIES.map((p) => (
              <button
                key={p.id}
                type="button"
                className={`${styles.personalityBtn} ${
                  personality === p.id ? styles.personalityBtnActive : ""
                }`}
                onClick={() => onPersonalityChange(p.id)}
              >
                {personality === p.id && <Check size={12} style={{ marginRight: 4 }} />}
                {p.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* 3. Section Visibility & Custom Vertical Ordering */}
      <div className={styles.sectionsLayout}>
        {/* Section Visibility */}
        <div>
          <div className={styles.groupLabel}>Section Visibility</div>
          <div className={styles.checkboxList}>
            {Object.entries(SECTION_LABELS).map(([secKey, label]) => {
              const isChecked = visibleSections.includes(secKey);
              return (
                <label key={secKey} className={styles.checkboxItem}>
                  <input
                    type="checkbox"
                    checked={isChecked}
                    onChange={() => toggleSection(secKey)}
                  />
                  <span>{label}</span>
                </label>
              );
            })}
          </div>
        </div>

        {/* Section Order */}
        <div>
          <div className={styles.groupLabel}>Section Order</div>
          <div className={styles.orderList}>
            {sectionOrder.map((secKey, idx) => (
              <div key={secKey} className={styles.orderItem}>
                <span>{SECTION_LABELS[secKey] || secKey}</span>
                <div className={styles.orderActions}>
                  <button
                    type="button"
                    className={styles.orderBtn}
                    onClick={() => moveOrderUp(idx)}
                    disabled={idx === 0}
                    title="Move section up"
                  >
                    <ArrowUp size={11} />
                  </button>
                  <button
                    type="button"
                    className={styles.orderBtn}
                    onClick={() => moveOrderDown(idx)}
                    disabled={idx === sectionOrder.length - 1}
                    title="Move section down"
                  >
                    <ArrowDown size={11} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
