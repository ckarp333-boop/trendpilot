import { expect, test } from "@playwright/test";

/**
 * Walks the main flow with cached AI results and saves screenshots for the README.
 * Run with: npm run screenshots
 */
const out = (name: string) => `docs/screenshots/${name}.png`;

test("capture README screenshots", async ({ page }) => {
  test.setTimeout(120_000);
  const iso = (d: Date) =>
    `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  const today = new Date();
  const tomorrow = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1);

  // 1. Dashboard
  await page.goto("/");
  const trends = page.getByRole("list", { name: "Safe trends" }).getByRole("listitem");
  await expect(trends.first()).toBeVisible();
  await page.screenshot({ path: out("1-dashboard"), fullPage: false });

  // 2. Filtered out panel
  await page.getByText(/^Filtered out \(\d+\)/).click();
  const panel = page.getByRole("list", { name: "Filtered out trends" });
  await panel.scrollIntoViewIfNeeded();
  await page.locator("details").screenshot({ path: out("2-filtered-out") });

  // 3. Trend page with generated ideas
  await trends.first().getByRole("link").first().click();
  await page.getByRole("button", { name: "Generate 3 post ideas" }).click();
  const ideas = page.getByRole("list", { name: "Post ideas" }).getByRole("listitem");
  await expect(ideas).toHaveCount(3);
  await page.screenshot({ path: out("3-trend-ideas"), fullPage: true });

  // Save two ideas (today and tomorrow) so the calendar has content.
  await ideas.nth(0).getByLabel("Post on").fill(iso(today));
  await ideas.nth(0).getByRole("button", { name: "Approve & save to calendar" }).click();
  await ideas.nth(1).getByLabel("Post on").fill(iso(tomorrow));
  await ideas.nth(1).getByRole("button", { name: "Approve & save to calendar" }).click();
  await expect(page.getByText("Saved to calendar ✓")).toHaveCount(2);

  // 4. Profile
  await page.goto("/profile");
  await expect(page.getByLabel("Business name")).toHaveValue("Rise & Grind Bakery");
  await page.screenshot({ path: out("4-profile"), fullPage: true });

  // 5. Calendar, with one post marked posted
  await page.goto("/calendar");
  const todayCell = page.getByRole("list", { name: "Days of the week" }).getByRole("listitem").filter({ hasText: "Today" });
  await todayCell.getByRole("button", { name: "Mark posted" }).click();
  await expect(todayCell.getByText(/after the trend was captured/)).toBeVisible();
  await page.screenshot({ path: out("5-calendar"), fullPage: false });

  // 6. Metrics with owner-entered sample numbers (illustrative only)
  await page.goto("/metrics");
  const rows = page.getByRole("row");
  await expect(rows).toHaveCount(3);
  const first = page.getByLabel(/^Time saved for/).first();
  await first.fill("40");
  await page.getByLabel(/^Attention for/).first().fill("2400");
  await page.getByLabel(/^Engagement for/).first().fill("180");
  await page.getByLabel(/^Clicks for/).first().fill("22");
  await expect(page.getByRole("list", { name: "Totals" })).toContainText("7.5% of views");
  await page.screenshot({ path: out("6-metrics"), fullPage: true });
});
