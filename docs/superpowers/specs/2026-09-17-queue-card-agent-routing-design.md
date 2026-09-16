# Queue card cleanup and agent routing — design

Date: 2026-09-17
Status: approved, ready for implementation planning

## Problem

The Today's queue card carries more chrome than signal. It shows a rank badge,
an avatar orb, the RM's own name, the client tier, and three descriptive pills
(approach, product, signal recency) that duplicate information available
elsewhere. The four scoring dimensions that actually rank the queue — urgency,
relevancy, momentum, conviction — compete with all of it.

The card also assumes a single next step. Every surfaced opportunity offers
"Draft outreach", but in practice an opportunity can need a specialist desk, or
a clarifying call, before any message is appropriate. Deciding which of those
applies is the agent's job, and the card should show that decision.

Finally, two interaction defects: the whole card is a click target for opening
the client, which swallows clicks meant for the content; and Dismiss uses the
browser's built-in `prompt()`.

## Scope

In scope:

1. Strip the card down to the four scoring pills plus name, segment, amount and
   the three "why" boxes.
2. Replace the single "Draft outreach" action with an agent-chosen route.
3. Remove Park entirely.
4. Replace `prompt()` with a real modal.

Out of scope: the Blocked, Clients, News and Past Week views, except where a
shared component or a changed function signature forces an edit. The signal
scoring maths in `src/lib/signal.ts` is unchanged.

## Card layout

The left column of `OpportunityCard` collapses to a single clickable block:

```
BEFORE                                    AFTER
┌────────────────────────────────┐        ┌────────────────────────────────┐
│ ①  (●)  Chen Wei Liang         │        │ Chen Wei Liang       ← button  │
│         Premier · Priority ·   │        │ Premier              ← button  │
│         RM Aisha Rahman        │        │                                │
│         [Notify][SGD Struct…]  │        │ ●Urgency:High ●Relevancy:High  │
│         [Signal: Yesterday]    │        │ ●Momentum:High ●Conviction:2   │
│                                │        │                                │
│ ●Urgency:High ●Relevancy:High  │        │ (why boxes unchanged)          │
└────────────────────────────────┘        └────────────────────────────────┘
  whole card clickable                      only the name block clickable
```

Removed: the rank badge, the `Orb`, the ` · {tier} · RM {rm}` portion of the
meta line, and the three `neutral` pills for approach / product name / signal
recency.

Kept: the client name, the segment (Premier/Private — it keeps a second line
under the name for the click target, and the segment filter still exists), the
right-hand "Amount at stake" and "Window to act" block, the four scoring pills,
and the three why-boxes.

`Orb` stays in the codebase — `ClientsView` and `BlockedCard` still use it. Only
the import in `OpportunityCard` goes.

### Click target

The card `<div>` loses its `onClick`, its `cursor-pointer` and its
`hover:border-ink-3`. The name and segment lines move inside a single
`<button type="button">` with `text-left`, which calls `onOpenClient`. The
button gets a hover treatment (underline on the name) so it reads as
interactive. The existing `onClick={e => e.stopPropagation()}` wrapper on the
action row is then redundant and should be removed.

## Agent routing

A new pure module `src/lib/routing.ts` decides the next step for an
opportunity. It has no React and no state; it is a function of the opportunity
and the client record only, so it can be unit-tested directly.

```ts
export type RouteId = 'draft' | 'specialist' | 'clarify';

export interface Route {
  id: RouteId;
  label: string;      // button text
  rationale: string;  // one sentence shown under the button
}

export function routeFor(opp: Opportunity, client: Client): Route;
export const ROUTE_LABELS: Record<RouteId, string>;
```

Rules are evaluated in order; the first match wins.

| # | Route | Condition | Label |
|---|---|---|---|
| 1 | `clarify` | `opp.approach === 'Review'` **and** `opp.driverId === null` | Call to clarify |
| 2 | `specialist` | product family is `Discretionary` or `Insurance`, **or** `client.concentration` is non-null and `pct > threshold`, **or** `opp.amountAtStake >= 1_000_000` | Refer to specialist |
| 3 | `draft` | default | Draft outreach |

Rule 1 before rule 2 is deliberate: an opportunity resting on cash the client
never stated an intent for needs the client's own answer before anyone —
including a specialist — can size a product.

The `rationale` is built from whichever condition fired, so the card explains
itself rather than asserting. For example, rule 2 firing on a concentration
breach should say the breach is why, not just "specialist desk".

Against the current data, Aisha Rahman's three unblocked opportunities route one
to each branch: `david` → clarify, `priya` → specialist, `chen` → draft. This is
the demo case and is worth an explicit test.

### What each route does

`draft` keeps today's behaviour: dispatch `SET_OUTREACH_CLIENT` then
`SET_TAB: 'outreach'`.

`specialist` and `clarify` open a modal, take an optional free-text note, and on
confirm write both a ledger entry and a `ROUTE_OPPORTUNITY` record. The
opportunity then leaves the queue and appears in a new **Handed off** section
below, mirroring how Dismissed already renders.

### RM override

The card shows the agent's chosen route as the primary button. A plain
`Other actions ▾` toggle beneath it reveals the other two routes as ghost
buttons. Choosing one runs that route's behaviour. The agent is a
recommendation, not a gate — which is consistent with how RIN frames its other
controls.

## State changes

Added to `AppState`:

```ts
routed: Record<string, { route: RouteId; note: string }>;
```

Added action:

```ts
| { type: 'ROUTE_OPPORTUNITY'; id: string; route: RouteId; note: string }
```

Removed from `AppState`: `parked: Set<string>` and
`parkDates: Record<string, string>`. Removed action: `PARK`.

`routed` filters the queue the same way `dismissed` does.

## Park removal

Park is deleted end to end:

- `OpportunityCard`: the `onPark` prop, the `parkedResurfaceDate` prop and the
  Parked pill.
- `QueueView`: the Park handler, `parkedList`, the whole Parked section and its
  explanatory copy, and the now-unused `businessDaysAdd` / `TODAY` imports.
- `state.ts`: the `parked` and `parkDates` fields, their initial values, the
  `PARK` action type and its reducer case.
- `lib/queue.ts`: the leading `parked: Set<string>` parameter on `activeOpps`,
  `filteredOpps` and `clusters`, replaced by the new `routed` map so those
  functions still exclude handed-off items.

`QueueView` is the only caller of `filteredOpps` and `clusters`, so the
signature change is contained.

## Modal

A new `src/components/ui/Modal.tsx`, matching the existing `Button`/`Pill`
convention — small, presentational, no state of its own beyond what it is
given.

```ts
interface ModalProps {
  open: boolean;
  title: string;
  confirmLabel: string;
  onConfirm: () => void;
  onClose: () => void;
  children: ReactNode;
}
```

Behaviour: fixed backdrop, centred panel using the existing `glass` class,
closes on Escape and on backdrop click, confirm and cancel buttons using the
existing `Button` component. It renders `null` when `open` is false. No portal —
the app has a single root and no stacking-context problems.

It replaces both `prompt()` calls:

- `QueueView` Dismiss — title "Dismiss this opportunity", a reason textarea
  prefilled with "Client not reachable this week".
- `OutreachView` "Log a non-send" — title "Log a non-send", a reason textarea
  prefilled with "Client travelling this week".

It is also the modal used by the `specialist` and `clarify` routes.

## Testing

The project has no unit-test runner, but it has an end-to-end harness:
`tools/verify.js` drives a real Chromium via Playwright against a built `dist/`
served by `tools/serve.js`, asserting behaviour with a list of `check(label,
bool)` calls and exiting non-zero on any failure or any console error.

That harness is the test bed for this work. The cycle for every task is:

```
npm run typecheck && npm run build && node tools/verify.js
```

New behaviour gets a new `check(...)` written **before** the implementation, so
the run goes red first.

Existing assertions this work invalidates, which must be rewritten rather than
deleted wholesale:

- The Park block (`verify.js:65-71`) — deleted; Park no longer exists.
- The Dismiss block (`verify.js:73-78`) — the `page.once('dialog', ...)`
  handler must become an interaction with the new modal.
- The card-click assertion (`verify.js:48-52`) — clicking at `x:20, y:20` must
  become an explicit click on the name button, and a second assertion added
  that clicking the card body does *not* navigate.

`routeFor` is pure and its three-way split across Aisha's book is the single
most valuable assertion in this change: `david` → clarify, `priya` →
specialist, `chen` → draft.
