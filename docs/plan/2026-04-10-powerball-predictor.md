# Planner: Powerball Number Predictor

> **Version:** 1.0  
> **Date:** 2026-04-10  
> **Status:** Pending User Approval  
> **Agent:** Planner

---

## Objective

Build a web application that:
1. Scrapes Texas Powerball winning numbers from 2010 to the present
2. Computes frequency statistics for white balls (1–69) and Powerballs (1–26)
3. Applies statistical strategies to predict and recommend the next draw's numbers
4. Presents results through a React web UI

**Source data:** https://www.texaslottery.com/export/sites/lottery/Games/Powerball/Winning_Numbers/

---

## Powerball Rules (Data Context)

| Element | Range | Count per draw |
|---------|-------|----------------|
| White balls | 1–69 | 5 (no repeat) |
| Powerball | 1–26 | 1 |

Draws occur every Monday, Wednesday, and Saturday.

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
    date: string        // ISO 8601 (YYYY-MM-DD)
    whiteBalls: number[] // sorted, 5 numbers, range 1–69
    powerball: number   // range 1–26
    multiplier?: number // Power Play multiplier if present
  }
  ```
- Persist results to `data/draws.json` as the local cache
- Implement incremental refresh: only fetch draws newer than the latest cached date

**Acceptance Criteria:**
- [ ] All draws from 2010-01-01 to current date are collected
- [ ] No duplicate draw records
- [ ] Each record passes schema validation (date, 5 white balls in range, 1 Powerball in range)
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

  **Powerball statistics (per number 1–26):** same metrics as above.

- Persist output to `data/stats.json`

**Acceptance Criteria:**
- [ ] Statistics computed for all 69 white ball numbers and all 26 Powerball numbers
- [ ] `frequency_pct` sums to approximately 500/69 × 100% per draw for white balls (expected rate)
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

### Phase 4 — React UI (Frontend)

**Goal:** Present statistics and recommendations in a browser via a React web app.

**Pages / Views:**

| View | Content |
|------|---------|
| **Dashboard** | Total draws analyzed, date range, last updated |
| **Statistics** | Frequency bar chart for white balls and Powerball; hot/cold highlights |
| **Recommendations** | Strategy selector + recommended numbers displayed as lottery balls |
| **History** | Paginated table of all draw records |

**Technical requirements:**
- React 18+ with TypeScript
- No external CSS framework required (inline styles or CSS modules acceptable)
- Data loaded from static `data/stats.json` and `data/draws.json` at build time (no runtime API calls required for v1)
- Responsive layout (desktop-first, mobile readable)

**Acceptance Criteria:**
- [ ] All 4 views render without runtime errors
- [ ] Statistics view shows correct frequency values matching `data/stats.json`
- [ ] Recommendations update when user changes strategy selection
- [ ] History table is paginated (20 rows per page minimum)
- [ ] App builds successfully with `bun run build`

---

### Phase 5 — Docker Packaging

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
  draw_count: number
  white_balls: Record<string, WhiteBallStat>   // keys "1"–"69"
  powerballs: Record<string, PowerballStat>    // keys "1"–"26"
}
```

---

## Open Questions / Risks

| # | Question | Risk | Owner |
|---|----------|------|-------|
| 1 | Does the Texas Lottery site allow scraping? Check `robots.txt` and rate-limit appropriately | Medium | Developer |
| 2 | Does the site structure change for older data (pre-2012 Powerball rule changes)? | Medium | Developer |
| 3 | Powerball range changed from 1–35 to 1–26 in October 2015. Pre-change data should be excluded or flagged | High | Developer |
| 4 | Site may require JavaScript rendering — if `fetch` alone is insufficient, use a headless approach | Medium | Developer |

> **Note on Risk #3:** The Powerball number range changed on October 7, 2015. Data before this date uses a different range (1–35) and should be treated as a separate dataset or excluded from the 1–26 statistics to avoid skew. The Developer must handle this explicitly.

---

## Deliverables Checklist

- [ ] Phase 1: `data/draws.json` with 2010–present draws
- [ ] Phase 2: `data/stats.json` with full statistics
- [ ] Phase 3: 4 prediction strategies returning valid recommendations
- [ ] Phase 4: React UI with all 4 views functional
- [ ] Phase 5: Docker image running on port 3000
- [ ] `docs/harness/2026-04-10-powerball-predictor.md` with run instructions

---

## Approval

- [ ] **User approval required before Developer begins implementation**
