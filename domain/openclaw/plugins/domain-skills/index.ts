import { definePluginEntry } from "openclaw/plugin-sdk/plugin-entry";
import { Type } from "@sinclair/typebox";
import { spawn } from "child_process";
import * as fs from "fs";
import * as os from "os";
import * as path from "path";

type SkillSource = "plugin-core" | "plugin-domain" | "vendor" | "user";

interface SkillEntry {
  name: string;
  description: string;
  source: SkillSource;
  template?: string;
  file: string;
}

interface TierDir {
  dir: string;
  source: SkillSource;
}

function expandHome(input: string): string {
  if (input.startsWith("~/")) return path.join(os.homedir(), input.slice(2));
  return input;
}

function configValue(name: string, fallback: string): string {
  return process.env[name] || fallback;
}

function domainName(): string {
  return configValue("OPENCLAW_DOMAIN_NAME", "default");
}

function pluginRoot(): string {
  return expandHome(configValue(
    "DOMAIN_SKILLS_PLUGIN_ROOT",
    path.join(os.homedir(), ".openclaw", "plugins", `domain-skills-${domainName()}`)
  ));
}

function vendorDir(): string {
  return expandHome(configValue(
    "DOMAIN_SKILLS_VENDOR_DIR",
    path.join(os.homedir(), ".openclaw", "agents", domainName(), "skills", "vendor")
  ));
}

function userDir(): string {
  return expandHome(configValue(
    "DOMAIN_SKILLS_USER_DIR",
    path.join(os.homedir(), ".openclaw", "agents", domainName(), "skills")
  ));
}

// Tiers in last-wins precedence order — later entries shadow earlier ones.
function tierDirs(): TierDir[] {
  const root = pluginRoot();
  return [
    { dir: path.join(root, "core"), source: "plugin-core" },
    { dir: path.join(root, "domains", domainName()), source: "plugin-domain" },
    { dir: vendorDir(), source: "vendor" },
    { dir: userDir(), source: "user" },
  ];
}

function parseFrontmatter(file: string): { name?: string; description?: string; template?: string } | null {
  let content: string;
  try {
    content = fs.readFileSync(file, "utf8");
  } catch {
    return null;
  }
  const match = content.match(/^---\n([\s\S]*?)\n---/);
  if (!match) return null;
  const out: Record<string, string> = {};
  for (const line of match[1].split("\n")) {
    const kv = line.match(/^([A-Za-z][A-Za-z0-9_-]*):\s*(.*)$/);
    if (kv) out[kv[1]] = kv[2].trim();
  }
  return {
    name: out.name,
    description: out.description,
    template: out.Template || out.template,
  };
}

function readTier(t: TierDir): SkillEntry[] {
  if (!fs.existsSync(t.dir)) return [];
  const entries: SkillEntry[] = [];
  for (const file of fs.readdirSync(t.dir)) {
    if (!file.endsWith(".md")) continue;
    const fm = parseFrontmatter(path.join(t.dir, file));
    if (!fm?.name || !fm.description) continue;
    entries.push({
      name: fm.name,
      description: fm.description,
      source: t.source,
      template: fm.template,
      file: path.join(t.dir, file),
    });
  }
  return entries;
}

interface MergedSkills {
  resolved: Map<string, SkillEntry>;
  shadowed: Array<{ name: string; source: SkillSource; shadowed_by: SkillSource }>;
}

function mergeTiers(): MergedSkills {
  const resolved = new Map<string, SkillEntry>();
  const shadowed: MergedSkills["shadowed"] = [];
  for (const tier of tierDirs()) {
    for (const skill of readTier(tier)) {
      const prior = resolved.get(skill.name);
      if (prior) shadowed.push({ name: skill.name, source: prior.source, shadowed_by: skill.source });
      resolved.set(skill.name, skill);
    }
  }
  return { resolved, shadowed };
}

function runOpenSkills(args: string[]): Promise<{ code: number; stdout: string; stderr: string }> {
  return new Promise((resolve) => {
    const proc = spawn("npx", ["--yes", "openskills", ...args], { stdio: ["ignore", "pipe", "pipe"] });
    let stdout = "";
    let stderr = "";
    proc.stdout.on("data", (chunk) => { stdout += chunk.toString(); });
    proc.stderr.on("data", (chunk) => { stderr += chunk.toString(); });
    proc.on("close", (code) => resolve({ code: code ?? -1, stdout, stderr }));
    proc.on("error", (err) => resolve({ code: -1, stdout, stderr: stderr + String(err) }));
  });
}

function listVendorSkillNames(): Set<string> {
  const dir = vendorDir();
  if (!fs.existsSync(dir)) return new Set();
  return new Set(
    fs.readdirSync(dir)
      .filter((f) => f.endsWith(".md"))
      .map((f) => parseFrontmatter(path.join(dir, f))?.name)
      .filter((n): n is string => Boolean(n))
  );
}

export default definePluginEntry({
  id: "domain-skills",
  name: "Domain Skills",
  description: "Owns skill discovery, reading, vendoring, and removal. Routing rows remain the load mechanism.",
  register(api) {
    api.registerTool({
      name: "list_skills",
      description: "Return merged skill catalog with provenance. Does not return file contents. Routing decides what loads — this is for discovery only.",
      parameters: Type.Object({}),
      async execute() {
        const { resolved, shadowed } = mergeTiers();
        const skills = Array.from(resolved.values())
          .map(({ name, description, source, template }) => ({ name, description, source, ...(template ? { template } : {}) }))
          .sort((a, b) => a.name.localeCompare(b.name));
        return { content: [{ type: "text", text: JSON.stringify({
          skills,
          shadowed,
          precedence: "plugin-core < plugin-domain < vendor < user (last wins)",
          note: "File contents are not exported. Use read_skill(name) to fetch a single skill body.",
        }, null, 2) }] };
      },
    });

    api.registerTool({
      name: "read_skill",
      description: "Return the resolved skill file content for the given name, honoring last-wins precedence across tiers.",
      parameters: Type.Object({ name: Type.String() }),
      async execute(_id, params: { name: string }) {
        const { resolved } = mergeTiers();
        const skill = resolved.get(params.name);
        if (!skill) {
          return { content: [{ type: "text", text: JSON.stringify({
            error: `Skill not found: ${params.name}`,
            available: Array.from(resolved.keys()).sort(),
          }, null, 2) }] };
        }
        return { content: [{ type: "text", text: JSON.stringify({
          name: skill.name,
          source: skill.source,
          file: skill.file,
          content: fs.readFileSync(skill.file, "utf8"),
        }, null, 2) }] };
      },
    });

    api.registerTool({
      name: "install_skill",
      description: "Vendor a third-party skill into the per-domain vendor dir via `openskills install ... --no-sync`. Approval-gated: caller must pass approved=true with an approval_reference. Triggers OpenClaw reload on success.",
      parameters: Type.Object({
        source: Type.String(),
        approved: Type.Boolean(),
        approval_reference: Type.String(),
      }),
      async execute(_id, params: { source: string; approved: boolean; approval_reference: string }) {
        if (!params.approved) throw new Error("Worker approval is required before installing a skill.");
        if (!params.approval_reference.trim()) throw new Error("approval_reference is required to record the approval.");
        const target = vendorDir();
        fs.mkdirSync(target, { recursive: true });
        const before = listVendorSkillNames();
        const result = await runOpenSkills(["install", params.source, "--target", target, "--no-sync"]);
        if (result.code !== 0) {
          throw new Error(`openskills install failed (exit ${result.code}): ${result.stderr || result.stdout}`);
        }
        const after = listVendorSkillNames();
        const installed = Array.from(after).filter((n) => !before.has(n));
        const { shadowed } = mergeTiers();
        const newlyShadowed = shadowed.filter((s) => installed.includes(s.name));
        return { content: [{ type: "text", text: JSON.stringify({
          installed,
          shadowed: newlyShadowed,
          reload_required: true,
          approval_reference: params.approval_reference,
          source: params.source,
          target,
        }, null, 2) }] };
      },
    });

    api.registerTool({
      name: "remove_skill",
      description: "Delete a vendored skill from the per-domain vendor dir. Approval-gated. Will not touch plugin tiers or the user dir.",
      parameters: Type.Object({
        name: Type.String(),
        approved: Type.Boolean(),
        approval_reference: Type.String(),
      }),
      async execute(_id, params: { name: string; approved: boolean; approval_reference: string }) {
        if (!params.approved) throw new Error("Worker approval is required before removing a skill.");
        if (!params.approval_reference.trim()) throw new Error("approval_reference is required to record the approval.");
        const dir = vendorDir();
        if (!fs.existsSync(dir)) throw new Error(`Vendor dir does not exist: ${dir}`);
        let removed: string | null = null;
        for (const file of fs.readdirSync(dir)) {
          if (!file.endsWith(".md")) continue;
          const full = path.join(dir, file);
          const fm = parseFrontmatter(full);
          if (fm?.name === params.name) {
            fs.unlinkSync(full);
            removed = full;
            break;
          }
        }
        if (!removed) throw new Error(`Skill not found in vendor dir: ${params.name}`);
        return { content: [{ type: "text", text: JSON.stringify({
          removed: params.name,
          file: removed,
          reload_required: true,
          approval_reference: params.approval_reference,
        }, null, 2) }] };
      },
    });
  },
});
