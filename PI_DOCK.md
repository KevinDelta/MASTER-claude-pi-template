# PI_DOCK.md — Host Interface

<!-- Deploy location: ~/.pi/PI_DOCK.md (one per machine, one per worker)
     Deployed by install.sh. Update when domain, skills, or projects change.
     PURPOSE:
     When pi plugs into a host environment (Claude Desktop, Cursor, an employer's agent
     environment), it runs in MCP server mode. The host connects to pi's MCP server.
     PI_DOCK.md declares what the host sees — and what it doesn't.
     MCP is the dock protocol. Pi runs: pi serve --as-mcp
     The host connects and queries pi's MCP server for answers.
     Raw memory DB never leaves the worker's machine.
     THREE SECTIONS:
     A. Carried — what pi carries when it shows up at a host
     B. Export allowlist — what pi will surface to a host, and what stays private
     C. Host requirements — what a host must provide for pi to function
     Fill in all sections. Delete annotation comments when done.
     Version this file when you make significant changes.
     SCHEMA VERSION: 2.0 | Last updated: {{INSTALL_DATE}} -->

---

## A. Carried

<!-- What this worker's pi brings to any host session.
     Update the Active projects list as engagements open and close. -->

- **Domain:** {{DOMAIN_NAME}} — [one-sentence description of the domain]
- **Persona:** {{PERSONA_NAME}} — [one-sentence description of persona role]
- **Active projects:**
  - [project-slug] — [brief description]
- **Memory DB:** local only; located at `~/.pi/domain/{{DOMAIN_NAME}}/memory.db`; never exported raw
- **Skills:**
  - [skill-name] — [what it does]
  - [skill-name] — [what it does]

---

## B. Export Allowlist

<!-- What pi will surface to a host, and what it won't.
     Default deny: anything not on this list triggers a confirmation prompt before sharing.
     Pi answers questions about its domain and memory — it does not export raw data. -->

**Pi exports to hosts:**
- Domain name and prose description
- Active project names (if the host is scoped to one project, only that project's name)
- Skills by name and description — not file contents unless the worker explicitly approves
- Memory queries: pi answers questions in prose; the host never receives raw DB rows, embeddings, or observation logs

**Pi does not export:**
- Raw memory DB or any DB excerpt
- Observation logs, session histories, or tool call records
- File contents from any project directory unless the worker is present and approves
- Client names, contact information, or project details to hosts not authorized by the worker

**Default deny:** any host request outside this list triggers a confirmation prompt. Pi does not proceed without explicit worker confirmation.

**What "deny" means in practice:**
- Host asks "show me the last 50 observations" → pi asks worker to confirm before answering
- Host asks "list all clients in memory" → pi asks worker to confirm scope and framing
- Host asks "read this project's context/client.md" → pi asks worker to confirm
- Host asks "what is your domain?" → pi answers directly (on the allowlist)

---

## C. Host Requirements

<!-- What any host must provide for pi to function.
     Update the Network section with APIs this domain actually uses. -->

**Tool access:**
- Pi expects the host to expose MCP endpoints for host-provided capabilities
- The host declares which tools it makes available; pi operates within that declared set
- Pi does not assume tool availability — it checks what the host exposes before using it

**Permissions:**
- The host must declare which directories pi can read and write
- Pi will not write outside declared workspace boundaries without worker confirmation

**Network:**
- Pi needs outbound access to: [list APIs and services this domain uses, e.g., "api.openai.com, docs.google.com"]
- Pi does not need inbound access — it runs as a server that the host connects to, not the reverse

**Workspace:**
- The host provides a working directory pi can read and write
- For project-scoped sessions: the host points pi at the project root; pi reads `AGENTS.md` and `.pi/settings.json`

---

## D. Dock Protocol

<!-- How the connection works. Fill in your actual pi version and MCP endpoint if different from defaults. -->

The MCP server lives at `~/.pi/domain/<name>/.pi/mcp-server.ts`. It runs as a standalone stdio process — not inside a pi session.

```bash
# Run directly (requires tsx and @modelcontextprotocol/sdk installed globally)
npx tsx ~/.pi/domain/<domain-name>/.pi/mcp-server.ts
```

**Register with Claude Desktop manually** — add to `~/Library/Application Support/Claude/claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "pi-<domain-name>": {
      "command": "npx",
      "args": ["tsx", "/Users/<you>/.pi/domain/<domain-name>/.pi/mcp-server.ts"],
      "env": {
        "PI_DOMAIN_NAME": "<domain-name>"
      }
    }
  }
}
```

The host connects and receives structured tool results. Raw `memory.db` is never exposed — the server returns query results and structured metadata only, per the allowlist above.

**Prerequisites (install once):** `npm install -g better-sqlite3 sqlite-vec @modelcontextprotocol/sdk tsx`

---

## E. Version Log

<!-- Append-only. Record significant changes to this file so you can trace what a host was seeing at any given time. -->

| Date | Change | Notes |
|------|--------|-------|
| {{INSTALL_DATE}} | Initial dock setup | Domain: {{DOMAIN_NAME}}, Persona: {{PERSONA_NAME}} |
