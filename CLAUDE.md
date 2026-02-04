
# CLAUDE.md

Use `.ai/GUIDELINES.md` as the single source of truth for HAI3 development guidelines.

For routing to specific topics, see the ROUTING section in GUIDELINES.md.

ALL user requests MUST be handled by the Orchestrator agent.

If a request implies implementation, execution, modification, or validation of an OpenSpec feature:
- The Orchestrator MUST take control
- No other agent may act unless delegated by the Orchestrator
