"use client";

import React, { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { API_BASE } from "../../../config";
import type { PortfolioData } from "../../../types";
import { PortfolioView } from "../../../components/portfolio/PortfolioView";
import { Network, Loader2, ArrowLeft, Zap, Globe, ShieldCheck, ExternalLink, Code2, ArrowRight } from "lucide-react";
import Link from "next/link";

export default function PublicPortfolioPage() {
  const params = useParams();
  const username = (params?.username as string) || "demo";
  const [data, setData] = useState<PortfolioData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [recruiterSkimMode, setRecruiterSkimMode] = useState(false);

  useEffect(() => {
    async function loadPublic() {
      try {
        setLoading(true);
        setError("");
        const res = await fetch(`${API_BASE}/portfolio/public/${encodeURIComponent(username)}`);
        if (!res.ok) {
          throw new Error("Portfolio not found for this username or identifier.");
        }
        const portfolioJson: PortfolioData = await res.json();
        setData(portfolioJson);

        // Update dynamic page title
        if (portfolioJson.profile?.name) {
          document.title = `${portfolioJson.profile.name} — Verified Career Graph & Portfolio`;
        }
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : "Unable to load public portfolio.");
      } finally {
        setLoading(false);
      }
    }
    void loadPublic();
  }, [username]);

  return (
    <div style={{ minHeight: "100vh", background: "var(--surface-base, #0b1120)", color: "var(--text-primary, #f8fafc)" }}>
      {/* Top Banner Navigation */}
      <nav
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "14px 28px",
          borderBottom: "1px solid var(--border-subtle, #334155)",
          background: "rgba(15, 23, 42, 0.8)",
          backdropFilter: "blur(12px)",
          position: "sticky",
          top: 0,
          zIndex: 100,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "1.2rem" }}>
          <Link
            href="/"
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 8,
              color: "var(--text-primary, #f8fafc)",
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
                background: "var(--accent-primary, #38bdf8)",
                color: "#0f172a",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Network size={16} />
            </div>
            <span>Career Graph</span>
          </Link>

          {data && (
            <div style={{ display: "flex", background: "rgba(30, 41, 59, 0.6)", borderRadius: 6, padding: 3, gap: 2, border: "1px solid var(--border-subtle, #334155)" }}>
              <button
                type="button"
                onClick={() => setRecruiterSkimMode(false)}
                style={{
                  background: !recruiterSkimMode ? "var(--accent-primary, #38bdf8)" : "transparent",
                  color: !recruiterSkimMode ? "#0f172a" : "var(--text-muted, #94a3b8)",
                  border: "none",
                  padding: "4px 10px",
                  borderRadius: 4,
                  fontSize: 12,
                  fontWeight: 600,
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: 4,
                  transition: "all 0.2s ease",
                }}
              >
                <Globe size={12} />
                <span>Full Portfolio</span>
              </button>
              <button
                type="button"
                onClick={() => setRecruiterSkimMode(true)}
                style={{
                  background: recruiterSkimMode ? "var(--accent-primary, #38bdf8)" : "transparent",
                  color: recruiterSkimMode ? "#0f172a" : "var(--text-muted, #94a3b8)",
                  border: "none",
                  padding: "4px 10px",
                  borderRadius: 4,
                  fontSize: 12,
                  fontWeight: 600,
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: 4,
                  transition: "all 0.2s ease",
                }}
              >
                <Zap size={12} />
                <span>15s Recruiter Skim</span>
              </button>
            </div>
          )}
        </div>

        <Link
          href="/"
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 6,
            fontSize: 12,
            fontWeight: 600,
            color: "var(--text-muted, #94a3b8)",
            textDecoration: "none",
            padding: "6px 12px",
            borderRadius: 6,
            border: "1px solid var(--border-subtle, #334155)",
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
            color: "var(--text-muted, #94a3b8)",
            gap: 12,
          }}
        >
          <Loader2 size={32} className="animate-spin" color="var(--accent-primary, #38bdf8)" />
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
            background: "var(--bg-surface, #0f172a)",
            border: "1px solid var(--border-subtle, #334155)",
            borderRadius: 12,
          }}
        >
          <h2 style={{ color: "var(--text-primary, #f8fafc)", fontSize: 20, marginBottom: 8 }}>
            Portfolio Not Found
          </h2>
          <p style={{ color: "var(--text-muted, #94a3b8)", fontSize: 14, marginBottom: 20 }}>
            {error}
          </p>
          <Link
            href="/"
            style={{
              display: "inline-block",
              padding: "8px 16px",
              background: "var(--accent-primary, #38bdf8)",
              color: "#0f172a",
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

      {data && !loading && (
        recruiterSkimMode ? (
          /* 15-Second Recruiter Fast Skim View */
          <div style={{ maxWidth: 840, margin: "2rem auto", padding: "0 1.5rem" }}>
            <div
              style={{
                background: "rgba(15, 23, 42, 0.7)",
                border: "1px solid var(--border-subtle, #334155)",
                borderRadius: 12,
                padding: "2rem",
                display: "flex",
                flexDirection: "column",
                gap: "1.5rem",
                boxShadow: "0 10px 25px -5px rgba(0, 0, 0, 0.3)",
              }}
            >
              {/* Header */}
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "1rem" }}>
                <div>
                  <div style={{ display: "flex", alignItems: "center", gap: "0.6rem" }}>
                    <h1 style={{ fontSize: "1.6rem", fontWeight: 700, margin: 0 }}>{data.profile.name}</h1>
                    <span style={{ display: "inline-flex", alignItems: "center", gap: 4, background: "rgba(56, 189, 248, 0.15)", color: "#38bdf8", padding: "2px 8px", borderRadius: 12, fontSize: 11, fontWeight: 600 }}>
                      <ShieldCheck size={12} /> Verified
                    </span>
                  </div>
                  <p style={{ color: "#94a3b8", fontSize: "1rem", marginTop: "0.25rem", marginBottom: 0 }}>
                    {data.profile.headline || "Software & AI Systems Engineer"}
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => setRecruiterSkimMode(false)}
                  style={{
                    background: "transparent",
                    border: "1px solid var(--accent-primary, #38bdf8)",
                    color: "var(--accent-primary, #38bdf8)",
                    padding: "6px 12px",
                    borderRadius: 6,
                    fontSize: 12,
                    fontWeight: 600,
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    gap: 4,
                  }}
                >
                  <span>View Full Details</span>
                  <ArrowRight size={12} />
                </button>
              </div>

              {/* Core Competencies Cloud */}
              <div>
                <h3 style={{ fontSize: "0.85rem", textTransform: "uppercase", letterSpacing: "0.05em", color: "#94a3b8", marginBottom: "0.6rem" }}>
                  Verified Competencies & Domains
                </h3>
                <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem" }}>
                  {data.domain_progress.map((dp) => (
                    <span
                      key={dp.id}
                      style={{
                        background: "rgba(30, 41, 59, 0.8)",
                        border: "1px solid rgba(56, 189, 248, 0.3)",
                        color: "#f8fafc",
                        padding: "4px 10px",
                        borderRadius: 6,
                        fontSize: 12,
                        fontWeight: 500,
                      }}
                    >
                      {dp.domain.name} · {dp.current_level}
                    </span>
                  ))}
                  {data.skills.slice(0, 6).map((sp) => (
                    <span
                      key={sp.id}
                      style={{
                        background: "rgba(30, 41, 59, 0.5)",
                        border: "1px solid rgba(148, 163, 184, 0.2)",
                        color: "#94a3b8",
                        padding: "4px 8px",
                        borderRadius: 6,
                        fontSize: 12,
                      }}
                    >
                      {sp.skill.name} ({sp.evidence_count} verified)
                    </span>
                  ))}
                </div>
              </div>

              {/* Top Verified Projects */}
              <div>
                <h3 style={{ fontSize: "0.85rem", textTransform: "uppercase", letterSpacing: "0.05em", color: "#94a3b8", marginBottom: "0.6rem" }}>
                  Top Verified Systems ({data.projects.length} Total)
                </h3>
                <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
                  {data.projects.slice(0, 3).map((p) => (
                    <div
                      key={p.id}
                      style={{
                        background: "rgba(30, 41, 59, 0.5)",
                        border: "1px solid var(--border-subtle, #334155)",
                        borderRadius: 8,
                        padding: "0.9rem 1.1rem",
                      }}
                    >
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                        <h4 style={{ fontSize: "0.95rem", fontWeight: 600, margin: 0, color: "#f8fafc" }}>
                          {p.title}
                        </h4>
                        {p.repository_url && (
                          <a
                            href={p.repository_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            style={{ color: "#38bdf8", display: "flex", alignItems: "center", gap: 3, fontSize: 12, textDecoration: "none" }}
                          >
                            <Code2 size={12} />
                            <span>Repository</span>
                            <ExternalLink size={10} />
                          </a>
                        )}
                      </div>
                      <p style={{ fontSize: "0.85rem", color: "#94a3b8", margin: "0.4rem 0 0" }}>
                        {p.description}
                      </p>
                      {p.claims && p.claims.length > 0 && (
                        <div style={{ marginTop: "0.4rem", fontSize: "0.8rem", color: "#38bdf8", fontStyle: "italic" }}>
                          &ldquo;{p.claims[0].claim}&rdquo;
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        ) : (
          <PortfolioView portfolioData={data} loading={false} isPublic={true} />
        )
      )}
    </div>
  );
}
