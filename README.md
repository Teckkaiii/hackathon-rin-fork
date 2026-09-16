# RIN — Revenue Intelligence Network (synthetic prototype)

A synthetic, judge-facing prototype for OCBC's Premier & Private Banking RMs. RIN
resolves overnight market signals against client exposures, applies deterministic
compliance gates, and surfaces a ranked, explained shortlist of client engagement
opportunities. It coordinates RM judgement; it does not replace it.

Built as a Vite + React + TypeScript app (see `reference/RIN_Prototype_Build_Prompt.md`
for the full spec this was built against).

## Running it

This is a real app now, not a static file — **do not open `index.html` by
double-clicking it**; it will show a blank page because the browser can't execute
the raw TypeScript entry point without a server.

```sh
npm install       # first time only
npm run dev       # http://localhost:5173, hot-reloads as you edit
```

For a production-style build (closer to what a judge would see, no dev tooling):

```sh
npm run build     # writes dist/
npm run preview   # serves dist/ at http://localhost:4173
```

`npm run typecheck` runs `tsc --noEmit` on its own if you want a fast check without
building.

## Project layout

```
src/
  data/            products, drivers, clients, opportunities, momentum —
                   plain JSON
  types.ts         shared type definitions
  lib/             gates, ranking/filtering, signal scoring, binding-
                   constraint ordering, draft checks, news-impact matching,
                   weekly momentum classification — the actual decision logic
  state.ts         one typed reducer driving all app state
  components/      one component per module, plus small ui/ primitives
  App.tsx          shell: masthead, nav, view switch
legacy/            the previous single-file HTML version, kept for reference
reference/         project context docs, the build prompt, and a prior
                   prototype used only as a visual reference
tools/             verify.js (Playwright suite), serve.js (static server for
                   verifying a production build), screenshot.js
```

## The modules

1. **Queue** — the ranked daily opportunity list. Ranking is quantified by a
   signal score combining momentum (is the underlying trend durable or
   choppy this week?), relevancy (does the news actually touch this client's
   portfolio, or just something adjacent?), urgency (window to act) and
   conviction (how many distinct pieces of news corroborate the impact) —
   surfaced per-opportunity as qualitative High/Medium/Low pills, never as a
   raw number. Also: hard gates vs soft filters, correlated-conviction
   clusters, park/dismiss with a governed cadence.
2. **Clients** — a position page per client, ordered by whichever constraint
   is most binding today, every figure evidence-traced to its source,
   including a client's cross-border footprint (operating countries,
   investment locations, transaction corridors, treasury exposures,
   relationship footprint) where relevant. Clients withheld by a compliance
   gate live in Blocked instead of appearing here.
3. **Blocked** — every client withheld from the Queue entirely by a hard
   compliance gate, with the full gate-by-gate reasoning. Kept out of
   Clients and Outreach until the blocking condition clears — no filter
   setting can surface these; gates always run before any ranking.
4. **Outreach** — drafts a client message (approach-specific when there's an
   active opportunity, free-form otherwise) and checks it against the
   client's own record (fact-trace, advice-boundary, disclosure, register)
   before it goes. Nothing sends without explicit RM approval; every
   send/non-send writes to an outcome ledger. Blocked clients aren't
   selectable here.
5. **News** — market/desk events from the last day, read against the RM's own
   book: which clients are affected, how severely, and whether the impact is
   confirmed (already linked to a signal on an opportunity) or inferred (a
   holdings match RIN hasn't had reviewed). Items reaching several clients
   severely are flagged.
6. **Past Week** — seven days of daily impact reads per theme, against the
   RM's own book. A theme where every day landed the same direction of impact
   is high momentum, durable enough to build a recommendation around; a theme
   that flips between favorable and adverse is low momentum, and clients
   touched only by low-momentum themes are deprioritized rather than pushed
   toward a long-term action the trend doesn't actually support.

Hard constraints the build honors throughout: no composite client score
digit shown anywhere (the signal score drives sort order but only its
qualitative High/Medium/Low breakdown is ever rendered), no propensity/
acceptance score, gates always run before ranking, and no invented revenue
figures (amount-at-stake only, not predicted benefit).

## Verifying changes

```sh
npm run build
node tools/verify.js
```

`verify.js` builds nothing itself — run `npm run build` first. It serves `dist/`
locally and drives it with Playwright: all 6 modules, all 6 required
demonstration scenes (a refusal, gates vs. filters, a caught inconsistency, a
parked opportunity resurfacing, a correlated cluster, an expired document
blocking action), the signal-score ranking and momentum classification, zero
JS errors, no horizontal overflow at 1400px or 400px.

## Data model notes

All data is synthetic and lives in `src/data/*.json`. `TODAY` (the simulated
"as-of" date) is fixed in `src/lib/format.ts` — every age/expiry/days-to-act
figure is computed from that constant, not from the real clock, so the demo
reads consistently regardless of when it's actually run.
