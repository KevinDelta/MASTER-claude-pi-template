---
name: goals-resolver
description: Check declared goals against observation history. Compute the delta between ideal state and observed state. Propose specific recovery actions. Load when heartbeat runs a goal review, or when asked to review domain goal progress.
---

# Goals Resolver

## When to Use

Load this skill when:
- Heartbeat runs a goal review from `HEARTBEAT.md`
- The worker asks to review progress on a declared goal
- A weekly sync heartbeat needs to surface goal status alongside project summaries

## Process

### 1. Fetch the goal

```sql
SELECT id, scope, project, name, definition, check_cron, resolver_skill
FROM goals
WHERE name = '<goal-name>';
```

Read the `definition` field — this is the ideal state. It is the target against which you compare observed reality.

### 2. Determine the measurement window

Use `check_cron` to infer the lookback period:
- Daily cron (`0 18 * * *`) → look back 1 day
- Weekly cron (`0 17 * * 5`) → look back 7 days
- Monthly → look back 30 days

### 3. Query relevant observations

For a project-scoped goal:
```sql
SELECT content, ts, kind, workspace
FROM observations
WHERE project = '<project-id>'
  AND ts > datetime('now', '-<N> days')
ORDER BY ts DESC;
```

For a domain-scoped goal:
```sql
SELECT content, ts, kind, project, workspace
FROM observations
WHERE ts > datetime('now', '-<N> days')
ORDER BY ts DESC;
```

Supplement with aggregates when the goal is quantitative:
```sql
SELECT kind, COUNT(*) as count
FROM observations
WHERE project = '<project-id>'
  AND ts > datetime('now', '-7 days')
GROUP BY kind;
```

### 4. Compute the delta

Compare the observed evidence against the goal's definition. This is a semantic comparison — you synthesize whether observed activity meets, exceeds, or falls short of the ideal state.

State the delta explicitly:
- **No delta** — observed state matches or exceeds the ideal. Note what evidence supports this.
- **Small delta** — minor shortfall. What specifically is missing?
- **Significant delta** — meaningful gap. Root cause if identifiable. What would close it?

### 5. Run the resolver skill (if one is declared)

If the goal has a non-null `resolver_skill` field, load that skill and execute its process. The resolver skill handles the recovery proposal for this specific goal type.

If `resolver_skill` is null, use the default recovery pattern below.

### 6. Default recovery pattern

When no specific resolver skill is declared:

1. State the goal (ideal state)
2. State the current observed state (factual, evidence-based)
3. State the delta (what is missing and by how much)
4. Propose 1–3 specific actions to close the delta by next check
5. Identify the earliest opportunity to take the first action

## Output Formats

**For `output: notify`** — produce a notification-style summary:

```
Goal: <goal-name>
Status: [On track / Small gap / Significant gap]
Delta: <one sentence>
Recovery: <one or two specific actions>
Next check: <date from check_cron>
```

**For `output: append MEMORY.md`** — produce a log entry:

```
[YYYY-MM-DD] GOAL CHECK: <goal-name> | STATUS: <on track / gap N> | <one sentence on delta> | ACTIONS: <proposed recovery> #goal
```

**For inline review** — produce a structured section the worker can act on immediately.

## Example

Goal: `deep-work-hours-per-week` (definition: "20 hours of focused, uninterrupted work per week")

Observation query returns: 14 `tool_call` observations tagged `deep-work`, 2 days with no observations

Delta: 6 hours short of the 20-hour target this week. Pattern: no deep work on Tuesday or Wednesday.

Recovery proposal:
1. Block Tuesday 9am–12pm and Wednesday 9am–12pm in calendar (6 hours total)
2. Add a heartbeat condition: if no deep-work observations by the configured review window, surface a reminder
