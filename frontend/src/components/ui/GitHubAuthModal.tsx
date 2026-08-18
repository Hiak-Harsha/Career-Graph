"use client";

import React, { useState } from "react";
import styles from "./GitHubAuthModal.module.css";
import { apiFetch } from "../../config";
import { X, Key, Info, ArrowRight, Loader2 } from "lucide-react";
import { GithubIcon } from "./icons/GithubIcon";

interface GitHubAuthModalProps {
  onClose: () => void;
  onSuccess: (msg: string) => void;
  onRefresh: () => Promise<void>;
  defaultUsername?: string;
}

export function GitHubAuthModal({
  onClose,
  onSuccess,
  onRefresh,
  defaultUsername = "",
}: GitHubAuthModalProps) {
  const [activeTab, setActiveTab] = useState<"token" | "oauth">("token");
  const [username, setUsername] = useState(defaultUsername);
  const [token, setToken] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const clientId = process.env.NEXT_PUBLIC_GITHUB_CLIENT_ID || "";

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
          github_username: username.trim(),
          github_access_token: token.trim(),
        }),
      });

      // 2. Trigger sync
      const syncRes = await apiFetch("/sync", { method: "POST" });
      const syncData = await syncRes.json();

      onSuccess(`Successfully authenticated! Synced ${syncData.synced_repositories ?? 0} repositories.`);
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
    if (!clientId) {
      setError("OAuth Client ID is not configured on the server. Please use the Personal Access Token tab.");
      return;
    }
    const redirectUri = encodeURIComponent(`${window.location.origin}/auth/callback`);
    const oauthUrl = `https://github.com/login/oauth/authorize?client_id=${clientId}&redirect_uri=${redirectUri}&scope=repo,user`;
    window.location.href = oauthUrl;
  };

  return (
    <div className={styles.overlay} onClick={onClose} role="dialog" aria-modal="true">
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
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
            onClick={() => {
              setActiveTab("token");
              setError("");
            }}
          >
            <Key size={14} />
            <span>Personal Access Token</span>
          </button>
          <button
            type="button"
            className={`${styles.tab} ${activeTab === "oauth" ? styles.tabActive : ""}`}
            onClick={() => {
              setActiveTab("oauth");
              setError("");
            }}
          >
            <GithubIcon size={14} />
            <span>OAuth Login</span>
          </button>
        </div>

        <div className={styles.body}>
          {error && (
            <div className={styles.error} role="alert">
              {error}
            </div>
          )}

          <div className={styles.onboardingSteps}>
            <div className={styles.stepsTitle}>WHAT HAPPENS AFTER YOU CONNECT</div>
            <div className={styles.stepGrid}>
              <div className={styles.stepItem}><span className={styles.stepNum}>01</span><span>Discover your projects & source files</span></div>
              <div className={styles.stepItem}><span className={styles.stepNum}>02</span><span>Understand what each system actually does</span></div>
              <div className={styles.stepItem}><span className={styles.stepNum}>03</span><span>Identify recurring technical capabilities</span></div>
              <div className={styles.stepItem}><span className={styles.stepNum}>04</span><span>Construct ground-truth career trajectory</span></div>
              <div className={styles.stepItem}><span className={styles.stepNum}>05</span><span>Generate evidence-backed professional profiles</span></div>
              <div className={styles.stepItem}><span className={styles.stepNum}>06</span><span>Keep representation synced as your code evolves</span></div>
            </div>
            <div className={styles.controlNote}>You remain in full control of all public claims & profiles.</div>
          </div>

          {/* Content */}
          {activeTab === "token" ? (
            <form onSubmit={handlePatSubmit} className={styles.form}>
              <div className={styles.field}>
                <label htmlFor="github-username" className={styles.label}>
                  GitHub Username
                </label>
                <input
                  id="github-username"
                  type="text"
                  placeholder="e.g. octocat"
                  className="input-base"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  required
                  disabled={loading}
                  autoComplete="username"
                />
              </div>

              <div className={styles.field}>
                <label htmlFor="github-token" className={styles.label}>
                  Personal Access Token (PAT)
                </label>
                <input
                  id="github-token"
                  type="password"
                  placeholder="ghp_..."
                  className="input-base"
                  value={token}
                  onChange={(e) => setToken(e.target.value)}
                  required
                  disabled={loading}
                  autoComplete="current-password"
                />
                <span className={styles.hint}>
                  Create a token in your GitHub Settings → Developer settings → Personal access tokens with the <code>repo</code> scope.
                </span>
              </div>

              <div className={styles.actions}>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={onClose}
                  disabled={loading}
                >
                  Cancel
                </button>
                <button type="submit" className="btn btn-accent" disabled={loading}>
                  {loading ? (
                    <>
                      <Loader2 size={14} className="animate-spin" />
                      <span>Authenticating & Syncing…</span>
                    </>
                  ) : (
                    <span>Connect & Sync</span>
                  )}
                </button>
              </div>
            </form>
          ) : (
            <div className={styles.oauthContainer}>
              {!clientId ? (
                <div className={styles.oauthNotice}>
                  <div className={styles.oauthNoticeHeader}>
                    <Info size={16} color="#60a5fa" />
                    <span>OAuth Not Configured for this Instance</span>
                  </div>
                  <p className={styles.oauthNoticeText}>
                    Direct GitHub OAuth requires <code>NEXT_PUBLIC_GITHUB_CLIENT_ID</code> and <code>GITHUB_CLIENT_SECRET</code> to be configured in your environment.
                  </p>
                  <p className={styles.oauthNoticeText}>
                    You can immediately connect and sync all your repositories using the <strong>Personal Access Token</strong> tab without setting up an OAuth App.
                  </p>
                  <button
                    type="button"
                    className="btn btn-accent"
                    style={{ alignSelf: "flex-start", marginTop: "4px" }}
                    onClick={() => {
                      setActiveTab("token");
                      setError("");
                    }}
                  >
                    <span>Use Personal Access Token</span>
                    <ArrowRight size={13} />
                  </button>
                </div>
              ) : (
                <>
                  <p className={styles.oauthNoticeText}>
                    Authenticate using GitHub&apos;s secure OAuth flow to index your repositories and synchronize claims.
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
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
