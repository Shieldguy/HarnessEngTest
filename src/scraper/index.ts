/**
 * Powerball Scraper
 * Fetches Texas Lottery Powerball winning numbers from 2010 to present
 * Source: https://www.texaslottery.com/export/sites/lottery/Games/Powerball/Winning_Numbers/powerball.csv
 */

import { writeFileSync, readFileSync, existsSync, mkdirSync } from 'fs'
import { join } from 'path'
import type { DrawRecord, DrawsFile } from '../types.js'

const CSV_URL = 'https://www.texaslottery.com/export/sites/lottery/Games/Powerball/Winning_Numbers/powerball.csv'
const DATA_DIR = join(process.cwd(), 'data')
const DRAWS_FILE = join(DATA_DIR, 'draws.json')

function parseCSVLine(line: string): DrawRecord | null {
  const parts = line.trim().split(',')
  // Format: Game,Month,Day,Year,Ball1,Ball2,Ball3,Ball4,Ball5,Powerball,Multiplier
  if (parts.length < 10) return null

  const [, month, day, year, b1, b2, b3, b4, b5, pb, mult] = parts

  const monthNum = parseInt(month, 10)
  const dayNum = parseInt(day, 10)
  const yearNum = parseInt(year, 10)

  if (isNaN(monthNum) || isNaN(dayNum) || isNaN(yearNum)) return null

  // Format date as YYYY-MM-DD
  const date = `${yearNum}-${String(monthNum).padStart(2, '0')}-${String(dayNum).padStart(2, '0')}`

  const balls = [b1, b2, b3, b4, b5].map(n => parseInt(n, 10))
  const powerball = parseInt(pb, 10)

  // Validate ranges
  if (balls.some(n => isNaN(n) || n < 1 || n > 69)) return null
  if (isNaN(powerball) || powerball < 1) return null

  const whiteBalls = [...balls].sort((a, b) => a - b)
  const multiplier = mult ? parseInt(mult, 10) : undefined

  const powerballEligible = powerball <= 26

  return {
    date,
    whiteBalls,
    powerball,
    ...(multiplier && !isNaN(multiplier) ? { multiplier } : {}),
    powerballEligible,
  }
}

async function fetchCSV(): Promise<string> {
  console.log(`Fetching CSV from ${CSV_URL}...`)
  const response = await fetch(CSV_URL, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (compatible; PowerballPredictor/1.0)',
    },
  })

  if (!response.ok) {
    throw new Error(`Failed to fetch CSV: ${response.status} ${response.statusText}`)
  }

  return response.text()
}

function parseAllDraws(csvText: string): DrawRecord[] {
  const lines = csvText.trim().split('\n')
  const draws: DrawRecord[] = []

  for (const line of lines) {
    if (!line.trim() || line.startsWith('#')) continue
    const record = parseCSVLine(line)
    if (record) {
      draws.push(record)
    }
  }

  // Sort ascending by date
  draws.sort((a, b) => a.date.localeCompare(b.date))

  // Remove duplicates (keep first occurrence per date)
  const seen = new Set<string>()
  return draws.filter(draw => {
    if (seen.has(draw.date)) return false
    seen.add(draw.date)
    return true
  })
}

function loadExistingDraws(): DrawsFile | null {
  if (!existsSync(DRAWS_FILE)) return null

  try {
    const content = readFileSync(DRAWS_FILE, 'utf-8')
    return JSON.parse(content) as DrawsFile
  } catch {
    console.warn('Could not read existing draws.json, starting fresh')
    return null
  }
}

function getLatestDate(draws: DrawRecord[]): string | null {
  if (draws.length === 0) return null
  return draws[draws.length - 1].date
}

export async function scrape(options: { incremental?: boolean } = {}): Promise<{
  draws: DrawRecord[]
  newDrawCount: number
  latestDate: string | null
}> {
  // Ensure data directory exists
  if (!existsSync(DATA_DIR)) {
    mkdirSync(DATA_DIR, { recursive: true })
  }

  // Load existing draws if doing incremental refresh
  const existingFile = options.incremental ? loadExistingDraws() : null
  const existingDraws = existingFile?.draws ?? []
  const latestCachedDate = getLatestDate(existingDraws)

  // Fetch and parse CSV
  const csvText = await fetchCSV()
  const allDraws = parseAllDraws(csvText)

  // Filter for incremental: only keep draws newer than latest cached date
  const newDraws = latestCachedDate
    ? allDraws.filter(d => d.date > latestCachedDate)
    : allDraws

  // Merge with existing
  const mergedDraws = [...existingDraws, ...newDraws]

  // Remove duplicates and sort
  const seen = new Set<string>()
  const uniqueDraws = mergedDraws.filter(draw => {
    if (seen.has(draw.date)) return false
    seen.add(draw.date)
    return true
  }).sort((a, b) => a.date.localeCompare(b.date))

  // Save to disk
  const drawsFile: DrawsFile = {
    fetched_at: new Date().toISOString(),
    draw_count: uniqueDraws.length,
    draws: uniqueDraws,
  }

  writeFileSync(DRAWS_FILE, JSON.stringify(drawsFile, null, 2), 'utf-8')

  const latestDate = getLatestDate(uniqueDraws)
  console.log(`Saved ${uniqueDraws.length} draws (${newDraws.length} new) to ${DRAWS_FILE}`)
  console.log(`Latest draw date: ${latestDate}`)

  return {
    draws: uniqueDraws,
    newDrawCount: newDraws.length,
    latestDate,
  }
}

// Run as standalone script
if (import.meta.main) {
  try {
    const result = await scrape({ incremental: false })
    console.log(`\nScrape complete:`)
    console.log(`  Total draws: ${result.draws.length}`)
    console.log(`  New draws: ${result.newDrawCount}`)
    console.log(`  Latest date: ${result.latestDate}`)

    // Quick validation
    const pb27plus = result.draws.filter(d => d.powerball > 26)
    const eligible = result.draws.filter(d => d.powerballEligible)
    console.log(`  Draws with powerball > 26 (pre-2015): ${pb27plus.length}`)
    console.log(`  Powerball-eligible draws: ${eligible.length}`)
  } catch (error) {
    console.error('Scrape failed:', error)
    process.exit(1)
  }
}
