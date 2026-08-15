import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import { SkillProgressView } from "./SkillProgressView";
import type { SkillProgress } from "../../types";

describe("SkillProgressView Component", () => {
  it("renders skills sorted by depth score descending", () => {
    const skills: SkillProgress[] = [
      {
        skill: { id: "1", name: "Python" },
        evidence_count: 5,
        usage_frequency: 10,
        depth_score: 0.85,
        recency_score: 0.9,
        confidence: 0.95,
        trajectory: "INCREASING",
        current_level: "PROFICIENT",
      },
      {
        skill: { id: "2", name: "TypeScript" },
        evidence_count: 8,
        usage_frequency: 15,
        depth_score: 0.92,
        recency_score: 0.95,
        confidence: 0.98,
        trajectory: "INCREASING",
        current_level: "STRONG",
      },
    ];

    render(<SkillProgressView skillsProgress={skills} />);

    expect(screen.getByText("Skill Progression")).toBeInTheDocument();
    expect(screen.getByText("TypeScript")).toBeInTheDocument();
    expect(screen.getByText("85%")).toBeInTheDocument();
    expect(screen.getByText("92%")).toBeInTheDocument();
    expect(screen.getByText("8 evidence items")).toBeInTheDocument();
  });

  it("handles empty skills array gracefully", () => {
    render(<SkillProgressView skillsProgress={[]} />);
    expect(screen.getByText(/No skill progression data detected yet/i)).toBeInTheDocument();
  });
});
