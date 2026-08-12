import styles from "./components.module.css";

type SidebarProps = {
  activeView: string;
  setActiveView: (view: string) => void;
  profile: { name?: string; headline?: string } | null;
  syncing: boolean;
  handleGithubSync: () => void;
  handleRunDemoSync: () => void;
};

const views = [
  ["dashboard", "Overview"],
  ["portfolio", "Portfolio"],
  ["review", "Review queue"],
  ["resume", "Resume"],
  ["recruiter", "Recruiter view"],
];

export function Sidebar({ activeView, setActiveView, profile, syncing, handleGithubSync, handleRunDemoSync }: SidebarProps) {
  return <aside className={styles.sidebar} aria-label="Primary navigation">
    <div className={styles.brand}>Career Graph<span>{profile?.headline || "Evidence-led career intelligence"}</span></div>
    <nav className={styles.nav}>{views.map(([id, label]) => <button key={id} type="button" onClick={() => setActiveView(id)} className={`${styles.navButton} ${activeView === id ? styles.navActive : ""}`}>{label}</button>)}</nav>
    <div className={styles.sidebarFooter}>
      <button type="button" className={styles.button} onClick={handleRunDemoSync} disabled={syncing}>{syncing ? "Working…" : "Load demo data"}</button>
      <button type="button" className={`${styles.button} ${styles.secondaryButton}`} onClick={handleGithubSync} disabled={syncing}>Sync GitHub</button>
    </div>
  </aside>;
}
