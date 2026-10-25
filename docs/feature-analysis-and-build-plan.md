# VERIGATE: Feature Analysis & Prototype Build Plan

Companion to `VERIGATE_Product_Context_and_Prototype_Brief.md`. Part A tests whether the feature set really answers the case prompt. Part B is the build plan the prototype in `prototype/` follows.

---

## Part A: Does VERIGATE actually solve the problem?

### A1. Reading the prompt closely

> "It's 2040. Everyone has a personal AI agent that **knows them better than they know themselves** and **carries out their day-to-day tasks** for them. Outline the ramifications of this paradigm and create a digital product that helps **protect yourselves from it**."

The prompt gives the agent two properties, and each one creates a different kind of exposure:

| Property | What it creates | Core risk |
|---|---|---|
| **Knows you better than you know yourself** | An *information asymmetry*: the agent holds inferences about you that you can't see | Manipulation, wrong or frozen identity, privacy loss, exploitation of vulnerabilities |
| **Carries out your tasks** | *Delegated authority*: the agent can act without you | Over-reach, costly or irreversible actions, hijacking, no accountability |

"Protect yourselves **from it**" means protection from the paradigm, so from the agent itself and from the incentives behind it, not only from outside attackers. A product that only protects against hackers misses the point.

**Test:** a credible answer has to cover **both** properties. The brief's demo scenario (the flight booking) is strong on the second one and weak on the first.

### A2. Ramification → feature coverage (brief as written)

| # | Ramification | Feature(s) in the brief | Coverage | Gap |
|---|---|---|---|---|
| R1 | Unauthorised or excessive action | Gateway + AUTO/ASK/NEVER | **Strong** | None |
| R2 | Commercial manipulation | Conflict Auditor | **Strong** | None |
| R3 | Privacy loss through inference | Memory Mirror | Medium | Demoted to Phase 2 / "optional", and **never connected** to the main demo |
| R4 | Wrong or frozen digital identity | Memory Mirror (outdated, inferences) | Medium | Same as above |
| R5 | Persuasion: an agent that knows your weak spots nudges you | Behavioural Pattern Auditor | **Weak** | Deferred to Phase 3, so it isn't in the prototype at all |
| R6 | Security concentration / hijacking | Threat model only | **Weak** | The brief's "blocked" demo (health data to an advertiser) has nothing to do with booking a flight and shows no attack |
| R7 | Low transparency / accountability | Decision Receipts, Audit Trail | **Strong** | None |
| R8 | Loss of human agency / over-dependence | ASK controls, Human Agency Mode | Medium | Over-prompting itself erodes agency, because people learn to rubber-stamp |
| R9 | Trusting the protector itself | Open-Source Trust Framework | Medium | Fine for a prototype. Governance is honestly labelled as proposed |

### A3. Five findings and the changes made for the prototype

**1. The prompt's headline phrase was under-served.** "Knows them better than they know themselves" is the most distinctive line in the prompt, yet the feature that answers it (Memory Mirror) was optional and didn't connect to anything else.
→ **Change:** Memory Mirror is core in the prototype, and it's **causally wired into the booking**. The agent's captured rationale for the expensive flight cites an inference the user never confirmed: *"prefers full-service carriers"*, 58% confidence, drawn from 2 bookings in 2038. The user can see that inference, mark it incorrect or restrict it, and from then on the gateway withholds it from the agent. That makes the abstract risk ("it thinks it knows me") something the user can see and change.

**2. Inference creates leverage, and leverage enables persuasion.** An agent that knows you're *"more likely to accept upgrades after 10 pm"* holds a behavioural vulnerability. The brief deferred all persuasion defence.
→ **Change:** add a cheap, deterministic **refusal guard**. When the user rejects a booking, the simulated agent comes back with urgency pressure ("only 2 seats left…"). A hard boundary, *never re-request something I rejected unless I start a new task*, blocks it and labels it a steering attempt. This needs no claims about psychology. It's a rule over observable behaviour.

**3. The "blocked" case should show an attack, not a contrived misuse.** Sharing health data with an advertiser doesn't belong in a flight task.
→ **Change:** replace it with a **prompt-injection exfiltration attempt**. A fare page carries hidden text telling AI agents to send the traveller's passport number to an unverified address. The agent tries to comply, and the identity-document hard boundary blocks it. The receipt records that the instruction came from **web content, not from the user**. One step now covers R1, R6 and the provenance idea.

**4. Least privilege was stated but never demonstrated.**
→ **Change:** the agent asks for the full calendar and the whole profile. The gateway **narrows** each request, granting free/busy for the trip dates only, and travel-related memory items only. Restricted and sensitive inferences are withheld and named in the receipt.

**5. Honest evidence is the differentiator, so the alternative must not look perfect.** If the cheaper flight were better in every way, the auditor would look like it was simply biased toward cheap fares.
→ **Change:** the ₹26,000 alternative is honestly *different*: 5 kg less baggage and no included meal, but refundable. Findings are split into **verified / potential conflict / unknown**, and the unknowns include the staleness of the price check, which is computed live.

### A4. Challenges an evaluator will raise, and the answers

| Challenge | Answer the prototype makes visible |
|---|---|
| "Agents will just bypass the gateway." | **Coverage card.** Uninspected actions are counted and listed, including a calendar invite accepted through a direct connection, which shows exactly why coverage matters. In the real product, scoped credentials make the gateway the only path; for 2040, the open-banking-style regulation analogy. |
| "Won't this nag users into rubber-stamping?" | An **interruption-rate** metric on the dashboard. Routine actions are AUTO; ASK is reserved for spend over the limit, auditor conflicts, or a category the user chose to keep. |
| "Isn't this just a second AI judging the first?" | No. Decisions come from **deterministic, ordered checks** shown on every receipt and on the Trust page. The auditor only *adds evidence*; it never makes the final call. |
| "Why trust VERIGATE?" | It's open source, local-first and has no profile-based ads. Governance is marked *proposed*, not claimed as operational. |
| "A price difference doesn't prove manipulation." | Agreed, and the UI says so. A commercial partnership is shown as a known incentive, with "did it influence this?" listed as **unknown**. |

### A5. Verdict

As written, the brief solves **the delegation half** of the prompt very well and **the knowledge half** only on paper. With the five changes above, the single demo scenario covers R1–R8 directly and R9 through the Trust page, all within one coherent task, without adding new product surface beyond what the brief already specs.

Core thesis (kept unchanged): *let AI understand us deeply without letting that understanding become unchecked authority over our lives.* The prototype adds a corollary: **what you've stated beats what the agent has inferred.**

---

## Part B: Build plan

### B1. Hard constraints (submission + `file://`)

The prototype must run by unzipping and double-clicking `index.html`: offline, no server, no install, HTML/CSS/JS only.

| Constraint | Consequence |
|---|---|
| `fetch()` of local JSON is blocked on `file://` (null-origin CORS) | Sample data lives in `js/data.js` as a JS object |
| `<script type="module">` is blocked on `file://` | Classic scripts in dependency order, one `window.VG` namespace |
| Graders may be offline | No CDNs. System font stack, inline SVG icons |
| `localStorage` is unreliable on `file://` (Safari) | State is held in memory. Reload resets the demo, and a Reset button does the same |
| Separate HTML pages would wipe in-memory state | One `index.html` shell with hash routing (`#/home`, `#/approvals/VG-…`) |
| Graders' time zones vary | All times are formatted in `Asia/Kolkata` from a simulated 2040 clock |

### B2. File layout

```
prototype/
├── index.html        shell: sidebar, top bar, view root, modal + toast roots
├── README.txt        how to run, 2-minute demo script, honesty notes
├── css/styles.css    design tokens, layout, components, responsive rules
└── js/
    ├── data.js       seed(): agent, rules, boundaries, memory, flights, script, history
    ├── engine.js     evaluate() policy checks + audit() evidence. Pure functions
    ├── state.js      state container, receipts, run orchestration, mutations
    ├── views.js      render functions per screen (HTML strings, all text escaped)
    └── app.js        router, event delegation, modals, toasts, boot
```

### B3. Engine design: the integrity of the demo depends on this

Every outcome on screen comes from `evaluate(action, state, opts)`. No screen hardcodes a decision.

Ordered checks. The most restrictive result wins (`block` > `ask` > `pass`):

1. **Agent access**: paused or revoked → block
2. **Hard boundaries** (NEVER rules): identity docs to untrusted destinations, health data to advertisers, job offers, re-request after refusal → block
3. **Category mode**: AUTO / ASK / NEVER per category
4. **Spend limits** (purchases): auto up to the limit, ask above it, block above the hard cap
5. **Data minimisation** (reads): narrow the requested scope to what the task needs (`pass`, marked as narrowed)
6. **Provenance**: the instruction came from web content rather than the user → flag
7. **Conflict auditor**: potential conflicts → ask or note, according to the user's setting

`opts.userApproved` turns `ask` results into passes but **never overrides `block`**. That is how "Approve once" works, and why a NEVER rule can only be changed on the Rules screen.

`audit(action, state)` returns findings in three tiers, **verified / potential / unknown**, each with a source and a timestamp. The text responds to state: whether the inference is confirmed, and how stale the price check is.

### B4. Demo script (one task, seven possible steps)

Task: *"Book me a return flight Bengaluru ⇄ Singapore, 12–15 Mar, within my ₹40,000 budget."*

| Step | Agent request | Default outcome | Shows |
|---|---|---|---|
| 1 | Search flights | Allowed (AUTO) | Routine actions aren't interrupted |
| 2 | Read the full calendar | Allowed, **narrowed** to trip-date free/busy | Least privilege |
| 3 | Read the whole profile | Allowed, **narrowed** to travel items; restricted items withheld | Memory controls enforced |
| 4 | Open a fare page | Allowed, **flagged**: hidden instructions found | Untrusted content |
| 5 | Send passport + DOB to fare-assist.example | **Blocked** (hard boundary), provenance: web | Prompt-injection defence |
| 6 | Book ₹37,500 non-refundable via partner platform | **Paused**: over the limit + auditor conflict | Evidence, human decision |
| 7 | *(after Reject)* Re-request with urgency pressure | **Blocked**: steering attempt | Persuasion defence |

At step 6 the decision options are **Approve once**, **Book the alternative** (records ₹11,500 *verified* savings), **Reject** (triggers step 7), and **Edit rule** (applies to future actions only; the pending booking still needs an explicit decision).

### B5. Screens

1. **Home**: task runner with a live gateway feed, a self-ticking demo guide, stats (reviewed / allowed / awaiting / blocked), coverage, verified savings, interruption rate, recent activity
2. **Approvals**: pending list, plus a detail view with the "why paused" checks, side-by-side comparison with honest differences, the agent's captured rationale, the three-tier evidence, and decision buttons with their consequences spelled out
3. **Agents & Rules**: agent card (expiry, revoke), AUTO/ASK/NEVER per category, spend limits, data minimisation, hard boundaries (turning one off needs confirmation), conflict-auditor setting, trusted destinations. Edits are staged and need an explicit **Save**
4. **Memory Mirror**: Facts / Preferences / AI inferences / Outdated, with source, date, confidence and access. Edit, restrict, confirm or mark incorrect, delete (with an honest note about third-party copies)
5. **Activity**: filters (status, category, date) and Decision Receipts showing every field, the full check trace, history, and a JSON download (Blob downloads work on `file://`)
6. **Trust**: decision order (read live from engine metadata), coverage limits, privacy commitments, governance labelled as proposed, known limitations

Global: a persistent "sample data" banner, emergency pause in the top bar (resuming needs confirmation), and Reset demo.

### B6. Brief §16 checklist mapping

| Requirement | Where |
|---|---|
| Navigation works | Hash router, sidebar, deep links |
| Alert buttons give different outcomes | Approve / Alternative / Reject / Edit, each with its own receipt |
| Editing a rule changes the next action | Staged Save → next run is evaluated against the new rules |
| Pause blocks the next protected action; resume needs confirmation | Top bar; blocks mid-run too |
| Memory edits change state | Edit / restrict / delete feed the next run's narrowed read |
| Filters and receipt links work | Activity |
| Facts, concerns and unknowns are distinguished | Three-tier evidence |
| Coverage limits are visible | Dashboard coverage card, uninspected rows, Trust page |
| No claim of live data or real blocking | Banner, README, Trust page |

### B7. Verification plan

Run headless Chromium (Playwright) against the `file://` URL:
- zero console errors and zero failed requests while loading each route
- full walkthroughs: approve path, alternative path (savings = ₹11,500), reject path (step 7 blocked), edit-rule-then-rerun, pause mid-run, revoke, memory restrict → narrowed read on the next run, receipt download
- screenshots of each screen at desktop and mobile widths, checked visually
- `node --check` on every JS file

Then build `verigate-prototype.zip` and confirm it unzips to a runnable folder.
