import React, { useState } from 'react'
import type { StatsFile, BallStat } from '../types.js'

type Props = {
  stats: StatsFile
}

type Tab = 'white' | 'powerball'

export function Statistics({ stats }: Props): React.ReactElement {
  const [activeTab, setActiveTab] = useState<Tab>('white')
  const [sortBy, setSortBy] = useState<'number' | 'frequency' | 'gap'>('frequency')

  const whiteBalls = Object.values(stats.white_balls)
  const powerballs = Object.values(stats.powerballs)

  const data = activeTab === 'white' ? whiteBalls : powerballs
  const maxFreq = Math.max(...data.map(s => s.frequency))

  const sorted = [...data].sort((a, b) => {
    if (sortBy === 'number') return a.number - b.number
    if (sortBy === 'frequency') return b.frequency - a.frequency
    return b.gap - a.gap
  })

  const hotCount = data.filter(s => s.hot).length
  const coldCount = data.filter(s => s.cold).length
  const totalDraws = activeTab === 'white' ? stats.draw_count : stats.powerball_eligible_draw_count

  return (
    <div>
      <h1 className="section-title">Statistics</h1>
      <p className="section-subtitle">
        Frequency and gap analysis for all ball numbers
      </p>

      {/* Tab switcher */}
      <div style={{ display: 'flex', gap: 'var(--space-2)', marginBottom: 'var(--space-6)' }}>
        <TabButton active={activeTab === 'white'} onClick={() => setActiveTab('white')}>
          White Balls (1–69)
        </TabButton>
        <TabButton active={activeTab === 'powerball'} onClick={() => setActiveTab('powerball')}>
          Powerballs (1–26)
        </TabButton>
      </div>

      {/* Summary row */}
      <div style={{ display: 'flex', gap: 'var(--space-4)', marginBottom: 'var(--space-6)', flexWrap: 'wrap' }}>
        <StatPill label="Total Draws" value={totalDraws.toLocaleString()} />
        <StatPill label="🔥 Hot" value={hotCount.toString()} color="var(--hot-color)" />
        <StatPill label="🧊 Cold" value={coldCount.toString()} color="var(--cold-color)" />
      </div>

      {/* Sort controls */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)', marginBottom: 'var(--space-4)' }}>
        <span style={{ fontSize: 'var(--font-size-sm)', color: 'var(--text-muted)' }}>Sort by:</span>
        {(['frequency', 'number', 'gap'] as const).map(opt => (
          <button
            key={opt}
            onClick={() => setSortBy(opt)}
            style={{
              background: sortBy === opt ? 'rgba(245,200,66,0.12)' : 'transparent',
              border: `1px solid ${sortBy === opt ? 'var(--gold-400)' : 'var(--border-subtle)'}`,
              color: sortBy === opt ? 'var(--gold-400)' : 'var(--text-secondary)',
              borderRadius: 'var(--radius-full)',
              padding: '4px 12px',
              fontSize: 'var(--font-size-xs)',
              fontWeight: 600,
              cursor: 'pointer',
              textTransform: 'capitalize',
              fontFamily: 'var(--font-family)',
              transition: 'all var(--transition-fast)',
            }}
          >
            {opt}
          </button>
        ))}
      </div>

      {/* Frequency chart */}
      <div
        className="card"
        style={{ padding: 'var(--space-4) var(--space-6)' }}
      >
        <div className="frequency-chart">
          {sorted.map(stat => (
            <FrequencyRow key={stat.number} stat={stat} maxFreq={maxFreq} />
          ))}
        </div>
      </div>
    </div>
  )
}

function FrequencyRow({ stat, maxFreq }: { stat: BallStat; maxFreq: number }): React.ReactElement {
  const pct = maxFreq > 0 ? (stat.frequency / maxFreq) * 100 : 0
  const barClass = stat.hot ? 'hot' : stat.cold ? 'cold' : 'neutral'

  return (
    <div className="freq-row" title={`Last drawn: ${stat.last_drawn ?? 'never'} | Gap: ${stat.gap} draws`}>
      <div className="freq-label">{stat.number}</div>
      <div className="freq-bar-track">
        <div
          className={`freq-bar-fill ${barClass}`}
          style={{ width: `${pct}%` }}
        />
      </div>
      <div className="freq-count">{stat.frequency}</div>
      {(stat.hot || stat.cold) && (
        <span className={`badge badge-${stat.hot ? 'hot' : 'cold'}`}>
          {stat.hot ? '🔥' : '🧊'}
        </span>
      )}
    </div>
  )
}

function TabButton({ active, onClick, children }: {
  active: boolean
  onClick: () => void
  children: React.ReactNode
}): React.ReactElement {
  return (
    <button
      onClick={onClick}
      style={{
        padding: 'var(--space-2) var(--space-5)',
        borderRadius: 'var(--radius-full)',
        border: `1px solid ${active ? 'var(--gold-400)' : 'var(--border-subtle)'}`,
        background: active ? 'rgba(245,200,66,0.12)' : 'transparent',
        color: active ? 'var(--gold-400)' : 'var(--text-secondary)',
        fontFamily: 'var(--font-family)',
        fontSize: 'var(--font-size-sm)',
        fontWeight: active ? 700 : 500,
        cursor: 'pointer',
        transition: 'all var(--transition-fast)',
      }}
    >
      {children}
    </button>
  )
}

function StatPill({ label, value, color }: { label: string; value: string; color?: string }): React.ReactElement {
  return (
    <div style={{
      display: 'flex',
      gap: 'var(--space-2)',
      alignItems: 'center',
      padding: 'var(--space-2) var(--space-4)',
      background: 'var(--bg-elevated)',
      borderRadius: 'var(--radius-md)',
      border: '1px solid var(--border-subtle)',
    }}>
      <span style={{ fontSize: 'var(--font-size-sm)', color: 'var(--text-muted)' }}>{label}:</span>
      <span style={{ fontSize: 'var(--font-size-base)', fontWeight: 700, color: color ?? 'var(--text-primary)' }}>
        {value}
      </span>
    </div>
  )
}
