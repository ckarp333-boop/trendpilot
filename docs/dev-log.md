# Dev log

Failures and fixes (what broke, cause, fix). Newest last.

| Date | Who | What broke | Cause | Fix |
|---|---|---|---|---|
| 2026-11-25 | Conor + Claude Code | `create-next-app` refused to run in the repo folder | The folder already held CLAUDE.md, BUILD_PLAN.md and .claude/ | Scaffolded in a temp folder and copied files in, keeping our .gitignore and CLAUDE.md |
| 2026-11-25 | Conor + Claude Code | `npm install -D vitest ...` failed with ERESOLVE | Scaffold pinned `@types/node@^20`; current Vitest needs `@types/node` 22+ | Bumped `@types/node` to `^24` |
| 2026-11-25 | Conor + Claude Code | Keys file was not ignored by git | Notepad saved it as `.env.local.txt`, which `.env*.local` doesn't match | Renamed to `.env.local` (verified with `git check-ignore`) |
| 2026-11-25 | Conor + Claude Code | `next build` failed on `/trends/[id]` ("uncached or runtime data during prerendering") | Next 16 enables Cache Components by default, so awaiting `params` outside `<Suspense>` blocks prerendering | Moved the `params` read into a child component wrapped in `<Suspense>`; the route is now partially prerendered |
