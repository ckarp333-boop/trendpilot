# TrendPilot

TrendPilot finds **safe** trending topics on YouTube and turns them into post ideas for a local
bakery/cafe. It's a proof of concept for ENTI 633 (Haskayne MBA, University of Calgary). The demo
business, "Rise & Grind Bakery" in Calgary, is fictional.

> Work in progress. The full README (screenshots, architecture, test evidence, limitations,
> data sourcing disclaimer, AI-use disclosure, team contributions) arrives with the v1.0 release.

## Quick start

```bash
npm install
cp .env.example .env.local   # then fill in ANTHROPIC_API_KEY
npm run dev                  # http://localhost:3000
```

## Scripts

| Command | What it does |
|---|---|
| `npm run dev` | Start the dev server |
| `npm run lint` | ESLint |
| `npm test` | Vitest unit tests |
| `npm run test:e2e` | Playwright end-to-end test (builds and starts the app) |
| `npm run build` | Production build |
| `npm run fetch:youtube` | Refresh `data/youtube-snapshot.json` from the YouTube API (needs `YOUTUBE_API_KEY`) |
| `npm run cache:safety` | Re-run the AI safety check on the snapshot and save verdicts (needs `ANTHROPIC_API_KEY`) |
| `npm run cache:generate` | Re-generate demo fit scores and post ideas (needs `ANTHROPIC_API_KEY`) |

After refreshing the snapshot, run `cache:safety` and then `cache:generate` so the demo works offline.

## Licence

MIT. See [LICENSE](LICENSE).
