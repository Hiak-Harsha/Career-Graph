import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import { FeaturedResumeView } from "./FeaturedResumeView";
import type { ResumeBlockItem } from "../../types";

describe("FeaturedResumeView", () => {
  const mockBlocks: ResumeBlockItem[] = [
    {
      block_type: "identity",
      title: "Identity",
      order: 1,
      content_payload: {
        name: "Dev Candidate",
        headline: "Principal Systems Architect",
        email: "dev@example.com",
        location: "Seattle, WA",
        github: "devcandidate",
      },
    },
    {
      block_type: "positioning",
      title: "Positioning",
      order: 2,
      content_payload: {
        statement: "Specializing in distributed consensus protocols, high-throughput RPC routing, and verified kernel subsystems.",
      },
    },
    {
      block_type: "achievements",
      title: "Achievements",
      order: 3,
      content_payload: {
        achievements: [
          {
            icon: "zap",
            title: "Optimized Consensus p99 Latency",
            description: "Reduced Raft election convergence time from 450ms to 28ms under network partitions.",
            claim_id: "claim-101",
          },
          {
            icon: "shield-check",
            title: "Verified Zero-Copy Deserialization",
            description: "Implemented memory-mapped ring buffer achieving 4.2M msgs/sec in Rust.",
            claim_id: "claim-102",
          },
        ],
      },
    },
    {
      block_type: "selected_work",
      title: "Selected Work",
      order: 4,
      content_payload: {
        projects: [
          {
            id: "proj-1",
            title: "Raft Core Engine",
            description: "Distributed consensus state machine in Rust.",
            technologies: ["Rust", "Tokio", "gRPC"],
            repository_url: "https://github.com/example/raft",
            evidence_count: 2,
            evidence_claims: [
              {
                id: "c1",
                claim: "Maintained linearizable reads across 5 node clusters",
                confidence: 0.98,
                type: "TECHNICAL_ACHIEVEMENT",
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
          { domain: "Distributed Systems", capabilities: "Raft · Paxos · Consensus" },
          { domain: "Systems Programming", capabilities: "Rust · Linux Kernel · eBPF" },
        ],
      },
    },
    {
      block_type: "trajectory",
      title: "Trajectory",
      order: 6,
      content_payload: {
        next_horizons: ["Distributed AI Infrastructure", "Formal Verification Tooling"],
      },
    },
  ];

  it("renders 2-column featured resume container and sections correctly", () => {
    render(<FeaturedResumeView blocks={mockBlocks} />);
    expect(screen.getByTestId("featured-resume-container")).toBeInTheDocument();
    expect(screen.getByText("Dev Candidate")).toBeInTheDocument();
    expect(screen.getByText("Principal Systems Architect")).toBeInTheDocument();
    expect(screen.getByText(/Reduced Raft election convergence time/i)).toBeInTheDocument();
    expect(screen.getByText("Raft Core Engine")).toBeInTheDocument();
    expect(screen.getByText("Distributed AI Infrastructure")).toBeInTheDocument();
  });

  it("gracefully handles empty state without crashing when achievements and projects are empty", () => {
    const emptyBlocks: ResumeBlockItem[] = [
      {
        block_type: "identity",
        title: "Identity",
        order: 1,
        content_payload: {
          name: "New Engineer",
          headline: "Software Engineer",
        },
      },
    ];

    render(<FeaturedResumeView blocks={emptyBlocks} />);
    expect(screen.getByText("New Engineer")).toBeInTheDocument();
    expect(screen.getByText(/Confirmed GitHub claims will appear here/i)).toBeInTheDocument();
  });

  it("triggers onInspectProof callback when an achievement card is clicked", () => {
    const onInspect = vi.fn();
    render(<FeaturedResumeView blocks={mockBlocks} onInspectProof={onInspect} />);

    const achievementCard = screen.getByText(/Optimized Consensus p99 Latency/i).closest("div");
    expect(achievementCard).not.toBeNull();
    if (achievementCard) {
      fireEvent.click(achievementCard);
      expect(onInspect).toHaveBeenCalledWith(
        expect.objectContaining({
          id: "claim-101",
          claim: "Reduced Raft election convergence time from 450ms to 28ms under network partitions.",
        })
      );
    }
  });
});
