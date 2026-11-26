# Decisions

Scope and design decisions, newest last.

## 2026-11 — Scope reduction on instructor advice
- **Decision:** Build a narrow proof of concept: one platform (YouTube), one industry (a local
  bakery/cafe, fictional "Rise & Grind Bakery", Calgary), and safe trends only.
- **Why:** The instructor advised "baby steps" so the team ships a working end-to-end flow by
  Dec 3, 2026 instead of a broad but half-finished multi-platform tool.
- **Out of scope:** other platforms, other industries, auto-posting, ads, analytics APIs, login,
  image/video generation. Stretch only after Stage 3: Supabase, X via xAI Grok, second industry,
  scheduled scans.

## 2026-11-25 — No database for Stages 1–3
- **Decision:** JSON files for trend data, localStorage for profile edits and the calendar.
- **Why:** Fewer moving parts for a demo; nothing to provision or secure.

## 2026-11-25 — Demo mode by default
- **Decision:** `DEMO_MODE=true` runs entirely from the saved snapshot and cached LLM results.
- **Why:** The live presentation must not depend on YouTube being reachable.

## 2026-11-25 — LLM model: Claude Sonnet 5.5
- **Decision:** `ANTHROPIC_MODEL=claude-sonnet-5-5` (was `claude-sonnet-4-5` in the original setup).
- **Why:** Current Sonnet model; set via env so it can be changed without code edits.

## 2026-11-25 — Snapshot uses real public YouTube metadata, minimised
- **Decision:** `data/youtube-snapshot.json` holds 37 real trending videos from YouTube Data API v3
  (`videos.list chart=mostPopular`, `regionCode=CA`), fetched 2026-11-26 03:08 UTC with
  `npm run fetch:youtube`. No synthetic fallback was needed: the endpoint still returns data.
- **What we keep:** title, channel name, category, view count, publish date, video URL, up to 10 tags.
  **Dropped:** descriptions, channel IDs, thumbnails, comments, likes, any viewer data.
  @mentions of other people are stripped from titles and tags.
- **Why:** BUILD_PLAN M1 asks for a real snapshot when a key is available; it makes the demo credible.
  This is public video metadata, not personal data about viewers. CLAUDE.md's "synthetic data only"
  rule still applies to everything we invent (the bakery profile, test fixtures, calendar entries).
- **Known quirk:** YouTube's category filter on `mostPopular` is loose. Each video keeps its own
  `snippet.categoryId`, so asking for 5 per category returned 0–10 per category and some videos in
  categories we didn't request (e.g. Gaming, Autos). We store the video's real category, so the
  safety filter's allowlist sees the truth. Pets & Animals (15) returned no videos on this run.
- **Unsafe items present on purpose:** 4 News & Politics videos (category 25 was requested so the
  filter has something to reject), plus 7 items in non-allowlisted categories (Film & Animation,
  Autos & Vehicles, Travel & Events, Gaming, Science & Technology).
