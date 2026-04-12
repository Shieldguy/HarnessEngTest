import React, { useState } from 'react'
import type { StatsFile, DrawsFile, View } from './types.js'
import { useStats, useDraws } from './hooks/useApi.js'
import { Dashboard } from './views/Dashboard.js'
import { Statistics } from './views/Statistics.js'
import { Recommendations } from './views/Recommendations.js'
import { History } from './views/History.js'
import { LoadingSpinner } from './components/LoadingSpinner.js'

const NAV_ITEMS: { id: View; label: string }[] = [
  { id: 'dashboard', label: 'Dashboard' },
  { id: 'statistics', label: 'Statistics' },
  { id: 'recommendations', label: 'Recommendations' },
  { id: 'history', label: 'History' },
]

export default function App(): React.ReactElement {
  const [activeView, setActiveView] = useState<View>('dashboard')
  const statsApi = useStats()
  const drawsApi = useDraws()

  // Allow Dashboard to update stats after refresh
  const [liveStats, setLiveStats] = useState<StatsFile | null>(null)
  const stats = liveStats ?? statsApi.data
  const draws = drawsApi.data

  function handleUpdate(newStats: StatsFile): void {
    setLiveStats(newStats)
    // Re-fetch draws so History view shows newly added draw records
    void drawsApi.refetch()
  }

  const isLoading = statsApi.loading || drawsApi.loading
  const hasError = statsApi.error || drawsApi.error

  return (
    <div className="app-layout">
      <header className="app-header">
        <div className="app-logo">
          <span className="app-logo-icon">🎱</span>
          <span className="app-logo-text">Powerball Predictor</span>
        </div>
        <nav className="app-nav">
          {NAV_ITEMS.map(item => (
            <button
              key={item.id}
              className={`nav-btn ${activeView === item.id ? 'active' : ''}`}
              onClick={() => setActiveView(item.id)}
            >
              {item.label}
            </button>
          ))}
        </nav>
      </header>

      <main className="app-main">
        {isLoading && (
          <div style={{ display: 'flex', justifyContent: 'center', padding: 'var(--space-16)' }}>
            <LoadingSpinner message="Loading Powerball data…" />
          </div>
        )}

        {hasError && !isLoading && (
          <div className="status-message status-error" style={{ maxWidth: 480, margin: '64px auto' }}>
            Failed to load data: {statsApi.error ?? drawsApi.error}
          </div>
        )}

        {!isLoading && !hasError && stats && draws && (
          <>
            {activeView === 'dashboard' && (
              <Dashboard stats={stats} draws={draws} onUpdate={handleUpdate} />
            )}
            {activeView === 'statistics' && (
              <Statistics stats={stats} />
            )}
            {activeView === 'recommendations' && (
              <Recommendations stats={stats} />
            )}
            {activeView === 'history' && (
              <History draws={draws} />
            )}
          </>
        )}
      </main>
    </div>
  )
}
