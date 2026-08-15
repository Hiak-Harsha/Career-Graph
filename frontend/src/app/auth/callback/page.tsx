"use client";

import { useEffect, useState, useRef, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { API_BASE } from "../../../config";

function AuthCallbackHandler() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [status, setStatus] = useState("Exchanging authorization code...");
  const [error, setError] = useState("");
  const exchanged = useRef(false);

  useEffect(() => {
    if (exchanged.current) return;
    const code = searchParams.get("code");

    if (!code) {
      setError("No authorization code found in URL.");
      return;
    }

    exchanged.current = true;
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
        // Save token to localStorage
        if (typeof window !== "undefined") {
          window.localStorage.setItem("career-identity-access-token", data.access_token);
        }

        setStatus("Authentication successful! Redirecting to dashboard...");
        setTimeout(() => {
          router.push("/");
        }, 1000);
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : "OAuth code exchange failed.";
        setError(msg);
      }
    };

    exchangeCode();
  }, [searchParams, router]);

  return (
    <div style={{
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center",
      minHeight: "100vh",
      background: "#06080F",
      color: "#F8FAFC",
      fontFamily: "var(--font-body)",
      padding: "2rem",
      textAlign: "center"
    }}>
      <h2 style={{ fontFamily: "var(--font-display)", fontSize: "1.5rem", marginBottom: "1rem" }}>
        Connecting GitHub Account
      </h2>
      {error ? (
        <div style={{
          padding: "1rem",
          background: "rgba(239, 68, 68, 0.1)",
          border: "1px solid rgba(239, 68, 68, 0.2)",
          color: "#EF4444",
          borderRadius: "12px",
          maxWidth: "400px",
          lineHeight: "1.5"
        }}>
          <p style={{ fontWeight: 600, marginBottom: "0.5rem" }}>Authentication Error</p>
          <p style={{ fontSize: "0.875rem" }}>{error}</p>
          <button
            type="button"
            className="btn btn-secondary"
            style={{ marginTop: "1rem", padding: "0.5rem 1.25rem", fontSize: "0.8rem" }}
            onClick={() => router.push("/")}
          >
            Return to Dashboard
          </button>
        </div>
      ) : (
        <p style={{ color: "#94A3B8", fontSize: "0.95rem" }}>{status}</p>
      )}
    </div>
  );
}

export default function AuthCallbackPage() {
  return (
    <Suspense fallback={
      <div style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        minHeight: "100vh",
        background: "#06080F",
        color: "#94A3B8",
        fontFamily: "var(--font-body)"
      }}>
        Loading callback...
      </div>
    }>
      <AuthCallbackHandler />
    </Suspense>
  );
}
