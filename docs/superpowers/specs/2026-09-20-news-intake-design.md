# Bring-your-own-news — design

**Date:** 2026-09-20
**Status:** approved in conversation, ready to plan

## The problem

The News tab shows RIN what the desk already tracks: seven drivers in
`src/data/drivers.json`, matched against every client's holdings. But an
RM's day is full of news RIN was never told about — a headline on the
Straits Times, a Bloomberg alert, a link a colleague sends. Today the RM
has to work out by hand which of their 23 clients it touches.

## What we're building

An input at the top of the News tab. The RM pastes a **headline** or a
**link**. RIN answers in its own voice with:

1. **A two-line brief** — what the story is, read against the desk's
   own notes.
2. **The exposed clients** in the RM's book, most affected first, each
   with the same *Confirmed / Inferred* and severity pills the News tab
   already uses, and a one-line reason.
3. **A "Draft outreach" button per client** that opens the Outreach
   chat for that client. Clients withheld by a compliance gate show a
   "Withheld" pill instead of the button.

If RIN can't tie the text to anything the book holds, it says so and
lists the kinds of stories it can read.

## How it works (deterministic, no backend)

The pitch is "RIN reads the story"; the mechanism is a classifier that
maps the pasted text onto one of the seven existing drivers, then reuses
the News tab's own matching (`lib/news.ts`) to find exposed clients.

- **Links:** the browser can't fetch a third-party page (no backend,
  CORS). News URLs carry their headline in the path slug —
  `.../business/mas-signals-easing-as-core-inflation-cools` — so the
  last path segment, split on hyphens, *is* the headline. The result
  panel names the source domain so it's clear what was read.
- **Headlines:** used as-is.
- **Classification:** each driver has a list of term patterns. The
  driver with the most matched terms wins; ties go to the driver listed
  first. Zero matches → the "couldn't tie that" reply.
- **Exposure:** `impactsForDriver(driverId, clientIds)` — the same
  confirmed-from-opportunity + inferred-from-holdings logic
  `newsItems()` uses, exported so the intake and the News tab can't
  drift apart.

## Interaction

- Input row: a pill-shaped text field (same family as the Outreach chat
  input) with placeholder *"Paste a headline or link…"* and a red
  **Ask RIN** button. Enter submits.
- On submit RIN "thinks" for ~600ms (typing dots on a RIN orb — the
  same presence motion the Outreach chat uses; RIN is the one thing
  allowed ambient motion), then the result panel slides in
  (`bubble-in`).
- The result panel is a `mesh-red` surface: RIN's brief in a chat
  bubble, then the client rows as `glass-tight` rows beneath it.
- The input keeps its text after submit so the RM can see what was
  read. A new submit replaces the result.
- State is local to the component (a page refresh or tab change clears
  it). Nothing is written to the ledger — reading news isn't a decision.

## Copy

- Brief, driver found:
  `Reads as: {driver.label}. {first sentence of driver.detail} Touches {n} of your clients — {c} confirmed against an open opportunity, {i} inferred from what they hold.`
  When `c` or `i` is zero, drop that clause: "— 1 confirmed against an open opportunity." / "— 3 inferred from what they hold."
- Brief, nothing found:
  `I couldn't tie that to anything your clients hold. I can read stories about SGD rates, REITs, credit spreads, FX moves, insurer bonus rates, and the semiconductor sector.`
- Source line under the brief, link case only: `Read from the link's headline · {hostname}`.
- Row reason: the existing `NewsImpact.reason` text, unchanged.
- Buttons: **Ask RIN**, **Draft outreach**. Withheld pill: **Withheld** (existing `block` variant, dot).

Plain-English rule from the design system applies: RM vocabulary stays,
RIN's internals (driver, classifier, slug) never appear on screen.

## Out of scope

- Fetching the actual article.
- Adding a new driver from arbitrary text — the seven drivers are the
  vocabulary; anything else is "couldn't tie that".
- Persisting the result across tabs or into the ledger.
- Any change to the existing News cards.

## Demo script

1. Paste `https://www.straitstimes.com/business/mas-signals-easing-as-core-inflation-cools`.
2. RIN: "Reads as: SGD rates expected to ease…" — Chen Wei Liang
   confirmed / high, six more inferred, Robert Teo withheld.
3. Click **Draft outreach** on Kevin Loh (news-only, no opportunity) —
   Outreach opens for Kevin.
4. Back to News, paste `Chip stocks slide as foundry guidance is cut`
   — Priya, confirmed.
5. Paste `Weather warning for the east coast` — RIN says it can't tie
   it to the book.
