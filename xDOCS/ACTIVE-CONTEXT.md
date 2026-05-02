# Active Context

**Current Phase:** OpenClaw runtime refactor.

## Completed In This Phase

- Replaced Pi runtime templates with OpenClaw workspace/config/plugin templates.
- Deleted `watches.yaml` and scheduler templates; heartbeat is now the recurring-work surface.
- Replaced `PI_DOCK.md` with `DOCK.md`.
- Ported memory behavior to an OpenClaw `domain-memory` plugin template.
- Strengthened routing-table requirements for direct, channel, heartbeat, and project work.

## Open Risks

- Need real-run validation against a disposable OpenClaw domain.
- Need confirmation of plugin config readback shape in OpenClaw runtime.
- Need a local memory plugin smoke test.

## Next Steps

- Run the installer against a disposable domain and verify `openclaw agents list --bindings`.
- Add a temp-DB smoke test for the domain-memory plugin.
