# Memory Log

<!-- What goes here: The append-only record of everything worth remembering from past sessions.
     Sessions, decisions, learnings, patterns — all in one stream.
     NEVER edit or delete past entries. Only append.

     The consistent header format is what makes this grep-navigable without a database.
     An agent can extract any slice of this log with a single Bash command. -->

**Entry format:**
```
## [YYYY-MM-DD] <type> | <title>
- [content]
```

**Types:**
- `session` — what happened in a work session (what was done, what was produced)
- `decision` — a choice that was made, with reasoning (queryable later: "what did we decide about X?")
- `learning` — something discovered that changes how we work (client behavior, what fails, what works)
- `pattern` — a recurring dynamic worth tracking (client always delays on X, estimates always run over on Y)

**Grep tip — run these in the project root:**
```bash
# Last 10 entries
grep "^## \[" memory/log.md | tail -10

# All decisions
grep "^## \[" memory/log.md | grep "decision"

# All entries about a topic
grep -A5 "decision | pricing" memory/log.md

# All entries from a specific month
grep "^## \[2026-04" memory/log.md
```

---

<!-- Entries go below this line. Most recent at the bottom (append only). -->

## [YYYY-MM-DD] session | [Session title]
- What was done: [brief description of work completed]
- Produced: [files created or updated]
- Decisions made: [any decisions — link to decision entry or write inline if small]
- What's next: [what this session sets up for the next one]

<!-- Example entries (delete these when writing real entries):

## [2026-04-05] session | Memory layer initialized
- What was done: Set up memory/ folder. Created index.md and log.md.
- Produced: memory/index.md, memory/log.md
- Decisions made: Using flat-file index + log pattern over DuckDB. No tooling overhead.
- What's next: First real session — create initial topic pages as knowledge accumulates.

## [2026-04-08] decision | Use retainer pricing over project-only model
- Decision: Offer retainer tier ($1,500/mo) after initial build. Do not offer project-only.
- Reasoning: Project-only clients churn after delivery. Retainer creates recurring revenue and keeps agent value compounding.
- Context: Came from a conversation where client asked about one-time pricing — owner declined to quote it.

## [2026-04-10] learning | Client responds to numbered outcomes, not process descriptions
- Learning: Proposals framed as "3 things that will change" outperform proposals describing methodology.
- Evidence: Sent two proposals this week — methodology version got no reply, outcomes version got same-day reply.
- Implication: Lead with outcomes in all future proposals. Move methodology to appendix.

## [2026-04-10] pattern | Estimates run over on irrigation jobs consistently
- Pattern: Irrigation job type labor estimates are 20-35% below actuals, consistently.
- Observed: 4 of 5 irrigation jobs in March ran over on labor. Average overage: 28%.
- Action taken: Flagged for estimating agent to apply 1.3x multiplier to irrigation labor estimates.
-->
