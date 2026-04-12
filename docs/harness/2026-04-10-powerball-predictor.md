# Implementation Notes: Powerball Predictor

> **Date:** 2026-04-11  
> **Agent:** Developer  
> **Plan version:** v1.3  
> **Status:** All 6 phases complete

---

## Architecture Decisions

### Data Layer
- **Source:** Texas Lottery CSV endpoint (`powerball.csv`) — a single endpoint returns all historical draws since 2010 as comma-separated values. Format: `Game,Month,Day,Year,Ball1..Ball5,Powerball,Multiplier`.
- **Incremental refresh:** The scraper compares the latest cached date in `data/draws.json` against all parsed draws and only appends newer records. Full re-parse of CSV is still done client-side (fast, ~1ms) but only new records are appended to the file.
- **`powerballEligible` flag:** Set at ingest time. `true` if `powerball <= 26`, `false` for the 173 pre-Oct 2015 draws where PB was in range 27–35.

### Statistical Analysis
- White ball stats computed from all 1931 draws (2010-02-03 to 2026-04-08).
- Powerball stats computed only from the 1758 `powerballEligible` draws.
- **Hot flag:** number appeared in ANY of the last 10 draws.
- **Cold flag:** number did NOT appear in ANY of the last 30 draws.
- Hot and cold flags are mutually exclusive — a number cannot be both.
- **Gap:** index distance from last appearance to end of draw array (0 = appeared in most recent draw).
- **Avg gap:** `totalDraws / frequency` — expected draws between appearances.

### Prediction Engine
Four strategies, all deterministic given the same `stats.json`:
- **Hot:** top 5 white balls by `frequency` + top 1 Powerball by `frequency`
- **Cold:** top 5 white balls by `gap` (longest time without appearing) + top 1 Powerball by `gap`
- **Balanced:** 3 hottest white balls + 2 coldest (excluding the 3 hot) + hottest Powerball
- **Gap:** selects numbers where `gap > avg_gap` (statistically overdue), sorted by `gap - avg_gap` descending; falls back to highest-gap numbers if fewer than 5 are overdue

### Full-Stack Architecture
```
Browser (React SPA)
    │  HTTP (port 3000)
    ▼
Bun HTTP Server (src/server/index.ts)
    ├── GET  /             → dist/client/index.html (React app)
    ├── GET  /assets/*     → static files
    ├── GET  /api/stats    → data/stats.json
    ├── GET  /api/draws    → data/draws.json
    └── POST /api/refresh  → scrape → analyze → return updated stats
```

- Server uses `Bun.serve()` with a single `fetch` handler.
- Write lock (`refreshInProgress` boolean) prevents concurrent refresh corruption.
- SPA fallback: all unmatched GET routes return `index.html` for client-side routing.

### UI Design — "Midnight Jackpot" Color Palette
- **Background:** Deep navy (`#0a0e1a`) with elevated surfaces in dark navy-blue.
- **Primary accent:** Gold (`#f5c842` / `#e8b820`) — used for headings, active states, key numbers.
- **Powerball red:** `#e63535` with glow shadow — used for Powerball-specific elements.
- **Typography:** Inter (Google Fonts) — 400/500/600/700/800/900 weights.
- **Spacing:** 4px base unit (8, 12, 16, 20, 24, 32, 40, 48, 64px scale as CSS variables).
- **Lottery balls:** Radial gradient spheres with specular highlight pseudo-element (`::before`), box-shadow for depth and glow. White balls use silver-white gradient; Powerballs use red-orange gradient with red glow.

### Ball-Drop Animation
- CSS `@keyframes ball-drop` with `translateY(-120px)` start, bounce at 60% (8px overshoot), settle to 0.
- Powerball variant has a slight scale effect for extra emphasis.
- Each ball staggered via `animationDelay: index * 400ms` (inline style).
- `animation-fill-mode: both` keeps balls invisible before their turn.
- Total sequence: 6 balls × 400ms + 700ms for last ball = ~3.1 seconds.
- Generate button disabled during animation; rationale fades in after all 6 balls land.

### Docker
- Multi-stage build: `client-deps` → `builder` → `runner`
- `client-deps` stage installs Vite/React dev dependencies with `bun install --frozen-lockfile`
- `builder` stage builds the React client with Vite
- `runner` stage uses the same `oven/bun:latest` base, copies only compiled artifacts
- `data/` directory included in the final image with pre-built 2010–2026 draws and stats

---

## How to Run Locally

### Prerequisites
- Bun v1.3+ installed (`curl -fsSL https://bun.sh/install | bash`)

### Install and Build
```bash
# Install client dependencies
cd src/client && bun install && cd ../..

# Fetch fresh data (optional — data/draws.json already included)
bun src/scraper/index.ts

# Recompute stats (optional — data/stats.json already included)
bun src/analyzer/index.ts

# Build the React client
cd src/client && bun run build && cd ../..

# Start the server
bun src/server/index.ts
```

Open http://localhost:3000

### Dev mode (with Vite HMR)
```bash
# Terminal 1: start API server
bun src/server/index.ts

# Terminal 2: start Vite dev server (proxies /api to localhost:3000)
cd src/client && bun run dev
```

Open http://localhost:5173

---

## How to Run via Docker

### Build
```bash
docker build -t harness-eng-test:2026-04-10-powerball .
```

### Run
```bash
docker run -p 3000:3000 harness-eng-test:2026-04-10-powerball
```

Open http://localhost:3000

### Final Docker Image Tag
```
harness-eng-test:2026-04-10-powerball
```

Image size: **104.7 MB**

### Docker run verification output
```
draw_count: 1931 | pb_eligible: 1758 | computed_at: 2026-04-11
```

---

## Dataset Statistics (as of 2026-04-11)

| Metric | Value |
|--------|-------|
| Total draws | 1,931 |
| Date range | 2010-02-03 to 2026-04-08 |
| PB-eligible draws | 1,758 |
| Pre-2015 draws (PB 27-35) | 173 |
| Draws with no multiplier | ~0 (all have Power Play) |

---

## Deviations from Plan

None. All plan requirements are implemented as specified:
- All 6 phases complete.
- `DrawRecord.powerballEligible` field implemented and used correctly.
- 4 prediction strategies: hot, cold, balanced, gap.
- All 4 UI views implemented with lottery-themed design.
- Ball-drop animation uses CSS keyframes only, 400ms interval.
- Update button calls `POST /api/refresh`, shows loading/success/error states.
- History table paginated at 20 rows per page.
- Docker multi-stage build verified on port 3000.
- `data/stats.json` includes `powerball_eligible_draw_count` field.

---

## Handoff to Validator

Run command:
```bash
docker run -p 3000:3000 harness-eng-test:2026-04-10-powerball
```

Then open http://localhost:3000 to verify all 4 views.

API verification:
```bash
# Stats API
curl http://localhost:3000/api/stats | jq '{draw_count, powerball_eligible_draw_count}'

# Draws API  
curl http://localhost:3000/api/draws | jq '{draw_count, first: .draws[0].date, last: .draws[-1].date}'

# Refresh API
curl -X POST http://localhost:3000/api/refresh | jq '{updated, new_draw_count, message}'
```

---

### Fix Cycle — 2026-04-11

**Issue addressed:** CONDITIONAL PASS — History view not updated after `POST /api/refresh`

The validator identified that after a successful data refresh, the History view continued to display stale draw records because `draws` state was never re-fetched. Only `stats` state was updated via `setLiveStats(newStats)`. The plan requires "all views (Statistics, Recommendations, History) re-render with the new data without a full page reload."

**Approach chosen: Option A — Re-fetch draws after refresh**

In `App.tsx`, after `handleUpdate()` sets the new `liveStats`, it now also calls `void drawsApi.refetch()`. The `useDraws` hook already exposed a `refetch` function that re-fetches `/api/draws` and updates `drawsApi.data` state. Since `const draws = drawsApi.data` is used directly (reactive React state), the History view automatically re-renders with the updated draw records when `refetch()` completes.

Option A was chosen over Option B because:
- No server-side changes are required (the fix is entirely in the React client)
- The `drawsApi.refetch` function already existed and was designed for this use case
- Adding `draws` to `RefreshResponse` would require changes to both the server type and `src/types.ts`, touching more files than necessary

**Files changed:**
- `src/client/src/App.tsx` — added `void drawsApi.refetch()` call inside `handleUpdate`

**New Docker image tag:** `harness-eng-test:2026-04-11-history-fix`

**Verification:**
- `bun run build` in `src/client/` — 0 errors, built in ~400ms
- `docker build -t harness-eng-test:2026-04-11-history-fix .` — success
- Container `GET /api/draws` → draw_count: 1931, last: 2026-04-08
- Container `POST /api/refresh` → updated: false, message: "Already up to date"
