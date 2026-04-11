# Powerball Number Predictor

A harness engineering practice project that collects Texas Powerball winning numbers (2010–present), computes frequency statistics, and recommends the next draw's numbers based on probability analysis.

## What It Does

1. **Collect** — Scrapes historical Powerball winning numbers from the [Texas Lottery](https://www.texaslottery.com/export/sites/lottery/Games/Powerball/Winning_Numbers/) website (2010 to the most recent draw)
2. **Analyze** — Computes frequency statistics for each white ball (1–69) and Powerball (1–26)
3. **Predict** — Applies configurable prediction strategies (frequency-based, gap analysis, hot/cold) to recommend the next set of numbers
4. **Display** — Presents statistics and recommendations via a React web UI

## Tech Stack

| Layer | Technology |
|-------|------------|
| Language | TypeScript (strict mode, ESM) |
| UI | React 18+ |
| Runtime | Bun |
| Containerization | Docker (`oven/bun` base image) |

## Project Structure

```
src/
  scraper/      # Texas Lottery data collection
  analyzer/     # Frequency and gap statistics
  predictor/    # Recommendation strategies
  ui/           # React frontend
docs/
  plan/         # Planner agent documents
  harness/      # Developer implementation notes
  validation/   # Validator cycle reports
  report/       # Final validation reports
  conversation/ # Session conversation logs
.agents/
  planner.md    # Planner agent definition
  developer.md  # Developer agent definition
  validator.md  # Validator agent definition
```

## Getting Started

```bash
# Install dependencies
bun install

# Run locally
bun run dev

# Run via Docker
docker build -t powerball-predictor .
docker run -p 3000:3000 powerball-predictor
```

## Agent Workflow

This project uses a three-agent harness engineering workflow:

```
Planner → (user approval) → Developer → Validator
                                 ↑              |
                                 └── FAIL / FIX ┘
```

See `.agents/` for agent definitions and `docs/plan/` for the implementation plan.

## Disclaimer

This application is for educational and harness engineering practice purposes only.
Statistical frequency analysis does not guarantee future lottery outcomes.
Lottery draws are independent random events.
