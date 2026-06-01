# Embedding provider defaults to OC built-in local; cloud is opt-in via explicit config

The template's installer writes `memorySearch.provider: "local"` into the agent's OpenClaw configuration, using OC's built-in in-process embedding provider with no cloud fallback. OpenClaw's default behavior auto-detects cloud providers (OpenAI, Gemini, Voyage, Mistral) when their API keys are present in the environment — which would silently ship workspace embeddings to a third party. This collides with the template's stated data-sovereignty contract. The installer corrects that default at install time. If the built-in provider is unavailable, `memory_search` degrades to FTS-only; cloud embeddings are never used unless the user explicitly edits their config.

## Considered Options

- **Let OpenClaw auto-detect (status quo).** Rejected. OC's provider-resolution order checks for cloud API keys (OpenAI → Gemini → Voyage → Mistral → DeepInfra → Bedrock) before falling through to local. A user with `OPENAI_API_KEY` in their environment — common for development — would have every memory write silently embedded by OpenAI. Data sovereignty is the template's stated philosophy; silently sending sensitive client data to a third party because a key happens to be present in env breaks that contract. Hope is not a control.
- **Ollama-default with opt-in cloud fallback (`memorySearch.fallback`).** Considered. Installer writes Ollama as primary with a documented escape hatch for cloud fallback when Ollama is unavailable. Defensible but loses the property "embeddings will only ever go to local hardware unless I explicitly opt in." A `fallback` config that activates on Ollama outage is exactly the kind of "happens to work" default that defeats sovereignty when Ollama crashes mid-session and the user doesn't notice the fallback fired. Future move if Ollama-only causes real friction; not the starting point.
- **Pure FTS, no embeddings at all.** Rejected. Drops semantic recall — the one capability that justified having an index at all (per ADR 0005). FTS-only is the graceful-degradation fallback when Ollama is unavailable, not the design.
- **`local` adapter (OC built-in in-process embedding).** Adopted. OC ships a built-in HuggingFace GGUF embedding provider (`provider: "local"`) that requires no separate server process. OC manages the model lifecycle; no model-path configuration is needed. Memory-wiki validation (Check 4) confirmed this provider is what OC's native memory stack uses by default, with no cloud auto-detection. Lower ops footprint than Ollama — one fewer process to manage.
- **Ollama as primary, built-in as fallback.** Considered after Check 4 validation. Rejected — Ollama-first means requiring a separate server for a capability OC already ships. Users who prefer Ollama can configure it explicitly.
- **Ollama as the default.** Previous decision (superseded). Rejected in favour of the built-in because: (1) memory-wiki validation confirmed OC's built-in satisfies the sovereignty requirement without an external server; (2) the ops advantage of no separate process outweighs Ollama's discoverability benefit when OC is already the required runtime.
- **Cloud-default with an outbound DOCK layer that strips PII before embedding.** Rejected. Embedding inputs are the *content itself* — there is no meaningful way to strip sensitive data while preserving the semantic content the embedding is meant to capture. Once you accept that embeddings carry information about the embedded text, sending them to a third party is sending the text.
- **Document the risk in `DOCK.md` and let users decide.** Rejected as the *only* control. Documentation without a sane default means users who don't read the docs (most of them) ship data to cloud by accident. Sovereignty by default + opt-in cloud is the inversion that respects philosophy.

## Consequences

- **`install.sh` writes OC built-in local config explicitly.** A `memorySearch` block is written to the agent's OC config via `openclaw config set`:

  ```json5
  {
    agents: {
      defaults: {
        memorySearch: {
          provider: "local",
          fallback: "none",
          enabled: true
        }
      }
    }
  }
  ```

  OC manages the built-in model lifecycle; no model path or separate server configuration is required.
- **Ollama step removed from installer.** `install.sh` no longer installs Ollama or pulls `nomic-embed-text`. Users who want Ollama for other purposes install it independently; they can override `memorySearch.provider` to `"ollama"` in their agent config if preferred.
- **`memory_search` degrades to FTS-only when the built-in provider is unavailable.** Per OC's documented behavior, `memorySearch.enabled: true` with an unavailable provider falls back to FTS over the indexed corpus. This is a real degradation (keyword-only retrieval), but it is a graceful one — the agent still works, recall just gets dumber.
- **`DOCK.md` documents the embedding boundary.** (1) Embeddings stay local by default via OC's built-in provider; (2) cloud embeddings can be opted in by editing the agent config; (3) opting in means the embedded content is sent to the chosen provider; (4) the user is responsible for understanding their provider's data-retention and training-use policies before opting in.
- **CI/test environments are exempt.** Build-time and CI runs with no real sensitive data can override the default via env or alternate config without violating the spirit of this ADR.
- **Future cloud-opt-in path is named, not designed.** A future ADR can introduce an explicit opt-in flag (e.g., `install.sh --allow-cloud-embeddings`) that writes a fallback config and surfaces the decision in `DOCK.md`. Until friction shows up, we start tight.
- **Performance ceiling acknowledged.** OC's built-in local embedding model underperforms frontier cloud embeddings on benchmark tasks. For a personal/team domain worker indexing a few thousand markdown files, this is not the bottleneck. If it becomes one, the answer is a better local model or `memory-qmd` — not cloud.
