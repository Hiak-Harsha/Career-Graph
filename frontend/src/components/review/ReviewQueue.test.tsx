import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { ReviewQueue } from "./ReviewQueue";

// Mock apiFetch
vi.mock("../../config", () => ({
  apiFetch: vi.fn(),
}));

import { apiFetch } from "../../config";

describe("ReviewQueue Component", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders suggestions from GET /review", async () => {
    (apiFetch as any).mockResolvedValueOnce({
      json: async () => ({
        claims: [{ id: "c1", claim: "Built distributed pipeline", confidence: 0.92, project_title: "Data Engine" }],
        domains: [{ domain_id: "d1", domain_name: "Machine Learning", project_id: "p1", project_title: "AI Engine", confidence: 0.88 }],
        skills: [{ skill_id: "s1", skill_name: "PyTorch", project_id: "p1", project_title: "AI Engine", confidence: 0.95 }],
      }),
    });

    const mockRefresh = vi.fn().mockResolvedValue(undefined);
    render(<ReviewQueue onRefreshAll={mockRefresh} />);

    expect(await screen.findByText("Built distributed pipeline")).toBeInTheDocument();
    expect(screen.getByText("Machine Learning")).toBeInTheDocument();
    expect(screen.getByText("PyTorch")).toBeInTheDocument();
  });

  it("calls PATCH and removes item when user confirms", async () => {
    (apiFetch as any)
      .mockResolvedValueOnce({
        json: async () => ({
          claims: [{ id: "c1", claim: "High performance cache", confidence: 0.9, project_title: "Core" }],
          domains: [],
          skills: [],
        }),
      })
      .mockResolvedValueOnce({
        ok: true,
      });

    const mockRefresh = vi.fn().mockResolvedValue(undefined);
    render(<ReviewQueue onRefreshAll={mockRefresh} />);

    expect(await screen.findByText("High performance cache")).toBeInTheDocument();

    const confirmBtn = screen.getByRole("button", { name: /confirm/i });
    fireEvent.click(confirmBtn);

    await waitFor(() => {
      expect(apiFetch).toHaveBeenCalledWith(
        "/claims/c1",
        expect.objectContaining({
          method: "PATCH",
          body: JSON.stringify({ status: "user_confirmed" }),
        })
      );
    });

    expect(mockRefresh).toHaveBeenCalled();
  });

  it("renders empty state cleanly when no pending suggestions exist", async () => {
    (apiFetch as any).mockResolvedValueOnce({
      json: async () => ({ claims: [], domains: [], skills: [] }),
    });

    render(<ReviewQueue onRefreshAll={vi.fn()} />);

    expect(await screen.findByText("Nothing awaiting review in claims.")).toBeInTheDocument();
  });
});
