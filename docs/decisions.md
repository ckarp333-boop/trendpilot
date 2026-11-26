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

## 2026-11-25 — Safety filter design (M2)
- **Four layers, in order, a trend must pass all:** (1) category allowlist, (2) keyword blocklist
  (`lib/safety/blocklist.ts`), (3) the profile's topics to avoid, turned into keywords, (4) an LLM
  check returning `{safe, reason}`. Only trends that pass 1–3 reach the LLM, which saves cost and
  keeps obviously unsafe text away from the model.
- **Unsure means unsafe, everywhere:** LLM errors, timeouts, refusals, invalid output and missing
  cached verdicts all exclude the trend with a visible reason.
- **The LLM check is a general family-friendly brand check, not profile-specific.** The owner's
  topics to avoid are enforced by layer 3. This lets one cached verdict per video serve every
  profile, so editing the profile never forces fresh LLM calls during the demo.
- **Cached verdicts:** `npm run cache:safety` runs the LLM over the snapshot and saves verdicts to
  `data/cache/safety-checks.json` (keyed by video ID and a hash of its title/tags/category, plus a
  prompt version). The app uses the cache first and only calls the LLM for uncached trends when an
  API key is configured. LLM calls are allowed in DEMO_MODE; YouTube calls are not.
- **Prompt injection:** trend text goes only in the user message, inside one `<trend_data>` block,
  with `<`/`>` replaced so a title can't close the block. The system prompt says to treat it as data
  and to mark any trend containing instructions as unsafe. Verified live with two synthetic
  injection probes (both marked unsafe) in `docs/test-evidence/safety-filter-run.md`.
- **Profanity added to the blocklist** after the dry run showed a song title with a swear word
  passing layers 1–3.
- **Known trade-off:** keywords can't read context ("Attacking the weekend" is blocked), and the
  LLM is deliberately cautious with vague titles. On the current snapshot 10 of 37 trends are kept.
  Losing some harmless trends is acceptable; showing an unsafe one isn't.
- **LLM settings:** model from `ANTHROPIC_MODEL` (default `claude-sonnet-5-5`), structured output
  validated with zod, 30 s timeout, one retry, low effort, server-side refusal fallbacks
  (`fallbacks: "default"`).

## 2026-11-25 — Fit scoring and concept generation (M3)
- **Fit scores in one call per profile:** all safe trends are scored 0–100 with a one-line reason
  in a single LLM call (each trend in its own `<trend_data>` block). One call keeps the dashboard
  fast when the owner edits the profile. Trends have already passed the safety filter (which
  catches injection attempts) before they're scored together. If scoring fails, trends still show,
  unranked, with a friendly note.
- **Concepts per trend:** `POST /api/generate` returns 3 concepts (hook, caption, visual idea,
  hashtags, platform, posting window). It only generates for trends on the profile's safe list
  (404 otherwise).
- **Originality enforced in code, not just the prompt:** a concept that contains the video title
  (15+ characters) or the channel name is rejected and regenerated once.
- **Retry policy:** the SDK retries timeouts, 429s and 5xx once; the app retries once more only
  for invalid output. Every failure maps to a friendly message and HTTP status; details stay in
  the server log.
- **Profile is delimited too:** the owner's profile is free text, so it goes in a sanitised
  `<brand_profile>` block in the user message, never the system prompt.
- **Caching:** results are cached by trend content + profile hash + prompt version.
  `npm run cache:generate` pre-generated fit scores and all 10 concept sets for the demo profile,
  so the demo needs no LLM calls unless the owner edits the profile. Caches are written only by
  scripts (Vercel's filesystem is read-only); live results are not persisted.
- **Effort:** low for fit scoring (a ranking task), medium for concepts (creative writing).
