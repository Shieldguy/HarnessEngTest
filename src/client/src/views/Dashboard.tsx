import React, { useState } from 'react'
import type { StatsFile, DrawsFile } from '../types.js'
import { callRefresh } from '../hooks/useApi.js'
import { LoadingSpinner } from '../components/LoadingSpinner.js'

type Props = {
  stats: StatsFile
  draws: DrawsFile
  onUpdate: (newStats: StatsFile) => void
}

type UpdateStatus =
  | { type: 'idle' }
  | { type: 'loading' }
  | { type: 'success'; message: string }
  | { type: 'info'; message: string }
  | { type: 'error'; message: string }

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', {
    year: 'numeric', month: 'short', day: 'numeric',
  })
}

function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString('en-US', {
    year: 'numeric', month: 'short', day: 'numeric',
    hour: 'numeric', minute: '2-digit',
  })
}

export function Dashboard({ stats, draws, onUpdate }: Props): React.ReactElement {
  const [status, setStatus] = useState<UpdateStatus>({ type: 'idle' })

  const isLoading = status.type === 'loading'

  const firstDate = draws.draws[0]?.date ?? '—'
  const lastDate = draws.draws[draws.draws.length - 1]?.date ?? '—'

  async function handleUpdate(): Promise<void> {
    setStatus({ type: 'loading' })
    try {
      const result = await callRefresh()
      if (result.updated) {
        setStatus({ type: 'success', message: result.message })
        onUpdate(result.stats)
      } else {
        setStatus({ type: 'info', message: result.message })
      }
    } catch (err) {
      setStatus({ type: 'error', message: 'Update failed. Try again.' })
      console.error('Refresh error:', err)
    }
  }

  return (
    <div>
      <h1 className="section-title">Dashboard</h1>
      <p className="section-subtitle">
        Texas Powerball winning numbers from 2010 to present
      </p>

      {/* Summary Cards */}
      <div className="stats-grid" style={{ marginBottom: 'var(--space-8)' }}>
        <div className="card">
          <div className="card-label">Total Draws</div>
          <div className="card-value">{stats.draw_count.toLocaleString()}</div>
          <div className="card-sub">All historical draws</div>
        </div>

        <div className="card">
          <div className="card-label">PB-Eligible Draws</div>
          <div className="card-value">{stats.powerball_eligible_draw_count.toLocaleString()}</div>
          <div className="card-sub">Powerball 1–26 range</div>
        </div>

        <div className="card">
          <div className="card-label">Last Draw</div>
          <div className="card-value" style={{ fontSize: 'var(--font-size-2xl)' }}>
            {formatDate(lastDate)}
          </div>
          <div className="card-sub">Most recent draw date</div>
        </div>

        <div className="card">
          <div className="card-label">Date Range</div>
          <div className="card-value" style={{ fontSize: 'var(--font-size-lg)' }}>
            {formatDate(firstDate)}
          </div>
          <div className="card-sub">through {formatDate(lastDate)}</div>
        </div>
      </div>

      {/* Update Section */}
      <div className="update-section">
        <div>
          <h2 style={{ fontSize: 'var(--font-size-lg)', fontWeight: 700, marginBottom: 'var(--space-1)', color: 'var(--text-primary)' }}>
            Data Refresh
          </h2>
          <p style={{ fontSize: 'var(--font-size-sm)', color: 'var(--text-secondary)' }}>
            Last updated: {formatDateTime(stats.computed_at)}
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-4)', flexWrap: 'wrap' }}>
          <button
            className="btn btn-primary"
            onClick={handleUpdate}
            disabled={isLoading}
            aria-busy={isLoading}
          >
            {isLoading ? (
              <>
                <LoadingSpinner size="sm" />
                Fetching latest data…
              </>
            ) : (
              <>
                <span>↻</span>
                Update
              </>
            )}
          </button>

          {status.type !== 'idle' && status.type !== 'loading' && (
            <div className={`status-message status-${status.type}`}>
              {status.message}
            </div>
          )}
        </div>
      </div>

      {/* Quick Stats */}
      <div style={{ marginTop: 'var(--space-8)' }}>
        <h2 style={{
          fontSize: 'var(--font-size-xl)',
          fontWeight: 700,
          marginBottom: 'var(--space-4)',
          color: 'var(--text-primary)',
        }}>
          Quick Facts
        </h2>
        <div className="stats-grid stats-grid-wide">
          <QuickFact
            title="Most Drawn White Ball"
            value={getMostFreqWB(stats)}
            sub="by total appearances"
          />
          <QuickFact
            title="Most Drawn Powerball"
            value={getMostFreqPB(stats)}
            sub="by total appearances"
          />
          <QuickFact
            title="Hottest Ball"
            value={getHottestWB(stats)}
            sub="appeared in last 10 draws"
          />
          <QuickFact
            title="Most Overdue"
            value={getColdestWB(stats)}
            sub="longest gap since appearance"
          />
        </div>
      </div>
    </div>
  )
}

function QuickFact({ title, value, sub }: { title: string; value: string; sub: string }): React.ReactElement {
  return (
    <div className="card">
      <div className="card-label">{title}</div>
      <div style={{
        fontSize: 'var(--font-size-2xl)',
        fontWeight: 800,
        color: 'var(--gold-400)',
        marginBottom: 'var(--space-1)',
      }}>
        {value}
      </div>
      <div className="card-sub">{sub}</div>
    </div>
  )
}

function getMostFreqWB(stats: StatsFile): string {
  const top = Object.values(stats.white_balls)
    .sort((a, b) => b.frequency - a.frequency)[0]
  return top ? `#${top.number} (${top.frequency}×)` : '—'
}

function getMostFreqPB(stats: StatsFile): string {
  const top = Object.values(stats.powerballs)
    .sort((a, b) => b.frequency - a.frequency)[0]
  return top ? `PB #${top.number} (${top.frequency}×)` : '—'
}

function getHottestWB(stats: StatsFile): string {
  const hot = Object.values(stats.white_balls).filter(s => s.hot)
  if (hot.length === 0) return '—'
  const top = hot.sort((a, b) => b.frequency - a.frequency)[0]
  return `#${top.number} (${top.frequency}×)`
}

function getColdestWB(stats: StatsFile): string {
  const top = Object.values(stats.white_balls)
    .sort((a, b) => b.gap - a.gap)[0]
  return top ? `#${top.number} (${top.gap} draws ago)` : '—'
}
