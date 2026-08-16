"use client";

import { useEffect, useState, useRef, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { API_BASE } from "../../../config";
import styles from "./callback.module.css";
import { Loader2, AlertCircle, ArrowLeft } from "lucide-react";
import { GithubIcon } from "../../../components/ui/icons/GithubIcon";

function AuthCallbackHandler() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const code = searchParams.get("code");
  const [status, setStatus] = useState("Exchanging authorization code...");
  const [error, setError] = useState(code ? "" : "No authorization code found in URL.");
  const exchanged = useRef(false);

  useEffect(() => {
    if (!code || exchanged.current) return;
    exchanged.current = true;
    let timer: NodeJS.Timeout | undefined;

    const exchangeCode = async () => {
      try {
        const response = await fetch(`${API_BASE}/auth/github`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ code }),
        });

        if (!response.ok) {
          const body = await response.json().catch(() => ({}));
          throw new Error(body.detail || "Authentication failed.");
        }

        const data = await response.json();
        if (typeof window !== "undefined") {
          window.localStorage.setItem("career-identity-access-token", data.access_token);
        }

        setStatus("Authentication successful! Redirecting to dashboard...");
        timer = setTimeout(() => {
          router.push("/");
        }, 1000);
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : "OAuth code exchange failed.";
        setError(msg);
      }
    };

    void exchangeCode();

    return () => {
      if (timer) clearTimeout(timer);
    };
  }, [code, router]);

  return (
    <div className={styles.container}>
      <div className={`${styles.card} surface`}>
        <div className={styles.iconWrap}>
          <GithubIcon size={36} />
        </div>
        <h2 className={styles.title}>Connecting GitHub</h2>
        {error ? (
          <div className={styles.errorBox}>
            <div className={styles.errorHeader}>
              <AlertCircle size={16} />
              <p className={styles.errorTitle}>Authentication Error</p>
            </div>
            <p className={styles.errorMsg}>{error}</p>
            <button
              type="button"
              className={`btn btn-secondary ${styles.returnBtn}`}
              onClick={() => router.push("/")}
            >
              <ArrowLeft size={14} />
              <span>Return to Dashboard</span>
            </button>
          </div>
        ) : (
          <div className={styles.statusGroup}>
            <Loader2 size={20} className="animate-spin" color="var(--accent)" />
            <p className={styles.statusText}>{status}</p>
          </div>
        )}
      </div>
    </div>
  );
}

export default function AuthCallbackPage() {
  return (
    <Suspense
      fallback={
        <div className={styles.loadingFallback}>
          <Loader2 size={24} className="animate-spin" color="var(--accent)" />
        </div>
      }
    >
      <AuthCallbackHandler />
    </Suspense>
  );
}
