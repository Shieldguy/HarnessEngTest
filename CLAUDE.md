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

## Critical Constraints (STRICTLY FORBIDDEN)

The following actions are strictly prohibited for all agents and Claude Code sessions in this project. Violations may cause irreversible damage to the repository, system, or infrastructure.

### Git Constraints

| Action | Forbidden Command(s) | Reason |
|--------|----------------------|--------|
| Delete any branch | `git branch -d`, `git branch -D`, `git push origin --delete` | Permanent loss of history |
| Create new branches | `git checkout -b`, `git branch <name>`, `git switch -c` | Only `main` is used in this project |
| Force push | `git push --force`, `git push -f` | Overwrites remote history irreversibly |
| Hard reset | `git reset --hard` | Discards uncommitted work permanently |
| Amend published commits | `git commit --amend` after push | Rewrites shared history |
| Drop stash entries | `git stash drop`, `git stash clear` | May discard in-progress work |
| Delete `.git` directory | `rm -rf .git` | Destroys entire repository |
| Skip pre-commit hooks | `git commit --no-verify` | Bypasses safety checks |

**Only `main` branch exists. Never create, rename, or delete branches.**

### File System Constraints

| Action | Forbidden | Reason |
|--------|-----------|--------|
| Recursive delete outside project | `rm -rf` on any path outside `/Volumes/wjkim/Workspaces/AIProjects/HarnessEngTest/` | Risk of destroying unrelated work or system files |
| Delete project root | `rm -rf .` or `rm -rf /path/to/HarnessEngTest` | Destroys entire project |
| Overwrite system files | Writing to `/etc/`, `/usr/`, `/bin/`, `/sbin/`, `~/.ssh/` | System integrity risk |
| Mass delete without confirmation | `find . -delete`, `rm -rf *` inside project | Irreversible bulk deletion |

### Process & System Constraints

| Action | Forbidden | Reason |
|--------|-----------|--------|
| Kill unrelated processes | `kill -9`, `pkill` on non-project processes | May terminate critical system services |
| Modify global environment | Editing `~/.bashrc`, `~/.zshrc`, `~/.profile` without explicit request | Affects all sessions permanently |
| Install global packages | `npm install -g`, `pip install` without explicit request | May break other projects |
| Change file permissions broadly | `chmod -R 777` | Security risk |
| Expose secrets | Committing `.env`, API keys, tokens, passwords | Permanent exposure once pushed |

### If in Doubt

**Stop. Ask the user before proceeding.** Destructive actions cannot be undone.

## Git Commit on File Change (MANDATORY)

**Every agent MUST commit and push all changed files to the remote git server immediately after any file is created or modified.**

Rules:
- Stage only the files changed by the current agent's action (do not use `git add -A` blindly)
- Commit message format: `<type>(<agent>): <short description>` — e.g., `docs(planner): add eval plan for summarization task`
- Allowed types: `feat`, `fix`, `docs`, `test`, `chore`, `refactor`
- Always push to `origin main` after committing
- Do not batch multiple unrelated changes into a single commit — one logical change = one commit
- If the push fails, report the error immediately; do not silently skip

Commit + push sequence every agent must follow:
```bash
git add <changed files>
git commit -m "<type>(<agent>): <description>"
git push origin main
```

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
