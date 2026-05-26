#!/usr/bin/env node
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

function usage() {
  console.error(
    `Usage: node scripts/apply-intake.mjs --intake-json <file> [--workspace-dir <dir>] [--project-filter <slug>] [--template-dir <dir>]`
  );
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

if (!opts["intake-json"]) usage();

const DEFAULT_WORKSPACE = path.join(os.homedir(), ".openclaw", "workspace");
const intakePath = path.resolve(opts["intake-json"]);
const workspaceDir = path.resolve(opts["workspace-dir"] || DEFAULT_WORKSPACE);
const projectFilter = opts["project-filter"] || "";
const today = new Date().toISOString().slice(0, 10);

const raw = JSON.parse(fs.readFileSync(intakePath, "utf8"));
const state = migrateToV4(raw);
const ctx = buildContext(state);

applyDomain(workspaceDir, ctx);

for (const project of ctx.projects) {
  if (projectFilter && project.slug !== projectFilter) continue;
  applyProject(workspaceDir, project, ctx);
}

// ─── MIGRATION ───────────────────────────────────────────────────────────────

function migrateToV4(d) {
  const ver = d?.meta?.schemaVersion;
  if (ver === 4) return d;

  // v3: has workTypes[], no projects[]
  if (ver === 3 || (!ver && d?.workTypes)) {
    const projectSlug = d?.setup?.projectSlug || "initial-project";
    return {
      meta: { schemaVersion: 4, savedAt: d?.meta?.savedAt || null },
      identity: d?.identity || {},
      setup: {
        slug: d?.setup?.slug || "",
        personaName: d?.setup?.personaName || "",
        persona: d?.setup?.persona || "",
        orgRules: d?.setup?.orgRules || "",
        hardStops: d?.setup?.hardStops || "",
      },
      impact: d?.impact || {},
      projects: [
        {
          id: "p-migrated",
          name: projectSlug,
          slug: slugify(projectSlug),
          whatItIs: d?.identity?.whatYouDo || "",
          whoItsFor: d?.identity?.workerName || "",
          successCriteria: d?.impact?.goalNarrative || "",
          scopeIn: "",
          scopeOut: "",
          constraints: d?.setup?.hardStops || "",
          phase: "",
          client: { name: "", contact: "", priorities: "", delivery: "" },
          stack: d?.identity?.tools || "",
          projectRules: d?.setup?.projRules || "",
          areas: (Array.isArray(d?.workTypes) ? d.workTypes : []).map((w) => ({
            id: w.id || newId(),
            name: clean(w.name),
            slug: slugify(w.workspace || w.name || "area"),
            purpose: clean(w.description),
            pattern: clean(w.pattern),
            functions: "",
            workflow: "",
            standards: "",
            successCriteria: "",
            skills: "",
            references: "",
          })),
        },
      ],
      workTypes: [],
    };
  }

  // v2: has intake/harness/agents shape
  if (d?.meta?.schemaVersion === 2 || (d?.intake && d?.harness)) {
    const intake = d.intake || {};
    const harness = d.harness || {};
    const synth = d.synthesis || {};
    return migrateToV4({
      meta: { schemaVersion: 3 },
      identity: {
        workerName: harness.personaName || "",
        domainName: intake.companyName || harness.slug || "",
        whatYouDo: harness.projDesc || "",
        industry: intake.industryVertical || "",
        whatToFix: intake.primaryPain || intake.triggerNow || "",
        tools: [intake.erpSystem, intake.wmsSystem, intake.tmsSystem].filter(Boolean).join(", "),
      },
      workTypes: (d.agents || []).map((a) => ({
        id: a.id || newId(),
        name: a.agentName || a.name || "",
        description: a.agentPurpose || a.purpose || "",
        pattern: a.agentPattern || a.pattern || "",
        workspace: slugify(a.agentName || a.name || "workspace"),
      })),
      impact: {
        goalNarrative: synth.ebitdaImpact ? `${synth.ebitdaImpact}${synth.payback ? ", payback " + synth.payback : ""}` : "",
        timeSaved: synth.manualHoursDisplaced || "",
        urgency: "",
      },
      setup: {
        slug: harness.slug || slugify(intake.companyName) || "",
        personaName: harness.personaName || "",
        persona: harness.persona || "",
        projectSlug: harness.projectSlug || harness.projectDir || "",
        orgRules: harness.orgRules || "",
        projRules: harness.projRules || "",
        hardStops: harness.oob || "",
      },
    });
  }

  // fallback: treat as blank v4
  return {
    meta: { schemaVersion: 4, savedAt: null },
    identity: {},
    setup: {},
    impact: {},
    projects: [],
    workTypes: [],
  };
}

// ─── CONTEXT ─────────────────────────────────────────────────────────────────

function buildContext(input) {
  const identity = input.identity || {};
  const setup = input.setup || {};
  const impact = input.impact || {};

  const domainName = clean(identity.domainName || setup.slug || "domain");
  const slug = slugify(setup.slug || domainName);
  const tools = splitLines(identity.tools);
  const hardStops = splitLines(setup.hardStops);
  const orgRules = splitLines(setup.orgRules);

  const projects = (Array.isArray(input.projects) ? input.projects : [])
    .map((p) => ({
      id: p.id || newId(),
      name: clean(p.name),
      slug: slugify(p.slug || p.name || "project"),
      whatItIs: clean(p.whatItIs),
      whoItsFor: clean(p.whoItsFor),
      successCriteria: clean(p.successCriteria),
      scopeIn: clean(p.scopeIn),
      scopeOut: clean(p.scopeOut),
      constraints: clean(p.constraints),
      phase: clean(p.phase),
      client: {
        name: clean(p.client?.name),
        contact: clean(p.client?.contact),
        priorities: clean(p.client?.priorities),
        delivery: clean(p.client?.delivery),
      },
      stack: clean(p.stack),
      projectRules: splitLines(p.projectRules),
      areas: (Array.isArray(p.areas) ? p.areas : [])
        .map((a) => ({
          id: a.id || newId(),
          name: clean(a.name),
          slug: slugify(a.slug || a.name || "area"),
          purpose: clean(a.purpose),
          pattern: clean(a.pattern),
          functions: splitLines(a.functions),
          workflow: splitLines(a.workflow),
          standards: splitLines(a.standards),
          successCriteria: clean(a.successCriteria),
          skills: splitLines(a.skills),
          references: splitLines(a.references),
        }))
        .filter((a) => a.slug),
    }))
    .filter((p) => p.slug);

  // Legacy compat: flat workTypes list derived from all areas (used by domain generators)
  const workTypes = projects.flatMap((p) =>
    p.areas.map((a) => ({
      name: a.name,
      description: a.purpose,
      pattern: a.pattern,
      workspace: a.slug,
    }))
  );

  return {
    workerName: clean(identity.workerName),
    domainName,
    slug,
    whatYouDo: clean(identity.whatYouDo),
    industry: clean(identity.industry),
    whatToFix: clean(identity.whatToFix),
    tools,
    toolsText: tools.length ? tools.join(", ") : "-",
    hardStops,
    orgRules,
    projects,
    workTypes,
    impact: {
      goalNarrative: clean(impact.goalNarrative),
      timeSaved: clean(impact.timeSaved),
      urgency: clean(impact.urgency),
    },
    today,
  };
}

// ─── DOMAIN LAYER ────────────────────────────────────────────────────────────

function applyDomain(dir, ctx) {
  // Template-owned files only. SOUL.md / HEARTBEAT.md / USER.md / IDENTITY.md
  // are OpenClaw-owned; the wizard never writes into them. See ADR 0004.
  ensureDir(path.join(dir, "context"));
  rewriteDomainAgents(path.join(dir, "AGENTS.md"), ctx);
  writeIfNew(path.join(dir, "MEMORY.md"), domainMemory(ctx));
  writeIfNew(path.join(dir, "context", "domain.md"), domainContext(ctx));
  writeIfNew(path.join(dir, "context", "clients.md"), domainClients(ctx));
  applyDock(path.join(dir, "DOCK.md"), ctx);
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

// ─── DOMAIN SECTION GENERATORS ───────────────────────────────────────────────

function domainIdentitySection(ctx) {
  return ctx.whatYouDo || `${ctx.domainName} is a ${ctx.industry || "knowledge work"} domain that supports ${ctx.workerName || "the worker"} with structured, repeatable work.`;
}

function domainVocabularySection(ctx) {
  const rows = [
    `| Domain | ${ctx.domainName} — the body of work this agent supports |`,
    "| Project | A scoped body of work with its own AGENTS.md, context/, and areas/ |",
    "| Area | A focused workspace inside a project with its own CONTEXT.md and routing row |",
  ];
  for (const w of ctx.workTypes) rows.push(`| ${w.name || w.workspace} | ${w.description || patternDescription(w.pattern)} |`);
  return `| Term | Definition |\n|------|-----------|\n${rows.join("\n")}`;
}

function domainMethodsSection(ctx) {
  const methods = [
    "Resolve every task through AGENTS.md before acting.",
    "Read the relevant CONTEXT.md before producing output for an area.",
    "Use OpenClaw for runtime routing and this framework for work routing.",
  ];
  if (ctx.whatToFix) methods.push(`Prioritize fixing this current friction: ${ctx.whatToFix}`);
  return methods.map((m) => `- ${m}`).join("\n");
}

function domainRoutingSection(ctx) {
  const workRows = ctx.workTypes.map(
    (w) =>
      `| **Work on ${w.name || w.workspace}** | projects/<slug>/areas/${w.workspace} | project context + areas/${w.workspace}/CONTEXT.md | ${patternSkill(w.pattern)} |`
  );
  return [
    "| Task Type | Workspace | Read | Load Skills |",
    "|-----------|-----------|------|-------------|",
    "| **Session start** — orient before any work | - | `MEMORY.md` + `HEARTBEAT.md` when recurring | `memory-query.md` |",
    "| **Heartbeat** — recurring proactive check | - | `HEARTBEAT.md` + `MEMORY.md` | `memory-query.md` + `domain-status.md` |",
    "| **Domain status** — cross-project summary | - | `MEMORY.md` | `domain-status.md` |",
    "| **Goal review** — check goals against observed state | - | `MEMORY.md` + `HEARTBEAT.md` | `goals-resolver.md` |",
    ...workRows,
    "| **Session end** — update state and write memory | - | - | `memory-write.md` + `context-update.md` |",
    "| **Harness** — modify AGENTS.md, skills, plugins, OC config | - | `BLUEPRINT.md` | `harness-dev.md` |",
  ].join("\n");
}

function domainWorkspaceSection(ctx) {
  if (!ctx.projects.length) return "- `projects/<slug>/` — project workspaces; each has areas/ with routing and context";
  return ctx.projects
    .flatMap((p) =>
      p.areas.map((a) => `- \`projects/${p.slug}/areas/${a.slug}\` — ${a.name}${a.purpose ? `: ${a.purpose.split("\n")[0]}` : ""}`)
    )
    .join("\n");
}

function domainRulesSection(ctx) {
  const rules = ctx.orgRules.length
    ? ctx.orgRules
    : ["Keep domain-wide rules here and project-specific rules in project AGENTS.md.", "Do not encode OpenClaw channel/account/peer bindings in AGENTS.md."];
  return rules.map((r) => `- ${r}`).join("\n");
}

function domainOutOfBoundsSection(ctx) {
  const stops = [
    "Never share materials from one project directory with another without explicit confirmation.",
    "Never modify memory.db schema directly — use the domain-memory plugin's provided tools.",
    "Never bypass the routing table for heartbeat, channel, or project work.",
    ...ctx.hardStops,
  ];
  return stops.map((s) => `- ${s}`).join("\n");
}

function domainMemory(ctx) {
  const lines = [
    "---",
    `domain: ${ctx.slug}`,
    "scope: domain",
    `established: ${ctx.today}`,
    "---",
    "",
    `# Domain Memory — ${ctx.domainName}`,
    "",
    "## Domain Decisions",
    "",
    `[${ctx.today}] #decision DECISION: Initialize ${ctx.domainName} as an OpenClaw-backed framework domain | REASONING: OpenClaw owns runtime routing while the framework owns context, memory, persona, and work routing | CONTEXT: Intake-driven onboarding`,
    "status:active belongs_to:domain related_to:AGENTS.md,DOCK.md",
    "",
    "## Domain Patterns",
    "",
  ];
  for (const p of ctx.projects) {
    for (const a of p.areas) {
      lines.push(
        `[${ctx.today}] #pattern PATTERN: ${a.name || a.slug} uses the ${a.pattern || "workspace"} pattern | EVIDENCE: Selected during onboarding`
      );
      lines.push(`status:active belongs_to:domain related_to:projects/${p.slug}/areas/${a.slug}/CONTEXT.md`);
      lines.push("");
    }
  }
  lines.push("## Domain Preferences", "");
  if (ctx.impact.goalNarrative) {
    lines.push(
      `[${ctx.today}] #preference PREFERENCE: Target outcome is ${ctx.impact.goalNarrative.split("\n")[0]} | REASONING: Captured during onboarding`
    );
    lines.push("status:active belongs_to:domain");
    lines.push("");
  }
  lines.push("## Domain Lessons", "");
  return `${lines.join("\n")}\n`;
}

function domainContext(ctx) {
  const scopeItems = ctx.projects.flatMap((p) =>
    p.areas.map((a) => `- **${a.name || a.slug}** (${p.name}): ${a.purpose || patternDescription(a.pattern)}`)
  );
  return `# Domain Context — ${ctx.domainName}

## What This Domain Is

${ctx.whatYouDo || "[Fill in what this domain covers and what it produces.]"}

- **Industry:** ${ctx.industry || "-"}
- **Worker:** ${ctx.workerName || "-"}
- **Tools:** ${ctx.toolsText}

## Domain Scope

**In scope:**
${scopeItems.length ? scopeItems.join("\n") : "- [Confirm domain work types]"}

**Out of scope:**
${ctx.hardStops.length ? ctx.hardStops.map((s) => `- ${s}`).join("\n") : "- Work outside this domain without explicit confirmation"}

## Methods and Approaches

- OpenClaw owns runtime routing, gateway, auth, heartbeat execution, and plugin loading.
- This framework owns work routing, context, memory policy, persona, and project structure.
- Every project should inherit domain methods unless a project AGENTS.md row overrides them.

## Active Projects

${ctx.projects.length ? ctx.projects.map((p) => `- **${p.name}** (\`projects/${p.slug}/\`) — ${p.whatItIs || "initialized from intake"}`).join("\n") : "- Domain setup — Active"}

## Key Constraints

${ctx.hardStops.length ? ctx.hardStops.map((s) => `- ${s}`).join("\n") : "- Confirm hard stops before client-facing work goes live."}
`;
}

function domainClients(ctx) {
  const clientRows = ctx.projects
    .filter((p) => p.client?.name)
    .map((p) => `| ${p.client.name} | ${p.client.contact || "-"} | ${p.name} | Active |`);

  return `# Clients & Stakeholders — ${ctx.domainName}

| Name | Contact | Project | Status |
|------|---------|---------|--------|
| ${ctx.workerName || "[Worker]"} | — | Domain owner | Active |
${clientRows.join("\n")}

## Domain Communication Standards

- Produce immediately usable outputs.
- Cite or name source context before drawing conclusions.
- Flag uncertainty explicitly rather than papering over it.
`;
}

// ─── PROJECT LAYER ───────────────────────────────────────────────────────────

function applyProject(workspaceDir, project, ctx) {
  const projectDir = path.join(workspaceDir, "projects", project.slug);
  ensureDir(path.join(projectDir, "context"));
  ensureDir(path.join(projectDir, "memory"));
  ensureDir(path.join(projectDir, "areas"));
  writeFile(path.join(projectDir, "AGENTS.md"), projectAgents(project, ctx));
  writeFile(path.join(projectDir, "context", "project.md"), projectContext(project, ctx));
  writeFile(path.join(projectDir, "context", "client.md"), clientContext(project, ctx));
  writeFile(path.join(projectDir, "context", "stack.md"), stackContext(project, ctx));
  writeFile(path.join(projectDir, "context", "decisions.md"), decisionsContext(project, ctx));
  writeFile(path.join(projectDir, "memory", "MEMORY.md"), projectMemory(project, ctx));
  for (const area of project.areas) {
    const areaDir = path.join(projectDir, "areas", area.slug);
    ensureDir(areaDir);
    writeFile(path.join(areaDir, "CONTEXT.md"), workspaceContext(area, project, ctx));
  }
  writeFile(path.join(projectDir, "POST-INSTALL-CHECKLIST.md"), postInstallChecklist(ctx));
  console.log(`  ✓ project: projects/${project.slug}/ (${project.areas.length} area${project.areas.length !== 1 ? "s" : ""})`);
}

function projectAgents(project, ctx) {
  const workspaces = project.areas.length
    ? project.areas
        .map((a) => {
          const purposeLine = a.purpose ? a.purpose.split("\n")[0] : patternDescription(a.pattern);
          return `- \`/areas/${a.slug}\` — ${a.name}: ${purposeLine}`;
        })
        .join("\n")
    : "- `/areas/general` — General project work";

  const routing = project.areas.length
    ? project.areas
        .map((a) => {
          const skillsStr = a.skills.length
            ? a.skills.map((s) => `\`${s.replace(/\.md$/, "")}.md\``).join(" + ")
            : patternSkill(a.pattern);
          const whenNote = a.successCriteria ? ` — target: ${a.successCriteria}` : "";
          return `| **Work on ${a.name || a.slug}**${whenNote} | /areas/${a.slug} | \`context/project.md\` + \`areas/${a.slug}/CONTEXT.md\` | ${skillsStr} |`;
        })
        .join("\n")
    : "| **Work** | /areas/general | `context/project.md` + `areas/general/CONTEXT.md` | - |";

  return `# AGENTS.md — ${project.name || ctx.domainName} Project Layer

<!-- Project layer. OpenClaw loads the domain workspace first; project work reads this file after the selected domain agent is routed here. -->

## Project

${project.whatItIs || `${ctx.domainName} project initialized from onboarding intake.`}

## Areas

${workspaces}

## Routing

| Task Type | Area | Read | Load Skills |
|-----------|------|------|-------------|
| **Session start** — orient before any work | - | \`context/project.md\` | \`memory-query.md\` |
${routing}
| **Document** — update AGENTS.md, CONTEXT.md, decisions, reference docs | - | \`context/project.md\` | \`doc-authoring.md\` |
| **Status / report** — summarize progress | - | \`context/project.md\` | \`stop-slop.md\` |
| **Session end** — update state and write memory | - | - | \`memory-write.md\` + \`context-update.md\` |

## Project-Specific Rules

${project.projectRules.length ? project.projectRules.map((r) => `- ${r}`).join("\n") : "- Use domain defaults unless project-specific constraints are added here."}

## Out of Bounds

${ctx.hardStops.length ? ctx.hardStops.map((s) => `- ${s}`).join("\n") : "- Never send output externally without review.\n- Never take irreversible action without explicit confirmation."}
`;
}

function projectContext(project, ctx) {
  const scopeIn = project.areas.length
    ? project.areas.map((a) => `- **${a.name || a.slug}**: ${a.purpose || patternDescription(a.pattern)}`).join("\n")
    : project.scopeIn
      ? project.scopeIn.split("\n").map((s) => `- ${s.trim()}`).filter(Boolean).join("\n")
      : "- [Confirm project scope]";

  const scopeOut = project.scopeOut
    ? project.scopeOut.split("\n").map((s) => `- ${s.trim()}`).filter(Boolean).join("\n")
    : ctx.hardStops.length
      ? ctx.hardStops.map((s) => `- ${s}`).join("\n")
      : "- Anything outside confirmed scope without explicit approval";

  const constraints = project.constraints
    ? project.constraints.split("\n").map((s) => `- ${s.trim()}`).filter(Boolean).join("\n")
    : ctx.hardStops.length
      ? ctx.hardStops.map((s) => `- ${s}`).join("\n")
      : "- [Confirm project constraints]";

  return `# Project — ${project.name || ctx.domainName}

## What It Is

${project.whatItIs || `${ctx.domainName} project initialized from intake.`}

## Who It's For

${project.whoItsFor || (project.client?.name ? `${project.client.name}${project.client.priorities ? " — " + project.client.priorities : ""}` : ctx.workerName || "Domain owner")}

## What Success Looks Like

${project.successCriteria || ctx.impact.goalNarrative || "[Confirm success criteria]"}
${ctx.impact.timeSaved ? `\nEstimated impact: ${ctx.impact.timeSaved}` : ""}
${ctx.impact.urgency ? `Urgency: ${ctx.impact.urgency}` : ""}

## Scope

**In scope:**
${scopeIn}

**Out of scope:**
${scopeOut}

## Key Constraints

${constraints}

## Current Phase

${project.phase || `Initial setup — ${ctx.today}`}
`;
}

function clientContext(project, ctx) {
  const c = project.client || {};
  return `# Client — ${project.name || ctx.domainName}

## Who They Are

${c.name || ctx.domainName} ${c.contact ? `/ ${c.contact}` : ""}

## What They Care About

${c.priorities ? c.priorities.split("\n").map((s) => `- ${s.trim()}`).filter(Boolean).join("\n") : project.whatItIs ? `- ${project.whatItIs}` : "- Useful, specific outputs that reduce repeated manual work."}

## Delivery Standards

${c.delivery ? c.delivery.split("\n").map((s) => `- ${s.trim()}`).filter(Boolean).join("\n") : `- Produce immediately usable outputs.\n- Cite or name source context before drawing conclusions.\n- Flag uncertainty explicitly.`}
`;
}

function stackContext(project, ctx) {
  const stackItems = (project.stack || ctx.toolsText !== "-" ? project.stack || "" : "")
    .split(/,|\n/)
    .map((s) => s.trim())
    .filter(Boolean);
  const toolItems = stackItems.length ? stackItems : ctx.tools;
  const rows = toolItems.length
    ? toolItems.map((t) => `| Tool | ${t} | — |`).join("\n")
    : "| Tool | [Confirm tools and data sources] | — |";

  return `# Stack — ${project.name || ctx.domainName}

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

function decisionsContext(project, ctx) {
  return `# Decision Log — ${project.name || ctx.domainName}

---

[${ctx.today}] DECISION: Set up ${project.name || ctx.domainName} through the streamlined OpenClaw onboarding flow | REASONING: OpenClaw owns runtime readiness and install.sh owns framework provisioning | CONTEXT: Intake JSON generated by the onboarding wizard
`;
}

function projectMemory(project, ctx) {
  return `# Long-Term Memory — ${project.name || ctx.domainName}

## Decisions

#decision [[project-setup]] ${project.name || ctx.domainName} initialized ${ctx.today}.

## Patterns

${project.areas.map((a) => `#pattern [[${a.slug}]] ${a.name || a.slug} uses ${a.pattern || "the configured"} pattern.`).join("\n") || "#pattern [[general]] No areas defined — add areas and patterns as the project evolves."}

## Preferences

#preference [[output-format]] Keep outputs concise, specific, and immediately usable.
`;
}

// ─── AREA / WORKSPACE CONTEXT ────────────────────────────────────────────────

function workspaceContext(area, project, ctx) {
  const purposeBlock = area.purpose || patternDescription(area.pattern);
  const successLine = area.successCriteria ? `\n**Success looks like:** ${area.successCriteria}` : "";

  const functionsBlock = area.functions.length
    ? area.functions.map((f) => `- ${f}`).join("\n")
    : "- [Define the distinct operations this area handles — specific inputs and outputs]";

  const workflowBlock = area.workflow.length
    ? area.workflow.map((step, i) => `${i + 1}. ${step}`).join("\n")
    : `1. [First step — what triggers it and what the agent does]\n2. [Confirmation or gate before proceeding]\n3. [Completion condition — what "done" means for work in this area]`;

  const standardsBlock = area.standards.length
    ? area.standards.map((s) => `- ${s}`).join("\n")
    : "- [Add hard rules specific to this area — format requirements, quality bar, things to always or never do here]";

  const skillsList = area.skills.length
    ? area.skills
        .map((s) => {
          const name = s.replace(/\.md$/, "");
          return `- \`${name}.md\` — loaded by routing row for this area`;
        })
        .join("\n")
    : (() => {
        const fallback = patternSkill(area.pattern);
        return fallback !== "-"
          ? `- ${fallback} — default for the ${area.pattern} pattern`
          : "- [Add skills that should load when work routes to this area]";
      })();

  const refsBlock = area.references.length
    ? area.references.map((r) => `- ${r}`).join("\n")
    : "- [Add key files and external resources the agent should know about when working here]";

  return `# ${area.name || area.slug} — Context

Last updated: ${ctx.today}

## Purpose

${purposeBlock}${successLine}

---

## Functions

${functionsBlock}

---

## Workflow

${workflowBlock}

---

## Standards and Conventions

${standardsBlock}

---

## Current State

**Done:**
- Domain and project context initialized ${ctx.today}

**In Progress:**
- Review and confirm this CONTEXT.md reflects actual operations

**Queued:**
- Complete first workflow run through this area

**Blocked:**
- *(none)*

---

## Skills Active Here

${skillsList}

---

## Key References

${refsBlock}

---

## Session Navigation

Use /tree to view and branch the conversation when parallel workstreams emerge mid-session.
Label branches to distinguish by purpose (research, drafting, review, comms).
Branches are ephemeral — only promote work to Current State when ready to track.
`;
}

// ─── CHECKLIST ───────────────────────────────────────────────────────────────

function postInstallChecklist(ctx) {
  const projectItems = ctx.projects
    .map(
      (p) =>
        `- [ ] Review \`projects/${p.slug}/AGENTS.md\` routing rows and area CONTEXT.md files.\n` +
        p.areas.map((a) => `- [ ] Confirm \`projects/${p.slug}/areas/${a.slug}/CONTEXT.md\` Functions/Workflow/Standards are filled.`).join("\n")
    )
    .join("\n");

  return `# Post-Install Checklist — ${ctx.domainName}

- [ ] Run \`openclaw --version\` and confirm OpenClaw is installed.
- [ ] Run \`openclaw config validate\`.
- [ ] Run \`openclaw agents list\` and confirm the domain agent is registered.
- [ ] Run \`openclaw agent --agent main --message "status" --local\`.
- [ ] Confirm \`AGENTS.md\` contains both global and domain layers.
- [ ] Use \`domain_info\` or \`domain_status\` from an agent turn to check the memory plugin.
- [ ] Review \`DOCK.md\` against hard stops and export boundaries.
- [ ] Confirm secrets stay in env/config only, not committed files.
- [ ] Commerce remains disabled unless explicitly enabled with restricted keys and approval gates.
${projectItems ? "\n## Project Checks\n\n" + projectItems : ""}
`;
}

// ─── HELPERS ─────────────────────────────────────────────────────────────────

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
  if (p === "extraction") return "Reads documents, messages, or structured data and extracts key information.";
  if (p === "validation") return "Checks data, documents, or outputs against defined rules and flags exceptions.";
  if (p === "classification") return "Routes, tags, or sorts incoming work into the right bucket for action.";
  if (p === "orchestration") return "Coordinates a multi-step process, tracks state, and surfaces blockers.";
  if (p === "generation") return "Drafts documents, reports, or structured outputs from source material.";
  return "Supports this area using the project routing row and current context.";
}

function splitLines(value) {
  if (!value) return [];
  return String(value)
    .split(/\r?\n|,/)
    .map((s) => clean(s))
    .filter(Boolean);
}

function clean(value) {
  return String(value ?? "").trim();
}

function slugify(value) {
  return clean(value)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

function newId() {
  return "id-" + Math.random().toString(36).slice(2, 9);
}

function ensureDir(dir) {
  fs.mkdirSync(dir, { recursive: true });
}

function writeFile(file, content) {
  ensureDir(path.dirname(file));
  fs.writeFileSync(file, content, "utf8");
}

function writeIfNew(file, content) {
  if (fs.existsSync(file)) return;
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
