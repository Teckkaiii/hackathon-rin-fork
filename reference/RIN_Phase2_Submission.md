# OCBC Revenue Intelligence Network (RIN)
## Phase 2 Submission — 6-Minute Pitch + Appendix

*Answers every element of the Phase 2 template. Public facts are marked **[P]** and carry a source in the Evidence Register (Appendix C.5). Internal figures the team cannot yet verify are left as **TBD** with a named evidence owner rather than estimated.*

**Suggested 6-minute allocation:** Problem 1:30 · Solution 1:30 · Demo 2:00 · Benefits & challenges 1:00. Architecture stays in the appendix.

---

# 1. Problem Statement

## 1.1 The problem, in one sentence

> **OCBC already holds the client data and the market intelligence needed to see most client opportunities — but the work of connecting a moving market to a specific client's exposure is still done manually, one RM at a time, so high-value conversations happen late, or happen at a competitor first.**

The constraint is not data. It is the conversion of data into a timely, prioritised decision about who to engage today.

## 1.2 Background

### The business scenario and why it matters

An RM is accountable for anticipating client needs and giving proactive advice across a portfolio of hundreds of clients. Simultaneously, the environment moves every day: rates and currencies reprice, commodity prices shift, regulations change, industries are disrupted, clients expand into new markets, and corporate announcements create fresh financing, treasury, hedging and investment needs.

Each of those events is only meaningful once someone asks *which of my clients does this actually touch, and how?* Today that question is answered by human effort — reading, cross-referencing and recall — and only for as many clients as the day allows.

This matters now, specifically, because OCBC is scaling the exact input that is already saturated:

- OCBC is adding **600 relationship managers to its consumer banking wealth business over three years**, with each RM serving roughly **250–300 customers** **[P1]**.
- The Group is targeting a **doubling of consumer banking wealth income by 2029**, a target brought forward by a year **[P1, P2]**.
- The **Next Frontier** strategy places AI, digital and data at the centre of the next phase of growth — framed as redesigning customer-centric processes, not as a technology programme **[P2]**.
- Cross-divisional collaboration is already proven to produce revenue: in **September 2025 OCBC surpassed, ahead of schedule, its target of S$3 billion in incremental revenue above the 2023 growth trajectory** through One Group collaboration **[P3]**.
- The wealth franchise is now the growth engine: **1H26 wealth management income rose 27% to a record S$3.29 billion, 41% of total income**, up from 36% a year earlier, with banking wealth AUM at a record **S$350 billion** **[P4]**.

The strategic reading: **the binding constraint on One Group revenue is not product, distribution or client demand — it is RM attention, and the plan is to add 600 more units of a constrained resource without changing how that resource decides where to point.** RIN targets the allocation of attention.

### Pain points and opportunities, with evidence

| Pain point | Evidence |
|---|---|
| **Manual synthesis.** Connecting events to clients means reading market news, reviewing research, checking multiple systems, analysing exposures and relying on personal experience. | Described in the RIN business brief as current-state practice **[I1]**. |
| **Combinatorial impossibility.** A book of 250–300 clients against dozens of daily material events produces thousands of client–event pairs per day. No RM can evaluate that set daily; they sample it. | RM book size **[P1]**; event volume TBD — *evidence owner: Global Markets Research / Data Office*. |
| **Late discovery.** Clients are contacted after conditions have already hit their business, after the financing need has crystallised, or after a competitor has called. | RIN business brief **[I1]**. Baseline event-to-contact latency TBD — *evidence owner: CRM Data Owner*. |
| **Uneven coverage.** Because attention is sampled, coverage quality tracks RM tenure, memory and personal comfort with a client rather than client value or need. | Directionally supported by the fact that OCBC's own GenAI coaching programme produced **double the weekly client appointments** and a **50% revenue uplift** within three months for participating advisors versus peers **[P5]** — i.e. RM behaviour, not client demand, was the limiting variable. |
| **Fragmented client view.** A client's footprint may span banking, Bank of Singapore, Great Eastern and Lion Global Investors. The relevant signal often sits outside the RM's own division. | Group structure spans banking, wealth, insurance and asset management across ASEAN and Greater China; GEH alone serves over 16 million customers **[P3]**. Actual RM-level visibility TBD — *evidence owner: Data Governance / Divisional COOs*. |
| **Ramp-up drag.** New RMs lack the accumulated pattern recognition that makes manual scanning work at all — a direct risk to the 600-RM expansion. | RM expansion **[P1]**; time-to-productivity baseline TBD — *evidence owner: HR / Segment Head*. |

The opportunity is the mirror image: replace *"review hundreds of clients and thousands of data points"* with a direct answer to a more useful question — **which clients should I engage today, why do they matter, what opportunity exists, and who should I involve?**

### How the problem is addressed today

RIN must not strawman the status quo. The bank is not blind; it is uncoordinated at the point of decision. What exists today:

1. **RM personal routine** — morning reading, personal watchlists, individual recall of who is exposed to what. Effective, but unscaled, unlogged and unevenly distributed.
2. **Research and house views** — market commentary and thematic notes published to the frontline. These are event-side intelligence with no client-side resolution: they say what happened, not who it happens *to*.
3. **Campaign and product-push lists** — segment-driven, product-first, and periodic. They start from the product and look for customers, which is the inverse of the RM's actual question, and they are not triggered by external events.
4. **CRM task lists and review cycles** — periodic portfolio reviews on a calendar cadence, not an event cadence. A review scheduled for next quarter cannot respond to a currency move this week.
5. **Specialist desks** — Global Markets, wealth advisory, treasury and corporate finance publish ideas and respond to RM requests. This works well *once the RM has already identified the client*; it does not solve identification.
6. **Informal referral between divisions** — depends on personal networks, and is exactly the channel most exposed to inconsistent permission handling.

> **The gap is narrow and specific: every layer above is strong at its own job, and none of them ranks a specific client–event pair and hands it to a named human with a reason. RIN is a coordination and prioritisation layer over capability that already exists — not a replacement for any of it.**

### Who is impacted

- **Relationship Managers** — carry the cost directly: hours of low-yield scanning, and the professional risk of being second to a client conversation.
- **Clients** — receive advice after the event rather than before it, and experience OCBC as several product providers rather than one financial group.
- **Product and specialist desks** — capacity is under-consumed because it is only invoked when an RM already knows what to ask for.
- **Team leads and segment heads** — manage activity volume without a view of coverage quality; cannot see which parts of a book are going dark.
- **The Group** — revenue leakage that never appears in any report, because a conversation that never happened leaves no trace.
- **Risk and Compliance** — informal cross-divisional information sharing is the residual risk of a system where the formal path is slow.

---

# 2. Solution

## 2.1 What it does

### Summary

**RIN is a daily decision layer for Relationship Managers.** It continuously reads external developments alongside permissioned client relationship data, identifies which specific clients are plausibly affected, accumulates evidence over time into an **Opportunity Momentum Score** that separates persistent signal from short-term noise, applies eligibility and permission gates, and presents each RM with a short, ranked, explained list of the clients worth engaging today.

For every surfaced opportunity, RIN states: **which client needs attention · what event triggered it · why this client is affected · what to discuss · which products or advisory routes are relevant · which specialist should be involved.**

Two design commitments define it:

> **RIN prepares and routes; the accountable human decides.** It produces an internally-facing prompt to an RM, never client-facing advice, never an automated contact, never an execution.

> **The Momentum Score ranks; it does not adjudicate.** It answers only *"how strong and how persistent is the evidence that this client is affected?"* Eligibility, suitability and disclosure permission are separate deterministic gates that run **before** ranking, never folded into the score.

### Target users

| Tier | User | What they get |
|---|---|---|
| Primary | RMs (consumer/premier wealth, business and commercial banking) | A ranked daily engagement list with a one-screen briefing per client |
| Secondary | Product & specialist desks (Global Markets, wealth advisory, treasury, insurance, corporate finance) | Structured inbound briefs with client context already attached |
| Secondary | Team leads / segment heads | Coverage quality view: which parts of the book are engaged, which are going dark |
| Tertiary | Research & CIO office | Feedback on which house views actually convert to client conversations |

### Business outcomes and value

1. **Revenue and relationship depth (primary).** More qualified conversations per RM, earlier in the event cycle, with the right specialist attached — driving share of wallet within the existing book.
2. **Client experience.** Advice arrives before the impact rather than after it, and reflects the client's whole footprint rather than one product silo.
3. **Operational efficiency.** RM hours move from searching to advising. This is capacity reallocation, not headcount reduction.
4. **Risk posture.** Every surfaced opportunity carries a logged evidence trace and a permission check, replacing an informal, unlogged channel with a governed one.
5. **Cost (last, and deliberately small).** RIN is a revenue and relationship programme. Presenting it as cost reduction would misrepresent it and invite the wrong scorecard.

## 2.2 How it works

### In one sentence

> **RIN converts a continuous stream of external events into a small number of permission-cleared, explained, ranked client conversations — by resolving each event against the specific exposures of specific clients, accumulating that evidence over time, and routing the survivors to a named human with the reason attached.**

### What data is used

**Event side (external):**
- Market data: FX, rates, credit spreads, commodities, equity indices
- Corporate disclosures and filings: results, guidance, M&A, capital raising, expansion announcements
- Regulatory and policy changes by jurisdiction and sector
- Industry and macro news; internal research and CIO house views

**Client side (internal, permission-scoped):**
- Exposure and holdings: facilities, currency exposures, deposit and FX flow patterns, portfolio positions
- Structural attributes: industry, geographic footprint, counterparty markets, entity structure
- Relationship state: risk appetite, suitability and knowledge profile, product holdings, mandate type
- Interaction history: prior conversations, dispositions, declared preferences and declines
- Lifecycle events: maturities, rollovers, renewals, vesting and liquidity dates

**Reference and control data:** product eligibility rules, suitability matrices, jurisdictional distribution rules, consent registry, entity-level data-sharing permissions.

**Feedback data (created by RIN, and a deliverable in its own right):** RM disposition on every surfaced opportunity — acted / deferred / dismissed, with a reason code — and downstream outcome.

**Explicitly excluded from the signal universe:** material non-public information, Global Markets and investment banking deal pipeline, restricted-list names, and any Chinese-wall-restricted content. This is exclusion at ingestion, not filtering at output — an opportunity that could only have been derived from MNPI must never be capable of being formed.

### How AI uses the data

Four bounded jobs, each with an explicit ceiling:

**1. Event interpretation (LLM).** Read unstructured news, filings and research; extract a structured event record — what happened, which sectors, currencies, geographies, tenors and instruments are implicated, with what directional effect and confidence. *Does not:* decide who to contact.

**2. Exposure resolution (deterministic).** Join the event's attributes against client attributes with transparent rules. If the event implicates SGD/JPY and a client has yen payables, that link is a rule, not an inference — inspectable and challengeable. *Does not:* use an opaque embedding match as the primary link.

**3. Momentum accumulation (analytical).** Aggregate repeated and corroborating signals for the same client–theme pair over time, with decay, so a one-day market wobble fades and a three-week structural shift compounds. The score is published to the user **decomposed** into its components — signal strength, exposure specificity, corroboration count, persistence, relationship context — so no RM ever sees a bare number. *Does not:* determine eligibility or suitability.

**4. Briefing generation (LLM with retrieval).** Draft the RM-facing explanation, grounded strictly in the retrieved event and client evidence, with every assertion traceable to a source record and confirmed facts visually distinguished from inferred ones. *Does not:* generate a recommendation to the client, a price, or a suitability conclusion.

**What AI never does in the MVP:** decide eligibility or suitability; move information across a confidentiality boundary; contact a client; place, price or execute anything; overrule a permission gate; or dismiss an opportunity without a logged reason.

### Where users interact with the solution

Inside the tools RMs already use, not in a new destination:

- **Daily queue** in the RM workspace / CRM — capped at a small number of items (target: five), sorted by momentum, with a one-line reason visible without opening anything.
- **Opportunity briefing** — one screen: the event, the exposure link, the score decomposition, confirmed-vs-inferred evidence, suggested discussion points, eligible product or advisory routes, and the specialist to involve.
- **Disposition capture** — three buttons (act / defer / dismiss) with a mandatory reason on dismiss. This is thirty seconds of RM effort and it is the mechanism by which the system stops being wrong twice.
- **Specialist inbox** — routed briefs arriving with client context pre-attached.
- **Team-lead coverage view** — book coverage and dark-zone reporting.
- **Mobile** — read and triage the queue; act on desktop.

### End-to-end workflow

```
  EXTERNAL EVENTS                    INTERNAL CLIENT DATA
  market · filings · policy          exposures · holdings · profile
  research · industry news           footprint · history · consent
         │                                      │
         ▼                                      ▼
  ┌─────────────────┐                 ┌──────────────────────┐
  │ 1. INTERPRET    │                 │ 2. RESOLVE           │
  │ structure the   │────────────────▶│ which clients hold   │
  │ event (LLM)     │                 │ the affected         │
  └─────────────────┘                 │ attribute (rules)    │
                                      └──────────┬───────────┘
                                                 ▼
                                      ┌──────────────────────┐
                                      │ 3. ACCUMULATE        │
                                      │ momentum over time;  │
                                      │ decay noise          │
                                      └──────────┬───────────┘
                                                 ▼
    ══════════════ DETERMINISTIC GATES (run BEFORE ranking) ══════════════
    ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  ┌─────────────┐
    │ ELIGIBILITY  │  │ SUITABILITY  │  │ PERMISSION   │  │ CONDUCT     │
    │ may this     │  │ within the   │  │ may this be  │  │ cooling-off │
    │ client hold  │  │ client's     │  │ shown to     │  │ frequency   │
    │ this product │  │ profile?     │  │ THIS RM?     │  │ do-not-     │
    │ in this      │  │              │  │ (entity /    │  │ contact     │
    │ jurisdiction?│  │              │  │ secrecy /    │  │             │
    │              │  │              │  │ consent)     │  │             │
    └──────┬───────┘  └──────┬───────┘  └──────┬───────┘  └──────┬──────┘
    ═══════╪═════════════════╪═════════════════╪═════════════════╪═══════
           └─────────────────┴────────┬────────┴─────────────────┘
                                      ▼
                          ┌──────────────────────┐
                          │ 4. RANK & CAP        │
                          │ top N per RM per day │
                          └──────────┬───────────┘
                                     ▼
                          ┌──────────────────────┐
                          │ 5. BRIEF (LLM+RAG)   │
                          │ grounded, cited,     │
                          │ confirmed vs inferred│
                          └──────────┬───────────┘
                                     ▼
                        ╔══════════════════════════╗
                        ║  6. HUMAN CHECKPOINT     ║
                        ║  RM decides: act /       ║
                        ║  defer / dismiss+reason  ║
                        ╚══════════┬═══════════════╝
                                   ▼
                          ┌──────────────────────┐
                          │ 7. ROUTE & ENGAGE    │
                          │ specialist involved; │
                          │ existing advisory &  │
                          │ execution process    │
                          │ (UNCHANGED)          │
                          └──────────┬───────────┘
                                     ▼
                          ┌──────────────────────┐
                          │ 8. LOG & LEARN       │
                          │ disposition +        │
                          │ outcome → tuning     │
                          └──────────────────────┘
```

Two properties of this flow carry the whole feasibility argument:

- **The gates sit before the ranking.** An ineligible or impermissible opportunity is never scored, never ranked and never shown. Interest never overrides permission.
- **Step 7 is unchanged.** RIN ends at the point where OCBC's existing, regulated advisory and execution process begins. It changes what an RM knows at 9am — not how the bank advises or transacts.

---

# 3. Demo / See It in Action

**Recommended format: a 90–120 second embedded screen-recording**, shown in full during the pitch. Judges consistently reward a working demonstration over an architecture walkthrough. Below is the storyboard and, as a fallback, the three screenshots that carry the same argument.

### Demo storyboard (90–120s)

| Time | Scene | The point it proves |
|---|---|---|
| 0:00–0:15 | RM opens the workspace. Yesterday's manual view: news feed, three system tabs, a 280-client list. | The problem is real and visual. |
| 0:15–0:30 | RIN panel: five opportunities, ranked, each with a one-line reason. | Hundreds of clients → five decisions. |
| 0:30–1:00 | Open opportunity #1. Show: the event; the exposure link ("client has THB payables and a facility maturing in 6 weeks"); momentum decomposed into its components with a 3-week trend, not a bare number; confirmed evidence in solid type, inferred in outline; suggested talking points; the specialist to involve. | Explained, inspectable, not a black box. |
| 1:00–1:15 | RM clicks *Involve specialist* → routed brief appears in the Global Markets desk view with client context attached. | Cross-divisional coordination is a click, and it is logged. |
| 1:15–1:30 | RM dismisses opportunity #3 with reason *"client hedged this last month."* Related signals for that client–theme pair suppress. | The human is in charge, and the system learns from being told no. |
| 1:30–2:00 | **The refusal case.** Show a high-momentum signal that is *not* surfaced, with the gate log visible: eligibility failed / permission not granted for this RM. | This is the scene that wins the compliance question. Do not cut it for time. |

### If using screenshots (2–3)

1. **The daily queue** — five ranked opportunities, reasons visible, the count of what was filtered out shown in the corner.
2. **The briefing screen** — the full explanation with score decomposition and the confirmed-vs-inferred distinction rendered visually.
3. **The gate log / refusal screen** — a suppressed opportunity with the reason it was withheld.

### Demo data

Use a **synthetic client population with known ground truth**, not live client data. State this on screen. It removes any confidentiality question from the demo itself and lets you show a deliberately mixed set: two true positives, one refusal, one correctly-decayed noise signal. Showing only successes reads as a sales reel; showing the refusal reads as engineering judgement.

---

# 4. Benefits and Challenges

## 4.1 Expected benefits

Every benefit below has a measurable proxy. Magnitudes are held as TBD with named owners — a defensible range beats an unsupported precise number, and this is a governance-literate audience. Full estimation table in **Appendix A**.

### Time savings
RM hours currently spent scanning news, research and multiple systems to identify who to call are replaced by reviewing a ranked list. Proxy: minutes per RM per day on opportunity identification, from a two-week diary study plus system telemetry. Baseline TBD — *evidence owner: Segment COO*. Mechanism confidence: **High**. Magnitude confidence: **Low until baselined.**

### Revenue improvement *(primary)*
Three distinct mechanisms, which must not be double-counted:
- **More qualified conversations** — the freed time converts to client contact rather than to slack.
- **Earlier contact** — engaging before the need crystallises rather than after, which is where win rates and pricing power live.
- **Better-attended conversations** — the right specialist involved, producing multi-product outcomes rather than single-product ones.

Measured as incremental products or revenue per eligible client, RIN cohort versus a matched BAU cohort on the same eligible population. Confidence: **Low at planning stage, by design** — this is precisely the number a holdout pilot exists to produce.

**Directional precedent, not a forecast:** OCBC's own GenAI coaching programme delivered **double the weekly client appointments** and a **50% revenue uplift within three months** for participating wealth advisors **[P5]**. That is evidence for an operating principle — AI that changes what a frontline human does with their time can move revenue at OCBC — and it should be cited as a principle, not borrowed as a projection for RIN.

### Quality improvements
- **Coverage evenness** — proportion of each book with a substantive, reasoned contact in a rolling 90 days; and the spread across deciles. Directly observable from day one.
- **Explanation quality** — every client conversation carries a documented rationale, replacing "the RM had a hunch."
- **Consistency across tenure** — a first-year RM and a fifteen-year RM see the same quality of opportunity. Material given 600 incoming RMs **[P1]**.

### Cost reduction
Deliberately ranked last and claimed small: reduced duplication of research effort across RMs, and lower cost-to-serve per qualified opportunity. **RIN should not be pitched as a cost programme.** Doing so invites a savings scorecard it will not win and misstates the value logic.

### Overall business transformation
Four operating-model shifts, each a real before/after:

| Before | After |
|---|---|
| Reactive — the RM responds once the client raises it | Proactive — the RM arrives with the context already assembled |
| Individual memory — coverage quality tracks who the RM is | Institutional memory — every signal, decision and reason accumulates as an asset |
| Periodic review cadence | Event cadence — the book is reviewed continuously, the RM is interrupted rarely |
| Product push — start with the product, find customers | Relationship orchestration — start with the client's changed circumstances, find the right response across the Group |

> **The transformation is not that AI finds opportunities. It is that the Group's information stops depending on which human happens to hold it, and starts moving to the accountable human under explicit permission — which is the operating change that makes One Group collaboration repeatable rather than relationship-dependent.** Cross-divisional collaboration has already produced over S$3 billion in incremental revenue **[P3]**; RIN industrialises the mechanism that produced it.

## 4.2 Path to value capture

### How it would be integrated

RIN sits **on top of** existing systems as a decision layer, deliberately shallow at the point of contact:
- **Read-only** from source systems via existing data platforms. RIN does not become a system of record.
- **Writes one object back** — a structured opportunity/task in the CRM. If RIN is switched off, nothing else breaks.
- **The existing advisory and execution path is untouched.** RIN stops at the human checkpoint.
- **Phased scope**: one segment, one region, one event class first. Breadth in phase one is the most likely cause of failure.

### Employee upskilling requirements

Light, because the interface is a briefing rather than a model. Measured in hours, not weeks.

- **RMs**: how to work a ranked queue; how to read the score decomposition and confirmed-vs-inferred markers; **how to disagree with the system** — the most important lesson, and the one that determines whether the feedback loop ever produces signal. Trained explicitly: RIN raising an opportunity is never a reason to contact a client the RM judges should not be contacted.
- **Specialists**: triaging inbound routed briefs.
- **Team leads**: coaching from coverage data rather than activity volume — a genuine management-behaviour change and the one most likely to be under-resourced.
- **Compliance**: reviewing the gate configuration as a control, not reviewing individual outputs.

### Workflow changes

1. A start-of-day routine replaces ad-hoc scanning.
2. **Disposition capture becomes mandatory.** Non-negotiable — it is the only source of the labelled data that makes any later learning possible.
3. Specialist referral becomes a structured route with context attached, replacing an informal one.
4. Team-lead reviews shift from activity volume to coverage quality.

### Adoption strategy and ownership model

**Sequence — each stage produces the evidence the next stage needs:**

| Stage | What happens | What it proves |
|---|---|---|
| 1. Synthetic proof | Known-ground-truth population; adversarial and refusal cases | The gates work before any client data is touched |
| 2. Shadow mode | Runs on live data; output visible to a small team; nothing surfaced to production RMs | Precision is acceptable; gates hold on real data |
| 3. Controlled pilot | One segment; volunteer team; matched holdout group | Behaviour changes and the value mechanism is real |
| 4. Measured expansion | Second segment or event class, only after the pilot reads out | Value is not an artefact of an enthusiastic pilot team |

**Ownership — five owners, no ambiguity:**

| Owns | Owner |
|---|---|
| Adoption and business outcomes | Segment / RM Head *(the business sponsor — not IT)* |
| The engine, models and data pipeline | Data & AI function |
| Permission and disclosure rules | Compliance, with Legal |
| Eligibility and suitability rules per product | Each product / specialist desk |
| The client decision | **The RM. Always.** |

> **The accountability rule, stated once and never diluted: the system prepares and routes; the accountable function decides.** RIN never becomes the reason a conversation happened. The RM is.

## 4.3 Challenges

### Data quality, availability, privacy and approvals

| Challenge | Response |
|---|---|
| **Entity resolution** across banking, Bank of Singapore, Great Eastern and Lion Global Investors is genuinely hard, and a mis-joined client is worse than no opportunity | Conservative matching; unresolved entities are excluded rather than guessed; match confidence is a visible field |
| **Exposure data freshness** — a stale position produces a confident, wrong briefing | Freshness stamp on every input; stale evidence downgrades the score and is shown to the RM |
| **Banking secrecy (Singapore Banking Act s.47)** — customer information is protected and internal availability is not authorisation to share | Permission gate as a first-class deterministic component, upstream of ranking. *Requires Legal validation — feasibility is not approval* |
| **Great Eastern is a separately listed legal entity** | No assumption of free data flow. Cross-entity use requires its own lawful basis and consent. Design assumes the restrictive case; scope phase one within the bank if needed |
| **Private banking confidentiality** — BoS client information cannot flow to a commercial-bank RM by default | Same gate. The permission check is per-RM, not per-client |
| **PDPA and consent** — a lawful basis is required for each processing purpose, and consent scope varies by product and jurisdiction | Consent registry as a gate input; no opportunity is formed without a valid basis |
| **MNPI and Chinese walls** — the most serious failure mode. A surfaced opportunity derived from deal pipeline or restricted-list information would be a significant breach | Excluded at ingestion, not filtered at output. Restricted-list and pipeline sources are never in the signal universe. Independently reviewed |

### Security and compliance

- **No client-facing advice.** RIN produces internal prompts to RMs. Advice remains within the licensed process — a boundary that must be stated in the pitch, not left for Q&A.
- **Full auditability.** Every surfaced *and* suppressed opportunity is logged with its evidence trace and gate results, so an examiner can reconstruct why any given client was or was not approached.
- **Prompt injection through ingested content.** RIN reads third-party news; adversarial text in a source could attempt to manipulate an event record. Mitigated by treating all ingested content as untrusted data, structural output validation, and adversarial testing as a standing evaluation category.
- **Model risk governance.** The LLM sits behind an approved gateway with logged inputs and outputs; deterministic gates are testable independently of the model, which is what makes the control environment reviewable.
- **Fairness of attention.** Ranking systematically allocates who gets called. If the score correlates with book size, it will quietly concentrate service on large clients. Monitored as a standing metric.

### Third-party dependencies

- **Market data and news licensing** — redistribution and derived-works terms must permit internal display of extracted content. A commercial and legal question, resolvable, but on the critical path.
- **LLM provider** — accessed through an approved gateway. **Deliberately replaceable: the model is not the moat.** The moat is the permissioned workflow, the accumulated disposition history and the activated franchise.
- **Cloud and hosting** — under MAS technology risk and outsourcing expectations.
- **Internal dependency risk** — RIN depends on the enterprise data platform being able to serve exposure data at daily freshness. This is the dependency most likely to slip and should be confirmed before committing a timeline.

### Resource and timeline constraints

- **The critical path is not the model.** Interpretation, matching and briefing are tractable with current techniques. The long poles are **permission mapping with Legal/Compliance** and **integration with source systems**. Any plan that budgets heavily for model work and lightly for those two is wrong.
- **Compliance capacity is a scheduling constraint**, not just an approval step. Engage at design, not at review.
- **A named business sponsor is a precondition, not a nice-to-have.** An unsponsored decision layer produces an ignored queue.
- **Honest sequencing**: synthetic proof and shadow mode can move quickly; a controlled pilot cannot start before the permission mapping is signed off. Timeline TBD — *evidence owner: Programme Sponsor with Legal/Compliance*.

---

# Appendix A — Benefit Estimation

## A.1 Estimation table

| # | Benefit | Metric / proxy | Assumptions and source | Confidence |
|---|---|---|---|---|
| 1 | RM time released | Minutes/day on opportunity identification, pre vs post | Baseline TBD (*Segment COO*, 2-week diary study + telemetry). Assumes scanning is currently a distinct, measurable activity | Mechanism **High**; magnitude **Low** |
| 2 | Qualified proactive conversations | Logged client contacts with a RIN reason code, per RM per month, vs matched BAU | Assumes freed time is reallocated to contact, not absorbed. Falsifier: time released, contact volume flat | **Medium** |
| 3 | Engagement latency | Median days from event timestamp to first client contact | Directly computable from event and CRM logs. No estimate needed — it is measured | **High** as a measurement |
| 4 | Revenue uplift | Incremental products / revenue per eligible client, RIN cohort vs matched holdout | Requires a genuine holdout. Assumes attribution is defensible only within the eligible population | **Low at planning; High post-pilot** |
| 5 | Specialist involvement | Routed briefs accepted / routed; multi-product outcomes per opportunity | Assumes specialist capacity exists to absorb inbound routing. Falsifier: acceptance rate collapses on capacity | **Medium** |
| 6 | Coverage evenness | % of book with substantive contact in rolling 90 days; decile spread | Directly observable. Assumes "substantive" is definable — must be defined before pilot | Measurement **High**; effect size **Low** |
| 7 | New-RM ramp | Time-to-first-qualified-opportunity, new joiners vs historic cohort | Historic baseline TBD (*HR / Segment Head*). Material given 600 incoming RMs **[P1]** | **Low–Medium** |
| 8 | Risk posture | % of opportunities with complete evidence trace and gate log; audit exceptions; reduction in unlogged informal referrals | Qualitative benefit tied to an observable proxy | **Medium** |
| 9 | Precision / trust | Dismissal rate and dismissal reason mix over time | Leading indicator of adoption. Rising dismissals = the product is failing regardless of other metrics | **High** as a measurement |

## A.2 Measurement design

**Planning Case** answers *"why invest?"* — drivers, ranges and named owners. **Measurement Case** answers *"did it work?"* — RIN versus BAU **on the same eligible population**, over the same window, with a matched holdout.

The eligible-population constraint is the point. Comparing RIN clients to all clients measures eligibility, not RIN.

## A.3 Anti-double-count rules

1. **Time OR the revenue from redeployed time — never both.** If the revenue case assumes freed hours became client conversations, the hours cannot also be booked as an efficiency saving.
2. **One opportunity, one owner.** A conversation that appears in both a RIN queue and a running campaign is attributed to the campaign unless the RIN reason code preceded the campaign contact.
3. **Fee and AUM contribution cannot both include the same money.**
4. **Cross-divisional revenue is counted once, at Group level**, regardless of how many divisions touched it.

## A.4 What must NOT be counted as business impact

- Revenue from clients who would have been contacted anyway — **the CFO's question is "what would have happened anyway?", and the holdout is the only honest answer.**
- Total value of all opportunities surfaced. Surfacing is not converting.
- Any uplift during a pilot's novelty period, unless it persists past the enthusiasm window.
- Efficiency claimed as headcount reduction. RIN reallocates capacity; the bank is *adding* 600 RMs **[P1]**, which is the opposite of a headcount-reduction story.
- Platform or network upside from future segments and use cases — real, but a separate column, never merged into the core case.

---

# Appendix B — Architecture & Tech Stack

## B.1 Layered architecture

```
┌────────────────────────────────────────────────────────────────┐
│ L1  INGESTION       market data · filings · news · research    │
│                     (MNPI / restricted sources excluded here)  │
├────────────────────────────────────────────────────────────────┤
│ L2  NORMALISATION   event extraction (LLM) · entity resolution │
│                     · taxonomy mapping · freshness stamping    │
├────────────────────────────────────────────────────────────────┤
│ L3  SIGNAL STORE    time-series of structured events + client  │
│                     attribute store (read-only from source)    │
├────────────────────────────────────────────────────────────────┤
│ L4  MATCHING        deterministic rules engine:                │
│                     event attributes ⋈ client exposures        │
├────────────────────────────────────────────────────────────────┤
│ L5  MOMENTUM        accumulation + decay; decomposed score     │
├────────────────────────────────────────────────────────────────┤
│ L6  GATES ★         eligibility · suitability · permission ·   │
│     (deterministic) consent · conduct — ALL upstream of rank   │
├────────────────────────────────────────────────────────────────┤
│ L7  RANK & CAP      top-N per RM per day; diversity constraint │
├────────────────────────────────────────────────────────────────┤
│ L8  BRIEFING        LLM + RAG over the retrieved evidence;     │
│                     grounded, cited, confirmed-vs-inferred     │
├────────────────────────────────────────────────────────────────┤
│ L9  DELIVERY        CRM / RM workspace · specialist inbox ·    │
│                     team-lead view · mobile                    │
├────────────────────────────────────────────────────────────────┤
│ L10 FEEDBACK        disposition + reason + outcome →           │
│                     suppression, tuning, and the label set     │
└────────────────────────────────────────────────────────────────┘
   ★ L6 is the compliance surface. It is deterministic and
     independently testable, so the control environment does not
     depend on model behaviour.
```

## B.2 Integrations and APIs

Market data and news vendors (licensed); internal research/CIO publication feed; core banking and position systems (read); CRM (read + write one opportunity object); product eligibility and suitability rule services; consent registry; identity and entitlements (RM-level permission); audit log sink.

## B.3 Tech stack

| Layer | Approach |
|---|---|
| Ingestion | Streaming/batch pipelines on the existing enterprise data platform |
| Event extraction | LLM with structured output schemas and validation |
| Retrieval | Vector index over research, news and filings for grounding only — never for the primary exposure match |
| Matching & momentum | Deterministic rules engine + analytical time-series scoring |
| Gates | Rules engine, versioned, independently unit-tested, owned by Compliance |
| Generation | LLM via approved gateway; RAG, grounded, cited; **no fine-tuning at MVP** |
| Evaluation | Automated harness: per-decision checks + adversarial suite (corrupt inputs, prompt injection, missing consent, eligibility bypass, stale data) |
| Delivery | API into existing CRM/RM workspace surfaces |

## B.4 AI approach, and why

**Deterministic-first.** Prefer transparent filters and rules wherever a rule will do; reserve the LLM for language tasks — reading unstructured text and writing explanations — which is what it is genuinely good at.

**Prompting and RAG at MVP. No fine-tuning, and explicitly no black-box propensity score.** The reason is not caution for its own sake: the target variable does not exist yet. There is no labelled history of *"opportunities that should have been surfaced."* Training a score against a proxy — past sales, say — would learn what RMs already do, which is precisely the behaviour being changed, and would dress that circularity in false precision.

RIN's first year therefore produces something OCBC does not currently have: **a labelled dataset of client–event pairs with expert human dispositions and reasons.** That dataset is the precondition for any future learned model — and it is a durable asset regardless of what model technology arrives next.

---

# Appendix C — Other Supporting Information

## C.1 What RIN is not

- **Not an alerting system.** Alerts push volume; RIN reduces volume to a ranked few and explains each one. If RM inbox load rises, RIN has failed.
- **Not a next-best-action product engine.** It starts from a change in the client's circumstances, not from a product needing distribution.
- **Not an automated advisor.** No client-facing output, no execution, no autonomous contact.
- **Not a replacement for RM judgement.** Every consequential step is human-approved. The system's job is to make sure the RM's judgement is applied to the right client on the right day.
- **Not a black box.** The score is decomposed and shown; the gates are deterministic and inspectable; every briefing is traceable to source records.

## C.2 Differentiation from adjacent OCBC initiatives *(anticipate this in Q&A)*

**vs. OCBC WoW** — WoW is customer-facing, delivering personalised wealth engagement directly to clients through avatar interaction **[P1, P6]**. RIN is RM-facing, allocating the attention of a scarce human resource across a book. They are complements, not substitutes: WoW scales engagement where the client initiates; RIN determines where the *human* should initiate. If asked which is more important, the honest answer is that they solve different halves of the same coverage problem.

**vs. existing propensity or next-best-action models** — if such a model is already deployed, RIN consumes it as one input signal among many rather than replacing it. Propensity models answer *"what might this client buy?"*; RIN answers *"what just changed for this client, and does that warrant a conversation today?"* The claim is coordination over existing capability, never displacement of it. **Confirm the current deployment state before the pitch** (see C.4).

## C.3 Anticipated judge questions

| Question | Answer |
|---|---|
| *Isn't this just alerts?* | Alerts fire on events. RIN fires on a client–event pair that survived accumulation, eligibility, suitability and permission — capped at five a day. Volume down, not up. |
| *Isn't the score a black box?* | It is decomposed and displayed, and it only ranks. Eligibility, suitability and permission are deterministic gates that run before it and are owned by Compliance. |
| *What about MNPI?* | Restricted-list and pipeline sources are excluded at ingestion. An opportunity derived from MNPI cannot be formed, not merely cannot be shown. |
| *Great Eastern is a separate entity — can you use that data?* | Not by assumption. The design assumes the restrictive case and treats cross-entity use as requiring its own lawful basis. Phase one can be scoped within the bank. |
| *Why hasn't this been done?* | It partly has, in pieces — research, campaigns, CRM, specialists all exist. What is missing is the layer that ranks a specific client–event pair and routes it to a named human under permission. |
| *What if RMs ignore it?* | The most likely failure mode, and the one the pilot exists to detect. Mitigated by precision over recall, a hard daily cap, and dismissal reasons feeding suppression. Rising dismissal rate is treated as a product failure signal, not user resistance. |
| *How do you know the revenue is incremental?* | Matched holdout on the same eligible population. Without that, the claim is not made. |

## C.4 Open items to resolve before submission

1. **Existing next-best-action / propensity deployment** — confirm what is live. Determines whether RIN is positioned as a consumer of an existing model (stronger, more credible) or as new ground (weaker).
2. **RM book size for the target segment** — the 250–300 figure is public and specific to consumer banking wealth **[P1]**. If the pitch targets business or commercial banking, that figure does not transfer; source the correct one or drop it.
3. **Baseline scanning time and event-to-contact latency** — the two numbers that make the time and latency benefits concrete rather than asserted.
4. **Cross-entity data-sharing position** — obtain the current Legal view before claiming any Great Eastern or Bank of Singapore signal in scope.
5. **Segment for phase one** — the source brief mixes wholesale language (financing, treasury, corporate announcements) with wealth language. Pick one for the pilot; the pitch can hold both as the direction of travel.
6. **Market data redistribution terms** — confirm that extracted content may be displayed internally in derived form.

## C.5 Evidence Register

| Ref | Publisher | Evidence | Caveat |
|---|---|---|---|
| **P1** | The Edge Singapore / Reuters / WealthBriefingAsia, 1–2 Jul 2026 | OCBC to onboard 600 additional RMs in consumer banking wealth over three years; each RM serves roughly 250–300 customers; supports doubling consumer banking wealth revenue by 2029 | Scoped to the **consumer banking wealth** business. Do not apply the book-size figure to other segments |
| **P2** | The Asian Banker, Aug 2026 | Next Frontier positions AI, digital and data at the centre of growth as a customer-process redesign, not a technology initiative; wealth income doubling target brought forward by one year | Reported commentary on management statements |
| **P3** | OCBC Annual Report 2025, "The Power of One Group" | Target of S$3 billion incremental revenue above the 2023 trajectory surpassed ahead of time in September 2025 through One Group collaboration; Group spans banking, wealth, insurance and asset management, ~400 branches/offices across 19 markets; Great Eastern serves 16m+ customers | Establishes that cross-divisional collaboration produces revenue — does **not** establish that RIN would produce any given amount |
| **P4** | OCBC 1H26 results, 7 Aug 2026 | Group net profit S$4.19bn (+13%); total income S$8.00bn (+11%); wealth management income S$3.29bn (+27%), 41% of total income vs 36% a year earlier; banking wealth AUM S$350bn (+13%) | Scale anchor only — establishes that the franchise is large enough for the idea to matter, not unit economics |
| **P5** | WealthBriefingAsia / The Asian Banker, Jul–Aug 2026 | OCBC's GenAI coaching programme: within three months, participating wealth advisors secured double the weekly client appointments of non-participating peers, with a 50% revenue uplift versus the prior three months | **Evidence of an operating principle, not a projected result for RIN.** Different intervention, different mechanism. Cite it as precedent for AI changing frontline outcomes at OCBC; never as RIN's expected uplift |
| **P6** | OCBC / The Edge Singapore, 1 Jul 2026 | OCBC WoW launched with avatars delivering real-time personalised wealth engagement directly to customers | Customer-facing; distinct from RIN's RM-facing scope |
| **I1** | Internal RIN business brief | Current-state description of manual opportunity identification and its consequences | Internal; not externally verifiable |

## C.6 Coverage of judging criteria

| Judges look for | Where it is answered |
|---|---|
| Clearly defined business problem | §1.1, §1.2 |
| Tangible business outcomes and benefits | §2.1, §4.1, Appendix A |
| Compelling demo | §3 — including the refusal case |
| Evidence-based impact estimates | Appendix A.1 with confidence levels and named TBD owners |
| Practical implementation and adoption | §4.2 — four-stage sequence and five-owner model |
| Awareness of risks and constraints | §4.3, Appendix C.4 |
| How AI creates value | §2.2 — four bounded jobs, with explicit limits, and Appendix B.4 |
