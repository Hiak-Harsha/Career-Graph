import styles from "./components.module.css";

type DomainProgress = { domain: { name: string }; exposure_score: number; depth_score: number; trajectory: string; current_level: string };
export function DomainCard({ dp }: { dp: DomainProgress }) {
  const score = Math.min(100, Math.round(((dp.exposure_score + dp.depth_score) / 2) * 10));
  return <article className={styles.card}><div className={styles.cardHeader}><div><h3>{dp.domain.name}</h3><p className={styles.meta}>{dp.current_level} · {dp.trajectory.toLowerCase()}</p></div><span className={styles.score}>{score}%</span></div><div className={styles.progress}><span style={{ width: `${score}%` }} /></div></article>;
}
