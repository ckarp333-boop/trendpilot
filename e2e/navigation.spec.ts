import { expect, test } from "@playwright/test";

test("shared nav reaches every page", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "Dashboard" })).toBeVisible();

  const nav = page.getByRole("navigation", { name: "Main" });
  const pages = [
    { link: "Profile", heading: "Brand profile", path: "/profile" },
    { link: "Calendar", heading: "Content calendar", path: "/calendar" },
    { link: "Metrics", heading: "Value metrics", path: "/metrics" },
    { link: "Dashboard", heading: "Dashboard", path: "/" },
  ];

  for (const p of pages) {
    await nav.getByRole("link", { name: p.link, exact: true }).click();
    await expect(page).toHaveURL(p.path);
    await expect(page.getByRole("heading", { name: p.heading })).toBeVisible();
  }

  await page.goto("/trends/demo-1");
  await expect(page.getByRole("heading", { name: "Trend demo-1" })).toBeVisible();
});
