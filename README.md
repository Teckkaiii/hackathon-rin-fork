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
  data/            products, drivers, clients, opportunities — plain JSON
  types.ts         shared type definitions
  lib/             gates, ranking/filtering, binding-constraint ordering,
                   Conversation Coach checks — the actual decision logic
  state.ts         one typed reducer driving all app state
  components/      one component per module, plus small ui/ primitives
  App.tsx          shell: masthead, nav, view switch
legacy/            the previous single-file HTML version, kept for reference
reference/         project context docs, the build prompt, and a prior
                   prototype used only as a visual reference
tools/             verify.js (Playwright suite), serve.js (static server for
                   verifying a production build), screenshot.js
```

## The five modules

1. **Queue** — the ranked daily opportunity list, hard gates vs soft filters,
   correlated-conviction clusters, park/dismiss with a governed cadence.
2. **Clients** — a position page per client, ordered by whichever constraint is
   most binding today, every figure evidence-traced to its source.
3. **Coach** — drafts a client message and checks it against the client's own
   record (fact-trace, advice-boundary, disclosure, register) before it goes.
4. **Outreach** — approach-specific drafts, nothing sends without explicit RM
   approval, every send/non-send writes to an outcome ledger.
5. **Desk View** — team-lead surface: coverage, refusal volume by reason,
   cross-RM clusters, documentation currency. No RM performance scoring.

Hard constraints the build honors throughout: no composite client score, no
propensity/acceptance score, gates always run before ranking, and no invented
revenue figures (amount-at-stake only, not predicted benefit).

## Verifying changes

```sh
npm run build
node tools/verify.js
```

`verify.js` builds nothing itself — run `npm run build` first. It serves `dist/`
locally and drives it with Playwright: all 5 modules, all 6 required
demonstration scenes (a refusal, gates vs. filters, a caught inconsistency, a
parked opportunity resurfacing, a correlated cluster, an expired document
blocking action), zero JS errors, no horizontal overflow at 1400px or 400px.

## Data model notes

All data is synthetic and lives in `src/data/*.json`. `TODAY` (the simulated
"as-of" date) is fixed in `src/lib/format.ts` — every age/expiry/days-to-act
figure is computed from that constant, not from the real clock, so the demo
reads consistently regardless of when it's actually run.
