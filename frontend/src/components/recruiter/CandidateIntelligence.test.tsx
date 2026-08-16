import React from "react";
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { CandidateIntelligence } from "./CandidateIntelligence";
import type { RecruiterData } from "../../types";

const mockRecruiterData: RecruiterData = {
  candidate_name: "Alex Rivera",
  role_name: "Backend Engineer",
  overall_match: "Strong Match",
  why_text: "Demonstrates deep expertise in high-concurrency systems.",
  strengths: ["Rust", "Distributed Consensus"],
  gaps: ["GraphQL", "Frontend Architecture"],
  criteria_matches: [
    {
      item_name: "Distributed Systems Architecture",
      type: "SKILL",
      status: "strong",
      details: "Designed Raft consensus engine with verifiable git commits",
    },
    {
      item_name: "GraphQL API Design",
      type: "SKILL",
      status: "missing",
      details: "No direct evidence detected in analyzed repositories.",
    },
  ],
  evidence_backed_claims: [
    {
      id: "claim-1",
      claim: "Implemented Raft consensus in Rust",
      confidence: 0.95,
      evidence: [],
    },
  ],
};

describe("CandidateIntelligence Component", () => {
  it("renders candidate name, role selector, and criteria analysis", () => {
    const handleRoleChange = vi.fn();
    render(
      <CandidateIntelligence
        recruiterData={mockRecruiterData}
        loading={false}
        selectedRole="Backend Engineer"
        onRoleChange={handleRoleChange}
      />
    );

    expect(screen.getByText("Candidate Intelligence")).toBeInTheDocument();
    expect(screen.getByText("Alex Rivera")).toBeInTheDocument();
    expect(screen.getByText("Distributed Systems Architecture")).toBeInTheDocument();
    expect(screen.getByText("GraphQL API Design")).toBeInTheDocument();
    expect(screen.getByText("Demonstrated strengths")).toBeInTheDocument();
  });

  it("triggers role selector change callback", () => {
    const handleRoleChange = vi.fn();
    render(
      <CandidateIntelligence
        recruiterData={mockRecruiterData}
        loading={false}
        selectedRole="Backend Engineer"
        onRoleChange={handleRoleChange}
      />
    );

    const select = screen.getByLabelText(/Target Role/i);
    fireEvent.change(select, { target: { value: "Machine Learning Engineer" } });
    expect(handleRoleChange).toHaveBeenCalledWith("Machine Learning Engineer");
  });

  it("opens proof drawer when evidence claim is clicked", () => {
    render(
      <CandidateIntelligence
        recruiterData={mockRecruiterData}
        loading={false}
        selectedRole="Backend Engineer"
        onRoleChange={vi.fn()}
      />
    );

    const claimBtn = screen.getByText(/Implemented Raft consensus in Rust/i);
    fireEvent.click(claimBtn);
    expect(screen.getByRole("complementary", { name: /Evidence proof chain/i })).toBeInTheDocument();
  });
});
