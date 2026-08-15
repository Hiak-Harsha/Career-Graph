import styles from "./EmergingDomains.module.css";
import type { DomainProgress } from "../../types";

interface EmergingDomainsProps {
  domainProgress: DomainProgress[];
}

export function EmergingDomains({ domainProgress }: EmergingDomainsProps) {
  // Emerging = INCREASING trajectory with low-medium current level
  const emerging = domainProgress.filter(
    (dp) =>
      dp.trajectory === "INCREASING" &&
      ["EXPOSURE", "PRACTICING", "DEVELOPING"].includes(dp.current_level)
  );

  if (emerging.length === 0) return null;

  return (
    <div className={styles.card}>
      <div className={styles.header}>
        <span className="section-label">Emerging</span>
      </div>
      <div className={styles.list}>
        {emerging.slice(0, 4).map((dp) => (
          <div key={dp.domain.id ?? dp.domain.name} className={styles.item}>
            <div className={styles.indicator} aria-hidden="true">↑</div>
            <div className={styles.content}>
              <span className={styles.name}>{dp.domain.name}</span>
              <span className={styles.desc}>
                Detected across recent projects · {dp.current_level.charAt(0) + dp.current_level.slice(1).toLowerCase()}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
