---
name: domain-status
description: Produce a cross-project status summary from domain memory. Load for weekly reviews, domain health checks, or when asked about overall domain progress, active projects, or open items across the domain.
---

# Domain Status

## When to Use

Load this skill when:
- The weekly sync heartbeat runs
- The worker asks "what's the status across projects?" or "where do things stand?"
- Starting a planning session that needs cross-project context

## Process

### 1. Load domain context

Read `~/.openclaw/agents/<name>/MEMORY.md` for high-level domain orientation.

Check the active projects list in `context/domain.md`.

### 2. Query recent activity per project

```sql
SELECT project, COUNT(*) as observation_count, MAX(ts) as last_active
FROM observations
WHERE ts > datetime('now', '-7 days')
  AND project IS NOT NULL
GROUP BY project
ORDER BY last_active DESC;
```

This gives you: which projects had activity this week, how much, and when they were last active.

### 3. Surface open scratchpad items

```sql
SELECT project, item, created_at
FROM scratchpad
WHERE completed_at IS NULL
ORDER BY project, created_at DESC;
```

Group by project. Flag items older than 7 days as potentially stale.

### 4. Check goal status (if goals are declared)

```sql
SELECT name, scope, project, definition, check_cron
FROM goals
ORDER BY scope DESC, project;
```

For each goal, run a brief observation query to assess current state. Use goals-resolver skill if a full delta analysis is needed.

### 5. Identify stale projects

Projects from the active list in `context/domain.md` that appear in no observations in the last 14 days. These need a decision: archive, resume, or close.

## Output Format

Structure the output as a scannable summary. Lead with the most actionable items.

```markdown
## Domain Status — <domain-name> — <date>

### Active This Week
- **<project-slug>** — <N> observations, last active <date>. [One sentence on what was happening.]
- **<project-slug>** — <N> observations, last active <date>. [One sentence on what was happening.]

### Stale Projects (>14 days no activity)
- **<project-slug>** — last active <date>. Needs: archive / resume / close decision.

### Open Items Across Projects
- [<project-slug>] <scratchpad item> (open <N> days)
- [<project-slug>] <scratchpad item> (open <N> days)

### Goal Status
- **<goal-name>**: [On track / Gap of N] — <one sentence>

### Notes
<Any cross-project patterns, decisions, or lessons worth capturing in MEMORY.md>
```

## What to Write to Memory

If the status review surfaces domain-level patterns or decisions, append them to MEMORY.md using the decision or pattern format. Do not append routine status — only things that inform future work.
