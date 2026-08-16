"use client";

import React, { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { API_BASE } from "../../../config";
import type { PortfolioData } from "../../../types";
import { PortfolioView } from "../../../components/portfolio/PortfolioView";
import { Network, Loader2, ArrowLeft } from "lucide-react";
import Link from "next/link";

export default function PublicPortfolioPage() {
  const params = useParams();
  const username = (params?.username as string) || "demo";
  const [data, setData] = useState<PortfolioData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function loadPublic() {
      try {
        setLoading(true);
        setError("");
        const res = await fetch(`${API_BASE}/portfolio/public/${encodeURIComponent(username)}`);
        if (!res.ok) {
          throw new Error("Portfolio not found.");
        }
        const portfolioJson: PortfolioData = await res.json();
        setData(portfolioJson);
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : "Unable to load public portfolio.");
      } finally {
        setLoading(false);
      }
    }
    void loadPublic();
  }, [username]);

  return (
    <div style={{ minHeight: "100vh", background: "var(--surface-base)" }}>
      {/* Top Banner */}
      <nav
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "16px 32px",
          borderBottom: "1px solid var(--surface-border)",
          background: "var(--surface-card)",
        }}
      >
        <Link
          href="/"
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 10,
            color: "var(--text-primary)",
            textDecoration: "none",
            fontWeight: 700,
            fontSize: 14,
          }}
        >
          <div
            style={{
              width: 28,
              height: 28,
              borderRadius: 6,
              background: "var(--color-primary)",
              color: "#ffffff",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Network size={16} />
          </div>
          <span>Career Graph</span>
        </Link>

        <Link
          href="/"
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 6,
            fontSize: 12,
            fontWeight: 600,
            color: "var(--text-secondary)",
            textDecoration: "none",
            padding: "6px 12px",
            borderRadius: 6,
            border: "1px solid var(--surface-border)",
          }}
        >
          <ArrowLeft size={12} />
          <span>Open Career Graph App</span>
        </Link>
      </nav>

      {loading && (
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            padding: "120px 20px",
            color: "var(--text-secondary)",
            gap: 12,
          }}
        >
          <Loader2 size={32} className="animate-spin" color="var(--color-primary)" />
          <p>Loading verified public portfolio for @{username}...</p>
        </div>
      )}

      {error && !loading && (
        <div
          style={{
            maxWidth: 600,
            margin: "80px auto",
            padding: "32px",
            textAlign: "center",
            background: "var(--surface-card)",
            border: "1px solid var(--surface-border)",
            borderRadius: 12,
          }}
        >
          <h2 style={{ color: "var(--text-primary)", fontSize: 20, marginBottom: 8 }}>
            Portfolio Not Found
          </h2>
          <p style={{ color: "var(--text-secondary)", fontSize: 14, marginBottom: 20 }}>
            {error}
          </p>
          <Link
            href="/"
            style={{
              display: "inline-block",
              padding: "8px 16px",
              background: "var(--color-primary)",
              color: "#ffffff",
              borderRadius: 6,
              fontSize: 13,
              fontWeight: 600,
              textDecoration: "none",
            }}
          >
            Return to Homepage
          </Link>
        </div>
      )}

      {data && !loading && <PortfolioView portfolioData={data} loading={false} isPublic={true} />}
    </div>
  );
}
