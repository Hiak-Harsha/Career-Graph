import React from "react";
import { describe, it, expect } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { DomainCard } from "./DomainCard";
import type { DomainProgress } from "../../types";

const mockDp: DomainProgress = {
  domain: {
    id: "d-1",
    name: "Distributed Systems",
    description: "Consensus, replication, and fault tolerance",
  },
  current_level: "STRONG",
  trajectory: "INCREASING",
  evidence_score: 0.9,
  recency_score: 0.85,
  depth_score: 0.92,
  exposure_score: 0.88,
  activity_score: 0.85,
  last_active: new Date().toISOString(),
};

describe("DomainCard Component", () => {
  it("renders domain name, level, and dimensions", () => {
    render(<DomainCard dp={mockDp} projects={[]} />);

    expect(screen.getByText("Distributed Systems")).toBeInTheDocument();
    expect(screen.getAllByText("Strong").length).toBeGreaterThan(0);
    expect(screen.getByText("Growing")).toBeInTheDocument();
    expect(screen.getByText("Recent activity")).toBeInTheDocument();
  });

  it("opens DomainDrawer on click", () => {
    render(<DomainCard dp={mockDp} projects={[]} />);

    const card = screen.getByRole("button", { name: /Distributed Systems domain detail/i });
    fireEvent.click(card);

    expect(screen.getByRole("complementary", { name: /Distributed Systems details/i })).toBeInTheDocument();
  });
});
