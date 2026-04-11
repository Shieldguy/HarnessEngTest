import React, { useState, useEffect, useRef } from 'react'
import type { StatsFile, Recommendation, Strategy } from '../types.js'
import { predict } from '../hooks/usePredictor.js'
import { Ball } from '../components/Ball.js'

type Props = {
  stats: StatsFile
}

const STRATEGY_LABELS: Record<Strategy, string> = {
  hot: '🔥 Hot',
  cold: '🧊 Cold',
  balanced: '⚖️ Balanced',
  gap: '📊 Gap',
}

const STRATEGY_DESCRIPTIONS: Record<Strategy, string> = {
  hot: 'Most frequently drawn numbers',
  cold: 'Least recently drawn numbers',
  balanced: '3 hot + 2 cold white balls',
  gap: 'Numbers overdue based on average gap',
}

const TOTAL_BALLS = 6 // 5 white + 1 powerball
const BALL_INTERVAL_MS = 400
const TOTAL_ANIMATION_MS = TOTAL_BALLS * BALL_INTERVAL_MS + 700 // +700 for last ball to finish

export function Recommendations({ stats }: Props): React.ReactElement {
  const [strategy, setStrategy] = useState<Strategy>('hot')
  const [recommendation, setRecommendation] = useState<Recommendation | null>(null)
  const [animating, setAnimating] = useState(false)
  const [droppedCount, setDroppedCount] = useState(0)
  const [showRationale, setShowRationale] = useState(false)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const intervalsRef = useRef<ReturnType<typeof setInterval>[]>([])

  // Cleanup timers on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current)
      intervalsRef.current.forEach(id => clearInterval(id))
    }
  }, [])

  function handleGenerate(): void {
    if (animating) return

    // Clear previous timers
    if (timerRef.current) clearTimeout(timerRef.current)
    intervalsRef.current.forEach(id => clearInterval(id))
    intervalsRef.current = []

    // Compute recommendation
    const rec = predict(stats, strategy)

    // Reset animation state
    setShowRationale(false)
    setDroppedCount(0)
    setRecommendation(null)
    setAnimating(true)

    // Small delay to ensure DOM clears
    timerRef.current = setTimeout(() => {
      setRecommendation(rec)

      // Count dropped balls one at a time
      let count = 0
      const interval = setInterval(() => {
        count += 1
        setDroppedCount(count)
        if (count >= TOTAL_BALLS) {
          clearInterval(interval)
        }
      }, BALL_INTERVAL_MS)
      intervalsRef.current.push(interval)

      // Show rationale after all balls land
      timerRef.current = setTimeout(() => {
        setShowRationale(true)
        setAnimating(false)
      }, TOTAL_ANIMATION_MS)
    }, 50)
  }

  const balls = recommendation
    ? [...recommendation.whiteBalls.map((n, i) => ({ number: n, type: 'white' as const, index: i })),
       { number: recommendation.powerball, type: 'powerball' as const, index: 5 }]
    : []

  return (
    <div>
      <h1 className="section-title">Recommendations</h1>
      <p className="section-subtitle">
        Pick a strategy and generate your lucky numbers
      </p>

      {/* Strategy selector */}
      <div style={{ marginBottom: 'var(--space-6)' }}>
        <p style={{ fontSize: 'var(--font-size-sm)', color: 'var(--text-muted)', marginBottom: 'var(--space-3)' }}>
          Strategy
        </p>
        <div className="strategy-tabs">
          {(Object.keys(STRATEGY_LABELS) as Strategy[]).map(s => (
            <button
              key={s}
              className={`strategy-tab ${strategy === s ? 'active' : ''}`}
              onClick={() => setStrategy(s)}
              disabled={animating}
              title={STRATEGY_DESCRIPTIONS[s]}
            >
              {STRATEGY_LABELS[s]}
            </button>
          ))}
        </div>
        <p style={{ fontSize: 'var(--font-size-sm)', color: 'var(--text-secondary)', marginTop: 'var(--space-2)' }}>
          {STRATEGY_DESCRIPTIONS[strategy]}
        </p>
      </div>

      {/* Generate button */}
      <div style={{ marginBottom: 'var(--space-8)' }}>
        <button
          className="btn btn-generate"
          onClick={handleGenerate}
          disabled={animating}
          aria-busy={animating}
        >
          {animating ? (
            <>
              <span style={{
                display: 'inline-block',
                animation: 'spin 0.6s linear infinite',
                fontSize: 'var(--font-size-xl)',
              }}>●</span>
              Drawing…
            </>
          ) : (
            <>✦ Generate</>
          )}
        </button>
      </div>

      {/* Ball tray */}
      <div
        className="card"
        style={{ padding: 'var(--space-8)', marginBottom: 'var(--space-6)' }}
      >
        <p style={{
          fontSize: 'var(--font-size-xs)',
          fontWeight: 700,
          textTransform: 'uppercase',
          letterSpacing: '1px',
          color: 'var(--text-muted)',
          marginBottom: 'var(--space-6)',
        }}>
          Your Numbers
        </p>

        {!recommendation ? (
          <div style={{ display: 'flex', gap: 'var(--space-4)', alignItems: 'center' }}>
            {/* Empty placeholder slots */}
            {Array.from({ length: 5 }).map((_, i) => (
              <div
                key={i}
                style={{
                  width: 68,
                  height: 68,
                  borderRadius: '50%',
                  background: 'var(--bg-elevated)',
                  border: '2px dashed var(--border-subtle)',
                }}
              />
            ))}
            <div
              style={{
                width: 8,
                height: 2,
                background: 'var(--border-subtle)',
                margin: '0 8px',
              }}
            />
            <div
              style={{
                width: 68,
                height: 68,
                borderRadius: '50%',
                background: 'rgba(230, 53, 53, 0.08)',
                border: '2px dashed rgba(230, 53, 53, 0.25)',
              }}
            />
          </div>
        ) : (
          <div className="ball-tray">
            {balls.slice(0, 5).map((ball, idx) => (
              <div key={ball.number} className="ball-slot">
                {droppedCount > idx ? (
                  <Ball
                    number={ball.number}
                    type="white"
                    dropping={true}
                    dropIndex={0}
                  />
                ) : (
                  <div style={{
                    width: 68, height: 68, borderRadius: '50%',
                    background: 'var(--bg-elevated)',
                    border: '2px dashed var(--border-subtle)',
                    opacity: 0,
                  }} />
                )}
              </div>
            ))}

            {/* Separator between white balls and powerball */}
            <div className="ball-separator">+</div>

            {balls[5] && (
              <div className="ball-slot">
                {droppedCount > 5 ? (
                  <Ball
                    number={balls[5].number}
                    type="powerball"
                    dropping={true}
                    dropIndex={0}
                  />
                ) : (
                  <div style={{
                    width: 68, height: 68, borderRadius: '50%',
                    background: 'rgba(230, 53, 53, 0.08)',
                    border: '2px dashed rgba(230, 53, 53, 0.25)',
                    opacity: droppedCount >= 5 ? 0.5 : 0.2,
                  }} />
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Rationale */}
      {showRationale && recommendation && (
        <div className="card" style={{ animation: 'fade-in 0.5s ease' }}>
          <p style={{
            fontSize: 'var(--font-size-xs)',
            fontWeight: 700,
            textTransform: 'uppercase',
            letterSpacing: '1px',
            color: 'var(--text-muted)',
            marginBottom: 'var(--space-4)',
          }}>
            Why these numbers?
          </p>
          <ul className="rationale-list">
            {recommendation.rationale.map((reason, i) => (
              <li key={i} className="rationale-item">{reason}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}
