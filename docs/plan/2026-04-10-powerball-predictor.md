# Planner: Powerball Number Predictor

> **Version:** 1.3  
> **Date:** 2026-04-10  
> **Status:** Pending User Approval  
> **Agent:** Planner  
> **Changelog:**  
> - v1.1 — Pre-2015 Powerball handling: include draws but exclude Powerball numbers 27–35 from statistics  
> - v1.2 — Dashboard Update button: incremental scrape + re-analysis via Bun API server; architecture changed from static to full-stack  
> - v1.3 — Recommendations view: Generate button with ball-drop animation (one ball at a time)

---

## Objective

Build a full-stack web application that:
1. Scrapes Texas Powerball winning numbers from 2010 to the present
2. Computes frequency statistics for white balls (1–69) and Powerballs (1–26)
3. Applies statistical strategies to predict and recommend the next draw's numbers
4. Presents results through a React web UI
5. Allows on-demand incremental data refresh via a Dashboard Update button (no full re-scrape)

**Source data:** https://www.texaslottery.com/export/sites/lottery/Games/Powerball/Winning_Numbers/

---

## Powerball Rules (Data Context)

| Element | Range | Count per draw |
|---------|-------|----------------|
| White balls | 1–69 | 5 (no repeat) |
| Powerball | 1–26 | 1 |

Draws occur every Monday, Wednesday, and Saturday.

### Historical Rule Change — Powerball Range

On **October 7, 2015**, the Powerball number range changed from 1–35 to 1–26.

**Policy (user decision):**
- All draws from 2010-01-01 to present are **collected and stored** in `data/draws.json` regardless of era
- For **Powerball statistics**, only draws where the Powerball number is in range **1–26** are counted
- Draws with a Powerball number of **27–35** (pre-Oct 2015) are **excluded from Powerball frequency statistics** but their **white ball data is still included** in white ball statistics
- No draw record is deleted — exclusion applies only at the analysis layer

```
DrawRecord (stored)          Powerball stat inclusion
─────────────────────────    ──────────────────────────────────────
date: 2014-05-03             whiteBalls → included in white ball stats
whiteBalls: [4,12,35,51,68]  powerball (32) → EXCLUDED (out of 1–26 range)
powerball: 32

date: 2017-08-12             whiteBalls → included in white ball stats
whiteBalls: [7,19,22,44,60]  powerball (14) → INCLUDED
powerball: 14
```

The `StatsFile` will include a `powerball_eligible_draw_count` field to reflect the number of draws actually used for Powerball statistics.

---

## Architecture Overview

This is a **full-stack application** served by a single Bun HTTP server:

```
Browser (React)
    │
    │  HTTP (port 3000)
    ▼
Bun HTTP Server (src/server/)
    ├── GET  /                    → serve React app (static build)
    ├── GET  /api/stats           → return data/stats.json
    ├── GET  /api/draws           → return data/draws.json
    └── POST /api/refresh         → incremental scrape → re-analyze → return new stats
         │
         ├── src/scraper/         fetch only new draws (since last cached date)
         ├── src/analyzer/        recompute stats over full dataset
         └── data/                persist updated draws.json and stats.json
```

The React frontend calls `/api/refresh` when the user clicks **Update** on the Dashboard.
All other views read from `/api/stats` and `/api/draws` on initial load.

---

## Implementation Phases

### Phase 1 — Data Collection (Scraper)

**Goal:** Fetch all historical winning numbers from 2010-01-01 to the most recent draw.

**Tasks:**
- Inspect the Texas Lottery results page and determine data format (HTML table / JSON API)
- Implement a scraper module (`src/scraper/`) using Bun's native `fetch`
- Parse each draw record into a normalized structure:
  ```ts
  type DrawRecord = {
    date: string         // ISO 8601 (YYYY-MM-DD)
    whiteBalls: number[] // sorted, 5 numbers, range 1–69
    powerball: number    // historical range: 1–35 (pre-2015) or 1–26 (2015–present)
    multiplier?: number  // Power Play multiplier if present
    powerballEligible: boolean // true if powerball is in range 1–26
  }
  ```
- Persist results to `data/draws.json` as the local cache
- Implement incremental refresh: only fetch draws newer than the latest cached date
- Set `powerballEligible: true` when `powerball <= 26`, `false` when `powerball >= 27`

**Acceptance Criteria:**
- [ ] All draws from 2010-01-01 to current date are collected
- [ ] No duplicate draw records
- [ ] Each record has correct `powerballEligible` flag (true if powerball ≤ 26)
- [ ] White ball values are always in range 1–69 for all draws
- [ ] Incremental refresh runs without re-fetching already cached data

---

### Phase 2 — Statistical Analysis (Analyzer)

**Goal:** Compute frequency and gap statistics over the collected dataset.

**Tasks:**
- Implement `src/analyzer/` with the following outputs per number:

  **White ball statistics (per number 1–69):**
  | Metric | Description |
  |--------|-------------|
  | `frequency` | Total appearances across all draws |
  | `frequency_pct` | Appearance rate (%) |
  | `last_drawn` | Most recent draw date |
  | `gap` | Draws since last appearance |
  | `avg_gap` | Average draws between appearances |
  | `hot` | Appeared in the last 10 draws |
  | `cold` | Not appeared in the last 30 draws |

  **Powerball statistics (per number 1–26):** same metrics as above, computed only over draws where `powerballEligible === true`. Powerball numbers 27–35 are never included.

- Persist output to `data/stats.json`

**Acceptance Criteria:**
- [ ] White ball statistics computed from **all draws** (2010–present)
- [ ] Powerball statistics computed only from draws where `powerballEligible === true` (powerball ≤ 26)
- [ ] No Powerball number outside range 1–26 appears in `stats.json`
- [ ] `stats.json` includes `powerball_eligible_draw_count` (draws used for Powerball stats)
- [ ] `hot` and `cold` flags are mutually exclusive per number
- [ ] Output passes schema validation

---

### Phase 3 — Prediction Engine (Predictor)

**Goal:** Recommend a set of numbers for the next draw using configurable strategies.

**Strategies (all must be implemented; user selects via UI):**

| Strategy | Logic |
|----------|-------|
| **Hot** | Select the 5 most frequently drawn white balls + most frequent Powerball |
| **Cold** | Select the 5 least recently drawn white balls + least recently drawn Powerball |
| **Balanced** | Mix of hot and cold: 3 hot white balls + 2 cold white balls + hot Powerball |
| **Gap-based** | Select numbers whose current gap exceeds their average gap (overdue numbers) |

**Output per recommendation:**
```ts
type Recommendation = {
  strategy: 'hot' | 'cold' | 'balanced' | 'gap'
  whiteBalls: number[]  // 5 numbers, sorted, no repeat
  powerball: number
  rationale: string[]   // one line per number explaining why it was chosen
}
```

**Acceptance Criteria:**
- [ ] All 4 strategies produce valid draw combinations (5 unique white balls in 1–69, 1 Powerball in 1–26)
- [ ] Rationale array has exactly 6 entries (5 white balls + 1 Powerball)
- [ ] No white ball number appears in both the recommendation and is out of valid range
- [ ] Strategy output is deterministic given the same `stats.json` input

---

### Phase 4 — Bun API Server

**Goal:** Expose a lightweight HTTP server that serves the React app and provides API endpoints for data access and incremental refresh.

**Endpoints:**

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/` | Serve the built React app (`dist/index.html`) |
| `GET` | `/api/stats` | Return `data/stats.json` as JSON |
| `GET` | `/api/draws` | Return `data/draws.json` as JSON |
| `POST` | `/api/refresh` | Incremental scrape + re-analyze; return updated stats |

**`POST /api/refresh` behavior:**
1. Read `data/draws.json` to find the latest cached draw date
2. Scrape the Texas Lottery site for draws **newer than that date only**
3. Append new records to `data/draws.json`
4. Recompute all statistics and overwrite `data/stats.json`
5. Return the updated `StatsFile` as the response body
6. If no new draws are found, return `{ updated: false, message: "Already up to date" }`

**Response schema for `/api/refresh`:**
```ts
type RefreshResponse = {
  updated: boolean
  new_draw_count: number    // number of newly fetched draws (0 if up to date)
  message: string
  stats: StatsFile          // full updated stats (or current stats if no update)
}
```

**Acceptance Criteria:**
- [ ] `GET /api/stats` returns valid `StatsFile` JSON
- [ ] `GET /api/draws` returns valid `DrawsFile` JSON
- [ ] `POST /api/refresh` fetches only draws newer than the latest cached date
- [ ] `POST /api/refresh` returns `updated: false` when no new draws exist
- [ ] `POST /api/refresh` updates both `data/draws.json` and `data/stats.json` on disk
- [ ] Server handles concurrent requests without corrupting data files (write lock or sequential refresh)
- [ ] All endpoints return appropriate HTTP status codes and `Content-Type: application/json`

---

### Phase 5 — React UI (Frontend)

**Goal:** Present statistics and recommendations in a browser via a React web app, with live data refresh.

**Pages / Views:**

| View | Content |
|------|---------|
| **Dashboard** | Summary cards + **Update button** |
| **Statistics** | Frequency bar chart for white balls and Powerball; hot/cold highlights |
| **Recommendations** | Strategy selector + **Generate button** + ball-drop animation |
| **History** | Paginated table of all draw records |

**Dashboard — Update Button spec:**

```
┌─────────────────────────────────────────────────────┐
│  Total draws: 1,842       Last draw: 2026-04-08      │
│  Date range: 2010-01-09 – 2026-04-08                 │
│  PB-eligible draws: 1,523  Last updated: 2026-04-09  │
│                                                       │
│  [ Update ]  ← calls POST /api/refresh               │
│                                                       │
│  (while loading) spinner + "Fetching latest data…"   │
│  (on success)   "3 new draws added. Stats updated."  │
│  (up to date)   "Already up to date."                │
│  (on error)     "Update failed. Try again."          │
└─────────────────────────────────────────────────────┘
```

- Button is **disabled** while a refresh is in progress (prevent double-submit)
- After a successful update, all views (Statistics, Recommendations, History) **re-render with the new data** without a full page reload
- State management: React context or prop-drilling from root state is acceptable for v1

**Recommendations View — Generate Button & Ball-Drop Animation spec:**

```
┌──────────────────────────────────────────────────────────────┐
│  Strategy: [ Hot ▾ ]                                          │
│                                                               │
│  [ Generate ]  ← triggers animation sequence                  │
│                                                               │
│  Ball tray (6 slots):                                         │
│                                                               │
│   ①   ②   ③   ④   ⑤      🔴         │
│  (white balls — 5)        (Powerball)  │
│                                                               │
│  Rationale:                                                    │
│  • Ball 12 — appeared 87 times (most frequent)                │
│  • ...                                                         │
└──────────────────────────────────────────────────────────────┘
```

**Animation sequence (on Generate click):**

1. Clear any previously shown balls — all 6 slots go blank instantly
2. Balls drop in one at a time, left to right:
   - Each ball starts **above** its slot (off-screen or from the top of the tray)
   - It **falls down** into its slot with a short bounce easing (ease-in + slight bounce at landing)
   - Interval between each ball drop: **400 ms**
   - Total sequence for 5 white balls + 1 Powerball: ~2.4 seconds
3. White balls are styled with a **white/light background** and dark number
4. The Powerball slot drops last and is styled with a **red background** and white number
5. While animation is running, the **Generate button is disabled** (prevent re-trigger mid-sequence)
6. The rationale list fades in **after all 6 balls have landed**

**Animation implementation notes (for Developer):**
- Use CSS `@keyframes` with `transform: translateY()` — no animation library required
- Ball drop keyframe example:
  ```css
  @keyframes ball-drop {
    0%   { transform: translateY(-120px); opacity: 0; }
    60%  { transform: translateY(8px);   opacity: 1; }
    80%  { transform: translateY(-4px); }
    100% { transform: translateY(0px); }
  }
  ```
- Stagger timing via inline `style={{ animationDelay: `${index * 400}ms` }}`
- `animation-fill-mode: both` to keep balls hidden before their drop begins

**Technical requirements:**
- React 18+ with TypeScript
- No external CSS framework required (inline styles or CSS modules acceptable)
- All data fetched from Bun API server at runtime (`/api/stats`, `/api/draws`, `/api/refresh`)
- Responsive layout (desktop-first, mobile readable)

**Acceptance Criteria:**
- [ ] All 4 views render without runtime errors on initial load
- [ ] Dashboard shows correct summary values from `/api/stats`
- [ ] **Update button calls `POST /api/refresh`** and shows loading state while waiting
- [ ] After successful refresh, all views update with new data without page reload
- [ ] Update button is disabled during in-progress refresh
- [ ] User sees a clear success / up-to-date / error message after each Update action
- [ ] **Generate button triggers ball-drop animation** — 6 balls drop one at a time, 400 ms apart
- [ ] Balls clear instantly before each new generation sequence
- [ ] White balls styled with light background; Powerball styled with red background
- [ ] Generate button is disabled while animation is in progress
- [ ] Rationale list appears only after all 6 balls have landed
- [ ] Animation uses CSS keyframes only (no external animation library)
- [ ] Changing strategy and clicking Generate shows a new animation sequence
- [ ] History table is paginated (20 rows per page minimum)
- [ ] App builds successfully with `bun run build`

---

### Phase 6 — Docker Packaging

**Goal:** Package the complete app into a Docker image using the `oven/bun` base.

**Tasks:**
- Write a multi-stage `Dockerfile` (deps → builder → runner)
- Ensure `data/` directory is included in the final image
- Expose port 3000
- Verify with `docker run -p 3000:3000 ...` that the app serves correctly

**Acceptance Criteria:**
- [ ] `docker build` completes without errors
- [ ] `docker run` serves the React app on port 3000
- [ ] Container includes pre-built `data/draws.json` and `data/stats.json`
- [ ] Image size is reasonable (document final size in implementation notes)

---

## Dataset Schema

### `data/draws.json`
```ts
type DrawsFile = {
  fetched_at: string      // ISO 8601 timestamp of last scrape
  draw_count: number
  draws: DrawRecord[]     // sorted ascending by date
}
```

### `data/stats.json`
```ts
type StatsFile = {
  computed_at: string
  draw_count: number                    // total draws (all eras)
  powerball_eligible_draw_count: number // draws where powerball is in 1–26
  white_balls: Record<string, WhiteBallStat>   // keys "1"–"69", all draws
  powerballs: Record<string, PowerballStat>    // keys "1"–"26", eligible draws only
}
```

---

## Open Questions / Risks

| # | Question | Risk | Owner |
|---|----------|------|-------|
| 1 | Does the Texas Lottery site allow scraping? Check `robots.txt` and rate-limit appropriately | Medium | Developer |
| 2 | Does the site structure change for older data (pre-2012 Powerball rule changes)? | Medium | Developer |
| 3 | ~~Powerball range changed from 1–35 to 1–26 in October 2015~~ — **RESOLVED** | — | — |
| 4 | Site may require JavaScript rendering — if `fetch` alone is insufficient, use a headless approach | Medium | Developer |

> **Resolution on Risk #3:** Pre-2015 draws are **retained** in `data/draws.json`. Powerball numbers 27–35 are filtered out at the analysis layer via the `powerballEligible` flag. White ball data from all draws (including pre-2015) contributes to white ball statistics. Only Powerball numbers 1–26 are counted in Powerball statistics.

---

## Deliverables Checklist

- [ ] Phase 1: `data/draws.json` with 2010–present draws
- [ ] Phase 2: `data/stats.json` with full statistics
- [ ] Phase 3: 4 prediction strategies returning valid recommendations
- [ ] Phase 4: Bun API server with `/api/stats`, `/api/draws`, `/api/refresh`
- [ ] Phase 5: React UI with all 4 views + Update button functional
- [ ] Phase 6: Docker image running on port 3000
- [ ] `docs/harness/2026-04-10-powerball-predictor.md` with run instructions

---

## Approval

- [ ] **User approval required before Developer begins implementation**
