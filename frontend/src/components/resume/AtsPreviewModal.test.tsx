import { render, screen, fireEvent, act } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import { AtsPreviewModal } from "./AtsPreviewModal";
import type { ResumeData } from "../../types";

const mockResume: ResumeData = {
  profile: {
    id: "u1",
    name: "Alex Rivera",
    email: "alex@example.com",
    github_username: "alexrivera",
    location: "San Francisco, CA",
    created_at: "2026-01-01",
    updated_at: "2026-01-01",
  },
  target_role: "Software Engineer",
  summary: "Experienced full-stack engineer specialized in distributed systems.",
  projects: [
    {
      id: "p1",
      title: "Data Graph Platform",
      narrative: "Built real-time data ingestion pipeline processing 10k events/sec.",
      evidence_links: [{ label: "Commit #a1b2c", url: "https://github.com/alex/repo/commit/1" }],
    },
  ],
  claims: ["Reduced query latency by 45% using Redis caching"],
  skills: ["Python", "TypeScript", "PostgreSQL", "FastAPI"],
  evidence_coverage: 0.88,
  claims_verified: 4,
  total_claims: 5,
};

describe("AtsPreviewModal Component", () => {
  it("renders plain text formatted resume with standard headings", () => {
    render(<AtsPreviewModal resumeData={mockResume} onClose={vi.fn()} />);

    expect(screen.getByText("ATS Plain Text Preview")).toBeInTheDocument();
    expect(screen.getByText(/ALEX RIVERA/)).toBeInTheDocument();
    expect(screen.getByText(/PROFESSIONAL SUMMARY/)).toBeInTheDocument();
    expect(screen.getByText(/TECHNICAL SKILLS/)).toBeInTheDocument();
    expect(screen.getByText(/VERIFIABLE PROJECTS & EXPERIENCE/)).toBeInTheDocument();
  });

  it("triggers clipboard write when copy button is clicked", async () => {
    render(<AtsPreviewModal resumeData={mockResume} onClose={vi.fn()} />);

    const copyBtn = screen.getByRole("button", { name: /copy plain text/i });
    await act(async () => {
      fireEvent.click(copyBtn);
    });

    expect(navigator.clipboard.writeText).toHaveBeenCalled();
  });
});

