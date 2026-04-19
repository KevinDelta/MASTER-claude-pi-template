---
name: domain-bootstrap
description: Bootstrap a new project's context files from domain memory. Instead of starting from blank templates, query the domain DB for relevant past patterns, decisions, and client context, then draft context files with real content. Load when creating a new project under an established domain.
---

# Domain Bootstrap

## When to Use

Load when:
- Starting a new project under an existing domain
- The worker says "add a new project" or "start a new engagement"
- A blank project directory exists and needs context files populated

## What This Replaces

Without domain memory: new project context files are filled in from scratch (blank templates → 2 hours of setup).

With domain memory: context files are drafted from accumulated domain knowledge → 20 minutes of review and customization.

## Process

### 1. Identify the new project

Ask (or confirm from context):
- Project slug (will be used as `PI_PROJECT_ID` in `.pi/.env`)
- Project name and one-sentence description
- Client (if applicable)
- What kind of work — which domain workspace template applies (research, drafting, analysis, delivery)

### 2. Query the domain DB for relevant context

**Find similar past projects:**
```sql
SELECT content, ts, project
FROM observations_fts
WHERE observations_fts MATCH '<client-name> OR <work-type> OR <domain-term>'
ORDER BY rank
LIMIT 20;
```

**Surface domain decisions that apply to this project type:**
```sql
SELECT content FROM observations
WHERE kind = 'decision'
  AND content LIKE '%<work-type>%'
ORDER BY ts DESC
LIMIT 10;
```

**Check domain MEMORY.md** — read it fully, looking for patterns, preferences, and lessons that apply to this project type.

**Check goals** for any domain goals this project should contribute to:
```sql
SELECT name, definition FROM goals WHERE scope = 'domain';
```

### 3. Draft context files

Use the queried material to draft the following files in the new project directory:

**`context/project.md`**
- What It Is: draft from the project description + domain context
- Who It's For: from client registry (`domain/context/clients.md`) if client is known
- Success criteria: from similar past projects in observations
- Scope: based on domain workspace templates and past project patterns
- Current Phase: "Setup" (week 1 of new engagement)

**`context/client.md`** (if client is known)
- Cross-reference `domain/context/clients.md` for existing client context
- Pull communication preferences and standards from domain memory
- Note: mark fields that need direct confirmation with [CONFIRM]

**`context/decisions.md`**
- Pre-populate with domain-level decisions that apply to this project type
- Add a header noting these are carried over from domain; project-specific decisions go below

**`context/stack.md`** (if technical project)
- Pull from similar past project observations where stack was mentioned

### 4. Present drafts for review

Before writing any files, present the drafted content to the worker:
- Show what was sourced from domain memory (cite the source observation or MEMORY.md section)
- Flag fields marked [CONFIRM] that need direct input
- Note anything that couldn't be populated and why

Only write files after the worker reviews and confirms.

### 5. Register the project

After context files are written:
1. Add the project slug to `domain/context/domain.md` under Active Projects
2. Confirm `PI_PROJECT_ID=<slug>` is set in `<project-root>/.pi/.env`
3. Suggest creating an initial scratchpad entry:
```sql
INSERT INTO scratchpad (project, item)
VALUES ('<slug>', 'Complete and review context files for new project');
```

## Quality Check

Good bootstrap output:
- `context/project.md` has a specific, concrete project description — not "a client project"
- At least one past project pattern is referenced and applied
- All [CONFIRM] fields are clearly marked
- Nothing fabricated — every claim traces to domain memory or worker input
