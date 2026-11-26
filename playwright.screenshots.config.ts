import { defineConfig, devices } from "@playwright/test";
import base from "./playwright.config";

/** `npm run screenshots`: walks the app and saves README images to docs/screenshots/. */
export default defineConfig({
  ...base,
  testDir: "./scripts",
  testMatch: "screenshots.spec.ts",
  fullyParallel: false,
  workers: 1,
  retries: 0,
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"], viewport: { width: 1280, height: 860 } } }],
});
