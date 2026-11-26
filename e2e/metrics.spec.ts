import { expect, test } from "@playwright/test";

const captured = "2026-11-25T10:00:00.000Z";
const posted = "2026-11-25T15:00:00.000Z"; // 5 h later

const seed = [
  {
    id: "seed-1",
    trendId: "t1",
    trendTitle: "Synthetic trend",
    trendUrl: "https://www.youtube.com/watch?v=t1",
    categoryName: "Pets & Animals",
    trendCapturedAt: captured,
    concept: {
      hook: "Puppy-approved croissants",
      caption: "c",
      visualIdea: "v",
      hashtags: ["#yyc"],
      platform: "Instagram",
      postingWindow: "Saturday 8-10 AM",
    },
    scheduledDate: "2026-11-28",
    createdAt: captured,
    postedAt: posted,
  },
  {
    id: "seed-2",
    trendId: "t2",
    trendTitle: "Synthetic trend 2",
    trendUrl: "https://www.youtube.com/watch?v=t2",
    categoryName: "Sports",
    trendCapturedAt: captured,
    concept: {
      hook: "Game-day cinnamon buns",
      caption: "c",
      visualIdea: "v",
      hashtags: ["#yyc"],
      platform: "TikTok",
      postingWindow: "Sunday",
    },
    scheduledDate: "2026-11-29",
    createdAt: captured,
  },
];

test("metrics: totals, owner-entered values, toggles, saved across reloads", async ({ page }) => {
  await page.addInitScript((entries) => {
    if (!sessionStorage.getItem("seeded")) {
      localStorage.setItem("trendpilot.calendar.v1", JSON.stringify(entries));
      localStorage.removeItem("trendpilot.metrics.v1");
      sessionStorage.setItem("seeded", "1");
    }
  }, seed);

  await page.goto("/metrics");
  await expect(page.getByRole("heading", { name: "Value metrics" })).toBeVisible();

  const totals = page.getByRole("list", { name: "Totals" });
  await expect(totals).toContainText("1 posted");
  await expect(totals).toContainText("of 2 planned");
  await expect(totals).toContainText("5.0 h"); // avg speed to market
  await expect(page.getByText(/helped you publish 1 trend-based post, on average 5.0 h/)).toBeVisible();

  await page.getByLabel('Attention for "Puppy-approved croissants"').fill("1000");
  await page.getByLabel('Engagement for "Puppy-approved croissants"').fill("50");
  await page.getByLabel('Time saved for "Puppy-approved croissants"').fill("30");
  await expect(totals).toContainText("1,000");
  await expect(totals).toContainText("5.0% of views");
  await expect(totals).toContainText("30 min");

  // Toggling a metric off hides its column and total.
  await page.getByRole("checkbox", { name: "Clicks" }).uncheck();
  await expect(page.getByRole("columnheader", { name: /Clicks/ })).toHaveCount(0);
  await expect(page.getByLabel('Clicks for "Puppy-approved croissants"')).toHaveCount(0);

  // Everything persists after a reload.
  await page.reload();
  await expect(page.getByLabel('Attention for "Puppy-approved croissants"')).toHaveValue("1000");
  await expect(page.getByRole("checkbox", { name: "Clicks" })).not.toBeChecked();
});

test("metrics: empty state links to the dashboard", async ({ page }) => {
  await page.goto("/metrics");
  await expect(page.getByText("No posts to measure yet")).toBeVisible();
  await expect(page.getByRole("main").getByRole("link", { name: "dashboard" })).toHaveAttribute("href", "/");
});

test("nav highlights the current page", async ({ page }) => {
  await page.goto("/calendar");
  const nav = page.getByRole("navigation", { name: "Main" });
  await expect(nav.getByRole("link", { name: "Calendar" })).toHaveAttribute("aria-current", "page");
  await expect(nav.getByRole("link", { name: "Profile" })).not.toHaveAttribute("aria-current", "page");
  await expect(page).toHaveTitle("Content calendar · TrendPilot");
});

test("unknown pages show a friendly 404", async ({ page }) => {
  await page.goto("/no-such-page");
  await expect(page.getByRole("heading", { name: "Page not found" })).toBeVisible();
});
