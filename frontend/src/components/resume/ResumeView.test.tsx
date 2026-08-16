import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { ResumeView } from "./ResumeView";
import type { ResumeData } from "../../types";

vi.mock("../../config", () => ({
  apiFetch: vi.fn(),
}));

import { apiFetch } from "../../config";

const mockResume: ResumeData = {
  profile: {
    id: "u1",
    name: "Alex Rivera",
    email: "alex@example.com",
    github_username: "alexrivera",
    created_at: "2026-01-01",
    updated_at: "2026-01-01",
  },
  target_role: "AI / ML Engineer",
  summary: "Full stack engineer building high scale apps.",
  projects: [
    {
      id: "p1",
      title: "Core Platform",
      narrative: "Designed core graph database layer.",
      evidence_links: [{ label: "Commit #1", url: "https://github.com/repo/1" }],
      selected_reasons: ["Strong match for backend architecture"],
    },
  ],
  claims: ["Scalable caching layer"],
  skills: ["FastAPI", "Next.js"],
  evidence_coverage: 0.9,
};

const mockBlockRep = {
  target_role: "AI / ML Engineer",
  layout_personality: "modern_professional",
  positioning_statement: "AI/ML engineer focused on intelligent systems with strong algorithmic foundations.",
  blocks: [
    {
      block_type: "identity",
      title: "Identity",
      order: 1,
      content_payload: {
        name: "Alex Rivera",
        headline: "AI / ML ENGINEER · INTELLIGENT SYSTEMS",
        email: "alex@example.com",
        location: "Bangalore, India",
        github: "alexrivera",
      },
    },
    {
      block_type: "selected_work",
      title: "Selected Work",
      order: 4,
      content_payload: {
        projects: [
          {
            id: "p1",
            title: "Core Platform",
            description: "Designed core graph database layer.",
            technologies: ["Python", "FastAPI"],
            evidence_claims: [
              {
                id: "c1",
                claim: "Scalable caching layer",
                confidence: 1.0,
                type: "SYSTEM",
              },
            ],
          },
        ],
      },
    },
    {
      block_type: "technical_depth",
      title: "Technical Depth",
      order: 5,
      content_payload: {
        clusters: [
          {
            domain: "AI / ML",
            capabilities: "Classification · NLP · Evaluation",
            evidence_note: "4 projects · verified",
          },
        ],
      },
    },
  ],
};

describe("ResumeView Component", () => {
  beforeEach(() => {
    vi.mocked(apiFetch).mockResolvedValue({
      ok: true,
      json: async () => mockBlockRep,
    } as unknown as Response);
  });

  it("renders resume candidate identity, verified badge, and selected work", async () => {
    render(<ResumeView resumeData={mockResume} initialRole="AI / ML Engineer" />);

    expect(await screen.findByText("Alex Rivera")).toBeInTheDocument();
    expect(screen.getByText(/Verified Career Graph/i)).toBeInTheDocument();
    expect(await screen.findByText("Core Platform")).toBeInTheDocument();
  });

  it("switches visual personality layout", () => {
    render(<ResumeView resumeData={mockResume} initialRole="AI / ML Engineer" />);

    const techBtn = screen.getByRole("button", { name: "Technical" });
    fireEvent.click(techBtn);

    expect(techBtn).toHaveClass("personalityBtnActive");
  });

  it("calls onRoleChange when role dropdown value changes", () => {
    const handleRoleChange = vi.fn();
    render(
      <ResumeView
        resumeData={mockResume}
        initialRole="AI / ML Engineer"
        onRoleChange={handleRoleChange}
      />
    );

    const select = screen.getByLabelText(/Select target role/i);
    fireEvent.change(select, { target: { value: "Backend Systems Engineer" } });

    expect(handleRoleChange).toHaveBeenCalledWith("Backend Systems Engineer");
  });
});
