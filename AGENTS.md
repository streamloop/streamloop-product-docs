# Documentation project instructions

## About this project

- This is the public **Streamloop** documentation, built on [Mintlify](https://mintlify.com).
  Product knowledge and sources of truth are in [`CLAUDE.md`](./CLAUDE.md).
- Pages are MDX files with YAML frontmatter
- Configuration lives in `docs.json` (navigation, redirects)
- Run `mint dev` to preview locally
- Run `mint broken-links` to check links

## Terminology

| Use | Not | Notes |
| --- | --- | --- |
| Streamloop | StreamLoop, Stream Loop | One word, capital S. |
| loop | stream (in guides) | A loop is what the dashboard creates. The API calls it a *stream*; use "stream" only in the API reference, or for the broadcast itself ("your stream is live"). |
| Pre-recorded video loop / video loop | — | The loop type that plays uploaded media. |
| Scene loop | — | The loop type built in the studio. Scenes are a **private beta**: say so on every scene page. |
| show | — | Everything a scene loop plays. |
| scene | — | In the studio, one arrangement of layers inside a show; one is on air at a time. In the dashboard, "Scene" is also the loop type and the tab. Use "scene loop" for the type and "scene" for the arrangement. |
| destination | channel, output | Where a loop streams to (YouTube, Twitch, custom RTMP). |
| multistream | restream, simulcast | Up to 5 destinations per loop. Rolling out. |
| Smart order | custom order, Order Program | The AI-built playlist order. |
| workspace | team, organization, project | Members share loops, uploads, destinations and credits. |
| credits | balance, tokens | \$1 = 1,000,000 credits. |

## Style preferences

- Use active voice and second person ("you")
- Keep sentences concise — one idea per sentence
- Use sentence case for headings
- Bold for UI elements, with the exact label from the dashboard's `en.po`: Click **New loop**
- Code formatting for file names, commands, paths, URLs and keys
- Explain streaming jargon (RTMP, stream key, bitrate) the first time a page uses it
- Features behind a rollout flag are labelled "rolling out" or "beta", never presented as generally available

## Content boundaries

- Document what users see and do. Never mention backend internals: Temporal, NATS, Kubernetes,
  pods, orchestrator, agents/workers, ent, PostHog flag names, internal service names, or
  internal routes such as `/studio/api/*` and `/scene/internal/*`.
- Don't document features that are flagged off for everyone or not merged.
- Don't quote numbers you can't trace to code or the live product (prices, limits, free-credit amounts).
