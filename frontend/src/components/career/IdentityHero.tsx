import styles from "./IdentityHero.module.css";
import type { DomainProgress, UserProfile } from "../../types";

interface IdentityHeroProps {
  profile: UserProfile | null;
  domainProgress: DomainProgress[];
  lastUpdated: Date | null;
}

function formatRelativeTime(date: Date): string {
  const seconds = Math.floor((Date.now() - date.getTime()) / 1000);
  if (seconds < 60) return "just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes} minutes ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} hours ago`;
  return `${Math.floor(hours / 24)} days ago`;
}

export function IdentityHero({ profile, domainProgress, lastUpdated }: IdentityHeroProps) {
  // Take top 3 strongest domains as primary identity pillars
  const primaryDomains = [...domainProgress]
    .sort((a, b) => b.exposure_score + b.depth_score - (a.exposure_score + a.depth_score))
    .slice(0, 3);

  const userName = profile?.name?.split(" ")[0] ?? "your";

  return (
    <section className={styles.hero} aria-label="Professional identity">
      <div className={styles.eyebrow}>
        <span className="section-label">Your Professional Identity</span>
      </div>

      {primaryDomains.length > 0 ? (
        <>
          <div className={styles.domains}>
            {primaryDomains.map((dp, i) => (
              <span key={dp.domain.id ?? i} className={styles.domainPill}>
                {dp.domain.name}
              </span>
            ))}
          </div>

          <p className={styles.narrative}>
            {userName}&apos;s recent work is increasingly concentrated around{" "}
            <strong>
              {primaryDomains.map((d) => d.domain.name.toLowerCase()).join(", ")}
            </strong>
            .
          </p>
        </>
      ) : (
        <p className={styles.narrative} style={{ color: "var(--text-muted)" }}>
          Connect GitHub to build your professional identity.
        </p>
      )}

      {lastUpdated && (
        <span className={styles.updatedAt}>
          Updated {formatRelativeTime(lastUpdated)}
        </span>
      )}
    </section>
  );
}
