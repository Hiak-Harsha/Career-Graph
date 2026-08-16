import React from "react";
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { StrataView } from "./StrataView";
import type { DomainProgress, SkillProgress, Project } from "../../types";

const mockDomains: DomainProgress[] = [
  {
    id: "dp-1",
    exposure_score: 0.85,
    activity_score: 0.8,
    evidence_score: 0.9,
    depth_score: 0.85,
    recency_score: 0.9,
    current_level: "PROFICIENT",
    trajectory: "INCREASING",
    last_active: "2026-03-01T00:00:00Z",
    domain: {
      id: "dom-1",
      name: "Backend Systems",
      description: "Distributed backend architecture and APIs",
    },
  },
  {
    id: "dp-2",
    exposure_score: 0.45,
    activity_score: 0.4,
    evidence_score: 0.5,
    depth_score: 0.45,
    recency_score: 0.6,
    current_level: "EXPOSURE",
    trajectory: "STABLE",
    last_active: "2026-02-15T00:00:00Z",
    domain: {
      id: "dom-2",
      name: "AI / Machine Learning",
      description: "Neural network optimization and inference",
    },
  },
];

const mockSkills: SkillProgress[] = [
  {
    id: "sp-1",
    usage_frequency: 12,
    evidence_count: 5,
    depth_score: 0.9,
    recency_score: 0.9,
    confidence: 0.95,
    trajectory: "INCREASING",
    current_level: "PROFICIENT",
    last_used: "2026-03-01T00:00:00Z",
    skill: {
      id: "sk-1",
      name: "Python",
      category: "Backend Systems",
    },
  },
];

const mockProjects: Project[] = [
  {
    id: "proj-1",
    title: "High-Throughput Gateway",
    status: "ACTIVE",
    project_type: "PERSONAL",
    domains: [{ id: "dom-1", name: "Backend Systems" }],
    claims: [],
  },
];

describe("StrataView", () => {
  it("renders strata header, weekly digest, and milestone nudge", () => {
    render(
      <StrataView
        domainProgress={mockDomains}
        skillProgress={mockSkills}
        projects={mockProjects}
      />
    );

    expect(screen.getByText("Career Strata & Geological Depth")).toBeInTheDocument();
    expect(screen.getByText("Primary Seam: Backend Systems")).toBeInTheDocument();
    expect(screen.getByText("Milestone Nudge")).toBeInTheDocument();
    expect(screen.getAllByText("AI / Machine Learning").length).toBeGreaterThan(0);
  });

  it("selects domain layer and triggers onInspectDomain callback", () => {
    const onInspect = vi.fn();
    render(
      <StrataView
        domainProgress={mockDomains}
        skillProgress={mockSkills}
        projects={mockProjects}
        onInspectDomain={onInspect}
      />
    );

    const backendLayers = screen.getAllByText("Backend Systems");
    fireEvent.click(backendLayers[backendLayers.length - 1]);

    expect(onInspect).toHaveBeenCalledWith("dom-1");
    expect(screen.getByText("Layer Analysis: Backend Systems")).toBeInTheDocument();
  });
});
