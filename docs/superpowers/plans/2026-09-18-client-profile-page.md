# Client Profile Page Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rebuild the client detail page as an actual profile — identity header, a plain-English deep dive on why today's news matters to this client, then organized information cards — and link the queue's why-boxes straight into it.

**Architecture:** `ClientDetail` moves out of `ClientsView.tsx` into its own file and is rebuilt around three new data fields (`Opportunity.narrative`, `Client.riskProfile`, `Client.complaints`). Two small presentational helpers (`InfoCard`, `KV`) give every card the same look. The binding-constraint banner and its supporting `lib/binding.ts` are deleted; nothing else imports them.

**Tech Stack:** React 18, TypeScript 5.6 (strict), Vite 5, Tailwind 3. Verification is Playwright driving a built `dist/` via `tools/verify.js`.

**Spec:** `docs/superpowers/specs/2026-09-18-client-profile-page-design.md`

## Global Constraints

- **Verification command, run after every task:** `npm run typecheck && npm run build && node tools/verify.js`. The harness exits non-zero on any `FAIL` line *or* any browser console error. A task is not done until it exits 0.
- `tools/verify.js` serves `dist/`, not the dev server. **You must `npm run build` before `node tools/verify.js`.**
- **Stale server runbook:** if the harness prints `EADDRINUSE` for port 4310, a `serve.js` child from an interrupted run is still bound. Run `lsof -nP -iTCP:4310 -sTCP:LISTEN`, confirm the listener's command is `tools/serve.js` from this checkout, kill that PID, re-run.
- `tsconfig.json` sets `noUnusedLocals: false`. Unused imports will **not** fail typecheck — remove them by hand when a task says to.
- Client fixtures that render on screen: `chen` = "Chen Wei Liang" (routes to draft), `priya` = "Priya Ravindran" (routes to specialist), `david` = "David Ong" (routes to clarify). These three are the signed-in RM's (Aisha Rahman's) unblocked book and the only three cards in the queue / rows in Clients.
- Do not change `src/lib/signal.ts` or `src/lib/routing.ts`.
- Reuse the existing `Pill` and `Button` components. No UI library.

---

### Task 1: Data model — narrative, risk profile, complaints

Adds three new fields to the type system and fills in real values for every client and opportunity fixture. No UI changes yet — this task is pure data plumbing, so its own verification is `typecheck` + `build` + confirming the existing harness is still fully green (nothing in the UI reads these fields yet, so no assertion changes).

**Files:**
- Modify: `src/types.ts`
- Modify: `src/data/clients.json`
- Modify: `src/data/opportunities.json`

**Interfaces:**
- Consumes: nothing from earlier tasks.
- Produces: `OpportunityNarrative { whatHappened, whyThisClient, whatItMeans, whatToDo }` on every `Opportunity` as `narrative: OpportunityNarrative`. `RiskProfile { rating, horizon, lossTolerance, lastAssessed, notes }` on every `Client` as `riskProfile: RiskProfile`. `ComplaintRecord { date, channel, summary, status: 'Open' | 'Closed' }` on every `Client` as `complaints: ComplaintRecord[]`. Task 2 renders all three.

- [ ] **Step 1: Add the three types**

In `src/types.ts`, add after the `Holding` interface (before `CrossBorderProfile`):

```ts
export interface OpportunityNarrative {
  whatHappened: string;
  whyThisClient: string;
  whatItMeans: string;
  whatToDo: string;
}

export interface RiskProfile {
  rating: string;
  horizon: string;
  lossTolerance: string;
  lastAssessed: string;
  notes: string;
}

export interface ComplaintRecord {
  date: string;
  channel: string;
  summary: string;
  status: 'Open' | 'Closed';
}
```

Add `riskProfile: RiskProfile;` and `complaints: ComplaintRecord[];` to the `Client` interface, immediately after `crossBorder: CrossBorderProfile | null;`. Add `narrative: OpportunityNarrative;` to the `Opportunity` interface, immediately after `whyInstrument: string;`.

- [ ] **Step 2: Confirm the type change alone breaks the build**

```bash
npm run typecheck
```

Expected: errors on `src/data/clients.json` and `src/data/opportunities.json` not satisfying `Client`/`Opportunity` (TypeScript checks the `as Record<string, Client>` casts in `state.ts` and `lib/data.ts` structurally). This confirms the new required fields are actually required.

- [ ] **Step 3: Add `riskProfile` and `complaints` to every client**

Open `src/data/clients.json`. Add `"riskProfile"` and `"complaints"` to each of the eight client objects, immediately after each client's existing `"crossBorder"` key (before the object's closing `}`). Use exactly these values, keyed by client id:

```json
"chen": {
  "riskProfile": { "rating": "Balanced", "horizon": "5–7 years", "lossTolerance": "Moderate — can absorb a short-term drawdown without changing plans", "lastAssessed": "2026-03-20", "notes": "Prioritises capital preservation on near-term maturities; open to growth allocations beyond a 5-year horizon." },
  "complaints": [ { "date": "2026-02-12", "channel": "Branch", "summary": "Delayed processing on a fixed deposit renewal instruction", "status": "Closed" } ]
},
"priya": {
  "riskProfile": { "rating": "Growth", "horizon": "7–10 years", "lossTolerance": "Above-average — mandate accepts single-name concentration as a deliberate choice", "lastAssessed": "2026-06-01", "notes": "Growth-oriented discretionary mandate; concentration is a known and accepted feature of the strategy, subject to the stated guideline." },
  "complaints": [ { "date": "2026-08-30", "channel": "Relationship Manager", "summary": "Discrepancy queried on a custody statement for the foundry-segment holding", "status": "Open" } ]
},
"tan": {
  "riskProfile": { "rating": "Conservative", "horizon": "3–5 years", "lossTolerance": "Low — prioritises capital certainty over yield", "lastAssessed": "2026-01-18", "notes": "Prefers fixed-income instruments held to maturity; minimal appetite for mark-to-market volatility." },
  "complaints": []
},
"sarah": {
  "riskProfile": { "rating": "Balanced", "horizon": "5–7 years", "lossTolerance": "Moderate", "lastAssessed": "2026-02-10", "notes": "Recently received a lump sum from a property sale; no deployment decision made yet." },
  "complaints": []
},
"david": {
  "riskProfile": { "rating": "Balanced", "horizon": "10+ years", "lossTolerance": "Moderate", "lastAssessed": "2026-05-05", "notes": "Balanced advisory mandate; income objective is the primary lens for any reallocation conversation." },
  "complaints": []
},
"grace": {
  "riskProfile": { "rating": "Growth", "horizon": "7-10 years", "lossTolerance": "Above-average", "lastAssessed": "2026-04-11", "notes": "Comfortable with single-name exposure as part of a broader growth strategy." },
  "complaints": []
},
"robert": {
  "riskProfile": { "rating": "Balanced", "horizon": "5-7 years", "lossTolerance": "Moderate", "lastAssessed": "2025-05-02", "notes": "Suitability review is overdue; no new product conversation until it is refreshed." },
  "complaints": []
},
"michelle": {
  "riskProfile": { "rating": "Balanced", "horizon": "10+ years", "lossTolerance": "Moderate", "lastAssessed": "2026-03-02", "notes": "Insurance-linked holding; product conversations route through the Great Eastern policy record." },
  "complaints": []
}
```

Each block above is that client's two new keys — insert them into the existing object for that id, do not replace the whole object.

- [ ] **Step 4: Add `narrative` to every opportunity**

Open `src/data/opportunities.json`. Add `"narrative"` to each of the eight opportunity objects, immediately after each one's existing `"whyInstrument"` key. Use exactly these values, keyed by opportunity id:

```json
"op-chen": { "narrative": {
  "whatHappened": "The desk expects SGD short-term interest rates to ease by around a quarter of a percentage point before the end of the quarter, based on softer inflation data released this week.",
  "whyThisClient": "Chen's SGD 380,000 fixed deposit is his only rate-locked instrument, and it matures on 26 September — right in the window this rate move is expected to land.",
  "whatItMeans": "If the deposit is left to roll over automatically, it will renew at whatever lower rate applies on the maturity date, locking in the loss for a full new term.",
  "whatToDo": "A short call before 26 September to lock in today's rate with a new structured deposit, before the expected move takes effect."
} },
"op-priya": { "narrative": {
  "whatHappened": "A guidance cut of roughly 8% was published this morning across the foundry segment, following a wafer-demand downgrade shared by peer companies.",
  "whyThisClient": "42% of Priya's portfolio sits in a single foundry-segment holding — well past the 30% concentration guideline for her mandate, so this news lands directly on her largest position.",
  "whatItMeans": "The concentration was already above guideline before this morning; a sector-wide downgrade on the same name increases how much a single bad quarter could cost her.",
  "whatToDo": "A discretionary-mandate conversation about the concentration itself — not a sale recommendation, a conversation about whether the size of the position still matches her mandate."
} },
"op-tan": { "narrative": {
  "whatHappened": "The same SGD rate-easing move expected this quarter that affects fixed-rate instruments generally.",
  "whyThisClient": "Michael's SGD 250,000 corporate bond matures in 17 days, ahead of when the rate move is expected to land.",
  "whatItMeans": "Reinvesting after the move, rather than before it, risks locking in a lower running yield on the replacement instrument.",
  "whatToDo": "A notification with enough lead time to reinvest into a comparable-tenor bond ahead of the move."
} },
"op-sarah": { "narrative": {
  "whatHappened": "No external event triggered this — a cash balance from a July property sale has now sat uninvested past the 45-day idle-cash threshold for her segment.",
  "whyThisClient": "SGD 620,000 has been idle for 56 days without being reviewed against Sarah's stated objectives.",
  "whatItMeans": "Every additional day the balance sits uninvested is a day it is not working toward any stated goal.",
  "whatToDo": "A review call to size an income-oriented fund allocation against how much of the balance she actually wants deployed."
} },
"op-david": { "narrative": {
  "whatHappened": "No external event triggered this — David's trailing portfolio income has been tracked against the objective he set, and it has now sat below that objective for a full quarterly review cycle.",
  "whyThisClient": "His trailing income is SGD 21,400 a year, 29% below the SGD 30,000 a year he told us he wanted this portfolio to produce.",
  "whatItMeans": "Left unaddressed, the gap persists into another review cycle without David having been given the chance to decide whether it still matches what he wants from this money.",
  "whatToDo": "A review call to walk through a higher-income reallocation, framed against the objective he set — not a yield-chasing pitch."
} },
"op-grace": { "narrative": {
  "whatHappened": "A corporate action was announced this morning affecting a company Grace holds a significant position in.",
  "whyThisClient": "SGD 890,000 of her portfolio sits in the affected name.",
  "whatItMeans": "Ordinarily this would be a timely portfolio conversation about the position.",
  "whatToDo": "This conversation is currently withheld — see the Blocked tab for the information-barrier restriction in effect."
} },
"op-robert": { "narrative": {
  "whatHappened": "No external event — Robert's SGD 410,000 fixed deposit reaches its contractual maturity date in 6 days.",
  "whyThisClient": "A renewal decision on this deposit is due before 20 September regardless of any market move.",
  "whatItMeans": "Ordinarily this would be a straightforward renewal conversation.",
  "whatToDo": "This conversation is currently withheld — see the Blocked tab for the suitability-review restriction in effect."
} },
"op-michelle": { "narrative": {
  "whatHappened": "A bonus was declared on Michelle's Great Eastern policy this morning, affecting its surrender value.",
  "whyThisClient": "The updated figure sits on a policy record she holds outside OCBC Bank's own systems.",
  "whatItMeans": "Ordinarily this would be a policy-review conversation using the updated figure.",
  "whatToDo": "This conversation is currently withheld — see the Blocked tab for the cross-entity permission restriction in effect."
} }
```

- [ ] **Step 5: Verify the harness is still fully green**

```bash
npm run typecheck && npm run build && node tools/verify.js
```

Expected: `FAIL COUNT: 0` and `JS ERRORS: none` — identical result to before this task, since no UI reads the new fields yet.

- [ ] **Step 6: Commit**

```bash
git add src/types.ts src/data/clients.json src/data/opportunities.json
git commit -m "Add narrative, risk profile and complaint data to client fixtures

The queue's why-boxes are one sentence by design; the client page needs
somewhere to send an RM who wants the full plain-English explanation.
This adds the data — a four-part narrative per opportunity, a risk
profile and a complaint history per client — with no UI change yet.

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"
```

---

### Task 2: Rebuild the client detail page

Moves `ClientDetail` into its own file and rebuilds it: identity header, impact hero with the four-part narrative, a two-column information grid, and a complaints section. Removes the binding-constraint banner and the "Related opportunity" card.

**Files:**
- Create: `src/components/ClientDetail.tsx`
- Modify: `src/components/ClientsView.tsx` (remove `ClientDetail` and its `bindingConstraint`/`OPPS`/`PRODUCTS`/`Button` imports; keep only the `ClientsView` list export)
- Modify: `src/App.tsx` (import `ClientDetail` from its new file; drop the `onOpenOutreach` prop)
- Test: `tools/verify.js`

**Interfaces:**
- Consumes: `OpportunityNarrative`, `RiskProfile`, `ComplaintRecord` from Task 1.
- Produces: `ClientDetail({ clientId: string; onBack: () => void })` — no `onOpenOutreach` prop. `InfoCard({ eyebrow: string; children: ReactNode })` and `KV({ label: string; value: ReactNode })`, both local to `ClientDetail.tsx`, not exported — no later task needs them outside this file.

- [ ] **Step 1: Write the failing assertions**

In `tools/verify.js`, find this block in Module 2:

```js
  await page.locator('[data-client-id="priya"]').click();
  txt = await page.locator('main').innerText();
  check('Priya binding constraint = concentration', /Binding constraint[\s\S]{0,200}Exposure concentration/i.test(txt));
  check('Cross-border footprint kept inside client description', txt.includes('Cross-border footprint') && txt.includes('Operating countries'));

  await page.click('text=← All clients');
```

Replace it with:

```js
  await page.locator('[data-client-id="priya"]').click();
  txt = await page.locator('main').innerText();
  check('No binding-constraint banner on the client page', !/binding constraint/i.test(txt));
  check('No "Related opportunity" card on the client page', !txt.includes('Related opportunity'));
  check('Priya\'s impact hero names the semiconductor headline', txt.includes('Semiconductor sector correction'));
  check('Priya\'s narrative explains the concentration in plain English', txt.includes('42% of Priya\'s portfolio'));
  check('Cross-Border Exposure kept as its own card', txt.includes('Cross-Border Exposure') && txt.includes('Operating countries'));
  check('Portfolio card shows the concentration figures', txt.includes('42%') && txt.includes('30%'));
  check('Complaint Records shows Priya\'s open complaint', txt.includes('Complaint Records') && txt.includes('Open') && txt.includes('custody statement'));

  await page.click('text=← All clients');
  await page.waitForTimeout(150);

  await page.locator('[data-client-id="chen"]').click();
  txt = await page.locator('main').innerText();
  check('Chen\'s name renders bold and without an avatar icon', await page.locator('[data-testid="client-detail"] .orb').count() === 0);
  check('Chen\'s identity line shows only the segment', /Chen Wei Liang\s*\n\s*Premier\b/.test(txt) && !txt.includes('RM Aisha'));
  check('Impact hero shows all four narrative labels', ['What happened', 'Why this client', 'What it means', 'What to do'].every(s => txt.includes(s)));
  check('Basic Information card shows tier and RM (moved, not lost)', txt.includes('Basic Information') && txt.includes('Priority') && txt.includes('Aisha Rahman'));
  check('Risk Profile card renders', txt.includes('Risk Profile') && txt.includes('5–7 years'));
  check('Complaint Records shows Chen\'s closed complaint', txt.includes('Closed') && txt.includes('fixed deposit renewal'));

  await page.click('text=← All clients');
  await page.waitForTimeout(150);

  await page.locator('[data-client-id="david"]').click();
  txt = await page.locator('main').innerText();
  check('David\'s hero reflects no external driver', txt.includes('WHAT CHANGED IN DAVID\'S PORTFOLIO') || /what changed in david's portfolio/i.test(txt));
  check('Complaint Records shows the empty state for David', txt.includes('No complaints on record.'));

  await page.click('text=← All clients');
```

- [ ] **Step 2: Run the harness to verify it fails**

```bash
npm run build && node tools/verify.js
```

Expected: multiple `FAIL` lines — the page hasn't changed yet, so every new assertion about the hero, the removed banner, and the complaints card fails (the "No binding-constraint banner" and "No Related opportunity" checks will currently read `FAIL` because those elements are still present).

- [ ] **Step 3: Create `ClientDetail.tsx`**

Create `src/components/ClientDetail.tsx`:

```tsx
import type { ReactNode } from 'react';
import { CLIENTS } from '../state';
import { TODAY, fmt, fmtDate, monthsBetween } from '../lib/format';
import { OPPS } from '../lib/queue';
import { Pill } from './ui/Pill';

export function ClientDetail({ clientId, onBack }: { clientId: string; onBack: () => void }) {
  const c = CLIENTS[clientId];
  const opp = OPPS.find(o => o.clientId === clientId);
  const monthsSince = monthsBetween(new Date(c.suitability.lastReview + 'T00:00:00'), TODAY);
  const lapsed = monthsSince > 12;

  return (
    <div data-testid="client-detail">
      <button onClick={onBack} className="t-h3 text-slate mb-4 inline-flex items-center gap-1">&larr; All clients</button>

      <div className="font-sans text-[32px] font-extrabold leading-tight tracking-tight text-ink">{c.name}</div>
      <div className="t-meta mb-5">{c.segment}</div>

      {opp && (
        <div className="glass-tight border border-slate/25 bg-gradient-to-br from-[#EFF4F6] to-white p-5 mb-4">
          <div className="t-micro" style={{ color: '#33454E' }}>
            {opp.driverId
              ? `How today's news touches ${c.name.split(' ')[0]}`
              : `What changed in ${c.name.split(' ')[0]}'s portfolio`}
          </div>
          <div className="flex items-center gap-2 flex-wrap mt-1.5 mb-3">
            <div className="t-h2">{opp.signal.headline}</div>
            <Pill variant={opp.signal.recency === 'Internal' ? 'neutral' : 'flag'}>{opp.signal.recency}</Pill>
          </div>
          <div className="grid sm:grid-cols-2 gap-3.5">
            <NarrativeRow label="What happened" value={opp.narrative.whatHappened} />
            <NarrativeRow label="Why this client" value={opp.narrative.whyThisClient} />
            <NarrativeRow label="What it means" value={opp.narrative.whatItMeans} />
            <NarrativeRow label="What to do" value={opp.narrative.whatToDo} />
          </div>
        </div>
      )}

      <div className="grid md:grid-cols-2 gap-3.5 mb-3.5">
        <InfoCard eyebrow="Basic Information">
          <KV label="Tier" value={c.tier} />
          <KV label="RM" value={c.rm} />
          <KV label="Mandate" value={c.mandate} />
          <KV label="KYC" value={`${c.kyc.status} · expires ${fmtDate(c.kyc.expiry)}`} />
          <KV
            label="Suitability review"
            value={
              <span className="inline-flex items-center gap-2">
                {fmtDate(c.suitability.lastReview)} ({monthsSince} months ago)
                {lapsed && <Pill variant="block">Review lapsed</Pill>}
              </span>
            }
          />
        </InfoCard>

        <InfoCard eyebrow="Risk Profile">
          <KV label="Rating" value={c.riskProfile.rating} />
          <KV label="Horizon" value={c.riskProfile.horizon} />
          <KV label="Loss tolerance" value={c.riskProfile.lossTolerance} />
          <KV label="Last assessed" value={fmtDate(c.riskProfile.lastAssessed)} />
          <div className="text-[13.5px] text-ink-2 mt-2 leading-relaxed">{c.riskProfile.notes}</div>
        </InfoCard>

        <InfoCard eyebrow="Portfolio">
          {c.holdings.map((h, i) => (
            <KV key={i} label={h.label} value={`${fmt(h.value)} — ${h.note}`} />
          ))}
          {c.concentration && (
            <KV label="Concentration" value={`${c.concentration.pct}% in ${c.concentration.name} (guideline: ${c.concentration.threshold}%)`} />
          )}
          {c.idleCash && (
            <KV label="Idle cash" value={`${c.idleCash.days} days idle (threshold: ${c.idleCash.threshold} days)`} />
          )}
          {c.incomeObjective && (
            <KV label="Income vs objective" value={`${c.incomeObjective.actual.toLocaleString()} vs ${c.incomeObjective.target.toLocaleString()} ${c.incomeObjective.unit}`} />
          )}
          <div className="src mt-1.5">Source: {c.holdings[0].source}</div>
        </InfoCard>

        {c.crossBorder && (
          <InfoCard eyebrow="Cross-Border Exposure">
            <KV label="Operating countries" value={c.crossBorder.operatingCountries.join(', ')} />
            <KV label="Investment locations" value={c.crossBorder.investmentLocations.join(', ')} />
            <KV label="Transaction corridors" value={c.crossBorder.transactionCorridors.join('; ')} />
            <KV label="Treasury exposures" value={c.crossBorder.treasuryExposures.join('; ')} />
            <KV label="Relationship footprint" value={c.crossBorder.relationshipFootprint.join('; ')} />
          </InfoCard>
        )}
      </div>

      <InfoCard eyebrow="Complaint Records">
        {c.complaints.length === 0 ? (
          <div className="t-meta">No complaints on record.</div>
        ) : (
          c.complaints.map((cp, i) => (
            <div key={i} className="flex items-center justify-between gap-3 flex-wrap py-2 border-t border-hairline first:border-t-0">
              <div>
                <div className="t-body">{cp.summary}</div>
                <div className="t-meta">{fmtDate(cp.date)} · {cp.channel}</div>
              </div>
              <Pill variant={cp.status === 'Closed' ? 'pass' : 'flag'}>{cp.status}</Pill>
            </div>
          ))
        )}
      </InfoCard>
    </div>
  );
}

function NarrativeRow({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="t-micro mb-1">{label}</div>
      <div className="text-[14px] leading-relaxed text-ink-2">{value}</div>
    </div>
  );
}

function InfoCard({ eyebrow, children }: { eyebrow: string; children: ReactNode }) {
  return (
    <div className="glass-tight p-4">
      <div className="t-micro mb-2.5">{eyebrow}</div>
      <div className="space-y-2">{children}</div>
    </div>
  );
}

function KV({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="flex justify-between gap-3 text-[13.5px]">
      <span className="text-ink-3">{label}</span>
      <span className="text-ink-2 text-right">{value}</span>
    </div>
  );
}
```

Note: the eyebrow label uses `style={{ color: '#33454E' }}` rather than the `.t-micro` class's default color, so it reads distinctly on the tinted hero background — `.t-micro` itself is still applied for the uppercase/letter-spacing treatment; only the color is overridden.

- [ ] **Step 4: Remove `ClientDetail` from `ClientsView.tsx`**

In `src/components/ClientsView.tsx`, delete the entire `ClientDetail` function (everything from `export function ClientDetail(...)` to the file's closing `}`) — it now lives in `ClientDetail.tsx`.

Delete the now-unused imports: `ReactNode` (was only used by `ClientDetail`'s `dims` array), `bindingConstraint`, `OPPS`, `PRODUCTS`, `Button`, `CLIENTS` (the list view uses `MY_CLIENTS`/`blockedClientIds`, not `CLIENTS` directly — `CLIENTS` was only read by the removed `ClientDetail`), `fmt`, `fmtDate` (the list view never calls either — only the removed `ClientDetail` did). Keep `MY_CLIENTS`, `MY_CLIENT_IDS`, `TODAY`, `monthsBetween`, `blockedClientIds`, `Pill`, `Orb` — the list view (`ClientsView` function) still uses all of these (Task 3 removes the `Orb` usage specifically).

- [ ] **Step 5: Wire up `App.tsx`**

In `src/App.tsx`, change the import on line 5 from:

```tsx
import { ClientsView, ClientDetail } from './components/ClientsView';
```

to:

```tsx
import { ClientsView } from './components/ClientsView';
import { ClientDetail } from './components/ClientDetail';
```

Change the `ClientDetail` usage from:

```tsx
            ? <ClientDetail
                clientId={state.selectedClientId}
                onBack={() => dispatch({ type: 'BACK_CLIENTS' })}
                onOpenOutreach={id => { dispatch({ type: 'SET_OUTREACH_CLIENT', id }); dispatch({ type: 'SET_TAB', tab: 'outreach' }); }}
              />
```

to:

```tsx
            ? <ClientDetail
                clientId={state.selectedClientId}
                onBack={() => dispatch({ type: 'BACK_CLIENTS' })}
              />
```

- [ ] **Step 6: Run the harness to verify it passes**

```bash
npm run typecheck && npm run build && node tools/verify.js
```

Expected: `FAIL COUNT: 0` and `JS ERRORS: none`. If typecheck complains about an unused import left in `ClientsView.tsx`, remove it — `noUnusedLocals` is off, but a leftover unused type-only import can still trip `isolatedModules` if it's a value import with no runtime use; resolve any such error by deleting that import line.

- [ ] **Step 7: Commit**

```bash
git add src/components/ClientDetail.tsx src/components/ClientsView.tsx src/App.tsx tools/verify.js
git commit -m "Rebuild the client page as a profile

The client detail page opened on a compliance banner and buried the
client's own identity under a dense meta line, with no room anywhere
for a plain-English explanation of why today's news matters to them.
Replace it with an identity header, a four-part narrative hero, and an
organized information grid, and remove the binding-constraint banner
and the related-opportunity card that no longer fit.

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"
```

---

### Task 3: Clean up the client list row and delete the unused binding library

Removes the avatar and the RM/tier meta line from the client list rows, and deletes `lib/binding.ts` now that nothing renders it.

**Files:**
- Modify: `src/components/ClientsView.tsx`
- Delete: `src/lib/binding.ts`
- Modify: `src/types.ts` (remove `BindingConstraint`)
- Test: `tools/verify.js`

**Interfaces:**
- Consumes: the trimmed `ClientsView.tsx` from Task 2 (list view only, `Pill` import retained).
- Produces: nothing later tasks depend on.

- [ ] **Step 1: Write the failing assertion**

In `tools/verify.js`, find:

```js
  check('Client directory lists 3 clients (Aisha\'s book, minus the blocked one)', await page.locator('[data-testid="client-row"]').count() === 3, 'count=' + await page.locator('[data-testid="client-row"]').count());
```

Immediately after it, insert:

```js
  check('Client list rows show no avatar icon', await page.locator('[data-testid="client-row"] .orb').count() === 0);
  check('Client list row shows only name and segment, not tier or RM', !(await page.locator('[data-testid="client-row"]').first().innerText()).includes('RM '));
```

- [ ] **Step 2: Run the harness to verify it fails**

```bash
npm run build && node tools/verify.js
```

Expected: `FAIL Client list row shows only name and segment, not tier or RM` (the row currently reads "Premier · Priority · RM Aisha Rahman"). The `.orb` check will currently pass as OK (no FAIL) only once Task 2's rebuild already removed `ClientDetail`'s own orb — this step's new orb check is about the *list* row, which still renders `<Orb>` at this point, so it should read FAIL too. Proceed to Step 3 either way.

- [ ] **Step 3: Trim the list row**

In `src/components/ClientsView.tsx`, inside the `ClientsView` function's `.map`, change:

```tsx
            <Orb name={c.name} />
            <div className="flex-1">
              <div className="t-h3">{c.name}</div>
              <div className="t-meta">{c.segment} · {c.tier} · RM {c.rm}</div>
            </div>
```

to:

```tsx
            <div className="flex-1">
              <div className="t-h3">{c.name}</div>
              <div className="t-meta">{c.segment}</div>
            </div>
```

Remove the now-unused `import { Orb } from './ui/Orb';` line from this file. (`Orb` itself is not deleted — `BlockedCard.tsx` still imports it.)

- [ ] **Step 4: Delete the binding library and its type**

Delete `src/lib/binding.ts`.

In `src/types.ts`, delete the `BindingConstraint` interface:

```ts
export interface BindingConstraint {
  kind: string;
  label: string;
  detail: string;
}
```

- [ ] **Step 5: Run the harness to verify it passes**

```bash
npm run typecheck && npm run build && node tools/verify.js
```

Expected: `FAIL COUNT: 0` and `JS ERRORS: none`.

- [ ] **Step 6: Commit**

```bash
git add src/components/ClientsView.tsx src/lib/binding.ts src/types.ts tools/verify.js
git commit -m "Drop the avatar and RM/tier line from the client list row

Tier, mandate and RM now live on the profile page's Basic Information
card; the list row only needs to identify who the client is. Also
delete lib/binding.ts and its BindingConstraint type, unused since the
profile page dropped the binding-constraint banner.

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"
```

---

### Task 4: Link the queue's why-boxes to the client page

Turns each of the three `WhyBox` cells on the opportunity card into a button that opens the client's profile page.

**Files:**
- Modify: `src/components/OpportunityCard.tsx`
- Test: `tools/verify.js`

**Interfaces:**
- Consumes: `OpportunityCard`'s existing `onOpenClient: (id: string) => void` prop — already passed by `QueueView`, no signature change.
- Produces: nothing later tasks depend on.

- [ ] **Step 1: Write the failing assertion**

In `tools/verify.js`, find the Task 2 click-target block:

```js
  // Only the name block navigates; the card body does not.
  const chenCard = page.locator('[data-testid="opportunity-card"]', { hasText: 'Chen Wei Liang' });
  await chenCard.locator('.t-micro', { hasText: 'Opportunity size' }).click();
  txt = await page.locator('main').innerText();
  check('Clicking the card body does NOT navigate away from the queue', txt.includes('High revenue opportunities'));
  await chenCard.locator('[data-testid="client-open"]').click();
  txt = await page.locator('main').innerText();
  check('Clicking the client name opens that client\'s position page', txt.includes('Chen Wei Liang') && /binding constraint/i.test(txt));
  await page.click('nav >> text=Queue');
  await page.waitForTimeout(150);
```

Replace the fifth line (the one asserting `binding constraint`, which Task 2 removed) and add a new check for the why-box link, so the block reads:

```js
  // Only the name block navigates; the card body does not.
  const chenCard = page.locator('[data-testid="opportunity-card"]', { hasText: 'Chen Wei Liang' });
  await chenCard.locator('.t-micro', { hasText: 'Opportunity size' }).click();
  txt = await page.locator('main').innerText();
  check('Clicking the card body does NOT navigate away from the queue', txt.includes('High revenue opportunities'));
  await chenCard.locator('[data-testid="client-open"]').click();
  txt = await page.locator('main').innerText();
  check('Clicking the client name opens that client\'s position page', txt.includes('Chen Wei Liang') && txt.includes('What happened'));
  await page.click('nav >> text=Queue');
  await page.waitForTimeout(150);

  // Why-boxes are also links into the client page
  const chenCard2 = page.locator('[data-testid="opportunity-card"]', { hasText: 'Chen Wei Liang' });
  await chenCard2.locator('[data-testid="why-box"]', { hasText: 'Why this client' }).click();
  txt = await page.locator('main').innerText();
  check('Clicking a why-box opens the client\'s profile page', txt.includes('Chen Wei Liang') && txt.includes('What happened'));
  await page.click('nav >> text=Queue');
  await page.waitForTimeout(150);
```

- [ ] **Step 2: Run the harness to verify it fails**

```bash
npm run build && node tools/verify.js
```

Expected: `FAIL Clicking a why-box opens the client's profile page` (the `[data-testid="why-box"]` locator finds nothing, or finds a non-clickable div and the click has no navigation effect).

- [ ] **Step 3: Make the why-boxes clickable**

In `src/components/OpportunityCard.tsx`, change the three `WhyBox` call sites from:

```tsx
        <WhyBox label="Why this client" value={opp.whyClient} />
        <WhyBox label="Why now" value={opp.whyNow} />
        <WhyBox label="Why this instrument" value={opp.whyInstrument} />
```

to:

```tsx
        <WhyBox label="Why this client" value={opp.whyClient} onClick={() => onOpenClient(c.id)} />
        <WhyBox label="Why now" value={opp.whyNow} onClick={() => onOpenClient(c.id)} />
        <WhyBox label="Why this instrument" value={opp.whyInstrument} onClick={() => onOpenClient(c.id)} />
```

Change the `WhyBox` function from:

```tsx
function WhyBox({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-sunk rounded-xl p-3">
      <div className="t-micro mb-1">{label}</div>
      <div className="text-[13.5px] leading-relaxed text-ink-2">{value}</div>
    </div>
  );
}
```

to:

```tsx
function WhyBox({ label, value, onClick }: { label: string; value: string; onClick: () => void }) {
  return (
    <button
      type="button"
      data-testid="why-box"
      onClick={onClick}
      className="bg-sunk rounded-xl p-3 text-left hover:bg-hairline-2/40 transition-colors"
    >
      <div className="t-micro mb-1">{label}</div>
      <div className="text-[13.5px] leading-relaxed text-ink-2">{value}</div>
    </button>
  );
}
```

- [ ] **Step 4: Run the harness to verify it passes**

```bash
npm run typecheck && npm run build && node tools/verify.js
```

Expected: `FAIL COUNT: 0` and `JS ERRORS: none`.

- [ ] **Step 5: Commit**

```bash
git add src/components/OpportunityCard.tsx tools/verify.js
git commit -m "Link the queue's why-boxes to the client's profile page

The queue's why-boxes are one sentence by design; the full explanation
now lives on the client's profile page. Make each why-box a link there
so an RM who wants more than one sentence has somewhere to go.

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"
```

---

## Self-review notes

Spec coverage:

| Spec section | Task |
|---|---|
| Data additions — narrative, riskProfile, complaints | 1 |
| Page structure — header, hero, grid, complaints | 2 |
| Component split — ClientDetail.tsx, InfoCard, KV | 2 |
| Removed — banner, related opportunity, binding.ts, avatar | 2, 3 |
| Queue deep link | 4 |
| Testing — harness rewrites | every task |

Ordering constraint: Task 3's list-row cleanup and Task 2's detail-page rebuild both touch `ClientsView.tsx`, but at disjoint locations (the `ClientsView` function vs. the deleted `ClientDetail` function) and are sequenced so Task 2 removes `ClientDetail` first — Task 3 only ever sees the trimmed file. Execute in order.
