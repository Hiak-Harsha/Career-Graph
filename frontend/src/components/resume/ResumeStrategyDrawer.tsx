"use client";

import React, { useState, useEffect } from "react";
import styles from "./ResumeStrategyDrawer.module.css";
import { apiFetch } from "../../config";
import type {
  ProfessionalIdentity,
  ResumeStrategy,
  ResumeCritique,
  ResumeBlockRepresentation,
  ResumePersonality,
} from "../../types";
import {
  X,
  Compass,
  Cpu,
  Target,
  Sparkles,
  ShieldCheck,
  Zap,
  TrendingUp,
  Clock,
  ArrowRight,
  Loader2,
} from "lucide-react";

interface ResumeStrategyDrawerProps {
  targetRole: string;
  personality: ResumePersonality;
  onClose: () => void;
  onApplyImprovement: (rep: ResumeBlockRepresentation) => void;
}

export function ResumeStrategyDrawer({
  targetRole,
  personality,
  onClose,
  onApplyImprovement,
}: ResumeStrategyDrawerProps) {
  const [activeTab, setActiveTab] = useState<"identity" | "strategy" | "critique">("identity");
  const [identity, setIdentity] = useState<ProfessionalIdentity | null>(null);
  const [strategy, setStrategy] = useState<ResumeStrategy | null>(null);
  const [critique, setCritique] = useState<ResumeCritique | null>(null);
  const [loading, setLoading] = useState(true);
  const [applyingGap, setApplyingGap] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    async function loadIntelligence() {
      try {
        setLoading(true);
        setError("");

        const [idRes, stratRes, critRes] = await Promise.all([
          apiFetch("/resume/identity"),
          apiFetch("/resume/strategy", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ target_role: targetRole, layout_preference: personality }),
          }),
          apiFetch("/resume/critique", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ target_role: targetRole }),
          }),
        ]);

        if (idRes.ok) setIdentity(await idRes.json());
        if (stratRes.ok) setStrategy(await stratRes.json());
        if (critRes.ok) setCritique(await critRes.json());
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : "Failed to load resume intelligence data.");
      } finally {
        setLoading(false);
      }
    }

    loadIntelligence();
  }, [targetRole, personality]);

  const handleImproveRepresentation = async () => {
    if (!critique?.fails_to_communicate_gaps.length) return;
    try {
      setApplyingGap(true);
      const res = await apiFetch("/resume/improve-representation", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          target_role: targetRole,
          selected_gaps_to_fix: critique.fails_to_communicate_gaps,
          layout_personality: personality,
        }),
      });

      if (!res.ok) throw new Error("Failed to improve representation.");
      const newRep = await res.json();
      onApplyImprovement(newRep);
      onClose();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Error applying gap fixes.");
    } finally {
      setApplyingGap(false);
    }
  };

  return (
    <div className={styles.overlay} onClick={onClose} role="dialog" aria-modal="true">
      <div className={styles.drawer} onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className={styles.header}>
          <div>
            <h2 className={styles.title}>Resume Intelligence Engine</h2>
            <p className={styles.subtitle}>
              Role Strategy &middot; Identity Model &middot; Recruiter Critic
            </p>
          </div>
          <button type="button" className={styles.closeBtn} onClick={onClose} aria-label="Close">
            <X size={18} />
          </button>
        </div>

        {/* Tabs */}
        <div className={styles.tabs}>
          <button
            type="button"
            className={`${styles.tab} ${activeTab === "identity" ? styles.tabActive : ""}`}
            onClick={() => setActiveTab("identity")}
          >
            <Compass size={14} />
            <span>Identity Model</span>
          </button>
          <button
            type="button"
            className={`${styles.tab} ${activeTab === "strategy" ? styles.tabActive : ""}`}
            onClick={() => setActiveTab("strategy")}
          >
            <Target size={14} />
            <span>Strategy</span>
          </button>
          <button
            type="button"
            className={`${styles.tab} ${activeTab === "critique" ? styles.tabActive : ""}`}
            onClick={() => setActiveTab("critique")}
          >
            <ShieldCheck size={14} />
            <span>Recruiter Critic</span>
          </button>
        </div>

        {/* Body */}
        <div className={styles.body}>
          {loading ? (
            <div style={{ display: "flex", justifyContent: "center", padding: "3rem 0" }}>
              <Loader2 size={24} className="animate-spin" color="#60a5fa" />
            </div>
          ) : error ? (
            <div style={{ color: "#f87171", fontSize: "0.85rem", padding: "1rem" }}>{error}</div>
          ) : (
            <>
              {/* Tab 1: Professional Identity */}
              {activeTab === "identity" && identity && (
                <>
                  <div className={styles.sectionCard}>
                    <h3 className={styles.sectionTitle}>
                      <Compass size={15} color="#60a5fa" />
                      <span>Professional Profile</span>
                    </h3>
                    <div className={styles.metaGrid}>
                      <div className={styles.metaItem}>
                        <span className={styles.metaLabel}>Candidate</span>
                        <span className={styles.metaValue}>{identity.candidate_name}</span>
                      </div>
                      <div className={styles.metaItem}>
                        <span className={styles.metaLabel}>Evidence Strength</span>
                        <span className={styles.metaValue}>{identity.evidence_strength}</span>
                      </div>
                      <div className={styles.metaItem}>
                        <span className={styles.metaLabel}>Research Orientation</span>
                        <span className={styles.metaValue}>{identity.research_orientation}</span>
                      </div>
                      <div className={styles.metaItem}>
                        <span className={styles.metaLabel}>Project Style</span>
                        <span className={styles.metaValue}>{identity.project_style}</span>
                      </div>
                    </div>
                  </div>

                  <div className={styles.sectionCard}>
                    <h3 className={styles.sectionTitle}>
                      <Cpu size={15} color="#3b82f6" />
                      <span>Primary & Emerging Domains</span>
                    </h3>
                    <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                      <span className={styles.metaLabel}>Primary Domains</span>
                      <div className={styles.tagList}>
                        {identity.primary_domains.map((d) => (
                          <span key={d} className={styles.tag}>
                            {d}
                          </span>
                        ))}
                      </div>
                      <span className={styles.metaLabel} style={{ marginTop: "0.25rem" }}>
                        Emerging Horizons
                      </span>
                      <div className={styles.tagList}>
                        {identity.emerging_domains.map((d) => (
                          <span key={d} className={styles.tag} style={{ borderColor: "#a855f7", color: "#d8b4fe" }}>
                            {d}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className={styles.sectionCard}>
                    <h3 className={styles.sectionTitle}>
                      <TrendingUp size={15} color="#10b981" />
                      <span>Current Trajectory</span>
                    </h3>
                    <p className={styles.narrativeText}>{identity.current_trajectory}</p>
                  </div>
                </>
              )}

              {/* Tab 2: Resume Strategy */}
              {activeTab === "strategy" && strategy && (
                <>
                  <div className={styles.sectionCard}>
                    <h3 className={styles.sectionTitle}>
                      <Target size={15} color="#60a5fa" />
                      <span>Role Positioning Thesis</span>
                    </h3>
                    <p className={styles.narrativeText}>{strategy.candidate_positioning}</p>
                  </div>

                  <div className={styles.sectionCard}>
                    <h3 className={styles.sectionTitle}>
                      <Zap size={15} color="#f59e0b" />
                      <span>Curated Project Highlights</span>
                    </h3>
                    <div className={styles.tagList}>
                      {strategy.projects_to_highlight.map((p) => (
                        <span key={p} className={styles.tag} style={{ background: "rgba(245, 158, 11, 0.12)", color: "#fcd34d", borderColor: "rgba(245, 158, 11, 0.3)" }}>
                          {p}
                        </span>
                      ))}
                    </div>
                  </div>

                  <div className={styles.sectionCard}>
                    <h3 className={styles.sectionTitle}>
                      <Cpu size={15} color="#3b82f6" />
                      <span>Skills to Emphasize</span>
                    </h3>
                    <div className={styles.tagList}>
                      {strategy.skills_to_emphasize.map((s) => (
                        <span key={s} className={styles.tag}>
                          {s}
                        </span>
                      ))}
                    </div>
                  </div>

                  {strategy.weak_areas.length > 0 && (
                    <div className={styles.sectionCard}>
                      <h3 className={styles.sectionTitle} style={{ color: "#f87171" }}>
                        <span>Unevidenced & Gaps</span>
                      </h3>
                      <div className={styles.tagList}>
                        {strategy.weak_areas.map((w) => (
                          <span key={w} className={styles.weakTag}>
                            {w}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </>
              )}

              {/* Tab 3: Recruiter Critic */}
              {activeTab === "critique" && critique && (
                <>
                  <div className={styles.sectionCard}>
                    <h3 className={styles.sectionTitle}>
                      <Clock size={15} color="#60a5fa" />
                      <span>10-Second Recruiter Attention Model</span>
                    </h3>
                    <div className={styles.timelineList}>
                      {Object.entries(critique.recruiter_attention_hierarchy).map(([timeKey, text]) => (
                        <div key={timeKey} className={styles.timelineRow}>
                          <span className={styles.timelineTime}>{timeKey.replace("_to_", "–").replace("s", "s")}</span>
                          <span className={styles.timelineContent}>{text}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className={styles.sectionCard}>
                    <h3 className={styles.sectionTitle}>
                      <ShieldCheck size={15} color="#10b981" />
                      <span>Resume Readiness Scores</span>
                    </h3>
                    <div className={styles.readinessGrid}>
                      {critique.readiness_dimensions.map((dim) => (
                        <div key={dim.dimension} className={styles.readinessCard}>
                          <span className={styles.readinessTitle}>{dim.dimension}</span>
                          <span className={styles.readinessScore}>{dim.score}%</span>
                          <span className={styles.readinessInsight}>{dim.insight}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {critique.fails_to_communicate_gaps.length > 0 && (
                    <div className={styles.sectionCard} style={{ borderColor: "rgba(245, 158, 11, 0.3)" }}>
                      <h3 className={styles.sectionTitle} style={{ color: "#fbbf24" }}>
                        <Sparkles size={15} color="#fbbf24" />
                        <span>What My Resume Fails to Communicate</span>
                      </h3>
                      <div className={styles.gapList}>
                        {critique.fails_to_communicate_gaps.map((gap, i) => (
                          <div key={i} className={styles.gapItem}>
                            {gap}
                          </div>
                        ))}
                      </div>
                      <button
                        type="button"
                        className="btn btn-accent"
                        style={{ alignSelf: "flex-start", marginTop: "0.5rem" }}
                        onClick={handleImproveRepresentation}
                        disabled={applyingGap}
                      >
                        {applyingGap ? (
                          <>
                            <Loader2 size={14} className="animate-spin" />
                            <span>Updating Representation…</span>
                          </>
                        ) : (
                          <>
                            <Sparkles size={14} />
                            <span>1-Click Improve Representation</span>
                            <ArrowRight size={13} />
                          </>
                        )}
                      </button>
                    </div>
                  )}
                </>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        <div className={styles.actions}>
          <button type="button" className="btn btn-secondary" onClick={onClose}>
            Close Drawer
          </button>
        </div>
      </div>
    </div>
  );
}
