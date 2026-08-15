import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import { CareerGraphView } from "./CareerGraphView";
import type { Project, DomainProgress, SkillProgress } from "../../types";

const mockProjects: Project[] = [
  {
    id: "p1",
    title: "Graph Engine",
    status: "COMPLETED",
    project_type: "PERSONAL",
    claims: [{ id: "c1", claim: "High performance parser", confidence: 0.9, evidence: [] }],
    skills: [{ id: "s1", name: "Python" }],
    domains: [{ id: "d1", name: "Algorithms" }],
  },
];

const mockDomains: DomainProgress[] = [
  {
    domain: { id: "d1", name: "Algorithms" },
    exposure_score: 0.8,
    activity_score: 0.8,
    evidence_score: 0.8,
    depth_score: 0.8,
    recency_score: 0.8,
    current_level: "PROFICIENT",
    trajectory: "INCREASING",
  },
];

const mockSkills: SkillProgress[] = [
  {
    skill: { id: "s1", name: "Python" },
    evidence_count: 3,
    usage_frequency: 5,
    depth_score: 0.75,
    recency_score: 0.8,
    confidence: 0.9,
    trajectory: "INCREASING",
    current_level: "PRACTICING",
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

    expect(screen.getByText("Career Graph")).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: /all/i })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: /domains/i })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: /skills/i })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: /projects/i })).toBeInTheDocument();
    expect(screen.getAllByText("Domains").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Skills").length).toBeGreaterThan(0);
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
