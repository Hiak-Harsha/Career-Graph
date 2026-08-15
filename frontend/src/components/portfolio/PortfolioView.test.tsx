import React from "react";
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { PortfolioView } from "./PortfolioView";
import type { PortfolioData } from "../../types";

const mockPortfolio: PortfolioData = {
  profile: {
    id: "user-1",
    name: "Alex Rivera",
    email: "alex@example.com",
    headline: "Distributed Systems & Machine Learning Engineer",
    location: "San Francisco, CA",
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  projects: [
    {
      id: "p1",
      title: "Consensus Engine",
      description: "Raft consensus implementation in Rust",
      status: "COMPLETED",
      project_type: "PROFESSIONAL",
      complexity_score: 9.2,
      repository_url: "https://github.com/alexrivera/raft",
      skills: [{ id: "s1", name: "Rust" }, { id: "s2", name: "Distributed Systems" }],
      claims: [
        {
          id: "c1",
          claim: "Achieved 100k ops/sec cluster throughput",
          confidence: 0.98,
          evidence: [],
        },
      ],
    },
  ],
  ideas: [],
  domain_progress: [],
  skills: [
    {
      skill: { id: "s1", name: "Rust", category: "LANGUAGE" },
      evidence_count: 8,
      usage_frequency: 95,
      depth_score: 90,
      recency_score: 95,
      confidence: 0.98,
      trajectory: "INCREASING",
      current_level: "STRONG",
    },
  ],
  problem_solving_profile: {
    frequently_works_with: ["Rust", "Raft", "Distributed Systems"],
    recurring_patterns_detected: ["Consensus Protocol", "High Throughput"],
  },
  timeline: [],
};

describe("PortfolioView Component", () => {
  it("renders profile header, headline, and verified badge", () => {
    render(<PortfolioView portfolioData={mockPortfolio} loading={false} />);

    expect(screen.getByText("Alex Rivera")).toBeInTheDocument();
    expect(
      screen.getByText("Distributed Systems & Machine Learning Engineer")
    ).toBeInTheDocument();
    expect(screen.getByText(/Graph Verified/i)).toBeInTheDocument();
  });

  it("renders verified project cards with complexity score", () => {
    render(<PortfolioView portfolioData={mockPortfolio} loading={false} />);

    expect(screen.getByText("Consensus Engine")).toBeInTheDocument();
    expect(screen.getByText("Raft consensus implementation in Rust")).toBeInTheDocument();
    expect(screen.getByText("Score 9.2/10")).toBeInTheDocument();
    expect(screen.getAllByText("Rust").length).toBeGreaterThan(0);
  });

  it("invokes claim proof inspect on click", () => {
    const handleOpenEvidence = vi.fn();
    render(
      <PortfolioView
        portfolioData={mockPortfolio}
        loading={false}
        onOpenProjectEvidence={handleOpenEvidence}
      />
    );

    const inspectBtn = screen.getByText("Inspect Proof");
    fireEvent.click(inspectBtn);
    expect(handleOpenEvidence).toHaveBeenCalledWith(mockPortfolio.projects[0]);
  });
});
