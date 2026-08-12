import styles from "./components.module.css";

export function SkillBadge({ name }: { name: string }) {
  return <span className={styles.tag}>{name}</span>;
}
