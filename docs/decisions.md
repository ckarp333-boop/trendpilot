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
