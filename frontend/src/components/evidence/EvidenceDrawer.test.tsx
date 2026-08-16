import React from "react";
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { EvidenceDrawer } from "./EvidenceDrawer";
import type { Claim } from "../../types";

const mockClaim: Claim = {
  id: "c-1",
  claim: "Implemented high throughput raft consensus",
  confidence: 0.96,
  claim_type: "SYSTEM_ARCHITECTURE",
  evidence: [
    {
      id: "ev-1",
      type: "GITHUB_COMMIT",
      source: "commit 8f2a1b9",
      source_url: "https://github.com/alexrivera/raft/commit/8f2a1b9",
      captured_at: new Date().toISOString(),
      confidence: 0.98,
    },
  ],
};

describe("EvidenceDrawer Component", () => {
  it("renders claim details, confidence score, and open link", () => {
    render(<EvidenceDrawer claim={mockClaim} onClose={vi.fn()} />);

    expect(screen.getAllByText(/Implemented high throughput raft consensus/i).length).toBeGreaterThan(0);
    expect(screen.getByText("96% verified")).toBeInTheDocument();
    expect(screen.getByText("SYSTEM_ARCHITECTURE")).toBeInTheDocument();
    expect(screen.getByText("Open in GitHub")).toBeInTheDocument();
  });

  it("calls onClose when close button is clicked", () => {
    const handleClose = vi.fn();
    render(<EvidenceDrawer claim={mockClaim} onClose={handleClose} />);

    const closeBtn = screen.getByRole("button", { name: /Close/i });
    fireEvent.click(closeBtn);
    expect(handleClose).toHaveBeenCalled();
  });

  it("calls onClose when escape key is pressed", () => {
    const handleClose = vi.fn();
    render(<EvidenceDrawer claim={mockClaim} onClose={handleClose} />);

    fireEvent.keyDown(document, { key: "Escape" });
    expect(handleClose).toHaveBeenCalled();
  });
});
