"use client";

import React, { useState, useMemo } from "react";
import styles from "./StrataView.module.css";
import type { DomainProgress, SkillProgress, Project } from "../../types";
import { Layers, TrendingUp, Sparkles, ShieldCheck, Zap } from "lucide-react";

interface StrataViewProps {
  domainProgress: DomainProgress[];
  skillProgress: SkillProgress[];
  projects: Project[];
  onInspectDomain?: (domainId: string) => void;
}

const DOMAIN_PALETTE: Record<string, string> = {
  "AI / Machine Learning": "#ec4899",
  "Backend Systems": "#60a5fa",
  "Distributed Systems": "#8b5cf6",
  "Full Stack Architecture": "#34d399",
  "Cloud Infrastructure": "#f59e0b",
  "Security & DevOps": "#10b981",
  "Data Engineering": "#06b6d4",
};

export function StrataView({
  domainProgress,
  skillProgress,
  projects,
  onInspectDomain,
}: StrataViewProps) {
  const [selectedDomainId, setSelectedDomainId] = useState<string | null>(null);

  // Compute Weekly Digest & Milestone Nudges from real data
  const { digests, nudges } = useMemo(() => {
    const computedDigests: Array<{ title: string; body: string }> = [];
    const computedNudges: Array<{ domain: string; nudge: string; progress: number }> = [];

    // Top domain momentum
    const sortedDomains = [...domainProgress].sort((a, b) => b.exposure_score - a.exposure_score);
    if (sortedDomains.length > 0) {
      const top = sortedDomains[0];
      const verifiedCount = projects.filter((p) =>
        p.domains?.some((d) => d.id === top.domain?.id)
      ).length;
      computedDigests.push({
        title: `Primary Seam: ${top.domain?.name || "Core Domain"}`,
        body: `Highest sediment density with an exposure score of ${Math.round(
          top.exposure_score * 100
        )}% backed by ${verifiedCount} verified repositories and live code artifacts.`,
      });
    }

    // Emerging domain milestone check
    const emerging = domainProgress.filter(
      (d) => d.exposure_score > 0 && d.exposure_score < 0.6
    );
    emerging.forEach((d) => {
      const name = d.domain?.name || "Emerging Area";
      const needed = Math.max(1, Math.ceil((0.6 - d.exposure_score) * 10));
      computedNudges.push({
        domain: name,
        nudge: `~${needed} more verified commit artifacts needed to cross from Emerging into Practicing status.`,
        progress: Math.round(d.exposure_score * 100),
      });
    });

    if (computedDigests.length === 0) {
      computedDigests.push({
        title: "Career Stratigraphy Synchronized",
        body: "All verified artifacts and commit lineages are active and indexed into geological depth layers.",
      });
    }

    return { digests: computedDigests, nudges: computedNudges };
  }, [domainProgress, projects]);

  const selectedDomainData = useMemo(() => {
    if (!selectedDomainId) return null;
    return domainProgress.find((d) => d.domain?.id === selectedDomainId) || null;
  }, [selectedDomainId, domainProgress]);

  return (
    <div className={styles.container}>
      {/* Header Overview */}
      <div className={styles.headerCard}>
        <div className={styles.titleArea}>
          <h2>
            <Layers size={20} color="#60a5fa" />
            <span>Career Strata & Geological Depth</span>
          </h2>
          <p className={styles.subtitle}>
            A core-sample cross-section of technical mastery over time. Layer thickness models
            cumulative exposure, while sediment saturation reflects empirical evidence density.
          </p>
        </div>
      </div>

      {/* Weekly Digest & Completion Nudges */}
      <div className={styles.digestGrid}>
        {digests.map((d, i) => (
          <div key={i} className={styles.digestCard}>
            <div className={styles.digestHeader}>
              <span>{d.title}</span>
              <Sparkles size={14} color="#60a5fa" />
            </div>
            <p className={styles.digestBody}>{d.body}</p>
          </div>
        ))}

        {nudges.slice(0, 2).map((n, i) => (
          <div key={i} className={styles.digestCard} style={{ borderColor: "rgba(245, 158, 11, 0.3)" }}>
            <div className={styles.digestHeader}>
              <span>{n.domain}</span>
              <span className={styles.badgeNudge}>Milestone Nudge</span>
            </div>
            <p className={styles.digestBody}>{n.nudge}</p>
            <div className={styles.strataBarContainer} style={{ height: "4px" }}>
              <div
                className={styles.strataBarFill}
                style={{ width: `${n.progress}%`, background: "#f59e0b" }}
              />
            </div>
          </div>
        ))}
      </div>

      {/* Strata Layers Core Sample */}
      <div className={styles.strataCore}>
        <div className={styles.strataHeader}>
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
            <TrendingUp size={16} color="#34d399" />
            <h3 style={{ fontSize: "1rem", fontWeight: 600, color: "#ffffff", margin: 0 }}>
              Stratigraphic Profile (Core Sample)
            </h3>
          </div>
          <div className={styles.strataLegend}>
            <div className={styles.legendItem}>
              <div className={styles.legendColor} style={{ background: "#ec4899" }} />
              <span>AI / ML</span>
            </div>
            <div className={styles.legendItem}>
              <div className={styles.legendColor} style={{ background: "#60a5fa" }} />
              <span>Backend</span>
            </div>
            <div className={styles.legendItem}>
              <div className={styles.legendColor} style={{ background: "#8b5cf6" }} />
              <span>Distributed</span>
            </div>
            <div className={styles.legendItem}>
              <div className={styles.legendColor} style={{ background: "#34d399" }} />
              <span>Full Stack</span>
            </div>
          </div>
        </div>

        <div className={styles.layersColumn}>
          {domainProgress.map((dp, idx) => {
            const domainId = dp.domain?.id || `dom-${idx}`;
            const name = dp.domain?.name || "Domain";
            const color = DOMAIN_PALETTE[name] || "#60a5fa";
            const percent = Math.round(dp.exposure_score * 100);
            const isSelected = selectedDomainId === domainId;
            const domainSkills = skillProgress.filter((s) => s.skill?.category === name);

            return (
              <div
                key={dp.id || domainId}
                className={`${styles.layerCard} ${isSelected ? styles.layerCardActive : ""}`}
                style={{
                  background: `linear-gradient(90deg, ${color}15 0%, rgba(22, 25, 34, 0.95) 100%)`,
                  borderLeft: `4px solid ${color}`,
                }}
                onClick={() => {
                  setSelectedDomainId(isSelected ? null : domainId);
                  if (onInspectDomain) onInspectDomain(domainId);
                }}
              >
                <div className={styles.layerTop}>
                  <span className={styles.layerTitle}>
                    <Zap size={14} color={color} />
                    {name}
                  </span>
                  <span className={styles.layerLevel}>Level {dp.current_level || "Practicing"}</span>
                </div>

                <div className={styles.strataBarContainer}>
                  <div
                    className={styles.strataBarFill}
                    style={{ width: `${percent}%`, background: color }}
                  />
                </div>

                <div className={styles.layerMeta}>
                  <span>Exposure: {percent}%</span>
                  <span>{domainSkills.length} Verified Skills Attached</span>
                </div>
              </div>
            );
          })}
        </div>

        {selectedDomainData && (
          <div className={styles.coreDetailCard}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <h4 style={{ color: "#ffffff", fontSize: "0.95rem", margin: 0, display: "flex", alignItems: "center", gap: "0.4rem" }}>
                <ShieldCheck size={16} color="#34d399" />
                <span>Layer Analysis: {selectedDomainData.domain?.name}</span>
              </h4>
              <span style={{ fontSize: "0.75rem", color: "#94a3b8" }}>
                Updated: {selectedDomainData.last_active ? new Date(selectedDomainData.last_active).toLocaleDateString() : "Active"}
              </span>
            </div>
            <p style={{ fontSize: "0.82rem", color: "#cbd5e1", marginTop: "0.5rem", lineHeight: 1.5 }}>
              {selectedDomainData.domain?.description ||
                "Deep architectural knowledge backed by verifiable code commits and project claim proofs."}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
