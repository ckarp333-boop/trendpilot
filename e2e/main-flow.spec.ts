import { expect, test } from "@playwright/test";

/**
 * The graded main flow: profile -> trend -> generate -> save -> calendar.
 * Runs against cached AI results only (playwright.config.ts blanks ANTHROPIC_API_KEY),
 * so it is free, fast and deterministic.
 */
test("profile -> trend -> generate -> save -> calendar", async ({ page }) => {
  const today = new Date();
  const todayIso = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;
  const caption = "Playwright caption: cozy mornings start at Rise & Grind.";

  // 1. Profile: prefilled demo bakery, save it.
  await page.goto("/profile");
  await expect(page.getByRole("heading", { name: "Brand profile" })).toBeVisible();
  await expect(page.getByLabel("Business name")).toHaveValue("Rise & Grind Bakery");
  await expect(page.getByLabel("Topics to avoid")).toHaveValue(/Politics and elections/);
  await page.getByRole("button", { name: "Save profile" }).click();
  await expect(page.getByRole("status")).toContainText("Profile saved");

  // 2. Dashboard: ranked safe trends, filtered-out panel with reasons, source links.
  await page.getByRole("navigation", { name: "Main" }).getByRole("link", { name: "Dashboard", exact: true }).click();
  const trends = page.getByRole("list", { name: "Safe trends" }).getByRole("listitem");
  await expect(trends.first()).toBeVisible();
  expect(await trends.count()).toBeGreaterThan(0);
  await expect(trends.first().getByLabel(/Fit score \d+ out of 100/)).toBeVisible();
  await expect(trends.first().getByRole("link", { name: /Watch source video/ })).toHaveAttribute(
    "href",
    /^https:\/\/www\.youtube\.com\/watch\?v=/,
  );
  await page.getByText(/^Filtered out \(\d+\)/).click();
  await expect(page.getByRole("list", { name: "Filtered out trends" }).getByText("Category").first()).toBeVisible();
  await expect(page.getByRole("note", { name: "Disclaimer" })).toContainText("need your approval");

  // 3. Open the top trend and generate concepts (served from the cache).
  const topTitle = (await trends.first().getByRole("link").first().textContent())!.trim();
  await trends.first().getByRole("link").first().click();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(topTitle);
  await page.getByRole("button", { name: "Generate 3 post ideas" }).click();
  const ideas = page.getByRole("list", { name: "Post ideas" }).getByRole("listitem");
  await expect(ideas).toHaveCount(3);

  // 4. Edit the first concept inline and approve it for today.
  const first = ideas.first();
  await first.getByLabel("Caption").fill(caption);
  await first.getByLabel("Post on").fill(todayIso);
  await first.getByRole("button", { name: "Approve & save to calendar" }).click();
  await expect(first.getByRole("status")).toContainText("Saved to calendar");

  // 5. Calendar: the edited post is on today, can be marked posted, then deleted.
  await first.getByRole("link", { name: "View calendar" }).click();
  await expect(page.getByRole("heading", { name: "Content calendar" })).toBeVisible();
  const todayCell = page.getByRole("list", { name: "Days of the week" }).getByRole("listitem").filter({ hasText: "Today" });
  await todayCell.getByText("Caption & visual").click();
  await expect(todayCell.getByText(caption)).toBeVisible();
  await expect(todayCell.getByRole("link", { name: /Trend source/ })).toHaveAttribute("href", /youtube\.com/);

  await todayCell.getByRole("button", { name: "Mark posted" }).click();
  await expect(todayCell.getByText(/Posted .* after the trend was captured/)).toBeVisible();

  page.once("dialog", (d) => d.accept());
  await todayCell.getByRole("button", { name: "Delete" }).click();
  await expect(todayCell.getByText(caption)).toHaveCount(0);
});

test("a filtered-out trend can't be used for posts", async ({ page }) => {
  await page.goto("/");
  await page.getByText(/^Filtered out \(\d+\)/).click();
  const href = await page
    .getByRole("list", { name: "Filtered out trends" })
    .getByRole("link", { name: /Source/ })
    .first()
    .getAttribute("href");
  const id = new URL(href!).searchParams.get("v")!;
  await page.goto(`/trends/${id}`);
  await expect(page.getByRole("heading", { name: "This trend was filtered out" })).toBeVisible();
  await expect(page.getByRole("button", { name: /Generate/ })).toHaveCount(0);
});
