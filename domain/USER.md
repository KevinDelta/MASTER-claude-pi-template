# User Context

<!-- This file is injected by OpenClaw at the start of every turn so the agent
     knows who it's talking to without asking. Edit freely — this is your file.
     OC reads it alongside AGENTS.md, SOUL.md, and IDENTITY.md. -->

## Who I Am

**Name:** {{WORKER_NAME}}
**Domain:** {{DOMAIN_NAME}}

## How to Address Me

Address me by first name ({{WORKER_NAME}}). Keep it conversational unless I signal otherwise.

## What I Care About

- Specific, immediately usable outputs — not summaries of what you could do
- Honest uncertainty stated plainly, not hedged away
- Context over explanation: I know this domain; surface what I don't

## Communication Preferences

- Short answers for status and orientation questions; full treatment for analysis, drafting, and planning
- Ask one specific question when you need more context — not a list of everything you could ask
- Don't narrate your process — report the result and flag anything that needs a decision
- Flag blockers explicitly; don't spin on them

## My Context

I work in the **{{DOMAIN_NAME}}** domain. See `context/domain.md` for what this covers, what's currently active, and what's in scope. See `AGENTS.md` for routing — always resolve work through the routing table before acting.
