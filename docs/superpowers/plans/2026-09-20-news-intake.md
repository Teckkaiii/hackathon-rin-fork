# Bring-Your-Own-News Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** An input at the top of the News tab where the RM pastes a headline or a link, and RIN replies with a two-line brief, the exposed clients in the RM's book (Confirmed / Inferred, severity), and a Draft outreach button per client.

**Architecture:** A pure module `src/lib/newsIntake.ts` turns pasted text into one of the seven existing drivers (a link's path slug is its headline; a term-list classifier picks the driver), then reuses the News tab's own client matching via a newly exported `impactsForDriver()` in `src/lib/news.ts`. A new component `src/components/NewsIntake.tsx` renders the input, RIN's "thinking" state, the brief, and the client rows; `NewsView` mounts it and `App` supplies the Outreach navigation. No new state in the reducer — the result lives in the component.

**Tech Stack:** React 18, TypeScript 5.6 (strict), Vite 5, Tailwind 3. Verification is Playwright driving a built `dist/` via `tools/verify.js`.

**Spec:** `docs/superpowers/specs/2026-09-20-news-intake-design.md`

## Global Constraints

- **Verification command, run after every task:** `npm run typecheck && npm run build && node tools/verify.js`. The harness exits non-zero on any `FAIL` line *or* any browser console error. A task is not done until it exits 0.
- `tools/verify.js` serves `dist/`, not the dev server. **You must `npm run build` before `node tools/verify.js`.**
- **Stale server runbook:** `verify.js` has no try/finally. If a Playwright call throws (e.g. a `waitForSelector` timeout), the child `serve.js` is orphaned on port 4310 and the next run prints `EADDRINUSE`. Run `lsof -nP -iTCP:4310 -sTCP:LISTEN`, confirm the listener's command is `tools/serve.js` from this checkout, kill only that PID, re-run.
- **Uppercase trap:** `.t-micro` renders `text-transform: uppercase`, and Playwright `innerText()` returns rendered text. Never assert case-sensitively on an eyebrow label.
- **No unit-test runner exists.** The only tests are the harness assertions in `tools/verify.js`. Library tasks are verified by `npm run typecheck` and by the harness assertions added in Task 4.
- **Design system (`docs/design-system.md`) rules that apply here:** no black or near-black fills; no second accent colour (status pills are `pass`/`flag`/`block`/`neutral` only); RIN is the only thing allowed ambient motion (the `.rin-orb`, `.typing-dot`, `.bubble-in` classes already exist for it — reuse them, don't add new keyframes); copy is in the RM's words — the words *driver*, *classifier*, *slug* never appear on screen.
- **Do not** add dependencies. **Do not** touch `src/state.ts`, `src/data/*`, or the existing News cards' markup in `NewsView.tsx` beyond mounting the new component.
- **Existing harness hooks you must not break:** `[data-testid="news-client-open"]` (counted on the News tab), `#outreach-client-select`, `main select` (must stay at 0 on the Queue tab — the new control is an `<input>`, not a `<select>`).
- **Fixture facts the assertions rely on** (all in `src/data/`): Chen Wei Liang's opportunity `op-chen` has `driverId: "rate-cut"`, amount 380,000, 12 days → confirmed / high. Priya Ravindran's `op-priya` has `driverId: "sector-semis"` → confirmed. Kevin Loh (`kevin`) holds a fixed deposit and has no opportunity → inferred for `rate-cut`. Robert Teo (`robert`) is blocked by a suitability gate and holds a fixed deposit → inferred for `rate-cut` **and** withheld. Aisha's book is `MY_CLIENT_IDS` in `src/state.ts`.
- Commit after every task. End every commit message with the attribution line your session's reminder specifies (at the time of writing: `Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>`).

---

### Task 1: Export `impactsForDriver` from `lib/news.ts`

The News tab's client matching is currently inlined inside `newsItems()`. Pull it into an exported function so the intake can reuse it byte-for-byte — if the two ever disagreed, the demo would show one set of clients on the card and another in the intake.

**Files:**
- Modify: `src/lib/news.ts`

**Interfaces:**
- Produces: `export function impactsForDriver(driverId: string, clientIds?: Set<string>): NewsImpact[]` — confirmed impacts (from opportunities linked to the driver) followed by inferred ones (from holdings), sorted high → medium → low. `NewsImpact` is the existing type in `src/types.ts`: `{ clientId: string; severity: 'high'|'medium'|'low'; basis: 'confirmed'|'inferred'; reason: string }`.

- [ ] **Step 1: Add the exported function.** In `src/lib/news.ts`, directly above the comment that begins `// clientIds, when passed, scopes results to a single RM's book` (the one above `export function newsItems`), insert:

```ts
// Everyone in the book this driver lands on: clients whose opportunity is
// linked to it (confirmed) and clients whose holdings look like the same
// instrument or sector (inferred). Exported so the News tab and the
// bring-your-own-news intake can never disagree about who is exposed.
export function impactsForDriver(driverId: string, clientIds?: Set<string>): NewsImpact[] {
  const pool = clientIds ? CLIENT_LIST.filter(c => clientIds.has(c.id)) : CLIENT_LIST;
  const linkedOpps = OPPS.filter(o => o.driverId === driverId && (!clientIds || clientIds.has(o.clientId)));
  const confirmedIds = new Set(linkedOpps.map(o => o.clientId));

  const confirmed: NewsImpact[] = linkedOpps.map(o => ({
    clientId: o.clientId,
    severity: severityFromOpp(o),
    basis: 'confirmed',
    reason: o.whyNow,
  }));

  const match = INFERRED_MATCH[driverId];
  const inferred: NewsImpact[] = match
    ? pool.filter(c => !confirmedIds.has(c.id) && match.test(c)).map(c => ({
        clientId: c.id,
        severity: 'medium' as const,
        basis: 'inferred' as const,
        reason: match.reason(c),
      }))
    : [];

  return [...confirmed, ...inferred].sort((a, b) => SEVERITY_RANK[a.severity] - SEVERITY_RANK[b.severity]);
}
```

- [ ] **Step 2: Make `newsItems` use it.** Replace the whole body of `export function newsItems(clientIds?: Set<string>): NewsItem[] { ... }` with:

```ts
export function newsItems(clientIds?: Set<string>): NewsItem[] {
  const items = Object.values(DRIVERS).map(driver => {
    const impacts = impactsForDriver(driver.id, clientIds);
    const item: NewsItem = {
      id: driver.id,
      headline: driver.label,
      detail: driver.detail,
      date: driver.date,
      recency: driver.recency,
      impacts,
      flag: flagFor(impacts),
    };
    return item;
  });

  const RECENCY_ORDER = { Yesterday: 0, Today: 1, Internal: 2 };
  return items.sort((a, b) => RECENCY_ORDER[a.recency] - RECENCY_ORDER[b.recency]);
}
```

The old body's `pool`, `linkedOpps`, `confirmedIds`, `confirmed`, `match`, `inferred` locals are gone; nothing else in the file changes. `CLIENT_LIST`, `OPPS`, `severityFromOpp`, `INFERRED_MATCH`, `SEVERITY_RANK` are all still used (by the new function).

- [ ] **Step 3: Verify — this is a pure refactor, so the harness must be exactly as green as before.** Run `npm run typecheck && npm run build && node tools/verify.js`. Expected: `FAIL COUNT: 0`, and every News-tab assertion (`News tab shows a confirmed impact`, `…an inferred impact`, `…flags the multi-client item as Priority`, `Client group leads with its most impactful item`) still `OK`.

- [ ] **Step 4: Commit.**

```bash
git add src/lib/news.ts
git commit -m "Export impactsForDriver so the news intake reuses the News tab's matching

Pure refactor: newsItems() now calls it; no behaviour change.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

### Task 2: The intake module — `src/lib/newsIntake.ts`

Pure, no React, no state. Three small functions and one that composes them.

**Files:**
- Create: `src/lib/newsIntake.ts`

**Interfaces:**
- Consumes: `impactsForDriver` from Task 1; `DRIVERS` from `src/state.ts` (a `Record<string, Driver>` — `Driver` is `{ id, label, detail, date, recency }` in `src/types.ts`).
- Produces (Task 3 depends on these names exactly):
  - `export interface IntakeResult { headline: string; source: string | null; driver: Driver | null; impacts: NewsImpact[]; brief: string }`
  - `export function headlineFromInput(raw: string): { headline: string; source: string | null }`
  - `export function classifyHeadline(headline: string): Driver | null`
  - `export function briefFor(driver: Driver | null, impacts: NewsImpact[]): string`
  - `export function intake(raw: string, clientIds: Set<string>): IntakeResult`

- [ ] **Step 1: Create the file with exactly this content.**

```ts
import type { Driver, NewsImpact } from '../types';
import { DRIVERS } from '../state';
import { impactsForDriver } from './news';

export interface IntakeResult {
  headline: string;       // the text RIN actually read
  source: string | null;  // the link's hostname when the input was a URL, else null
  driver: Driver | null;  // null = RIN couldn't tie it to anything the book holds
  impacts: NewsImpact[];  // empty when driver is null
  brief: string;          // RIN's reply, ready to render
}

// Term lists per driver. Each pattern is case-insensitive and word-bounded so
// "rate" never matches "corporate". The driver with the most hits wins; on a
// tie the one listed first wins, so the narrower stories sit above the broad
// "rates" one.
const TERMS: [string, RegExp[]][] = [
  ['sector-semis', [/\bsemiconductors?\b/i, /\bfoundry\b/i, /\bwafers?\b/i, /\bchips?\b/i, /\bchipmakers?\b/i]],
  ['reit-rerating', [/\bs-?reits?\b/i, /\breal estate investment trusts?\b/i]],
  ['ig-credit-spread-widening', [/\bcredit spreads?\b/i, /\bspreads? widen\w*\b/i, /\binvestment[- ]grade\b/i, /\bcorporate bonds?\b/i, /\brisk-off\b/i]],
  ['par-fund-bonus-trim', [/\binsurers?\b/i, /\bparticipating\b/i, /\bpar fund\b/i, /\bbonus rates?\b/i, /\bendowments?\b/i, /\buniversal life\b/i]],
  ['usd-mmf-yield', [/\bmoney[- ]market\b/i, /\bfed\b/i, /\bt-?bills?\b/i, /\busd yields?\b/i]],
  ['cross-border-fx-vol', [/\bfx\b/i, /\bcurrency\b/i, /\bcurrencies\b/i, /\bforex\b/i, /\bvolatility\b/i, /\bhedging\b/i, /\b(?:vnd|idr|myr|thb)\b/i]],
  ['rate-cut', [/\bsora\b/i, /\bmas\b/i, /\brate cuts?\b/i, /\brates? (?:to )?ease\b/i, /\beasing\b/i, /\blower rates\b/i, /\bmonetary policy\b/i, /\binflation cools?\b/i, /\bdovish\b/i]],
];

const NOTHING_FOUND =
  "I couldn't tie that to anything your clients hold. I can read stories about SGD rates, REITs, credit spreads, FX moves, insurer bonus rates, and the semiconductor sector.";

// A link can't be fetched from the browser (no backend, CORS), but news URLs
// carry the headline in their last path segment. Strip the extension, any long
// numeric article id, and turn hyphens back into spaces.
export function headlineFromInput(raw: string): { headline: string; source: string | null } {
  const text = raw.trim();
  if (!/^https?:\/\//i.test(text)) return { headline: text, source: null };
  try {
    const url = new URL(text);
    const segments = url.pathname.split('/').filter(Boolean);
    const last = segments[segments.length - 1] ?? '';
    const words = decodeURIComponent(last)
      .replace(/\.[a-z0-9]+$/i, '')
      .replace(/[-_]+/g, ' ')
      .replace(/\b\d{4,}\b/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
    return { headline: words || url.hostname, source: url.hostname.replace(/^www\./, '') };
  } catch {
    return { headline: text, source: null };
  }
}

export function classifyHeadline(headline: string): Driver | null {
  let best: { id: string; score: number } | null = null;
  for (const [id, patterns] of TERMS) {
    const score = patterns.filter(p => p.test(headline)).length;
    if (score > 0 && (!best || score > best.score)) best = { id, score };
  }
  return best ? DRIVERS[best.id] : null;
}

// The desk note's first sentence, without its "Desk note (date):" prefix.
function firstSentence(detail: string): string {
  const plain = detail.replace(/^Desk note \([^)]*\):\s*/, '');
  const m = plain.match(/^[^.]*\./);
  return m ? m[0] : plain;
}

export function briefFor(driver: Driver | null, impacts: NewsImpact[]): string {
  if (!driver) return NOTHING_FOUND;
  const confirmed = impacts.filter(i => i.basis === 'confirmed').length;
  const inferred = impacts.length - confirmed;
  const parts = [
    confirmed ? `${confirmed} confirmed against an open opportunity` : '',
    inferred ? `${inferred} inferred from what they hold` : '',
  ].filter(Boolean);
  const touches = impacts.length
    ? `Touches ${impacts.length} of your clients — ${parts.join(', ')}.`
    : 'None of your clients look exposed to it.';
  return `Reads as: ${driver.label}. ${firstSentence(driver.detail)} ${touches}`;
}

export function intake(raw: string, clientIds: Set<string>): IntakeResult {
  const { headline, source } = headlineFromInput(raw);
  const driver = classifyHeadline(headline);
  const impacts = driver ? impactsForDriver(driver.id, clientIds) : [];
  return { headline, source, driver, impacts, brief: briefFor(driver, impacts) };
}
```

- [ ] **Step 2: Typecheck.** Run `npm run typecheck`. Expected: no output after the `tsc --noEmit` line (i.e. clean). If it complains that `DRIVERS[best.id]` may be `undefined`, the project's `tsconfig` does not have `noUncheckedIndexedAccess` — it doesn't at time of writing; if that has changed, write `return best ? (DRIVERS[best.id] ?? null) : null;`.

- [ ] **Step 3: Sanity-check the classifier by hand** — there is no unit runner, so confirm these five in your head against the `TERMS` table before moving on (Task 4 asserts them in the browser):
  - `https://www.straitstimes.com/business/mas-signals-easing-as-core-inflation-cools` → slug `mas signals easing as core inflation cools` → `mas`, `easing`, `inflation cools` = 3 hits on `rate-cut`; nothing else matches → **rate-cut**, source `straitstimes.com`.
  - `Chip stocks slide as foundry guidance is cut` → `chips?` matches "Chip", `foundry` = 2 hits → **sector-semis**. (`rate cuts?` does not match "is cut".)
  - `S-REITs re-rate higher on dovish rate outlook` → `s-?reits?` = 1 on reit-rerating; `dovish` = 1 on rate-cut; tie → reit-rerating is listed first → **reit-rerating**.
  - `Weather warning for the east coast` → 0 hits → **null**.
  - `USD money-market yields compress as Fed cut bets firm` → `money[- ]market`, `fed` = 2 on usd-mmf-yield; `rate cuts?` does not match "Fed cut" → **usd-mmf-yield**.

- [ ] **Step 4: Commit.**

```bash
git add src/lib/newsIntake.ts
git commit -m "Add the news intake module: link/headline -> driver -> exposed clients

Pure functions only. A link's last path segment is its headline; a
term-list classifier picks one of the seven existing drivers (narrow
stories listed before the broad rates one so ties resolve sensibly);
impactsForDriver() supplies the exposed clients; briefFor() writes
RIN's reply in the RM's words.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

### Task 3: The `NewsIntake` component, mounted on the News tab

**Files:**
- Create: `src/components/NewsIntake.tsx`
- Modify: `src/components/NewsView.tsx`
- Modify: `src/App.tsx`

**Interfaces:**
- Consumes: `intake`, `IntakeResult` from Task 2; `CLIENTS`, `MY_CLIENT_IDS` from `src/state.ts`; `blockedClientIds(clientIds)` from `src/lib/queue.ts` (returns a `Set<string>` of blocked client ids); `Button` (`variant: 'primary' | 'ghost' | 'default' | 'red'`, `size?: 'sm'`, spreads button attributes incl. `type` and `data-testid`) and `Pill` (`variant: 'pass' | 'block' | 'flag' | 'neutral' | 'slate'`, `dot?: boolean`) from `src/components/ui/`.
- Produces: `export function NewsIntake(props: { onOpenClient: (id: string) => void; onDraftOutreach: (id: string) => void }): JSX.Element`. DOM hooks Task 4 depends on: `#news-intake-input`, `[data-testid="news-intake-ask"]`, `[data-testid="news-intake-panel"]`, `[data-testid="news-intake-thinking"]`, `[data-testid="news-intake-brief"]`, `[data-testid="news-intake-client"]` (one per exposed client), `[data-testid="news-intake-draft"]` (the Draft outreach button inside a client row; absent when the client is withheld).

- [ ] **Step 1: Create `src/components/NewsIntake.tsx` with exactly this content.**

```tsx
import { useEffect, useRef, useState } from 'react';
import { CLIENTS, MY_CLIENT_IDS } from '../state';
import { blockedClientIds } from '../lib/queue';
import { intake, type IntakeResult } from '../lib/newsIntake';
import type { ImpactSeverity } from '../types';
import { Button } from './ui/Button';
import { Pill } from './ui/Pill';

// RIN pauses before answering — the same beat the Outreach chat uses, so the
// two feel like one assistant.
const THINK_MS = 600;

const SEVERITY_VARIANT: Record<ImpactSeverity, 'block' | 'flag' | 'neutral'> = { high: 'block', medium: 'flag', low: 'neutral' };
const SEVERITY_LABEL: Record<ImpactSeverity, string> = { high: 'High', medium: 'Medium', low: 'Low' };

export function NewsIntake({ onOpenClient, onDraftOutreach }: { onOpenClient: (id: string) => void; onDraftOutreach: (id: string) => void }) {
  const [input, setInput] = useState('');
  const [thinking, setThinking] = useState(false);
  const [result, setResult] = useState<IntakeResult | null>(null);
  const timer = useRef<number | null>(null);
  const blocked = blockedClientIds(MY_CLIENT_IDS);

  useEffect(() => () => { if (timer.current) window.clearTimeout(timer.current); }, []);

  function ask() {
    const text = input.trim();
    if (!text || thinking) return;
    if (timer.current) window.clearTimeout(timer.current);
    setResult(null);
    setThinking(true);
    timer.current = window.setTimeout(() => {
      setResult(intake(text, MY_CLIENT_IDS));
      setThinking(false);
    }, THINK_MS);
  }

  return (
    <div className="mb-6" data-testid="news-intake">
      <form className="flex gap-2 items-center" onSubmit={e => { e.preventDefault(); ask(); }}>
        <input
          id="news-intake-input"
          className="flex-1 min-w-0 rounded-full border border-hairline-2 bg-white px-4 py-2.5 text-[14px] text-ink placeholder:text-ink-3 focus:border-red/40 outline-none"
          placeholder="Paste a headline or link…"
          value={input}
          onChange={e => setInput(e.target.value)}
        />
        <Button type="submit" variant="primary" disabled={!input.trim() || thinking} data-testid="news-intake-ask" className="flex-none">
          Ask RIN
        </Button>
      </form>

      {(thinking || result) && (
        <div className="mesh-red mt-3 bubble-in" data-testid="news-intake-panel">
          <div className="flex gap-2.5 items-start">
            <div className="rin-orb w-7 h-7 text-[9px]" data-state={thinking ? 'thinking' : 'idle'}>R</div>
            {thinking ? (
              <div data-testid="news-intake-thinking" className="bg-white border border-red/10 rounded-2xl rounded-bl-sm px-4 py-3 flex gap-1.5 items-center shadow-glass">
                <span className="typing-dot" /><span className="typing-dot" /><span className="typing-dot" />
              </div>
            ) : result && (
              <div className="min-w-0 flex-1">
                <div data-testid="news-intake-brief" className="bg-white border border-red/10 rounded-2xl rounded-bl-sm px-4 py-2.5 text-[14px] leading-relaxed text-ink-2 shadow-glass">
                  {result.brief}
                </div>
                {result.source && <div className="t-meta mt-1.5 ml-1">Read from the link's headline · {result.source}</div>}
              </div>
            )}
          </div>

          {result && result.impacts.length > 0 && (
            <div className="mt-3 space-y-2">
              {result.impacts.map(im => {
                const c = CLIENTS[im.clientId];
                const withheld = blocked.has(c.id);
                return (
                  <div key={c.id} data-testid="news-intake-client" className="glass-tight p-3.5 flex items-start gap-3 flex-wrap">
                    <div className="flex-1 min-w-[220px]">
                      <button type="button" className="text-left hover:underline" onClick={() => onOpenClient(c.id)}>
                        <span className="t-h3">{c.name}</span>
                        <span className="t-meta ml-2">{c.segment}</span>
                      </button>
                      <div className="text-[13.5px] text-ink-2 leading-relaxed mt-0.5">{im.reason}</div>
                    </div>
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <Pill variant={SEVERITY_VARIANT[im.severity]}>{SEVERITY_LABEL[im.severity]} impact</Pill>
                      <Pill variant={im.basis === 'confirmed' ? 'pass' : 'neutral'}>{im.basis === 'confirmed' ? 'Confirmed' : 'Inferred'}</Pill>
                      {withheld
                        ? <Pill variant="block" dot>Withheld</Pill>
                        : <Button size="sm" variant="primary" data-testid="news-intake-draft" onClick={() => onDraftOutreach(c.id)}>Draft outreach</Button>}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Mount it in `NewsView`.** In `src/components/NewsView.tsx`:
  - Add the import after the existing `import { Pill } from './ui/Pill';` line: `import { NewsIntake } from './NewsIntake';`
  - Change the component signature from
    `export function NewsView({ onOpenClient }: { onOpenClient: (id: string) => void }) {`
    to
    `export function NewsView({ onOpenClient, onDraftOutreach }: { onOpenClient: (id: string) => void; onDraftOutreach: (id: string) => void }) {`
  - Directly after the closing `</div>` of the `t-lead` intro paragraph (the one whose text starts `What happened in the last day`), and before `{groups.map(({ client, items }) => {`, insert:
    ```tsx
      <NewsIntake onOpenClient={onOpenClient} onDraftOutreach={onDraftOutreach} />
    ```

- [ ] **Step 3: Supply the navigation from `App`.** In `src/App.tsx`, replace
  ```tsx
  {state.tab === 'news' && <NewsView onOpenClient={id => dispatch({ type: 'OPEN_CLIENT', id })} />}
  ```
  with
  ```tsx
  {state.tab === 'news' && (
    <NewsView
      onOpenClient={id => dispatch({ type: 'OPEN_CLIENT', id })}
      onDraftOutreach={id => { dispatch({ type: 'SET_OUTREACH_CLIENT', id }); dispatch({ type: 'SET_TAB', tab: 'outreach' }); }}
    />
  )}
  ```
  (This is the same two-dispatch pattern `QueueView` uses for `onOpenOutreach`.)

- [ ] **Step 4: Verify — the existing harness must still be green** (nothing asserts on the intake yet). Run `npm run typecheck && npm run build && node tools/verify.js`. Expected: `FAIL COUNT: 0`, `JS ERRORS: none`.

- [ ] **Step 5: Look at it.** Run `node tools/serve.js 4311 &`, open `http://localhost:4311`, News tab. Paste `https://www.straitstimes.com/business/mas-signals-easing-as-core-inflation-cools`, press Enter. You should see the orb pulse with a ring and three dots for about half a second, then a pink-mesh panel: RIN's brief starting "Reads as: SGD rates expected to ease.", a grey "Read from the link's headline · straitstimes.com" line, then client rows with Chen Wei Liang first (High impact · Confirmed · Draft outreach) and Robert Teo somewhere below with a red "Withheld" pill and no button. Then `kill %1`.

- [ ] **Step 6: Commit.**

```bash
git add src/components/NewsIntake.tsx src/components/NewsView.tsx src/App.tsx
git commit -m "News tab: paste a headline or link and RIN names the exposed clients

Input row above the news cards. RIN thinks for a beat (same orb and
dots as the Outreach chat), then answers with a brief, a source line
when a link was read, and one row per exposed client with the News
tab's own Confirmed/Inferred and severity pills. Each row has a Draft
outreach button, or a Withheld pill when a compliance gate applies.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

### Task 4: Harness coverage for the whole intake flow

**Files:**
- Modify: `tools/verify.js`

**Interfaces:**
- Consumes: every DOM hook listed under Task 3's *Produces*.

- [ ] **Step 1: Insert the assertions.** In `tools/verify.js`, inside `// ---- Module 5: News ----`, find these two lines:

```js
  await page.locator('[data-testid="news-client-open"]').first().click();
  check('Clicking a client name in News opens that client\'s position page', await page.locator('[data-testid="client-detail"]').count() === 1);
```

Insert the following block **directly above** them (i.e. after the `Client group leads with its most impactful item` check and before the click that leaves the News tab):

```js
  // ---- Bring-your-own-news: paste a link or headline, RIN names the exposed clients ----
  // ask() clears the old brief synchronously and shows the thinking dots, so waiting
  // for a brief to (re)appear is enough to know this submit's answer has landed.
  const intakeAnswer = async () => {
    await page.waitForFunction(() => document.querySelector('[data-testid="news-intake-brief"]') !== null, null, { timeout: 5000 });
    return page.locator('[data-testid="news-intake-brief"]').innerText();
  };
  check('News tab offers a place to paste a headline or link', await page.locator('#news-intake-input').count() === 1);
  check('The intake is an input, not a select (Queue must stay select-free)', await page.locator('main select').count() === 0);

  await page.fill('#news-intake-input', 'https://www.straitstimes.com/business/mas-signals-easing-as-core-inflation-cools');
  await page.press('#news-intake-input', 'Enter');
  check('RIN shows it is thinking before it answers', await page.locator('[data-testid="news-intake-thinking"]').count() === 1);
  let brief = await intakeAnswer();
  check('A pasted link is read from its headline and tied to the rates story', brief.includes('Reads as: SGD rates expected to ease'));
  check('The brief counts confirmed and inferred exposure', /1 confirmed against an open opportunity/.test(brief) && /\d+ inferred from what they hold/.test(brief));
  check('The panel names the source it read from', (await page.locator('[data-testid="news-intake-panel"]').innerText()).includes('straitstimes.com'));
  const intakeRows = await page.locator('[data-testid="news-intake-client"]').allInnerTexts();
  check('Chen is listed first as a confirmed exposure', intakeRows.length >= 2 && intakeRows[0].includes('Chen Wei Liang') && intakeRows[0].includes('Confirmed'));
  check('A news-only client is listed as inferred', intakeRows.some(r => r.includes('Kevin Loh') && r.includes('Inferred')));
  const robertIntake = page.locator('[data-testid="news-intake-client"]', { hasText: 'Robert Teo' });
  check('A withheld client shows Withheld instead of a draft button', (await robertIntake.innerText()).includes('Withheld') && await robertIntake.locator('[data-testid="news-intake-draft"]').count() === 0);

  await page.fill('#news-intake-input', 'Weather warning for the east coast');
  await page.press('#news-intake-input', 'Enter');
  brief = await intakeAnswer();
  check('An unrelated story gets an honest "couldn\'t tie that" reply', brief.includes("I couldn't tie that") && await page.locator('[data-testid="news-intake-client"]').count() === 0);

  await page.fill('#news-intake-input', 'Chip stocks slide as foundry guidance is cut');
  await page.press('#news-intake-input', 'Enter');
  brief = await intakeAnswer();
  check('A plain headline is classified too (semiconductors -> Priya, confirmed)', brief.includes('Reads as: Semiconductor sector correction') && (await page.locator('[data-testid="news-intake-client"]').first().innerText()).includes('Priya Ravindran'));

  await page.locator('[data-testid="news-intake-client"]', { hasText: 'Priya Ravindran' }).locator('[data-testid="news-intake-draft"]').click();
  check('Draft outreach from the intake opens Outreach for that client', await page.inputValue('#outreach-client-select') === 'priya');
  await page.click('nav >> text=News');
  await page.waitForTimeout(150);
  txt = await page.locator('main').innerText();
```

The final `txt = …` re-read matters: the pre-existing checks that follow this block don't use `txt`, but re-reading keeps the variable honest for anyone who adds one later.

- [ ] **Step 2: Run the harness.** `npm run build && node tools/verify.js`. Expected: every new line `OK`, `FAIL COUNT: 0`, `JS ERRORS: none`. If `RIN shows it is thinking before it answers` is the only FAIL, React flushed the state after Playwright's `press` returned; replace that check's condition with `await page.locator('[data-testid="news-intake-thinking"], [data-testid="news-intake-brief"]').count() >= 1` (either the dots or the answer must be on screen) and re-run. If a `waitForFunction` times out, the harness throws — follow the stale-server runbook in Global Constraints before re-running.

- [ ] **Step 3: Commit.**

```bash
git add tools/verify.js
git commit -m "Harness: cover the news intake end to end

A pasted Straits Times link reads as the rates story (Chen confirmed
first, Kevin Loh inferred, Robert Teo withheld with no draft button);
an unrelated headline gets the honest 'couldn't tie that' reply; a
plain semiconductor headline lands on Priya; Draft outreach from a
row opens Outreach for that client.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

### Task 5: Record it

**Files:**
- Modify: `docs/design-system.md`
- Modify: `README.md`

- [ ] **Step 1: Design system.** In `docs/design-system.md`, under the list that begins `**Also in the system now** (applied 2026-09-20):`, add as the last bullet:

```
- The News tab's intake panel (`src/components/NewsIntake.tsx`) is RIN
  speaking outside the Outreach chat, so it borrows the chat's grammar
  exactly: `.rin-orb` with `data-state`, `.typing-dot` while thinking,
  the white bubble with `rounded-bl-sm`, on a `.mesh-red` surface. If
  RIN ever answers on a third screen, reuse these — don't invent a new
  bubble.
```

Then under `## Migration log`, add after the polish-pass entry:

```
**2026-09-20 — bring-your-own-news.** Intake input on the News tab;
RIN's reply reuses the chat bubble language. No new tokens or classes.
Plan: `docs/superpowers/plans/2026-09-20-news-intake.md`.
```

- [ ] **Step 2: README.** Open `README.md` and find the section that describes the tabs (search for `News`). Add one sentence to the News description: `Paste a headline or a link at the top and RIN says what it is, which of your clients it touches, and offers a draft for each.` If the README has no per-tab description, add a line under whatever heading lists features.

- [ ] **Step 3: Final verification.** `npm run typecheck && npm run build && node tools/verify.js` → `FAIL COUNT: 0`. Then `git diff --stat main..HEAD` (or against the branch you started from) should list only: `src/lib/news.ts`, `src/lib/newsIntake.ts`, `src/components/NewsIntake.tsx`, `src/components/NewsView.tsx`, `src/App.tsx`, `tools/verify.js`, `docs/design-system.md`, `README.md`.

- [ ] **Step 4: Commit.**

```bash
git add docs/design-system.md README.md
git commit -m "Document the news intake in the design system and README

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

## Self-review against the spec

- *Input at top of News tab, headline or link* — Task 3 (input + `headlineFromInput` in Task 2).
- *Two-line brief read against desk notes* — `briefFor` in Task 2 uses `driver.label` + first sentence of `driver.detail`.
- *Exposed clients, most affected first, same pills as News tab* — `impactsForDriver` (Task 1) sorts by severity; Task 3 reuses the `pass/neutral` and severity variants `NewsView` uses.
- *Draft outreach per client; Withheld pill for gated clients* — Task 3 rows, `blockedClientIds`.
- *"Couldn't tie that" reply listing story kinds* — `NOTHING_FOUND` in Task 2; asserted in Task 4.
- *Link → slug → headline; source hostname shown* — Task 2 `headlineFromInput`; Task 3 source line; asserted in Task 4.
- *~600ms thinking with RIN's own motion; `bubble-in`; `mesh-red`* — Task 3.
- *Input keeps its text; new submit replaces result; local state; no ledger write* — Task 3 (`setResult(null)` on ask; no dispatch except navigation).
- *Copy rules* — no *driver/classifier/slug* on screen; Task 3 strings match the spec's Copy section verbatim.
- *Out of scope respected* — no fetch, no new drivers, no reducer change, existing News cards untouched.
- *Demo script* — steps 1–5 are exactly the Task 4 sequence.
