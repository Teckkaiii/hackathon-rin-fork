# RIN — project context

**Read this file first in any new session on this project.** It is the single source of truth for where things stand. It is a living document — see "Keeping this file current" at the bottom.

---

## 1. What this project is

A hackathon submission for OCBC. The team's idea: **Revenue Intelligence Network (RIN)** — a daily decision layer that turns OCBC's cross-divisional client data plus external market signals into a short, ranked, reasoned list of clients a relationship manager (RM) should call today, with the "why," the product hook, and the right specialist already attached. RIN never acts on its own and never bypasses the RM — it arms the human conversation.

**Project goal** (from the Claude Project description): come up with a winning hackathon idea, build it end to end, and pitch it to the enterprise.

**Where things stand right now:** idea and written proposal are done, the Phase 2 written submission is done, and the team decided to demo with **a single polished HTML prototype** rather than a real tech stack (no backend, no framework, no build step). That prototype is now on its third major iteration and is the main active workstream. **Important:** at least one round of prototype work (v2, described below) was done outside this session — by the user directly, another tool, or another Claude session — so this file cannot assume it has seen every change. Always check the device folder's version list (§4) against what this file says before trusting either one blindly.

---

## 2. The eight-step mechanism (the idea itself)

This is fixed and does not change with the prototype's UI. Every version of the demo must stay faithful to it:

1. **Unify** — cross-divisional client-360 into one queryable state
2. **Sense** — external signals: rate/market moves, corporate actions, regulatory/corridor events, company news
3. **Trace** — impact to clients via direct holdings *and* indirect paths (FX exposure, floating-rate leverage, corridor receivables) — the hardest step, and the moat, because it needs OCBC's whole-Group view
4. **Score** — revenue potential, urgency, product fit, conversion likelihood, relationship strength
5. **Surface** — a short, ranked call list — a decision, not raw data
6. **Reason** — client-specific so-what and product hook, in RM-usable language
7. **Route** — name the right divisions/specialists (Global Markets, Wealth, Private Banking, Transaction Banking, Insurance)
8. **Learn** — from the RM's accept/reject/outcome

**The four gates, always kept separate, never collapsed into one black-box score:**
- Is there a need? (Eligibility)
- Is the client eligible and suitable? (Suitability)
- May this information cross the barrier? (Permission)
- Should a human introduce them? (Conduct)

"Available inside OCBC" never means "shareable across divisions" — permission is the firewall, by design. RIN does not price, recommend, or execute. It does not claim to predict conversion.

**The right-to-win**: the indirect-impact reasoning only works from OCBC's unified One Group view, sharpened by the ASEAN–Greater China corridor, carried by a trusted RM force, and compounded by a proprietary feedback dataset a cold-starting competitor cannot buy.

Full text: `claude/RIN_proposal_concise.md` (project doc) and `RIN_Phase2_Submission.md` (549-line authoritative Phase 2 write-up — problem statement, mechanism, demo storyboard, benefits/challenges, architecture appendix, judge Q&A, evidence register). The submission is the ground truth the prototype must stay faithful to.

---

## 3. File and folder convention (read this before touching the prototype)

Starting now, **every round of changes to the prototype gets its own numbered folder** directly under the Hackathon root, containing that round's complete `RIN_Demo.html` snapshot plus a changelog scoped to just that round:

```
OCBC Hackathon/
  v1/   RIN_Demo.html                    RIN_prototype_changelog.md
  v2/   RIN_Demo_HNW.html                RIN_Demo_HNW_Changelog.md
  v3/   RIN_Demo_HNW.html                CHANGELOG.md
  v4/   RIN_Demo_HNW.html                CHANGELOG.md
  v5/   RIN_Demo_HNW.html                CHANGELOG.md
  v6/   RIN_Demo_HNW.html                CHANGELOG.md
  v7/   RIN_Demo_HNW.html                CHANGELOG.md
  v8/   RIN_Demo_HNW.html                CHANGELOG.md
  v9/   RIN_Demo_HNW.html                CHANGELOG.md
  v10/  RIN_Demo_HNW.html                CHANGELOG.md
  v11/  RIN_Demo_HNW.html                CHANGELOG.md
  v12/  ...                                                <- next round goes here
  RIN_Phase2_Submission.md
  RIN_proposal_concise.md / .docx
  RIN_context.md                         <- this file
  image/                                 (4 OCBC app reference screenshots)
  spec/                                  (D1–D4 impact-spec docs, separate workstream)
```

Rules for this convention:
- **Never overwrite a version folder.** Each one is a permanent snapshot. A new round of edits always creates the next number (`v3`, `v4`, ...), even for a small fix.
- **The html filename inside a version folder doesn't need to match the previous one exactly** (v2 renamed it to `RIN_Demo_HNW.html`) — but unless the user has a reason to rename it, default to keeping it `RIN_Demo.html` so links/instructions stay simple.
- **The changelog is scoped to that round only** — what changed since the previous version, not a cumulative history. (v1's and v2's changelogs on the device are actually written as bigger, more narrative documents than this — that's fine, but going forward the default is "just this round's diff," with this context file carrying the cumulative story instead.)
- **This context file (`RIN_context.md`) is the cumulative index.** It always names the current highest version folder as the base to work from, and §4 below carries the running history so nobody has to reconstruct it by reading every changelog.
- After delivering a new version, this file gets updated and re-saved (see "Keeping this file current" at the bottom) — that update itself is part of finishing the round, not an optional follow-up.

**A version folder is not created for a round of edits that never gets delivered to the user.** Iterating in the working session, screenshotting, fixing — none of that needs a folder. Only a version the user actually receives (via SendUserFile + device commit) gets one.

---

## 4. Version history

### v1 — the original submission draft
Uploaded by the user, 1,043 lines. Dark navy chrome, square corners, generic red `#C1121F`. Five opportunities mixing companies (Meridian Marine, Sunda Logistics, Khoo Agri-Processing) and individuals across Business/Premier Banking. Four flat, co-equal tabs (Daily queue / Gate log / Specialist inbox / Audit trail). No repetition fix, no walkthrough, rule logic shown as raw boolean code.

*(Note: the device's `v1/` folder actually holds my first full redesign, not this original file, because the user renamed my working folder to `v1` after the fact. The truly original upload only exists as `RIN_Demo.html` in the user's uploads history, 54,029 bytes / 1,043 lines. Not a problem in practice — v1/ on the device is a perfectly good rung on the ladder, just be aware the label doesn't mean "the very first draft" if you go looking.)*

### v2 (my build) — OCBC visual system + cadence engine + HNW-only
Built by me across several rounds in one session, ~2,003 lines, delivered as the (then) contents of a folder called `protoype/` which the user later renamed to `v1/` (see note above — so what's *on the device* as v1 is functionally my v2). Highlights:
- OCBC-derived visual system: warm off-white canvas, white floating cards, real OCBC red `#E1261B` as accent only, slate `#3F535E` primary buttons, soft 20px/14px corners, pill buttons and badges.
- One explicit type scale (38/27/19/15/11px), stat strips carrying key figures, inline bolded numbers in prose.
- Navigation split into primary (`Today` / `This week`) and secondary (`What we blocked` / `Specialist view`) tabs.
- Progressive disclosure in the briefing — rule logic, score breakdown and check detail all folded behind toggles.
- **The cadence engine** — the fix for "don't call the same client every day": deadline-bound opportunities resurface on an interval that tightens as the deadline nears (>30d → every 5 sim-days, 8–30d → every 3, ≤7d → daily); a separate no-deadline lane never enters the daily list at all. Proven live with a "skip to tomorrow" simulator.
- Audience narrowed to **19 HNW individuals and family offices**, zero companies, in response to an explicit user requirement.
- A 7-step guided walkthrough that watches for the real action and advances itself (no "Next" button) — "Show me" points at the control, never clicks it for you.
- Rule logic rewritten as plain ticked sentences for the RM, with the raw expression demoted one level deeper for a compliance officer or judge.
- Daily list capped at exactly 5 by rank, with a "held for another day" count for anything ranked below the cut.

Full change-by-change detail: `claude/RIN_prototype_changelog.md` (also on the device as `v1/RIN_prototype_changelog.md`).

### v3 (device) — "HNW / Premier refactor" (`RIN_Demo_HNW.html`, on device as `v2/`)
**Built outside this session** — not my work, but built *on top of* my v2 (it keeps my walkthrough pattern, my tab names, my visual system, my rule-plain-English pattern). Verified in this session with `node --check` on the extracted script (clean) and a full Playwright click-through (zero JS errors, only the expected offline-font-CDN failure). 3,008 lines. Confirmed as the file to build on going forward, per the user. Adds:
- **A new, specific opportunity set**: Priya Ravindran, Tan Wei Ling, Yeo Kim Hock, Arun Menon, Chandra Devi Nair headline the daily queue; book size stated as 280 HNW clients (was 240 in my v2).
- **A "Momentum" tab** — a book-wide view, separate from an individual brief's own momentum section.
- **A "Value of the conversation" section** on every brief, placed after the compliance gates and before "What to say": a client-value column (prose) and a bank-value column (five indicators — relevant balance, addressable AUM range, relationship-deepening potential, retention potential, a commercial band A–D) with a prominent "indicative only, not forecast revenue" label. No currency revenue figure appears anywhere.
- **A "How the week went" strip** on the brief — a 7-day evidence/conviction timeline for that opportunity.
- **A "Pilot measurement" tab** — six named metrics for a real pilot, split into three computed live from the session's own audit trail (time from signal to engagement, RM acceptance rate, specialist progression rate) and three explicitly marked "not yet measured" with a named evidence owner and required precondition (conversion vs. control group / incremental AUM / attributable revenue). Includes a "What must not be counted" list of anti-double-counting rules.
- **Cadence bands retuned**: `daysLeft<=21 ? 1 : 3` (was my 5/8/30/>30 three-tier version) — tuned for this version's specific deadline spread (12–33 days out).
- Tab renamed: `This week` → `No deadline`.

Full narrative changelog: on the device at `v2/RIN_Demo_HNW_Changelog.md`. Its own open items (carried forward, still unresolved): whether the driver/correlation roll-up should auto-discount scores rather than just flag concentration; whether RM dismissals should count as −1 somewhere; `DEMO_START` (29 Aug 2026) is actually a Saturday, which sits oddly with a "9am cycle" weekday narrative.

### v4 (device `v3/`) — the weekend fix
A small, targeted round: fixed exactly one of the three open items carried from the v3-round changelog (the `DEMO_START` weekend anchor), at the user's explicit request to do that one first. Still `RIN_Demo_HNW.html`, 3,008 lines — no features added or removed, no visual changes.
- **`DEMO_START` moved from Saturday 29 Aug to Monday 31 Aug 2026.** The six simulated days now run Mon 31 Aug → Fri 4 Sep → Sat 5 Sep, so five of six are weekdays (day 6 is still a Saturday — end-of-week wrap-up framing, not claimed as a business day; judged not worth a bigger rewrite to avoid entirely).
- **~130 hand-written narrative dates shifted +2 days in lockstep with the anchor** (evidence timestamps, momentum-ledger source dates, gate-release dates) — needed because the momentum tracker's hover tooltips are computed live from the anchor, and would otherwise disagree with the evidence prose sitting next to them.
- **All 8 fixed `deadline:"..."` fields deliberately left untouched** (Ravindran's 17 Sep maturity, the 6 Sep lock-up, etc.) — verified byte-identical before/after via grep, since those are calendar commitments that don't move with the RM's cycle start.
- **Bonus fix, found along the way, not asked for**: the audit trail was hardcoding one date (the anchor date) in front of every logged entry regardless of which simulated day it actually happened on. Fixed by recording `demoDay` on each entry and formatting its real date at render time.
- Left open, deliberately out of scope for this round: one pre-existing minor narrative date inaccuracy ("Twenty days to maturity" text slightly off against the literal ledger math); open items 1 and 2 below (untouched, same as before).
- Verified: `node --check` clean, full Playwright pass (eyebrow date, queue header across all 6 days, momentum-tooltip-vs-evidence-prose cross-check, audit-trail per-entry dates), deadline-field grep diff clean, zero JS errors (only the expected offline-font failure).

Full round changelog: on the device at `v3/CHANGELOG.md`.

### v5 (device `v4/`) — discussion pathways, and a readable screen
The first round driven by the **RIN Prototype Improvement Guide** (see §5) — implements items 8 and 13 from it, picked as the two best value-per-hour fixes. 3,212 lines. No engine changes: the six-day cadence sweep returns the same clients on the same days as v3, which is how it was confirmed nothing was disturbed.
- **Item 8 — "Eligible routes" became "Potential discussion pathways for human review."** The old section showed a product name and an owner, which reads as an endorsed recommendation; eligibility, suitability and appropriateness are three different tests and passing the first says nothing about the other two. Each of the 24 pathways (12 opportunities × 2, all written individually against that opportunity's own evidence) now carries: why it may be relevant; a visible *Specialist review required* / *No specialist review to open it* tag (14 require it, 10 don't); what is still to confirm with the client; whether the client declined something similar before (surfaced in amber at the top — Tan Wei Ling's June 2025 refusal is the live example — and stated explicitly when nothing was declined); and, collapsed, the supporting evidence plus a list of the steps that have *not* happened yet. Every brief now closes with the standing statement that **RIN does not provide financial advice, determine final suitability, price products or execute transactions**, naming the RM and specialist as the accountable decision-makers.
- **Item 13 — visual hierarchy and screen-share legibility.** 110 size rules changed against a floor of 15px body/queue text, 13px metadata, 20px key figures; the worst offenders were 9.5–11px uppercase labels. Smallest *text* on the page is now 13px (anything smaller is an icon glyph inside a coloured circle). The brief was reordered so action and value sit above evidence and controls: Why them why now → Value of the conversation → What to say → Discussion pathways → What happened → What we checked → Compliance checks → How the week went → Signal strength. The 7-day tracker got a colour-plus-text key on both screens that show it, so colour is no longer load-bearing alone. Two walls of small grey text (the "indicative only" disclaimer, the momentum-bands note) became a one-line statement plus a collapsed list — nothing deleted, just readable. Section padding and several cramped grids widened.
- Verified: `node --check` clean; Playwright pass covering the walkthrough, all five secondary tabs, all 12 briefs (24 pathways, 14 review-required, 1 declined flag), a programmatic assertion of brief section order, the six-day cadence sweep, a live measurement of the smallest rendered font size, and a 2057px→1440px downscale render to see exactly what 70% browser zoom looks like when screen-sharing. Zero JS errors.

Full round changelog: on the device at `v4/CHANGELOG.md`.

### v6 (device `v5/`) — uncertainty, a lighter surface, and fewer words
Four things at once, at the user's request: Improvement Guide item 12, a modest visual modernisation, a full click-through audit, and a copy trim. 3,404 lines. Cadence sweep still returns the same clients on the same days as v3–v5.
- **Item 12 — uncertainty and controlled failure.** A new "Where RIN was not sure" section, placed second on the renamed *What you didn't see* tab (was *What we blocked* — it now covers five different reasons something never reached the RM, not just the gates). Four cases that passed every check and still did not become a call, each naming why engagement was not pushed: sources disagree (custody vs. external filing — clarification raised instead); record too old to score (a 2023 risk profile — sent as a profile review, not ranked); one event, six articles (clustered and counted once); and an RM-reported wrong link (alert withdrawn, correction task raised, similar alerts held). **The fourth is live** — dismissing anything with the reason "the link to this client is wrong" now raises a correction task, suppresses similar signals, logs it, and appends an amber row to that section, so the false-positive loop is demonstrated rather than described. Separately, every one of the twelve opportunities now carries a one-line **"Still unknown"** statement at the end of its evidence section.
- **A slightly more futuristic surface**, deliberately restrained so it still reads as a bank system: frosted translucent chrome on the masthead, tabs, action bar and footer; one accent gradient reused across the top rule, mark, primary buttons, rank badges, selected tab and the big funnel/score figures; a layered red glow plus a gradient edge on the selected card instead of a hard outline; three-layer shadows and one consistent easing curve; a live pulse and a masked dot-grid on the opening screen.
- **Every control clicked — and two real defects found.** (1) The sticky action bar was sitting on top of the last disclosure on every brief at maximum scroll, making "How this number was built" genuinely unreachable; the cause was `overflow:hidden` on the briefing card turning it into a scroll container, fixed by switching to `overflow:clip`. (2) The page scrolled sideways on every view, caused by this round's own animated sweep on the top red rule escaping its parent; clipped. Afterwards: every element on every view, disclosures open, walkthrough on and off, can be scrolled to a position where nothing covers it.
- **Fewer words.** ~100 copy edits; the twelve client-value paragraphs cut by about a third, the six pilot metric descriptions tightened, a duplicated synthetic-data disclaimer removed, and the two longest callouts folded into collapsed panels that keep their claim visible. Visible text (nothing expanded) went 4,469 → 4,437 words *while adding* the ~320-word uncertainty section — so existing screens are roughly 8% lighter.

Full round changelog: on the device at `v5/CHANGELOG.md`.

### v7 (device `v6/`) — the world layer
Not from the Improvement Guide. The user's own observation, and the sharpest one anyone has made about this prototype: *"it has become a helping tool for the RM on keeping track of what they miss, but how the news in the world is affecting these clients is also needed."* He was right — every opportunity in the demo started **inside** the bank (a maturity date, a review date, a balance that had not moved), which made RIN read as a tracker rather than an intelligence layer. §2 of this file calls **Trace** the moat. The prototype asserted that step and never showed it. 3,845 lines.
- **A new second tab, "What moved."** Runs the night in reverse, from the world inward: 1,284 items read → 47 never read → the rest clustered into **184 distinct events** → **5** reach someone on this book → **10** client links traced. The clustering number does real work: six wire stories about one rate decision are one event, and it reconciles exactly with the opening funnel. Eight events shown in full — rates, sector, currency, corridor, corporate action, and three that reached **nobody** (a regulatory consultation that deliberately produced no opportunity, a palm-oil move with no traceable exposure, and a restricted name never read at all), kept on the page because a layer that only ever shows hits cannot be calibrated.
- **Seven named transmission paths** replace the vague claim of relevance: direct holding, rate repricing, currency mismatch, corridor exposure, sector concentration, rule change, no path found. Every link is tagged **confirmed** (read from a record) or **inferred** (RIN worked it out, could be wrong). Every traced client also shows where they actually stand — "On today's list, ranked 2", "Held below today's cap of five", "On the no-deadline list" — computed from the same `liveDaily()` the queue renders from, so the two views cannot drift.
- **A thirteenth client, triggered entirely from outside: Tan Hock Seng (OP-4455), corridor liquidity.** Nansha port congestion plus a tightened rules-of-origin check push his receivables collection ~19 days out, against SGD 6.2m he owes personally on 22 September. **No corporate record is read to build it** — the ownership is his own declaration, the facility is his own, the port event is public — which turns the permission gate from a constraint into part of the story. The weakest step (the delay estimate, from published dwell times rather than his shipments) is labelled as weak in the rule note and named in the first talking point.
- **Every brief opens with a three-line trace**: Outside (the event) → Path (the mechanism, with its confirmed/inferred tag) → Them (this client's position). For the three opportunities with no external trigger it says so plainly rather than pretending — nine of thirteen are externally triggered, three internally, one purely external.
- Also: the walkthrough gained a step and now opens with What moved; the opening screen's third promise became "traces what is left to a named client"; the book is 281 throughout.
- Verified: full click audit on all eight views (31 disclosures, 86 controls, zero JS errors), reachability clean, no horizontal overflow, all 11 walkthrough steps, and click-through from an event to a client held below the cap — the case most likely to break.

Full round changelog: on the device at `v6/CHANGELOG.md`.

### v8 (device `v7/`) — the cross-border capability and specialist orchestrator
Improvement Guide **item 17**, photographed as `image/IMG_5297.HEIC` (page 10 of 10). Its finding was right: up to v6 every opportunity routed to exactly one named specialist, which quietly asserted that one desk solves a client event, and left OCBC's actual cross-border network invisible. 4,480 lines.
- **A capability graph on every brief**, in a new section "Who to bring in, and where", placed after the discussion pathways. Renders item 17's chain exactly — **Market event → Client impact → Need → OCBC capability → Specialist team** — fanning out, because one event produces several needs on different desks. Each step carries why that desk, their role, what the RM does, and **a sequence number**, which is what makes it orchestration rather than a list (on the corridor case, step 2 reads *"Hold this one until Transaction Banking has a number. Pricing a hedge for a gap that turns out not to exist is how a client stops taking the call."*). Opens with **where the client actually sits** — countries they hold, spend, owe or have declared an interest in, each confirmed or inferred — and closes with automatic cross-border notes.
- **It says when there is nothing to orchestrate.** An orchestrator that always finds three teams is theatre. Single-market cases end with *"One market, one team, one administrative date. There is nothing to orchestrate, and RIN should not invent a reason to involve anyone else."* Across the thirteen: one spans three markets, two span two, the rest are single-market — the truthful distribution for a Singapore HNW book.
- **Three geography tiers, and the third earns the trust**: Can act / Partial / **Referral only — introduce, do not promise**. Michelle Ang is the demonstration: her AUD costs can be hedged from Singapore, but anything onshore in Australia is referral only and the brief says so. A capability map that only shows what the bank can do is marketing; one that shows where it stops is a tool.
- **"Specialist view" became "One Group"** — now answers three questions at book level: where the book sits (every market touched, with presence tier and client names, computed from the briefs so it cannot drift), who is wanted and for whom (every team with its clients and step, which is what stops three desks calling one client in a week), and what a desk receives.
- **The capability and geography register is labelled synthetic** in amber on every brief. Inventing OCBC's real licence position and presenting it as fact is exactly what someone in the room will know is wrong; saying which half is the mechanism and which is placeholder is stronger, and it names a concrete pilot dependency — somebody has to produce the real register.
- Verified: 31 disclosures, 87 controls, zero JS errors, all thirteen briefs render a chain, twelve-step walkthrough, reachability clean, cadence unchanged (5, 4, 5, 5, 5, 4).

Full round changelog: on the device at `v7/CHANGELOG.md`.

### v9 (device `v8/`) — progress per client, a chronological workspace, and a reason for Past week to exist
Four user-requested changes, two of which were design problems rather than edits. 4,754 lines.
- **A six-stage progress bar on every opportunity** — Detected → Checked → On your list → You read it → You acted → Outcome. Thin on each queue card, full at the top of each brief, plus a sentence saying where it stands ("Sent to Wealth advisory, and waiting on them"). Every stage is computed from state the prototype genuinely holds, including a new `S.opened` set for the brief actually being read. **The sixth stage is deliberately unreachable** and drawn as a dashed segment: the first five sit in RIN's own audit trail, an outcome needs a measurement window and a control group, and drawing a full line nobody has earned is the exact failure this project keeps arguing against.
- **"What to say" removed from the brief.** It had become the third copy of the same guidance — the per-pathway "still to confirm" and the per-step "You do" on the capability graph already carry the RM's next action, attached to the specific conversation it belongs to.
- **The workspace is now chronological, left to right: Past week → Yesterday → Today → No deadline** (Momentum and What moved renamed). The walkthrough follows the same order — it previously bounced between tabs 6 → 5 → 4; all four Today actions are now grouped in the middle and the tour moves strictly rightwards afterwards.
- **Past week rebuilt around what Today cannot show.** The complaint that it was a duplicate was fair — it was a second list of the same thirteen clients with the same scores. Now four answer-shaped sections, each with a count: **Building underneath** (evidence accumulating, not yet on your list, with *when it comes back on the current cadence* — turning "not today" into "3 Sep"); **You have walked past these** (returned twice or more and never opened — empty on day 0, nine names by day 5); **Fading on their own** (explicit permission to stop chasing); **Ended without you**. The driver roll-up and the full book sit below as reference, and the rows use a compact renderer rather than repeating what the brief already says.
- Verified: 31 disclosures, 87 controls, zero JS errors, twelve walkthrough steps in strict tab order, section counts tracked across all six simulated days to confirm they populate rather than sit empty, lifecycle stage checked against real actions, cadence unchanged (5, 4, 5, 5, 5, 4).

Full round changelog: on the device at `v8/CHANGELOG.md`.

### v10 (device `v9/`) — the progress bar, moved up and extended end to end
Two user-requested changes to the lifecycle bar added in the previous round. 4,942 lines.
- **The bar opens the brief**, above the client's name, so the first thing read is where this one has got to rather than why it exists.
- **Six stages became nine, in five bands that show who is holding it**: RIN (detected · checked · on your list) → You (read · acted) → The specialist (they took it · back with you) → Yours (closed) → Not yet (outcome). **"Sent" and "accepted" are deliberately separate** — a routed brief sits in an amber dashed "waiting" state until the desk accepts, with the line *"this is where a referral usually goes quiet"*. That gap is improvement-guide item 9's whole complaint, now visible instead of hidden behind one green tick.
- **The specialist leg is driven by real actions**, because a bar drawing unreachable stages is worse than one that stops early. On One Group each received brief gains **Accept ownership** and **Return to the RM** (a modal requiring one of three assessments, which travels back and shows on the brief). On the brief a red **Close the loop** action then asks what the client actually decided, and is explicit that this is not an outcome but the answer an outcome would later be measured against. Full path verified: route → accept → return → close, stage count 4 → 5 → 6 → 7 → 8.
- **It adapts when no specialist is needed.** Lim Sze Wei's lapsing mandate is the RM's own job throughout; the two specialist stages render as skipped, the band reads "Not needed", and the count reads 3 of 7 rather than 3 of 9 — so it never implies the RM failed to do something never required. Whether a specialist is needed is read from the capability chain, so the two views cannot disagree.
- The ninth stage still never fills, and `pilotStats` now carries `taken` and `closed` so the specialist-progression metric can measure acceptance at the other end, which is what it always claimed to measure.
- Verified: 31 disclosures, 87 controls, zero JS errors, the full round trip driven through the real controls, the no-specialist case checked separately, twelve walkthrough steps in tab order, cadence unchanged (5, 4, 5, 5, 5, 4).

Full round changelog: on the device at `v9/CHANGELOG.md`.

### v11 (device `v10/`) — fewer words, same information
Three user-requested changes, all about presentation rather than function: reduce words on the other tabs without losing information, remodel Today as segments that open for more, and remove repeats. 4,972 lines. **Nothing was deleted** — everything folds behind a summary line carrying its own headline.
- **Measured, visible words with nothing expanded: 6,049 → 3,511 (−42%).** A brief went 1,292 → 477, Past week 1,835 → 809, One Group 818 → 375, Pilot 680 → 550, Trust 888 → 764. Repeated sentences 5 → 0 material; repeated six-word phrases 47 → 8.
- **Two sections that said the same thing became one.** Found by measuring, not by eye: "Potential discussion pathways" (250 words) and "Who to bring in, and where" (291) were 42% of the brief between them and overlapped badly — the same why, the team named twice, two copies of "still to confirm", the event headline printed in both. They are now **"What you could do, and who holds it"**, open by default, with the ORCH capability chain as the spine (it carries sequence, capability, geography) and the pathway's compliance framing attached to the step whose team it names via a new `routeFor(o, team)`. Each row: step number, what is needed, who holds it, whether specialist review is required, why, and **You do** — with "what it rests on, and what still has to run" folded underneath.
- **Today is segmented.** New `segHTML(title, aside, summary, body, open)` renders a `<details class="seg">` whose closed summary carries the headline. Always visible: progress bar, client, stat strip, "Why them, why now", and the merged actions section. Folded with summaries such as `SGD 8.4m relevant · Band B · retention high`, `Rates · reached them by rate repricing, confirmed`, `3 confirmed in a record · 1 is a guess · 1 thing still unknown`, `4 of 4 passed · Eligibility · Suitability · Permission · Conduct`, `High conviction · net +5 · 7 of 7 days flagged`, `88/100 · Strong and precise`. The fold costs nothing because the answer is on the closed line; opening gives the working.
- **The other tabs fold the same way** — the Past-week full-book table, One Group's per-team and per-market client lists, the holdback "Found / RIN did" (keeping "Why not a call" visible), the pilot's "what must not be counted" list, and the progress bar's nine-stage explanation.
- Verified: `node --check` clean, 42 disclosures, 88 controls, **zero JS errors, zero defects**, all 13 briefs rendering action rows and seven segments, reachability across every view with disclosures open and walkthrough on and off, no horizontal overflow, twelve walkthrough steps in order, cadence unchanged (5, 4, 5, 5, 5, 4) — presentation only, the engine untouched.

Full round changelog: on the device at `v10/CHANGELOG.md`.

### v12 (device `v11/`) — one click deep, five different stories, every figure traced
Four user-requested changes. 5,116 lines.
- **Today stays the landing screen**, with the reasoning recorded: Past week is a review screen, and making it the front door turns a daily tool into a daily reprimand. The left-to-right sequence is made real instead by a **carry-in line** at the top of Today — `4 building underneath, not yet on your list · 5 overnight events reached your book`, each a link to the tab that owns it. A new `weekSets()` is the single source for those counts and for the Past week sections, so the two screens cannot disagree. Flipping the landing is one string if the user changes their mind.
- **No plus inside a plus.** Every nested disclosure resolved: the raw rule, the how-to-read-these-figures note and the week's signal list inlined into their parents; the per-row "what it rests on" fold promoted out of every action row into **one sibling segment, "What each step rests on"**; and the twelve per-card folds on Past week deleted because the brief now prints the same thing inline. New permanent test `nestguard.js` walks every view, all 13 briefs and the post-routing states — **30 snapshots, 0 nested**.
- **The top five now demonstrate five different things.** Measured first: 3 of 5 shared the same world path, 4 of 5 needed exactly one specialist in one market, and all 13 passed 4 of 4 gates cleanly. Now Priya (rate, confirmed — the clean case), Tan Hock Seng (corridor, inferred — 4 steps, 3 markets, cross-border), Tan Wei Ling (sector, confirmed — declined before, volatile), Serena Ng (direct holding, confirmed — the public date only the bank can match to a private holding; moved to Private Banking and eligible from day 0), Lim Sze Wei (no external event, no specialist). Two new mechanics support it: **a gate that passes with a limit** (Serena's suitability allows only the concentration-reducing direction; lending against the position and same-name structured products are ruled out before the RM sees it, and the summary reads *3 of 4 passed clean · 1 with a limit*), and **`dailyCut()`**, which takes four on rank plus any **control item** inside a week of its date — Lim's mandate lapse was the most time-critical item on the book and ranked seventh on signal. Her card carries "On the list by rule, not by rank".
- **A full consistency audit, mutation-tested.** `consist.js` checks the data model against itself (deadline field vs every spelled-out date, gate set, one client one segment, one client one ref, and *no invented figures* — every stake-register and value-table amount must appear in the client's own facts/evidence/event, with those two surfaces excluded so they cannot vouch for themselves). `consist2.js` checks the rendered surfaces (cards vs `liveDaily()`, every countdown vs the real distance from the simulated date, brief score and momentum status vs the model, Past-week rows, the countdown across all six days, tab badges vs list lengths).
  - **The biggest find: the supporting evidence under an action step could belong to a different conversation.** The capability chain and the compliance routes were authored separately and never lined up, and v10's merge exposed it — the old `routeFor` fell back to "any route with matching owner polarity, else the first", so a step could show another step's *Rests on / To confirm / Not yet done*. Fixed with `routesFor(o)` (exact team match, one route per step, no wrong-answer fallback) **and** by aligning the data: 7 route owners renamed to chain team strings, 4 missing routes written, 2 missing chain steps added (Tan Hock Seng's own "confirm the lane first", Arun Menon's letter of wishes), 1 stale route removed from Lim Sze Wei. `routeAudit()` ships in the file and asserts every step pairs with exactly one route.
  - Three figures on screen had no source in the client's record (Tan Wei Ling SGD 3.2m, Chandra Devi Nair SGD 3.9m, Harold Yip SGD 7.4m) — each now traces to an evidence line.
- Verified: 0 contradictions, route audit clean, 0 nested disclosures, click audit 0 defects / 0 JS errors, nothing permanently hidden, no horizontal overflow, all 13 briefs render, full round trip, 12 walkthrough steps, cadence 5,5,5,5,5,4. Visible words 3,615 (a brief 474).

**This is the current base.** The next round of prototype changes goes into `v12/` (device). See the note in §3: the device folder number and "how many rounds have happened" can drift by one because of the v1-relabeling quirk above. When in doubt, trust the device folder listing over any number written in prose here.

---

## 5. Other project docs

- `claude/RIN_proposal_concise.md` — the concise, persuasive written proposal (also delivered as `.docx`).
- `claude/RIN_prototype_plan.md` — an early brainstorm for building the prototype with a **real tech stack** (FastAPI/React, live Claude API call for the Reason step, etc.). **Superseded** by the team's later decision to build a single polished HTML file instead — kept for reference only, not a live plan.
- `claude/RIN_prototype_changelog.md` — my v1→v2 change log (device: `v1/RIN_prototype_changelog.md`).
- `v2/RIN_Demo_HNW_Changelog.md` (device only, not a project doc) — the changelog for the externally-built v3 round, described above.
- `RIN_Phase2_Submission.md` (549 lines, device only, in the Hackathon root) — the authoritative written Phase 2 submission. Ground truth for anything the prototype claims about the mechanism.
- **`image/IMG_5243–5252.HEIC` (device only) — the RIN Prototype Improvement Guide.** Eight phone photos of a Word document titled *"RIN | Prototype Improvement Guide"* (footer: *Internal working document · Synthetic prototype review*), covering **items 7 to 14** on pages 5–7, plus the start of a "Recommended build sequence." Items 1–6 are on earlier pages and have **not** been photographed. Each item has a *Critical finding*, a *Recommended change* bullet list, and a ready-to-paste **COPY INTO CLAUDE** instruction block. This is almost certainly the document that drove the externally-built v3 round — its build-sequence phase 1 ("commit to HNW, rewrite the five synthetic use cases") and phase 2 ("Opportunity Command Centre and weekly conviction tracker") match what that round actually shipped. **Treat this guide as the prototype roadmap.** The eight items:
  - **7. Compact HNW client context strip** — decision-relevant relationship context on each brief, every field tagged Known within OCBC / Client-declared / Inferred / Unknown, with data-freshness and stale-profile warnings. *Not done.*
  - **8. Reframe product suggestions as discussion pathways** — *done in v5 (device `v4/`).*
  - **9. Complete the RM and specialist workflow** — expand RM actions (Prepare Call Brief, Add to Weekly Plan, Request Specialist Review, Schedule Follow-up, Record Client Contact/Response, Correct Client Data, Mark Already in Discussion) and the specialist side (Accept Ownership, Request Clarification, Reject with Reason, Add Assessment, Schedule Joint Engagement, Return to RM and Close), with one accountable RM, handoff status and a single contact plan. *Not done — the largest of the eight.*
  - **10. End-to-end outcome tracking** — an Outcomes tab with a full lifecycle state per opportunity (Detected → … → Won/Lost/Deferred/Expired/Invalid), timestamps/owners/reasons, synthetic AUM recorded only after the fact, and three separated feedback streams (Ground-Truth / RM Preference / Outcome) so RM preference never silently teaches the system a valid opportunity was wrong. *Not done — the second-largest, and the one that actually demonstrates the Learn step.*
  - **11. Refine the governance architecture** — four control stages (Source Access Control → Client-Event Relevance → Opportunity-Level Governance → Product/Advice Controls) with Pass / Manual Review Required / Stop replacing absolute labels like "Suitability Passed." *Not done.*
  - **12. Show uncertainty and controlled failure** — *done in v6 (device `v5/`).*
  - **13. Visual hierarchy and presentation usability** — *done in v5 (device `v4/`).*
  - **15, 16** — never seen. Between item 14 (page 7) and item 17 (page 10), so they exist.
  - **17. Cross-Border Capability & Specialist Orchestrator** — *done in v8 (device `v7/`).* Photographed as `image/IMG_5297.HEIC`, page 10 of 10.
  - **14. Make the demo internally consistent** — one global "As at [date], 9:00 AM SGT" timestamp that every relative date computes from; an adjustable RM capacity control replacing the hard cap of five; urgent or expiring items allowed to bypass the cap; a weekly backlog so eligible items are not silently delayed. *Partly done — the visible symptom (a Saturday start date) was fixed in v4 (device `v3/`); the structural half is open.*
- `spec/D1–D4_*.md` (device only) — separate impact-spec documents (Idea Significance, Business Impact, Feasibility, Transformative Potential). Not yet reviewed in this session; likely feeds the pitch deck rather than the prototype.
- This file, `claude/RIN_context.md` — orientation for a new session.

---

## 6. How the prototype gets verified

No manual eyeballing — every round of edits is checked with headless Chromium (Playwright, pre-installed at `/opt/pw-browsers/chromium`) driving the actual file and taking full-page screenshots, which are then visually reviewed. A `verify.js`-style script in the working folder typically runs through: run screen → skip to queue → open a client → expand every disclosure → route it → dismiss one with a reason → advance through the simulated days (logging exactly who appears each day) → the secondary tabs. A separate script traces the guided walkthrough step by step to confirm each step advances on the correct real action. Console/page errors are captured; the only expected one in this sandbox is a font-CDN network failure (no internet access here), which is harmless and would not occur for the user. The externally-built v3 round also used `node --check` on the extracted `<script>` block and a tag-balance check — worth reusing those two as a cheap first pass before spending a Playwright round trip.

---

## 7. Open items / not yet done

- **Items 7, 9, 10, 11 and the structural half of 14 from the Improvement Guide (§5) are the prototype backlog.** Item 7 (client context strip) is the cheapest remaining; 9 and 10 together are the big structural round and should have one to themselves; 11 (governance stages) is moderate.
- **Pages 1–4 (items 1–6) and pages 8–9 (items 15–16) of the Improvement Guide have never been seen.** Item 17 was page 10 of 10, so the guide is now complete at the back and unread at the front and middle. Worth asking the user for photos before planning a large round.
- The 4-page pitch deck (mentioned early on, alongside "build a prototype") has not been started.
- `RIN_prototype_plan.md`'s tech-stack recommendation (FastAPI/React) is stale against the actual single-HTML-file decision; low priority to fix since nobody is using it as a live plan.
- No slide narrative has yet been aligned to the demo's actual click-path.
- Carried over from the v3-round changelog, still unresolved: (a) whether the driver/correlation roll-up should auto-discount scores instead of just flagging concentration; (b) whether a dismissal should register as −1 somewhere in the pilot metrics. (Item (c), the `DEMO_START` weekend anchor, was fixed in the v4/`v3/`-device round above.)
- The `spec/D1–D4_*.md` docs haven't been reviewed against the current prototype for consistency — worth a pass before any pitch/judging deadline.

---

## Keeping this file current

**This file must be refreshed every time a new version folder is created (§3).** After delivering a new `RIN_Demo.html` to the user and committing its version folder to the device:
1. Update §4 with a new entry for that round (what changed, in the same style as the entries above — enough for someone who wasn't in the session to understand it without reading the full changelog).
2. Update the "This is the current base" pointer at the end of §4.
3. Move anything resolved out of §7, and add anything newly discovered.
4. Re-save this file to the project with `project_write` to `claude/RIN_context.md`, replacing the previous version in place — and also drop a copy into the new version folder on the device alongside that round's changelog, so the device folder is self-contained too.

Because at least one round already happened outside this session, don't assume this file is exhaustive going in — check the device's version folder listing first, and reconcile before starting new work if something doesn't match.
