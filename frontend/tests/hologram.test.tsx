import React from "react";
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { JarvisHologram } from "@/components/command-center/JarvisHologram";

describe("JarvisHologram Component", () => {
  it("renders hologram container without crashing", () => {
    const { container } = render(<JarvisHologram status="idle" size={200} />);
    expect(container.firstChild).toBeInTheDocument();
  });

  it("applies pointer-events-none to prevent blocking user clicks", () => {
    const { container } = render(<JarvisHologram status="running" size={240} />);
    const elem = container.firstChild as HTMLElement;
    expect(elem.className).toContain("pointer-events-none");
  });

  it("renders with different assistant statuses", () => {
    const statuses = ["idle", "planning", "running", "completed", "failed"] as const;
    statuses.forEach((st) => {
      const { unmount, container } = render(<JarvisHologram status={st} size={180} />);
      expect(container.firstChild).toBeInTheDocument();
      unmount();
    });
  });
});
