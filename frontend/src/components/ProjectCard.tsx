import styles from "./components.module.css";

type Project = { title: string; description?: string; status: string; project_type: string; complexity_score?: number; repository_url?: string; skills?: { id: string; name: string }[]; domains?: { id: string; name: string }[] };
export function ProjectCard({ project }: { project: Project }) {
  const score = Math.max(0, Math.min(10, project.complexity_score ?? 0));
  return <article className={styles.card}><div className={styles.cardHeader}><div><h3>{project.title}</h3><p className={styles.meta}>{project.project_type} · {project.status}</p></div><span className={styles.score}>{score.toFixed(1)} / 10 depth</span></div>{project.description && <p className={styles.description}>{project.description}</p>}<div className={styles.tags}>{[...(project.skills ?? []), ...(project.domains ?? [])].map((item) => <span className={styles.tag} key={item.id}>{item.name}</span>)}</div><div className={styles.progress} aria-label={`Complexity score ${score} of 10`}><span style={{ width: `${score * 10}%` }} /></div>{project.repository_url && <p className={styles.meta} style={{ marginTop: ".8rem" }}><a href={project.repository_url} target="_blank" rel="noreferrer">View source ↗</a></p>}</article>;
}
