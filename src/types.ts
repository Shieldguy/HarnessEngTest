// Shared types for the Powerball Predictor application

export type DrawRecord = {
  date: string          // ISO 8601 (YYYY-MM-DD)
  whiteBalls: number[]  // sorted, 5 numbers, range 1-69
  powerball: number     // historical: 1-35 (pre-2015) or 1-26 (2015+)
  multiplier?: number   // Power Play multiplier if present
  powerballEligible: boolean // true if powerball <= 26
}

export type DrawsFile = {
  fetched_at: string    // ISO 8601 timestamp of last scrape
  draw_count: number
  draws: DrawRecord[]   // sorted ascending by date
}

export type BallStat = {
  number: number
  frequency: number
  frequency_pct: number
  last_drawn: string | null   // ISO date string or null if never drawn
  gap: number                 // draws since last appearance
  avg_gap: number             // average draws between appearances
  hot: boolean                // appeared in last 10 draws
  cold: boolean               // not appeared in last 30 draws
}

export type WhiteBallStat = BallStat
export type PowerballStat = BallStat

export type StatsFile = {
  computed_at: string
  draw_count: number                                       // total draws (all eras)
  powerball_eligible_draw_count: number                    // draws where powerball is 1-26
  white_balls: Record<string, WhiteBallStat>               // keys "1"-"69", all draws
  powerballs: Record<string, PowerballStat>                // keys "1"-"26", eligible draws only
}

export type Strategy = 'hot' | 'cold' | 'balanced' | 'gap'

export type Recommendation = {
  strategy: Strategy
  whiteBalls: number[]   // 5 numbers, sorted, no repeat
  powerball: number
  rationale: string[]    // 6 entries: 5 white balls + 1 Powerball
}

export type RefreshResponse = {
  updated: boolean
  new_draw_count: number   // number of newly fetched draws (0 if up to date)
  message: string
  stats: StatsFile         // full updated stats (or current stats if no update)
}
