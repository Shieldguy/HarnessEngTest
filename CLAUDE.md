# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Purpose

This repository is a practice workspace for **Harness Engineering** — experimenting with eval harnesses, test frameworks, LLM evaluation pipelines, and related tooling.

## Agent Roles

All harness engineering work in this repository follows a three-agent workflow. Each agent has a dedicated definition file under `.agents/`:

| Agent | File | Responsibility |
|-------|------|----------------|
| **Planner** | [`.agents/planner.md`](.agents/planner.md) | Defines evaluation objective, metrics, dataset schema, and acceptance criteria. Produces `docs/plan/`. No code until plan is approved. |
| **Developer** | [`.agents/developer.md`](.agents/developer.md) | Implements the harness (loader, runner, scorer, CLI) based on the approved plan. Produces `src/` and `docs/harness/`. |
| **Validator** | [`.agents/validator.md`](.agents/validator.md) | Independently runs and verifies the harness against the plan's acceptance criteria. Produces `docs/validation/`. Issues verdict: PASS / FAIL / CONDITIONAL PASS. |

**Workflow order:** Planner → (user approval) → Developer → Validator  
**HARD-GATE:** The Developer must not write code before the Planner's plan is approved.  
**HARD-GATE:** The Validator must not mark work complete without execution evidence.

Refer to the individual `.agents/*.md` files for detailed inputs, outputs, constraints, and handoff rules for each role.

## Language (MANDATORY)

All files created outside of `docs/conversation/` MUST be written in **English** — code, comments, documentation, configuration, and any other content.

The only exception is `docs/conversation/YYYY-MM-DD.md` log files, which may use the language of the conversation.

## Conversation Logging (MANDATORY)

**Every conversation and response MUST be saved to `docs/conversation/YYYY-MM-DD.md`.**

Rules:
- File name = today's date in `YYYY-MM-DD` format (use `date '+%Y-%m-%d'` to get it — never calculate manually)
- Append to the file if it already exists for today; create it if it does not
- Log format: include the user's question and Claude's response in readable markdown
- This applies to every exchange — no exceptions

Example path: `docs/conversation/2026-04-09.md`

Log format template:

```markdown
## HH:MM — <short topic summary>

**User:** <user message>

**Claude:** <response summary or full response>

---
```
