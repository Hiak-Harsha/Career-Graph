import styles from "./TrajectoryTable.module.css";
import type { DomainProgress } from "../../types";

interface TrajectoryTableProps {
  domainProgress: DomainProgress[];
  onViewAll?: () => void;
}

const TRAJECTORY_LABEL: Record<string, string> = {
  INCREASING: "↑ Growing",
  STABLE:     "→ Stable",
  DECREASING: "↓ Declining",
};

const TRAJECTORY_CLASS: Record<string, string> = {
  INCREASING: "traj-up",
  STABLE:     "traj-stable",
  DECREASING: "traj-down",
};

const LEVEL_DISPLAY: Record<string, string> = {
  EXPOSURE:   "Exposure",
  PRACTICING: "Practicing",
  DEVELOPING: "Developing",
  PROFICIENT: "Proficient",
  STRONG:     "Strong",
  ADVANCED:   "Advanced",
};

export function TrajectoryTable({ domainProgress, onViewAll }: TrajectoryTableProps) {
  const sorted = [...domainProgress]
    .sort((a, b) => b.exposure_score + b.depth_score - (a.exposure_score + a.depth_score))
    .slice(0, 6);

  return (
    <div className={styles.card}>
      <div className={styles.header}>
        <span className="section-label">Professional Trajectory</span>
        {onViewAll && (
          <button className={`btn btn-ghost ${styles.viewAll}`} onClick={onViewAll} type="button">
            Explore domains →
          </button>
        )}
      </div>

      {sorted.length === 0 ? (
        <p className={styles.empty}>No domains detected yet.</p>
      ) : (
        <table className={styles.table} aria-label="Domain trajectory">
          <thead>
            <tr>
              <th>Domain</th>
              <th>Level</th>
              <th>Trajectory</th>
            </tr>
          </thead>
          <tbody>
            {sorted.map((dp) => (
              <tr key={dp.domain.id ?? dp.domain.name}>
                <td className={styles.domainName}>{dp.domain.name}</td>
                <td className={styles.level}>
                  {LEVEL_DISPLAY[dp.current_level] ?? dp.current_level}
                </td>
                <td>
                  <span className={`${styles.traj} ${TRAJECTORY_CLASS[dp.trajectory] ?? ""}`}>
                    {TRAJECTORY_LABEL[dp.trajectory] ?? dp.trajectory}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
