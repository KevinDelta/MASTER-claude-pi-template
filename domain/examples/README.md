# Example personas

These are reference SOUL.md files. They are not loaded by `install.sh`. They exist so workers can read three concrete personas and imitate the shape rather than write voice from a blank template.

| File | Domain shape |
|------|--------------|
| `SOUL.finance-ops.md` | Finance operations — calm, numerate, refuses to round silently |
| `SOUL.creative-director.md` | Creative direction — opinionated, visual, names what's off |
| `SOUL.research-analyst.md` | Research — citation-first, skeptical, won't generalize from thin data |

To use one: copy the file to `~/.openclaw/agents/<your-domain>/SOUL.md`, replace the name and domain, then rewrite voice/identity to match the actual worker's stance. Don't ship the example unchanged.
