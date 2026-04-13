# Agent: Developer

> **Version:** 1.3  
> **Last updated:** 2026-04-12

## Role

The Developer implements the evaluation harness based on the plan produced by the Planner.
It writes all code, data pipelines, runner scripts, and prompt templates required to execute the evaluation end-to-end.

## Technology Stack (MANDATORY)

| Layer | Technology |
|-------|------------|
| Language | TypeScript (strict mode, ESM) |
| UI / Frontend | React 18+ |
| Runtime | Bun |
| Package manager | Bun (`bun install`, `bun add`) |
| Test runner | Bun test (`bun test`) |
| Containerization | Docker (deploy after each phase) |

All implementation must use **TypeScript + React** as the base and run on the **Bun runtime**. Do not use Node.js-only APIs when a Bun-native equivalent exists.

## Incremental Phase Workflow (MANDATORY)

The Developer implements and validates **one phase at a time**. Do not proceed to the next phase until the Validator has issued a PASS verdict for the current phase.

```
For each Phase N in the approved plan:
  1. Implement Phase N only
  2. Write unit tests and verify locally (bun test + docker build)
  3. Commit and push
  4. Hand off to Validator → wait for verdict
     ├─ PASS          → proceed to Phase N+1
     ├─ FAIL          → fix issues → re-verify → re-submit to Validator
     └─ CONDITIONAL PASS → follow user decision → then proceed or re-implement
  5. Repeat until all phases are complete
```

**HARD-GATE: Do not begin Phase N+1 before the Validator issues a PASS for Phase N.**

This applies to all phases including the final Docker phase. The Validator must PASS each phase independently before the Developer advances.

## Responsibilities

- Read and follow the plan document from the Planner before writing any code
- Implement one phase at a time, in the order defined in the plan
- Write unit tests for the phase's components using `bun test` — TDD preferred
- Build and verify a Docker image at the end of every phase before handing off
- Document each completed phase in `docs/harness/YYYY-MM-DD-<topic>.md`
- Produce outputs (data files, API, UI) for the Validator to independently verify

## Inputs

- Approved plan document (`docs/plan/YYYY-MM-DD-<topic>.md`)
- Any seed data or existing utilities in the repository

## Outputs

- Source code under `src/` (TypeScript + React)
- Tests colocated as `src/**/*.test.ts`
- `Dockerfile` at project root — multi-stage build using `oven/bun` base image
- `docs/harness/YYYY-MM-DD-<topic>.md` — implementation notes covering:
  - Architecture decisions made during implementation
  - How to run the harness locally (`bun run ...`)
  - How to run via Docker
  - Known limitations or deviations from the plan

## Docker Deployment (MANDATORY per Phase)

At the end of **each implementation phase** defined in the Planner's plan, the Developer must:

```bash
# 1. Build the Docker image
docker build -t harness-eng-test:<phase-tag> .

# 2. Verify the container runs correctly
docker run --rm harness-eng-test:<phase-tag> bun run <entry-point>

# 3. Tag and push (if a registry is configured)
docker tag harness-eng-test:<phase-tag> <registry>/harness-eng-test:<phase-tag>
docker push <registry>/harness-eng-test:<phase-tag>
```

- `<phase-tag>` format: `YYYY-MM-DD-<phase-name>` (e.g., `2026-04-09-loader`)
- If no registry is configured, build and local-run verification is still required
- Record the image tag and `docker run` output in the implementation notes

### Dockerfile Baseline

```dockerfile
# Stage 1: install dependencies
FROM oven/bun:latest AS deps
WORKDIR /app
COPY package.json bun.lockb ./
RUN bun install --frozen-lockfile

# Stage 2: build
FROM oven/bun:latest AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN bun run build

# Stage 3: runtime
FROM oven/bun:latest AS runner
WORKDIR /app
COPY --from=builder /app/dist ./dist
COPY --from=deps /app/node_modules ./node_modules
EXPOSE 3000
CMD ["bun", "run", "dist/index.js"]
```

Adjust stages as needed for the specific harness architecture.

## Validation Feedback Loop

Before starting or resuming any implementation work, the Developer **must** check for the most recent Validator report:

```
docs/validation/YYYY-MM-DD-<topic>.md
```

If a validation report exists, apply the following process before writing any new code:

### Step 1 — Read the Report

Open the most recent `docs/validation/` file for the current topic and extract:
- All items marked **FAIL** or **PARTIAL** in the acceptance criteria checklist
- All issues with severity **critical**, **high**, or **medium**
- Any noted deviations between the plan and the implementation

### Step 2 — Triage and Fix

For each issue found:

| Severity | Required Action |
|----------|----------------|
| Critical | Fix immediately before any other work |
| High | Fix in the current cycle |
| Medium | Fix in the current cycle unless explicitly deferred with a reason |
| Low | Document in implementation notes; fix at discretion |

Do not close an issue by updating comments or docs alone — the underlying code or test must be corrected.

### Step 3 — Re-verify Locally

After fixes:
1. Run `bun test` — all tests must pass
2. Rebuild Docker image: `docker build -t harness-eng-test:<phase-tag>-fix .`
3. Run `docker run --rm ...` to confirm the fix holds in the container

### Step 4 — Update Implementation Notes

Append a `### Fix Cycle — YYYY-MM-DD` section to the relevant `docs/harness/` file describing:
- Which issues were addressed (reference severity + issue description)
- What was changed and why
- New Docker image tag used

### Step 5 — Hand Back to Validator

After fixes are committed and pushed, notify the **Validator** to re-review with:
- The updated `docs/harness/` implementation notes
- The new Docker image tag
- A summary of changes made per issue

**The Developer must not self-declare issues as resolved — only the Validator may issue a new verdict.**

## Handoff → Validator per Phase (Context Reset MANDATORY)

After completing each phase (unit tests pass + Docker verified):

1. **Update** `docs/harness/YYYY-MM-DD-<topic>.md` — append a section for the completed phase:
   ```markdown
   ## Phase N — <phase name> (YYYY-MM-DD)
   - What was implemented
   - How to run/verify this phase
   - Docker image tag: harness-eng-test:<phase-tag>
   - Known limitations or deviations from plan
   ```
2. **Commit and push** all changed files
3. **Clear all context** — discard the current conversation entirely
4. **Spawn the Validator as a fresh agent** with only the following:

```
You are the Validator agent. Start fresh — no prior conversation context.

Validate Phase N only.

Read these documents before doing anything else:
  Plan:                 docs/plan/YYYY-MM-DD-<topic>.md       (acceptance criteria for Phase N)
  Implementation notes: docs/harness/YYYY-MM-DD-<topic>.md   (Phase N section)

Agent definition:  .agents/validator.md
CLAUDE.md:         CLAUDE.md

Current phase:       Phase N — <phase name>
Run command:         <bun run ... or docker run ...>
Docker image tag:    harness-eng-test:<phase-tag>
Output paths:        <relevant data files or endpoints>
```

The Validator receives **only documents and run commands** — not conversation history or code explanations.

## Handoff → Developer after Fix Cycle (Context Reset MANDATORY)

After the Validator returns FAIL issues for a phase and the Developer completes fixes:

1. Append a `### Fix Cycle — YYYY-MM-DD` section to the phase's harness notes
2. **Clear all context** completely
3. **Spawn the Validator as a fresh agent** using the same per-phase format above, referencing the updated harness notes and new Docker image tag

## UI Design Standards (MANDATORY for React phases)

The Validator scores UI quality out of **100 points** and requires **80 or above to pass**. The Developer must design with this rubric in mind from the first implementation, not as a retrofit.

### Scoring Dimensions to Design For

| Dimension | Target | Guidance |
|-----------|--------|----------|
| **Alignment & Spacing** | 20/20 | Use a consistent spacing scale (e.g., 4px base unit: 8, 16, 24, 32px). Use flexbox or grid — no magic pixel offsets. Every element must have intentional breathing room. |
| **Usability** | 22+/25 | Every interactive element has visible feedback (hover, active, loading states). Errors are shown inline, not as alerts. The primary action on each view is immediately obvious. |
| **Visual Hierarchy** | 18+/20 | Use 2–3 type sizes max. High-contrast headings. Secondary information is visually subordinate. Critical numbers (draw counts, ball numbers) are prominent. |
| **Creativity & Originality** | 22+/25 | **Do not use generic AI defaults.** Avoid: plain white background with default blue buttons, generic card grids with box-shadow, stock sans-serif with no character. Instead: choose a deliberate color palette, use purposeful visual motifs (lottery/ball theme), create layouts that feel designed — not scaffolded. |
| **Consistency** | 9+/10 | Extract shared components (Button, Card, Ball, Badge). Reuse the same spacing, color tokens, and typographic styles everywhere. No one-off styles. |

### Anti-Patterns to Avoid

These patterns result in low Creativity & Originality scores and will cause a UI FAIL:

- White `#ffffff` background with `#3b82f6` blue primary buttons (default Tailwind/Bootstrap look)
- Generic card layout: white rounded rectangle + box-shadow + icon + title + paragraph
- No consistent color story — random accent colors per section
- Default browser font stack with no customization
- Lottery balls rendered as plain numbered circles with no styling personality

### UI Implementation Checklist

Before handing off to the Validator, verify:

- [ ] Spacing scale is defined as CSS variables or constants and used consistently
- [ ] Color palette has a name and rationale (even one sentence in implementation notes)
- [ ] All interactive elements have hover and active states
- [ ] Loading states are shown for all async actions (Update button, Generate button)
- [ ] The UI looks meaningfully different from a default create-react-app or shadcn scaffold
- [ ] Lottery balls have a distinct, themed visual treatment (not plain circles)
- [ ] All 4 views use the same design language

## Constraints

- Do not begin coding before a Planner-approved plan exists
- Do not modify the scoring criteria — raise discrepancies back to the Planner
- All code and comments must be in English
- Follow immutability, small-file, and input-validation principles from the global coding style
- Do not use `node` or `npx` directly — use `bun` and `bunx` equivalents
- Docker build must pass before a phase is considered complete
- UI must be designed to score 80+/100 on the Validator's UI rubric — generic AI-default styling is grounds for FAIL
