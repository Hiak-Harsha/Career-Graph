import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { ResumeStrategyDrawer } from "./ResumeStrategyDrawer";

vi.mock("../../config", () => ({
  apiFetch: vi.fn(),
}));

import { apiFetch } from "../../config";

const mockIdentity = {
  user_id: "u1",
  candidate_name: "Harsha",
  headline: "AI Engineer",
  primary_domains: ["AI / ML", "Algorithms"],
  emerging_domains: ["Research Engineering"],
  strong_capabilities: ["Python", "FastAPI"],
  current_trajectory: "Specializing in AI / ML.",
  evidence_strength: "High",
  research_orientation: "Increasing",
  project_style: "Technical / Experimental",
  signature_nodes: [],
  signature_edges: [],
  total_verified_claims: 8,
  total_repositories: 4,
};

const mockStrategy = {
  target_role: "AI / ML Engineer",
  candidate_positioning: "AI/ML engineer with strong algorithmic foundations.",
  primary_domains: ["AI / ML", "Algorithms"],
  supporting_domains: ["Research Engineering"],
  projects_to_highlight: ["AI Repository Analyzer", "Fake News Detector"],
  skills_to_emphasize: ["Python", "Machine Learning"],
  evidence_priorities: ["Verified commit history"],
  weak_areas: ["MLOps"],
  suggested_layout: "technical",
  role_alignment_score: 0.95,
};

const mockCritique = {
  target_role: "AI / ML Engineer",
  readiness_dimensions: [
    {
      dimension: "Role Relevance",
      rating: "Strong",
      score: 95,
      insight: "Positioning aligns with role.",
    },
  ],
  overall_readiness: "Strong",
  recruiter_attention_hierarchy: {
    "0_to_3s": "Candidate: Harsha",
    "3_to_8s": "Specialization: AI / ML",
    "8_to_18s": "Built: 4 repositories",
    "18_to_30s": "Trajectory: AI systems",
  },
  fails_to_communicate_gaps: [
    "Your Career Graph shows substantial AI/ML depth.",
  ],
  recommended_improvements: ["Foreground verified proof links."],
};

describe("ResumeStrategyDrawer Component", () => {
  beforeEach(() => {
    vi.mocked(apiFetch).mockImplementation((path) => {
      if (path === "/resume/identity") {
        return Promise.resolve({ ok: true, json: async () => mockIdentity } as Response);
      }
      if (path === "/resume/strategy") {
        return Promise.resolve({ ok: true, json: async () => mockStrategy } as Response);
      }
      if (path === "/resume/critique") {
        return Promise.resolve({ ok: true, json: async () => mockCritique } as Response);
      }
      return Promise.resolve({ ok: true, json: async () => ({}) } as Response);
    });
  });

  it("renders identity model tab by default", async () => {
    render(
      <ResumeStrategyDrawer
        targetRole="AI / ML Engineer"
        personality="modern_professional"
        onClose={vi.fn()}
        onApplyImprovement={vi.fn()}
      />
    );

    expect(screen.getByText("Resume Intelligence Engine")).toBeInTheDocument();
    expect(await screen.findByText("Harsha")).toBeInTheDocument();
    expect(screen.getByText("Specializing in AI / ML.")).toBeInTheDocument();
  });

  it("switches to Strategy tab and displays highlighted projects", async () => {
    render(
      <ResumeStrategyDrawer
        targetRole="AI / ML Engineer"
        personality="modern_professional"
        onClose={vi.fn()}
        onApplyImprovement={vi.fn()}
      />
    );

    fireEvent.click(screen.getByRole("button", { name: /Strategy/i }));

    expect(await screen.findByText("AI Repository Analyzer")).toBeInTheDocument();
    expect(screen.getByText("Fake News Detector")).toBeInTheDocument();
  });

  it("switches to Recruiter Critic and triggers 1-click improve representation", async () => {
    const handleImprove = vi.fn();
    vi.mocked(apiFetch).mockImplementation((path) => {
      if (path === "/resume/improve-representation") {
        return Promise.resolve({
          ok: true,
          json: async () => ({ target_role: "AI / ML Engineer", blocks: [] }),
        } as Response);
      }
      return Promise.resolve({
        ok: true,
        json: async () => mockCritique,
      } as Response);
    });

    render(
      <ResumeStrategyDrawer
        targetRole="AI / ML Engineer"
        personality="modern_professional"
        onClose={vi.fn()}
        onApplyImprovement={handleImprove}
      />
    );

    fireEvent.click(screen.getByRole("button", { name: /Recruiter Critic/i }));

    expect(
      await screen.findByText(/What My Resume Fails to Communicate/i)
    ).toBeInTheDocument();

    const improveBtn = screen.getByRole("button", {
      name: /1-Click Improve Representation/i,
    });
    fireEvent.click(improveBtn);

    await waitFor(() => {
      expect(handleImprove).toHaveBeenCalled();
    });
  });
});
