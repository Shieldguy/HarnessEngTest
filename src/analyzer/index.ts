/**
 * Powerball Statistical Analyzer
 * Computes frequency, gap, hot/cold statistics for white balls and Powerball numbers
 */

import { writeFileSync, readFileSync, existsSync } from 'fs'
import { join } from 'path'
import type { DrawRecord, DrawsFile, StatsFile, BallStat } from '../types.js'

const DATA_DIR = join(process.cwd(), 'data')
const DRAWS_FILE = join(DATA_DIR, 'draws.json')
const STATS_FILE = join(DATA_DIR, 'stats.json')

const WHITE_BALL_COUNT = 69
const POWERBALL_COUNT = 26
const HOT_WINDOW = 10   // draws for "hot" flag
const COLD_WINDOW = 30  // draws for "cold" flag

function loadDraws(): DrawsFile {
  if (!existsSync(DRAWS_FILE)) {
    throw new Error(`draws.json not found at ${DRAWS_FILE}. Run the scraper first.`)
  }
  const content = readFileSync(DRAWS_FILE, 'utf-8')
  return JSON.parse(content) as DrawsFile
}

function computeBallStats(
  draws: DrawRecord[],
  getBalls: (draw: DrawRecord) => number[],
  range: number
): Record<string, BallStat> {
  const totalDraws = draws.length

  // Count appearances and track dates
  const appearances: Map<number, string[]> = new Map()
  for (let i = 1; i <= range; i++) {
    appearances.set(i, [])
  }

  for (const draw of draws) {
    const balls = getBalls(draw)
    for (const ball of balls) {
      const list = appearances.get(ball)
      if (list !== undefined) {
        list.push(draw.date)
      }
    }
  }

  // Determine which balls appear in last HOT_WINDOW / COLD_WINDOW draws
  const hotDrawDates = new Set(draws.slice(-HOT_WINDOW).map(d => d.date))
  const coldWindowDates = new Set(draws.slice(-COLD_WINDOW).map(d => d.date))

  const hotBalls = new Set<number>()
  const coldBalls = new Set<number>()

  for (let i = 1; i <= range; i++) {
    const drawDates = appearances.get(i) ?? []

    const isHot = drawDates.some(date => hotDrawDates.has(date))
    const isInColdWindow = drawDates.some(date => coldWindowDates.has(date))

    if (isHot) hotBalls.add(i)
    if (!isInColdWindow) coldBalls.add(i)
  }

  // Build stats per ball
  const result: Record<string, BallStat> = {}

  for (let i = 1; i <= range; i++) {
    const drawDates = (appearances.get(i) ?? []).sort()
    const frequency = drawDates.length
    const frequency_pct = totalDraws > 0 ? (frequency / totalDraws) * 100 : 0
    const last_drawn = drawDates.length > 0 ? drawDates[drawDates.length - 1] : null

    // Gap: how many draws since last appearance
    let gap = 0
    if (last_drawn !== null) {
      const lastIdx = draws.findIndex(d => d.date === last_drawn)
      gap = totalDraws - 1 - lastIdx
    } else {
      gap = totalDraws // never drawn
    }

    // Average gap: totalDraws / frequency (expected draws between appearances)
    const avg_gap = frequency > 0 ? totalDraws / frequency : totalDraws

    const hot = hotBalls.has(i) && !coldBalls.has(i)
    const cold = coldBalls.has(i) && !hotBalls.has(i)

    result[String(i)] = {
      number: i,
      frequency,
      frequency_pct: Math.round(frequency_pct * 100) / 100,
      last_drawn,
      gap,
      avg_gap: Math.round(avg_gap * 100) / 100,
      hot,
      cold,
    }
  }

  return result
}

export function analyze(drawsFile?: DrawsFile): StatsFile {
  const file = drawsFile ?? loadDraws()
  const { draws } = file

  if (draws.length === 0) {
    throw new Error('No draws found in draws.json')
  }

  console.log(`Analyzing ${draws.length} draws...`)

  // White ball stats: computed from ALL draws
  const whiteBalls = computeBallStats(
    draws,
    (draw) => draw.whiteBalls,
    WHITE_BALL_COUNT
  )

  // Powerball stats: computed ONLY from draws where powerballEligible === true
  const eligibleDraws = draws.filter(d => d.powerballEligible)
  console.log(`  White ball stats: ${draws.length} draws`)
  console.log(`  Powerball stats: ${eligibleDraws.length} eligible draws (PB 1-26)`)

  const powerballs = computeBallStats(
    eligibleDraws,
    (draw) => [draw.powerball],
    POWERBALL_COUNT
  )

  const stats: StatsFile = {
    computed_at: new Date().toISOString(),
    draw_count: draws.length,
    powerball_eligible_draw_count: eligibleDraws.length,
    white_balls: whiteBalls,
    powerballs,
  }

  writeFileSync(STATS_FILE, JSON.stringify(stats, null, 2), 'utf-8')
  console.log(`Stats saved to ${STATS_FILE}`)

  return stats
}

// Run as standalone script
if (import.meta.main) {
  try {
    const stats = analyze()

    // Validation summary
    console.log('\n=== Analysis Summary ===')
    console.log(`Total draws: ${stats.draw_count}`)
    console.log(`PB-eligible draws: ${stats.powerball_eligible_draw_count}`)

    const wbValues = Object.values(stats.white_balls)
    const pbValues = Object.values(stats.powerballs)

    const wbHot = wbValues.filter(s => s.hot).length
    const wbCold = wbValues.filter(s => s.cold).length
    const pbHot = pbValues.filter(s => s.hot).length
    const pbCold = pbValues.filter(s => s.cold).length

    console.log(`White ball keys: ${Object.keys(stats.white_balls).length} (expected 69)`)
    console.log(`Powerball keys: ${Object.keys(stats.powerballs).length} (expected 26)`)
    console.log(`White ball hot/cold: ${wbHot} hot, ${wbCold} cold`)
    console.log(`Powerball hot/cold: ${pbHot} hot, ${pbCold} cold`)

    // Verify hot and cold are mutually exclusive
    const hotAndColdWB = wbValues.filter(s => s.hot && s.cold).length
    const hotAndColdPB = pbValues.filter(s => s.hot && s.cold).length
    console.log(`Hot+Cold conflicts (should be 0): WB=${hotAndColdWB}, PB=${hotAndColdPB}`)

    // Top 5 white balls
    const topWB = wbValues.sort((a, b) => b.frequency - a.frequency).slice(0, 5)
    console.log('\nTop 5 white balls by frequency:')
    topWB.forEach(s => console.log(`  Ball ${s.number}: ${s.frequency} times`))

    // Top 5 Powerballs
    const topPB = pbValues.sort((a, b) => b.frequency - a.frequency).slice(0, 5)
    console.log('\nTop 5 Powerballs by frequency:')
    topPB.forEach(s => console.log(`  PB ${s.number}: ${s.frequency} times`))
  } catch (error) {
    console.error('Analysis failed:', error)
    process.exit(1)
  }
}
