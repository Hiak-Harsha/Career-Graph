import { render, screen, fireEvent, waitFor, act } from "@testing-library/react";
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
      block_type: "positioning",
      title: "Positioning",
      order: 2,
      content_payload: {
        statement: "AI/ML engineer focused on intelligent systems with strong algorithmic foundations.",
        evidence_strength: "High",
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
    {
      block_type: "certifications",
      title: "Certifications",
      order: 9,
      content_payload: {
        certifications: [
          {
            name: "Deep Learning Specialization",
            issuer: "DeepLearning.AI",
            issue_date: "2025",
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

  it("renders resume candidate identity, verified badge, selected work, and certifications", async () => {
    await act(async () => {
      render(<ResumeView resumeData={mockResume} initialRole="AI / ML Engineer" />);
    });

    expect(await screen.findByText("Alex Rivera")).toBeInTheDocument();
    expect(screen.getByText(/Verified Career Graph/i)).toBeInTheDocument();
    expect(await screen.findByText("Core Platform")).toBeInTheDocument();
    expect(await screen.findByText("Deep Learning Specialization")).toBeInTheDocument();
  });

  it("switches visual personality layout", async () => {
    await act(async () => {
      render(<ResumeView resumeData={mockResume} initialRole="AI / ML Engineer" />);
    });
    await screen.findByText("Alex Rivera");

    const techBtn = screen.getByRole("button", { name: "Technical" });
    await act(async () => {
      fireEvent.click(techBtn);
    });

    await waitFor(() => {
      expect(techBtn).toHaveClass("personalityBtnActive");
    });
  });

  it("calls onRoleChange when role dropdown value changes", async () => {
    const handleRoleChange = vi.fn();
    await act(async () => {
      render(
        <ResumeView
          resumeData={mockResume}
          initialRole="AI / ML Engineer"
          onRoleChange={handleRoleChange}
        />
      );
    });
    await screen.findByText("Alex Rivera");

    const select = screen.getByLabelText(/Select target role/i);
    await act(async () => {
      fireEvent.change(select, { target: { value: "Backend Systems Engineer" } });
    });

    await waitFor(() => {
      expect(handleRoleChange).toHaveBeenCalledWith("Backend Systems Engineer");
    });
  });

  it("toggles edit mode and calls onSave when save button is clicked", async () => {
    const handleSave = vi.fn().mockResolvedValue({ status: "success" });
    await act(async () => {
      render(
        <ResumeView
          resumeData={mockResume}
          initialRole="AI / ML Engineer"
          onSave={handleSave}
        />
      );
    });
    await screen.findByText("Alex Rivera");

    const editBtn = screen.getByRole("button", { name: /Edit Resume/i });
    await act(async () => {
      fireEvent.click(editBtn);
    });

    const saveBtn = await screen.findByRole("button", { name: /Save Changes/i });
    await act(async () => {
      fireEvent.click(saveBtn);
    });

    await waitFor(() => {
      expect(handleSave).toHaveBeenCalledWith(
        expect.objectContaining({
          target_role: "AI / ML Engineer",
        })
      );
    });
  });
});
