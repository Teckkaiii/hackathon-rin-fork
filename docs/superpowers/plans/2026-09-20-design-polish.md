# Design Polish Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Bring every screen in RIN up to the quality floor an RM would expect from a tool they open dozens of times a day — keyboard access, reduced-motion respect, phone layouts that don't break, one visual language for cards and stat strips, and copy an RM can read in seconds without knowing how RIN works inside — *without changing the palette, tokens, or look defined in `docs/design-system.md`.*

**Where this came from:** A full walkthrough on 2026-09-20 with the `impeccable` and `frontend-design` skills, both constrained to the design system. Every screen was screenshotted at 1280px and 390px; `impeccable detect` was run over `src/` (one finding, a false positive — see Task 1). Findings were filtered against the design system's Do/Don't list; where a skill's generic guidance conflicted with the doc, the doc won (see "Deliberately not changed" at the end).

**Mode:** Operate. Scanability, consistency and the real usage scene outrank expression. Brand lives in precise details.

**Tech Stack:** React 18, TypeScript 5.6 (strict), Vite 5, Tailwind 3. Verification is Playwright driving a built `dist/` via `tools/verify.js`.

---

## Global Constraints

- **Verification command, run after every task:** `npm run typecheck && npm run build && node tools/verify.js`. The harness exits non-zero on any `FAIL` line *or* any browser console error. A task is not done until it exits 0.
- `tools/verify.js` serves `dist/`, not the dev server. **You must `npm run build` before `node tools/verify.js`.**
- **Stale server runbook:** if the harness prints `EADDRINUSE` for port 4310, run `lsof -nP -iTCP:4310 -sTCP:LISTEN`, confirm the listener's command is `tools/serve.js` from this checkout, kill only that PID, re-run.
- **Uppercase trap:** `.t-micro` renders `text-transform: uppercase`, and Playwright `innerText()` returns rendered text. Never assert case-sensitively on an eyebrow label.
- **Design-system rules that apply to every task here** (from `docs/design-system.md`):
  - No black, near-black or graphite fill anywhere. Weight comes from `red`, `slate`, or `.mesh-red`.
  - No second accent colour. Status colours (`green`, `gold`, `red`) are for status only.
  - `ink` is for text, never a fill.
  - No beige/cream. The canvas is `#F7F1F1`.
  - Ambient motion belongs to RIN (the orb, typing dots, stream caret) and nothing else.
  - `.t-micro` stays uppercase. Don't "fix" it.
- **Every Tailwind class used in this plan already exists** in `tailwind.config.js` or `src/index.css` unless a task says to add it. Don't invent tokens.
- **Do not** add new dependencies. **Do not** touch `src/lib/*` logic, `src/data/*`, or `src/state.ts` — this plan is presentation and copy only.
- After the last task, `git diff --stat` should touch only: `src/index.css`, `src/components/*.tsx`, `src/components/ui/*.tsx`, `src/App.tsx`, `tools/verify.js`, `docs/design-system.md`.

---

### Task 1: Reduced motion, keyboard access, and the detector false positive

The quality floor. Three unrelated fixes bundled because each is a few lines and none changes what a sighted mouse user sees.

**Files:**
- Modify: `src/index.css`
- Modify: `src/components/ClientsView.tsx`

**Steps:**

- [ ] **1a. Respect `prefers-reduced-motion`.** In `src/index.css`, after the last `@keyframes` block (currently `flash-red`), append:

  ```css
  /* Presence motion is for people who can watch it. Reduced-motion users get the same
     states without the loop: the orb holds a steady glow, dots hold, the caret holds. */
  @media (prefers-reduced-motion: reduce) {
    .rin-orb, .rin-orb[data-state="thinking"]::after, .typing-dot, .stream-caret::after, .bubble-in, .flash-red {
      animation: none !important;
    }
    .rin-orb { box-shadow: 0 0 0 1px rgba(227,6,19,.30), 0 0 22px 3px rgba(227,6,19,.18); }
    .typing-dot { opacity: 1; }
  }
  ```

- [ ] **1b. Rename the `dot-bounce` keyframe** so the mechanical detector stops flagging it as "bounce easing" (it is a linear rise on `ease-in-out`, not elastic — a naming false positive, but the rename is free). In `src/index.css` change `@keyframes dot-bounce` → `@keyframes dot-rise` and `animation: dot-bounce 1.1s ease-in-out infinite;` → `animation: dot-rise 1.1s ease-in-out infinite;`. Two occurrences total.

- [ ] **1c. Make client rows keyboard-reachable.** In `src/components/ClientsView.tsx` the row is a `<div onClick>`, which a keyboard user cannot reach. Change the row element from `<div` to `<button type="button"` and its closing tag from `</div>` to `</button>`. Add `w-full text-left` to the front of its `className` string so it keeps the full-width block layout. Keep `data-testid="client-row"` and `data-client-id={c.id}` exactly as they are. The existing `:focus-visible` rule in `index.css` gives it a red focus ring for free.

- [ ] **1d. Verify.** `npm run typecheck && npm run build && node tools/verify.js` → exit 0. Then run the detector once: `"/Users/teckkai/.claude/plugins/cache/impeccable/impeccable/4.3.1/skills/impeccable/scripts/impeccable" detect --json src/` → expected output is `[]`.

---

### Task 2: The phone header — one row, not two

At 390px the six nav pills wrap to a second line and the header eats 170px of an 844px viewport before any content appears. Make the nav a single horizontally-scrollable row on small screens. Desktop is unchanged.

**Files:**
- Modify: `src/components/Nav.tsx`
- Modify: `src/App.tsx`

**Steps:**

- [ ] **2a.** In `src/components/Nav.tsx` change the `<nav>` className from
  `"flex gap-1.5 flex-wrap ml-auto"` to
  `"flex gap-1.5 ml-auto overflow-x-auto flex-nowrap max-sm:w-full max-sm:-mx-5 max-sm:px-5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"`.
  Add `flex-none whitespace-nowrap` to the front of each `<button>`'s `cn(...)` first string so pills never shrink or wrap their label.

- [ ] **2b.** In `src/App.tsx` the header inner `<div>` has `flex-wrap`. Keep it — on phone the title block and nav still stack (title row, then a full-width scrolling nav row). Nothing else changes.

- [ ] **2c. Verify** with the harness, then confirm visually: build, run `node tools/serve.js 4311 &`, open `http://localhost:4311` in a 390px-wide viewport (or use a throwaway Playwright script — do **not** commit it), confirm the six tabs sit on one row and the active tab is visible when it's the last one (scroll the row to check "Outreach"). Kill the server (`kill %1`).

---

### Task 3: One card language across the app

Queue cards use `glass-tight` (border, no shadow); Clients / News / Past Week cards use `glass` (border + soft shadow). The design system says separation comes from "a very light drop shadow and whitespace — no visible borders doing the work". Standardise on `glass`. Also: the queue's "Correlated conviction cluster" callout hard-codes a teal (`#C9DDE2` / `#EFF6F7`) — that's a second accent colour, which the doc forbids. It isn't rendered with the current fixture data, but it's a regression waiting to happen.

**Files:**
- Modify: `src/components/OpportunityCard.tsx`
- Modify: `src/components/QueueView.tsx`
- Modify: `src/components/BlockedCard.tsx`
- Modify: `src/components/ClientDetail.tsx`

**Steps:**

- [ ] **3a.** `src/components/OpportunityCard.tsx` — the root `<div>` className `"glass-tight border p-5 mb-3"` → `"glass p-5 mb-3"`. (The stray `border` was redundant; `glass` already carries the hairline.)

- [ ] **3b.** `src/components/QueueView.tsx` — the cluster callout: replace `className="glass-tight border-[#C9DDE2] bg-[#EFF6F7]/80 p-4 mb-4 flex gap-3 items-start"` with `className="glass-tight bg-sunk p-4 mb-4 flex gap-3 items-start"`. The `flag` pill (gold) already carries the "read this as a caveat" meaning. Also in QueueView: the "Handed off" and "Dismissed" row cards use `glass-tight p-4 mb-2` — leave them; they are secondary, list-like rows, and `glass-tight` is the correct quieter surface for them (same reasoning applies to `InfoCard` in ClientDetail and rows in ClientsView — leave those too).

- [ ] **3c.** `src/components/BlockedCard.tsx` — root className `"glass-tight border-t-2 border-t-red p-0 mb-4 overflow-hidden"` → `"glass border-t-2 border-t-red p-0 mb-4 overflow-hidden"`. The red top rule is structural (it says "gated") and stays.

- [ ] **3d.** Verify with the harness. No assertion references `glass-tight`, so nothing in `tools/verify.js` changes.

---

### Task 4: Queue card — spend red once, and fix a copy lie

Per card today red lands four times: the `RANK 01 · NOTIFY` eyebrow, the days-to-act pill (when urgent), the 44px signal score, and the primary button. On five cards that's twenty red hits on one screen and the eye stops ranking them. The signal score and the button are the two that matter (RIN's confidence; your next action). Demote the eyebrow.

The four metric bars use three different fill colours (gold / green / green / slate) by *category*, which reads as if urgency is a warning and relevancy is a pass. They're measurements, not statuses. One fill.

Also a copy defect: every card says `SGD · rolls over 17 Sept`, but for Priya (a concentration breach) and David (an income-gap review) nothing rolls over — the date is when the window closes.

**Files:**
- Modify: `src/components/OpportunityCard.tsx`
- Modify: `tools/verify.js` (only if 4d finds a hit — see step)

**Steps:**

- [ ] **4a. Eyebrow.** `<span className="t-micro text-red">Rank …` → `<span className="t-micro">Rank …`. (Default `.t-micro` colour is `ink-3`.)

- [ ] **4b. One bar colour.** Replace the `BAR_COLOR` constant with:
  ```ts
  const BAR_COLOR = {
    urgency: 'bg-slate',
    relevancy: 'bg-slate',
    momentum: 'bg-slate',
    conviction: 'bg-slate',
  } as const;
  ```
  The numeral next to each bar is what the RM reads; the bar is a length, and one colour lets four lengths be compared at a glance.

- [ ] **4c. Why-box hover.** `hover:bg-hairline-2/40` → `hover:bg-red-wash`. That's the same hover language the nav uses, so "this is clickable" reads the same everywhere.

- [ ] **4d. "Rolls over" only when something rolls over.** The date line is `<div className="t-meta mt-1">SGD · rolls over {fmtRollsOver(opp.daysToAct)}</div>`. Replace it with:
  ```tsx
  <div className="t-meta mt-1">SGD · {opp.approach === 'Notify' ? 'rolls over' : 'act by'} {fmtRollsOver(opp.daysToAct)}</div>
  ```
  Notify opportunities in the fixtures are all maturities (Chen's FD, Marcus's bond) — they do roll over. Contextualise and Review ones are concentration and income-gap conversations — there the date is simply when to act by. Then `grep -n "rolls over" tools/verify.js`; if there is a hit, change that assertion to `/rolls over|act by/`. (At the time of writing there is no hit.)

- [ ] **4e.** Verify with the harness.

---

### Task 5: Clients tab — show the exception, not the rule

Twenty rows, every one with the same green "Docs current" pill. A pill that is identical on every row carries no information and becomes the loudest thing on the page. Show the pill only when it's the exception (review lapsed), and put something that *varies* on the right instead: whether the client is in today's queue.

**Files:**
- Modify: `src/components/ClientsView.tsx`
- Modify: `tools/verify.js`

**Steps:**

- [ ] **5a.** Add imports at the top of `ClientsView.tsx`:
  ```ts
  import { rankedOpps } from '../lib/queue';
  ```
  Inside the component, after `const clients = …`, add:
  ```ts
  const queued = new Map<string, number>();
  rankedOpps({}, {}, MY_CLIENT_IDS).forEach((o, i) => { if (!queued.has(o.clientId)) queued.set(o.clientId, i + 1); });
  ```
  (`rankedOpps` with empty `dismissed`/`routed` gives today's full ranked queue. It is already exported from `src/lib/queue.ts` and used the same way in `OutreachView.tsx`.)

- [ ] **5b.** Replace the right-hand `<Pill …>` in the row with:
  ```tsx
  <div className="flex items-center gap-2 flex-none">
    {queued.has(c.id) && <span className="t-meta num">In queue · #{String(queued.get(c.id)).padStart(2, '0')}</span>}
    {lapsed && <Pill variant="block">Review lapsed</Pill>}
  </div>
  ```
  A client who is current *and* not queued shows nothing on the right — the row is calm, which is the correct reading of "nothing to do here".

- [ ] **5c.** In `tools/verify.js` find the Module for the client directory (search `Client directory lists 20 clients`). Add directly after the `'Client list row shows only name and segment'` check:
  ```js
  const rows = await page.locator('[data-testid="client-row"]').allInnerTexts();
  check('Client rows flag queued clients, not "Docs current" on every row', rows.filter(t => /In queue/i.test(t)).length === 5 && !rows.some(t => t.includes('Docs current')));
  ```

- [ ] **5d.** Verify with the harness.

---

### Task 6: Client detail — say things once, and let long values breathe

The line under the name repeats Tier, Mandate and KYC, all of which the Relationship card immediately below shows again. The queue card already went through this ("only Premier / Private under the name"); do the same here. And `KV` splits label/value 50/50, so "Loss tolerance" wraps into two lines while its value wraps into three.

**Files:**
- Modify: `src/components/ClientDetail.tsx`
- Modify: `tools/verify.js`

**Steps:**

- [ ] **6a.** Replace `<div className="t-meta mt-0.5">{c.segment} · {c.tier} · {c.mandate} mandate · KYC current to {fmtDate(c.kyc.expiry)}</div>` with `<div className="t-meta mt-0.5">{c.segment}</div>`. Then add the KYC expiry to the Relationship card so it isn't lost: change `<KV label="KYC" value={c.kyc.status} />` to `<KV label="KYC" value={`${c.kyc.status} · to ${fmtDate(c.kyc.expiry)}`} />`.

- [ ] **6b.** In `KV`, change the label span from `<span className="text-ink-3">` to `<span className="text-ink-3 flex-none w-[128px]">` and the value span from `text-right` to `text-right min-w-0`. Labels get a fixed column; values get the rest.

- [ ] **6c.** In `tools/verify.js` the check `Chen's identity line shows only the segment` already asserts `/Chen Wei Liang\s*\n\s*Premier\b/` — still true. Add after it:
  ```js
  check('Client header does not repeat tier/mandate/KYC that the Relationship card shows', !/Premier · Priority · Advisory mandate/.test(txt));
  ```

- [ ] **6d.** Verify with the harness.

---

### Task 7: Blocked — gate rows that survive a phone

At 390px each gate row is a three-column flex with a `min-w-[170px]` label, so the reason text is squeezed into a 110px column and the card becomes 1,200px tall. Stack label over reason below `sm`. Also drop the RM's own name from the meta line (it's her book; the queue and client page already dropped it).

**Files:**
- Modify: `src/components/BlockedCard.tsx`

**Steps:**

- [ ] **7a.** Meta line: `{c.segment} · {c.tier} · RM {c.rm}` → `{c.segment}`. (`fmt` and `cn` imports stay in use; nothing to clean.)

- [ ] **7b.** Gate row: change the row `cn(...)` first string from
  `'flex items-center gap-3 text-[13.5px] py-3 px-5 border-t border-hairline'` to
  `'grid grid-cols-[7px_1fr] sm:grid-cols-[7px_170px_1fr] items-baseline gap-x-3 gap-y-1 text-[13.5px] py-3 px-5 border-t border-hairline'`.
  Remove `min-w-[170px]` from the label span. Add `col-start-2 sm:col-start-3` to the reason span's className (so on phone it drops under the label, aligned with it; on desktop it takes the third column). The dot keeps column 1 on both.

- [ ] **7c.** Verify with the harness (`Withheld from queue`, gate labels and reasons are all still present as text). Then screenshot Blocked at 390px as in 2c and confirm the reason sits under its label, full width.

---

### Task 8: News — pills that are pills

"Priority — reaches multiple clients, at least one severely" is a sentence inside a pill; at phone width it wraps to three lines. And the "Inferred" pill is `slate` (a dark fill) on fourteen rows — the heaviest element on any screen, for the *less* certain of the two states. Confirmed should be the one that looks settled.

**Files:**
- Modify: `src/components/NewsView.tsx`
- Modify: `tools/verify.js`

**Steps:**

- [ ] **8a.** Change `FLAG_LABEL` to:
  ```ts
  const FLAG_LABEL: Record<NewsFlag, string> = { priority: 'Priority', elevated: 'Watch', standard: 'Standard' };
  const FLAG_TITLE: Record<NewsFlag, string> = {
    priority: 'Touches several of your clients, at least one hard',
    elevated: 'Hits one of your clients hard',
    standard: '',
  };
  ```
  and render the pill as `<Pill variant={FLAG_VARIANT[groupFlag]} title={FLAG_TITLE[groupFlag]}>{FLAG_LABEL[groupFlag]}</Pill>`. (`Pill` spreads `...rest` onto the span, so `title` passes through.) "Priority" must stay as the word — the harness looks for it near the rate-cut headline.

- [ ] **8b.** Basis pill: `variant={item.impact.basis === 'confirmed' ? 'pass' : 'slate'}` → `variant={item.impact.basis === 'confirmed' ? 'pass' : 'neutral'}`.

- [ ] **8c.** The right-hand pill column: add `sm:flex-col sm:items-end` and change the base to `flex flex-row flex-wrap items-start gap-1.5 flex-none` → i.e. the full className becomes `"flex flex-row flex-wrap items-start gap-1.5 flex-none sm:flex-col sm:items-end"`. Then on the row container `flex items-start gap-4 py-3 …` add `flex-wrap` so at phone width the pills drop below the text instead of squeezing it.

- [ ] **8d.** `tools/verify.js`: the check `News tab flags the multi-client item as Priority` searches 300 chars around the headline for the word `Priority` — still passes. `News tab shows an inferred impact` looks for `Inferred` — still passes. No change needed; run the harness to confirm.

---

### Task 9: Past week — one stat strip, and a timeline that stays a timeline

Past week's three stat cards use 30px `text-ink` numerals in separate white cards; the queue's strip uses 32px red numerals on `mesh-red` with dividers. Same information type, two languages. Extract the queue's strip into a shared component and use it in both places. Then the 7-day grid: at phone width it becomes a 2-column grid, so "8 Sep, 9 Sep" sit side by side and "10 Sep" is under "8 Sep" — the sequence breaks. Make it a horizontal scroll row below `md`.

**Files:**
- Create: `src/components/ui/StatStrip.tsx`
- Modify: `src/components/QueueView.tsx`
- Modify: `src/components/PastWeekView.tsx`

**Steps:**

- [ ] **9a.** Create `src/components/ui/StatStrip.tsx`:
  ```tsx
  import { Fragment } from 'react';

  export interface Stat { value: number; label: string; hint?: string }

  /** The one place a number gets to be red: a summary strip on a mesh-red surface. */
  export function StatStrip({ stats, ...rest }: { stats: Stat[] } & React.HTMLAttributes<HTMLDivElement>) {
    return (
      <div {...rest} className="mesh-red flex items-stretch gap-0 !p-0 overflow-hidden mb-4">
        {stats.map((s, i) => (
          <Fragment key={s.label}>
            {i > 0 && <div className="w-px bg-red/15 my-4" />}
            <div className="flex-1 px-5 py-4 min-w-[110px]">
              <div className="num text-[32px] font-extrabold leading-none tracking-tight text-red">{String(s.value).padStart(2, '0')}</div>
              <div className="t-micro mt-1.5">{s.label}</div>
              {s.hint && <div className="t-meta mt-0.5">{s.hint}</div>}
            </div>
          </Fragment>
        ))}
      </div>
    );
  }
  ```
  Add `import type React from 'react';` is **not** needed — with `jsx: react-jsx` and `@types/react` present, `React.HTMLAttributes` resolves via the global `React` namespace. If typecheck complains, change the type to `import type { HTMLAttributes } from 'react'` and use `HTMLAttributes<HTMLDivElement>`.

- [ ] **9b.** `QueueView.tsx`: import `{ StatStrip }` from `'./ui/StatStrip'`. Replace the whole `<div data-testid="queue-stat-strip" …> … </div>` block (three `StatBlock`s and two dividers) with:
  ```tsx
  <StatStrip
    data-testid="queue-stat-strip"
    stats={[
      { value: surfaced.length, label: 'Surfaced' },
      { value: blocked.length, label: 'Withheld' },
      { value: overnightDrivers.length, label: 'Signals overnight' },
    ]}
  />
  ```
  Delete the local `StatBlock` function. `Pill` import stays (used by the cluster callout and the Handed off / Dismissed rows).

- [ ] **9c.** `PastWeekView.tsx`: import `{ StatStrip }` from `'./ui/StatStrip'`. Replace the `<div className="grid md:grid-cols-3 gap-4 mb-4"> … </div>` block (three `glass p-5` cards) with:
  ```tsx
  <StatStrip
    data-testid="pastweek-stat-strip"
    stats={[
      { value: rows.length, label: 'Themes tracked', hint: 'over the last 7 days' },
      { value: highCount, label: 'High momentum', hint: 'consistent direction all week' },
      { value: deprioritized.size, label: 'Clients deprioritized', hint: 'touched only by volatile themes' },
    ]}
  />
  ```

- [ ] **9d.** Day cells: change `className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-7 gap-2.5 mb-1"` to `className="flex md:grid md:grid-cols-7 gap-2.5 mb-1 overflow-x-auto snap-x max-md:-mx-5 max-md:px-5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"` and add `max-md:min-w-[150px] max-md:snap-start flex-none md:flex-auto` to the front of each day cell's `cn(...)` first string (`'rounded-lg p-2.5'` → `'max-md:min-w-[150px] max-md:snap-start flex-none md:flex-auto rounded-lg p-2.5'`).

- [ ] **9e.** `grep -n "Themes tracked\|THEMES TRACKED" tools/verify.js` — no hit at time of writing. The queue-strip assertions (`/05\s+surfaced/i` etc.) are unaffected because the rendered text is identical. Verify with the harness.

---

### Task 10: Outreach — the one unstyled control, and copy that earns its space

The client `<select>` is the only native, browser-styled control in the app. At phone width the two chip rows wrap into four lines. The three-line intro is read by the RM every single day; one line is enough. And the ledger's empty state should tell you what will appear there.

**Files:**
- Modify: `src/components/OutreachView.tsx`
- Modify: `tools/verify.js`

**Steps:**

- [ ] **10a. Select.** Change the `<select>` className to:
  `"appearance-none rounded-full border border-hairline-2 bg-white pl-4 pr-9 py-2 text-[14px] font-semibold text-ink mb-4 bg-no-repeat bg-[right_0.9rem_center] bg-[length:12px_12px] bg-[url('data:image/svg+xml;utf8,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 20 20%22 fill=%22%234A5560%22><path d=%22M5.5 7.5l4.5 4.5 4.5-4.5%22 stroke=%22%234A5560%22 stroke-width=%222%22 fill=%22none%22 stroke-linecap=%22round%22/></svg>')] hover:border-ink-3 transition-colors"`
  Keep `id="outreach-client-select"` — the harness depends on it. The chevron is `ink-2` (`#4A5560`); the pill shape matches the nav and the chips, so the selector reads as part of the same control family.

- [ ] **10b. Lead copy.** Replace the `t-lead` paragraph's text with:
  `Tell RIN how you want the note to sound. RIN checks it against {c.name}'s records before you send, and keeps a record of what you decided.`

- [ ] **10c. Chip rows on phone.** The email-type row (`data-testid="type-chips"`, currently `flex items-center gap-1.5 flex-wrap mb-2`) and the action-chip row directly below it (`flex gap-1.5 flex-wrap …` — find it by searching `CHIPS.map`) both get: replace `flex-wrap` with `flex-nowrap overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden sm:flex-wrap sm:overflow-visible`, and add `flex-none` to each `Button` inside them via the `className` prop (`className="flex-none"`). Desktop wraps as before; phone scrolls one row.

- [ ] **10d. Ledger empty state.** `<div className="t-meta">No entries yet.</div>` → `<div className="t-meta">Nothing here yet. Once you send or skip a note to {first}, it shows up here.</div>` (`first` is already in scope: it's the client's first name, used in the chat header.) Also rename the ledger heading `Outcome ledger — {c.name}` → `What you decided — {c.name}`, and the secondary button `Log a non-send` → `Skip, and say why` (search for the string; the harness clicks it by `data-act`, not by text — `grep -n "non-send" tools/verify.js` returns nothing).

- [ ] **10e. Harness.** `grep -n "Talk to RIN\|No entries\|Outcome ledger" tools/verify.js`. Update any hit: `Talk to RIN` → `Tell RIN how you want`; `No entries yet` → `Nothing here yet`; `Outcome ledger` → `What you decided`. Verify with the harness.

---

### Task 11: Plain-English pass on the copy the RM reads every day

**The bar:** an RM should understand any line on the screen within a few seconds, without knowing how RIN works inside. Words RMs already use at work — *suitability, KYC, mandate, concentration, fixed deposit, Premier / Private* — stay; they are the RM's own vocabulary, not jargon. Words that describe RIN's machinery — *gate, driver, ranking, position page, impact read, correlated conviction* — go.

**Must-keep words** (the harness asserts on them, and they are already plain): `Surfaced`, `Withheld`, `Signals overnight`, `Blocked tab`, `worth a look today`, `on hold pending compliance`, `Handed off`, `Dismissed`, `Confirmed`, `Inferred`, `Priority` (news pill), `High momentum`, `Low momentum`, `Active priority`, `Deprioritized`, `Suitability & mandate fit`, `Sent to Chen`, `← All clients`, `Back to queue`, and all six nav labels.

**Files:**
- Modify: `src/components/QueueView.tsx`, `ClientsView.tsx`, `BlockedView.tsx`, `BlockedCard.tsx`, `NewsView.tsx`, `PastWeekView.tsx`, `ClientDetail.tsx`, `src/App.tsx`

**Steps** — each is a find-and-replace of the exact string on the left with the string on the right:

- [ ] **11a. Queue — cluster callout** (`QueueView.tsx`).
  `<Pill variant="flag">Cluster</Pill>` → `<Pill variant="flag">Linked</Pill>`
  The sentence `<b>Correlated conviction cluster</b> — {cl.opps.length} opportunities rest on the same driver:{' '}<b>{cl.driver.label}</b> ({…names…}). Read as one conviction, not {cl.opps.length} independent ones.` →
  `<b>Same story, {cl.opps.length} clients</b> — {…names…} are all here because of <b>{cl.driver.label}</b>. Treat them as one call, not {cl.opps.length}.` (keep the existing `{cl.opps.map(…).join(', ')}` expression for the names).

- [ ] **11b. Queue — handed-off intro** (`QueueView.tsx`).
  `These opportunities were routed somewhere other than a direct message. They stay out of the queue until the desk or the client comes back.` →
  `You passed these to a specialist or to a call. They stay off your queue until you hear back.`

- [ ] **11c. Clients intro** (`ClientsView.tsx`).
  `One reviewable position page per Premier or Private client. Clients withheld by a compliance gate live in the Blocked tab instead.` →
  `Everyone in your book. Anyone held back by a compliance check is in the Blocked tab instead.`

- [ ] **11d. Blocked intro** (`BlockedView.tsx` — open the file and find the `t-lead` paragraph).
  `Withheld from the queue entirely by a hard compliance gate. Gates always run before ranking, so no filter setting can surface these.` →
  `Held back by a compliance check. These never reach your queue until the check clears — there is no way to force them through.`

- [ ] **11e. Blocked card footer** (`BlockedCard.tsx`).
  `Would otherwise rank on <span …>{fmt(opp.amountAtStake)}</span> at stake,{' '}{opp.daysToAct}-day window. Blocked at <b …>{blockedRow.label}</b>.` →
  `Worth <span …>{fmt(opp.amountAtStake)}</span> with {opp.daysToAct} days to act — held at <b …>{blockedRow.label}</b>.` (keep both spans' classNames exactly as they are).

- [ ] **11f. News intro** (`NewsView.tsx`).
  `Market and desk events from the last day, grouped by client and led by whichever is most impactful to them. Confirmed impacts are already linked to a signal on an opportunity; inferred ones are RIN's own match against holdings, unreviewed.` →
  `What happened in the last day, sorted by who it touches most. Confirmed means it is already behind an item in your queue. Inferred means RIN thinks it fits what the client holds, and you have not checked it yet.`

- [ ] **11g. Past week intro and client lines** (`PastWeekView.tsx`).
  `Seven days of daily impact reads per theme, against this book. A theme that landed the same direction every day is durable enough to build a recommendation around; one that flips is not.` →
  `How each story moved over the last seven days. A story that pointed the same way every day is safe to act on. One that kept flipping is not.`
  `Every theme touching this client this week was volatile — no durable long-term action to recommend yet. Watch, don’t act.` →
  `Every story touching this client kept flipping this week. Watch, don’t act yet.`
  `Touched by at least one high-momentum theme this week — keeps its normal priority in the Queue.` →
  `At least one steady story touches this client — stays where it is in your queue.`
  The stat hints from Task 9c: `over the last 7 days` (keep), `consistent direction all week` → `pointed one way all week`, `touched only by volatile themes` → `only touched by flipping stories`.

- [ ] **11h. Client page** (`ClientDetail.tsx`).
  `<InfoCard eyebrow="Portfolio · evidence-traced">` → `<InfoCard eyebrow="Portfolio">` (the `Source:` line under each holding already shows where the figure came from — that is the evidence, and it speaks for itself).
  `Suitability current · ${monthsSince} months ago` → `Suitability reviewed ${monthsSince} months ago`; `Suitability lapsed` → `Suitability review overdue`.
  `{oppCount} open {oppCount === 1 ? 'opportunity' : 'opportunities'}` → `{oppCount === 1 ? 'In your queue' : `${oppCount} in your queue`}` and render this pill only when `oppCount > 0` (wrap it in `{oppCount > 0 && (…)}`).

- [ ] **11i. App shell** (`src/App.tsx`).
  Footer: `Synthetic data throughout. RIN surfaces and explains; it does not price, advise, or send without RM approval.` →
  `Demo data. RIN suggests and explains — it never prices, advises, or sends anything without you.`
  Header subtitle `Daily decision layer` → `Your morning, sorted.`

- [ ] **11j. Harness.** Run `grep -n "Synthetic data\|Daily decision\|evidence-traced\|open opportunit\|Suitability current\|Would otherwise\|Correlated\|Cluster" tools/verify.js`. At the time of writing none of these are asserted. If any hit appears, update the assertion to the new wording. Then `npm run typecheck && npm run build && node tools/verify.js` → exit 0. Finally read every changed line once more against the bar at the top of this task: if you would have to explain a word to a new RM, change it.

---

### Task 12: Record it in the design system

The doc is a living document; this pass added one shared component and three rules of thumb.

**Files:**
- Modify: `docs/design-system.md`

**Steps:**

- [ ] **12a.** Under "Components — what's already right, what needs to change", add to the "Also in the system now" list:
  - `StatStrip` (`src/components/ui/StatStrip.tsx`) — the only place a summary number renders in `red` at display size. Queue and Past week both use it. Don't hand-roll a third.
  - Cards are `.glass` (shadow) when they are the page's content and `.glass-tight` (no shadow) when they are rows inside something else. Queue cards, blocked cards, news groups and past-week themes are content; handed-off rows, client-list rows and info cards inside the client page are rows.
  - Metric bars are one colour (`slate`). Status colours are for status pills and dots, not for measurements.
  - A pill is a label, not a sentence. If the text needs a clause, put the clause in `title` or in `t-meta` beside it.
  - Copy is written for the RM, in the RM's own words. Banking vocabulary they use daily (suitability, KYC, mandate, concentration) stays; words that describe RIN's internals (gate, driver, ranking, signal strength) do not appear on screen.

- [ ] **12b.** Under "Motion, in two registers", add one sentence: "Both registers stop under `prefers-reduced-motion: reduce` — the orb holds its idle glow, the dots hold, the caret holds. That block lives at the bottom of `src/index.css`."

- [ ] **12c.** Under "Migration log", add: "**2026-09-20 — polish pass.** Reduced-motion block; single-row phone nav; `glass` on content cards; red demoted off the rank eyebrow and metric bars; Clients list shows exceptions only; Blocked gate rows stack on phone; News pills shortened, Inferred is `neutral`; `StatStrip` extracted and used on Past week; Outreach select styled; plain-English copy pass (RM vocabulary stays, RIN machinery words go). Plan: `docs/superpowers/plans/2026-09-20-design-polish.md`."

- [ ] **12d.** Final full verification: `npm run typecheck && npm run build && node tools/verify.js` → exit 0. `git diff --stat` matches the file list in Global Constraints.

---

## Deliberately not changed (skill guidance vs. the design system)

These came up in the review and were rejected because `docs/design-system.md` wins. Recorded so nobody re-litigates them by accident.

| Skill said | Doc says | Decision |
|---|---|---|
| All-caps eyebrow labels (`.t-micro`) are a generated-page tell. | `.t-micro` stays uppercase; it's part of the type scale and the harness knows about it. | Keep. The count of eyebrows per queue card (6) is high, but each one names a different thing; none is decorative. |
| Zero-padded `01 / 02 / 03` numbering is a default. | — | Keep. The queue *is* a ranked sequence; the stat strip is an instrument readout. Both are legitimate uses. |
| Middle-dot meta strings (`A · B · C`) are template chrome. | — | Reduce, don't ban. Tasks 6 and 7 cut the redundant ones; `SGD · rolls over 26 Sept` and `Rank 01 · Notify` stay because each side of the dot is a different fact. |
| Consider a display serif / second typeface for the greeting. | One typeface, Hanken Grotesk. | Keep. |
| Warm cream canvas reads as generated. | Canvas is `#F7F1F1`, pink-white, sampled from OCBC's app. | Keep — it's evidence, not taste. |
| Detector: `dot-bounce` is bounce easing. | — | False positive (it's a `translateY` on `ease-in-out`). Renamed in Task 1 to stop the noise. |
