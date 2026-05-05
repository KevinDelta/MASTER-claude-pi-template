#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";

function usage() {
  console.error(`Usage: node scripts/apply-intake.mjs --intake-json <file> --workspace-dir <dir> [--project-dir <dir>] [--template-dir <dir>]`);
  process.exit(2);
}

const args = process.argv.slice(2);
const opts = {};
for (let i = 0; i < args.length; i += 1) {
  const arg = args[i];
  if (!arg.startsWith("--")) usage();
  const key = arg.slice(2);
  const val = args[i + 1];
  if (!val || val.startsWith("--")) usage();
  opts[key] = val;
  i += 1;
}

if (!opts["intake-json"] || !opts["workspace-dir"]) usage();

const intakePath = path.resolve(opts["intake-json"]);
const workspaceDir = path.resolve(opts["workspace-dir"]);
const projectDir = opts["project-dir"] ? path.resolve(opts["project-dir"]) : "";
const today = new Date().toISOString().slice(0, 10);

const state = JSON.parse(fs.readFileSync(intakePath, "utf8"));
const ctx = buildContext(state);

applyDomain(workspaceDir, ctx);
if (projectDir) applyProject(projectDir, ctx);

function buildContext(input) {
  const identity = input.identity || {};
  const setup = input.setup || {};
  const impact = input.impact || {};
  const rawWorkTypes = Array.isArray(input.workTypes) ? input.workTypes : [];
  const workTypes = rawWorkTypes
    .map((w) => ({
      name: clean(w.name),
      description: clean(w.description),
      pattern: clean(w.pattern),
      workspace: slugify(w.workspace || w.name || "workspace"),
    }))
    .filter((w) => w.workspace);

  const domainName = clean(identity.domainName || setup.slug || "domain");
  const slug = slugify(setup.slug || domainName);
  const personaName = clean(setup.personaName || "Agent");
  const tools = splitLines(identity.tools);
  const hardStops = splitLines(setup.hardStops);
  const orgRules = splitLines(setup.orgRules);
  const projectRules = splitLines(setup.projRules);

  return {
    workerName: clean(identity.workerName),
    domainName,
    slug,
    personaName,
    personaLine: clean(setup.persona),
    whatYouDo: clean(identity.whatYouDo),
    industry: clean(identity.industry),
    whatToFix: clean(identity.whatToFix),
    tools,
    toolsText: tools.length ? tools.join(", ") : "-",
    hardStops,
    orgRules,
    projectRules,
    workTypes,
    impact: {
      goalNarrative: clean(impact.goalNarrative),
      timeSaved: clean(impact.timeSaved),
      urgency: clean(impact.urgency),
    },
    projectDir,
    today,
  };
}

function applyDomain(dir, ctx) {
  ensureDir(path.join(dir, "context"));
  rewriteDomainAgents(path.join(dir, "AGENTS.md"), ctx);
  writeFile(path.join(dir, "SOUL.md"), domainSoul(ctx));
  writeFile(path.join(dir, "MEMORY.md"), domainMemory(ctx));
  writeFile(path.join(dir, "HEARTBEAT.md"), domainHeartbeat(ctx));
  writeFile(path.join(dir, "context", "domain.md"), domainContext(ctx));
  writeFile(path.join(dir, "context", "clients.md"), domainClients(ctx));
  applyDock(path.join(dir, "DOCK.md"), ctx);
  writeFile(path.join(dir, "POST-INSTALL-CHECKLIST.md"), postInstallChecklist(ctx));
}

function applyProject(dir, ctx) {
  ensureDir(path.join(dir, "context"));
  ensureDir(path.join(dir, "memory"));
  ensureDir(path.join(dir, "workspaces"));
  writeFile(path.join(dir, "AGENTS.md"), projectAgents(ctx));
  writeFile(path.join(dir, "context", "project.md"), projectContext(ctx));
  writeFile(path.join(dir, "context", "client.md"), clientContext(ctx));
  writeFile(path.join(dir, "context", "stack.md"), stackContext(ctx));
  writeFile(path.join(dir, "context", "decisions.md"), decisionsContext(ctx));
  writeFile(path.join(dir, "memory", "MEMORY.md"), projectMemory(ctx));
  for (const w of ctx.workTypes) {
    const wsDir = path.join(dir, "workspaces", w.workspace);
    ensureDir(wsDir);
    writeFile(path.join(wsDir, "CONTEXT.md"), workspaceContext(w, ctx));
  }
  writeFile(path.join(dir, "POST-INSTALL-CHECKLIST.md"), postInstallChecklist(ctx));
}

function rewriteDomainAgents(file, ctx) {
  let content = readIfExists(file);
  if (!content) content = "# AGENTS.md\n";
  content = replaceSection(content, "## Domain Identity", "## Domain Vocabulary", domainIdentitySection(ctx));
  content = replaceSection(content, "## Domain Vocabulary", "## Domain Methods", domainVocabularySection(ctx));
  content = replaceSection(content, "## Domain Methods", "## Domain Routing Table", domainMethodsSection(ctx));
  content = replaceSection(content, "## Domain Routing Table", "## Domain Workspace Templates", domainRoutingSection(ctx));
  content = replaceSection(content, "## Domain Workspace Templates", "## Domain-Wide Rules", domainWorkspaceSection(ctx));
  content = replaceSection(content, "## Domain-Wide Rules", "## Routed Skills", domainRulesSection(ctx));
  content = replaceSection(content, "## Out of Bounds", null, domainOutOfBoundsSection(ctx));
  writeFile(file, content);
}

function applyDock(file, ctx) {
  let content = readIfExists(file);
  if (!content) return;
  const section = `## Onboarding Policy Overlay

Captured during intake for ${ctx.domainName}. These constraints extend the default DOCK policy and should be reviewed before channel or remote access goes live.

**Hard stops:**
${ctx.hardStops.length ? ctx.hardStops.map((s) => `- ${s}`).join("\n") : "- No additional hard stops captured during onboarding."}

**Commerce:**
- Disabled by default. Enable only with restricted keys, explicit approval gates, and a reviewed commerce plugin/policy path.
`;
  if (content.includes("## Onboarding Policy Overlay")) {
    content = content.replace(/## Onboarding Policy Overlay[\s\S]*?(?=\n## |\n# |\s*$)/, section.trim());
  } else {
    content = `${content.trimEnd()}\n\n---\n\n${section}`;
  }
  writeFile(file, content);
}

function replaceSection(content, startHeading, nextHeading, replacementBody) {
  const start = content.indexOf(startHeading);
  if (start === -1) return `${content.trimEnd()}\n\n${startHeading}\n\n${replacementBody.trim()}\n`;
  const bodyStart = start + startHeading.length;
  let end = content.length;
  if (nextHeading) {
    const next = content.indexOf(nextHeading, bodyStart);
    if (next !== -1) end = next;
  }
  return `${content.slice(0, bodyStart)}\n\n${replacementBody.trim()}\n\n${content.slice(end).replace(/^\n+/, "")}`;
}

function domainIdentitySection(ctx) {
  return ctx.whatYouDo || `${ctx.domainName} is a ${ctx.industry || "knowledge work"} domain that supports ${ctx.workerName || "the worker"} with structured, repeatable work.`;
}

function domainVocabularySection(ctx) {
  const rows = [
    `| Domain | ${ctx.domainName} - the body of work this agent supports |`,
    "| Workspace | A focused project work area with its own CONTEXT.md and routing expectations |",
  ];
  for (const w of ctx.workTypes) rows.push(`| ${w.name || w.workspace} | ${w.description || patternDescription(w.pattern)} |`);
  return `| Term | Definition |\n|------|-----------|\n${rows.join("\n")}`;
}

function domainMethodsSection(ctx) {
  const methods = [
    "Resolve every task through AGENTS.md before acting.",
    "Read the relevant CONTEXT.md before producing output for a workspace.",
    "Use OpenClaw for runtime routing and this framework for work routing.",
  ];
  if (ctx.whatToFix) methods.push(`Prioritize fixing this current friction: ${ctx.whatToFix}`);
  return methods.map((m) => `- ${m}`).join("\n");
}

function domainRoutingSection(ctx) {
  const workRows = ctx.workTypes.map((w) => `| **Work on ${w.name || w.workspace}** | /areas/${w.workspace} | project context + areas/${w.workspace}/CONTEXT.md when project-scoped | ${patternSkill(w.pattern)} |`);
  return `| Task Type | Workspace | Read | Load Skills |\n|-----------|-----------|------|-------------|\n| **Session start** - orient before any work | - | \`MEMORY.md\` + \`HEARTBEAT.md\` when recurring | \`memory-query.md\` |\n| **Heartbeat** - recurring proactive check | - | \`HEARTBEAT.md\` + \`MEMORY.md\` | \`memory-query.md\` + \`domain-status.md\` |\n| **Domain status** - cross-project summary, weekly review | - | \`MEMORY.md\` | \`domain-status.md\` |\n| **Goal review** - check domain goals against observed state | - | \`MEMORY.md\` + \`HEARTBEAT.md\` | \`goals-resolver.md\` |\n${workRows.join("\n")}${workRows.length ? "\n" : ""}| **Session end** - update state and write memory | - | - | \`memory-write.md\` + \`context-update.md\` |\n| **Harness** - modify AGENTS.md, skills, plugins, OpenClaw config | - | \`BLUEPRINT.md\` | \`harness-dev.md\` |`;
}

function domainWorkspaceSection(ctx) {
  if (!ctx.workTypes.length) return "- `/areas/research` - background research, source synthesis, brief production";
  return ctx.workTypes.map((w) => `- \`/areas/${w.workspace}\` - ${w.name}${w.description ? `: ${w.description}` : ""}`).join("\n");
}

function domainRulesSection(ctx) {
  const rules = ctx.orgRules.length ? ctx.orgRules : [
    "Keep domain-wide rules here and project-specific rules in project AGENTS.md.",
    "Do not encode OpenClaw channel/account/peer bindings in AGENTS.md.",
  ];
  return rules.map((r) => `- ${r}`).join("\n");
}

function domainOutOfBoundsSection(ctx) {
  const stops = [
    "Never share materials from one project directory with another project without explicit confirmation.",
    "Never modify memory.db schema directly - use the domain-memory plugin's provided tools.",
    "Never bypass the routing table for heartbeat, channel, or project work.",
    ...ctx.hardStops,
  ];
  return stops.map((s) => `- ${s}`).join("\n");
}

function domainSoul(ctx) {
  return `# Persona: ${ctx.personaName}

**Name:** ${ctx.personaName}
**Domain:** ${ctx.slug}

---

## Voice

Direct and specific. State uncertainty clearly. Ask one concrete question when context is missing.

---

## Identity

I am ${ctx.personaName}, the working memory and operating partner for ${ctx.workerName || "the worker"}'s ${ctx.domainName} domain. ${ctx.whatYouDo || "I carry domain context, project state, routing expectations, and durable memory so work starts oriented."}

${ctx.personaLine || ""}

---

## Relationship to the Worker

${ctx.workerName || "The worker"} makes the calls. I carry context, surface what matters, and turn repeated judgment into reusable operating structure.

---

## When to Push Back

I push back when a request conflicts with recorded memory, violates DOCK.md or project hard stops, asks for irreversible action without approval, or would produce unevidenced claims.
`;
}

function domainMemory(ctx) {
  const lines = [
    "---",
    `domain: ${ctx.slug}`,
    "scope: domain",
    `established: ${ctx.today}`,
    "---",
    "",
    `# Domain Memory - ${ctx.domainName}`,
    "",
    "## Domain Decisions",
    "",
    `[${ctx.today}] #decision DECISION: Initialize ${ctx.domainName} as an OpenClaw-backed framework domain | REASONING: OpenClaw owns runtime routing while the framework owns context, memory, persona, and work routing | CONTEXT: Intake-driven onboarding`,
    "status:active belongs_to:domain related_to:AGENTS.md,DOCK.md",
    "",
    "## Domain Patterns",
    "",
  ];
  for (const w of ctx.workTypes) {
    lines.push(`[${ctx.today}] #pattern PATTERN: ${w.name || w.workspace} uses the ${w.pattern || "workspace"} pattern | EVIDENCE: Selected during onboarding`);
    lines.push(`status:active belongs_to:domain related_to:areas/${w.workspace}/CONTEXT.md`);
    lines.push("");
  }
  lines.push("## Domain Preferences", "");
  if (ctx.impact.goalNarrative) {
    lines.push(`[${ctx.today}] #preference PREFERENCE: Target outcome is ${ctx.impact.goalNarrative.split("\n")[0]} | REASONING: Captured during onboarding`);
    lines.push("status:active belongs_to:domain");
    lines.push("");
  }
  lines.push("## Domain Lessons", "");
  return `${lines.join("\n")}\n`;
}

function domainHeartbeat(ctx) {
  const goalTask = ctx.impact.goalNarrative ? `
- name: goal-review
  interval: 24h
  prompt: "Resolve through the Goal review routing row. If active goals exist and no equivalent review observation has been written for the current review window, compare observed state to each goal definition. If there is a meaningful delta, run the resolver skill and propose the next action. Always write a structured log observation when goal checks run. Otherwise reply HEARTBEAT_OK."
` : "";
  return `# HEARTBEAT.md - ${ctx.slug}

<!-- OpenClaw reads this file during heartbeat turns. Runtime scheduling belongs to OpenClaw; this file defines the recurring work contract for the selected domain agent. -->

tasks:

- name: morning-plan
  interval: 24h
  prompt: "Resolve through the Session start routing row plus any project-specific planning row. If active work exists and no morning plan observation has been written today, review open scratchpad items, deferred tasks, and recent project activity. Produce a short prioritized daily plan only if there is actionable work. Also write a log observation with the plan summary. Otherwise reply HEARTBEAT_OK."

- name: weekly-sync
  interval: 7d
  prompt: "Resolve through the Domain status routing row. If no weekly sync observation has been written for the current week, summarize active projects, flag open items, and note decisions or lessons that should be promoted to MEMORY.md. Also write a structured log observation with project activity counts and pending items. Otherwise reply HEARTBEAT_OK."

- name: stale-project-check
  interval: 7d
  prompt: "Resolve through the Domain status routing row. If any project has no observations in the last 14 days and no stale-project check observation has been written for the current week, list stale projects with last activity date and ask whether to archive, resume, or close. Otherwise reply HEARTBEAT_OK."
${goalTask}
- name: memory-maintenance
  interval: 30m
  prompt: "Resolve through the Session end routing row. Run memory_maintenance to backfill missing embeddings and report memory health. Surface stale scratchpad items only when the worker needs to decide something. Otherwise reply HEARTBEAT_OK."

---

## Heartbeat Contract

OpenClaw parses the \`tasks:\` block above and includes only due tasks in the heartbeat prompt. Before doing due recurring work, resolve through \`AGENTS.md\`, read \`MEMORY.md\`, use domain-memory tools before guessing from stale context, and write structured results when useful. If nothing needs attention, reply \`HEARTBEAT_OK\`.
`;
}

function domainContext(ctx) {
  return `# Domain Context - ${ctx.domainName}

## What This Domain Is

${ctx.whatYouDo || "[Fill in what this domain covers and what it produces.]"}

- **Industry:** ${ctx.industry || "-"}
- **Worker:** ${ctx.workerName || "-"}
- **Tools:** ${ctx.toolsText}

## Domain Scope

**In scope:**
${ctx.workTypes.length ? ctx.workTypes.map((w) => `- ${w.name || w.workspace}: ${w.description || patternDescription(w.pattern)}`).join("\n") : "- [Confirm domain work types]"}

**Out of scope:**
${ctx.hardStops.length ? ctx.hardStops.map((s) => `- ${s}`).join("\n") : "- Work outside this domain without explicit confirmation"}

## Methods and Approaches

- OpenClaw owns runtime routing, gateway, auth, heartbeat execution, and plugin loading.
- This framework owns work routing, context, memory policy, persona, and project structure.
- Every project should inherit domain methods unless a project AGENTS.md row overrides them.

## Active Projects

${projectDir ? `- ${path.basename(projectDir)} - Initial project repo | started ${ctx.today}` : "- Domain setup - Active"}

## Key Constraints

${ctx.hardStops.length ? ctx.hardStops.map((s) => `- ${s}`).join("\n") : "- Confirm hard stops before client-facing work goes live."}
`;
}

function domainClients(ctx) {
  return `# Clients & Stakeholders - ${ctx.domainName}

| Name | Role / Context | Status |
|------|----------------|--------|
| ${ctx.workerName || "[Worker]"} | Domain owner | Active |

## Notes

- **Domain:** ${ctx.domainName}
- **Industry:** ${ctx.industry || "-"}
- **Tools:** ${ctx.toolsText}
`;
}

function projectAgents(ctx) {
  const workspaces = ctx.workTypes.length ? ctx.workTypes.map((w) => `- \`/areas/${w.workspace}\` - ${w.name}${w.description ? `: ${w.description}` : ""}`).join("\n") : "- `/areas/general` - General project work";
  const routing = ctx.workTypes.length ? ctx.workTypes.map((w) => `| **Work on ${w.name || w.workspace}** | /areas/${w.workspace} | \`context/project.md\` + \`areas/${w.workspace}/CONTEXT.md\` | ${patternSkill(w.pattern)} |`).join("\n") : "| **Work** | /areas/general | `context/project.md` + `areas/general/CONTEXT.md` | - |";
  return `# AGENTS.md - ${ctx.domainName} Project Layer

<!-- Project layer. OpenClaw loads the domain workspace first; project work reads this file after the selected domain agent is routed here. -->

## Project

${ctx.whatYouDo || `${ctx.domainName} project initialized from onboarding intake.`}

## Workspaces

${workspaces}

## Routing

| Task Type | Workspace | Read | Load Skills |
|-----------|-----------|------|-------------|
| **Session start** - orient before any work | - | \`context/project.md\` | \`memory-query.md\` |
${routing}
| **Document** - update AGENTS.md, CONTEXT.md, decisions, reference docs | - | \`context/project.md\` | \`doc-authoring.md\` |
| **Status / report** - summarize progress | - | \`context/project.md\` | \`stop-slop.md\` |
| **Session end** - update state and write memory | - | - | \`memory-write.md\` + \`context-update.md\` |

## Project-Specific Rules

${ctx.projectRules.length ? ctx.projectRules.map((r) => `- ${r}`).join("\n") : "- Use domain defaults unless project-specific constraints are added."}

## Out of Bounds

${ctx.hardStops.length ? ctx.hardStops.map((s) => `- ${s}`).join("\n") : "- Never send output externally without review."}
`;
}

function projectContext(ctx) {
  return `# Project

## What It Is

${ctx.whatYouDo || `${ctx.domainName} project initialized from onboarding intake.`}

## Who It's For

${ctx.workerName || "The domain owner"} and stakeholders in the ${ctx.domainName} domain.

## What Success Looks Like

${ctx.impact.goalNarrative || "[Confirm success criteria]"}
${ctx.impact.timeSaved ? `\nEstimated impact: ${ctx.impact.timeSaved}` : ""}
${ctx.impact.urgency ? `\nUrgency: ${ctx.impact.urgency}` : ""}

## Scope

**In scope:**
${ctx.workTypes.length ? ctx.workTypes.map((w) => `- ${w.name || w.workspace}`).join("\n") : "- Confirm project work types"}

**Out of scope:**
${ctx.hardStops.length ? ctx.hardStops.map((s) => `- ${s}`).join("\n") : "- Anything outside the installed domain without confirmation"}

## Key Constraints

${ctx.hardStops.length ? ctx.hardStops.map((s) => `- ${s}`).join("\n") : "- Confirm hard stops before production use."}

## Current Phase

Initial setup - ${ctx.today}
`;
}

function clientContext(ctx) {
  return `# Client

## Who They Are

${ctx.domainName} / ${ctx.workerName || "domain owner"}

## What They Care About

${ctx.whatToFix ? `- ${ctx.whatToFix}` : "- Useful, specific outputs that reduce repeated manual work."}

## Delivery Standards

- Produce immediately usable outputs.
- Cite or name source context before drawing conclusions.
- Flag uncertainty explicitly.
`;
}

function stackContext(ctx) {
  const rows = ctx.tools.length ? ctx.tools.map((t) => `| Tool | ${t} | Captured during onboarding |`).join("\n") : "| Tool | [Confirm tools] | Add during review |";
  return `# Stack

## Core Technologies

| Layer | Tool | Notes |
|-------|------|-------|
${rows}

## Infrastructure

OpenClaw handles runtime routing, gateway, heartbeat, plugin loading, and agent invocation. The framework handles domain/project context and work routing.

## What to Avoid

${ctx.hardStops.length ? ctx.hardStops.map((s) => `- ${s}`).join("\n") : "- Do not add runtime responsibilities to project instructions."}
`;
}

function decisionsContext(ctx) {
  return `# Decision Log

---

[${ctx.today}] DECISION: Set up ${ctx.domainName} through the streamlined OpenClaw onboarding flow | REASONING: OpenClaw owns runtime readiness and install.sh owns framework provisioning | CONTEXT: Intake JSON generated by the onboarding wizard
`;
}

function projectMemory(ctx) {
  return `# Long-Term Memory - ${ctx.domainName}

## Decisions

#decision [[domain-setup]] ${ctx.domainName} project initialized ${ctx.today}.

## Patterns

${ctx.workTypes.map((w) => `#pattern [[${w.workspace}]] ${w.name || w.workspace} uses ${w.pattern || "the configured"} pattern.`).join("\n")}

## Preferences

#preference [[output-format]] Keep outputs concise, specific, and immediately usable.
`;
}

function workspaceContext(w, ctx) {
  return `# CONTEXT.md - ${w.name || w.workspace}

Last updated: ${ctx.today}

## What This Workspace Is For

${w.description || patternDescription(w.pattern)}

**Pattern:** ${w.pattern || "-"}

## How This Agent Helps

${patternDescription(w.pattern)}

## Tools & Inputs

${ctx.tools.length ? ctx.tools.map((t) => `- ${t}`).join("\n") : "- [Confirm tools and data sources]"}

## Current State

- Status: Active
- Last session: -
- Next action: Review and confirm this workspace context.

## Open Questions

- [ ] Confirm whether this workspace needs project-specific routing overrides.
`;
}

function postInstallChecklist(ctx) {
  return `# Post-Install Checklist - ${ctx.domainName}

- [ ] Run \`openclaw --version\` and confirm OpenClaw is installed.
- [ ] Run \`openclaw config validate\`.
- [ ] Run \`openclaw agents list\` and confirm \`${ctx.slug}\` points to \`~/.openclaw/workspaces/${ctx.slug}\`.
- [ ] Run \`openclaw agent --agent ${ctx.slug} --message "status" --local\`.
- [ ] Confirm \`AGENTS.md\` contains both global and domain layers.
- [ ] Review project routing rows and workspace \`CONTEXT.md\` files.
- [ ] Confirm \`HEARTBEAT.md\` uses OpenClaw native \`tasks:\` entries.
- [ ] Use \`domain_info\` or \`domain_status\` from an agent turn to check the memory plugin.
- [ ] Review \`DOCK.md\` against hard stops and export boundaries.
- [ ] Confirm secrets stay in env/config only, not committed files.
- [ ] Commerce remains disabled unless explicitly enabled with restricted keys and approval gates.
`;
}

function patternSkill(pattern) {
  const p = (pattern || "").toLowerCase();
  if (p === "generation" || p === "drafting") return "`stop-slop.md`";
  if (p === "orchestration") return "`doc-authoring.md`";
  if (p === "monitoring") return "`domain-status.md`";
  return "-";
}

function patternDescription(pattern) {
  const p = (pattern || "").toLowerCase();
  if (p === "monitoring") return "Watches for conditions, changes, or thresholds and surfaces alerts when they occur.";
  if (p === "extraction") return "Reads documents, messages, or structured data and extracts the key information.";
  if (p === "validation") return "Checks data, documents, or outputs against defined rules and flags exceptions.";
  if (p === "classification") return "Routes, tags, or sorts incoming work into the right bucket for action.";
  if (p === "orchestration") return "Coordinates a multi-step process, tracks state, and surfaces blockers.";
  if (p === "generation") return "Drafts documents, reports, or structured outputs from source material.";
  return "Supports this workspace using the project routing row and current context.";
}

function splitLines(value) {
  return clean(value).split(/\r?\n|,/).map((s) => clean(s)).filter(Boolean);
}

function clean(value) {
  return String(value ?? "").trim();
}

function slugify(value) {
  return clean(value).toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

function ensureDir(dir) {
  fs.mkdirSync(dir, { recursive: true });
}

function writeFile(file, content) {
  ensureDir(path.dirname(file));
  fs.writeFileSync(file, content, "utf8");
}

function readIfExists(file) {
  try {
    return fs.readFileSync(file, "utf8");
  } catch {
    return "";
  }
}
