# RIN Design System

Status: living document — the foundation every future visual change should
build on, not a one-off spec. Update it in the same commit as any change
that adds a new token, pattern, or exception to what's written here.

## Why this exists

RIN has been styled incrementally across several sessions, by more than one
contributor, with no shared reference. The result works but drifts: a dark
near-black gradient crept into the header and the queue's stat strip, the
canvas background is a beige inherited from an early pass, and nothing ties
the palette back to OCBC's own brand. This document fixes that — one place
that says what RIN should look like, so the next change (by a person or by
Claude) extends the system instead of adding another one-off.

## Grounding: this is sampled from OCBC's real app, not guessed

On 2026-09-20 the user provided four screenshots of the live OCBC Singapore
mobile app (`image/IMG_5217.PNG` through `IMG_5220.PNG` — the home screen,
Payments & Transfers, Rewards, and the More menu). Every color value below
that's marked **(sampled)** was read directly from pixel data in those
files, not estimated by eye. The nine `.HEIC` photos in the same folder are
unrelated — they're phone photos of a "Prototype Improvement Guide" Word
document (feature backlog notes) and carry no visual reference value.

If better source material becomes available (an official brand guideline
PDF, the OCBC logo as vector art, more app screens), re-sample and update
the values here — don't let this document's numbers go stale relative to
better evidence.

What the four screenshots show, consistently, across every screen:

- **One saturated red carries the entire brand** — used for the header bar,
  hero banners, primary CTAs, active nav states, and small accent icons.
  Nothing else competes with it for attention.
- **No black, anywhere.** Where an app built on a typical dark-mode
  instinct would reach for black or near-black (the header, a hero banner,
  a status bar), OCBC's app reaches for the brand red instead, at full
  saturation. The one dark neutral that does appear (the "Log in" button)
  is a muted blue-slate, not black or graphite.
- **Backgrounds are pale pink-white, not pure white and not beige.** Every
  page background sampled came back in the `#F7F1F1`–`#FAF7F6` range — a
  warmth comes from pink, not from yellow/beige.
- **Cards are white, flat, generously rounded, softly shadowed** — no
  visible borders doing the work; separation comes from a very light drop
  shadow and whitespace.
- **Icons are thin-line, rounded, mostly monochrome dark-gray**, with red
  used sparingly as an accent (a filled circle behind one icon, a red glyph
  inside an otherwise gray set) rather than applied to every icon.

## Color

### Brand red (sampled)

| Token | Hex | Sampled from |
|---|---|---|
| `red` (primary) | `#E30613` | Home screen accent curve, solid fill |
| `red-deep` | `#C4020D` | Extrapolated gradient end from the Rewards banner (`#D10612` → `#E41924` observed) |
| `red-wash` | `#FDEFF0` | Computed: `red` at ~6% over white, matching the pink-white backgrounds sampled across all four screens |

`red` is the one color allowed to carry real visual weight — primary
buttons, active nav/tab states, key numerals, focus rings, hero gradients.
Use `red-deep` only as the far end of a gradient anchored at `red`, never
as a flat fill on its own — a flat `red-deep` panel reads as maroon, which
photographs as "old bank," not "future bank."

### Neutrals and surfaces

| Token | Hex | Role |
|---|---|---|
| `canvas` | `#F7F1F1` | Page background — pale pink-white **(sampled)**, replaces the earlier beige `#EDEAE5` |
| `card` | `#FFFFFF` | Card/surface fill |
| `sunk` | `#F5EFEE` | Recessed fill inside a card (why-boxes, code-like blocks) — a shade closer to `canvas` than `card` |
| `ink` | `#191A1C` | Primary text |
| `ink-2` | `#4A5560` | Secondary text |
| `ink-3` | `#8D9299` | Tertiary text, captions, disabled |
| `hairline` / `hairline-2` | `rgba(23,23,23,.09)` / `rgba(23,23,23,.16)` | Card borders, dividers |
| `slate` / `slate-hi` | `#3F535E` / `#33454E` | The one dark neutral RIN is allowed — secondary buttons, quiet emphasis. This is close to the muted blue-slate OCBC itself uses for its "Log in" button; it reads as considered, not as a fallback for "we ran out of red." |

`ink` at full strength is for **text only**. See the hard constraint below
— it must never be a fill color for a panel, card, or hero surface.

### Semantic (status) colors — unchanged, not brand-red territory

| Token | Hex | Meaning |
|---|---|---|
| `green` | `#16775F` | Pass / compliant / favorable |
| `gold` | `#8A6210` | Flag / caution |
| `red` (reused) | `#E30613` | Block / fail — the one place brand red and semantic red are the same color, which is intentional: a blocked gate should look exactly as urgent as the brand itself |

Each gets a `-wash` background at ~6–8% opacity over `card`, following the
existing `pill-pass` / `pill-flag` / `pill-block` pattern — no change
needed there, they already sit inside this system correctly.

## Hard constraint: no black backgrounds

**No component, panel, card, header, or hero surface renders as black,
near-black, or graphite.** This is not a preference — treat it as a lint
rule. If a surface needs visual weight or contrast, reach for one of:

1. **Brand red**, solid or as a gradient (`red` → `red-deep`) — the OCBC
   app's own answer to "this needs to feel important."
2. **`slate`** — for a quiet, secondary dark surface that isn't trying to
   be the hero (a secondary button, a muted footer).
3. **A light glass/glow treatment** (below) — contrast through blur,
   shadow, and a red-tinted gradient mesh, not through darkness.

There is deliberately no `graphite` token and no `.panel-dark` class any
more — both were removed on 2026-09-20 so that the easy dark option simply
isn't there to reach for. Don't reintroduce them.

## The look: light glass + red glow

RIN's futurism comes from **light and glow, not darkness**. Concretely:

- **Glow rings** on the numbers that matter most (the signal score, a stat
  strip's headline figure): a soft, diffused red shadow behind the number
  rather than a hard outline.
  ```css
  .glow-red {
    box-shadow: 0 0 0 1px rgba(227,6,19,0.10), 0 0 32px 4px rgba(227,6,19,0.16);
  }
  ```
- **Gradient mesh backgrounds** for hero/summary surfaces — soft, large,
  low-opacity red radial gradients over the pink-white canvas, not a flat
  fill:
  ```css
  .mesh-red {
    background:
      radial-gradient(at 15% 20%, rgba(227,6,19,0.08), transparent 55%),
      radial-gradient(at 85% 0%,  rgba(227,6,19,0.05), transparent 50%),
      #FBF3F4;
  }
  ```
- **Glass panels** keep the existing `.glass` / `.glass-tight` treatment
  (white/near-white fill, hairline border, soft shadow) — this already
  matches OCBC's flat, softly-shadowed card language and needs no change.
- **Tabular, monospace numerals** (`.num`, already in use) for anything
  that reads as live data — scores, counts, currency — reinforces the
  "instrument panel" feeling without needing a dark background to do it.
- **Thin dividers, not boxes**, to separate stat blocks sitting side by
  side (a 1px line, not a bordered cell) — keeps a dashboard-dense layout
  from feeling heavy.

Motion, in two registers:

- **Transitions** (a change the user caused): under ~250ms. Bubble
  slide-in is 220ms; the draft's red flash on rewrite is 900ms but it's a
  decay, not a delay — the content is already there.
- **Presence** (ambient, signalling a state): allowed to be slow because
  nothing is waiting on it. The RIN orb breathes on a 2.8s loop when idle
  and 1.1s with an orbiting ring while thinking; typing dots bounce; a
  reply streams in word-by-word with a caret, capped at 1.2s regardless of
  length so a long reply never drags. These live in `src/index.css` under
  "RIN, the assistant" and are what makes the chat read as a *someone*
  rather than a form. Don't add ambient motion to anything that isn't RIN.
- Both registers stop under `prefers-reduced-motion: reduce` — the orb
  holds its idle glow, the dots hold, the caret holds. That block lives at
  the bottom of `src/index.css`, right after the keyframes.

RIN is a decision tool an RM uses dozens of times a day — anything the RM
has to wait on that runs past ~250ms reads as friction, not as "future."

## Typography

Unchanged — already working well and not brand-specific:

- Sans: `"Hanken Grotesk"` — bold, geometric, reads as confident without
  being cold. Keep it as the one typeface; don't introduce a serif or a
  second display face.
- Mono: `"IBM Plex Mono"`, used only for `.num` (tabular figures) and `.src`
  (source citations) — never for prose.
- Scale (`t-display` / `t-h1` / `t-h2` / `t-h3` / `t-lead` / `t-body` /
  `t-meta` / `t-micro`) stays as defined in `src/index.css`. `.t-micro`
  renders uppercase — remember this when writing Playwright assertions
  against it (case-insensitive match, or match on the CSS class instead of
  literal text).

## Components — what's already right, what needs to change

**Keep as-is** (already consistent with this system):
`.glass`, `.glass-tight`, `.pill*`, `.dot*`, `.btn-red`, `.orb`.

**Also in the system now** (applied 2026-09-20):
- `.mesh-red` — the hero surface (client-page impact hero, queue stat strip).
- `.glow-red` / `shadow-glow` / `shadow-glow-sm` — the red glow ring, used on
  the header mark, active nav tab, and primary buttons.
- `.btn-primary` is `bg-red` with `bg-red-deep` on hover; `.btn-red` is now
  visually identical and kept only so existing call sites don't churn.
- The RIN avatar in Outreach chat is a red gradient — RIN is the brand, so
  it wears the brand color. The RM's own bubbles stay `slate`.
- The modal scrim is `slate/30` with a backdrop blur, not a black overlay.
- `StatStrip` (`src/components/ui/StatStrip.tsx`) — the only place a
  summary number renders in `red` at display size. Queue and Past week
  both use it. Don't hand-roll a third version of this.
- Cards are `.glass` (shadow) when they are the page's content and
  `.glass-tight` (no shadow) when they are rows inside something else.
  Queue cards, blocked cards, news groups and past-week themes are
  content; handed-off rows, dismissed rows, client-list rows and info
  cards inside the client page are rows.
- Metric bars (urgency/relevancy/momentum/conviction on a queue card) are
  one colour (`slate`). They're measurements, not statuses — don't recolor
  one to imply "this one's a warning."
- A pill is a label, not a sentence. If the text needs a clause, put the
  clause in `title` (a tooltip) or in `t-meta` beside it, not inside the
  pill.

## Do / Don't

**Do:**
- Reach for `red` first whenever something needs to feel important.
- Let a card's shadow and whitespace do the separating; borders are for
  structure (dividers inside a stat strip), not for making a card "pop."
- Use `slate` when you want dark-but-quiet — a secondary action, not a
  hero.
- Sample real reference material when you have it, and record what you
  sampled and from where (see the Grounding section) so the next person
  can trust the numbers without re-deriving them.
- Write copy in the RM's own vocabulary. Banking terms they use daily
  (suitability, KYC, mandate, concentration, fixed deposit) stay; words
  that describe RIN's own machinery (gate, driver, ranking, correlated
  conviction cluster) don't belong on screen — say what happened instead
  of naming the mechanism that decided it.

**Don't:**
- Don't add a second accent color competing with red for attention — the
  reference app doesn't have one, and neither should RIN.
- Don't use `graphite`/`ink` as a fill. `ink` is for text.
- Don't default to a hard drop shadow or a black overlay for depth — reach
  for `.glow-red` or `.mesh-red` instead.
- Don't introduce beige/cream tones — the canvas is pink-white, sampled
  directly from OCBC's own app, not a warm neutral chosen for taste.
- Don't repeat a fact the page already shows one card away (tier, mandate,
  KYC under a client's name *and* again in the Relationship card, for
  example). Say it once, in the place it belongs.

## Migration log

**2026-09-20 — applied across the app.** The `graphite` token and the
`.panel-dark` class are gone from the codebase entirely; `canvas` moved to
the sampled pink-white; `.btn-primary`, the header mark, the active nav
tab, the queue stat strip, the client-page hero, the Outreach RIN avatar,
the modal scrim, and the signal-score numeral all now follow this
document. A `grep -rn "graphite\|panel-dark\|bg-black" src` returns
nothing — if it ever does again, that's a regression against this file.

**2026-09-20 — polish pass.** `prefers-reduced-motion` support for RIN's
ambient animation; single-row phone nav; `glass` standardised on content
cards; red demoted off the queue card's rank eyebrow and the metric bars
(now one colour); Clients tab shows exceptions only (review lapsed,
in-queue) instead of an identical pill on every row; Blocked gate rows
stack on phone instead of squeezing the reason text; News pills shortened
to a single word with the detail in a tooltip, and `Inferred` moved off
the heaviest (`slate`) fill since it's the less certain state; `StatStrip`
extracted and shared by Queue and Past week; Outreach's client `<select>`
restyled to match the pill family; a plain-English copy pass across every
page (RM vocabulary stays, RIN's internal words don't). Plan:
`docs/superpowers/plans/2026-09-20-design-polish.md`.

When you add a surface that needs weight, the check is: is it `red`,
`slate`, or `.mesh-red`? If it's none of those, stop.
