# Three Agent Loops Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Close the *clarify* referral loop the same way the *specialist* loop was already closed; turn the Blocked tab from a dead end into something the RM can act on; and add a follow-up agent that notices a sent message never got a reply.

**Architecture:** Three independent, additive features sharing one small foundation (a `NOW_TS` constant). Each follows the shape already proven by the specialist-reply loop: a pure function in `src/lib/` computes a deterministic, canned result; a reducer case records it and appends a ledger entry; the UI shows a pill + verdict box and offers the next action. None of the three touches another's code paths, and none removes anything already shipped.

**Where this came from:** A conversation on 2026-09-20 ranking further agentic enhancements to RIN. The specialist-reply loop and the news intake were built first (see `docs/superpowers/plans/2026-09-20-news-intake.md` and the specialist-callback commit `4215cdf`); this plan builds three more from that same ranked list: #1 (close the clarify loop), #3 (Blocked → action), #4 (a follow-up agent). #2 (meeting prep pack) and #5 (campaign detection) are deliberately left for later.

**Tech Stack:** React 18, TypeScript 5.6 (strict), Vite 5, Tailwind 3. Verification is Playwright driving a built `dist/` via `tools/verify.js`.

## Global Constraints

- **Verification command, run after every task:** `npm run typecheck && npm run build && node tools/verify.js`. The harness exits non-zero on any `FAIL` line *or* any browser console error. A task is not done until it exits 0.
- `tools/verify.js` serves `dist/`, not the dev server. **You must `npm run build` before `node tools/verify.js`.**
- **Stale server runbook:** `verify.js` has no try/finally. If a Playwright call throws, the child `serve.js` is orphaned on port 4310 and the next run prints `EADDRINUSE`. Run `lsof -nP -iTCP:4310 -sTCP:LISTEN`, confirm the listener's command is `tools/serve.js` from this checkout, kill only that PID, re-run.
- **Uppercase trap:** `.t-micro` renders `text-transform: uppercase`; never assert case-sensitively on an eyebrow label.
- **Design system (`docs/design-system.md`):** no black/near-black fills; no second accent colour; RIN's ambient motion (`rin-orb`, `typing-dot`, `bubble-in`) is not reused for anything that isn't RIN speaking; a pill is a label, not a sentence; copy is in the RM's words (no *gate*, *driver*, *reducer* on screen — but *suitability*, *mandate*, *consent*, *MNPI* stay, they're the RM's own vocabulary).
- **Do not** add dependencies. **Do not** rename or remove any existing `data-testid`, exported function name, or `AppState` field — every task below is additive.
- **Fixture facts this plan depends on** (`src/data/*`):
  - David Ong (`david`): `op-david`, route `clarify`, `incomeObjective: { target: 30000, actual: 21400, unit: 'SGD/yr' }`.
  - Robert Teo (`robert`): blocked, gate `suitability`, `op-robert` amount 410,000, product `fd-sgd`.
  - Tan Boon Kiat (`boonkiat`): blocked, gate `mnpi`, `op-boonkiat` amount 560,000.
  - Nadia Sulaiman (`nadia`): blocked, gate `permission`, `op-nadia` amount 420,000.
  - Marcus Wong (`marcus`): `op-marcus`, route `draft`, approach `Notify`, amount 300,000, rank 3 in today's queue.
- Commit after every task. End every commit message with the attribution line your session's reminder specifies (at the time of writing: `Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>`).

---

## Part 0 — Foundation

### Task 1: A shared `NOW_TS` constant

Every ledger-writing call site hardcodes the literal string `'14 Sep, 09:14'` — four times across three files. Part 3 (the follow-up agent) needs to compare a ledger entry's timestamp against "right now" by exact string equality, which only works if every live write uses the same literal. Extract it once.

**Files:**
- Modify: `src/lib/format.ts`
- Modify: `src/state.ts`
- Modify: `src/components/QueueView.tsx`
- Modify: `src/components/OutreachView.tsx`

**Interfaces:**
- Produces: `export const NOW_TS = '14 Sep, 09:14';` in `src/lib/format.ts`.

- [ ] **Step 1.** In `src/lib/format.ts`, add after the `TODAY` line:
  ```ts
  export const TODAY = new Date('2026-09-14T09:00:00');

  // The one "now" every live-written ledger entry uses. A shared constant (not
  // a fresh Date().toLocaleString() each time) keeps every entry's timestamp
  // byte-identical, which the follow-up agent relies on to tell "sent today"
  // from "sent on a stale, seeded date" by exact string equality.
  export const NOW_TS = '14 Sep, 09:14';
  ```

- [ ] **Step 2.** In `src/state.ts`, add `NOW_TS` to the existing import from `./lib/format` (there is currently no such import — add the line) directly under the other imports:
  ```ts
  import { NOW_TS } from './lib/format';
  ```
  Then in the `SPECIALIST_REPLY` reducer case, replace `ts: '14 Sep, 09:14'` with `ts: NOW_TS`.

- [ ] **Step 3.** In `src/components/QueueView.tsx`, add to the imports:
  ```ts
  import { NOW_TS } from '../lib/format';
  ```
  In `confirmHandoff`, replace `ts: '14 Sep, 09:14'` with `ts: NOW_TS`.

- [ ] **Step 4.** In `src/components/OutreachView.tsx`, add to the imports:
  ```ts
  import { NOW_TS } from '../lib/format';
  ```
  Replace both occurrences of `ts: '14 Sep, 09:14'` (in `commitSend` and in the "Log a non-send" `Modal`'s `onConfirm`) with `ts: NOW_TS`.

- [ ] **Step 5. Verify.** `npm run typecheck && npm run build && node tools/verify.js` → `FAIL COUNT: 0`. This is a pure refactor — every ledger-related assertion (`Handoff wrote an entry to the client ledger`, `Outreach send writes archived-channel ledger entry`, etc.) must still pass unchanged.

- [ ] **Step 6. Commit.**
  ```bash
  git add src/lib/format.ts src/state.ts src/components/QueueView.tsx src/components/OutreachView.tsx
  git commit -m "Extract a shared NOW_TS constant for live ledger writes

Pure refactor: the four call sites that hardcoded '14 Sep, 09:14' now
share one constant. Sets up the follow-up agent (Part 3), which needs
to tell a live-written entry from a seeded stale one by exact string
equality.

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"
  ```

---

## Part 1 — Close the clarify loop (David)

David routes to *Call to clarify* and, like the specialist route before it was fixed, dead-ends: once handed off, nothing ever brings him back. This closes the loop exactly the way the specialist reply did — a canned "call outcome," a verdict pill, and a route back into the queue with **Draft outreach** as the next step.

### Task 2: `src/lib/clarify.ts`

**Files:**
- Create: `src/lib/clarify.ts`

**Interfaces:**
- Produces: `export interface CallOutcome { verdict: string; nextStep: string }`, `export function callOutcome(opp: Opportunity, client: Client): CallOutcome`.

- [ ] **Step 1.** Create the file with exactly this content:
  ```ts
  import type { Client, Opportunity } from '../types';

  export interface CallOutcome {
    verdict: string;
    nextStep: string;
  }

  // A canned outcome standing in for the actual clarifying call, grounded in
  // the same income-objective gap the referral was made over. If a future
  // clarify-routed client has no incomeObjective on file, the call still
  // needs a deterministic answer — the fallback below gives one instead of
  // throwing on a missing field.
  export function callOutcome(opp: Opportunity, client: Client): CallOutcome {
    const first = client.name.split(' ')[0];
    const obj = client.incomeObjective;
    if (obj) {
      return {
        verdict: `${first} confirmed the gap is real — ${obj.actual.toLocaleString()} ${obj.unit} against the ${obj.target.toLocaleString()} ${obj.unit} he told you he wanted, and it's been on his mind too.`,
        nextStep: 'He wants to look at a higher-income reallocation, framed against the objective he set — not a product pitch.',
      };
    }
    return {
      verdict: `${first} confirmed there's no change to what he told you before.`,
      nextStep: 'Nothing further to raise for now.',
    };
  }
  ```

- [ ] **Step 2.** Typecheck: `npm run typecheck` → clean.

- [ ] **Step 3.** Sanity-check by hand against the fixture (no unit runner exists): David's `incomeObjective` is `{ target: 30000, actual: 21400, unit: 'SGD/yr' }`, so `callOutcome(opp, davidClient)` must return a verdict containing `21,400` and `30,000` (`toLocaleString()` on `30000` and `21400` with no locale argument renders `30,000` / `21,400` in a Node/browser environment with `en-US`-like default grouping — matches the pattern already used elsewhere in this file's sibling, e.g. `client.incomeObjective` rendering in `ClientDetail.tsx`).

- [ ] **Step 4. Commit.**
  ```bash
  git add src/lib/clarify.ts
  git commit -m "Add the clarify-call outcome module

Pure function, mirrors lib/specialist.ts exactly: a canned, grounded
outcome for the one client currently routed to 'Call to clarify'.

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"
  ```

---

### Task 3: State — `callOutcomes` and `CALL_OUTCOME_LOGGED`

**Files:**
- Modify: `src/state.ts`
- Modify: `src/types.ts`

**Interfaces:**
- Consumes: `NOW_TS` from Task 1.
- Produces: `AppState.callOutcomes: Record<string, { verdict: string; nextStep: string }>`; action `{ type: 'CALL_OUTCOME_LOGGED'; id: string; clientId: string; verdict: string; nextStep: string }`.

- [ ] **Step 1.** In `src/types.ts`, extend the `LedgerEntry.kind` union (currently `'Sent' | 'Non-send' | 'Specialist reply'`) to add `'Call outcome logged'`:
  ```ts
  kind: 'Sent' | 'Non-send' | 'Specialist reply' | 'Call outcome logged';
  ```

- [ ] **Step 2.** In `src/state.ts`, add to `AppState` (directly after `specialistReplies`):
  ```ts
  callOutcomes: Record<string, { verdict: string; nextStep: string }>;
  ```
  In `initialState()`, add directly after `specialistReplies: {},`:
  ```ts
  callOutcomes: {},
  ```
  In the `Action` union, add directly after the `SPECIALIST_REPLY` line:
  ```ts
  | { type: 'CALL_OUTCOME_LOGGED'; id: string; clientId: string; verdict: string; nextStep: string };
  ```
  (Move the trailing `;` from `SPECIALIST_REPLY`'s line to this new last line.)

  In the `reducer`, add a new case directly after the `SPECIALIST_REPLY` case (before `default:`):
  ```ts
  case 'CALL_OUTCOME_LOGGED': {
    // Same shape as SPECIALIST_REPLY: closing the loop drops it off "Handed
    // off" and re-enters the ranked queue, now carrying what was learned.
    const { [action.id]: _clarified, ...routedRest } = state.routed;
    return {
      ...state,
      routed: routedRest,
      callOutcomes: { ...state.callOutcomes, [action.id]: { verdict: action.verdict, nextStep: action.nextStep } },
      ledger: [...state.ledger, { ts: NOW_TS, clientId: action.clientId, kind: 'Call outcome logged', detail: action.verdict, ref: null }],
    };
  }
  ```

- [ ] **Step 3. Verify.** `npm run typecheck && npm run build && node tools/verify.js` → `FAIL COUNT: 0` (purely additive — nothing renders `callOutcomes` yet).

- [ ] **Step 4. Commit.**
  ```bash
  git add src/state.ts src/types.ts
  git commit -m "State: callOutcomes and CALL_OUTCOME_LOGGED

Mirrors specialistReplies/SPECIALIST_REPLY. Purely additive; nothing
renders it yet.

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"
  ```

---

### Task 4: UI — log the call, show what was learned, draft the note

**Files:**
- Modify: `src/components/QueueView.tsx`
- Modify: `src/components/OpportunityCard.tsx`
- Modify: `src/lib/assistant.ts`
- Modify: `src/components/OutreachView.tsx`

**Interfaces:**
- Consumes: `callOutcome` from Task 2; `state.callOutcomes` from Task 3.
- Produces: `OpportunityCard` gains an optional prop `callOutcome?: CallOutcome`; `data-testid="log-call-outcome"` (button on the Handed-off row), `data-testid="clarify-verdict"` (the verdict box); `export function clarifyOpeningMessage(client: Client, outcome: { verdict: string; nextStep: string }): string` in `assistant.ts`.

- [ ] **Step 1. QueueView.** Add to the imports:
  ```ts
  import { callOutcome } from '../lib/clarify';
  ```
  Destructure `callOutcomes` alongside the others:
  ```ts
  const { dismissed, routed, specialistReplies, callOutcomes } = state;
  ```
  Add a handler directly after `simulateSpecialistReply`:
  ```ts
  function logCallOutcome(opp: Opportunity) {
    const client = CLIENTS[opp.clientId];
    const outcome = callOutcome(opp, client);
    dispatch({ type: 'CALL_OUTCOME_LOGGED', id: opp.id, clientId: opp.clientId, verdict: outcome.verdict, nextStep: outcome.nextStep });
  }
  ```
  Add the new prop directly after the existing `specialistReply={specialistReplies[o.id]}` line on the `<OpportunityCard>` element (that line itself is unchanged):
  ```tsx
  callOutcome={callOutcomes[o.id]}
  ```
  In the Handed-off row, add a second conditional button directly after the existing `{r.route === 'specialist' && (...)}` block, inside the same `flex items-center gap-2 flex-wrap` div:
  ```tsx
  {r.route === 'clarify' && (
    <Button size="sm" variant="ghost" data-testid="log-call-outcome" onClick={() => logCallOutcome(o)}>
      Log the call outcome
    </Button>
  )}
  ```

- [ ] **Step 2. OpportunityCard.** Add to the imports:
  ```ts
  import type { CallOutcome } from '../lib/clarify';
  ```
  Add the prop to the destructured props and its type:
  ```ts
  export function OpportunityCard({
    rank, opp, onOpenClient, onOpenOutreach, onDismiss, onHandoff, specialistReply, callOutcome,
  }: {
    rank: number;
    opp: Opportunity;
    onOpenClient: (id: string) => void;
    onOpenOutreach: (id: string) => void;
    onDismiss?: (id: string) => void;
    onHandoff: (oppId: string, route: RouteId) => void;
    specialistReply?: SpecialistReply;
    callOutcome?: CallOutcome;
  }) {
  ```
  Generalise the "resolved" check — replace:
  ```ts
  const primaryId: RouteId = specialistReply ? 'draft' : route.id;
  const primaryLabel = specialistReply ? ROUTE_LABELS.draft : route.label;
  ```
  with:
  ```ts
  const resolved = specialistReply ?? callOutcome;
  const primaryId: RouteId = resolved ? 'draft' : route.id;
  const primaryLabel = resolved ? ROUTE_LABELS.draft : route.label;
  ```
  Add a second pill directly after the existing `{specialistReply && <Pill variant="pass" dot>Specialist reviewed</Pill>}`:
  ```tsx
  {callOutcome && <Pill variant="pass" dot>Call captured</Pill>}
  ```
  Add a second verdict box directly after the existing `{specialistReply && (...)}` block (the one with `data-testid="specialist-verdict"`), as its own sibling — this is a deliberate near-duplicate rather than a shared component: the two cases render for mutually-exclusive routes, and keeping them separate means Task 4 can't regress the already-shipped and harness-covered specialist block:
  ```tsx
  {callOutcome && (
    <div className="bg-green-wash rounded-xl p-3 mt-3" data-testid="clarify-verdict">
      <div className="t-micro mb-1">What {c.name.split(' ')[0]} said</div>
      <div className="text-[13.5px] leading-relaxed text-ink-2">{callOutcome.verdict} {callOutcome.nextStep}</div>
    </div>
  )}
  ```

- [ ] **Step 3. assistant.ts.** Add directly after `specialistOpeningMessage`:
  ```ts
  // Opens the chat differently when the RM arrives here straight off a
  // clarifying call — RIN leads with what was learned, not the usual
  // "I've drafted a note".
  export function clarifyOpeningMessage(client: Client, outcome: { verdict: string; nextStep: string }): string {
    const first = firstName(client);
    return `From the call with ${first}: ${outcome.verdict} ${outcome.nextStep} Want me to draft that note now?`;
  }
  ```

- [ ] **Step 4. OutreachView.** Add `clarifyOpeningMessage` to the existing import from `../lib/assistant` (in the same destructured import block as `specialistOpeningMessage`). Replace the opening-message effect:
  ```ts
  useEffect(() => {
    if (chat.length === 0) {
      const specialistReply = opp ? state.specialistReplies[opp.id] : undefined;
      const opening = specialistReply ? specialistOpeningMessage(c, specialistReply) : openingMessage(c, opp);
      dispatch({ type: 'CHAT_APPEND', clientId, message: { role: 'rin', text: opening } });
    }
  }, [clientId]);
  ```
  with:
  ```ts
  useEffect(() => {
    if (chat.length === 0) {
      const specialistReply = opp ? state.specialistReplies[opp.id] : undefined;
      const callOutcome = opp ? state.callOutcomes[opp.id] : undefined;
      const opening = specialistReply
        ? specialistOpeningMessage(c, specialistReply)
        : callOutcome
        ? clarifyOpeningMessage(c, callOutcome)
        : openingMessage(c, opp);
      dispatch({ type: 'CHAT_APPEND', clientId, message: { role: 'rin', text: opening } });
    }
  }, [clientId]);
  ```

- [ ] **Step 5. Verify.** `npm run typecheck && npm run build && node tools/verify.js` → `FAIL COUNT: 0` (no new assertions yet — Task 5 adds them; this step confirms nothing existing broke).

- [ ] **Step 6. Commit.**
  ```bash
  git add src/components/QueueView.tsx src/components/OpportunityCard.tsx src/lib/assistant.ts src/components/OutreachView.tsx
  git commit -m "Close the clarify loop: log the call, show what was learned, draft it

Mirrors the specialist-reply loop exactly, for the 'Call to clarify'
route: a 'Log the call outcome' button on the Handed-off row runs a
canned, grounded outcome (lib/clarify.ts), the opportunity re-enters
the queue with a 'Call captured' pill and a verdict box, and its
primary action becomes Draft outreach. RIN's Outreach opening message
leads with what was learned on the call instead of the usual
'I've drafted a note' line.

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"
  ```

---

### Task 5: Harness coverage for the clarify loop

**Files:**
- Modify: `tools/verify.js`

- [ ] **Step 1.** Find the end of the existing specialist-referral block — the lines:
  ```js
  await page.click('nav >> text=Queue');
  await page.waitForTimeout(150);

  // The RM can overrule the agent's pick
  ```
  (This is the `await page.click('nav >> text=Queue');` that immediately follows `RIN's opening message leads with the specialist's callback, not the usual draft line`.) Insert the following block **between** that `await page.waitForTimeout(150);` and the `// The RM can overrule the agent's pick` comment:

  ```js
  // ---- Close the clarify loop: log the call, then draft from what was learned ----
  const davidRow = page.locator('[data-testid="handed-off-row"]', { hasText: 'David Ong' });
  check('Handed off row offers a way to log the call outcome', await davidRow.locator('[data-testid="log-call-outcome"]').count() === 1);
  await davidRow.locator('[data-testid="log-call-outcome"]').click();
  check('Logging the call closes the referral and returns it to the surfaced queue', /05\s+surfaced/i.test(await page.locator('[data-testid="queue-stat-strip"]').innerText()));
  check('No longer listed under Handed off', await page.locator('[data-testid="handed-off-row"]', { hasText: 'David Ong' }).count() === 0);

  const davidCard2 = page.locator('[data-testid="opportunity-card"]', { hasText: 'David Ong' });
  const davidCardTxt = await davidCard2.innerText();
  check('Card shows the call-captured pill', /call captured/i.test(davidCardTxt));
  const clarifyTxt = await davidCard2.locator('[data-testid="clarify-verdict"]').innerText();
  check("Card shows what David said, grounded in his income objective", clarifyTxt.includes('21,400') && clarifyTxt.includes('30,000'));
  check('Primary action switches to Draft outreach once captured', (await davidCard2.locator('[data-testid="route-primary"]').innerText()).includes('Draft outreach'));

  await davidCard2.locator('[data-testid="route-primary"]').click();
  check('Draft outreach after a captured call opens Outreach for that client', await page.inputValue('#outreach-client-select') === 'david');
  await page.waitForSelector('[data-testid="chat-msg-rin"]');
  const davidOpening = await page.locator('[data-testid="chat-msg-rin"]').first().innerText();
  check("RIN's opening message leads with the call, not the usual draft line", davidOpening.includes('From the call with David') && davidOpening.includes('21,400'));
  await page.click('nav >> text=Queue');
  await page.waitForTimeout(150);

  ```

  Placement matters: this sits *after* the Huiling specialist-reply block completes (so its `03 surfaced` / `04 surfaced` checks, made while David is still parked in Handed off, are undisturbed) and *before* Priya's "Other actions" block (so David is back in the surfaced list, at `05`, by the time this new block's own assertions run — nothing later in Module 1 depends on the exact surfaced count again).

- [ ] **Step 2. Run the harness.** `npm run build && node tools/verify.js`. Expected: every new line `OK`, `FAIL COUNT: 0`. The pre-existing check later in the file (`Handoff wrote an entry to the client ledger`, which selects David in Outreach and looks for `'Booked for Thursday morning'`) must still pass — logging the call outcome only *appends* a ledger entry, it never removes the original handoff note.

- [ ] **Step 3. Commit.**
  ```bash
  git add tools/verify.js
  git commit -m "Harness: cover the clarify loop end to end

Log the call outcome on David's Handed-off row; the opportunity
returns to the surfaced queue with a 'Call captured' pill and a
verdict grounded in his income objective (21,400 vs 30,000); Draft
outreach opens Outreach with an opening message leading with the
call, not the default draft line. Confirms the original handoff note
survives in the ledger.

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"
  ```

---

## Part 2 — Blocked → action

Blocked cards today only explain *why* something is withheld. Two of the three gate types an RM's book can hit — a lapsed suitability review, missing cross-entity consent — are paperwork someone can be asked to clear. The third, an MNPI information barrier, genuinely isn't: it lifts on its own when the deal completes or is abandoned, and no request moves it. The feature tells the two apart and gives the RM a one-click, editable request for the ones that are actionable.

### Task 6: `src/lib/unblock.ts`

**Files:**
- Create: `src/lib/unblock.ts`

**Interfaces:**
- Consumes: `PRODUCTS` from `./data`; `fmt` from `./format`; `GateId`, `Opportunity`, `Client` from `../types`.
- Produces: `export interface UnblockAction { label: string; message: string }`, `export function unblockAction(gate: GateId, opp: Opportunity, client: Client): UnblockAction | null`.

- [ ] **Step 1.** Create the file with exactly this content:
  ```ts
  import type { Client, GateId, Opportunity } from '../types';
  import { PRODUCTS } from './data';
  import { fmt } from './format';

  export interface UnblockAction {
    label: string;   // the button text
    message: string; // the canned internal request, editable before it's logged
  }

  // Only some gates are something the RM can chase. A lapsed suitability
  // review or missing cross-entity consent is paperwork someone can be asked
  // to clear. An MNPI information barrier isn't — it lifts on its own when
  // the deal completes or is abandoned — and a shelf-eligibility gap is a
  // policy wall RIN has no lever on either, so both return null: there is
  // nothing honest to offer a button for.
  export function unblockAction(gate: GateId, opp: Opportunity, client: Client): UnblockAction | null {
    const product = PRODUCTS[opp.productId].name;
    switch (gate) {
      case 'suitability':
        return {
          label: 'Request a suitability refresh',
          message: `Requesting a refreshed suitability review for ${client.name} (${client.segment}, ${client.mandate} mandate) — last done ${client.suitability.lastReview}, now overdue. This is blocking a conversation about their ${product}, worth ${fmt(opp.amountAtStake)}.`,
        };
      case 'permission':
        return {
          label: 'Request cross-entity consent',
          message: `Requesting cross-entity data-sharing consent on file for ${client.name} so this record can cross the One Group perimeter to this RM. Blocking a conversation about their ${product}, worth ${fmt(opp.amountAtStake)}.`,
        };
      case 'eligibility':
      case 'mnpi':
        return null;
    }
  }
  ```

- [ ] **Step 2. Typecheck.** `npm run typecheck` → clean.

- [ ] **Step 3. Sanity-check by hand** against the three blocked fixtures: `unblockAction('suitability', op-robert, robert)` → label `Request a suitability refresh`, message includes `Robert Teo`, `Premier`, `Advisory mandate`, `2026-05-02`, `410,000`. `unblockAction('mnpi', op-boonkiat, boonkiat)` → `null`. `unblockAction('permission', op-nadia, nadia)` → label `Request cross-entity consent`, message includes `Nadia Sulaiman`, `420,000`.

- [ ] **Step 4. Commit.**
  ```bash
  git add src/lib/unblock.ts
  git commit -m "Add the unblock-action module

Pure function: suitability and permission gates get an editable,
grounded internal request; MNPI and eligibility gates honestly return
null — neither clears on a request.

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"
  ```

---

### Task 7: State — `unblockRequests` and `REQUEST_UNBLOCK`

**Files:**
- Modify: `src/state.ts`
- Modify: `src/types.ts`

**Interfaces:**
- Consumes: `NOW_TS` from Task 1.
- Produces: `AppState.unblockRequests: Record<string, boolean>`; action `{ type: 'REQUEST_UNBLOCK'; id: string; clientId: string; message: string }`.

- [ ] **Step 1.** In `src/types.ts`, extend `LedgerEntry.kind` again (it now reads `'Sent' | 'Non-send' | 'Specialist reply' | 'Call outcome logged'` after Task 3) to add `'Unblock requested'`:
  ```ts
  kind: 'Sent' | 'Non-send' | 'Specialist reply' | 'Call outcome logged' | 'Unblock requested';
  ```

- [ ] **Step 2.** In `src/state.ts`, add to `AppState` directly after `callOutcomes`:
  ```ts
  unblockRequests: Record<string, boolean>;
  ```
  In `initialState()`, add directly after `callOutcomes: {},`:
  ```ts
  unblockRequests: {},
  ```
  In the `Action` union, add directly after the `CALL_OUTCOME_LOGGED` line (move its trailing `;` down to this new line):
  ```ts
  | { type: 'REQUEST_UNBLOCK'; id: string; clientId: string; message: string };
  ```
  In the `reducer`, add a new case directly after `CALL_OUTCOME_LOGGED` (before `default:`):
  ```ts
  case 'REQUEST_UNBLOCK':
    return {
      ...state,
      unblockRequests: { ...state.unblockRequests, [action.id]: true },
      ledger: [...state.ledger, { ts: NOW_TS, clientId: action.clientId, kind: 'Unblock requested', detail: action.message, ref: null }],
    };
  ```

- [ ] **Step 3. Verify.** `npm run typecheck && npm run build && node tools/verify.js` → `FAIL COUNT: 0` (purely additive).

- [ ] **Step 4. Commit.**
  ```bash
  git add src/state.ts src/types.ts
  git commit -m "State: unblockRequests and REQUEST_UNBLOCK

Purely additive; nothing renders it yet.

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"
  ```

---

### Task 8: UI — request the unblock from the Blocked tab

**Files:**
- Modify: `src/components/BlockedCard.tsx`
- Modify: `src/components/BlockedView.tsx`
- Modify: `src/App.tsx`

**Interfaces:**
- Consumes: `unblockAction` from Task 6; `state.unblockRequests`, `REQUEST_UNBLOCK` from Task 7.
- Produces: `BlockedCard` gains props `requested: boolean` and `onRequest: (message: string) => void`. DOM hooks: `[data-testid="unblock-request"]` (the button), the existing `[data-testid="modal"]` (reused from `Modal`).

- [ ] **Step 1. Rewrite `src/components/BlockedCard.tsx`** to exactly this content:
  ```tsx
  import { useState } from 'react';
  import type { GateResult, Opportunity } from '../types';
  import { CLIENTS } from '../state';
  import { fmt } from '../lib/format';
  import { cn } from '../lib/cn';
  import { unblockAction } from '../lib/unblock';
  import { Pill } from './ui/Pill';
  import { Button } from './ui/Button';
  import { Modal } from './ui/Modal';

  export function BlockedCard({
    opp, gates, requested, onRequest,
  }: {
    opp: Opportunity;
    gates: GateResult;
    requested: boolean;
    onRequest: (message: string) => void;
  }) {
    const c = CLIENTS[opp.clientId];
    const blockedRow = gates.rows.find(r => r.status === 'block')!;
    const action = gates.blockingGate ? unblockAction(gates.blockingGate, opp, c) : null;
    const [modalOpen, setModalOpen] = useState(false);
    const [requestText, setRequestText] = useState(action?.message ?? '');

    return (
      <div className="glass border-t-2 border-t-red p-0 mb-4 overflow-hidden" data-oppid={opp.id} data-testid="blocked-card">
        <div className="flex items-start justify-between gap-4 flex-wrap p-5 pb-4">
          <div>
            <div className="t-h2">{c.name}</div>
            <div className="t-meta mt-0.5">{c.segment}</div>
          </div>
          <Pill variant="block" dot>Withheld from queue</Pill>
        </div>

        <div>
          {gates.rows.map(r => (
            <div
              key={r.gate}
              className={cn(
                'grid grid-cols-[7px_1fr] sm:grid-cols-[7px_170px_1fr] items-baseline gap-x-3 gap-y-1 text-[13.5px] py-3 px-5 border-t border-hairline',
                r.status === 'block' && 'bg-red-wash'
              )}
            >
              <span className={`dot dot-${r.status === 'pass' ? 'pass' : 'block'}`} />
              <span className={cn('font-semibold', r.status === 'block' ? 'text-red-deep' : 'text-ink')}>{r.label}</span>
              <span className="text-ink-2 text-[13px] col-start-2 sm:col-start-3">{r.reason}</span>
            </div>
          ))}
        </div>

        <div className="t-meta px-5 py-3 border-t border-hairline bg-sunk">
          Worth <span className="num font-semibold text-ink-2">{fmt(opp.amountAtStake)}</span> with {opp.daysToAct} days
          to act — held at <b className="text-ink-2">{blockedRow.label}</b>.
        </div>

        {requested ? (
          <div className="px-5 py-3 border-t border-hairline flex items-center gap-2 flex-wrap">
            <Pill variant="pass" dot>Requested</Pill>
            <span className="t-meta">Logged — you'll see it in the outcome ledger once it clears.</span>
          </div>
        ) : action ? (
          <div className="px-5 py-3 border-t border-hairline">
            <Button size="sm" variant="primary" data-testid="unblock-request" onClick={() => setModalOpen(true)}>
              {action.label}
            </Button>
          </div>
        ) : (
          <div className="px-5 py-3 border-t border-hairline t-meta">
            No RM-side action available — this clears on its own once the barrier lifts.
          </div>
        )}

        <Modal
          open={modalOpen}
          title={action?.label ?? ''}
          confirmLabel="Send request"
          onConfirm={() => { onRequest(requestText.trim() || action?.message || ''); setModalOpen(false); }}
          onClose={() => setModalOpen(false)}
        >
          <div className="t-meta mb-2">Recorded in {c.name}'s outcome ledger.</div>
          <textarea
            className="w-full border border-hairline-2 rounded-xl p-3 text-[14px] leading-relaxed min-h-[100px] font-sans"
            value={requestText}
            onChange={e => setRequestText(e.target.value)}
          />
        </Modal>
      </div>
    );
  }
  ```

- [ ] **Step 2. `src/components/BlockedView.tsx`.** Replace the whole file with exactly this content:
  ```tsx
  import type { Action, AppState } from '../state';
  import { MY_CLIENT_IDS } from '../state';
  import { blockedOpps } from '../lib/queue';
  import { BlockedCard } from './BlockedCard';

  export function BlockedView({ state, dispatch }: { state: AppState; dispatch: (a: Action) => void }) {
    const blocked = blockedOpps(MY_CLIENT_IDS);

    return (
      <div>
        <div className="t-display mb-1">Blocked</div>
        <div className="t-lead mb-5 max-w-[760px]">
          Held back by a compliance check. These never reach your queue until the check clears — there is no way to
          force them through.
        </div>

        {blocked.length
          ? blocked.map(x => (
              <BlockedCard
                key={x.opp.id}
                opp={x.opp}
                gates={x.gates}
                requested={!!state.unblockRequests[x.opp.id]}
                onRequest={message => dispatch({ type: 'REQUEST_UNBLOCK', id: x.opp.id, clientId: x.opp.clientId, message })}
              />
            ))
          : <div className="glass-tight p-4 t-meta">Nothing is currently withheld in your book.</div>}
      </div>
    );
  }
  ```
  (`MY_CLIENT_IDS` was previously imported from `'../state'` as a bare named import alongside nothing else — the file now needs both `MY_CLIENT_IDS` and the `Action`/`AppState` types from the same module, hence the two import lines above.)

- [ ] **Step 3. `src/App.tsx`.** Replace:
  ```tsx
  {state.tab === 'blocked' && <BlockedView />}
  ```
  with:
  ```tsx
  {state.tab === 'blocked' && <BlockedView state={state} dispatch={dispatch} />}
  ```

- [ ] **Step 4. Verify.** `npm run typecheck && npm run build && node tools/verify.js` → `FAIL COUNT: 0`. The existing checks `Blocked tab shows exactly 3 blocked cards` and `Robert Teo withheld (suitability) surfaced in Blocked tab` must still pass unchanged.

- [ ] **Step 5. Look at it.** `node tools/serve.js 4311 &`, open `http://localhost:4311`, Blocked tab. Robert Teo's card should show a red **Request a suitability refresh** button; Tan Boon Kiat's card should show the grey "No RM-side action available…" line instead of a button; Nadia Sulaiman's card should show **Request cross-entity consent**. Click Robert's button, confirm the modal opens with an editable, pre-filled message naming him and 410,000, click **Send request**, confirm the button is replaced by a green "Requested" pill. `kill %1`.

- [ ] **Step 6. Commit.**
  ```bash
  git add src/components/BlockedCard.tsx src/components/BlockedView.tsx src/App.tsx
  git commit -m "Blocked tab: request an unblock where one is actionable

Suitability and permission gates get a button that opens an editable,
record-grounded request; confirming logs it to the ledger and swaps
the button for a 'Requested' pill. MNPI and eligibility gates show an
honest 'clears on its own' line instead — no button pretending a
firewall responds to a request.

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"
  ```

---

### Task 9: Harness coverage for Blocked → action

**Files:**
- Modify: `tools/verify.js`

- [ ] **Step 1.** Find the existing Blocked module:
  ```js
  // ---- Module 3: Blocked ----
  await page.click('nav >> text=Blocked');
  await page.waitForSelector('[data-testid="blocked-card"]');
  check('Blocked tab shows exactly 3 blocked cards', await page.locator('[data-testid="blocked-card"]').count() === 3);
  txt = await page.locator('main').innerText();
  check('Robert Teo withheld (suitability) surfaced in Blocked tab', txt.includes('Robert Teo') && txt.includes('Suitability & mandate fit'));
  ```
  Insert the following **directly after** the last line above (before the next section, `// ---- Module 4: Outreach ...`):
  ```js

  const robertCard = page.locator('[data-testid="blocked-card"]', { hasText: 'Robert Teo' });
  check('Suitability gate offers a request action', await robertCard.locator('[data-testid="unblock-request"]').count() === 1);
  await robertCard.locator('[data-testid="unblock-request"]').click();
  check('Request opens a modal with an editable, pre-filled message', await page.locator('[data-testid="modal"] textarea').count() === 1);
  const prefill = await page.locator('[data-testid="modal"] textarea').inputValue();
  check('The message is grounded in the client record', prefill.includes('Robert Teo') && prefill.includes('410,000'));
  await page.click('[data-act="modal-confirm"]');
  check('Modal closes after confirming', await page.locator('[data-testid="modal"]').count() === 0);
  const robertTxt = await robertCard.innerText();
  check('Card shows Requested once sent', robertTxt.includes('Requested'));
  check('Request button is gone after requesting', await robertCard.locator('[data-testid="unblock-request"]').count() === 0);

  const boonkiatCard = page.locator('[data-testid="blocked-card"]', { hasText: 'Tan Boon Kiat' });
  check('An MNPI firewall offers no request action', await boonkiatCard.locator('[data-testid="unblock-request"]').count() === 0);
  check('MNPI card explains why there is nothing to request', (await boonkiatCard.innerText()).includes('clears on its own'));

  const nadiaCard = page.locator('[data-testid="blocked-card"]', { hasText: 'Nadia Sulaiman' });
  check('A missing-consent gate also offers a request action', await nadiaCard.locator('[data-testid="unblock-request"]').count() === 1);
  ```

- [ ] **Step 2. Run the harness.** `npm run build && node tools/verify.js`. Expected: every new line `OK`, `FAIL COUNT: 0`.

- [ ] **Step 3. Commit.**
  ```bash
  git add tools/verify.js
  git commit -m "Harness: cover Blocked -> action end to end

Robert Teo's suitability gate opens an editable, record-grounded
request modal that logs to the ledger and swaps the button for a
Requested pill. Tan Boon Kiat's MNPI gate offers no button and says
why. Nadia Sulaiman's missing-consent gate offers a request too.

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"
  ```

---

## Part 3 — A follow-up agent

RIN forgets the moment a message is sent. This adds one seeded, honest example of the opposite: a note went out three days ago, nothing came back, and RIN says so — with a button that reopens the same conversation, framed as a follow-up.

The mechanism is deliberately simple and fully deterministic: a tiny fixture (`FOLLOW_UPS`, one entry) says who was contacted, when, and about what. A follow-up counts as "still open" for as long as there is no *live* `Sent` entry for that client in the ledger (a seeded historical `Sent` entry doesn't count — only one whose `ts` is today's `NOW_TS`). The moment the RM actually sends Marcus a fresh note, the follow-up resolves itself — no extra action or state needed to "clear" it.

### Task 10: Seed the fixture — a stale send with no reply

**Files:**
- Modify: `src/state.ts`

**Interfaces:**
- Produces: `export interface FollowUpSeed { clientId: string; sentTs: string; daysAgo: number; about: string }`, `export const FOLLOW_UPS: FollowUpSeed[]`.

- [ ] **Step 1.** In `src/state.ts`, add directly after the `SEED_DRAFT_CHEN` constant:
  ```ts
  export interface FollowUpSeed {
    clientId: string;
    sentTs: string;   // when the original note went out — deliberately not NOW_TS
    daysAgo: number;
    about: string;    // plain-English: what the note was about
  }

  // A stale send with no reply, seeded so the follow-up agent has something
  // real to point at. Marcus already has a live opportunity today (his bond
  // matures in 8 days) — the earlier note and today's opportunity are the
  // same live matter, which is exactly why a follow-up is still worth it.
  export const FOLLOW_UPS: FollowUpSeed[] = [
    { clientId: 'marcus', sentTs: '11 Sep, 10:20', daysAgo: 3, about: 'his corporate bond maturing soon' },
  ];
  ```

- [ ] **Step 2.** In `initialState()`, seed the matching historical ledger entry — add to the `ledger` array (currently `ledger: [],`):
  ```ts
  ledger: [
    { ts: '11 Sep, 10:20', clientId: 'marcus', kind: 'Sent', detail: 'Notify message sent', ref: 'Archived Client Comms · ARC-M3RC5Q' },
  ],
  ```

- [ ] **Step 3. Verify.** `npm run typecheck && npm run build && node tools/verify.js` → `FAIL COUNT: 0`. Nothing reads `FOLLOW_UPS` yet, and the seeded ledger entry doesn't render anywhere existing checks look — the closest existing check, `Outreach send writes archived-channel ledger entry`, only checks that the *string* `'Archived Client Comms'` appears somewhere on the page after Chen's send; Marcus's seeded ledger entry, once rendered on his own Outreach page, contains that exact string too — but the RM is on Chen's page at that point in the harness, not Marcus's, so this is not yet visible and cannot cause a false positive or negative.

- [ ] **Step 4. Commit.**
  ```bash
  git add src/state.ts
  git commit -m "Seed a stale send with no reply, for the follow-up agent

One fixture: Marcus was sent a Notify message 3 days ago about his
maturing bond, and nothing has followed up on it. Purely additive.

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"
  ```

---

### Task 11: UI — surface it in the Queue, lead with it in Outreach

**Files:**
- Modify: `src/components/QueueView.tsx`
- Modify: `src/lib/assistant.ts`
- Modify: `src/components/OutreachView.tsx`

**Interfaces:**
- Consumes: `FOLLOW_UPS`, `NOW_TS` from Tasks 10 and 1.
- Produces: `export function followUpOpeningMessage(client: Client, daysAgo: number, about: string): string` in `assistant.ts`. DOM hooks: `[data-testid="needs-followup-row"]`, `[data-testid="draft-followup"]`.

- [ ] **Step 1. QueueView.** Add `FOLLOW_UPS` and `NOW_TS` to the imports:
  ```ts
  import { CLIENTS, DRIVERS, MY_CLIENT_IDS, CURRENT_RM, FOLLOW_UPS } from '../state';
  ```
  (This extends the existing import line — add `FOLLOW_UPS` to the list already there.) Add:
  ```ts
  import { NOW_TS } from '../lib/format';
  ```
  Destructure `ledger` from `state` alongside the others:
  ```ts
  const { dismissed, routed, specialistReplies, callOutcomes, ledger } = state;
  ```
  Add a derived list directly after `handedOffList`:
  ```ts
  // A follow-up is still open as long as no *live* Sent entry exists for that
  // client — the moment the RM actually sends a fresh note, this list drops
  // them on its own, no separate "resolve" action needed.
  const needsFollowUp = FOLLOW_UPS.filter(f =>
    MY_CLIENT_IDS.has(f.clientId) &&
    !ledger.some(l => l.clientId === f.clientId && l.kind === 'Sent' && l.ts === NOW_TS)
  );
  ```
  Add a new section directly after the `{handedOffList.length > 0 && (...)}` block and before `{dismissedList.length > 0 && (...)}`:
  ```tsx
  {needsFollowUp.length > 0 && (
    <>
      <div className="t-h1 mt-8 mb-1">Needs a follow-up</div>
      <div className="t-meta mb-3">
        Sent, with nothing back yet.
      </div>
      {needsFollowUp.map(f => {
        const c = CLIENTS[f.clientId];
        return (
          <div key={f.clientId} data-testid="needs-followup-row" className="glass-tight p-4 mb-2 flex items-center justify-between gap-3 flex-wrap">
            <div>
              <div className="t-h3">{c.name}</div>
              <div className="t-meta">Sent {f.sentTs} · {f.daysAgo} days ago — no reply since.</div>
            </div>
            <Button
              size="sm"
              variant="primary"
              data-testid="draft-followup"
              onClick={() => { dispatch({ type: 'SET_OUTREACH_CLIENT', id: f.clientId }); dispatch({ type: 'SET_TAB', tab: 'outreach' }); }}
            >
              Draft follow-up
            </Button>
          </div>
        );
      })}
    </>
  )}
  ```

- [ ] **Step 2. assistant.ts.** Add directly after `clarifyOpeningMessage`:
  ```ts
  // Opens the chat differently when a note already went out and nothing came
  // back — RIN leads with that instead of the usual "I've drafted a note".
  export function followUpOpeningMessage(client: Client, daysAgo: number, about: string): string {
    const first = firstName(client);
    return `You sent ${first} a note ${daysAgo} days ago about ${about} — no reply yet. Want me to draft a follow-up?`;
  }
  ```

- [ ] **Step 3. OutreachView.** Add `FOLLOW_UPS` to the existing import from `../state`:
  ```ts
  import { MY_CLIENT_IDS, CLIENTS, FOLLOW_UPS } from '../state';
  ```
  Add `followUpOpeningMessage` to the existing import from `../lib/assistant`. Replace the opening-message effect (as it stands after Task 4, Step 4):
  ```ts
  useEffect(() => {
    if (chat.length === 0) {
      const specialistReply = opp ? state.specialistReplies[opp.id] : undefined;
      const callOutcome = opp ? state.callOutcomes[opp.id] : undefined;
      const opening = specialistReply
        ? specialistOpeningMessage(c, specialistReply)
        : callOutcome
        ? clarifyOpeningMessage(c, callOutcome)
        : openingMessage(c, opp);
      dispatch({ type: 'CHAT_APPEND', clientId, message: { role: 'rin', text: opening } });
    }
  }, [clientId]);
  ```
  with:
  ```ts
  useEffect(() => {
    if (chat.length === 0) {
      const specialistReply = opp ? state.specialistReplies[opp.id] : undefined;
      const callOutcome = opp ? state.callOutcomes[opp.id] : undefined;
      const followUp = FOLLOW_UPS.find(f =>
        f.clientId === clientId && !state.ledger.some(l => l.clientId === clientId && l.kind === 'Sent' && l.ts === NOW_TS)
      );
      const opening = specialistReply
        ? specialistOpeningMessage(c, specialistReply)
        : callOutcome
        ? clarifyOpeningMessage(c, callOutcome)
        : followUp
        ? followUpOpeningMessage(c, followUp.daysAgo, followUp.about)
        : openingMessage(c, opp);
      dispatch({ type: 'CHAT_APPEND', clientId, message: { role: 'rin', text: opening } });
    }
  }, [clientId]);
  ```
  (`NOW_TS` is already imported in this file from Task 1.)

- [ ] **Step 4. Verify.** `npm run typecheck && npm run build && node tools/verify.js` → `FAIL COUNT: 0`. No new assertions yet (Task 12 adds them) — this confirms nothing existing broke, in particular the Queue's card count and stat-strip checks (Marcus still has his own live opportunity card, unaffected by the new section beneath it).

- [ ] **Step 5. Look at it.** `node tools/serve.js 4311 &`, open `http://localhost:4311`, Queue tab, scroll down: a **Needs a follow-up** section should show Marcus Wong, "Sent 11 Sep, 10:20 · 3 days ago — no reply since." Click **Draft follow-up** — Outreach opens for Marcus, RIN's first message reads "You sent Marcus a note 3 days ago about his corporate bond maturing soon — no reply yet. Want me to draft a follow-up?". Send the note (the default draft passes the coach checks unmodified). Go back to Queue — the **Needs a follow-up** section is gone entirely (Marcus was the only entry). `kill %1`.

- [ ] **Step 6. Commit.**
  ```bash
  git add src/components/QueueView.tsx src/lib/assistant.ts src/components/OutreachView.tsx
  git commit -m "Follow-up agent: notice a sent message with no reply

A 'Needs a follow-up' section on the Queue lists any client whose
last Sent ledger entry is stale (seeded, not today's NOW_TS). Draft
follow-up opens Outreach with RIN leading with the earlier note
instead of the usual draft line. Sending resolves it on its own —
no separate action needed, since the check is just 'is there a live
Sent entry yet'.

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"
  ```

---

### Task 12: Harness coverage for the follow-up agent

**Files:**
- Modify: `tools/verify.js`

- [ ] **Step 1.** Insert a new block at the very end of Module 1 (Queue), directly before the `// ---- Module 2: Clients ----` comment (i.e. after the existing Priya-dismissed check `check('Priya dismissed with reason recorded', ...)`):
  ```js

  // ---- Follow-up agent: a stale send with no reply ----
  const marcusFollowUp = page.locator('[data-testid="needs-followup-row"]', { hasText: 'Marcus Wong' });
  check('Queue surfaces a stale send as needing a follow-up', await marcusFollowUp.count() === 1);
  check('The row says when it was sent and how long ago', (await marcusFollowUp.innerText()).includes('11 Sep, 10:20') && (await marcusFollowUp.innerText()).includes('3 days ago'));
  await marcusFollowUp.locator('[data-testid="draft-followup"]').click();
  check('Draft follow-up opens Outreach for that client', await page.inputValue('#outreach-client-select') === 'marcus');
  await page.waitForSelector('[data-testid="chat-msg-rin"]');
  const marcusOpening = await page.locator('[data-testid="chat-msg-rin"]').first().innerText();
  check("RIN's opening message leads with the earlier send, not the usual draft line", marcusOpening.includes('3 days ago') && marcusOpening.includes('corporate bond'));

  const marcusSendPrev = await page.locator('[data-testid="chat-msg-rin"]').count();
  await page.click('[data-act="outreach-send"]');
  await page.waitForFunction(
    n => document.querySelectorAll('[data-testid="chat-msg-rin"]').length > n && !document.querySelector('[data-streaming]'),
    marcusSendPrev, { timeout: 8000 }
  );
  check('The default follow-up draft sends cleanly', (await page.locator('main').innerText()).includes('Archived Client Comms'));

  await page.click('nav >> text=Queue');
  await page.waitForTimeout(150);
  check('Resolved follow-up disappears from the Queue on its own', await page.locator('[data-testid="needs-followup-row"]').count() === 0);

  ```

- [ ] **Step 2. Run the harness.** `npm run build && node tools/verify.js`. Expected: every new line `OK`, `FAIL COUNT: 0`. If `The default follow-up draft sends cleanly` fails, read the chat's last RIN message (`page.locator('[data-testid="chat-msg-rin"]').last().innerText()`) — it will name exactly which coach check failed, since `checkFailureMessage` always does; Task 10/11 assume Marcus's unmodified default draft passes every check (`runCoachChecks` in `src/lib/coach.ts`), matching the same code path already exercised for every other client's default draft in this suite.

- [ ] **Step 3. Commit.**
  ```bash
  git add tools/verify.js
  git commit -m "Harness: cover the follow-up agent end to end

Queue surfaces Marcus's stale send; Draft follow-up opens Outreach
with an opening message naming the elapsed time and the bond; the
default draft sends cleanly; the Queue's follow-up row disappears on
its own afterward — no separate 'resolve' action to test.

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"
  ```

---

## Part 4 — Record it

### Task 13: Design system and README

**Files:**
- Modify: `docs/design-system.md`
- Modify: `README.md`

- [ ] **Step 1.** In `docs/design-system.md`, under `**Also in the system now**`, add as the last bullet:
  ```
  - The Queue's "closed loop" pattern — a canned, grounded verdict in a
    `bg-green-wash` box (`data-testid="specialist-verdict"` /
    `"clarify-verdict"`), a "Reviewed"-style `Pill`, and a primary action
    that switches to Draft outreach — is now used twice (specialist reply,
    clarify call outcome). If a third referral type needs the same
    treatment, follow this shape rather than inventing a new one.
  ```

- [ ] **Step 2.** Under `## Migration log`, add after the bring-your-own-news entry:
  ```
  **2026-09-20 — three more agent loops.** The clarify route (David) now
  closes the same way the specialist route does: a canned call outcome,
  a verdict, Draft outreach. The Blocked tab offers an editable, record-
  grounded request for suitability/permission gates, and says honestly
  that MNPI/eligibility gates have no RM-side action. A follow-up agent
  flags a stale send with no reply (seeded: Marcus, 3 days) and resolves
  itself the moment a fresh note actually sends. Plan:
  `docs/superpowers/plans/2026-09-20-three-agent-loops.md`.
  ```

- [ ] **Step 3.** In `README.md`, find the Blocked tab's description (search for `Blocked`) and add one sentence noting the request action, e.g.: `Where a gate is something an RM can chase (a lapsed suitability review, missing cross-entity consent), a button opens an editable, record-grounded request; an MNPI firewall says plainly that nothing can be requested.` Find the Queue tab's description and add: `A "Needs a follow-up" section flags a sent message with no reply.`

- [ ] **Step 4. Final verification.** `npm run typecheck && npm run build && node tools/verify.js` → `FAIL COUNT: 0`. Then run the detector once: from this session's earlier invocations, the command is `"/Users/teckkai/.claude/plugins/cache/impeccable/impeccable/4.3.1/skills/impeccable/scripts/impeccable" detect --json src/` (adjust the version segment if it has changed) — expected output `[]`.

- [ ] **Step 5. Commit.**
  ```bash
  git add docs/design-system.md README.md
  git commit -m "Document the three new agent loops in the design system and README

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"
  ```

---

## Self-review against the ranked list this plan implements

- **#1, close the clarify loop** — Tasks 2–5. Mirrors the already-shipped, harness-covered specialist-reply loop exactly (same shape: canned pure function → reducer case → pill + verdict box → Draft outreach → tailored opening message), applied to David's `clarify` route.
- **#3, Blocked → action** — Tasks 6–9. Suitability and permission gates get an editable, grounded request; MNPI and eligibility gates honestly say there's nothing to request, rather than offering a button that does nothing.
- **#4, follow-up agent** — Tasks 10–12. One seeded stale send (Marcus, 3 days, no reply); a Queue section that surfaces it; an Outreach opening message that leads with it; resolves itself the instant a fresh note sends, with no separate "mark handled" action.
- **Foundation** — Task 1 extracts `NOW_TS` first, since Part 3's stale-vs-live check depends on every live write sharing one literal.
- **Nothing shipped is removed or renamed** — every task is additive; `data-testid`s, exported names, and `AppState` fields from prior work are all untouched.
- **#2 (meeting prep pack) and #5 (campaign detection) are out of scope** for this plan, as agreed in conversation — left for a future pass.
