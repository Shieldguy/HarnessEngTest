/**
 * Client-side prediction engine — mirrors server-side logic
 */

import type { StatsFile, BallStat, Recommendation, Strategy } from '../types.js'

function sortedBalls(balls: number[]): number[] {
  return [...balls].sort((a, b) => a - b)
}

function getWhiteBallStats(stats: StatsFile): BallStat[] {
  return Object.values(stats.white_balls).sort((a, b) => a.number - b.number)
}

function getPowerballStats(stats: StatsFile): BallStat[] {
  return Object.values(stats.powerballs).sort((a, b) => a.number - b.number)
}

function selectHot(stats: StatsFile): Recommendation {
  const wbStats = getWhiteBallStats(stats)
  const pbStats = getPowerballStats(stats)

  const sortedWB = [...wbStats].sort((a, b) =>
    b.frequency !== a.frequency ? b.frequency - a.frequency : a.number - b.number
  )
  const sortedPB = [...pbStats].sort((a, b) =>
    b.frequency !== a.frequency ? b.frequency - a.frequency : a.number - b.number
  )

  const selectedWB = sortedWB.slice(0, 5)
  const selectedPB = sortedPB[0]

  const whiteBalls = sortedBalls(selectedWB.map(s => s.number))
  const powerball = selectedPB.number

  const ballToStat = new Map(selectedWB.map(s => [s.number, s]))
  const rationale = [
    ...whiteBalls.map(b => `Ball ${b} — appeared ${ballToStat.get(b)!.frequency} times (hot, top frequency)`),
    `Powerball ${powerball} — appeared ${selectedPB.frequency} times (most frequent Powerball)`,
  ]

  return { strategy: 'hot', whiteBalls, powerball, rationale }
}

function selectCold(stats: StatsFile): Recommendation {
  const wbStats = getWhiteBallStats(stats)
  const pbStats = getPowerballStats(stats)

  const sortedWB = [...wbStats].sort((a, b) =>
    b.gap !== a.gap ? b.gap - a.gap : a.number - b.number
  )
  const sortedPB = [...pbStats].sort((a, b) =>
    b.gap !== a.gap ? b.gap - a.gap : a.number - b.number
  )

  const selectedWB = sortedWB.slice(0, 5)
  const selectedPB = sortedPB[0]

  const whiteBalls = sortedBalls(selectedWB.map(s => s.number))
  const powerball = selectedPB.number

  const ballToStat = new Map(selectedWB.map(s => [s.number, s]))
  const rationale = [
    ...whiteBalls.map(b => `Ball ${b} — not drawn for ${ballToStat.get(b)!.gap} draws (cold, longest gap)`),
    `Powerball ${powerball} — not drawn for ${selectedPB.gap} draws (least recently drawn)`,
  ]

  return { strategy: 'cold', whiteBalls, powerball, rationale }
}

function selectBalanced(stats: StatsFile): Recommendation {
  const wbStats = getWhiteBallStats(stats)
  const pbStats = getPowerballStats(stats)

  const sortedByFreqDesc = [...wbStats].sort((a, b) =>
    b.frequency !== a.frequency ? b.frequency - a.frequency : a.number - b.number
  )
  const hotWB = sortedByFreqDesc.slice(0, 3)

  const hotNumbers = new Set(hotWB.map(s => s.number))
  const coldWB = [...wbStats]
    .filter(s => !hotNumbers.has(s.number))
    .sort((a, b) => b.gap !== a.gap ? b.gap - a.gap : a.number - b.number)
    .slice(0, 2)

  const sortedPBByFreq = [...pbStats].sort((a, b) =>
    b.frequency !== a.frequency ? b.frequency - a.frequency : a.number - b.number
  )
  const selectedPB = sortedPBByFreq[0]

  const whiteBalls = sortedBalls([...hotWB, ...coldWB].map(s => s.number))
  const powerball = selectedPB.number

  const hotMap = new Map(hotWB.map(s => [s.number, s]))
  const coldMap = new Map(coldWB.map(s => [s.number, s]))
  const rationale = [
    ...whiteBalls.map(b => {
      if (hotMap.has(b)) return `Ball ${b} — appeared ${hotMap.get(b)!.frequency} times (hot selection)`
      const s = coldMap.get(b)!
      return `Ball ${b} — not drawn for ${s.gap} draws (cold selection)`
    }),
    `Powerball ${powerball} — appeared ${selectedPB.frequency} times (hot Powerball)`,
  ]

  return { strategy: 'balanced', whiteBalls, powerball, rationale }
}

function selectGap(stats: StatsFile): Recommendation {
  const wbStats = getWhiteBallStats(stats)
  const pbStats = getPowerballStats(stats)

  const overdueWB = wbStats
    .filter(s => s.gap > s.avg_gap)
    .sort((a, b) => {
      const aDiff = a.gap - a.avg_gap
      const bDiff = b.gap - b.avg_gap
      return bDiff !== aDiff ? bDiff - aDiff : a.number - b.number
    })

  const fallbackWB = [...wbStats].sort((a, b) =>
    b.gap !== a.gap ? b.gap - a.gap : a.number - b.number
  )

  const selectedWB: BallStat[] = []
  const usedNumbers = new Set<number>()

  for (const ball of [...overdueWB, ...fallbackWB]) {
    if (selectedWB.length >= 5) break
    if (!usedNumbers.has(ball.number)) {
      selectedWB.push(ball)
      usedNumbers.add(ball.number)
    }
  }

  const overduePB = pbStats
    .filter(s => s.gap > s.avg_gap)
    .sort((a, b) => (b.gap - b.avg_gap) - (a.gap - a.avg_gap))

  const fallbackPB = [...pbStats].sort((a, b) => b.gap - a.gap)
  const selectedPB = overduePB[0] ?? fallbackPB[0]

  const whiteBalls = sortedBalls(selectedWB.map(s => s.number))
  const ballToStat = new Map(selectedWB.map(s => [s.number, s]))

  const rationale = [
    ...whiteBalls.map(b => {
      const s = ballToStat.get(b)!
      const overdueBy = Math.round(s.gap - s.avg_gap)
      return `Ball ${b} — gap ${s.gap} vs avg ${s.avg_gap} (${overdueBy > 0 ? 'overdue by ' + overdueBy : 'gap-selected'})`
    }),
    `Powerball ${selectedPB.number} — gap ${selectedPB.gap} vs avg ${selectedPB.avg_gap} (overdue)`,
  ]

  return { strategy: 'gap', whiteBalls, powerball: selectedPB.number, rationale }
}

export function predict(stats: StatsFile, strategy: Strategy): Recommendation {
  switch (strategy) {
    case 'hot': return selectHot(stats)
    case 'cold': return selectCold(stats)
    case 'balanced': return selectBalanced(stats)
    case 'gap': return selectGap(stats)
  }
}
