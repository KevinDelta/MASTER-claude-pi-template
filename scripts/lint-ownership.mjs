#!/usr/bin/env node
/* Prove the template ships nothing into OpenClaw's bootstrap files.
 *
 * Per ADR 0004, the following files are OpenClaw-owned:
 *   SOUL.md, HEARTBEAT.md, USER.md, IDENTITY.md
 *
 * The template:
 *   - must not ship a top-level domain/<bootstrap>.md scaffold for them
 *   - must not have install.sh write content into them (append/cat/sed >>)
 *   - must not have apply-intake.mjs write content into them
 *
 * Run: node scripts/lint-ownership.mjs
 * Exit 0 on clean; exit 1 on any leak.
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

const OC_BOOTSTRAP_FILES = ["SOUL.md", "HEARTBEAT.md", "USER.md", "IDENTITY.md"];

const findings = [];

// 1. No domain/<bootstrap>.md scaffolds should exist in the repo.
for (const name of OC_BOOTSTRAP_FILES) {
  const scaffold = path.join(repoRoot, "domain", name);
  if (fs.existsSync(scaffold)) {
    findings.push(`domain/${name} exists — OpenClaw-owned file; do not ship a template scaffold.`);
  }
}

// 2. install.sh must not author OpenClaw bootstrap files.
const installSh = readFile(path.join(repoRoot, "install.sh"));
for (const name of OC_BOOTSTRAP_FILES) {
  // Patterns we forbid: writing TO $WORKSPACE_DIR/<name> via cp / sed-redirect / append / write.
  // Comments mentioning the name are allowed (and required, since docs/agents/ points at them).
  const writePatterns = [
    new RegExp(`>>\\s*["']?\\$\\{?WORKSPACE_DIR\\}?[/'"\`]+${escapeRe(name)}`),
    new RegExp(`>\\s*["']?\\$\\{?WORKSPACE_DIR\\}?[/'"\`]+${escapeRe(name)}`),
    new RegExp(`add_new\\s+["'][^"']+["']\\s+["'][^"']*${escapeRe(name)}["']`),
    new RegExp(`deploy_always\\s+["'][^"']+["']\\s+["'][^"']*${escapeRe(name)}["']`),
    new RegExp(`cp\\s+["'][^"']+["']\\s+["'][^"']*${escapeRe(name)}["']`),
  ];
  for (const re of writePatterns) {
    if (re.test(installSh)) {
      findings.push(`install.sh writes to ${name} (matched ${re}) — OpenClaw-owned, not ours.`);
    }
  }
}

// 3. apply-intake.mjs must not append/write OC bootstrap files.
const applyIntake = readFile(path.join(repoRoot, "scripts", "apply-intake.mjs"));
for (const name of OC_BOOTSTRAP_FILES) {
  const writePatterns = [
    new RegExp(`appendFileSync\\([^)]*["\`']${escapeRe(name)}["\`']`),
    new RegExp(`writeFile(?:Sync)?\\([^)]*["\`']${escapeRe(name)}["\`']`),
    new RegExp(`path\\.join\\([^)]*,\\s*["\`']${escapeRe(name)}["\`']\\s*\\)`),
  ];
  for (const re of writePatterns) {
    if (re.test(applyIntake)) {
      findings.push(`scripts/apply-intake.mjs references ${name} (matched ${re}) — should not author.`);
    }
  }
}

// 4. The heartbeat config string binding is required (so OpenClaw still routes
//    heartbeat turns through AGENTS.md even though we don't author HEARTBEAT.md).
if (!/heartbeat\.prompt/.test(installSh) || !/AGENTS\.md routing table/.test(installSh)) {
  findings.push(
    "install.sh must set agents.defaults.heartbeat.prompt with a string that binds heartbeat turns to the AGENTS.md routing table (see ADR 0004)."
  );
}

// 5. excludeBootstrapFiles must NOT be set by install.sh (ADR rejects that option).
if (/excludeBootstrapFiles/.test(installSh)) {
  findings.push("install.sh sets excludeBootstrapFiles — ADR 0004 forbids the template from setting this.");
}

if (findings.length) {
  console.error("Ownership lint FAILED — template is writing into OpenClaw-owned territory:");
  for (const f of findings) console.error(`  - ${f}`);
  process.exit(1);
}

console.log("Ownership lint OK — template ships nothing into OpenClaw bootstrap files.");

function readFile(p) {
  try {
    return fs.readFileSync(p, "utf8");
  } catch {
    return "";
  }
}

function escapeRe(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
