/**
 * Powerball Prediction Engine
 * Implements 4 prediction strategies: hot, cold, balanced, gap-based
 */

import type { StatsFile, BallStat, Recommendation, Strategy } from '../types.js'

const WHITE_BALL_MIN = 1
const WHITE_BALL_MAX = 69
const WHITE_BALL_COUNT = 5
const POWERBALL_MIN = 1
const POWERBALL_MAX = 26

function sortedBalls(balls: number[]): number[] {
  return [...balls].sort((a, b) => a - b)
}

function getWhiteBallStats(stats: StatsFile): BallStat[] {
  return Object.values(stats.white_balls)
    .filter(s => s.number >= WHITE_BALL_MIN && s.number <= WHITE_BALL_MAX)
    .sort((a, b) => a.number - b.number)
}

function getPowerballStats(stats: StatsFile): BallStat[] {
  return Object.values(stats.powerballs)
    .filter(s => s.number >= POWERBALL_MIN && s.number <= POWERBALL_MAX)
    .sort((a, b) => a.number - b.number)
}

function selectHot(stats: StatsFile): Recommendation {
  const wbStats = getWhiteBallStats(stats)
  const pbStats = getPowerballStats(stats)

  // Sort by frequency descending, then by number ascending for determinism
  const sortedWB = [...wbStats].sort((a, b) =>
    b.frequency !== a.frequency ? b.frequency - a.frequency : a.number - b.number
  )
  const sortedPB = [...pbStats].sort((a, b) =>
    b.frequency !== a.frequency ? b.frequency - a.frequency : a.number - b.number
  )

  const selectedWB = sortedWB.slice(0, WHITE_BALL_COUNT)
  const selectedPB = sortedPB[0]

  const whiteBalls = sortedBalls(selectedWB.map(s => s.number))
  const powerball = selectedPB.number

  const rationale = [
    ...selectedWB.map(s => `Ball ${s.number} — appeared ${s.frequency} times (hot, top frequency)`),
    `Powerball ${powerball} — appeared ${selectedPB.frequency} times (most frequent Powerball)`,
  ]

  return { strategy: 'hot', whiteBalls, powerball, rationale }
}

function selectCold(stats: StatsFile): Recommendation {
  const wbStats = getWhiteBallStats(stats)
  const pbStats = getPowerballStats(stats)

  // Sort by gap descending (most draws since last appearance), then by number for determinism
  const sortedWB = [...wbStats].sort((a, b) =>
    b.gap !== a.gap ? b.gap - a.gap : a.number - b.number
  )
  const sortedPB = [...pbStats].sort((a, b) =>
    b.gap !== a.gap ? b.gap - a.gap : a.number - b.number
  )

  const selectedWB = sortedWB.slice(0, WHITE_BALL_COUNT)
  const selectedPB = sortedPB[0]

  const whiteBalls = sortedBalls(selectedWB.map(s => s.number))
  const powerball = selectedPB.number

  const rationale = [
    ...selectedWB.map(s => `Ball ${s.number} — not drawn for ${s.gap} draws (cold, longest gap)`),
    `Powerball ${powerball} — not drawn for ${selectedPB.gap} draws (least recently drawn Powerball)`,
  ]

  return { strategy: 'cold', whiteBalls, powerball, rationale }
}

function selectBalanced(stats: StatsFile): Recommendation {
  const wbStats = getWhiteBallStats(stats)
  const pbStats = getPowerballStats(stats)

  // 3 hot white balls (highest frequency)
  const sortedByFreqDesc = [...wbStats].sort((a, b) =>
    b.frequency !== a.frequency ? b.frequency - a.frequency : a.number - b.number
  )
  const hotWB = sortedByFreqDesc.slice(0, 3)

  // 2 cold white balls (highest gap), excluding already selected
  const hotNumbers = new Set(hotWB.map(s => s.number))
  const sortedByGapDesc = [...wbStats]
    .filter(s => !hotNumbers.has(s.number))
    .sort((a, b) => b.gap !== a.gap ? b.gap - a.gap : a.number - b.number)
  const coldWB = sortedByGapDesc.slice(0, 2)

  // Hot Powerball (highest frequency)
  const sortedPBByFreq = [...pbStats].sort((a, b) =>
    b.frequency !== a.frequency ? b.frequency - a.frequency : a.number - b.number
  )
  const selectedPB = sortedPBByFreq[0]

  const whiteBalls = sortedBalls([...hotWB, ...coldWB].map(s => s.number))
  const powerball = selectedPB.number

  const rationale = [
    ...hotWB.map(s => `Ball ${s.number} — appeared ${s.frequency} times (hot selection)`),
    ...coldWB.map(s => `Ball ${s.number} — not drawn for ${s.gap} draws (cold selection)`),
    `Powerball ${powerball} — appeared ${selectedPB.frequency} times (hot Powerball)`,
  ]

  // Sort rationale to match sorted whiteBalls order
  const ballToRationale: Map<number, string> = new Map()
  hotWB.forEach(s => ballToRationale.set(s.number, `Ball ${s.number} — appeared ${s.frequency} times (hot selection)`))
  coldWB.forEach(s => ballToRationale.set(s.number, `Ball ${s.number} — not drawn for ${s.gap} draws (cold selection)`))

  const sortedRationale = [
    ...whiteBalls.map(b => ballToRationale.get(b) ?? `Ball ${b}`),
    `Powerball ${powerball} — appeared ${selectedPB.frequency} times (hot Powerball)`,
  ]

  return { strategy: 'balanced', whiteBalls, powerball, rationale: sortedRationale }
}

function selectGap(stats: StatsFile): Recommendation {
  const wbStats = getWhiteBallStats(stats)
  const pbStats = getPowerballStats(stats)

  // Select numbers where current gap > average gap (overdue numbers)
  const overdueWB = wbStats
    .filter(s => s.gap > s.avg_gap)
    .sort((a, b) => {
      // Sort by how overdue they are (gap - avg_gap) descending
      const aDiff = a.gap - a.avg_gap
      const bDiff = b.gap - b.avg_gap
      return bDiff !== aDiff ? bDiff - aDiff : a.number - b.number
    })

  // If not enough overdue balls, fall back to highest gap
  const fallbackWB = [...wbStats].sort((a, b) =>
    b.gap !== a.gap ? b.gap - a.gap : a.number - b.number
  )

  const selectedWB: BallStat[] = []
  const usedNumbers = new Set<number>()

  for (const ball of overdueWB) {
    if (selectedWB.length >= WHITE_BALL_COUNT) break
    if (!usedNumbers.has(ball.number)) {
      selectedWB.push(ball)
      usedNumbers.add(ball.number)
    }
  }

  // Fill remaining from fallback
  for (const ball of fallbackWB) {
    if (selectedWB.length >= WHITE_BALL_COUNT) break
    if (!usedNumbers.has(ball.number)) {
      selectedWB.push(ball)
      usedNumbers.add(ball.number)
    }
  }

  // Overdue powerballs
  const overduePB = pbStats
    .filter(s => s.gap > s.avg_gap)
    .sort((a, b) => {
      const aDiff = a.gap - a.avg_gap
      const bDiff = b.gap - b.avg_gap
      return bDiff !== aDiff ? bDiff - aDiff : a.number - b.number
    })

  const fallbackPB = [...pbStats].sort((a, b) =>
    b.gap !== a.gap ? b.gap - a.gap : a.number - b.number
  )

  const selectedPB = overduePB[0] ?? fallbackPB[0]

  const whiteBalls = sortedBalls(selectedWB.map(s => s.number))
  const powerball = selectedPB.number

  const ballToStat: Map<number, BallStat> = new Map(selectedWB.map(s => [s.number, s]))
  const sortedRationale = whiteBalls.map(b => {
    const s = ballToStat.get(b)!
    const overdueBy = Math.round(s.gap - s.avg_gap)
    return `Ball ${b} — gap ${s.gap} vs avg ${s.avg_gap} (${overdueBy > 0 ? 'overdue by ' + overdueBy : 'gap-selected'})`
  })

  const pbOverdue = Math.round(selectedPB.gap - selectedPB.avg_gap)
  sortedRationale.push(
    `Powerball ${powerball} — gap ${selectedPB.gap} vs avg ${selectedPB.avg_gap} (${pbOverdue > 0 ? 'overdue by ' + pbOverdue : 'gap-selected'})`
  )

  return { strategy: 'gap', whiteBalls, powerball, rationale: sortedRationale }
}

export function predict(stats: StatsFile, strategy: Strategy): Recommendation {
  switch (strategy) {
    case 'hot':
      return selectHot(stats)
    case 'cold':
      return selectCold(stats)
    case 'balanced':
      return selectBalanced(stats)
    case 'gap':
      return selectGap(stats)
    default: {
      const _exhaustive: never = strategy
      throw new Error(`Unknown strategy: ${_exhaustive}`)
    }
  }
}

export function predictAll(stats: StatsFile): Record<Strategy, Recommendation> {
  return {
    hot: predict(stats, 'hot'),
    cold: predict(stats, 'cold'),
    balanced: predict(stats, 'balanced'),
    gap: predict(stats, 'gap'),
  }
}

function validateRecommendation(rec: Recommendation): { valid: boolean; errors: string[] } {
  const errors: string[] = []

  // Check white balls count
  if (rec.whiteBalls.length !== 5) {
    errors.push(`Expected 5 white balls, got ${rec.whiteBalls.length}`)
  }

  // Check white balls range
  const outOfRange = rec.whiteBalls.filter(b => b < 1 || b > 69)
  if (outOfRange.length > 0) {
    errors.push(`White balls out of range 1-69: ${outOfRange}`)
  }

  // Check no duplicates
  const unique = new Set(rec.whiteBalls)
  if (unique.size !== rec.whiteBalls.length) {
    errors.push('Duplicate white balls detected')
  }

  // Check Powerball range
  if (rec.powerball < 1 || rec.powerball > 26) {
    errors.push(`Powerball out of range 1-26: ${rec.powerball}`)
  }

  // Check rationale count
  if (rec.rationale.length !== 6) {
    errors.push(`Expected 6 rationale entries, got ${rec.rationale.length}`)
  }

  return { valid: errors.length === 0, errors }
}

// Run as standalone script
if (import.meta.main) {
  const { readFileSync, existsSync } = await import('fs')
  const { join } = await import('path')

  const STATS_FILE = join(process.cwd(), 'data', 'stats.json')
  if (!existsSync(STATS_FILE)) {
    console.error('stats.json not found. Run the analyzer first.')
    process.exit(1)
  }

  const stats: StatsFile = JSON.parse(readFileSync(STATS_FILE, 'utf-8'))
  const strategies: Strategy[] = ['hot', 'cold', 'balanced', 'gap']

  console.log('=== Prediction Engine ===\n')

  for (const strategy of strategies) {
    const rec = predict(stats, strategy)
    const { valid, errors } = validateRecommendation(rec)

    console.log(`Strategy: ${strategy.toUpperCase()}`)
    console.log(`  White Balls: ${rec.whiteBalls.join(', ')}`)
    console.log(`  Powerball:   ${rec.powerball}`)
    console.log(`  Valid:       ${valid ? 'YES' : 'NO - ' + errors.join(', ')}`)
    console.log(`  Rationale:`)
    rec.rationale.forEach(r => console.log(`    - ${r}`))
    console.log()
  }
}
