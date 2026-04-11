/**
 * Powerball Predictor - Bun HTTP Server
 * Serves React app and provides API endpoints
 */

import { readFileSync, existsSync } from 'fs'
import { join } from 'path'
import type { StatsFile, DrawsFile, RefreshResponse } from '../types.js'
import { scrape } from '../scraper/index.js'
import { analyze } from '../analyzer/index.js'

const PORT = parseInt(process.env.PORT ?? '3000', 10)
const DATA_DIR = join(process.cwd(), 'data')
const DIST_DIR = join(process.cwd(), 'dist/client')
const DRAWS_FILE = join(DATA_DIR, 'draws.json')
const STATS_FILE = join(DATA_DIR, 'stats.json')

// Write lock for refresh operations — prevents concurrent corruption
let refreshInProgress = false

function readJSON<T>(filePath: string): T {
  if (!existsSync(filePath)) {
    throw new Error(`File not found: ${filePath}`)
  }
  return JSON.parse(readFileSync(filePath, 'utf-8')) as T
}

function jsonResponse(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  })
}

function errorResponse(message: string, status = 500): Response {
  return jsonResponse({ error: message }, status)
}

function serveStaticFile(filePath: string): Response | null {
  if (!existsSync(filePath)) return null

  const ext = filePath.split('.').pop() ?? ''
  const contentTypes: Record<string, string> = {
    html: 'text/html; charset=utf-8',
    js: 'application/javascript',
    css: 'text/css',
    json: 'application/json',
    ico: 'image/x-icon',
    png: 'image/png',
    svg: 'image/svg+xml',
  }

  const contentType = contentTypes[ext] ?? 'application/octet-stream'
  const content = readFileSync(filePath)

  return new Response(content, {
    headers: { 'Content-Type': contentType },
  })
}

async function handleRefresh(): Promise<Response> {
  if (refreshInProgress) {
    return jsonResponse(
      { updated: false, new_draw_count: 0, message: 'Refresh already in progress', stats: null },
      409
    )
  }

  refreshInProgress = true

  try {
    // Read current latest date
    let latestCachedDate: string | null = null
    if (existsSync(DRAWS_FILE)) {
      const existing = readJSON<DrawsFile>(DRAWS_FILE)
      if (existing.draws.length > 0) {
        latestCachedDate = existing.draws[existing.draws.length - 1].date
      }
    }

    // Incremental scrape
    const scrapeResult = await scrape({ incremental: true })
    const newDrawCount = scrapeResult.newDrawCount

    if (newDrawCount === 0 && latestCachedDate !== null) {
      // No new draws — still return current stats
      const stats = readJSON<StatsFile>(STATS_FILE)
      const response: RefreshResponse = {
        updated: false,
        new_draw_count: 0,
        message: 'Already up to date',
        stats,
      }
      return jsonResponse(response)
    }

    // Re-analyze with updated draws
    const drawsFile = readJSON<DrawsFile>(DRAWS_FILE)
    const stats = analyze(drawsFile)

    const response: RefreshResponse = {
      updated: true,
      new_draw_count: newDrawCount,
      message: `${newDrawCount} new draw${newDrawCount === 1 ? '' : 's'} added. Stats updated.`,
      stats,
    }

    return jsonResponse(response)
  } catch (error) {
    console.error('Refresh failed:', error)
    return errorResponse(`Refresh failed: ${error instanceof Error ? error.message : String(error)}`)
  } finally {
    refreshInProgress = false
  }
}

async function handleRequest(req: Request): Promise<Response> {
  const url = new URL(req.url)
  const { pathname } = url

  // CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
      },
    })
  }

  // API routes
  if (pathname === '/api/stats' && req.method === 'GET') {
    try {
      const stats = readJSON<StatsFile>(STATS_FILE)
      return jsonResponse(stats)
    } catch (error) {
      return errorResponse('Stats not available. Run analyzer first.', 503)
    }
  }

  if (pathname === '/api/draws' && req.method === 'GET') {
    try {
      const draws = readJSON<DrawsFile>(DRAWS_FILE)
      return jsonResponse(draws)
    } catch (error) {
      return errorResponse('Draws not available. Run scraper first.', 503)
    }
  }

  if (pathname === '/api/refresh' && req.method === 'POST') {
    return handleRefresh()
  }

  // Serve static React app files
  if (req.method === 'GET') {
    // Try exact file path
    const cleanPath = pathname === '/' ? '/index.html' : pathname
    const filePath = join(DIST_DIR, cleanPath)

    const staticResponse = serveStaticFile(filePath)
    if (staticResponse) return staticResponse

    // SPA fallback — serve index.html for all unmatched routes
    const indexPath = join(DIST_DIR, 'index.html')
    const indexResponse = serveStaticFile(indexPath)
    if (indexResponse) return indexResponse

    // Dev mode: serve a minimal page if dist doesn't exist yet
    return new Response(
      `<!DOCTYPE html>
<html>
<head><title>Powerball Predictor - Dev Mode</title></head>
<body>
  <h1>Powerball Predictor API Server</h1>
  <p>API is running. Build the React client with: <code>cd src/client && bun run build</code></p>
  <ul>
    <li><a href="/api/stats">/api/stats</a></li>
    <li><a href="/api/draws">/api/draws</a></li>
  </ul>
</body>
</html>`,
      { headers: { 'Content-Type': 'text/html' } }
    )
  }

  return errorResponse('Not found', 404)
}

const server = Bun.serve({
  port: PORT,
  fetch: handleRequest,
})

console.log(`Powerball Predictor server running at http://localhost:${PORT}`)
console.log(`API endpoints:`)
console.log(`  GET  http://localhost:${PORT}/api/stats`)
console.log(`  GET  http://localhost:${PORT}/api/draws`)
console.log(`  POST http://localhost:${PORT}/api/refresh`)

export { server }
