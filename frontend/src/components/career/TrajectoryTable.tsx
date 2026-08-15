import styles from "./TrajectoryTable.module.css";
import type { DomainProgress } from "../../types";
import { ArrowRight, TrendingUp, TrendingDown, Minus } from "lucide-react";

interface TrajectoryTableProps {
  domainProgress: DomainProgress[];
  onViewAll?: () => void;
}

function getTrajectoryBadge(trajectory: string) {
  switch (trajectory) {
    case "INCREASING":
      return (
        <span className={`${styles.traj} traj-up`}>
          <TrendingUp size={12} />
          <span>Growing</span>
        </span>
      );
    case "DECREASING":
      return (
        <span className={`${styles.traj} traj-down`}>
          <TrendingDown size={12} />
          <span>Declining</span>
        </span>
      );
    default:
      return (
        <span className={`${styles.traj} traj-stable`}>
          <Minus size={12} />
          <span>Stable</span>
        </span>
      );
  }
}

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
            <span>Explore domains</span>
            <ArrowRight size={13} />
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
                <td>{getTrajectoryBadge(dp.trajectory)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
