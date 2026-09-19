# Outreach chat assistant — design

Date: 2026-09-19
Status: approved, ready for implementation planning

## Problem

The Outreach tab is a form: pick an approach, edit a textarea, press
"Review draft", read a checklist, accept or reject a rewrite, press Send.
It works, but it presents RIN as a linter, not a colleague. The pitch for
RIN is that it *drafts with* the RM. The interaction should be a
conversation — "make it more casual", "add the figures" — with the email
updating live, and the compliance checks happening as the last thing before
Send rather than as a button the RM has to remember to press.

There is no backend and no LLM in this prototype. The assistant must be
deterministic and fully client-side, while presenting — in the UI and in a
pitch — as a real conversational assistant. Deterministic under the hood is a
feature here: the same demo plays out the same way every time, and the
harness can assert on it.

## Scope

In scope:

1. A pure assistant module: turns a request (preset or free text) into a
   change to a **draft spec**, renders the email from that spec, and writes
   RIN's reply in natural language.
2. A split Outreach layout: chat on the left (thread, preset chips, free-text
   input, typing indicator), live editable draft on the right (textarea,
   Send, Log a non-send). Client selector above, outcome ledger below.
3. Send runs the existing coach checks as the final gate. A clean draft
   sends; a draft with problems is refused **in chat**, with a "Fix it for
   me" chip that regenerates a clean draft from the record.
4. Removal of the approach selector, the Review button, the checks panel, and
   the accept/reject rewrite loop — and the state and reducer cases that
   only existed for them.

Out of scope: any network call; persistence of chat across reloads; other
tabs. `lib/coach.ts`'s `runCoachChecks` is reused unchanged; its
`suggestRewrite` becomes dead and is deleted.

## The assistant module — `src/lib/assistant.ts`

Pure TypeScript. Imports only `../types` and `./format`. No React, no state,
no side effects. This is the one file that would be replaced if a real model
were wired in later; nothing in the UI knows how the reply was produced.

### Draft spec

The assistant never edits free text. It holds a small spec per client and
re-renders the whole email from spec + client record + opportunity every
time. That is what makes "shorter" after "casual" after "add the figures"
always produce clean prose.

```ts
export type Tone = 'formal' | 'neutral' | 'casual';
export type Length = 'short' | 'full';
export interface DraftSpec { tone: Tone; length: Length; figures: boolean; cta: boolean }
export const DEFAULT_SPEC: DraftSpec = { tone: 'neutral', length: 'full', figures: false, cta: true };
```

### Rendering — `renderDraft(client, opp, spec): string`

Five parts joined by blank lines: greeting, opening line, optional figures
line, optional call-to-action, sign-off, then the disclosure.

| Part | formal | neutral | casual |
|---|---|---|---|
| Greeting | `Dear {full name},` | `Hi {first},` | `Hi {first}, hope you're well!` |
| Opening prefix | — | — | `Quick one — ` |
| CTA | `Would you have fifteen minutes this week for a short call?` | `Worth a short call this week if you have fifteen minutes.` | `Got fifteen minutes this week for a quick call?` |
| Sign-off | `Kind regards,\nAisha Rahman` | `Best,\nAisha` | `Cheers,\nAisha` |

The opening line depends on the opportunity's `approach` (the agent already
chose it; there is no longer a selector):

- **Notify:** `Your {holding label} of {amount} comes up for renewal within
  the next {daysToAct} days, and there is a rate change expected before then
  that is worth knowing about.`
- **Contextualise:** `Something in today's market news touches a position you
  hold — your {holding label} of {amount} — and I wanted you to hear it from
  me first.`
- **Review:** `When we last reviewed your portfolio we set an objective
  together, and the latest figures suggest it has drifted. I think it is
  worth a short review.`

The figures line, present only when `figures` is true **and** `length` is
`full`: `For reference: {holding label}, {amount} — {holding note}.`

`length: 'short'` drops the figures line; everything else stays.

The disclosure is always the last line: `This message is for information
only and is not financial advice.`

**Invariant:** a rendered draft passes every check in `runCoachChecks` for
its client. Every SGD figure is `fmt(client.holdings[0].value)`; there is
no pitch language, no advice language; the disclosure matches the coach's
regex; casual tone uses one `!` and never "hey". The plan's harness asserts
this by sending a regenerated draft and expecting a ledger write.

### Intents — `parseIntent(text): Intent | null`

```ts
export type Intent = 'formal' | 'casual' | 'shorter' | 'longer' | 'figures' | 'cta' | 'reset' | 'fix';
```

Keyword match, first hit wins, in this order: `reset` (start over, reset,
from scratch), `fix` (fix, clean up, correct), `formal` (formal,
professional, polite), `casual` (casual, friendly, relaxed, warm, informal),
`shorter` (short, shorter, brief, concise, trim), `longer` (longer, more
detail, expand), `figures` (figure, number, amount, rate, details), `cta`
(call, meeting, catch up). Anything else returns `null`.

`applyIntent(spec, intent)` is a pure update: `formal`/`casual` set tone;
`shorter` sets length short; `longer` sets length full and figures on;
`figures` sets figures on and length full; `cta` sets cta on; `reset`
returns `DEFAULT_SPEC`; `fix` returns the spec unchanged (the point of
"fix" is to regenerate from the record with the current spec).

### RIN's voice

- `openingMessage(client, opp)` — first message in a fresh thread. With an
  opportunity: `I've drafted a note to {first} — {signal headline,
  lower-cased}. Want it more formal, more casual, shorter, or with the
  figures from the record?` Without one: `There's no active opportunity for
  {first} today. You can still write a note on the right and I'll check it
  before it goes.`
- `replyFor(intent, client)` — one sentence or two per intent, naming what
  changed and, for `figures`, quoting the figure and its source note. The
  `null` case is the redirect: `I can adjust the tone (more formal or more
  casual), the length, or pull the figures from {first}'s record into the
  note. Which would you like?`
- `checkFailureMessage(checks)` — for a refused send. Opens with `I can't
  send this yet — here's what I found:` when any check failed, or `Before
  this goes, one thing to note:` when there are only flags; then one bullet
  per non-passing check (`• {rule}: {detail}`); then `Say "fix it" and I'll
  rewrite it from the record, or edit the draft on the right.`
- `sentMessage(client, ref)` — `Sent to {first} and archived as {ref}. I've
  logged it in the outcome ledger.`

## State

Added to `AppState`:

```ts
chatByClient: Record<string, ChatMessage[]>;   // ChatMessage = { role: 'rin' | 'rm'; text: string }
specByClient: Record<string, DraftSpec>;
```

Added actions: `CHAT_APPEND { clientId, message }` and `SET_DRAFT_SPEC {
clientId, spec }`.

Removed: `outreachApproach`, `draftResultByClient`, and the actions
`SET_APPROACH`, `DRAFT_REVIEW`, `DRAFT_ACCEPT`, `DRAFT_REJECT`,
`DRAFT_CLEAR`. `SET_OUTREACH_CLIENT` no longer resets an approach.
`DRAFT_SET_TEXT` stays — it is how the textarea and the assistant both write
the draft.

`draftByClient` keeps its seed: Chen's draft with the wrong SGD 500,000
figure and the pitch language. It is the demo's best scene and now plays out
in chat.

## Interaction

A thread is seeded with `openingMessage` the first time a client's chat is
empty. The RM speaks either by clicking a preset chip (**More formal · More
casual · Shorter · Add the figures · Start over**) or by typing into the
input and pressing Enter / "Ask". Either way:

1. The RM's text is appended to the thread immediately.
2. A typing indicator (`•••` in a RIN bubble) shows for 600 ms.
3. When it clears: if an intent was recognised and there is an opportunity,
   the spec is updated and the draft on the right is re-rendered; then RIN's
   reply is appended. Chips and input are disabled while RIN is "typing".

**Send** runs `runCoachChecks(client, draft)`:

- Every check passes → `OUTREACH_SEND` writes the ledger, and RIN posts
  `sentMessage`.
- Otherwise nothing is sent. RIN posts `checkFailureMessage`, and the preset
  chips are replaced by **Fix it for me** (runs the `fix` intent: regenerates
  from the record with the current spec, which by the invariant above always
  passes) and — only when no check *failed*, i.e. flags only — **Send
  anyway**. The RM can also just edit the textarea. Any next message from the
  RM restores the preset chips.

**Log a non-send** is unchanged.

Switching client clears any pending-check state and the input box; each
client's thread and spec persist in `AppState` for the session.

## Layout

```
Outreach
Talk to RIN to shape the message; RIN checks it against the client's record before anything goes.
[client select]

┌─ CHAT WITH RIN ──────────────────────┐ ┌─ DRAFT · Chen Wei Liang ──────────┐
│ (RIN) I've drafted a note to Chen…   │ │ ┌──────────────────────────────┐ │
│                        more casual   │ │ │ Hi Chen, hope you're well!   │ │
│ (RIN) Loosened it up…                │ │ │ Quick one — your sgd fixed…  │ │
│ (RIN) •••                            │ │ └──────────────────────────────┘ │
│ [More formal][More casual][Shorter]  │ │ [Send]  [Log a non-send]         │
│ [Add the figures][Start over]        │ │                                  │
│ [ Ask RIN to change the draft… ][Ask]│ │                                  │
└──────────────────────────────────────┘ └──────────────────────────────────┘
Outcome ledger — Chen Wei Liang
```

Two `glass` cards in a `md:grid-cols-2` grid; the thread scrolls inside a
fixed max height and auto-scrolls to the newest message. RIN bubbles are
left-aligned on the sunk background with a small "RIN" avatar disc; RM
bubbles are right-aligned in slate. The right card's Send button is the
existing red variant, labelled `Send`. The chat's submit button is labelled
`Ask` so there is exactly one "Send" on the page.

The client `<select>` keeps its `id="outreach-client-select"` and the
textarea keeps `id="outreach-text"` — the harness depends on both.

## Component split

`OutreachView.tsx` is rewritten in place. It stays one file: the chat panel
and the draft panel share the `ask`/`send` handlers and the typing timer, and
splitting them would mean threading five callbacks through props for no
reader benefit. The file shrinks slightly overall because the checks panel
and rewrite loop are gone.

## Testing

Harness Module 4 is rewritten to drive the conversation, in this order:

1. Open Outreach; select `david` and confirm the earlier handoff's ledger
   entry is visible (existing assertion, kept); select `chen`.
2. Blocked client not in the selector (existing, kept). Old `Review draft`
   button and approach chips are gone.
3. RIN's opening message is present and mentions "drafted". The seeded
   draft still contains `500,000`.
4. Press Send. Wait for RIN's reply. Assert: the reply says it can't send
   yet and quotes `380,000`; the ledger does **not** contain "Archived
   Client Comms".
5. Click **Fix it for me**. Wait. Assert the draft now contains `380,000`
   and not `500,000`.
6. Click **More casual**. Wait. Assert the draft contains "hope you're
   well".
7. Type `make it more formal please`, press Enter. Wait. Assert the draft
   starts with `Dear Chen Wei Liang` and RIN's reply mentions "formal".
8. Type `what is the weather like`, press Enter. Wait. Assert RIN's reply
   contains "adjust the tone".
9. Press Send. Wait. Assert the ledger contains "Archived Client Comms" and
   RIN's reply says "Sent to Chen".

"Wait" means waiting until the count of RIN messages increases — never a
fixed sleep — so the 600 ms delay is covered without flakiness. Chat bubbles
and chip labels are ordinary text (no `.t-micro` uppercase), so assertions
can be case-sensitive; the eyebrow labels on the two cards are `.t-micro`
and must not be asserted case-sensitively.
