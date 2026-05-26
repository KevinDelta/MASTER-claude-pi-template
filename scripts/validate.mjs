#!/usr/bin/env node
/* Validate an installed OpenClaw domain workspace.
 *
 * Usage:
 *   node scripts/validate.mjs --workspace-dir <path> [--domain <slug>]
 *   ./install.sh --validate --domain <name>
 *
 * --workspace-dir defaults to ~/.openclaw/workspace (OC's native workspace)
 * --domain is optional; used for reporting and agent-registration check only
 *
 * Exit codes:
 *   0  all checks passed (warnings allowed)
 *   1  one or more checks failed
 *   2  bad invocation
 */

import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { execSync } from "node:child_process";

const args = process.argv.slice(2);
const opts = {};
for (let i = 0; i < args.length; i += 1) {
  const arg = args[i];
  if (!arg.startsWith("--")) usage();
  const key = arg.slice(2);
  const val = args[i + 1];
  if (!val || val.startsWith("--")) { opts[key] = true; continue; }
  opts[key] = val;
  i += 1;
}

const DEFAULT_WORKSPACE = path.join(os.homedir(), ".openclaw", "workspace");
const workspaceDir = path.resolve(opts["workspace-dir"] || DEFAULT_WORKSPACE);
const domainSlug = opts["domain"] || null;

const results = [];

// Template-owned files our installer adds — must exist after install runs.
// OpenClaw-owned bootstrap files (SOUL.md, HEARTBEAT.md, USER.md, IDENTITY.md, TOOLS.md)
// are checked by checkDomainInstalled() below; they are not author-required by us.
const FRAMEWORK_FILES = ["AGENTS.md", "MEMORY.md", "DOCK.md", "context/domain.md", ".env"];

const REQUIRED_FILES = [...FRAMEWORK_FILES];

function pass(label, detail) { results.push({ kind: "pass", label, detail }); }
function warn(label, detail) { results.push({ kind: "warn", label, detail }); }
function fail(label, detail) { results.push({ kind: "fail", label, detail }); }

if (!fs.existsSync(workspaceDir) || !fs.statSync(workspaceDir).isDirectory()) {
  fail(
    "workspace exists",
    `Not found: ${workspaceDir}\n        OpenClaw has not been initialized yet.\n        Run: openclaw onboard\n        Then re-run the installer: install.sh --domain <name> --persona <name>`,
  );
  printAndExit();
} else {
  pass("workspace exists", workspaceDir);
}

for (const rel of REQUIRED_FILES) {
  const full = path.join(workspaceDir, rel);
  if (!fs.existsSync(full)) {
    fail(`required file: ${rel}`, `missing: ${full}`);
    continue;
  }
  const content = fs.readFileSync(full, "utf8");
  if (!content.trim()) {
    fail(`required file: ${rel}`, `empty: ${full}`);
    continue;
  }
  pass(`required file: ${rel}`, `${full} (${content.length} bytes)`);
}

checkAnnotations(workspaceDir);
checkEnv(workspaceDir);
checkRoutingTable(workspaceDir);
checkDomainInstalled(workspaceDir);
checkMemoryDb(workspaceDir);
checkAgentRegistered(domainSlug);

printAndExit();

/* ───────────────────────────────────────────────── checks ─── */

function checkAnnotations(dir) {
  const filesToScan = REQUIRED_FILES.filter((f) => f !== ".env");
  const stragglers = [];
  for (const rel of filesToScan) {
    const full = path.join(dir, rel);
    if (!fs.existsSync(full)) continue;
    const content = fs.readFileSync(full, "utf8");
    const lines = content.split("\n");
    let inBlock = false;
    let blockStart = -1;
    lines.forEach((line, idx) => {
      if (!inBlock && line.includes("<!--")) {
        inBlock = true;
        blockStart = idx + 1;
      }
      if (inBlock && line.includes("-->")) {
        const lineCount = idx + 1 - blockStart + 1;
        if (lineCount > 1 || (lines[blockStart - 1] || "").length > 80) {
          stragglers.push(`${rel}:${blockStart}`);
        }
        inBlock = false;
      }
    });
  }
  if (stragglers.length) {
    warn("annotation cleanup", `Remove guidance comments from: ${stragglers.join(", ")}`);
  } else {
    pass("annotation cleanup", "no large annotation blocks remain");
  }
}

function checkEnv(dir) {
  const envFile = path.join(dir, ".env");
  if (!fs.existsSync(envFile)) return;
  const content = fs.readFileSync(envFile, "utf8");
  const required = ["OPENCLAW_DOMAIN_NAME", "DOMAIN_MEMORY_DB_PATH"];
  const missing = required.filter((k) => !new RegExp(`^${k}=`, "m").test(content));
  if (missing.length) {
    fail(".env keys", `missing: ${missing.join(", ")}`);
  } else {
    pass(".env keys", `${required.length} required keys present`);
  }
  const enableCommerce = /^DOMAIN_COMMERCE_ENABLED=(?:true|1)/im.test(content);
  if (enableCommerce) {
    const stripeKeys = ["STRIPE_API_KEY", "STRIPE_RESTRICTED_KEY"];
    const haveStripe = stripeKeys.some((k) => new RegExp(`^${k}=.+`, "m").test(content));
    if (!haveStripe) {
      fail("commerce keys", "DOMAIN_COMMERCE_ENABLED=true but no Stripe restricted key set");
    } else {
      pass("commerce keys", "Stripe restricted key present");
    }
  }
}

function checkRoutingTable(dir) {
  const file = path.join(dir, "AGENTS.md");
  if (!fs.existsSync(file)) return;
  const content = fs.readFileSync(file, "utf8");
  if (!/##\s+Domain Routing Table/i.test(content)) {
    fail("AGENTS.md routing table", "no '## Domain Routing Table' section found");
    return;
  }
  const placeholderHits = content.match(/\[(?:term|Method|Domain-specific[^\]]*|domain-skill|When to load it|One paragraph[^\]]*)\]/g) || [];
  if (placeholderHits.length > 5) {
    warn("AGENTS.md placeholders", `${placeholderHits.length} unfilled placeholder tokens — replace before first turn`);
  } else if (placeholderHits.length > 0) {
    warn("AGENTS.md placeholders", `${placeholderHits.length} placeholders remain (acceptable if intentional)`);
  } else {
    pass("AGENTS.md placeholders", "no placeholder tokens detected");
  }
  const tableRows = content.match(/^\|\s*\*\*[^*]+\*\*[^|]*\|/gm) || [];
  if (tableRows.length === 0) {
    fail("AGENTS.md routing rows", "no routing rows detected — add at least one row before first turn");
  } else {
    pass("AGENTS.md routing rows", `${tableRows.length} routing rows`);
  }
}

function checkDomainInstalled(dir) {
  // ADR 0004: SOUL.md and HEARTBEAT.md are OpenClaw-owned. The template does
  // not write into them. Check the worker has actually filled them.
  const soulFile = path.join(dir, "SOUL.md");
  if (fs.existsSync(soulFile)) {
    const soulContent = fs.readFileSync(soulFile, "utf8").trim();
    if (soulContent.length < 80) {
      warn("SOUL.md content", "SOUL.md is empty or stub — fill it in (see docs/agents/persona.md)");
    } else {
      pass("SOUL.md content", `present (${soulContent.length} bytes)`);
    }
  } else {
    warn("SOUL.md content", "SOUL.md missing — OpenClaw should create it via `openclaw setup`");
  }
  const hbFile = path.join(dir, "HEARTBEAT.md");
  if (fs.existsSync(hbFile)) {
    const hbContent = fs.readFileSync(hbFile, "utf8");
    if (/^\s*tasks:\s*$/m.test(hbContent) || /-\s*name:\s*\S+/.test(hbContent)) {
      pass("HEARTBEAT.md tasks", "tasks block detected");
    } else {
      warn(
        "HEARTBEAT.md tasks",
        "no tasks: block found — paste the default 5-task block from docs/agents/heartbeat-tasks.md"
      );
    }
  } else {
    warn("HEARTBEAT.md tasks", "HEARTBEAT.md missing — OpenClaw should create it via `openclaw setup`");
  }
}

function checkMemoryDb(dir) {
  const dbPath = path.join(dir, "memory.db");
  if (!fs.existsSync(dbPath)) {
    warn("memory.db", `not yet created at ${dbPath} — will be created on first domain-memory tool call`);
    return;
  }
  try {
    const stat = fs.statSync(dbPath);
    pass("memory.db", `present (${stat.size} bytes)`);
  } catch (err) {
    fail("memory.db", `unreadable: ${err.message}`);
  }
}

function checkAgentRegistered(slug) {
  // Single-domain setup: always uses OC's native 'main' agent.
  // The domain slug is informational only (used for workspace content checks above).
  let out;
  try {
    out = execSync("openclaw agents list 2>&1", { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] });
  } catch (err) {
    warn("openclaw agent registered", `could not run 'openclaw agents list' (${err.status || "?"}) — skipping`);
    return;
  }
  if (/\bmain\b/.test(out)) {
    pass("openclaw agent registered", `'main' found in 'openclaw agents list'`);
  } else {
    fail("openclaw agent registered", `'main' not found in 'openclaw agents list' — run: openclaw onboard`);
  }
}

/* ───────────────────────────────────────────────── output ─── */

function printAndExit() {
  const colors = process.stdout.isTTY ? {
    green: "\x1b[32m", yellow: "\x1b[33m", red: "\x1b[31m", reset: "\x1b[0m", dim: "\x1b[2m",
  } : { green: "", yellow: "", red: "", reset: "", dim: "" };

  console.log("");
  console.log(`Validation: ${workspaceDir}`);
  console.log("");

  const counts = { pass: 0, warn: 0, fail: 0 };
  for (const r of results) {
    counts[r.kind] += 1;
    const tag = r.kind === "pass" ? `${colors.green}PASS${colors.reset}` :
                r.kind === "warn" ? `${colors.yellow}WARN${colors.reset}` :
                `${colors.red}FAIL${colors.reset}`;
    console.log(`  ${tag}  ${r.label}`);
    if (r.detail) console.log(`        ${colors.dim}${r.detail}${colors.reset}`);
  }

  console.log("");
  console.log(`  Summary: ${counts.pass} passed, ${counts.warn} warnings, ${counts.fail} failures`);
  console.log("");

  if (counts.fail > 0) {
    console.log(`  ${colors.red}Action:${colors.reset} fix the FAIL items above, then re-run --validate.`);
    process.exit(1);
  }
  if (counts.warn > 0) {
    console.log(`  ${colors.yellow}Note:${colors.reset} warnings do not block first-turn use, but review them.`);
  } else {
    console.log(`  ${colors.green}Ready:${colors.reset} workspace looks complete.`);
  }
  console.log("");
  process.exit(0);
}

function usage() {
  console.error(`Usage: node scripts/validate.mjs --workspace-dir <path>`);
  process.exit(2);
}
