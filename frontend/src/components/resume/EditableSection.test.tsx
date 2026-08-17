import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import React from "react";
import { EditableSection } from "./EditableSection";

describe("EditableSection", () => {
  it("renders list items with edit inputs and add button", () => {
    const onChange = vi.fn();
    render(
      <EditableSection
        title="Key Achievements"
        itemLabel="Achievement"
        items={["Built caching layer", "Reduced cloud spend by 20%"]}
        onChange={onChange}
      />
    );

    expect(screen.getByText("Key Achievements")).toBeDefined();
    expect(screen.getByDisplayValue("Built caching layer")).toBeDefined();
    expect(screen.getByDisplayValue("Reduced cloud spend by 20%")).toBeDefined();
  });

  it("handles item additions and deletions", () => {
    const onChange = vi.fn();
    render(
      <EditableSection
        title="Core Skills"
        itemLabel="Skill"
        items={["Python", "FastAPI"]}
        onChange={onChange}
      />
    );

    // Click Add
    const addBtn = screen.getByText("Add Skill");
    fireEvent.click(addBtn);
    expect(onChange).toHaveBeenCalledWith(["Python", "FastAPI", ""]);

    // Click Delete on first item
    const deleteBtns = screen.getAllByLabelText("Delete Skill");
    fireEvent.click(deleteBtns[0]);
    expect(onChange).toHaveBeenCalledWith(["FastAPI"]);
  });

  it("handles reordering items up and down", () => {
    const onChange = vi.fn();
    render(
      <EditableSection
        title="Bullets"
        itemLabel="Bullet"
        items={["Item 1", "Item 2"]}
        onChange={onChange}
      />
    );

    const downBtns = screen.getAllByLabelText("Move Bullet down");
    fireEvent.click(downBtns[0]);
    expect(onChange).toHaveBeenCalledWith(["Item 2", "Item 1"]);
  });
});
