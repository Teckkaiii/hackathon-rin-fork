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

`graphite` (`#1C1D1F` / `#26282B`) and the `.panel-dark` component class in
`src/index.css` currently violate this and are **deprecated** — see
Migration Notes below. Do not use them in new work, and replace them where
you touch them.

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

Motion (not yet implemented anywhere, but the direction future work should
take): prefer a brief, subtle transition over a static change — a number
that ticks up rather than jumps, a glow that fades in rather than appears.
Keep every transition under ~250ms; RIN is a decision tool an RM uses
dozens of times a day, and anything slower reads as friction, not as
"future."

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

**Needs rework** to satisfy the no-black rule (tracked here, not fixed by
this document alone — see Migration Notes):
- `.panel-dark` (`bg-graphite`) — deprecated, replace with `.mesh-red` or a
  `slate` fill depending on how much visual weight the moment needs.
- `.btn-primary` (`bg-ink`) — should move to `red` as the primary action
  color; `ink` was likely chosen before this document existed and predates
  the "one red carries the brand" rule.
- The header's RIN mark (`bg-gradient-to-br from-slate via-graphite to-ink`)
  and the queue's stat strip (`from-graphite via-ink to-graphite`) —
  both graphite/ink gradients, both need to move to a red gradient or a
  `.mesh-red` light treatment.

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

**Don't:**
- Don't add a second accent color competing with red for attention — the
  reference app doesn't have one, and neither should RIN.
- Don't use `graphite`/`ink` as a fill. `ink` is for text.
- Don't default to a hard drop shadow or a black overlay for depth — reach
  for `.glow-red` or `.mesh-red` instead.
- Don't introduce beige/cream tones — the canvas is pink-white, sampled
  directly from OCBC's own app, not a warm neutral chosen for taste.

## Migration notes (as of 2026-09-20)

This document was written after the fact, against a codebase that already
has some now-nonconforming surfaces. They are not fixed by writing this
file — that's separate, deliberate follow-up work:

- `tailwind.config.js`: `canvas` is still `#EDEAE5` (beige) — should become
  `#F7F1F1`.
- `src/index.css`: `.panel-dark` still uses `bg-graphite`; `.btn-primary`
  still uses `bg-ink`.
- `src/App.tsx`: the header mark's gradient is `slate → graphite → ink`.
- `src/components/QueueView.tsx`: the stat strip's gradient is
  `graphite → ink → graphite`.

None of these are wrong in isolation — they were reasonable choices before
this document existed. They're listed here so the next pass through the UI
has a concrete checklist rather than having to re-discover the same four
spots.
