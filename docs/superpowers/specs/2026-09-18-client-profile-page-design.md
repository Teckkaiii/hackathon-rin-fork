# Client profile page redesign — design

Date: 2026-09-18
Status: approved, ready for implementation planning

## Problem

The client detail page is a compliance artifact, not a profile. It opens on
a red/gold "binding constraint" banner, lists dimensions in a rule-derived
order, and buries the client's own identity under an avatar and a dense meta
line. There is nowhere on it that explains, in plain English, why today's
news actually matters to this specific person — the queue's why-boxes are
one sentence each, by design, and RIN currently has nowhere to send an RM who
wants more than one sentence.

## Scope

In scope:

1. Rebuild the client detail page as a profile: identity header, a full
   narrative explanation of the client's active news impact, then organized
   information cards (basic info, risk profile, portfolio, cross-border,
   complaints).
2. Each of the queue card's three why-boxes becomes a link to that client's
   profile page.
3. Remove the binding-constraint banner and the "Related opportunity" card.
4. Visual pass: bolder name, no avatar icon, one line of identity under the
   name (segment only), card system applied consistently ("futuristic" =
   consistent eyebrow labels, a gradient-edged hero card, generous spacing —
   not new components or a new visual language).

Out of scope: the client list page's row layout beyond removing the avatar
and the RM/tier meta line (item 5 of the request touches the list only in
that one way — the rest of item 5 is about the detail page). The Blocked,
Outreach, News and Past Week views. The signal scoring and routing logic.

## Data additions

Three additions, all in `src/types.ts` and the JSON fixtures. All eight
opportunities and all eight clients get real values — even though only
Aisha Rahman's three unblocked clients (Chen, Priya, David) ever render on
screen — so the types stay honest and nothing downstream has to special-case
a missing field.

### `Opportunity.narrative`

```ts
export interface OpportunityNarrative {
  whatHappened: string;
  whyThisClient: string;
  whatItMeans: string;
  whatToDo: string;
}
```

Four short paragraphs, plain English, no jargon, each answering exactly the
question its key names. `whatHappened` describes the news event itself (or,
for an internally-triggered opportunity, what changed in the portfolio —
there is no external event to report). `whyThisClient` connects the event to
this specific holding or record. `whatItMeans` states the concrete
consequence if nothing is done. `whatToDo` is the recommended next step in
one sentence, matching the opportunity's `approach`.

Exact text for the three clients that render on screen (used verbatim by the
plan and asserted on by the harness):

**Chen (`op-chen`, rate-cut):**
- whatHappened: "The desk expects SGD short-term interest rates to ease by
  around a quarter of a percentage point before the end of the quarter,
  based on softer inflation data released this week."
- whyThisClient: "Chen's SGD 380,000 fixed deposit is his only rate-locked
  instrument, and it matures on 26 September — right in the window this
  rate move is expected to land."
- whatItMeans: "If the deposit is left to roll over automatically, it will
  renew at whatever lower rate applies on the maturity date, locking in the
  loss for a full new term."
- whatToDo: "A short call before 26 September to lock in today's rate with a
  new structured deposit, before the expected move takes effect."

**Priya (`op-priya`, sector-semis):**
- whatHappened: "A guidance cut of roughly 8% was published this morning
  across the foundry segment, following a wafer-demand downgrade shared by
  peer companies."
- whyThisClient: "42% of Priya's portfolio sits in a single foundry-segment
  holding — well past the 30% concentration guideline for her mandate, so
  this news lands directly on her largest position."
- whatItMeans: "The concentration was already above guideline before this
  morning; a sector-wide downgrade on the same name increases how much a
  single bad quarter could cost her."
- whatToDo: "A discretionary-mandate conversation about the concentration
  itself — not a sale recommendation, a conversation about whether the size
  of the position still matches her mandate."

**David (`op-david`, internal, no driver):**
- whatHappened: "No external event triggered this — David's trailing
  portfolio income has been tracked against the objective he set, and it
  has now sat below that objective for a full quarterly review cycle."
- whyThisClient: "His trailing income is SGD 21,400 a year, 29% below the
  SGD 30,000 a year he told us he wanted this portfolio to produce."
- whatItMeans: "Left unaddressed, the gap persists into another review
  cycle without David having been given the chance to decide whether it
  still matches what he wants from this money."
- whatToDo: "A review call to walk through a higher-income reallocation,
  framed against the objective he set — not a yield-chasing pitch."

The remaining five opportunities (`op-tan`, `op-sarah`, `op-grace`,
`op-robert`, `op-michelle`) get narratives written the same way, in the
implementation plan, from their existing `whyClient` / `whyNow` /
`whyInstrument` fields — they are never asserted on by the harness and never
seen in the demo, so exact wording is the implementer's judgment as long as
all four fields are filled in with real sentences, not placeholders.

### `Client.riskProfile`

```ts
export interface RiskProfile {
  rating: string;
  horizon: string;
  lossTolerance: string;
  lastAssessed: string;
  notes: string;
}
```

`rating` mirrors the client's existing `risk` field ("Balanced", "Growth")
so the risk card is self-contained without cross-referencing the identity
card. Chen: horizon "5–7 years", lossTolerance "Moderate — can absorb a
short-term drawdown without changing plans", lastAssessed his existing
suitability-review date, notes "Prioritises capital preservation on
near-term maturities; open to growth allocations beyond a 5-year horizon."
Priya: horizon "7–10 years", lossTolerance "Above-average — mandate
accepts single-name concentration as a deliberate choice", lastAssessed her
suitability-review date, notes "Growth-oriented discretionary mandate;
concentration is a known and accepted feature of the strategy, subject to
the stated guideline." David: horizon "10+ years", lossTolerance
"Moderate", lastAssessed his suitability-review date, notes "Balanced
advisory mandate; income objective is the primary lens for any reallocation
conversation." The other five clients get analogous values in the plan.

### `Client.complaints`

```ts
export interface ComplaintRecord {
  date: string;
  channel: string;
  summary: string;
  status: 'Open' | 'Closed';
}
```

An array, empty for a client with none. Chen: one closed complaint — date
"2026-02-12", channel "Branch", summary "Delayed processing on a fixed
deposit renewal instruction", status "Closed". Priya: one open complaint —
date "2026-08-30", channel "Relationship Manager", summary "Discrepancy
queried on a custody statement for the foundry-segment holding", status
"Open". David: empty array — the complaints card renders "No complaints on
record." for him. The other five clients get an empty array unless the plan
finds a natural reason to give one a record; an empty array is the correct
default, not a gap to fill.

## Page structure

Order, top to bottom:

1. **Back link** — `← All clients`, unchanged.
2. **Identity header** — the client's name in bold sans-serif (the serif
   display face used elsewhere has no bold weight, and this name needs to
   read as the heading), at roughly the size of the existing `t-display`
   class. Directly under it, one line: the segment only ("Premier" or
   "Private"). No avatar, no RM name, no tier, no mandate, no risk rating —
   those move into Basic Information below.
3. **Impact hero** — full width, visually the focal card (a subtle
   slate-tinted gradient border or wash, distinct from the plain
   `glass-tight` cards below it). Eyebrow reads "HOW TODAY'S NEWS TOUCHES
   {FIRST NAME}" when the opportunity has a driver, or "WHAT CHANGED IN
   {FIRST NAME}'S PORTFOLIO" when it does not (`driverId === null`). Below
   the eyebrow: the driver's headline (or, when there is no driver, the
   opportunity's own `signal.headline`) with a recency pill next to it, then
   the four narrative paragraphs, each with its own small label (What
   happened / Why this client / What it means / What to do) followed by the
   sentence. If the client has no opportunity at all (not true for any of
   Aisha's three today, but the component must not crash if it becomes
   true), this section is omitted entirely.
4. **Two-column grid**, four cards: **Basic Information** (tier, RM,
   mandate, risk rating, KYC status + expiry, suitability last-reviewed date
   with months-ago and a red "Review lapsed" pill when over 12 months) ·
   **Risk Profile** (the four `riskProfile` fields) · **Portfolio**
   (each holding as a row: label, value, note; then, when present,
   concentration / idle-cash / income-vs-objective as additional rows in
   the same card; a source line at the bottom) · **Cross-Border Exposure**
   (the existing five rows, omitted entirely when `crossBorder` is null).
5. **Complaint Records** — full width. One row per complaint (date,
   channel, summary, a pass/block `Pill` for the status) or, when empty,
   "No complaints on record."

Every card uses the same visual pattern: an uppercase `t-micro`-style
eyebrow label, generous internal padding, and the existing `glass-tight`
treatment — this consistency is what "futuristic" means here, not a new
component system.

## Component split

`ClientDetail` moves out of `src/components/ClientsView.tsx` into its own
`src/components/ClientDetail.tsx`. `ClientsView.tsx` keeps only the list
view and the `ClientsView` export; `App.tsx`'s import of `ClientDetail`
changes accordingly. Two small local helpers live in the new file:
`InfoCard({ eyebrow, children })` (the card shell) and `KV({ label, value })`
(a label/value row) — both purely presentational, no state, reused across
every card in step 4.

`ClientDetail` drops its `onOpenOutreach` prop entirely — the "Related
opportunity" card it was for is removed, and nothing else in the redesigned
page sends a message. `App.tsx`'s `ClientDetail` usage drops the
corresponding `onOpenOutreach={...}` argument.

## Removed

- The binding-constraint banner and the `dims` array/sort in
  `ClientDetail` — replaced by the impact hero and the fixed four-card grid.
- `src/lib/binding.ts` and the `BindingConstraint` type in `types.ts` — no
  other file imports either.
- The "Related opportunity" card and the `Button`/`onOpenOutreach` it used.
- The `Orb` import and avatar from both the client list rows and the detail
  header. `Orb` itself stays in the codebase — `BlockedCard.tsx` and the
  queue's own history still reference it, so it is not dead. (Verify this at
  implementation time; if the client list was `Orb`'s only remaining
  consumer besides `BlockedCard`, that is fine — `BlockedCard` alone keeps it
  alive.)
- The RM / tier / mandate / risk line under the client list's name and under
  the detail header's name — tier, mandate and risk move into Basic
  Information on the detail page; the list row keeps only name and segment.

## Queue deep link

In `src/components/OpportunityCard.tsx`, each of the three `WhyBox` cells
(Why this client / Why now / Why this instrument) becomes a `<button
type="button">` wrapping its existing content, calling the same
`onOpenClient` handler the name button already calls. A hover treatment
(background tint, consistent with the rest of the card's interactive
elements) signals it is clickable. No new prop is needed — `onOpenClient` is
already passed to `OpportunityCard`.

## Testing

Same harness discipline as every prior change: `tools/verify.js` end to end
via `npm run typecheck && npm run build && node tools/verify.js`. Two
existing Module 2 assertions reference the removed binding-constraint
banner and must be rewritten, not deleted:

- `check('Priya binding constraint = concentration', /Binding
  constraint[\s\S]{0,200}Exposure concentration/i.test(txt));` → rewritten
  to assert the impact hero instead: Priya's page shows "Semiconductor
  sector correction" (or her narrative's whatHappened sentence) and her
  Portfolio card shows the 42%/30% concentration figures.
- `check('Cross-border footprint kept inside client description', ...)` →
  the same assertion text still holds once Cross-Border Exposure is one of
  the four grid cards; only the surrounding page changed, not this
  requirement.

New assertions the plan must add: clicking a why-box on the queue navigates
to that client's page (reuse the existing pattern from the Task-2 click-
target assertions); the impact hero's four narrative labels render on
Chen's page; the complaints card shows "Closed" for Chen, "Open" for Priya,
and "No complaints on record." for David; Basic Information shows tier and
RM (moved, not lost); no avatar/orb renders in the client list or on the
detail page.
