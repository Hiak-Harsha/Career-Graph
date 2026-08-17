import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import React from "react";
import { AtsCleanResumeView } from "./AtsCleanResumeView";
import type { ResumeBlockRepresentation, ResumeData } from "../../types";

describe("AtsCleanResumeView", () => {
  const mockBlocksRep: ResumeBlockRepresentation = {
    target_role: "Lead Software Engineer",
    layout_personality: "featured",
    resume_format: "ats_clean",
    positioning_statement: "Distributed systems engineer with deep database indexing expertise.",
    evidence_coverage_rate: 0.95,
    verification_rate: 0.98,
    generated_at: "2026-08-16T12:00:00Z",
    blocks: [
      {
        block_type: "identity",
        title: "Professional Identity",
        order: 1,
        content_payload: {
          name: "Kunal Saxena",
          headline: "LEAD SOFTWARE ENGINEER · DISTRIBUTED SYSTEMS",
          email: "kunal@example.com",
          location: "San Francisco, CA",
          github: "kunalsaxena",
        },
      },
      {
        block_type: "positioning",
        title: "Core Profile & Positioning",
        order: 2,
        content_payload: {
          statement: "Architected distributed event stream processing pipelines handling 50k events/sec. Optimized database indexing to reduce p99 query latency by 40%.",
          summary_bullets: [
            "Architected distributed event stream processing pipelines handling 50k events/sec.",
            "Optimized database indexing to reduce p99 query latency by 40%.",
          ],
        },
      },
      {
        block_type: "technical_depth",
        title: "Technical Depth",
        order: 3,
        content_payload: {
          clusters: [
            {
              domain: "Core Engineering",
              capabilities: "Python • Distributed Systems • FastAPI • TypeScript • PostgreSQL",
            },
          ],
        },
      },
      {
        block_type: "achievements",
        title: "Key Achievements",
        order: 4,
        content_payload: {
          achievements: [
            {
              icon: "zap",
              title: "Latency Optimization",
              description: "Reduced p99 database response times by 40% using async connection pooling.",
              claim_id: "claim-123",
            },
          ],
        },
      },
      {
        block_type: "selected_work",
        title: "Project Experience",
        order: 5,
        content_payload: {
          projects: [
            {
              id: "proj-1",
              title: "High-Throughput Ingestion Engine",
              description: "Built scalable streaming ingestion pipeline using Python and Kafka.",
            },
          ],
        },
      },
    ],
  };

  const mockResumeData: ResumeData = {
    profile: {
      id: "u-1",
      name: "Kunal Saxena",
      email: "kunal@example.com",
      created_at: "2026-01-01",
      updated_at: "2026-01-01",
    },
    projects: [],
    target_role: "Lead Software Engineer",
    summary: "Distributed systems engineer with deep database indexing expertise.",
    skills: ["Python", "FastAPI", "TypeScript", "PostgreSQL"],
    experience: [
      {
        id: "exp-1",
        role: "Lead Software Engineer",
        company: "Acme Corp",
        location: "San Francisco, CA",
        start_date: "2022",
        end_date: "Present",
        bullets: ["Built real-time event pipeline handling 50k events/sec."],
      },
    ],
    education: [
      {
        id: "edu-1",
        institution: "Stanford University",
        degree: "B.S.",
        field_of_study: "Computer Science",
        start_year: "2016",
        end_year: "2020",
      },
    ],
    certifications: [
      {
        id: "cert-1",
        name: "AWS Certified Solutions Architect",
        issuer: "Amazon Web Services",
        issue_date: "2023",
      },
    ],
    claims: ["Optimized database indexing to reduce p99 query latency by 40%."],
  };

  it("renders single-column ATS resume header, contact details, and summary bullets", () => {
    render(<AtsCleanResumeView blocksRep={mockBlocksRep} resumeData={mockResumeData} />);
    expect(screen.getByText("Kunal Saxena")).toBeDefined();
    expect(screen.getByText("kunal@example.com")).toBeDefined();
    expect(screen.getByText("San Francisco, CA")).toBeDefined();
    expect(screen.getByText(/Architected distributed event stream processing/i)).toBeDefined();
  });

  it("renders single inline dot-separated skills line", () => {
    render(<AtsCleanResumeView blocksRep={mockBlocksRep} resumeData={mockResumeData} />);
    expect(screen.getByText(/Python • Distributed Systems • FastAPI • TypeScript • PostgreSQL/i)).toBeDefined();
  });

  it("triggers onInspectProof callback when Proof badge is clicked", () => {
    const onInspectProof = vi.fn();
    render(
      <AtsCleanResumeView
        blocksRep={mockBlocksRep}
        resumeData={mockResumeData}
        onInspectProof={onInspectProof}
      />
    );
    const proofBtn = screen.getByTitle("Inspect cryptographic commit proof");
    fireEvent.click(proofBtn);
    expect(onInspectProof).toHaveBeenCalledWith(
      "claim-123",
      "Reduced p99 database response times by 40% using async connection pooling."
    );
  });
});
