import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { NAV_LINKS, SiteNav } from "./site-nav";

describe("SiteNav", () => {
  it("links to every main page", () => {
    render(<SiteNav />);
    const nav = screen.getByRole("navigation", { name: "Main" });

    for (const link of NAV_LINKS) {
      const anchor = screen.getByRole("link", { name: link.label });
      expect(nav).toContainElement(anchor);
      expect(anchor).toHaveAttribute("href", link.href);
    }
  });
});
