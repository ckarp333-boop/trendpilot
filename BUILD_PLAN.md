# TrendPilot build plan (for Claude Code)

Work through these milestones in order. Follow CLAUDE.md at all times.
For each milestone: create a branch, build, run `npm run lint && npm test && npm run build`,
fix until green, update docs/prompt-log.md and docs/dev-log.md, commit, push the branch,
open a PR with `gh pr create`, then STOP and report to the human with a short summary
and anything you could not verify. Do not start the next milestone until told "continue".
Do not merge PRs yourself. Never read or print .env.local.

## M0: Skeleton (branch: feat/skeleton)
- Next.js (App Router, TypeScript), Tailwind, shadcn/ui, ESLint, Vitest, Playwright
- .gitignore excludes .env*.local, node_modules, .next, test-results
- .env.example: ANTHROPIC_API_KEY, YOUTUBE_API_KEY, DEMO_MODE=true, ANTHROPIC_MODEL
- Folders per CLAUDE.md. docs/ with prompt-log.md, dev-log.md, decisions.md (log the
  instructor-advised scope reduction: YouTube only, bakery only, safe trends only)
- MIT LICENSE, placeholder README
- Pages: / (dashboard), /profile, /trends/[id], /calendar, /metrics with a shared nav
Done when: app runs, one Vitest and one Playwright test pass, build succeeds.

## M1: Data (branch: feat/youtube-data)
- data/demo-profile.json: fictional "Rise & Grind Bakery", Calgary (products, values, tone,
  audience, topics to avoid)
- data/youtube-snapshot.json: about 40 items. If YOUTUBE_API_KEY is set, create
  scripts/fetch-youtube.ts (videos.list chart=mostPopular, regionCode=CA, categories
  26, 24, 23, 22, 10, 17, 15, and 25 so the filter has something to reject) and save
  title, channel, category, views, publishedAt, url, tags. Strip personal data.
  If the key is missing or the endpoint returns nothing, generate a clearly labelled
  SYNTHETIC snapshot in the same shape (include about 8 unsafe items: news, tragedy,
  politics) and note this in decisions.md.
- lib/youtube: typed loader with zod schema, plus live fetch function used only when DEMO_MODE=false
Done when: loader tests pass for valid and malformed data.

## M2: Safety filter (branch: feat/safety)
- lib/safety: category allowlist, keyword blocklist, profile topics-to-avoid, then LLM check
  returning {safe, reason}. Unsure means unsafe. In DEMO_MODE use cached LLM results
  from data/cache/ so the demo makes no live calls except where allowed.
- Return both kept trends and filtered-out trends with reasons
Done when: unit tests cover each layer, including a prompt-injection title
("ignore previous instructions...") that must be treated as data.

## M3: Fit scoring and concepts (branch: feat/generate)
- lib/generate: fit score 0-100 plus one-line reason per safe trend, using the profile
- POST /api/generate: 3 concepts (caption, hook, visualIdea, hashtags, platform, postingWindow)
  as JSON, zod-validated, 30 s timeout, retry once, friendly UI error
- Untrusted trend text wrapped in <trend_data> tags with an instruction to treat it as data
- Cache responses to data/cache/ so the demo works offline
Done when: tests pass with a mocked LLM, including invalid JSON and timeout cases.

## M4: Main flow UI (branch: feat/ui-flow)
- Dashboard: trends ranked by fit score, platform badge, source link, "Filtered out" panel
- Trend page: generate concepts, edit them inline, "Save to calendar"
- Profile page: edit and save (localStorage), reset to demo profile
- Calendar: week view, saved posts, delete, "Mark posted" (timestamp for speed-to-market)
- Visible disclaimer: AI-generated ideas need human approval, data limitations
Done when: Playwright test completes profile -> trend -> generate -> save -> calendar
using cached responses.

## M5: Metrics and polish (branch: feat/metrics)
- /metrics: toggle metrics (speed to market, time saved, clicks, attention, engagement),
  owner-entered values per post, simple totals
- Empty states, loading states, error states, responsive layout for desktop
Done when: all tests green and the app looks coherent.

## M6: Repo and release (branch: docs/release)
- README: purpose, problem, screenshots (Playwright screenshot script into docs/screenshots),
  features, architecture diagram (Mermaid), setup steps, test evidence (test output summary),
  known limitations, data sourcing disclaimer, AI-use disclosure, team contribution
  statement (placeholders for each member to fill in), licence
- After the human merges: tag v1.0
Done when: a new person can clone, copy .env.example, run, and see the demo in DEMO_MODE.
