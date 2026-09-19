# Outreach Chat Assistant Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the Outreach tab's form-and-review-button interaction with a conversational assistant that rewrites the draft live from preset or free-text requests, and runs the compliance checks as the last gate before Send.

**Architecture:** A new pure module `src/lib/assistant.ts` holds a per-client *draft spec* (tone / length / figures / cta), renders the email from spec + client record + opportunity, parses free text into an intent, and writes RIN's replies. `OutreachView.tsx` is rewritten as a split view — chat left, live draft right — that calls the assistant and the existing `runCoachChecks`. Chat threads and specs live in `AppState`. The approach selector, Review button, checks panel and rewrite loop are deleted along with their state.

**Tech Stack:** React 18, TypeScript 5.6 (strict), Vite 5, Tailwind 3. Verification is Playwright driving a built `dist/` via `tools/verify.js`.

**Spec:** `docs/superpowers/specs/2026-09-19-outreach-chat-assistant-design.md`

## Global Constraints

- **Verification command, run after every task:** `npm run typecheck && npm run build && node tools/verify.js`. The harness exits non-zero on any `FAIL` line *or* any browser console error. A task is not done until it exits 0.
- `tools/verify.js` serves `dist/`, not the dev server. **You must `npm run build` before `node tools/verify.js`.**
- **Stale server runbook:** if the harness prints `EADDRINUSE` for port 4310, a `serve.js` child from an interrupted run is still bound. Run `lsof -nP -iTCP:4310 -sTCP:LISTEN`, confirm the listener's command is `tools/serve.js` from this checkout, kill only that PID, re-run.
- **Uppercase trap:** `.t-micro` renders `text-transform: uppercase`, and Playwright `innerText()` returns rendered text. Never assert case-sensitively on an eyebrow label. Chat bubbles, chip labels and the textarea are plain text — case-sensitive assertions on those are fine.
- `tsconfig.json` sets `noUnusedLocals: false`. Unused imports will **not** fail typecheck — remove them by hand when a task says to.
- `src/lib/assistant.ts` imports only `../types` and `./format`. It must never import `../state` (that would be a cycle — `state.ts` imports types from it).
- Do not change `runCoachChecks` in `src/lib/coach.ts`. The assistant's rendered drafts are designed to pass it as-is.
- The harness depends on `id="outreach-client-select"` on the client `<select>`, `id="outreach-text"` on the draft textarea, and `data-act="outreach-send"` on the Send button. Keep all three.
- Client fixtures on screen: `chen` = "Chen Wei Liang" (approach Notify, holding "SGD Fixed Deposit" SGD 380,000, note "matures 2026-09-26, rate 3.10% p.a."), `priya` = "Priya Ravindran" (Contextualise), `david` = "David Ong" (Review). Chen's seeded draft in `state.ts` deliberately contains `SGD 500,000` and pitch language; keep it.
- Reuse `Button`, `Pill`, `Modal` from `src/components/ui/`. No UI library.

---

### Task 1: The assistant module and its state

Adds `src/lib/assistant.ts` and wires `chatByClient` / `specByClient` into `AppState`. Purely additive — nothing is removed and no UI changes, so the existing harness must stay fully green.

**Files:**
- Create: `src/lib/assistant.ts`
- Modify: `src/state.ts`

**Interfaces:**
- Consumes: `Client`, `Opportunity`, `CoachCheck` from `src/types.ts`; `fmt` from `src/lib/format.ts`.
- Produces (Task 2 depends on every one of these names exactly):
  - `type Tone = 'formal' | 'neutral' | 'casual'`, `type Length = 'short' | 'full'`
  - `interface DraftSpec { tone: Tone; length: Length; figures: boolean; cta: boolean }`, `const DEFAULT_SPEC: DraftSpec`
  - `type Intent = 'formal' | 'casual' | 'shorter' | 'longer' | 'figures' | 'cta' | 'reset' | 'fix'`
  - `interface ChatMessage { role: 'rin' | 'rm'; text: string }`
  - `parseIntent(text: string): Intent | null`
  - `applyIntent(spec: DraftSpec, intent: Intent): DraftSpec`
  - `renderDraft(client: Client, opp: Opportunity, spec: DraftSpec): string`
  - `openingMessage(client: Client, opp: Opportunity | undefined): string`
  - `replyFor(intent: Intent | null, client: Client): string`
  - `checkFailureMessage(checks: CoachCheck[]): string`
  - `sentMessage(client: Client, ref: string): string`
  - `AppState.chatByClient: Record<string, ChatMessage[]>`, `AppState.specByClient: Record<string, DraftSpec>`
  - actions `{ type: 'CHAT_APPEND'; clientId: string; message: ChatMessage }` and `{ type: 'SET_DRAFT_SPEC'; clientId: string; spec: DraftSpec }`

- [ ] **Step 1: Create the assistant module**

Create `src/lib/assistant.ts` with exactly this content:

```ts
import type { Client, CoachCheck, Opportunity } from '../types';
import { fmt } from './format';

export type Tone = 'formal' | 'neutral' | 'casual';
export type Length = 'short' | 'full';

export interface DraftSpec {
  tone: Tone;
  length: Length;
  figures: boolean;
  cta: boolean;
}

export const DEFAULT_SPEC: DraftSpec = { tone: 'neutral', length: 'full', figures: false, cta: true };

export type Intent = 'formal' | 'casual' | 'shorter' | 'longer' | 'figures' | 'cta' | 'reset' | 'fix';

export interface ChatMessage {
  role: 'rin' | 'rm';
  text: string;
}

const DISCLOSURE = 'This message is for information only and is not financial advice.';

// First match wins, so the more specific intents sit above the broader ones.
const INTENT_PATTERNS: [Intent, RegExp][] = [
  ['reset', /\b(start over|reset|from scratch)\b/i],
  ['fix', /\b(fix|clean it up|clean up|correct)\b/i],
  ['formal', /\b(formal|professional|polite)\b/i],
  ['casual', /\b(casual|friendly|relaxed|warm|informal)\b/i],
  ['shorter', /\b(short|shorter|brief|concise|trim)\b/i],
  ['longer', /\b(longer|more detail|expand)\b/i],
  ['figures', /\b(figure|figures|number|numbers|amount|rate|details)\b/i],
  ['cta', /\b(call|meeting|catch up)\b/i],
];

export function parseIntent(text: string): Intent | null {
  for (const [intent, re] of INTENT_PATTERNS) {
    if (re.test(text)) return intent;
  }
  return null;
}

export function applyIntent(spec: DraftSpec, intent: Intent): DraftSpec {
  switch (intent) {
    case 'formal': return { ...spec, tone: 'formal' };
    case 'casual': return { ...spec, tone: 'casual' };
    case 'shorter': return { ...spec, length: 'short' };
    case 'longer': return { ...spec, length: 'full', figures: true };
    case 'figures': return { ...spec, length: 'full', figures: true };
    case 'cta': return { ...spec, cta: true };
    case 'reset': return { ...DEFAULT_SPEC };
    case 'fix': return spec;
  }
}

function firstName(client: Client): string {
  return client.name.split(' ')[0];
}

function capitalise(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function approachLine(client: Client, opp: Opportunity): string {
  const h = client.holdings[0];
  switch (opp.approach) {
    case 'Notify':
      return `your ${h.label.toLowerCase()} of ${fmt(h.value)} comes up for renewal within the next ${opp.daysToAct} days, and there is a rate change expected before then that is worth knowing about.`;
    case 'Contextualise':
      return `something in today's market news touches a position you hold — your ${h.label.toLowerCase()} of ${fmt(h.value)} — and I wanted you to hear it from me first.`;
    case 'Review':
      return 'when we last reviewed your portfolio we set an objective together, and the latest figures suggest it has drifted. I think it is worth a short review.';
  }
}

function openingLine(client: Client, opp: Opportunity, tone: Tone): string {
  const lead = tone === 'casual' ? 'Quick one — ' : '';
  return capitalise(lead + approachLine(client, opp));
}

export function renderDraft(client: Client, opp: Opportunity, spec: DraftSpec): string {
  const first = firstName(client);
  const h = client.holdings[0];

  const greeting =
    spec.tone === 'formal' ? `Dear ${client.name},` :
    spec.tone === 'casual' ? `Hi ${first}, hope you're well!` :
    `Hi ${first},`;

  const opening = openingLine(client, opp, spec.tone);

  const figures = spec.figures && spec.length === 'full'
    ? `For reference: ${h.label}, ${fmt(h.value)} — ${h.note}.`
    : '';

  const cta = !spec.cta ? '' :
    spec.tone === 'formal' ? 'Would you have fifteen minutes this week for a short call?' :
    spec.tone === 'casual' ? 'Got fifteen minutes this week for a quick call?' :
    'Worth a short call this week if you have fifteen minutes.';

  const signoff =
    spec.tone === 'formal' ? 'Kind regards,\nAisha Rahman' :
    spec.tone === 'casual' ? 'Cheers,\nAisha' :
    'Best,\nAisha';

  const body = [opening, figures, cta].filter(Boolean).join('\n\n');
  return `${greeting}\n\n${body}\n\n${signoff}\n\n${DISCLOSURE}`;
}

export function openingMessage(client: Client, opp: Opportunity | undefined): string {
  const first = firstName(client);
  if (!opp) {
    return `There's no active opportunity for ${first} today. You can still write a note on the right and I'll check it before it goes.`;
  }
  return `I've drafted a note to ${first} — ${opp.signal.headline.toLowerCase()}. Want it more formal, more casual, shorter, or with the figures from the record?`;
}

export function replyFor(intent: Intent | null, client: Client): string {
  const first = firstName(client);
  const h = client.holdings[0];
  switch (intent) {
    case 'formal':
      return "Done — I've made it more formal: full name in the greeting, no contractions, and a proper sign-off. Take a look on the right.";
    case 'casual':
      return 'Loosened it up — friendlier greeting, lighter phrasing. Still no advice language, so it stays inside your licence.';
    case 'shorter':
      return "Trimmed it to the essentials: what's happening, the ask, and the disclosure.";
    case 'longer':
      return `Expanded it with the figures from ${first}'s record so the note stands on its own.`;
    case 'figures':
      return `Added the figures straight from ${first}'s record — ${fmt(h.value)}, ${h.note}. Every number traces to a source.`;
    case 'cta':
      return 'Added a clear ask for a short call at the end.';
    case 'reset':
      return `Back to a fresh draft for ${first}.`;
    case 'fix':
      return `Rewritten from ${first}'s record — every figure now traces to a source and the advice language is gone.`;
    default:
      return `I can adjust the tone (more formal or more casual), the length, or pull the figures from ${first}'s record into the note. Which would you like?`;
  }
}

export function checkFailureMessage(checks: CoachCheck[]): string {
  const problems = checks.filter(k => k.status !== 'pass');
  const blocking = problems.some(k => k.status === 'fail');
  const lines = problems.map(k => `• ${k.rule}: ${k.detail}`).join('\n');
  const opener = blocking
    ? "I can't send this yet — here's what I found:"
    : 'Before this goes, one thing to note:';
  return `${opener}\n${lines}\n\nSay "fix it" and I'll rewrite it from the record, or edit the draft on the right.`;
}

export function sentMessage(client: Client, ref: string): string {
  return `Sent to ${firstName(client)} and archived as ${ref}. I've logged it in the outcome ledger.`;
}
```

- [ ] **Step 2: Add chat and spec state**

In `src/state.ts`, add this import after the existing `import type { RouteId, RoutedMap } from './lib/routing';` line:

```ts
import type { ChatMessage, DraftSpec } from './lib/assistant';
```

In the `AppState` interface, add these two lines immediately after `outreachApproach: Approach | null;`:

```ts
  chatByClient: Record<string, ChatMessage[]>;
  specByClient: Record<string, DraftSpec>;
```

In `initialState()`, add these two lines immediately after `outreachApproach: null,`:

```ts
    chatByClient: {},
    specByClient: {},
```

In the `Action` union, add these two members immediately **before** the line `  | { type: 'OUTREACH_SEND'; entry: LedgerEntry }` (that keeps the union's closing `;` where it already is):

```ts
  | { type: 'CHAT_APPEND'; clientId: string; message: ChatMessage }
  | { type: 'SET_DRAFT_SPEC'; clientId: string; spec: DraftSpec }
```

In the reducer, add these two cases immediately before `default:`:

```ts
    case 'CHAT_APPEND':
      return {
        ...state,
        chatByClient: {
          ...state.chatByClient,
          [action.clientId]: [...(state.chatByClient[action.clientId] ?? []), action.message],
        },
      };
    case 'SET_DRAFT_SPEC':
      return { ...state, specByClient: { ...state.specByClient, [action.clientId]: action.spec } };
```

- [ ] **Step 3: Verify — typecheck, build, harness unchanged**

```bash
npm run typecheck && npm run build && node tools/verify.js
```

Expected: `FAIL COUNT: 0` and `JS ERRORS: none` — identical to before this task. Nothing on screen has changed yet.

- [ ] **Step 4: Commit**

```bash
git add src/lib/assistant.ts src/state.ts
git commit -m "Add the outreach assistant module and its chat state

A pure, deterministic assistant: a per-client draft spec, a renderer
that produces a coach-clean email from spec plus record, an intent
parser for free text, and RIN's replies. No UI change yet.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

### Task 2: The chat-driven Outreach view

Rewrites `OutreachView.tsx` as the split chat/draft layout and rewrites harness Module 4 to drive the conversation end to end.

**Files:**
- Modify: `src/components/OutreachView.tsx` (full replacement)
- Test: `tools/verify.js` (Module 4 block, full replacement)

**Interfaces:**
- Consumes: everything in Task 1's "Produces" list; `runCoachChecks` from `src/lib/coach.ts`; `Button`, `Modal` from `src/components/ui/`.
- Produces: DOM hooks the harness uses — `[data-testid="chat-msg-rin"]`, `[data-testid="chat-msg-rm"]`, `[data-testid="chat-typing"]`, `#chat-input`, `[data-testid="chip-formal|casual|shorter|figures|reset|fix|send-anyway"]`, plus the three pre-existing ids listed in Global Constraints.

- [ ] **Step 1: Rewrite harness Module 4 (the failing assertions)**

In `tools/verify.js`, find the Module 4 block. It begins with the line `  // ---- Module 4: Outreach (drafting + sending) ----` and ends immediately before the line `  // ---- Module 5: News ----`. Replace that entire block (everything from the Module 4 comment line up to but not including the Module 5 comment line) with:

```js
  // ---- Module 4: Outreach (chat-driven drafting + sending) ----
  const rinCount = () => page.locator('[data-testid="chat-msg-rin"]').count();
  const waitForRin = async (prev) => {
    await page.waitForFunction(n => document.querySelectorAll('[data-testid="chat-msg-rin"]').length > n, prev, { timeout: 5000 });
    return page.locator('[data-testid="chat-msg-rin"]').last().innerText();
  };

  await page.click('nav >> text=Outreach');
  await page.waitForSelector('#outreach-text');
  await page.selectOption('#outreach-client-select', 'david');
  check('Handoff wrote an entry to the client ledger', (await page.locator('main').innerText()).includes('Booked for Thursday morning'));
  await page.selectOption('#outreach-client-select', 'chen');
  check('Blocked client (Robert Teo) excluded from Outreach client selector', !(await page.locator('#outreach-client-select').innerText()).includes('Robert Teo'));
  check('Old "Review draft" button is gone', await page.locator('[data-act="outreach-review"]').count() === 0);
  check('Approach selector chips are gone', await page.locator('button:has-text("Contextualise")').count() === 0);

  await page.waitForSelector('[data-testid="chat-msg-rin"]');
  check('RIN opens the conversation with a drafted note', (await page.locator('[data-testid="chat-msg-rin"]').first().innerText()).includes("I've drafted a note to Chen"));
  let draftVal = await page.inputValue('#outreach-text');
  check('Seeded Chen draft loaded with wrong figure', draftVal.includes('500,000'));

  // Send is the last check: the wrong figure is caught in chat and nothing is sent
  let prev = await rinCount();
  await page.click('[data-act="outreach-send"]');
  let lastRin = await waitForRin(prev);
  check('RIN refuses to send and explains the fact-trace failure', lastRin.includes("I can't send this yet") && lastRin.includes('380,000'));
  check('Nothing was written to the ledger on a refused send', !(await page.locator('main').innerText()).includes('Archived Client Comms'));

  // "Fix it for me" regenerates the draft from the record
  prev = await rinCount();
  await page.click('[data-testid="chip-fix"]');
  lastRin = await waitForRin(prev);
  draftVal = await page.inputValue('#outreach-text');
  check('Fix rewrites the draft from the record', draftVal.includes('380,000') && !draftVal.includes('500,000'));
  check('RIN explains the fix', lastRin.includes('Rewritten from Chen'));

  // A preset chip changes the live draft
  prev = await rinCount();
  await page.click('[data-testid="chip-casual"]');
  await waitForRin(prev);
  draftVal = await page.inputValue('#outreach-text');
  check('"More casual" chip loosens the greeting', draftVal.includes("hope you're well"));

  // Free text is understood and applied
  prev = await rinCount();
  await page.fill('#chat-input', 'make it more formal please');
  await page.press('#chat-input', 'Enter');
  lastRin = await waitForRin(prev);
  draftVal = await page.inputValue('#outreach-text');
  check('Free-text "formal" request is understood and applied', draftVal.startsWith('Dear Chen Wei Liang'));
  check('RIN replies in natural language about the change', lastRin.includes('more formal'));
  check('The RM\'s message appears in the thread', (await page.locator('[data-testid="chat-msg-rm"]').last().innerText()).includes('make it more formal please'));

  // An unrecognised request gets a helpful redirect, not silence
  prev = await rinCount();
  await page.fill('#chat-input', 'what is the weather like');
  await page.press('#chat-input', 'Enter');
  lastRin = await waitForRin(prev);
  check('Unrecognised request gets a helpful redirect', lastRin.includes('I can adjust the tone'));

  // A clean draft sends
  prev = await rinCount();
  await page.click('[data-act="outreach-send"]');
  lastRin = await waitForRin(prev);
  txt = await page.locator('main').innerText();
  check('Outreach send writes archived-channel ledger entry', txt.includes('Archived Client Comms'));
  check('RIN confirms the send in chat', lastRin.includes('Sent to Chen'));

```

(Keep the blank line at the end so the Module 5 comment that follows stays separated.)

- [ ] **Step 2: Run the harness to verify it fails**

```bash
npm run build && node tools/verify.js
```

Expected: the run aborts with a Playwright timeout on `[data-testid="chat-msg-rin"]` (or the `chip-fix` locator), or prints several `FAIL` lines starting with `FAIL Old "Review draft" button is gone`. Either is red. Afterwards, apply the stale-server runbook — an aborted run leaves `serve.js` bound to port 4310.

- [ ] **Step 3: Rewrite `OutreachView.tsx`**

Replace the whole of `src/components/OutreachView.tsx` with:

```tsx
import { useEffect, useRef, useState } from 'react';
import type { Action, AppState } from '../state';
import { MY_CLIENTS, MY_CLIENT_IDS, CLIENTS } from '../state';
import type { CoachCheck } from '../types';
import { OPPS, blockedClientIds } from '../lib/queue';
import { runCoachChecks } from '../lib/coach';
import {
  DEFAULT_SPEC, applyIntent, parseIntent, renderDraft, replyFor, openingMessage,
  checkFailureMessage, sentMessage, type Intent,
} from '../lib/assistant';
import { Button } from './ui/Button';
import { Modal } from './ui/Modal';

const CHIPS: { id: string; label: string; intent: Intent }[] = [
  { id: 'formal', label: 'More formal', intent: 'formal' },
  { id: 'casual', label: 'More casual', intent: 'casual' },
  { id: 'shorter', label: 'Shorter', intent: 'shorter' },
  { id: 'figures', label: 'Add the figures', intent: 'figures' },
  { id: 'reset', label: 'Start over', intent: 'reset' },
];

const REPLY_DELAY_MS = 600;

export function OutreachView({ state, dispatch }: { state: AppState; dispatch: (a: Action) => void }) {
  const clientId = state.outreachClientId;
  const c = CLIENTS[clientId];
  const opp = OPPS.find(o => o.clientId === clientId);
  const spec = state.specByClient[clientId] ?? DEFAULT_SPEC;
  const text = state.draftByClient[clientId] ?? (opp ? renderDraft(c, opp, spec) : '');
  const chat = state.chatByClient[clientId] ?? [];
  const first = c.name.split(' ')[0];

  const ledgerForClient = state.ledger.filter(l => l.clientId === clientId);
  const blocked = blockedClientIds(MY_CLIENT_IDS);
  const selectableClients = MY_CLIENTS.filter(cc => !blocked.has(cc.id) || cc.id === clientId);

  const [typing, setTyping] = useState(false);
  const [input, setInput] = useState('');
  const [pending, setPending] = useState<CoachCheck[] | null>(null);
  const [nonSendOpen, setNonSendOpen] = useState(false);
  const [nonSendReason, setNonSendReason] = useState('Client travelling this week');
  const timer = useRef<number | null>(null);
  const threadEnd = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (chat.length === 0) {
      dispatch({ type: 'CHAT_APPEND', clientId, message: { role: 'rin', text: openingMessage(c, opp) } });
    }
  }, [clientId]);

  useEffect(() => {
    threadEnd.current?.scrollIntoView({ block: 'nearest' });
  }, [chat.length, typing]);

  useEffect(() => () => { if (timer.current) window.clearTimeout(timer.current); }, []);

  function rinSays(reply: string, applyChange?: () => void) {
    setTyping(true);
    timer.current = window.setTimeout(() => {
      applyChange?.();
      dispatch({ type: 'CHAT_APPEND', clientId, message: { role: 'rin', text: reply } });
      setTyping(false);
    }, REPLY_DELAY_MS);
  }

  function ask(userText: string, intentOverride?: Intent) {
    if (!userText.trim() || typing) return;
    dispatch({ type: 'CHAT_APPEND', clientId, message: { role: 'rm', text: userText } });
    setPending(null);
    const intent = intentOverride ?? parseIntent(userText);
    rinSays(replyFor(intent, c), () => {
      if (intent && opp) {
        const next = applyIntent(spec, intent);
        dispatch({ type: 'SET_DRAFT_SPEC', clientId, spec: next });
        dispatch({ type: 'DRAFT_SET_TEXT', clientId, text: renderDraft(c, opp, next) });
      }
    });
  }

  function commitSend(approach: string) {
    const ref = 'ARC-' + Math.random().toString(36).slice(2, 8).toUpperCase();
    dispatch({
      type: 'OUTREACH_SEND',
      entry: { ts: '14 Sep, 09:14', clientId, kind: 'Sent', detail: `${approach} message sent`, ref: 'Archived Client Comms · ' + ref },
    });
    setPending(null);
    rinSays(sentMessage(c, ref));
  }

  function send() {
    if (!opp || typing) return;
    const checks = runCoachChecks(c, text);
    if (checks.every(k => k.status === 'pass')) {
      commitSend(opp.approach);
      return;
    }
    setPending(checks);
    rinSays(checkFailureMessage(checks));
  }

  function switchClient(id: string) {
    setPending(null);
    setInput('');
    dispatch({ type: 'SET_OUTREACH_CLIENT', id });
  }

  const canSendAnyway = pending !== null && pending.every(k => k.status !== 'fail');

  return (
    <div>
      <div className="t-display mb-1">Outreach</div>
      <div className="t-lead mb-5">
        Talk to RIN to shape the message. RIN checks it against {c.name}'s own record before anything goes —
        nothing sends without your say-so, and every send or non-send is written to the outcome ledger.
      </div>

      <select
        id="outreach-client-select"
        className="border border-hairline-2 rounded-lg px-2.5 py-2 text-[14px] mb-4 bg-white"
        value={clientId}
        onChange={e => switchClient(e.target.value)}
      >
        {selectableClients.map(cc => <option key={cc.id} value={cc.id}>{cc.name}</option>)}
      </select>

      <div className="grid md:grid-cols-2 gap-4 mb-4">
        <div className="glass p-5 flex flex-col" data-testid="chat-panel">
          <div className="t-micro mb-3">Chat with RIN</div>

          <div className="flex-1 overflow-y-auto max-h-[440px] space-y-3 pr-1" data-testid="chat-thread">
            {chat.map((m, i) => (
              m.role === 'rin' ? (
                <div key={i} data-testid="chat-msg-rin" className="flex gap-2.5 items-start">
                  <RinAvatar />
                  <div className="bg-sunk rounded-2xl rounded-tl-sm px-3.5 py-2.5 text-[14px] leading-relaxed text-ink-2 whitespace-pre-wrap max-w-[85%]">{m.text}</div>
                </div>
              ) : (
                <div key={i} data-testid="chat-msg-rm" className="flex gap-2.5 items-start justify-end">
                  <div className="bg-slate text-white rounded-2xl rounded-tr-sm px-3.5 py-2.5 text-[14px] leading-relaxed max-w-[85%]">{m.text}</div>
                </div>
              )
            ))}
            {typing && (
              <div data-testid="chat-typing" className="flex gap-2.5 items-start">
                <RinAvatar />
                <div className="bg-sunk rounded-2xl rounded-tl-sm px-3.5 py-2.5 text-ink-3 tracking-[0.25em]">•••</div>
              </div>
            )}
            <div ref={threadEnd} />
          </div>

          <div className="flex gap-1.5 flex-wrap mt-3">
            {pending ? (
              <>
                <Button data-testid="chip-fix" size="sm" variant="primary" disabled={typing} onClick={() => ask('Fix it for me', 'fix')}>
                  Fix it for me
                </Button>
                {canSendAnyway && opp && (
                  <Button data-testid="chip-send-anyway" size="sm" disabled={typing} onClick={() => commitSend(opp.approach)}>
                    Send anyway
                  </Button>
                )}
              </>
            ) : (
              CHIPS.map(ch => (
                <Button key={ch.id} data-testid={`chip-${ch.id}`} size="sm" disabled={typing || !opp} onClick={() => ask(ch.label, ch.intent)}>
                  {ch.label}
                </Button>
              ))
            )}
          </div>

          <form
            className="flex gap-2 mt-3"
            onSubmit={e => { e.preventDefault(); const t = input; setInput(''); ask(t); }}
          >
            <input
              id="chat-input"
              className="flex-1 border border-hairline-2 rounded-full px-4 py-2 text-[14px] bg-white"
              placeholder="Ask RIN to change the draft…"
              value={input}
              onChange={e => setInput(e.target.value)}
              disabled={typing}
            />
            <Button type="submit" variant="primary" size="sm" disabled={typing || !input.trim()}>Ask</Button>
          </form>
        </div>

        <div className="glass p-5">
          <div className="t-micro mb-3">Draft · {c.name}</div>
          <textarea
            id="outreach-text"
            className="w-full border border-hairline-2 rounded-xl p-3.5 text-[14.5px] leading-relaxed min-h-[320px] font-sans"
            value={text}
            onChange={e => dispatch({ type: 'DRAFT_SET_TEXT', clientId, text: e.target.value })}
          />
          <div className="flex gap-2 flex-wrap mt-3">
            <Button data-act="outreach-send" variant="red" size="sm" disabled={!opp || typing} onClick={send}>
              Send to {first}
            </Button>
            <Button variant="ghost" size="sm" onClick={() => { setNonSendReason('Client travelling this week'); setNonSendOpen(true); }}>
              Log a non-send
            </Button>
          </div>
          {!opp && (
            <div className="t-meta mt-2.5">
              No active opportunity for this client today — sending is tied to a surfaced opportunity.
            </div>
          )}
        </div>
      </div>

      <div className="glass p-5">
        <div className="t-h3 mb-2">Outcome ledger — {c.name}</div>
        {ledgerForClient.length ? (
          <table className="w-full text-[13.5px] border-collapse">
            <thead>
              <tr>
                {['When', 'Kind', 'Detail', 'Reference'].map(h => (
                  <th key={h} className="text-left t-micro pb-1.5 border-b border-hairline-2">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {ledgerForClient.map((l, i) => (
                <tr key={i}>
                  <td className="py-2 border-b border-hairline">{l.ts}</td>
                  <td className="py-2 border-b border-hairline">{l.kind}</td>
                  <td className="py-2 border-b border-hairline">{l.detail}</td>
                  <td className="py-2 border-b border-hairline src">{l.ref || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <div className="t-meta">No entries yet.</div>
        )}
      </div>

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
    </div>
  );
}

function RinAvatar() {
  return (
    <div className="w-7 h-7 rounded-full bg-gradient-to-br from-[#4A5F6B] to-slate text-white text-[10px] font-bold flex items-center justify-center flex-none">
      RIN
    </div>
  );
}
```

Two things to notice, so you do not "fix" them:
- The `useEffect` that seeds the opening message lists only `[clientId]` as its dependency. That is deliberate — it must run once per client switch, not on every chat change.
- The Send button's label is `Send to {first}` (e.g. "Send to Chen"). The harness clicks it by `data-act`, not by text, so the label is free to be friendly. The chat's submit button is labelled `Ask`, so there is exactly one "Send" on the page.

- [ ] **Step 4: Run the harness to verify it passes**

```bash
npm run typecheck && npm run build && node tools/verify.js
```

Expected: `FAIL COUNT: 0` and `JS ERRORS: none`. If typecheck reports errors, they will be about names — re-check every import in `OutreachView.tsx` against Task 1's "Produces" list character for character.

If a `check` in the new Module 4 fails, the most likely causes, in order: (1) you asserted case-sensitively on something rendered inside `.t-micro` — but none of Module 4's assertions should touch an eyebrow; (2) `waitForRin` timed out because a chip was still `disabled` — the harness always waits for the previous reply first, so check that `setTyping(false)` runs in `rinSays`; (3) the draft did not update because `applyChange` was not called before the reply was appended.

- [ ] **Step 5: Commit**

```bash
git add src/components/OutreachView.tsx tools/verify.js
git commit -m "Turn Outreach into a conversation with RIN

The form-and-review-button flow presented RIN as a linter. Replace it
with a chat on the left and the live draft on the right: preset chips
or free text rewrite the email in place, and the coach checks run as
the last gate when the RM presses Send — a draft with problems is
refused in chat with a one-click fix, never silently sent.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

### Task 3: Delete the state and code the old flow left behind

Removes the approach selector state, the review/accept/reject actions, and the now-unused `suggestRewrite`, and updates the README.

**Files:**
- Modify: `src/state.ts`
- Modify: `src/lib/coach.ts`
- Modify: `README.md`

**Interfaces:**
- Consumes: the rewritten `OutreachView.tsx` from Task 2, which no longer dispatches any of the removed actions.
- Produces: nothing later tasks depend on — this is the last task.

- [ ] **Step 1: Confirm nothing else references the dead actions**

```bash
grep -rn "SET_APPROACH\|DRAFT_REVIEW\|DRAFT_ACCEPT\|DRAFT_REJECT\|DRAFT_CLEAR\|draftResultByClient\|outreachApproach\|suggestRewrite" src/
```

Expected: hits only inside `src/state.ts` and `src/lib/coach.ts`. If any other file is listed, stop and report — it means Task 2 left a consumer behind.

- [ ] **Step 2: Remove the dead state from `state.ts`**

Change the types import from:

```ts
import type { Client, Driver, Approach, CoachCheck, LedgerEntry } from './types';
```

to:

```ts
import type { Client, Driver, LedgerEntry } from './types';
```

In the `AppState` interface, delete these two lines:

```ts
  draftResultByClient: Record<string, CoachCheck[] | undefined>;
  outreachApproach: Approach | null;
```

In `initialState()`, delete these two lines:

```ts
    draftResultByClient: {},
    outreachApproach: null,
```

In the `Action` union, delete these five members:

```ts
  | { type: 'DRAFT_REVIEW'; clientId: string; checks: CoachCheck[] }
  | { type: 'DRAFT_CLEAR'; clientId: string }
  | { type: 'DRAFT_ACCEPT'; clientId: string; text: string; checks: CoachCheck[] }
  | { type: 'DRAFT_REJECT'; clientId: string }
  | { type: 'SET_APPROACH'; approach: Approach }
```

In the reducer, delete the `DRAFT_REVIEW`, `DRAFT_CLEAR`, `DRAFT_ACCEPT`, `DRAFT_REJECT` and `SET_APPROACH` cases entirely (each `case ...:` line through the end of its `return`), and change the `SET_OUTREACH_CLIENT` case from:

```ts
    case 'SET_OUTREACH_CLIENT':
      return { ...state, outreachClientId: action.id, outreachApproach: null };
```

to:

```ts
    case 'SET_OUTREACH_CLIENT':
      return { ...state, outreachClientId: action.id };
```

- [ ] **Step 3: Delete `suggestRewrite` from `coach.ts`**

In `src/lib/coach.ts`, delete the entire `export function suggestRewrite(...) { ... }` function (from its `export function` line to its closing `}`). Leave `runCoachChecks` and everything above it untouched.

- [ ] **Step 4: Update the README**

In `README.md`, find the Outreach module paragraph:

```
4. **Outreach** — drafts a client message (approach-specific when there's an
   active opportunity, free-form otherwise) and checks it against the
   client's own record (fact-trace, advice-boundary, disclosure, register)
   before it goes. Nothing sends without explicit RM approval; every
   send/non-send writes to an outcome ledger. Blocked clients aren't
   selectable here.
```

Replace it with:

```
4. **Outreach** — a conversation with RIN. RIN drafts the message from the
   client's record and the opportunity that surfaced them; the RM shapes it
   by chatting ("more casual", "add the figures") or with preset chips, and
   the draft updates live. Pressing Send runs the checks (fact-trace,
   advice-boundary, disclosure, register) as the last gate: a clean draft
   goes, a draft with problems is refused in chat with a one-click fix.
   Every send/non-send writes to an outcome ledger. Blocked clients aren't
   selectable here.
```

- [ ] **Step 5: Verify**

```bash
npm run typecheck && npm run build && node tools/verify.js
```

Expected: `FAIL COUNT: 0` and `JS ERRORS: none`. Then confirm nothing dead remains:

```bash
grep -rn "SET_APPROACH\|DRAFT_REVIEW\|DRAFT_ACCEPT\|DRAFT_REJECT\|DRAFT_CLEAR\|draftResultByClient\|outreachApproach\|suggestRewrite\|Review draft" src/ README.md
```

Expected: no output.

- [ ] **Step 6: Commit**

```bash
git add src/state.ts src/lib/coach.ts README.md
git commit -m "Remove the state and helper the old review flow left behind

The approach selector, the Review button and the accept/reject rewrite
loop are gone from Outreach, so their actions, state and the
suggestRewrite helper are dead. Delete them and describe the chat flow
in the README.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

## Self-review notes

Spec coverage:

| Spec section | Task |
|---|---|
| Assistant module — spec, render, intents, voice | 1 |
| State — added fields and actions | 1 |
| State — removed fields and actions | 3 |
| Interaction — chips, free text, typing, Send as last gate, Fix / Send anyway | 2 |
| Layout | 2 |
| Testing — Module 4 rewrite | 2 |
| `suggestRewrite` deleted | 3 |

Ordering constraint: Task 3 deletes actions that the *old* `OutreachView.tsx` dispatches. It must run after Task 2 has replaced that file, or typecheck breaks. Execute in order.

Type consistency checked: every name in Task 2's imports from `../lib/assistant` appears in Task 1's file with the same signature; `CoachCheck` is imported from `../types` in both `assistant.ts` and `OutreachView.tsx`; `Intent` is exported as a type and imported with `type Intent`.
