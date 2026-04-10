# memory-write

## Purpose

Write to the project memory layer correctly at the end of a session. Memory that isn't written is lost. Memory that's written poorly doesn't get read. This skill defines what's worth capturing, where it goes, and how to keep the index current.

## When to Use

At the end of any session where:
- Work was completed (files produced, decisions made, patterns observed)
- A decision was reached that someone might need to revisit later
- Something was learned that changes how future work gets done
- A topic has accumulated enough depth to warrant its own page

If you just read files without producing output, skip the memory write.

---

## Step 1: Decide What to Write

Not everything belongs in memory. Filter before you write.

**Write to memory:**
- Decisions with non-obvious reasoning (why X was chosen over Y)
- Learnings that change future behavior (client prefers X, approach Y consistently fails)
- Patterns worth tracking (recurring problem, repeated dynamic)
- Session summaries when significant work was completed

**Don't write to memory:**
- Things already captured in CONTEXT.md (done/in-progress state lives there)
- Things already in context/ files (project scope, client profile — don't duplicate)
- Routine work with no lasting significance ("wrote a draft" with no new learning)
- Obvious choices with no real alternative considered

---

## Step 2: Choose Where It Goes

### Log entry (default)

Write a log entry for almost everything. The log is the primary record.

Format:
```markdown
## [YYYY-MM-DD] <type> | <title>
- [content]
```

Types and what goes in them:

**`session`** — End-of-session summary:
```markdown
## [2026-04-10] session | Finalized client proposal draft
- What was done: Wrote full proposal for ACME Corp. Applied pricing model from 2026-03-15 decision.
- Produced: workspaces/proposals/acme-proposal_draft.md
- Decisions made: Chose to lead with outcomes section, move methodology to appendix
- What's next: Client review expected by end of week. Revisions session likely needed.
```

**`decision`** — A choice made that someone might re-examine:
```markdown
## [2026-04-10] decision | Lead proposals with outcomes, not methodology
- Decision: Proposals open with "3 outcomes you will see in 30 days," methodology moves to appendix
- Reasoning: Outcomes version got same-day reply; methodology version got no reply after 5 days
- Context: Tested with two ACME proposals this week
```

**`learning`** — Something discovered that changes how work gets done:
```markdown
## [2026-04-10] learning | Client responds to numbered outcomes
- Learning: Framing in numbered outcomes outperforms methodology descriptions
- Evidence: 2-for-2 on outcomes framing this week vs 0-for-2 on methodology framing
- Implication: Default to outcomes framing in all client-facing content going forward
```

**`pattern`** — A recurring dynamic worth tracking:
```markdown
## [2026-04-10] pattern | Irrigation estimates consistently run over on labor
- Pattern: Irrigation jobs run 20-35% over on labor estimates, consistently
- Observed: 4 of 5 irrigation jobs in March. Average overage: 28%
- Action taken: Applied 1.3x multiplier to irrigation labor estimates in estimating agent
```

### Topic page (when depth warrants it)

Create a topic page when a subject has been referenced in 3+ log entries and warrants consolidated access. The index-first pattern means agents won't read scattered log entries for a deep topic — they need a page.

**Create a topic page when:**
- A client has been discussed in 3+ sessions and has preferences/history worth tracking
- A decision domain (pricing, scope, technical choices) has enough decisions to warrant a catalog
- A recurring pattern has enough instances that a summary page aids orientation

**How to create one:**
1. Copy `base/memory/example-topic.md` pattern
2. Name it descriptively: `client-acme.md`, `pricing-decisions.md`, `technical-stack.md`
3. Pull relevant log entries into the page — the page synthesizes, the log preserves the raw record
4. Add a row to `memory/index.md`

---

## Step 3: Update index.md

After writing any log entry or creating/updating any topic page, update `memory/index.md`:

**If a new topic page was created:** Add a row to the Knowledge Pages table.
```markdown
| `client-acme.md` | ACME Corp context, preferences, what works, communication patterns | 2026-04-10 |
```

**If a topic page was updated:** Update its Last Updated date in the table.

**Always:** Add a line to Recent Sessions (keep to last 10 max):
```markdown
- [2026-04-10] Wrote ACME proposal draft. Decided on outcomes-first framing. Updated pricing.md.
```

---

## Quality Check Before Closing

- [ ] Log entry written for anything worth remembering from this session
- [ ] Decision entries have reasoning, not just the decision
- [ ] Learning entries have the evidence, not just the observation
- [ ] index.md Recent Sessions updated
- [ ] Any new topic pages added to the index table
- [ ] Nothing duplicated between memory/ and context/ files
