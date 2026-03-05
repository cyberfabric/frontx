<!-- @cpt:root-agents -->
## Cypilot AI Agent Navigation

**Remember these variables while working in this project:**

```toml
cypilot_path = ".cypilot"
```

## Navigation Rules

ALWAYS open and follow `{cypilot_path}/.gen/AGENTS.md` FIRST

ALWAYS open and follow `{cypilot_path}/config/AGENTS.md` WHEN it exists

ALWAYS invoke `{cypilot_path}/.core/skills/cypilot/SKILL.md` WHEN user asks to do something with Cypilot

<!-- /@cpt:root-agents -->

Use `.ai/GUIDELINES.md` as the single source of truth for HAI3 development guidelines.

For routing to specific topics, see the ROUTING section in GUIDELINES.md.

ALL user requests MUST be handled by the Orchestrator agent.

If a request implies implementation, execution, modification, or validation of an OpenSpec feature:
- The Orchestrator MUST take control
- No other agent may act unless delegated by the Orchestrator
