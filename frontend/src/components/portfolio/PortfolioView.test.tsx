import React from "react";
import { describe, it, expect } from "vitest";
import { render, screen, fireEvent, act } from "@testing-library/react";
import { PortfolioView } from "./PortfolioView";
import type { PortfolioData } from "../../types";

const mockPortfolio: PortfolioData = {
  profile: {
    id: "user-1",
    name: "Alex Rivera",
    email: "alex@example.com",
    github_username: "alexrivera",
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
  work_experiences: [
    {
      id: "w1",
      user_id: "user-1",
      company: "Stripe",
      role: "Staff Engineer",
      start_date: "2022",
      end_date: "Present",
      description: "Core ledger reliability engineering.",
      bullets: ["Architected multi-region consensus", "Reduced sync p99 latency"],
    },
  ],
  educations: [
    {
      id: "e1",
      user_id: "user-1",
      institution: "UC Berkeley",
      degree: "B.S. Computer Science",
      start_year: "2018",
      end_year: "2022",
      grade_or_gpa: "3.9 GPA",
    },
  ],
  certifications: [
    {
      id: "c1",
      user_id: "user-1",
      name: "AWS Certified Solutions Architect",
      issuer: "Amazon Web Services",
      issue_date: "2024",
    },
  ],
  social_links: [
    {
      id: "l1",
      user_id: "user-1",
      platform: "github",
      url: "https://github.com/alexrivera",
      label: "GitHub Profile",
    },
  ],
};

describe("PortfolioView Component", () => {
  it("renders profile header, headline, verified badge, and social link", () => {
    render(<PortfolioView portfolioData={mockPortfolio} loading={false} />);

    expect(screen.getByText("Alex Rivera")).toBeInTheDocument();
    expect(
      screen.getByText("Distributed Systems & Machine Learning Engineer")
    ).toBeInTheDocument();
    expect(screen.getByText(/Graph Verified/i)).toBeInTheDocument();
    expect(screen.getByText("GitHub Profile")).toBeInTheDocument();
  });

  it("renders verified project case studies with claims and skills", () => {
    render(<PortfolioView portfolioData={mockPortfolio} loading={false} />);

    expect(screen.getByText("Consensus Engine")).toBeInTheDocument();
    expect(screen.getByText("Raft consensus implementation in Rust")).toBeInTheDocument();
    expect(screen.getByText("Achieved 100k ops/sec cluster throughput")).toBeInTheDocument();
    expect(screen.getAllByText("Rust").length).toBeGreaterThan(0);
  });

  it("renders professional experience and education sections", () => {
    render(<PortfolioView portfolioData={mockPortfolio} loading={false} />);

    expect(screen.getByText("Staff Engineer")).toBeInTheDocument();
    expect(screen.getByText("@ Stripe")).toBeInTheDocument();
    expect(screen.getByText("Architected multi-region consensus")).toBeInTheDocument();

    expect(screen.getByText("B.S. Computer Science")).toBeInTheDocument();
    expect(screen.getByText("UC Berkeley")).toBeInTheDocument();
    expect(screen.getByText("AWS Certified Solutions Architect")).toBeInTheDocument();
  });

  it("triggers public link copy to clipboard", async () => {
    render(<PortfolioView portfolioData={mockPortfolio} loading={false} />);

    const shareBtn = screen.getByRole("button", { name: /share living portfolio/i });
    await act(async () => {
      fireEvent.click(shareBtn);
    });

    expect(navigator.clipboard.writeText).toHaveBeenCalledWith(
      expect.stringContaining("/p/alexrivera")
    );
  });
});
