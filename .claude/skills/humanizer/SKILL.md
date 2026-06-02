---
name: humanizer
description: Use when asked to humanize text, remove "AI smell" / AI writing signals, make a draft sound less AI-generated, or edit writing to read naturally. Strips generic phrasing, breaks robotic sentence rhythm, cuts overexplaining, swaps abstractions for concrete detail, and adds human judgment. Works on any prose — docs, articles, posts, emails.
---

# Humanizer

Edit AI-sounding prose into writing that reads like a person wrote it. Use this when the
request is to "humanize", "make this sound less like AI", "remove the AI smell", "de-robotize",
or "tighten this draft so it doesn't read generic." Also apply it as a finishing pass after
drafting content with other writing skills (e.g. `seo-content-writer`).

## The core test

After editing, **every sentence must do at least one of these:**

- **Add insight** — a non-obvious point the reader didn't already have.
- **Add evidence** — a fact, number, example, or source.
- **Add perspective** — a judgment, stance, or angle.
- **Add useful context** — something that helps the reader act or decide.

If a sentence does none of these, delete it. That single rule does most of the work.

## The 10 AI signals to find and eliminate

Before writing or while editing, hunt down and remove:

1. Generic opening paragraphs
2. Predictable conclusions
3. Repetitive sentence structures
4. Excessive transitions ("Moreover," "Furthermore," "In addition," "As we can see")
5. Overly balanced arguments (both-sides hedging that commits to nothing)
6. Generic observations
7. Empty motivational language
8. Unnecessary explanations
9. Corporate-style phrasing
10. Statements that sound intelligent but add little value

## How to run it

Pick the mode that fits the ask. For a general "humanize this," run the **default pass**
(modes 1 → 4 → 5 → 3 → 6, with mode 2 as the diagnostic). For a targeted fix, run a single mode.
Preserve the author's meaning and facts — change how it reads, not what it claims. When you cut
or sharpen something, you may briefly note *why* if the user is iterating; otherwise just return
clean text.

### Mode 1 — Signal removal (write or rewrite)
Identify and eliminate the 10 signals above, then rewrite so every sentence passes the core
test (insight / evidence / perspective / context). Remove everything else.

### Mode 2 — Detect generic sentences (diagnostic)
Find every sentence that could appear in thousands of AI-generated articles. For each one:
explain why it feels generic, rewrite it with a stronger observation, increase specificity, and
add a clearer perspective. Then give the fully improved version.

### Mode 3 — Break AI sentence patterns
AI writing falls into predictable rhythms. Rewrite using:
- Mixed sentence lengths
- Different paragraph sizes
- Occasional short fragments
- Less predictable flow
- More natural pacing

Avoid mechanical consistency. The result should feel written, not generated.

### Mode 4 — Remove overexplaining
Cut: obvious explanations, repeated ideas, unnecessary background, filler transitions, and
sentences that add little. Keep only what moves the reader forward.

### Mode 5 — Replace abstractions with reality
Swap vague statements, abstract claims, broad advice, and generic examples for concrete
scenarios, specific observations, practical consequences, and real-world implications. Make every
point easy to visualize.

### Mode 6 — Add human judgment
AI presents; humans evaluate. Where appropriate: prioritize ideas, compare alternatives,
highlight weaknesses, name trade-offs, challenge assumptions, and state confidence levels.
Support every judgment with reasoning.

## Notes

- Don't overcorrect into quirkiness — natural ≠ gimmicky. No forced slang, no random
  capitalization, no em-dash spam.
- Keep technical accuracy and any required terminology intact.
- For docs in this kind of repo, pair with the project's style rules (active voice, second
  person, sentence-case headings) rather than fighting them.
