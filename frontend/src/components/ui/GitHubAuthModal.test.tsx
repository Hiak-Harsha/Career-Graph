import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { GitHubAuthModal } from "./GitHubAuthModal";

vi.mock("../../config", () => ({
  apiFetch: vi.fn(),
}));

import { apiFetch } from "../../config";

describe("GitHubAuthModal Component", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders PAT tab by default with inputs and prefilled username", () => {
    render(
      <GitHubAuthModal
        onClose={vi.fn()}
        onSuccess={vi.fn()}
        onRefresh={vi.fn()}
        defaultUsername="octocat"
      />
    );

    expect(screen.getByText("Connect GitHub")).toBeInTheDocument();
    expect(screen.getByLabelText(/GitHub Username/i)).toHaveValue("octocat");
    expect(screen.getByPlaceholderText("ghp_...")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Connect & Sync/i })).toBeInTheDocument();
  });

  it("submits PAT credentials and triggers sync", async () => {
    vi.mocked(apiFetch)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ status: "ok" }),
      } as unknown as Response)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ synced_repositories: 4 }),
      } as unknown as Response);

    const handleSuccess = vi.fn();
    const handleRefresh = vi.fn();
    const handleClose = vi.fn();

    render(
      <GitHubAuthModal
        onClose={handleClose}
        onSuccess={handleSuccess}
        onRefresh={handleRefresh}
        defaultUsername=""
      />
    );

    fireEvent.change(screen.getByLabelText(/GitHub Username/i), {
      target: { value: "testuser" },
    });
    fireEvent.change(screen.getByPlaceholderText("ghp_..."), {
      target: { value: "ghp_123456" },
    });

    fireEvent.click(screen.getByRole("button", { name: /Connect & Sync/i }));

    await waitFor(() => {
      expect(apiFetch).toHaveBeenCalledWith(
        "/profile",
        expect.objectContaining({
          method: "PUT",
          body: JSON.stringify({ github_username: "testuser", github_access_token: "ghp_123456" }),
        })
      );
      expect(apiFetch).toHaveBeenCalledWith("/sync", expect.objectContaining({ method: "POST" }));
      expect(handleSuccess).toHaveBeenCalledWith(expect.stringContaining("4 repositories"));
      expect(handleRefresh).toHaveBeenCalled();
      expect(handleClose).toHaveBeenCalled();
    });
  });

  it("shows proactive OAuth setup notice and switch button when client ID is missing", () => {
    render(
      <GitHubAuthModal
        onClose={vi.fn()}
        onSuccess={vi.fn()}
        onRefresh={vi.fn()}
      />
    );

    // Switch to OAuth tab
    fireEvent.click(screen.getByRole("button", { name: /OAuth Login/i }));

    expect(
      screen.getByText(/OAuth Not Configured for this Instance/i)
    ).toBeInTheDocument();

    const switchBtn = screen.getByRole("button", { name: /Use Personal Access Token/i });
    fireEvent.click(switchBtn);

    // Should switch back to PAT tab
    expect(screen.getByPlaceholderText("ghp_...")).toBeInTheDocument();
  });

  it("calls onClose when close button or cancel button is clicked", () => {
    const handleClose = vi.fn();
    render(
      <GitHubAuthModal
        onClose={handleClose}
        onSuccess={vi.fn()}
        onRefresh={vi.fn()}
      />
    );

    fireEvent.click(screen.getByRole("button", { name: /Close/i }));
    expect(handleClose).toHaveBeenCalledTimes(1);

    fireEvent.click(screen.getByRole("button", { name: /Cancel/i }));
    expect(handleClose).toHaveBeenCalledTimes(2);
  });
});
