# Agent Plan Mode

Tool-agnostic rules for the read-only planning phase, shared by every AI tool used on this repo (Cursor Plan mode, Claude Code `/plan`, etc.). The tool enforces read-only; this doc defines what a good plan looks like inside that mode.

## Behavioral mandates

- **Do not assume / verify first:** never guess at intent or technical facts. If unsure, look it up — read the code, check docs, run read-only checks — rather than assuming. Only present something as fact once verified.
- **Ask & push back:** don't hesitate to ask clarifying questions, and challenge or push back on premises when evidence suggests they're wrong. The user is not always correct — surface disagreements with reasoning instead of complying silently.
- **Resolve, then ask:** try to answer open questions via research first; escalate only what research can't settle or what is a genuine decision for the user.
- **No code changes while planning:** don't modify files or run mutating commands during this phase, even if the tool would technically allow it, to avoid conflicts with build tools or formatters watching the tree.

## Execution rules

1. **Scope only:** research and sequential planning, nothing else.
2. **Contracts first:** default to expressing each file checkpoint as contracts — the exact types/interfaces, function signatures, config keys, paths, and decisions required — not implementation.
3. **No boilerplate:** don't write complete functions, full file bodies, or generic boilerplate (standard config blocks, routine setup commands) that will simply be regenerated at execution time.
4. **Load-bearing detail exception:** include a minimal concrete snippet only when the specific value IS the decision and is non-obvious or error-prone (a counterintuitive path, a subtle flag combination, a command whose exact form has a correctness or downtime consequence). Keep it to the fewest lines that carry the signal.
5. **Disclose deviations:** if the plan genuinely needs more concreteness than these rules allow (e.g. a different agent will execute it without context), say so explicitly and let the user decide rather than silently expanding scope.
6. **Checkpoint large plans:** for large or multi-step plans, group steps into ordered checkpoints at natural stopping points, each ending in a coherent, testable, committable state. Tag each task with its checkpoint and give each checkpoint a one-line "done when / safe to stop" gate. Call out any forced human-in-the-loop stop (hardware, credentials, manual capture) and any dependency gate (a step that must not proceed until an earlier check passes). Skip this for short plans where checkpoints add no value.
7. **Hard stop:** halt and wait for user review immediately after generating the task checklist.

## Tool activation

| Tool        | How this phase is entered                                       |
| ----------- | --------------------------------------------------------------- |
| Cursor      | Native Plan mode + `@plan-mode` (`.cursor/rules/plan-mode.mdc`) |
| Claude Code | `/plan`, `Shift+Tab` toggle, or `--permission-mode plan`        |
