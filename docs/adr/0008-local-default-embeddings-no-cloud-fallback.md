# Embedding provider defaults to Ollama with no cloud fallback; cloud is opt-in via explicit config

The template's installer writes an explicit `memorySearch.provider: "ollama"` config into the agent's OpenClaw configuration, with no cloud fallback. OpenClaw's default behavior auto-detects cloud providers (OpenAI, Gemini, Voyage, Mistral) when their API keys are present in the environment — which would silently ship workspace embeddings to a third party. This collides with the template's stated data-sovereignty contract. The installer corrects that default at install time. If Ollama is not running, `memory_search` degrades to FTS-only; cloud embeddings are never used unless the user explicitly edits their config.

## Considered Options

- **Let OpenClaw auto-detect (status quo).** Rejected. OC's provider-resolution order checks for cloud API keys (OpenAI → Gemini → Voyage → Mistral → DeepInfra → Bedrock) before falling through to local. A user with `OPENAI_API_KEY` in their environment — common for development — would have every memory write silently embedded by OpenAI. Data sovereignty is the template's stated philosophy; silently sending sensitive client data to a third party because a key happens to be present in env breaks that contract. Hope is not a control.
- **Ollama-default with opt-in cloud fallback (`memorySearch.fallback`).** Considered. Installer writes Ollama as primary with a documented escape hatch for cloud fallback when Ollama is unavailable. Defensible but loses the property "embeddings will only ever go to local hardware unless I explicitly opt in." A `fallback` config that activates on Ollama outage is exactly the kind of "happens to work" default that defeats sovereignty when Ollama crashes mid-session and the user doesn't notice the fallback fired. Future move if Ollama-only causes real friction; not the starting point.
- **Pure FTS, no embeddings at all.** Rejected. Drops semantic recall — the one capability that justified having an index at all (per ADR 0005). FTS-only is the graceful-degradation fallback when Ollama is unavailable, not the design.
- **`local` adapter (in-process embedding via downloaded model file).** Considered. OC supports `memorySearch.local.modelPath` for in-process embedding without a separate Ollama server. Lower ops footprint than Ollama. Not adopted as default because model-path management is fragile across machines (the file has to exist at the configured path, with the right architecture build), and Ollama is the more discoverable / supported local-embedding path for typical worker setups. `local` remains available as an alternative the user can configure.
- **Cloud-default with an outbound DOCK layer that strips PII before embedding.** Rejected. Embedding inputs are the *content itself* — there is no meaningful way to strip sensitive data while preserving the semantic content the embedding is meant to capture. Once you accept that embeddings carry information about the embedded text, sending them to a third party is sending the text.
- **Document the risk in `DOCK.md` and let users decide.** Rejected as the *only* control. Documentation without a sane default means users who don't read the docs (most of them) ship data to cloud by accident. Sovereignty by default + opt-in cloud is the inversion that respects philosophy.

## Consequences

- **`install.sh` writes Ollama config explicitly.** A `memorySearch` block is written to the agent's OC config:

  ```json5
  {
    agents: {
      defaults: {
        memorySearch: {
          provider: "ollama",
          model: "nomic-embed-text",
          fallback: "none",
          enabled: true
        }
      }
    }
  }
  ```

  The model choice (`nomic-embed-text`) is a defensible local default; users with multi-GPU local setups can swap via `models.providers.<id>` config as documented in OC's `memory-config` reference.
- **Installer detects Ollama availability and emits clear guidance.** Post-install message tells the user whether Ollama was detected. If absent: "Ollama not found — install with `brew install ollama && ollama pull nomic-embed-text` to enable semantic recall. Memory search runs in FTS-only mode in the meantime." This is informational, not blocking.
- **`memory_search` degrades to FTS-only when Ollama is unreachable.** Per OC's documented behavior, `memorySearch.enabled: true` with an unavailable provider falls back to FTS over the indexed corpus. This is a real degradation (keyword-only retrieval), but it is a graceful one — the agent still works, recall just gets dumber.
- **`DOCK.md` documents the embedding boundary.** A new section names: (1) embeddings stay local by default; (2) cloud embeddings can be opted in by editing the agent config; (3) opting in means the embedded content is sent to the chosen provider; (4) the user is responsible for understanding their provider's data-retention and training-use policies before opting in.
- **CI/test environments are exempt.** Build-time and CI runs that have no real Ollama and no real sensitive data can override the default via env or alternate config without violating the spirit of this ADR. The default is for *production* workspaces holding real worker data.
- **Multi-machine setups have a documented path.** A worker with a local-GPU box can configure `models.providers.<id>` pointing at a remote Ollama endpoint (`baseUrl: "http://gpu-box.local:11435"`) and reference it via `memorySearch.provider`. Sovereignty is preserved (the GPU box is the worker's own hardware) without forcing every machine to run Ollama locally.
- **Future cloud-opt-in path is named, not designed.** If the friction of Ollama-only proves real (e.g., users without local GPU on resource-constrained machines), a future ADR can revisit by introducing an explicit opt-in flag (e.g., `install.sh --allow-cloud-embeddings`) that writes a fallback config and surfaces the decision in `DOCK.md`. Until that friction shows up, we start tight.
- **Performance ceiling acknowledged.** Local embedding models (e.g., `nomic-embed-text` at 768 dims) underperform frontier cloud embeddings on benchmark tasks. For a personal/team domain worker indexing a few thousand markdown files, this is not the bottleneck. If it becomes one, the answer is a better local model or `memory-qmd` (which OC supports as a higher-quality local-first backend) — not cloud.
