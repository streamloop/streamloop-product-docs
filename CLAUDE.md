# Streamloop documentation — Claude Code instructions

This file orients you (Claude) for writing the **Streamloop** product documentation. Read
[`AGENTS.md`](./AGENTS.md) too — it holds the Mintlify project basics (MDX, `docs.json`,
local preview) and the house style rules. This file adds product knowledge, where to find
ground truth, the writing workflow, which skills to use, and who you're writing for.

> Spelling: it's **Streamloop** — one word, capital `S`, lowercase `l`. Never "StreamLoop",
> "Stream Loop", or "StreamLoop App". The product lives at **https://streamloop.app**.

---

## What Streamloop is

Streamloop turns **pre-recorded videos (or a playlist of videos) into a continuous 24/7
live stream** to YouTube or any RTMP destination — entirely in the cloud. There's no OBS, no
PC left running, no encoding hardware. You upload a video, point it at a destination, and a
cloud worker loops it to the platform's RTMP ingest indefinitely.

The product handles auth, billing, encoding/transcoding, scheduling, and the YouTube
broadcast lifecycle on the user's behalf.

**At a glance**
- **Core job:** loop an uploaded video/playlist → 24/7 live RTMP stream.
- **Quality:** up to **4K @ 60fps** (also 1080p/30, 720p/24).
- **Destinations:** YouTube (via OAuth), plus custom RTMP — Twitch, Facebook Live, Instagram,
  Kick, TikTok, and any RTMP platform. *(Multi-destination "multistream" and a hosted MCP
  server are in flight — see "Verify before you document" below.)*
- **Inputs:** MP4, MKV, AVI, MOV; optional separate audio track (music/voiceover); import from
  Google Drive / Dropbox; playlists with custom ordering.
- **Reliability:** automatic stream monitoring and recovery.
- **Pricing:** pay-as-you-go **credits or an optional monthly credit plan selected during
  onboarding**; credits never expire, and new users get **free trial credits with no card
  required**. Positioning: *"half the price, twice the quality."*

## Who you're writing for (audience)

- **Primary — non-technical content creators & broadcasters** who want an always-on channel
  without OBS or hardware: 24/7 music/lofi channels, replay/marathon channels, TV-style loops,
  gaming or highlight loops, ambient/background streams. They value **simplicity and low cost**
  over technical control. Write for them by default.
- **Secondary — slightly more technical users**: custom-RTMP setups, the YouTube integration,
  and the MCP/agent integration. Give them the extra detail in dedicated pages, not in the
  main happy-path guides.

Default voice: friendly, plain-language, task-oriented, second person ("you"). Assume the
reader has a video file and a destination account, and little else. Explain streaming jargon
(RTMP, stream key, bitrate) the first time it appears.

## State of this repo (read this before editing)

This is the public docs site, built on **Mintlify**. **It is currently a skeleton, not real
documentation.** `docs.json` and the navigation are Streamloop-specific, but most page bodies
are either **empty stubs** (e.g. `features.mdx`, `get-your-stream-live.mdx`, everything under
`platform/`) or **leftover Mintlify starter-template boilerplate** that does **not** describe
Streamloop at all (`index.mdx`, `concepts.mdx`, `quickstart.mdx`, `settings.mdx` still talk
about generic "workspaces / projects / CRM / dashboards / analytics / SSO"). 

**Your job is to replace that scaffolding with real Streamloop content.** Treat any mention of
workspaces, CRM connectors, analytics dashboards, or scheduled reports as template residue to
be rewritten or removed — they are not Streamloop concepts.

### Layout
- `docs.json` — site config + navigation. **Every new page must be added to a `navigation`
  group here** or it won't appear.
- `*.mdx` — pages (top level + `platform/` for per-destination guides).
- `images/`, `logo/` — assets. `style.css` — custom styling.
- `AGENTS.md` — Mintlify basics + style preferences.
- Drafts: `drafts/` and `*.draft.mdx` are git/mint-ignored — use them for work-in-progress.

---

## Where to find ground truth

Don't invent product behavior, UI labels, or feature availability. Confirm against these
sources, in rough order of authority for a given question:

### 1. The live product — https://streamloop.app
The marketing site (features, pricing, positioning, supported platforms) and the app
(`/loops` dashboard, auth, upload/create flows) are the source of truth for **what users see**
and **what's actually shipped**. Use it for screenshots, exact UI wording, and the happy path.

### 2. The codebases — via the `gh` CLI
You're authenticated (`gh auth status`) with `repo` scope. Read code, issues, and PRs directly
— **don't clone unless you need to.**

- **`streamloop/next-frontend`** — the user-facing app (Next.js + shadcn, TypeScript).
  Ground truth for **UI flows, button/label text, and what a screen actually does**. Useful paths:
  - `src/app/(public)` and `src/app/(dashboard)` — public vs. signed-in routes
  - `src/components/stream-create`, `stream-edit`, `stream-list`, `streams` — the core stream UX
  - `src/components/upload-file.tsx`, `external-upload.tsx` (Drive/Dropbox), `free-credits-claim.tsx`,
    `landing-page/` — onboarding & marketing copy
  - `messages/` — i18n strings (canonical UI wording)
- **`streamloop/streamloop-services`** — the Go backend. Ground truth for **how features
  actually behave** (encoding, scheduling, credits/billing, YouTube lifecycle, RTMP, playlists).
  Start here, don't read the whole tree:
  - `docs/project-map.md` — what every service does + the data-flow narrative (read this first)
  - `docs/` — per-feature design docs: `playlist`, `destinations`, `temporal`,
    `youtube-oauth`, `youtube-schedule-mirror`, `mid-stream-replacement`, `thumbnail`
  - `docs/discovery/` — real-world runtime gotchas worth turning into troubleshooting/FAQ content

  Example reads:
  ```sh
  gh api repos/streamloop/streamloop-services/contents/docs/project-map.md --jq '.content' | base64 -d
  gh api repos/streamloop/streamloop-services/contents/docs --jq '.[].name'
  ```

### 3. Issues & PRs — for what's new, changing, or not-yet-shipped
Features move fast and some ship behind flags. Check before documenting:
```sh
gh pr list   -R streamloop/streamloop-services --state all -L 30
gh issue list -R streamloop/streamloop-services --state all -L 30
gh pr view <N> -R streamloop/streamloop-services           # details + linked discussion
gh search prs --repo streamloop/streamloop-services <keyword>
```
(Same commands work for `streamloop/next-frontend`.) Recent examples: multistream (fan one
stream to several RTMP destinations), a hosted MCP server, YouTube live-eligibility preflight,
playlist crash-loop fixes. A merged PR ≈ shipped; `DRAFT`/`OPEN`/flagged ≈ **don't document
as available yet** — or mark it clearly as upcoming.

### 4. Mintlify product knowledge
For component syntax and `docs.json` options, use the **`mintlify` skill** (below). The repo
also exposes Mintlify's own docs MCP (`plugin:mintlify:Mintlify`) and you have the **Streamloop
admin MCP** (`mintlify` server, once authorized via `/mcp`) for working against the live docs.

### Verify before you document
RTMP/YouTube behavior, credit pricing, file-format support, and feature availability change.
Cross-check the live app + a recent PR before stating specifics (especially **pricing numbers**,
**supported destinations**, **multistream**, and **MCP**). When unsure, say it plainly or leave
a `{/* TODO: verify */}` rather than guessing.

---

## How to write an article / page

1. **Research first.** Pull the real flow from the live app + `next-frontend`, and the real
   behavior from `streamloop-services/docs`. Capture exact UI labels and limits.
2. **Pick the page's job & frontmatter.** Every page starts with YAML frontmatter:
   ```mdx
   ---
   title: "Get your stream live"
   sidebarTitle: "Go live"        # optional, shorter nav label
   description: "Point your uploaded video at a destination and start a 24/7 stream."
   icon: "video"                  # optional lucide icon
   ---
   ```
   `title` + `description` are also the SEO/OG tags Mintlify emits — write them deliberately.
3. **Register it in `docs.json`.** Add the page path to the right `navigation.groups` entry
   (Platform / Setting up your 24/7 stream / Destinations / Integrations / Resources).
4. **Draft with Mintlify components, not raw HTML.** Use `<Steps>` for procedures, `<Card>`/
   `<Columns>` for landing/index pages, `<Tabs>` for per-platform variants, `<Accordion>` for
   FAQs, `<Note>/<Warning>/<Info>/<Tip>` for callouts, `<Frame>` for screenshots. Ask the
   `mintlify` skill for exact props.
5. **Write to the audience.** Lead with the outcome, one idea per sentence, active voice,
   second person. Bold UI elements (Click **Create stream**). Code-format file names, paths,
   stream keys, and commands.
6. **Images** go in `images/`, referenced via `<Frame>`. Keep alt text descriptive.
7. **Optimize** (SEO/GEO/meta — see skills below).
8. **Quality-gate** with `content-quality-auditor` before considering a page done.
9. **Preview & lint** (see `AGENTS.md`): `mint dev` to preview, `mint broken-links` to check links.

**Content boundaries:** document the *product as users experience it*. Do **not** expose
backend internals (Temporal, NATS, ent, Kubernetes, orchestrator/agent pods, infra) — those
live in `streamloop-services` for *your* understanding only, never as user-facing docs.

---

## Which skills to use

These are installed and auto-trigger by description; you can also invoke them explicitly.

| Skill | Use it when |
|---|---|
| **`mintlify`** | Anything structural: component syntax/props, `docs.json` config, navigation, MDX conventions, API ref pages. Reach for this constantly. |
| **`seo-content-writer`** | Drafting a new guide, how-to, or landing-style page targeting a search intent/keyword (e.g. "how to stream a pre-recorded video to YouTube 24/7"). |
| **`geo-content-optimizer`** | Making a page citation-ready for AI engines (ChatGPT, Perplexity, Google AI Overviews, Gemini, Claude). High value here — Streamloop's audience discovers tools via AI search, and the docs expose an AI assistant/MCP. |
| **`meta-tags-optimizer`** | Tuning each page's `title`/`description` frontmatter and Open Graph for CTR — these *are* the meta tags Mintlify renders. |
| **`schema-markup-generator`** | Generating JSON-LD (HowTo, FAQ, Article) for rich results on procedural/FAQ pages. |
| **`content-quality-auditor`** | The publish gate — run an E-E-A-T / readiness pass on a page before it ships. |
| **`domain-authority-auditor`** | Occasional site-level trust/credibility/citation review, not per page. |
| **`entity-optimizer`** | Keeping "Streamloop" a consistent canonical entity (brand naming, Knowledge Graph, `sameAs`) across the docs. |

**Typical pipeline for a new page:** research (`gh` + live app) → `seo-content-writer` draft
→ `mintlify` for components & `docs.json` wiring → `geo-content-optimizer` + `meta-tags-optimizer`
→ `content-quality-auditor` gate → `mint dev` / `mint broken-links`.
