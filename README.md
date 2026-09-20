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
  lib/             gates, ranking, signal scoring, binding-
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
   signal score (0–100) combining momentum (is the underlying trend durable
   or choppy this week?), relevancy (does the news actually touch this
   client's portfolio, or just something adjacent?), urgency (window to act)
   and conviction (how many distinct pieces of news corroborate the impact).
   The score is shown on the card; clicking it expands the four-dimension
   breakdown, each also scored out of 100. Also: hard compliance gates,
   correlated-conviction clusters, and an agent that routes each opportunity
   to its next step — draft a message, refer to a specialist desk, or call
   the client to clarify — with its reasoning shown on the card and the RM
   free to overrule it.
2. **Clients** — a position page per client, ordered by whichever constraint
   is most binding today, every figure evidence-traced to its source,
   including a client's cross-border footprint (operating countries,
   investment locations, transaction corridors, treasury exposures,
   relationship footprint) where relevant. Clients withheld by a compliance
   gate live in Blocked instead of appearing here.
3. **Blocked** — every client withheld from the Queue entirely by a hard
   compliance gate, with the full gate-by-gate reasoning. Kept out of
   Clients and Outreach until the blocking condition clears; gates always
   run before any ranking.
4. **Outreach** — a conversation with RIN. RIN drafts the message from the
   client's record and the opportunity that surfaced them; the RM shapes it
   by chatting ("more casual", "add the figures") or with preset chips, and
   the draft updates live. Pressing Send runs the checks (fact-trace,
   advice-boundary, disclosure, register) as the last gate: a clean draft
   goes, a draft with problems is refused in chat with a one-click fix.
   Every send/non-send writes to an outcome ledger. Blocked clients aren't
   selectable here.
5. **News** — market/desk events from the last day, grouped by client rather
   than by story, each client's list led by whichever item is most
   impactful to them. Read against the RM's own book: which clients are
   affected, how severely, and whether the impact is confirmed (already
   linked to a signal on an opportunity) or inferred (a holdings match RIN
   hasn't had reviewed). Items reaching several clients severely are
   flagged. Paste a headline or a link at the top and RIN says what it is,
   which of your clients it touches, and offers a draft for each.
6. **Past Week** — seven days of daily impact reads per theme, against the
   RM's own book. A theme where every day landed the same direction of impact
   is high momentum, durable enough to build a recommendation around; a theme
   that flips between favorable and adverse is low momentum, and clients
   touched only by low-momentum themes are deprioritized rather than pushed
   toward a long-term action the trend doesn't actually support.

Hard constraints the build honors throughout: no propensity/acceptance
score, gates always run before ranking, and no invented revenue figures
(amount-at-stake only, not predicted benefit). The signal score (0–100,
with its urgency/relevancy/momentum/conviction breakdown) is shown on the
opportunity card by design — it drives sort order and the RM can see the
number behind it.

## Verifying changes

```sh
npm run build
node tools/verify.js
```

`verify.js` builds nothing itself — run `npm run build` first. It serves `dist/`
locally and drives it with Playwright: all 6 modules, all 6 required
demonstration scenes (a refusal, a compliance gate withholding an item, a caught inconsistency, an
opportunity routed to a specialist and handed off, a correlated cluster, an
expired document blocking action), the signal-score ranking and momentum
classification, zero
JS errors, no horizontal overflow at 1400px or 400px.

## Data model notes

All data is synthetic and lives in `src/data/*.json`. `TODAY` (the simulated
"as-of" date) is fixed in `src/lib/format.ts` — every age/expiry/days-to-act
figure is computed from that constant, not from the real clock, so the demo
reads consistently regardless of when it's actually run.
