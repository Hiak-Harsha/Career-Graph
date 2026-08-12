"use client";

import { useEffect, useState } from "react";
import { apiFetch } from "../config";
import styles from "./components.module.css";

type ReviewItem = { id?: string; project_id?: string; project_title?: string; domain_id?: string; skill_id?: string; domain_name?: string; skill_name?: string; claim?: string; confidence: number };
type Queue = { claims: ReviewItem[]; domains: ReviewItem[]; skills: ReviewItem[] };
const emptyQueue: Queue = { claims: [], domains: [], skills: [] };

export function ReviewQueue({ onRefreshAll }: { onRefreshAll: () => Promise<void> }) {
  const [queue, setQueue] = useState<Queue>(emptyQueue);
  const [status, setStatus] = useState("Loading suggestions…");
  const [busy, setBusy] = useState<string | null>(null);
  const load = async () => { try { setStatus("Loading suggestions…"); const response = await apiFetch("/review"); setQueue(await response.json()); setStatus(""); } catch (error) { setStatus(error instanceof Error ? error.message : "Unable to load suggestions."); } };
  useEffect(() => { void load(); }, []);
  const decide = async (kind: "claims" | "domains" | "skills", item: ReviewItem, decision: "user_confirmed" | "user_rejected") => { const key = `${kind}-${item.id ?? item.domain_id ?? item.skill_id}`; setBusy(key); try { const path = kind === "claims" ? `/claims/${item.id}` : kind === "domains" ? `/project-domains/${item.project_id}/${item.domain_id}` : `/project-skills/${item.project_id}/${item.skill_id}`; await apiFetch(path, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status: decision }) }); await Promise.all([load(), onRefreshAll()]); } catch (error) { setStatus(error instanceof Error ? error.message : "Unable to save review."); } finally { setBusy(null); } };
  const groups: [keyof Queue, string][] = [["claims", "Claims"], ["domains", "Domains"], ["skills", "Skills"]];
  return <section><div className="header"><h1>Review queue</h1><p>Confirm only the evidence you want represented in your career graph.</p></div>{status && <p className={styles.empty}>{status}</p>}{groups.map(([kind, label]) => <div className={styles.card} key={kind}><h2>{label}</h2>{queue[kind].length === 0 ? <p className={styles.empty}>Nothing awaiting review.</p> : queue[kind].map((item) => { const key = `${kind}-${item.id ?? item.domain_id ?? item.skill_id}`; const name = item.claim ?? item.domain_name ?? item.skill_name ?? "Suggestion"; return <div className={styles.reviewItem} key={key}><div><strong>{name}</strong><p className={styles.meta}>{item.project_title && `${item.project_title} · `}{Math.round(item.confidence * 100)}% confidence</p></div><div className={styles.reviewActions}><button className={`${styles.action} ${styles.approve}`} disabled={busy === key} onClick={() => decide(kind, item, "user_confirmed")}>Confirm</button><button className={`${styles.action} ${styles.reject}`} disabled={busy === key} onClick={() => decide(kind, item, "user_rejected")}>Reject</button></div></div>; })}</div>)}</section>;
}
