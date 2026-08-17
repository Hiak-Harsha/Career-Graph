"use client";

import React, { useEffect, useState, useCallback } from "react";
import { apiFetch } from "../../config";
import styles from "./ReviewQueue.module.css";
import { Check, X, Loader2 } from "lucide-react";

export type ReviewItem = {
  id?: string;
  project_id?: string;
  project_title?: string;
  domain_id?: string;
  skill_id?: string;
  domain_name?: string;
  skill_name?: string;
  claim?: string;
  confidence?: number;
  // Career history fields
  company?: string;
  role?: string;
  location?: string;
  start_date?: string;
  end_date?: string;
  bullets?: string[];
  institution?: string;
  degree?: string;
  field_of_study?: string;
  start_year?: string;
  end_year?: string;
  name?: string;
  issuer?: string;
  issue_date?: string;
};

export type Queue = {
  claims: ReviewItem[];
  domains: ReviewItem[];
  skills: ReviewItem[];
  experiences: ReviewItem[];
  educations: ReviewItem[];
  certifications: ReviewItem[];
};

const emptyQueue: Queue = {
  claims: [],
  domains: [],
  skills: [],
  experiences: [],
  educations: [],
  certifications: []
};

interface ReviewQueueProps {
  onRefreshAll: () => Promise<void>;
}

export function ReviewQueue({ onRefreshAll }: ReviewQueueProps) {
  const [queue, setQueue] = useState<Queue>(emptyQueue);
  const [status, setStatus] = useState("Loading suggestions…");
  const [busy, setBusy] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setStatus("Loading suggestions…");
      const response = await apiFetch("/review");
      const data = await response.json();
      setQueue({
        claims: data.claims || [],
        domains: data.domains || [],
        skills: data.skills || [],
        experiences: data.experiences || [],
        educations: data.educations || [],
        certifications: data.certifications || [],
      });
      setStatus("");
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Unable to load suggestions.");
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load();
  }, [load]);

  const getItemIdentifier = (kind: string, item: ReviewItem, idx?: number): string => {
    const rawId = item.id ?? item.domain_id ?? item.skill_id ?? `idx-${idx ?? 0}`;
    const projId = item.project_id ?? "global";
    return `${kind}-${projId}-${rawId}`;
  };

  const decide = async (
    kind: keyof Queue,
    item: ReviewItem,
    decision: "user_confirmed" | "user_rejected"
  ) => {
    const itemKey = getItemIdentifier(kind, item);
    setBusy(itemKey);

    // Optimistic UI removal
    setQueue((prev) => ({
      ...prev,
      [kind]: prev[kind].filter(
        (i) => getItemIdentifier(kind, i) !== itemKey
      ),
    }));

    try {
      let path = "";
      if (kind === "claims") path = `/claims/${item.id}`;
      else if (kind === "domains") path = `/project-domains/${item.project_id}/${item.domain_id}`;
      else if (kind === "skills") path = `/project-skills/${item.project_id}/${item.skill_id}`;
      else if (kind === "experiences") path = `/profile/experience/${item.id}`;
      else if (kind === "educations") path = `/profile/education/${item.id}`;
      else if (kind === "certifications") path = `/profile/certification/${item.id}`;

      await apiFetch(path, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: decision }),
      });

      await onRefreshAll();
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Unable to save review.");
      // Reload on failure to restore state
      await load();
    } finally {
      setBusy(null);
    }
  };

  const getItemTitle = (kind: keyof Queue, item: ReviewItem): string => {
    if (kind === "experiences") {
      return `${item.role || "Role"} at ${item.company || "Company"}`;
    }
    if (kind === "educations") {
      return `${item.degree || "Degree"} · ${item.institution || "Institution"}`;
    }
    if (kind === "certifications") {
      return `${item.name || "Certification"} (${item.issuer || "Issuer"})`;
    }
    return item.claim ?? item.domain_name ?? item.skill_name ?? "Suggestion";
  };

  const getItemSubtitle = (kind: keyof Queue, item: ReviewItem): string => {
    if (kind === "experiences") {
      return `${item.start_date || ""} - ${item.end_date || "Present"} ${item.location ? `· ${item.location}` : ""}`;
    }
    if (kind === "educations") {
      return `${item.field_of_study ? `${item.field_of_study} · ` : ""}${item.start_year || ""} - ${item.end_year || ""}`;
    }
    if (kind === "certifications") {
      return item.issue_date ? `Issued ${item.issue_date}` : "Credential";
    }
    return `${item.project_title ? `${item.project_title} · ` : ""}${item.confidence !== undefined ? `${Math.round(item.confidence * 100)}% confidence` : "AI Proposed"}`;
  };

  const groups: [keyof Queue, string][] = [
    ["claims", "Claims"],
    ["domains", "Domains"],
    ["skills", "Skills"],
    ["experiences", "Work Experiences"],
    ["educations", "Educations"],
    ["certifications", "Certifications"],
  ];

  return (
    <section className={styles.root}>
      <div className={styles.header}>
        <h1 className={styles.pageTitle || styles.title}>Review Queue</h1>
        <p className={styles.subtitle}>
          Confirm or reject AI suggestions to keep your Career Graph verified and accurate.
        </p>
      </div>

      {status && <p className={styles.statusMsg}>{status}</p>}

      {groups.map(([kind, label]) => (
        <div className={`${styles.card} surface`} key={kind}>
          <h2 className={styles.groupTitle}>{label} ({queue[kind]?.length || 0})</h2>
          {(!queue[kind] || queue[kind].length === 0) ? (
            <p className={styles.empty}>Nothing awaiting review in {label.toLowerCase()}.</p>
          ) : (
            queue[kind].map((item, idx) => {
              const key = getItemIdentifier(kind, item, idx);
              const title = getItemTitle(kind, item);
              const subtitle = getItemSubtitle(kind, item);
              const isItemBusy = busy === key;

              return (
                <div className={styles.reviewItem} key={key}>
                  <div className={styles.itemInfo}>
                    <strong className={styles.itemName}>{title}</strong>
                    <p className={styles.meta}>{subtitle}</p>
                    {item.bullets && item.bullets.length > 0 && (
                      <ul style={{ margin: "4px 0 0 16px", padding: 0, fontSize: "0.8rem", color: "var(--color-text-secondary, #94a3b8)" }}>
                        {item.bullets.slice(0, 2).map((b, bi) => (
                          <li key={bi}>{b}</li>
                        ))}
                      </ul>
                    )}
                  </div>
                  <div className={styles.reviewActions}>
                    <button
                      type="button"
                      className={`${styles.action} ${styles.approve}`}
                      disabled={isItemBusy}
                      onClick={() => decide(kind, item, "user_confirmed")}
                    >
                      {isItemBusy ? <Loader2 size={12} className="animate-spin" /> : <Check size={13} />}
                      <span>Confirm</span>
                    </button>
                    <button
                      type="button"
                      className={`${styles.action} ${styles.reject}`}
                      disabled={isItemBusy}
                      onClick={() => decide(kind, item, "user_rejected")}
                    >
                      <X size={13} />
                      <span>Reject</span>
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      ))}
    </section>
  );
}
