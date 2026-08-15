"use client";

import { useState } from "react";
import styles from "./GitHubAuthModal.module.css";
import { apiFetch } from "../../config";
import { X, Key, Lock, Sparkles } from "lucide-react";
import { GithubIcon } from "./icons/GithubIcon";

interface GitHubAuthModalProps {
  onClose: () => void;
  onSuccess: (msg: string) => void;
  onRefresh: () => Promise<void>;
}

export function GitHubAuthModal({ onClose, onSuccess, onRefresh }: GitHubAuthModalProps) {
  const [activeTab, setActiveTab] = useState<"token" | "oauth">("token");
  const [username, setUsername] = useState("");
  const [token, setToken] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handlePatSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim() || !token.trim()) return;

    try {
      setLoading(true);
      setError("");

      // 1. Save credentials to profile
      await apiFetch("/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          github_username: username,
          github_access_token: token,
        }),
      });

      // 2. Trigger sync
      const syncRes = await apiFetch("/sync", { method: "POST" });
      const syncData = await syncRes.json();

      onSuccess(`Successfully authenticated! Synced ${syncData.synced_repositories} repositories.`);
      await onRefresh();
      onClose();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to connect with token.";
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleOAuthLogin = () => {
    // Redirect to GitHub OAuth using client ID
    const clientId = process.env.NEXT_PUBLIC_GITHUB_CLIENT_ID || "";
    if (!clientId) {
      setError("OAuth Client ID is not configured on the server. Please use the Token tab.");
      return;
    }
    const redirectUri = encodeURIComponent("http://localhost:3000/auth/callback");
    const oauthUrl = `https://github.com/login/oauth/authorize?client_id=${clientId}&redirect_uri=${redirectUri}&scope=repo,user`;
    window.location.href = oauthUrl;
  };

  return (
    <>
      <div className="overlay animate-fade-in" onClick={onClose} aria-hidden="true" />
      <div className={`${styles.modal} surface-elevated animate-fade-in`}>
        {/* Header */}
        <div className={styles.header}>
          <div>
            <h2 className={styles.title}>Connect GitHub</h2>
            <p className={styles.subtitle}>Index your repositories into your career graph</p>
          </div>
          <button type="button" className={styles.closeBtn} onClick={onClose} aria-label="Close">
            <X size={18} />
          </button>
        </div>

        {/* Tabs */}
        <div className={styles.tabs}>
          <button
            type="button"
            className={`${styles.tab} ${activeTab === "token" ? styles.tabActive : ""}`}
            onClick={() => setActiveTab("token")}
          >
            <Key size={14} />
            <span>Personal Access Token</span>
          </button>
          <button
            type="button"
            className={`${styles.tab} ${activeTab === "oauth" ? styles.tabActive : ""}`}
            onClick={() => setActiveTab("oauth")}
          >
            <GithubIcon size={14} />
            <span>OAuth Login</span>
          </button>
        </div>

        {error && <div className={styles.error} role="alert">{error}</div>}

        {/* Content */}
        {activeTab === "token" ? (
          <form onSubmit={handlePatSubmit} className={styles.form}>
            <div className={styles.field}>
              <label htmlFor="github-username" className={styles.label}>GitHub Username</label>
              <input
                id="github-username"
                type="text"
                placeholder="e.g. octocat"
                className="input-base"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
                disabled={loading}
              />
            </div>

            <div className={styles.field}>
              <label htmlFor="github-token" className={styles.label}>Personal Access Token (PAT)</label>
              <input
                id="github-token"
                type="password"
                placeholder="ghp_..."
                className="input-base"
                value={token}
                onChange={(e) => setToken(e.target.value)}
                required
                disabled={loading}
              />
              <span className={styles.hint}>
                Generate a token in your GitHub Settings → Developer Settings → Personal Access Tokens with the <code>repo</code> scope.
              </span>
            </div>

            <div className={styles.actions}>
              <button type="button" className="btn btn-secondary" onClick={onClose} disabled={loading}>
                Cancel
              </button>
              <button type="submit" className="btn btn-accent" disabled={loading}>
                {loading ? "Authenticating & Syncing..." : "Connect & Sync"}
              </button>
            </div>
          </form>
        ) : (
          <div className={styles.oauthContainer}>
            <p className={styles.oauthText}>
              Authenticate using GitHub&apos;s secure OAuth flow. This requires the backend server to be configured with a valid <code>GITHUB_CLIENT_ID</code> and <code>GITHUB_CLIENT_SECRET</code>.
            </p>
            <div className={styles.oauthActions}>
              <button type="button" className="btn btn-secondary" onClick={onClose}>
                Cancel
              </button>
              <button type="button" className="btn btn-primary" onClick={handleOAuthLogin}>
                <GithubIcon size={15} />
                <span>Sign in with GitHub</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
