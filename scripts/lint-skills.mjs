#!/usr/bin/env node
/* Lint skill frontmatter across plugin tiers (core + per-domain).
 *
 * Required fields: name, description.
 * Rule: name === basename(file, ".md").
 * Optional Template: references must resolve to an existing template file.
 * Frontmatter is a closed schema — unknown keys are rejected.
 *
 * Usage:
 *   node scripts/lint-skills.mjs \
 *     --plugin-root <dir>          # default: domain/openclaw/plugins/domain-skills
 *     --domain <slug>              # which domains/<slug>/ tier to lint
 *     --templates-dir <dir>        # default: base/templates
 *
 * Exit code is non-zero on any lint failure.
 */

import fs from "node:fs";
import path from "node:path";

const ALLOWED_KEYS = new Set(["name", "description", "Template", "template"]);

const args = process.argv.slice(2);
const opts = {};
for (let i = 0; i < args.length; i += 1) {
  const arg = args[i];
  if (!arg.startsWith("--")) die(`Unknown arg: ${arg}`);
  opts[arg.slice(2)] = args[i + 1];
  i += 1;
}

const repoRoot = process.cwd();
const pluginRoot = path.resolve(opts["plugin-root"] || path.join(repoRoot, "domain/openclaw/plugins/domain-skills"));
const templatesDir = path.resolve(opts["templates-dir"] || path.join(repoRoot, "base/templates"));
const domainSlug = opts["domain"] || "{{DOMAIN_NAME}}";

const tiers = [
  { dir: path.join(pluginRoot, "core"), label: "plugin-core" },
  { dir: path.join(pluginRoot, "domains", domainSlug), label: "plugin-domain" },
];

const errors = [];
let fileCount = 0;

for (const tier of tiers) {
  if (!fs.existsSync(tier.dir)) continue;
  for (const file of fs.readdirSync(tier.dir)) {
    if (!file.endsWith(".md")) continue;
    fileCount += 1;
    const full = path.join(tier.dir, file);
    const expectedName = path.basename(file, ".md");
    const lint = lintFile(full, expectedName, tier.label);
    for (const msg of lint) errors.push(`${path.relative(repoRoot, full)}: ${msg}`);
  }
}

if (errors.length) {
  console.error(`Skill lint failed: ${errors.length} issue(s) across ${fileCount} file(s).`);
  for (const e of errors) console.error(`  - ${e}`);
  process.exit(1);
}

console.log(`Skill lint passed: ${fileCount} file(s) across ${tiers.length} tier(s).`);

function lintFile(file, expectedName, label) {
  const out = [];
  const content = fs.readFileSync(file, "utf8");
  const match = content.match(/^---\n([\s\S]*?)\n---/);
  if (!match) {
    out.push(`[${label}] missing frontmatter block`);
    return out;
  }
  const meta = {};
  for (const line of match[1].split("\n")) {
    if (!line.trim()) continue;
    const kv = line.match(/^([A-Za-z][A-Za-z0-9_-]*):\s*(.*)$/);
    if (!kv) {
      out.push(`[${label}] malformed frontmatter line: ${JSON.stringify(line)}`);
      continue;
    }
    const [, key, value] = kv;
    if (!ALLOWED_KEYS.has(key)) {
      out.push(`[${label}] unknown frontmatter key: ${key} (allowed: ${[...ALLOWED_KEYS].join(", ")})`);
    }
    meta[key] = value.trim();
  }
  if (!meta.name) out.push(`[${label}] missing required field: name`);
  if (!meta.description) out.push(`[${label}] missing required field: description`);
  if (meta.name && meta.name !== expectedName) {
    out.push(`[${label}] name mismatch: frontmatter name="${meta.name}" but filename basename="${expectedName}"`);
  }
  const template = meta.Template || meta.template;
  if (template) {
    const templatePath = path.isAbsolute(template) ? template : path.join(templatesDir, template);
    if (!fs.existsSync(templatePath)) {
      out.push(`[${label}] Template reference does not exist: ${template} (looked in ${templatesDir})`);
    }
  }
  return out;
}

function die(msg) {
  console.error(msg);
  process.exit(2);
}
