import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import { ResumeView } from "./ResumeView";
import type { ResumeData } from "../../types";

const mockResume: ResumeData = {
  profile: {
    id: "u1",
    name: "Alex Rivera",
    email: "alex@example.com",
    github_username: "alexrivera",
    created_at: "2026-01-01",
    updated_at: "2026-01-01",
  },
  target_role: "Software Engineer",
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

describe("ResumeView Component", () => {
  it("renders resume header, summary, projects, and skills", () => {
    render(
      <ResumeView
        resumeData={mockResume}
        loading={false}
        selectedRole="Software Engineer"
        onRoleChange={vi.fn()}
      />
    );

    expect(screen.getByText("Alex Rivera")).toBeInTheDocument();
    expect(screen.getByText("Core Platform")).toBeInTheDocument();
    expect(screen.getByText("Scalable caching layer")).toBeInTheDocument();
    expect(screen.getByText("FastAPI")).toBeInTheDocument();
  });

  it("toggles Evidence View and reveals citation chips", () => {
    render(
      <ResumeView
        resumeData={mockResume}
        loading={false}
        selectedRole="Software Engineer"
        onRoleChange={vi.fn()}
      />
    );

    const evidenceToggleBtn = screen.getByText("Evidence View");
    fireEvent.click(evidenceToggleBtn);

    expect(screen.getByText("Proof #1")).toBeInTheDocument();
    expect(screen.getByText("[1]")).toBeInTheDocument();
  });

  it("calls onRoleChange when role dropdown value changes", () => {
    const onRoleChange = vi.fn();
    render(
      <ResumeView
        resumeData={mockResume}
        loading={false}
        selectedRole="Software Engineer"
        onRoleChange={onRoleChange}
      />
    );

    const select = screen.getByRole("combobox");
    fireEvent.change(select, { target: { value: "Machine Learning Engineer" } });

    expect(onRoleChange).toHaveBeenCalledWith("Machine Learning Engineer");
  });
});
