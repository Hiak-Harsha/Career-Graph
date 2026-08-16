import React from "react";
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { CurrentlyBuilding } from "./CurrentlyBuilding";
import type { Project } from "../../types";

const mockProjects: Project[] = [
  {
    id: "p1",
    title: "Graph Engine",
    description: "Fast in-memory graph index",
    status: "ACTIVE",
    project_type: "PROFESSIONAL",
    complexity_score: 8.5,
    updated_at: new Date().toISOString(),
  },
  {
    id: "p2",
    title: "Old Compiler",
    description: "Toy compiler",
    status: "COMPLETED",
    project_type: "PERSONAL",
    complexity_score: 5.0,
  },
];

describe("CurrentlyBuilding Component", () => {
  it("renders active projects only and formats status", () => {
    render(<CurrentlyBuilding projects={mockProjects} />);

    expect(screen.getByText("Graph Engine")).toBeInTheDocument();
    expect(screen.queryByText("Old Compiler")).not.toBeInTheDocument();
    expect(screen.getByText("Active")).toBeInTheDocument();
  });

  it("triggers onViewAll callback when clicked", () => {
    const handleViewAll = vi.fn();
    render(<CurrentlyBuilding projects={mockProjects} onViewAll={handleViewAll} />);

    const btn = screen.getByRole("button", { name: /view all/i });
    fireEvent.click(btn);
    expect(handleViewAll).toHaveBeenCalled();
  });

  it("renders empty state when no active projects exist", () => {
    render(<CurrentlyBuilding projects={[]} />);
    expect(screen.getByText("No active projects.")).toBeInTheDocument();
  });
});
