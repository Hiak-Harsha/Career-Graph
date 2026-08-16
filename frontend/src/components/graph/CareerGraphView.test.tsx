import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import { CareerGraphView } from "./CareerGraphView";
import type { Project, DomainProgress, SkillProgress } from "../../types";

const mockProjects: Project[] = [
  {
    id: "p1",
    title: "Graph Neural Core",
    status: "COMPLETED",
    project_type: "PERSONAL",
    complexity_score: 9.0,
    claims: [{ id: "c1", claim: "High performance parser", confidence: 0.9, evidence: [] }],
    skills: [{ id: "s1", name: "Python" }, { id: "s2", name: "TypeScript" }],
    domains: [{ id: "d1", name: "Web Development" }, { id: "d2", name: "AI / ML" }],
  },
];

const mockDomains: DomainProgress[] = [
  {
    domain: { id: "d1", name: "Web Development" },
    exposure_score: 0.8,
    activity_score: 0.8,
    evidence_score: 0.8,
    depth_score: 0.85,
    recency_score: 0.8,
    current_level: "STRONG",
    trajectory: "INCREASING",
  },
  {
    domain: { id: "d2", name: "AI / ML" },
    exposure_score: 0.9,
    activity_score: 0.9,
    evidence_score: 0.9,
    depth_score: 0.9,
    recency_score: 0.9,
    current_level: "ADVANCED",
    trajectory: "INCREASING",
  },
];

const mockSkills: SkillProgress[] = [
  {
    skill: { id: "s1", name: "Python" },
    evidence_count: 5,
    usage_frequency: 5,
    depth_score: 0.85,
    recency_score: 0.8,
    confidence: 0.9,
    trajectory: "INCREASING",
    current_level: "STRONG",
  },
];

describe("CareerGraphView Component", () => {
  it("renders graph controls, legend, and filter pills", () => {
    render(
      <CareerGraphView
        projects={mockProjects}
        domainProgress={mockDomains}
        skillsProgress={mockSkills}
      />
    );

    expect(screen.getByRole("heading", { name: "Career Graph", level: 1 })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: /all/i })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: /domains/i })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: /skills/i })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: /projects/i })).toBeInTheDocument();
    expect(screen.getAllByText("Domains").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Skills").length).toBeGreaterThan(0);
    expect(screen.getByText("Cross-Domain")).toBeInTheDocument();
  });

  it("updates active filter pill on click", () => {
    render(
      <CareerGraphView
        projects={mockProjects}
        domainProgress={mockDomains}
        skillsProgress={mockSkills}
      />
    );

    const domainsTab = screen.getByRole("tab", { name: /domains/i });
    fireEvent.click(domainsTab);

    expect(domainsTab).toHaveAttribute("aria-selected", "true");
  });

  it("toggles Journey Replay mode and renders chronological timeline player", () => {
    render(
      <CareerGraphView
        projects={mockProjects}
        domainProgress={mockDomains}
        skillsProgress={mockSkills}
      />
    );

    const replayBtn = screen.getByRole("button", { name: /replay journey/i });
    expect(replayBtn).toBeInTheDocument();
    fireEvent.click(replayBtn);

    expect(screen.getByText(/exit journey replay/i)).toBeInTheDocument();
    expect(screen.getByText(/step 1 of/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /play journey/i })).toBeInTheDocument();
  });

  it("renders empty state when no graph data exists", () => {
    render(
      <CareerGraphView
        projects={[]}
        domainProgress={[]}
        skillsProgress={[]}
      />
    );

    expect(screen.getByText("No Career Graph Data")).toBeInTheDocument();
  });
});
