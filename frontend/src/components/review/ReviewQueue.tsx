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
  confidence: number;
};

export type Queue = {
  claims: ReviewItem[];
  domains: ReviewItem[];
  skills: ReviewItem[];
};

const emptyQueue: Queue = { claims: [], domains: [], skills: [] };

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
      setQueue(data);
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
    kind: "claims" | "domains" | "skills",
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
      const path =
        kind === "claims"
          ? `/claims/${item.id}`
          : kind === "domains"
          ? `/project-domains/${item.project_id}/${item.domain_id}`
          : `/project-skills/${item.project_id}/${item.skill_id}`;

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

  const groups: [keyof Queue, string][] = [
    ["claims", "Claims"],
    ["domains", "Domains"],
    ["skills", "Skills"],
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
          <h2 className={styles.groupTitle}>{label} ({queue[kind].length})</h2>
          {queue[kind].length === 0 ? (
            <p className={styles.empty}>Nothing awaiting review in {label.toLowerCase()}.</p>
          ) : (
            queue[kind].map((item, idx) => {
              const key = getItemIdentifier(kind, item, idx);
              const name =
                item.claim ?? item.domain_name ?? item.skill_name ?? "Suggestion";
              const isItemBusy = busy === key;

              return (
                <div className={styles.reviewItem} key={key}>
                  <div className={styles.itemInfo}>
                    <strong className={styles.itemName}>{name}</strong>
                    <p className={styles.meta}>
                      {item.project_title && `${item.project_title} · `}
                      {Math.round(item.confidence * 100)}% confidence
                    </p>
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
