import styles from "./ProjectCard.module.css";
import type { Project } from "../../types";

const STATUS_ICON: Record<string, string> = {
  IDEA:       "○",
  EXPLORING:  "◐",
  PLANNED:    "◑",
  ACTIVE:     "●",
  COMPLETED:  "✓",
  MAINTAINED: "↻",
  PAUSED:     "‖",
};

const STATUS_CLASS: Record<string, string> = {
  ACTIVE:     "s-active",
  EXPLORING:  "s-exploring",
  COMPLETED:  "s-completed",
  MAINTAINED: "s-maintained",
  PAUSED:     "s-paused",
  IDEA:       "s-neutral",
  PLANNED:    "s-neutral",
};

export function ProjectCard({ project }: { project: Project }) {
  const primaryDomains = (project.domains ?? []).slice(0, 3);
  const primarySkills  = (project.skills  ?? []).slice(0, 6);

  // Career impact: domain names the project strengthens
  const impact = (project.domains ?? []).map((d) => d.name);

  return (
    <article className={styles.card}>
      {/* Title row */}
      <div className={styles.titleRow}>
        <div>
          <h3 className={styles.title}>{project.title}</h3>
          <p className={styles.meta}>
            {project.project_type.charAt(0) + project.project_type.slice(1).toLowerCase()}
            {primaryDomains.length > 0 && (
              <> · {primaryDomains.map((d) => d.name).join(" · ")}</>
            )}
          </p>
        </div>

        <span className={`${styles.statusBadge} ${styles[STATUS_CLASS[project.status] ?? "s-neutral"]}`}>
          <span className={styles.statusIcon}>{STATUS_ICON[project.status] ?? "●"}</span>
          {project.status.charAt(0) + project.status.slice(1).toLowerCase()}
        </span>
      </div>

      {/* Description */}
      {project.description && (
        <p className={styles.description}>{project.description}</p>
      )}

      {/* Technologies */}
      {primarySkills.length > 0 && (
        <div className={styles.section}>
          <p className={styles.sectionLabel}>Technologies</p>
          <div className={styles.chips}>
            {primarySkills.map((s) => (
              <span key={s.id} className="chip chip-neutral">{s.name}</span>
            ))}
          </div>
        </div>
      )}

      {/* Career impact */}
      {impact.length > 0 && (
        <div className={styles.section}>
          <p className={styles.sectionLabel}>Career impact</p>
          <p className={styles.impactText}>
            Strengthens:{" "}
            <span className={styles.impactDomains}>
              {impact.join(" · ")}
            </span>
          </p>
        </div>
      )}

      {/* Footer */}
      <div className={styles.footer}>
        {project.claims && project.claims.length > 0 && (
          <span className={styles.evidenceCount}>
            {project.claims.length} claim{project.claims.length !== 1 ? "s" : ""}
          </span>
        )}
        {project.repository_url && (
          <a
            href={project.repository_url}
            target="_blank"
            rel="noreferrer"
            className={styles.repoLink}
            onClick={(e) => e.stopPropagation()}
          >
            View source ↗
          </a>
        )}
      </div>
    </article>
  );
}
