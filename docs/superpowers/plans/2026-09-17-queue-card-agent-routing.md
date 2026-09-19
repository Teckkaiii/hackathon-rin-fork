# Queue Card Cleanup and Agent Routing Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Strip the Today's-queue card down to its four scoring dimensions, and replace its single "Draft outreach" action with an agent-chosen route between drafting, referring to a specialist, and calling the client to clarify.

**Architecture:** A new pure module `src/lib/routing.ts` maps an opportunity plus its client record to one of three routes with a human-readable rationale. `OpportunityCard` renders the chosen route as its primary action; `QueueView` executes it, either by navigating to Outreach or by recording a handoff in reducer state. Park is deleted end to end, and a new `Modal` component replaces the two `window.prompt()` calls.

**Tech Stack:** React 18, TypeScript 5.6 (strict), Vite 5, Tailwind 3. Verification is Playwright driving a built `dist/` via `tools/verify.js`.

**Spec:** `docs/superpowers/specs/2026-09-17-queue-card-agent-routing-design.md`

## Global Constraints

- **Verification command, run after every task:** `npm run typecheck && npm run build && node tools/verify.js`. The harness exits non-zero on any `FAIL` line *or* any browser console error. A task is not done until it exits 0.
- `tools/verify.js` serves `dist/`, not the dev server. **You must `npm run build` before `node tools/verify.js` or you will be testing stale code.**
- `tsconfig.json` sets `noUnusedLocals: false`. Unused imports will **not** fail typecheck. Remove them by hand when a task says to.
- Do not change the signal scoring maths in `src/lib/signal.ts`.
- Do not touch the Blocked, Clients, News or Past Week views except where a shared component or a changed function signature forces it.
- Reuse the existing `Button` and `Pill` components from `src/components/ui/`. Do not introduce a UI library.
- Client fixture names used throughout: `chen` = "Chen Wei Liang" (Premier/Priority), `priya` = "Priya Ravindran" (Private/Signature), `david` = "David Ong" (Premier/Priority). These three are the signed-in RM's unblocked book and the only three cards in the queue. `robert` = "Robert Teo" is her fourth client and is gate-blocked.

---

### Task 1: Strip the card chrome

Removes the rank badge, the avatar orb, the RM name, the tier, and the three descriptive pills (approach / product name / signal recency). Keeps the client name, the segment, the amount block, the four scoring pills and the three why-boxes.

**Files:**
- Modify: `src/components/OpportunityCard.tsx`
- Modify: `src/components/QueueView.tsx:76-88` (stop passing `rank`)
- Test: `tools/verify.js`

**Interfaces:**
- Consumes: nothing from earlier tasks.
- Produces: `OpportunityCard` no longer accepts a `rank` prop. Later tasks must not pass one.

- [ ] **Step 1: Write the failing assertions**

In `tools/verify.js`, find the Module 1 block. Immediately after the existing line:

```js
  check('Highest signal-score opportunity ranks first (Chen Wei Liang)', (await page.locator('[data-testid="opportunity-card"]').first().innerText()).includes('Chen Wei Liang'));
```

insert:

```js
  // ---- Task 1: card chrome stripped to name + segment + scoring pills ----
  const chenCard0 = page.locator('[data-testid="opportunity-card"]', { hasText: 'Chen Wei Liang' });
  const chenTxt0 = await chenCard0.innerText();
  check('Card leads with the client name (no rank badge, no orb initials)', chenTxt0.split('\n')[0].trim() === 'Chen Wei Liang');
  check('Card drops the RM name', !chenTxt0.includes('Aisha Rahman'));
  check('Card drops the client tier', !/\bPriority\b|\bSignature\b/.test(chenTxt0));
  check('Card drops the approach pill', !/\bNotify\b/.test(chenTxt0));
  check('Card drops the product-name pill', !chenTxt0.includes('Structured Deposit'));
  check('Card drops the signal-recency pill', !chenTxt0.includes('Signal:'));
  check('Card keeps the segment', chenTxt0.includes('Premier'));
  check('Card keeps all four scoring pills', ['Urgency:', 'Relevancy:', 'Momentum:', 'Conviction:'].every(s => chenTxt0.includes(s)));
  check('Card keeps the amount at stake', chenTxt0.includes('380,000'));
  check('Card keeps the three why-boxes', chenTxt0.includes('Why this client') && chenTxt0.includes('Why now') && chenTxt0.includes('Why this instrument'));
```

- [ ] **Step 2: Run the harness to verify it fails**

```bash
npm run build && node tools/verify.js
```

Expected: several `FAIL` lines, including `FAIL Card leads with the client name`, `FAIL Card drops the RM name`, `FAIL Card drops the client tier`. `FAIL COUNT:` is at least 6.

- [ ] **Step 3: Strip the card**

Replace the whole of `src/components/OpportunityCard.tsx` with:

```tsx
import type { Opportunity } from '../types';
import { CLIENTS } from '../state';
import { signalBreakdown, type SignalLevel } from '../lib/signal';
import { fmt } from '../lib/format';
import { Pill } from './ui/Pill';
import { Button } from './ui/Button';

const LEVEL_VARIANT: Record<SignalLevel, 'pass' | 'flag' | 'neutral'> = {
  high: 'pass', medium: 'flag', low: 'neutral',
};
const LEVEL_LABEL: Record<SignalLevel, string> = { high: 'High', medium: 'Medium', low: 'Low' };

export function OpportunityCard({
  opp, onOpenClient, onOpenOutreach, onDismiss,
}: {
  opp: Opportunity;
  onOpenClient: (id: string) => void;
  onOpenOutreach: (id: string) => void;
  onDismiss?: (id: string) => void;
}) {
  const c = CLIENTS[opp.clientId];
  const signal = signalBreakdown(opp);

  return (
    <div
      className="glass-tight border p-5 mb-3"
      data-oppid={opp.id}
      data-testid="opportunity-card"
      onClick={() => onOpenClient(c.id)}
    >
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div className="min-w-0 flex-1">
          <div className="t-h2 break-words">{c.name}</div>
          <div className="t-meta">{c.segment}</div>
        </div>
        <div className="text-right">
          <div className="t-micro">Amount at stake</div>
          <div className="t-h2 font-serif text-[24px]">{fmt(opp.amountAtStake)}</div>
          <div className="t-meta">Window to act: {opp.daysToAct} days</div>
        </div>
      </div>

      <div className="flex gap-1.5 flex-wrap mt-3">
        <Pill variant={LEVEL_VARIANT[signal.urgency.level]} dot>Urgency: {LEVEL_LABEL[signal.urgency.level]}</Pill>
        <Pill variant={LEVEL_VARIANT[signal.relevancy.level]} dot>Relevancy: {LEVEL_LABEL[signal.relevancy.level]}</Pill>
        <Pill variant={LEVEL_VARIANT[signal.momentum.level]} dot>Momentum: {LEVEL_LABEL[signal.momentum.level]}</Pill>
        <Pill variant={LEVEL_VARIANT[signal.conviction.level]} dot>
          Conviction: {signal.conviction.count} {signal.conviction.count === 1 ? 'piece' : 'pieces'} of news
        </Pill>
      </div>

      <div className="grid md:grid-cols-3 gap-3 mt-4">
        <WhyBox label="Why this client" value={opp.whyClient} />
        <WhyBox label="Why now" value={opp.whyNow} />
        <WhyBox label="Why this instrument" value={opp.whyInstrument} />
      </div>

      <div className="flex gap-2 flex-wrap mt-4" onClick={e => e.stopPropagation()}>
        <Button size="sm" onClick={() => onOpenOutreach(c.id)}>Draft outreach</Button>
        {onDismiss && <Button variant="ghost" size="sm" onClick={() => onDismiss(opp.id)}>Dismiss</Button>}
      </div>
    </div>
  );
}

function WhyBox({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-sunk rounded-xl p-3">
      <div className="t-micro mb-1">{label}</div>
      <div className="text-[13.5px] leading-relaxed text-ink-2">{value}</div>
    </div>
  );
}
```

Note what this deliberately drops alongside the chrome: the `rank`, `parkedResurfaceDate` and `onPark` props, the `Orb` and `PRODUCTS` imports, and the `cursor-pointer hover:border-ink-3` classes. Park is removed properly in Task 3; dropping the props here just stops the card accepting them.

- [ ] **Step 4: Stop passing the removed props**

In `src/components/QueueView.tsx`, replace the `<OpportunityCard ... />` block (currently lines 76-88) with:

```tsx
            <OpportunityCard
              key={o.id}
              opp={o}
              onOpenClient={id => dispatch({ type: 'OPEN_CLIENT', id })}
              onOpenOutreach={id => { dispatch({ type: 'SET_OUTREACH_CLIENT', id }); dispatch({ type: 'SET_TAB', tab: 'outreach' }); }}
              onDismiss={id => {
                const reason = prompt('Reason for dismissing this opportunity:', 'Client not reachable this week');
                if (reason !== null) dispatch({ type: 'DISMISS', id, reason: reason || 'No reason given' });
              }}
            />
```

Then change the `.map` that wraps it from `surfaced.map((o, i) => (` to `surfaced.map(o => (`.

- [ ] **Step 5: Run the harness to verify it passes**

```bash
npm run typecheck && npm run build && node tools/verify.js
```

Expected: `FAIL COUNT: 0` and `JS ERRORS: none`.

- [ ] **Step 6: Commit**

```bash
git add src/components/OpportunityCard.tsx src/components/QueueView.tsx tools/verify.js
git commit -m "Strip queue card to name, segment and scoring pills

The rank badge, avatar orb, RM name, tier and the approach/product/
recency pills competed with the four dimensions that actually rank the
queue. Remove them so the scoring is what the card leads with.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

### Task 2: Scope the click target to the name block

Today the whole card opens the client, which swallows clicks meant for the card's content. Only the name and segment should navigate.

**Files:**
- Modify: `src/components/OpportunityCard.tsx`
- Test: `tools/verify.js:48-52`

**Interfaces:**
- Consumes: `OpportunityCard` from Task 1 — props `{ opp, onOpenClient, onOpenOutreach, onDismiss }`.
- Produces: a `[data-testid="client-open"]` button inside each card. Later tasks must not remove it.

- [ ] **Step 1: Rewrite the card-click assertions**

In `tools/verify.js`, find this block (currently lines 48-52):

```js
  // Clicking a card (not a button) opens the client's position page
  const chenCard = page.locator('[data-testid="opportunity-card"]', { hasText: 'Chen Wei Liang' });
  await chenCard.click({ position: { x: 20, y: 20 } });
  txt = await page.locator('main').innerText();
  check('Clicking a Queue card opens that client\'s position page', txt.includes('Chen Wei Liang') && /binding constraint/i.test(txt));
```

Replace it with:

```js
  // Only the name block navigates; the card body does not.
  const chenCard = page.locator('[data-testid="opportunity-card"]', { hasText: 'Chen Wei Liang' });
  await chenCard.locator('.t-micro', { hasText: 'Amount at stake' }).click();
  txt = await page.locator('main').innerText();
  check('Clicking the card body does NOT navigate away from the queue', txt.includes("Today's queue"));
  await chenCard.locator('[data-testid="client-open"]').click();
  txt = await page.locator('main').innerText();
  check('Clicking the client name opens that client\'s position page', txt.includes('Chen Wei Liang') && /binding constraint/i.test(txt));
```

- [ ] **Step 2: Run the harness to verify it fails**

```bash
npm run build && node tools/verify.js
```

Expected: `FAIL Clicking the card body does NOT navigate away from the queue` — the body click still opens the client page. The subsequent `client-open` locator will also time out; that is expected at this stage.

- [ ] **Step 3: Move the handler onto a name button**

In `src/components/OpportunityCard.tsx`, remove `onClick={() => onOpenClient(c.id)}` from the outer `<div>`, so its opening tag reads:

```tsx
    <div
      className="glass-tight border p-5 mb-3"
      data-oppid={opp.id}
      data-testid="opportunity-card"
    >
```

Then replace the name block:

```tsx
        <div className="min-w-0 flex-1">
          <div className="t-h2 break-words">{c.name}</div>
          <div className="t-meta">{c.segment}</div>
        </div>
```

with:

```tsx
        <button
          type="button"
          data-testid="client-open"
          className="min-w-0 flex-1 text-left group"
          onClick={() => onOpenClient(c.id)}
        >
          <div className="t-h2 break-words group-hover:underline">{c.name}</div>
          <div className="t-meta">{c.segment}</div>
        </button>
```

Finally, the action row's `onClick={e => e.stopPropagation()}` is now redundant — the card no longer has a click handler to stop. Change:

```tsx
      <div className="flex gap-2 flex-wrap mt-4" onClick={e => e.stopPropagation()}>
```

to:

```tsx
      <div className="flex gap-2 flex-wrap mt-4">
```

- [ ] **Step 4: Run the harness to verify it passes**

```bash
npm run typecheck && npm run build && node tools/verify.js
```

Expected: `FAIL COUNT: 0` and `JS ERRORS: none`.

- [ ] **Step 5: Commit**

```bash
git add src/components/OpportunityCard.tsx tools/verify.js
git commit -m "Scope queue card navigation to the client name block

Making the whole card a click target swallowed clicks meant for its
content. Move the handler onto a button wrapping the name and segment.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

### Task 3: Remove Park end to end

Park is deleted: the card's Park button and props, the action, the state, the reducer case, the Parked section, and the `parked` parameter threaded through three functions in `lib/queue.ts`.

> **Execution note (ruled during Task 1 review):** Task 1's original text also stripped the Park props and button from `OpportunityCard.tsx`, but doing so breaks the pre-existing harness assertion at `tools/verify.js` that clicks `button:has-text("Park")` — an assertion this task is the one to rewrite. Task 1 therefore left the card's Park props and JSX in place, and their removal belongs here. This task now owns every Park site.

**Files:**
- Modify: `src/components/OpportunityCard.tsx` (the `onPark` / `parkedResurfaceDate` props and the Park button/pill JSX)
- Modify: `src/lib/queue.ts:28-66`
- Modify: `src/state.ts`
- Modify: `src/components/QueueView.tsx`
- Test: `tools/verify.js:65-71`

**Interfaces:**
- Consumes: `OpportunityCard` from Task 2 — props `{ opp, parkedResurfaceDate?, onOpenClient, onOpenOutreach, onPark?, onDismiss? }`. The `[data-testid="client-open"]` name button from Task 2 must survive untouched.
- Produces: `OpportunityCard` props reduced to `{ opp, onOpenClient, onOpenOutreach, onDismiss? }`; `activeOpps(dismissed, clientIds?)`, `filteredOpps(dismissed, filters, clientsById, clientIds?)` and `clusters(dismissed, driversById, clientIds?)` — each with the leading `parked: Set<string>` argument removed. Task 5 adds a `routed` argument to these same three functions.

- [ ] **Step 1: Replace the Park assertions with absence assertions**

In `tools/verify.js`, find and **delete** this block (currently lines 65-71):

```js
  // Park David Ong (button click must not also trigger the card's own open-client navigation)
  const davidCard = page.locator('[data-testid="opportunity-card"]', { hasText: 'David Ong' });
  await davidCard.locator('button:has-text("Park")').click();
  txt = await page.locator('main').innerText();
  check('David Ong moved to Parked with resurface date', txt.includes('Parked') && txt.includes('Resurfaces'));
  check('Cadence rule text shown', txt.includes('5 business days'));
  check('Parking a card kept us on the Queue tab (button click did not bubble to open-client)', txt.includes('Today\'s queue'));
```

Replace it with:

```js
  // Park is gone.
  txt = await page.locator('main').innerText();
  check('No Park button anywhere in the queue', await page.locator('button:has-text("Park")').count() === 0);
  check('No Parked section in the queue', !txt.includes('Parked') && !txt.includes('Resurfaces'));
  check('No parking cadence copy in the queue', !txt.includes('5 business days'));
```

- [ ] **Step 2: Run the harness to verify it fails**

```bash
npm run build && node tools/verify.js
```

Expected: `FAIL No Park button anywhere in the queue`. (`No Parked section` may pass already, since nothing is parked on a fresh load — that is fine, the Park-button check is the one that must go red.)

- [ ] **Step 2b: Strip the Park props and button from the card**

In `src/components/OpportunityCard.tsx`, change the props destructure and type from:

```tsx
export function OpportunityCard({
  opp, parkedResurfaceDate, onOpenClient, onOpenOutreach, onPark, onDismiss,
}: {
  opp: Opportunity;
  parkedResurfaceDate?: string;
  onOpenClient: (id: string) => void;
  onOpenOutreach: (id: string) => void;
  onPark?: (id: string) => void;
  onDismiss?: (id: string) => void;
}) {
```

to:

```tsx
export function OpportunityCard({
  opp, onOpenClient, onOpenOutreach, onDismiss,
}: {
  opp: Opportunity;
  onOpenClient: (id: string) => void;
  onOpenOutreach: (id: string) => void;
  onDismiss?: (id: string) => void;
}) {
```

Then, in the action row near the bottom of the file, delete the Park branch so that:

```tsx
        <Button size="sm" onClick={() => onOpenOutreach(c.id)}>Draft outreach</Button>
        {parkedResurfaceDate ? (
          <Pill variant="flag">Parked — resurfaces {parkedResurfaceDate}</Pill>
        ) : (
          onPark && <Button variant="ghost" size="sm" onClick={() => onPark(opp.id)}>Park</Button>
        )}
        {onDismiss && <Button variant="ghost" size="sm" onClick={() => onDismiss(opp.id)}>Dismiss</Button>}
```

becomes:

```tsx
        <Button size="sm" onClick={() => onOpenOutreach(c.id)}>Draft outreach</Button>
        {onDismiss && <Button variant="ghost" size="sm" onClick={() => onDismiss(opp.id)}>Dismiss</Button>}
```

Leave everything else in the file — in particular the `[data-testid="client-open"]` name button from Task 2 — exactly as it is. `Pill` is still used by the four scoring pills, so keep its import.

- [ ] **Step 3: Drop the `parked` parameter from the queue functions**

In `src/lib/queue.ts`, replace lines 28-66 (from `export function activeOpps` to the end of the file) with:

```ts
export function activeOpps(dismissed: Record<string, string>, clientIds?: Set<string>): Opportunity[] {
  return passedOpps(clientIds).filter(o => !(o.id in dismissed));
}

export function filteredOpps(
  dismissed: Record<string, string>,
  filters: Filters,
  clientsById: Record<string, { segment: string; tier: string }>,
  clientIds?: Set<string>
): Opportunity[] {
  return activeOpps(dismissed, clientIds)
    .filter(o => {
      const c = clientsById[o.clientId];
      if (filters.segment !== 'all' && c.segment !== filters.segment) return false;
      if (filters.tier !== 'all' && c.tier !== filters.tier) return false;
      if (filters.family !== 'all' && PRODUCTS[o.productId].family !== filters.family) return false;
      if (o.amountAtStake < filters.minAmount) return false;
      if (filters.recency === 'fresh' && !(o.signal.recency === 'Today' || o.signal.recency === 'Yesterday')) return false;
      if (filters.recency === 'internal' && o.signal.recency !== 'Internal') return false;
      return true;
    })
    .sort((a, b) => signalScore(b) - signalScore(a) || a.daysToAct - b.daysToAct);
}

export function blockedClientIds(clientIds?: Set<string>): Set<string> {
  return new Set(blockedOpps(clientIds).map(x => x.opp.clientId));
}

export function clusters(dismissed: Record<string, string>, driversById: Record<string, Driver>, clientIds?: Set<string>) {
  const byDriver: Record<string, Opportunity[]> = {};
  activeOpps(dismissed, clientIds).forEach(o => {
    if (!o.driverId) return;
    (byDriver[o.driverId] ||= []).push(o);
  });
  return Object.entries(byDriver)
    .filter(([, list]) => list.length > 1)
    .map(([driverId, list]) => ({ driver: driversById[driverId], opps: list }));
}
```

- [ ] **Step 4: Remove the park state and action**

In `src/state.ts`, make four edits.

Delete these two lines from the `AppState` interface:

```ts
  parked: Set<string>;
  parkDates: Record<string, string>;
```

Delete these two lines from `initialState()`:

```ts
    parked: new Set(),
    parkDates: {},
```

Delete this line from the `Action` union:

```ts
  | { type: 'PARK'; id: string; resurface: string }
```

Delete this reducer case:

```ts
    case 'PARK': {
      const parked = new Set(state.parked);
      parked.add(action.id);
      return { ...state, parked, parkDates: { ...state.parkDates, [action.id]: action.resurface } };
    }
```

- [ ] **Step 5: Remove the Parked section from the queue view**

In `src/components/QueueView.tsx`:

Change the destructure on line 10 from:

```tsx
  const { filters, parked, dismissed, parkDates } = state;
```

to:

```tsx
  const { filters, dismissed } = state;
```

Change the three memos and the list derivation (currently lines 12-20) to:

```tsx
  const surfaced = useMemo(
    () => filteredOpps(dismissed, filters, CLIENTS, MY_CLIENT_IDS),
    [dismissed, filters]
  );
  const blocked = useMemo(() => blockedOpps(MY_CLIENT_IDS), []);
  const cls = useMemo(() => clusters(dismissed, DRIVERS, MY_CLIENT_IDS), [dismissed]);
  const families = useMemo(() => [...new Set(Object.values(PRODUCTS).map(p => p.family))], []);
  const dismissedList = OPPS.filter(o => o.id in dismissed && MY_CLIENT_IDS.has(o.clientId));
```

Delete the entire `{parkedList.length > 0 && ( ... )}` JSX block (currently lines 92-111).

In the `<OpportunityCard ... />` call, delete these two prop lines (the card no longer accepts them after Step 2b):

```tsx
              parkedResurfaceDate={parkDates[o.id] ? new Date(parkDates[o.id]).toLocaleDateString('en-SG', { day: 'numeric', month: 'short' }) : undefined}
```

and:

```tsx
              onPark={id => dispatch({ type: 'PARK', id, resurface: businessDaysAdd(TODAY, 5).toISOString() })}
```

Finally, `businessDaysAdd` and `TODAY` are now unused. Change the import on line 5 from:

```tsx
import { businessDaysAdd, TODAY } from '../lib/format';
```

to — delete the line entirely. Nothing else in this file uses either symbol.

- [ ] **Step 6: Run the harness to verify it passes**

```bash
npm run typecheck && npm run build && node tools/verify.js
```

Expected: `FAIL COUNT: 0` and `JS ERRORS: none`. If typecheck complains about an unused `Pill` import in `QueueView.tsx`, leave it — the Dismissed section below still uses `Pill`.

- [ ] **Step 7: Commit**

```bash
git add src/components/OpportunityCard.tsx src/lib/queue.ts src/state.ts src/components/QueueView.tsx tools/verify.js
git commit -m "Remove Park from the queue

Parking added a third disposition that duplicated dismissal without
changing what the RM does next. Remove the action, its state, the
Parked section and the parked parameter threaded through queue.ts.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

### Task 4: Modal component, replacing both `prompt()` calls

Introduces `src/components/ui/Modal.tsx` and uses it for the queue's Dismiss and Outreach's "Log a non-send".

**Files:**
- Create: `src/components/ui/Modal.tsx`
- Modify: `src/components/QueueView.tsx`
- Modify: `src/components/OutreachView.tsx:106-115`
- Test: `tools/verify.js:73-78`

**Interfaces:**
- Consumes: `activeOpps`/`filteredOpps`/`clusters` signatures from Task 3.
- Produces: `Modal({ open, title, confirmLabel, onConfirm, onClose, children })` from `src/components/ui/Modal.tsx`, rendering `[data-testid="modal"]` with a `[data-act="modal-confirm"]` button. Task 6 reuses it.

- [ ] **Step 1: Rewrite the Dismiss assertions to drive a modal**

In `tools/verify.js`, find this block (currently lines 73-78):

```js
  // Dismiss with reason
  page.once('dialog', d => d.accept('Client travelling, follow up next week'));
  const priyaCard = page.locator('[data-testid="opportunity-card"]', { hasText: 'Priya Ravindran' });
  await priyaCard.locator('button:has-text("Dismiss")').click();
  txt = await page.locator('main').innerText();
  check('Priya dismissed with reason recorded', txt.includes('Dismissed') && txt.includes('Client travelling'));
```

Replace it with:

```js
  // Dismiss with reason, via the in-app modal (not a browser prompt)
  let sawNativeDialog = false;
  page.on('dialog', d => { sawNativeDialog = true; d.dismiss(); });
  const priyaCard = page.locator('[data-testid="opportunity-card"]', { hasText: 'Priya Ravindran' });
  await priyaCard.locator('button:has-text("Dismiss")').click();
  check('Dismiss opens an in-app modal', await page.locator('[data-testid="modal"]').count() === 1);
  check('Dismiss did not use a native browser prompt', !sawNativeDialog);
  await page.fill('[data-testid="modal"] textarea', 'Client travelling, follow up next week');
  await page.click('[data-act="modal-confirm"]');
  check('Modal closes after confirming', await page.locator('[data-testid="modal"]').count() === 0);
  txt = await page.locator('main').innerText();
  check('Priya dismissed with reason recorded', txt.includes('Dismissed') && txt.includes('Client travelling'));
```

- [ ] **Step 2: Run the harness to verify it fails**

```bash
npm run build && node tools/verify.js
```

Expected: `FAIL Dismiss opens an in-app modal` and `FAIL Dismiss did not use a native browser prompt`. The `page.fill` on the modal textarea will then time out; that is expected.

- [ ] **Step 3: Create the Modal component**

Create `src/components/ui/Modal.tsx`:

```tsx
import { useEffect, type ReactNode } from 'react';
import { Button } from './Button';

interface Props {
  open: boolean;
  title: string;
  confirmLabel: string;
  onConfirm: () => void;
  onClose: () => void;
  children: ReactNode;
}

export function Modal({ open, title, confirmLabel, onConfirm, onClose, children }: Props) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 bg-black/30 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        data-testid="modal"
        className="glass p-5 w-full max-w-[460px]"
        onClick={e => e.stopPropagation()}
      >
        <div className="t-h2 mb-3">{title}</div>
        {children}
        <div className="flex gap-2 mt-4">
          <Button data-act="modal-confirm" variant="primary" size="sm" onClick={onConfirm}>{confirmLabel}</Button>
          <Button data-act="modal-cancel" variant="ghost" size="sm" onClick={onClose}>Cancel</Button>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Use the modal for queue Dismiss**

In `src/components/QueueView.tsx`, add to the imports at the top:

```tsx
import { useMemo, useState } from 'react';
import { Modal } from './ui/Modal';
```

(The file already imports `useMemo` from `react` on line 1 — change that line to include `useState` rather than adding a second import.)

Inside the `QueueView` function, just after the `dismissedList` derivation, add:

```tsx
  const [dismissTarget, setDismissTarget] = useState<string | null>(null);
  const [dismissReason, setDismissReason] = useState('Client not reachable this week');

  function openDismiss(id: string) {
    setDismissReason('Client not reachable this week');
    setDismissTarget(id);
  }

  function confirmDismiss() {
    if (dismissTarget) {
      dispatch({ type: 'DISMISS', id: dismissTarget, reason: dismissReason.trim() || 'No reason given' });
    }
    setDismissTarget(null);
  }
```

Change the card's `onDismiss` prop from the `prompt()` version to:

```tsx
              onDismiss={openDismiss}
```

Then, immediately before the closing `</div>` at the very end of the returned JSX, add:

```tsx
      <Modal
        open={dismissTarget !== null}
        title="Dismiss this opportunity"
        confirmLabel="Dismiss"
        onConfirm={confirmDismiss}
        onClose={() => setDismissTarget(null)}
      >
        <div className="t-meta mb-2">The reason is recorded against this opportunity.</div>
        <textarea
          className="w-full border border-hairline-2 rounded-xl p-3 text-[14px] leading-relaxed min-h-[80px] font-sans"
          value={dismissReason}
          onChange={e => setDismissReason(e.target.value)}
        />
      </Modal>
```

- [ ] **Step 5: Use the modal for the Outreach non-send**

In `src/components/OutreachView.tsx`, add to the imports:

```tsx
import { useState } from 'react';
import { Modal } from './ui/Modal';
```

Inside the `OutreachView` function, just after the `selectableClients` derivation, add:

```tsx
  const [nonSendOpen, setNonSendOpen] = useState(false);
  const [nonSendReason, setNonSendReason] = useState('Client travelling this week');
```

Replace the "Log a non-send" `<Button>` (currently lines 106-114) with:

```tsx
              <Button variant="ghost" size="sm" onClick={() => { setNonSendReason('Client travelling this week'); setNonSendOpen(true); }}>
                Log a non-send
              </Button>
```

Then, immediately before the closing `</div>` at the very end of the returned JSX, add:

```tsx
      <Modal
        open={nonSendOpen}
        title="Log a non-send"
        confirmLabel="Log it"
        onConfirm={() => {
          dispatch({ type: 'OUTREACH_NOSEND', entry: { ts: '14 Sep, 09:14', clientId, kind: 'Non-send', detail: nonSendReason.trim() || 'No reason given', ref: null } });
          setNonSendOpen(false);
        }}
        onClose={() => setNonSendOpen(false)}
      >
        <div className="t-meta mb-2">Recorded in the outcome ledger for {c.name}.</div>
        <textarea
          className="w-full border border-hairline-2 rounded-xl p-3 text-[14px] leading-relaxed min-h-[80px] font-sans"
          value={nonSendReason}
          onChange={e => setNonSendReason(e.target.value)}
        />
      </Modal>
```

- [ ] **Step 6: Run the harness to verify it passes**

```bash
npm run typecheck && npm run build && node tools/verify.js
```

Expected: `FAIL COUNT: 0` and `JS ERRORS: none`.

- [ ] **Step 7: Commit**

```bash
git add src/components/ui/Modal.tsx src/components/QueueView.tsx src/components/OutreachView.tsx tools/verify.js
git commit -m "Replace browser prompts with an in-app modal

window.prompt() cannot be styled, cannot explain what the reason is
recorded against, and reads as a browser artifact rather than part of
the product. Add a Modal component and use it for Dismiss and non-send.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

### Task 5: Agent routing — decide and execute the next step

Adds `src/lib/routing.ts`, renders the agent's chosen route as the card's primary action with a rationale, and records specialist/clarify handoffs in a new **Handed off** section.

**Files:**
- Create: `src/lib/routing.ts` (`RouteId` and friends live here, **not** in `src/types.ts` — leave `src/types.ts` untouched)
- Modify: `src/state.ts`
- Modify: `src/lib/queue.ts`
- Modify: `src/components/OpportunityCard.tsx`
- Modify: `src/components/QueueView.tsx`
- Test: `tools/verify.js`

**Interfaces:**
- Consumes: `Modal` from Task 4; the `parked`-free `activeOpps`/`filteredOpps`/`clusters` from Task 3; `OpportunityCard` props `{ opp, onOpenClient, onOpenOutreach, onDismiss }` from Task 2.
- Produces:
  - `type RouteId = 'draft' | 'specialist' | 'clarify'`
  - `interface Route { id: RouteId; label: string; rationale: string }`
  - `function routeFor(opp: Opportunity, client: Client): Route`
  - `const ROUTE_LABELS: Record<RouteId, string>`
  - `type RoutedMap = Record<string, { route: RouteId; note: string }>`
  - `AppState.routed: RoutedMap` and action `{ type: 'ROUTE_OPPORTUNITY'; id: string; route: RouteId; note: string }`
  - `OpportunityCard` gains a required `onHandoff: (oppId: string, route: RouteId) => void` prop. Task 6 uses it.

- [ ] **Step 1: Write the failing assertions**

In `tools/verify.js`, insert this block immediately **before** the `// Dismiss with reason, via the in-app modal` block from Task 4:

```js
  // ---- Task 5: the agent picks a different next step per opportunity ----
  const chenRoute = await page.locator('[data-testid="opportunity-card"]', { hasText: 'Chen Wei Liang' }).locator('[data-testid="route-primary"]').innerText();
  const priyaRoute = await page.locator('[data-testid="opportunity-card"]', { hasText: 'Priya Ravindran' }).locator('[data-testid="route-primary"]').innerText();
  const davidRoute = await page.locator('[data-testid="opportunity-card"]', { hasText: 'David Ong' }).locator('[data-testid="route-primary"]').innerText();
  check('Chen routed to a direct draft', chenRoute.includes('Draft outreach'));
  check('Priya routed to a specialist', priyaRoute.includes('Refer to specialist'));
  check('David routed to a clarifying call', davidRoute.includes('Call to clarify'));
  check('The three routes differ', new Set([chenRoute, priyaRoute, davidRoute]).size === 3);

  const davidCard = page.locator('[data-testid="opportunity-card"]', { hasText: 'David Ong' });
  check('Route shows a rationale', (await davidCard.locator('[data-testid="route-rationale"]').innerText()).length > 20);
  check('Priya rationale cites the concentration breach', (await page.locator('[data-testid="opportunity-card"]', { hasText: 'Priya Ravindran' }).locator('[data-testid="route-rationale"]').innerText()).includes('42%'));

  // Executing a non-draft route hands the item off and drops it from the queue
  await davidCard.locator('[data-testid="route-primary"]').click();
  txt = await page.locator('main').innerText();
  check('Handed-off item leaves the surfaced list', /2 surfaced/.test(txt));
  check('Handed-off section names the route taken', txt.includes('Handed off') && txt.includes('Call to clarify'));
  check('Handing off kept us on the Queue tab', txt.includes("Today's queue"));

  // The draft route still goes to Outreach
  await page.locator('[data-testid="opportunity-card"]', { hasText: 'Chen Wei Liang' }).locator('[data-testid="route-primary"]').click();
  txt = await page.locator('main').innerText();
  check('Draft route opens the Outreach tab', txt.includes('Outreach') && await page.locator('#outreach-text').count() === 1);
  await page.click('nav >> text=Queue');
  await page.waitForTimeout(150);
```

Note: the pre-existing assertion `check('3 surfaced (all gates passed)', /3 surfaced/.test(txt));` near the top of Module 1 runs before this block and must keep passing — do not move this block above it.

- [ ] **Step 2: Run the harness to verify it fails**

```bash
npm run build && node tools/verify.js
```

Expected: the `route-primary` locator times out and the run aborts, or `FAIL Chen routed to a direct draft`. Either is red.

- [ ] **Step 3: Create the routing module**

Create `src/lib/routing.ts`:

```ts
import type { Client, Opportunity } from '../types';
import { PRODUCTS } from './data';
import { fmt } from './format';

export type RouteId = 'draft' | 'specialist' | 'clarify';

export interface Route {
  id: RouteId;
  label: string;
  rationale: string;
}

export type RoutedMap = Record<string, { route: RouteId; note: string }>;

export const ROUTE_LABELS: Record<RouteId, string> = {
  draft: 'Draft outreach',
  specialist: 'Refer to specialist',
  clarify: 'Call to clarify',
};

const SPECIALIST_FAMILIES = ['Discretionary', 'Insurance'];
const RM_LED_CEILING = 1_000_000;

// The order matters. An opportunity resting on cash the client never stated an
// intent for needs the client's own answer before anyone — including a
// specialist — can size a product against it.
export function routeFor(opp: Opportunity, client: Client): Route {
  if (opp.approach === 'Review' && opp.driverId === null) {
    return {
      id: 'clarify',
      label: ROUTE_LABELS.clarify,
      rationale:
        'Triggered internally, with no stated client intent behind the balance — confirm objectives on a call before any product conversation.',
    };
  }

  const conc = client.concentration;
  if (conc && conc.pct > conc.threshold) {
    return {
      id: 'specialist',
      label: ROUTE_LABELS.specialist,
      rationale: `Exposure concentration is ${conc.pct}% against a ${conc.threshold}% mandate threshold — the specialist desk owns this conversation.`,
    };
  }

  const family = PRODUCTS[opp.productId].family;
  if (SPECIALIST_FAMILIES.includes(family)) {
    return {
      id: 'specialist',
      label: ROUTE_LABELS.specialist,
      rationale: `A ${family} instrument is not an RM-led product conversation — route to the specialist desk.`,
    };
  }

  if (opp.amountAtStake >= RM_LED_CEILING) {
    return {
      id: 'specialist',
      label: ROUTE_LABELS.specialist,
      rationale: `${fmt(opp.amountAtStake)} at stake is above the RM-led ceiling — the specialist desk should lead.`,
    };
  }

  return {
    id: 'draft',
    label: ROUTE_LABELS.draft,
    rationale:
      'Gates clear, the instrument is on the approved shelf for this segment, and the client record is current — a direct message is appropriate.',
  };
}
```

- [ ] **Step 4: Add routed state**

In `src/state.ts`:

Add to the imports at the top:

```ts
import type { RouteId, RoutedMap } from './lib/routing';
```

Add to the `AppState` interface, just after `dismissed`:

```ts
  routed: RoutedMap;
```

Add to `initialState()`, just after `dismissed: {},`:

```ts
    routed: {},
```

Add to the `Action` union, just after the `DISMISS` entry:

```ts
  | { type: 'ROUTE_OPPORTUNITY'; id: string; route: RouteId; note: string }
```

Add this reducer case, just after the `DISMISS` case:

```ts
    case 'ROUTE_OPPORTUNITY':
      return { ...state, routed: { ...state.routed, [action.id]: { route: action.route, note: action.note } } };
```

- [ ] **Step 5: Exclude handed-off items from the queue**

In `src/lib/queue.ts`, add to the imports at the top:

```ts
import type { RoutedMap } from './routing';
```

Change `activeOpps`, `filteredOpps` and `clusters` to take `routed` alongside `dismissed`:

```ts
export function activeOpps(dismissed: Record<string, string>, routed: RoutedMap, clientIds?: Set<string>): Opportunity[] {
  return passedOpps(clientIds).filter(o => !(o.id in dismissed) && !(o.id in routed));
}

export function filteredOpps(
  dismissed: Record<string, string>,
  routed: RoutedMap,
  filters: Filters,
  clientsById: Record<string, { segment: string; tier: string }>,
  clientIds?: Set<string>
): Opportunity[] {
  return activeOpps(dismissed, routed, clientIds)
    .filter(o => {
      const c = clientsById[o.clientId];
      if (filters.segment !== 'all' && c.segment !== filters.segment) return false;
      if (filters.tier !== 'all' && c.tier !== filters.tier) return false;
      if (filters.family !== 'all' && PRODUCTS[o.productId].family !== filters.family) return false;
      if (o.amountAtStake < filters.minAmount) return false;
      if (filters.recency === 'fresh' && !(o.signal.recency === 'Today' || o.signal.recency === 'Yesterday')) return false;
      if (filters.recency === 'internal' && o.signal.recency !== 'Internal') return false;
      return true;
    })
    .sort((a, b) => signalScore(b) - signalScore(a) || a.daysToAct - b.daysToAct);
}
```

and:

```ts
export function clusters(dismissed: Record<string, string>, routed: RoutedMap, driversById: Record<string, Driver>, clientIds?: Set<string>) {
  const byDriver: Record<string, Opportunity[]> = {};
  activeOpps(dismissed, routed, clientIds).forEach(o => {
```

(the rest of `clusters` is unchanged).

- [ ] **Step 6: Render the route on the card**

In `src/components/OpportunityCard.tsx`, add to the imports:

```tsx
import { routeFor, type RouteId } from '../lib/routing';
```

Add `onHandoff` to the props — the signature becomes:

```tsx
export function OpportunityCard({
  opp, onOpenClient, onOpenOutreach, onDismiss, onHandoff,
}: {
  opp: Opportunity;
  onOpenClient: (id: string) => void;
  onOpenOutreach: (id: string) => void;
  onDismiss?: (id: string) => void;
  onHandoff: (oppId: string, route: RouteId) => void;
}) {
  const c = CLIENTS[opp.clientId];
  const signal = signalBreakdown(opp);
  const route = routeFor(opp, c);

  function runRoute(id: RouteId) {
    if (id === 'draft') onOpenOutreach(c.id);
    else onHandoff(opp.id, id);
  }
```

Replace the action row:

```tsx
      <div className="flex gap-2 flex-wrap mt-4">
        <Button size="sm" onClick={() => onOpenOutreach(c.id)}>Draft outreach</Button>
        {onDismiss && <Button variant="ghost" size="sm" onClick={() => onDismiss(opp.id)}>Dismiss</Button>}
      </div>
```

with:

```tsx
      <div className="mt-4">
        <div className="flex gap-2 flex-wrap items-center">
          <Button data-testid="route-primary" variant="primary" size="sm" onClick={() => runRoute(route.id)}>
            {route.label}
          </Button>
          {onDismiss && <Button variant="ghost" size="sm" onClick={() => onDismiss(opp.id)}>Dismiss</Button>}
        </div>
        <div data-testid="route-rationale" className="t-meta mt-2">{route.rationale}</div>
      </div>
```

- [ ] **Step 7: Wire the queue up**

In `src/components/QueueView.tsx`:

Add to the imports:

```tsx
import { ROUTE_LABELS, type RouteId } from '../lib/routing';
```

Change the destructure to include `routed`:

```tsx
  const { filters, dismissed, routed } = state;
```

Update the two memos to pass `routed`:

```tsx
  const surfaced = useMemo(
    () => filteredOpps(dismissed, routed, filters, CLIENTS, MY_CLIENT_IDS),
    [dismissed, routed, filters]
  );
  const blocked = useMemo(() => blockedOpps(MY_CLIENT_IDS), []);
  const cls = useMemo(() => clusters(dismissed, routed, DRIVERS, MY_CLIENT_IDS), [dismissed, routed]);
```

Add a handed-off list next to `dismissedList`:

```tsx
  const handedOffList = OPPS.filter(o => o.id in routed && MY_CLIENT_IDS.has(o.clientId));
```

Add the handoff handler next to `confirmDismiss`:

```tsx
  function handoff(oppId: string, route: RouteId) {
    dispatch({ type: 'ROUTE_OPPORTUNITY', id: oppId, route, note: '' });
  }
```

Pass it to the card, adding this prop to the `<OpportunityCard ... />` block:

```tsx
              onHandoff={handoff}
```

Add the Handed off section immediately **before** the `{dismissedList.length > 0 && (` block:

```tsx
      {handedOffList.length > 0 && (
        <>
          <div className="t-h1 mt-8 mb-1">Handed off</div>
          <div className="t-meta mb-3">
            These opportunities were routed somewhere other than a direct message. They stay out of the queue until the
            desk or the client comes back.
          </div>
          {handedOffList.map(o => {
            const c = CLIENTS[o.clientId];
            const r = routed[o.id];
            return (
              <div key={o.id} className="glass-tight p-4 mb-2 flex items-center justify-between gap-3 flex-wrap">
                <div>
                  <div className="t-h3">{c.name}</div>
                  <div className="t-meta">{c.segment}</div>
                </div>
                <Pill variant="flag">{ROUTE_LABELS[r.route]}{r.note ? ` — ${r.note}` : ''}</Pill>
              </div>
            );
          })}
        </>
      )}
```

- [ ] **Step 8: Run the harness to verify it passes**

```bash
npm run typecheck && npm run build && node tools/verify.js
```

Expected: `FAIL COUNT: 0` and `JS ERRORS: none`.

- [ ] **Step 9: Commit**

```bash
git add src/lib/routing.ts src/lib/queue.ts src/state.ts src/components/OpportunityCard.tsx src/components/QueueView.tsx tools/verify.js
git commit -m "Let the agent pick each opportunity's next step

Not every surfaced opportunity should become a message. One resting on
cash the client never stated an intent for needs a call first; one
breaching a concentration threshold belongs with the specialist desk.
Add a routing module that decides, and show its reasoning on the card.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

### Task 6: Handoff note capture and RM override

The handoff currently fires immediately with an empty note. Give it the modal, a ledger entry, and an "Other actions" menu so the RM can overrule the agent.

**Files:**
- Modify: `src/components/QueueView.tsx`
- Modify: `src/components/OpportunityCard.tsx`
- Test: `tools/verify.js`

**Interfaces:**
- Consumes: `Modal` from Task 4; `routeFor`, `ROUTE_LABELS`, `RouteId`, `ROUTE_LABELS` and the `onHandoff` prop from Task 5.
- Produces: nothing later tasks depend on — this is the last task.

- [ ] **Step 1: Write the failing assertions**

In `tools/verify.js`, find the Task 5 block and replace these three lines:

```js
  await davidCard.locator('[data-testid="route-primary"]').click();
  txt = await page.locator('main').innerText();
  check('Handed-off item leaves the surfaced list', /2 surfaced/.test(txt));
```

with:

```js
  await davidCard.locator('[data-testid="route-primary"]').click();
  check('Handoff opens the note modal', await page.locator('[data-testid="modal"]').count() === 1);
  await page.fill('[data-testid="modal"] textarea', 'Booked for Thursday morning');
  await page.click('[data-act="modal-confirm"]');
  txt = await page.locator('main').innerText();
  check('Handed-off item leaves the surfaced list', /2 surfaced/.test(txt));
  check('Handoff note is recorded', txt.includes('Booked for Thursday morning'));
```

Then add this block immediately after `check('Handing off kept us on the Queue tab', ...)`:

```js
  // The RM can overrule the agent's pick
  const priyaCard2 = page.locator('[data-testid="opportunity-card"]', { hasText: 'Priya Ravindran' });
  check('Alternate routes are hidden by default', await priyaCard2.locator('[data-testid="route-alt"]').count() === 0);
  await priyaCard2.locator('[data-testid="route-toggle"]').click();
  check('Other actions reveals the two routes not chosen', await priyaCard2.locator('[data-testid="route-alt"]').count() === 2);
  const altLabels = await priyaCard2.locator('[data-testid="route-alt"]').allInnerTexts();
  check('Alternates exclude the agent\'s own pick', !altLabels.some(l => l.includes('Refer to specialist')));
  await priyaCard2.locator('[data-testid="route-toggle"]').click();
  check('Other actions collapses again', await priyaCard2.locator('[data-testid="route-alt"]').count() === 0);
```

And add a ledger assertion in the Module 4 (Outreach) section, immediately after `await page.waitForSelector('#outreach-text');`:

```js
  await page.selectOption('#outreach-client-select', 'david');
  check('Handoff wrote an entry to the client ledger', (await page.locator('main').innerText()).includes('Booked for Thursday morning'));
  await page.selectOption('#outreach-client-select', 'chen');
```

- [ ] **Step 2: Run the harness to verify it fails**

```bash
npm run build && node tools/verify.js
```

Expected: `FAIL Handoff opens the note modal`, and the `route-toggle` locator times out.

- [ ] **Step 3: Add the override menu to the card**

In `src/components/OpportunityCard.tsx`, add `useState` to the React import (the file currently has no React import — add one at the top):

```tsx
import { useState } from 'react';
```

Add to the routing import so all three route ids are available:

```tsx
import { routeFor, ROUTE_LABELS, type RouteId } from '../lib/routing';
```

Inside the component, after `const route = routeFor(opp, c);`, add:

```tsx
  const [showAlts, setShowAlts] = useState(false);
  const alternates = (Object.keys(ROUTE_LABELS) as RouteId[]).filter(id => id !== route.id);
```

Replace the action block added in Task 5:

```tsx
      <div className="mt-4">
        <div className="flex gap-2 flex-wrap items-center">
          <Button data-testid="route-primary" variant="primary" size="sm" onClick={() => runRoute(route.id)}>
            {route.label}
          </Button>
          {onDismiss && <Button variant="ghost" size="sm" onClick={() => onDismiss(opp.id)}>Dismiss</Button>}
        </div>
        <div data-testid="route-rationale" className="t-meta mt-2">{route.rationale}</div>
      </div>
```

with:

```tsx
      <div className="mt-4">
        <div className="flex gap-2 flex-wrap items-center">
          <Button data-testid="route-primary" variant="primary" size="sm" onClick={() => runRoute(route.id)}>
            {route.label}
          </Button>
          <Button data-testid="route-toggle" variant="ghost" size="sm" onClick={() => setShowAlts(v => !v)}>
            Other actions {showAlts ? '▴' : '▾'}
          </Button>
          {onDismiss && <Button variant="ghost" size="sm" onClick={() => onDismiss(opp.id)}>Dismiss</Button>}
        </div>
        <div data-testid="route-rationale" className="t-meta mt-2">{route.rationale}</div>
        {showAlts && (
          <div className="flex gap-2 flex-wrap mt-2.5">
            {alternates.map(id => (
              <Button key={id} data-testid="route-alt" variant="ghost" size="sm" onClick={() => runRoute(id)}>
                {ROUTE_LABELS[id]}
              </Button>
            ))}
          </div>
        )}
      </div>
```

- [ ] **Step 4: Capture a note and write a ledger entry on handoff**

In `src/components/QueueView.tsx`, replace the `handoff` function from Task 5:

```tsx
  function handoff(oppId: string, route: RouteId) {
    dispatch({ type: 'ROUTE_OPPORTUNITY', id: oppId, route, note: '' });
  }
```

with this state plus handlers, placed alongside the dismiss ones:

```tsx
  const [handoffTarget, setHandoffTarget] = useState<{ oppId: string; route: RouteId } | null>(null);
  const [handoffNote, setHandoffNote] = useState('');

  function handoff(oppId: string, route: RouteId) {
    setHandoffNote('');
    setHandoffTarget({ oppId, route });
  }

  function confirmHandoff() {
    if (handoffTarget) {
      const { oppId, route } = handoffTarget;
      const note = handoffNote.trim();
      const opp = OPPS.find(o => o.id === oppId)!;
      dispatch({ type: 'ROUTE_OPPORTUNITY', id: oppId, route, note });
      dispatch({
        type: 'OUTREACH_NOSEND',
        entry: {
          ts: '14 Sep, 09:14',
          clientId: opp.clientId,
          kind: 'Non-send',
          detail: `${ROUTE_LABELS[route]}${note ? ` — ${note}` : ''}`,
          ref: null,
        },
      });
    }
    setHandoffTarget(null);
  }
```

Add the modal next to the dismiss one, immediately before the closing `</div>` of the returned JSX:

```tsx
      <Modal
        open={handoffTarget !== null}
        title={handoffTarget ? ROUTE_LABELS[handoffTarget.route] : ''}
        confirmLabel="Confirm"
        onConfirm={confirmHandoff}
        onClose={() => setHandoffTarget(null)}
      >
        <div className="t-meta mb-2">
          This leaves the queue and is recorded in the client's outcome ledger. A note is optional.
        </div>
        <textarea
          className="w-full border border-hairline-2 rounded-xl p-3 text-[14px] leading-relaxed min-h-[80px] font-sans"
          value={handoffNote}
          onChange={e => setHandoffNote(e.target.value)}
        />
      </Modal>
```

- [ ] **Step 5: Run the harness to verify it passes**

```bash
npm run typecheck && npm run build && node tools/verify.js
```

Expected: `FAIL COUNT: 0` and `JS ERRORS: none`.

- [ ] **Step 6: Check the phone-width layout by eye**

```bash
node tools/screenshot.js
```

The harness already asserts there is no horizontal overflow at 400px, but the route button row plus "Other actions" is new. Open the screenshot and confirm the action row wraps rather than crowding.

- [ ] **Step 7: Commit**

```bash
git add src/components/QueueView.tsx src/components/OpportunityCard.tsx tools/verify.js
git commit -m "Capture a note on handoff and let the RM overrule the route

A referral with no note loses the reason it was made, and an agent that
cannot be overruled is a gate rather than a recommendation. Add the note
modal, write the handoff to the outcome ledger, and expose the two
routes the agent did not pick.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

## Self-review notes

Spec coverage, section by section:

| Spec section | Task |
|---|---|
| Card layout — remove rank, orb, RM, tier, three pills | 1 |
| Card layout — click target | 2 |
| Agent routing — `routing.ts`, rules table, rationale | 5 |
| Agent routing — what each route does | 5 (draft/handoff), 6 (note + ledger) |
| Agent routing — RM override | 6 |
| State changes — `routed`, `ROUTE_OPPORTUNITY` | 5 |
| Park removal | 3 |
| Modal | 4 |
| Testing — harness cycle | every task |

Known ordering constraint: Task 3 removes the `parked` parameter from three
`queue.ts` functions and Task 5 adds a `routed` parameter to the same three.
Doing them out of order will leave `QueueView` calling a signature that does not
exist. Execute in order.
