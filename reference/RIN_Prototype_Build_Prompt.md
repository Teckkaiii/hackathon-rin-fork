# Build prompt — RIN prototype

## PROMPT BEGINS

Build a single-file interactive HTML prototype demonstrating the **Revenue Intelligence
Network (RIN)** — an AI-assisted daily decision layer for Relationship Managers on OCBC's
Premier and Private Banking high-net-worth desk.

RIN ingests overnight external market events, resolves them against client exposures,
applies deterministic compliance gates, and surfaces a ranked, explained shortlist of
client engagement opportunities for human-led conversations. It coordinates RM judgement;
it does not replace it.

The prototype is a demo artefact, not production code: one self-contained HTML file,
synthetic data, no build step, no external dependencies, no network calls at runtime.

---

## The five modules

Build in this order. Each must render and work before the next begins.

### 1. Opportunity Matching — the core

The daily ranked queue. Overnight signals resolved against client exposures, producing a
short list of clients worth a conversation today.

Two distinct narrowing layers, and the prototype must make their difference visible:

- **Hard gates** — product eligibility, suitability against risk profile and mandate,
  cross-entity permission across the One Group perimeter (banking, Bank of Singapore,
  Great Eastern, Lion Global), and the MNPI and banking-secrecy firewall. These run
  deterministically and produce a binary result *before anything is scored*. A blocked
  item does not appear in the queue at any rank.
- **Soft filters** — RM-adjustable narrowing over what survives the gates: segment,
  product family, relationship tier, minimum amount at stake, signal recency.

Render these as different kinds of control. Gates are a status list showing pass or block
with the blocking rule named — not toggles, not sliders, not weights. Soft filters are
adjustable inputs that visibly re-narrow the surviving set. An RM must be able to see that
loosening a filter widens the list while no filter setting can surface a gated item.

Each queued opportunity answers three questions explicitly: **why this client, why now,
why this instrument** — with the specific external signal and the specific client exposure
named.

The product shelf is the bank's approved One Group shelf only. No external databases, no
third-party sources, no scraped profiles.

**Park and shortlist:** the RM can park an opportunity without dismissing it. Parking is
itself recorded as a signal — it feeds the re-surfacing cadence, so a parked item returns
on a governed interval rather than either vanishing or reappearing daily.

### 2. Client Position Analyzer

One reviewable page per Premier or Private client. No upload — the input is the client's
existing position, assembled from bank systems: holdings, maturities, cash balances,
mandate, risk profile, KYC state.

The readout covers: exposure concentration, idle-cash duration, maturity ladder, portfolio
income against the client's stated cash-flow objective, mandate drift, and documentation
currency (suitability review age, KYC expiry).

Two requirements carry the module:

- **Binding constraint first.** Order the page so the dimension most limiting this
  relationship today appears at the top. An RM opening a client page sees what is
  actually in the way, not a balanced dashboard of six equal panels.
- **Evidence trace on every line.** Each figure and each flag is traceable to the source
  record that produced it. Make the trace visible in the UI, not implied.

### 3. Conversation Coach

The RM drafts a client email, WhatsApp message or meeting note in a text area. The coach
reviews it before it goes, reporting each check as pass / flag / fail against a named rule:

- every factual claim traces to a record in the client position or the underlying market
  signal
- the message states the client's actual circumstance rather than a product feature
- nothing constitutes advice where the RM is licensed only to inform
- required disclosure is present
- register matches the relationship tier

Include internal-consistency checking: a figure in the body that contradicts a figure in
an attached summary or the client position record must be caught and shown.

Offer suggested rewrites the RM can accept, edit or reject. The RM's edit is always the
final text.

### 4. Client Outreach

Draft generation per client, grounded in that client's position and the specific signal
that surfaced them. The RM selects an approach:

- **Notify** — a contractual date is approaching
- **Contextualise** — a market event affects a held position
- **Review** — income has drifted from the stated objective

Nothing sends without explicit RM approval. Drafts are written into the bank's approved,
archived communication channel — never a personal mail client — and the archival capture
is shown as part of the send flow.

Every send, non-send, reply and outcome writes to an outcome ledger visible in the
prototype.

### 5. Desk View

The team-lead surface. Queue coverage across the desk, which surfaced opportunities went
unactioned and the recorded reason, refusal-case volume grouped by refusal reason,
correlated-conviction clusters spanning multiple RMs, and documentation currency across
the book.

---

## Hard constraints

A build that violates any of these fails.

1. **No composite client score.** Do not produce a single number rating a client — no
   350–850 scale, no grade out of ten, no credit-score-shaped artefact. Report each
   dimension separately. Eligibility, suitability, need, permission and readiness are
   distinct decisions with distinct owners; a composite collapses them and makes the
   compliance gate look like a weighted component of a ranking rather than a hard
   predicate upstream of it.

2. **No propensity or acceptance-likelihood scores.** Do not display a predicted
   probability that a client will accept a product. It inverts the required order — need
   is established before product — and functions as a pressure instrument ahead of a
   suitability conversation.

3. **No RM performance scoring.** Desk View shows coverage, refusals and concentration.
   It does not rank or predict individual RM performance, and nothing anywhere scores an
   RM's delivery, tone or pacing.

4. **Gates precede scoring, always.** No scoring path may reach a gated item. If the code
   would be simpler with gating as a post-filter, write the harder version.

5. **Counts derive from one source at render time.** Do not hardcode population counts,
   shelf sizes or signal totals in more than one place. Two screens disagreeing about the
   same number is the first thing a reviewer finds.

6. **No invented figures.** Benefit, revenue and adoption numbers stay TBD with a named
   evidence owner. Use "amount at stake" rather than estimated revenue anywhere a
   commercial magnitude is shown.

7. **Approved channel only.** No path in the prototype sends outside an archived channel.

---

## Required demonstration scenes

The prototype must walk a reviewer through each of these:

- **A refusal.** An opportunity that would rank well but is blocked by a gate, withheld
  from the queue, and logged with its reason. Give this the same production quality as a
  surfaced opportunity — it is a credibility scene, not an edge case.
- **Gates vs filters.** Loosening every soft filter widens the list; no filter setting
  surfaces the gated item from the scene above.
- **A caught inconsistency.** The Conversation Coach catching a figure in an RM draft
  that contradicts the client position record.
- **A parked opportunity re-surfacing** on a governed interval, with the cadence rule
  that produced the interval shown.
- **A correlated-conviction cluster.** Several opportunities resting on the same
  macroeconomic driver, surfaced as one concentrated cluster rather than independent
  conviction — visible in both the RM queue and Desk View.
- **An expired document blocking action.** A client whose suitability review has lapsed,
  where the Position Analyzer surfaces this as the binding constraint above any commercial
  opportunity.

---

## Synthetic client scenarios

Five HNW clients minimum, extended as the demonstration scenes require:

1. Fixed-deposit maturity ahead of an expected rate decline
2. Concentrated single-stock portfolio affected by sector news
3. Bond maturity requiring reinvestment
4. Sustained idle cash following a liquidity inflow
5. Portfolio income fallen below the client's stated cash-flow objective

---

## Method

- Build in the stated sequence. After each module, verify with Playwright that it renders,
  its interactions work, and the earlier modules still work. Report what you verified
  before starting the next module.
- One coherent product, not five bolted-on tools: shared navigation, typography and
  component patterns throughout.
- Where you make a judgement call not covered above — a data shape, an interaction
  pattern, a labelling choice — implement your best option and flag it explicitly in your
  reply for review. Do not silently resolve ambiguity, and do not stop to ask unless the
  choice is genuinely blocking.
- Match length to what the task needs. No filler sections, no redundant summaries.

## PROMPT ENDS
