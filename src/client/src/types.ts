// Shared types for the React client

export type DrawRecord = {
  date: string
  whiteBalls: number[]
  powerball: number
  multiplier?: number
  powerballEligible: boolean
}

export type DrawsFile = {
  fetched_at: string
  draw_count: number
  draws: DrawRecord[]
}

export type BallStat = {
  number: number
  frequency: number
  frequency_pct: number
  last_drawn: string | null
  gap: number
  avg_gap: number
  hot: boolean
  cold: boolean
}

export type StatsFile = {
  computed_at: string
  draw_count: number
  powerball_eligible_draw_count: number
  white_balls: Record<string, BallStat>
  powerballs: Record<string, BallStat>
}

export type Strategy = 'hot' | 'cold' | 'balanced' | 'gap'

export type Recommendation = {
  strategy: Strategy
  whiteBalls: number[]
  powerball: number
  rationale: string[]
}

export type RefreshResponse = {
  updated: boolean
  new_draw_count: number
  message: string
  stats: StatsFile
}

export type View = 'dashboard' | 'statistics' | 'recommendations' | 'history'
