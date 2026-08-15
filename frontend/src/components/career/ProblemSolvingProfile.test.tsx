import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import { ProblemSolvingProfile } from "./ProblemSolvingProfile";

describe("ProblemSolvingProfile Component", () => {
  it("renders recurring solution patterns and frequently works with tags", () => {
    const profileData = {
      frequently_works_with: ["distributed systems", "fastapi", "react state"],
      recurring_patterns_detected: ["iterative prototyping", "algorithmic optimization"],
    };

    render(<ProblemSolvingProfile profile={profileData} />);

    expect(screen.getByText("Problem-Solving Profile")).toBeInTheDocument();
    expect(screen.getByText("distributed systems")).toBeInTheDocument();
    expect(screen.getByText("iterative prototyping")).toBeInTheDocument();
    expect(screen.getByText("algorithmic optimization")).toBeInTheDocument();
  });

  it("handles null or empty profile gracefully without rendering", () => {
    const { container } = render(<ProblemSolvingProfile profile={null} />);
    expect(container.firstChild).toBeNull();
  });
});
