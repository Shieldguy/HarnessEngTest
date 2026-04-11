import React, { useState } from 'react'
import type { DrawsFile, DrawRecord } from '../types.js'
import { MiniBall } from '../components/Ball.js'

type Props = {
  draws: DrawsFile
}

const PAGE_SIZE = 20

function formatDate(iso: string): string {
  return new Date(iso + 'T00:00:00').toLocaleDateString('en-US', {
    year: 'numeric', month: 'short', day: 'numeric',
  })
}

export function History({ draws }: Props): React.ReactElement {
  const [page, setPage] = useState(1)

  // Show most recent draws first
  const sortedDraws = [...draws.draws].reverse()
  const totalPages = Math.ceil(sortedDraws.length / PAGE_SIZE)
  const startIdx = (page - 1) * PAGE_SIZE
  const pageDraws = sortedDraws.slice(startIdx, startIdx + PAGE_SIZE)

  function handlePage(newPage: number): void {
    if (newPage < 1 || newPage > totalPages) return
    setPage(newPage)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  // Generate visible page range
  const pageRange = getPageRange(page, totalPages)

  return (
    <div>
      <h1 className="section-title">Draw History</h1>
      <p className="section-subtitle">
        {draws.draw_count.toLocaleString()} draws — showing {startIdx + 1}–{Math.min(startIdx + PAGE_SIZE, sortedDraws.length)} of {sortedDraws.length.toLocaleString()}
      </p>

      <div className="table-wrapper">
        <table>
          <thead>
            <tr>
              <th>Draw Date</th>
              <th>Winning Numbers</th>
              <th>Powerball</th>
              <th>Multiplier</th>
            </tr>
          </thead>
          <tbody>
            {pageDraws.map(draw => (
              <DrawRow key={draw.date} draw={draw} />
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      <div className="pagination">
        <button
          className="page-btn"
          onClick={() => handlePage(1)}
          disabled={page === 1}
          title="First page"
        >
          «
        </button>
        <button
          className="page-btn"
          onClick={() => handlePage(page - 1)}
          disabled={page === 1}
          title="Previous page"
        >
          ‹
        </button>

        {pageRange.map((p, i) =>
          p === '...' ? (
            <span key={`ellipsis-${i}`} style={{ color: 'var(--text-muted)', padding: '0 4px' }}>…</span>
          ) : (
            <button
              key={p}
              className={`page-btn ${page === p ? 'current' : ''}`}
              onClick={() => handlePage(p as number)}
            >
              {p}
            </button>
          )
        )}

        <button
          className="page-btn"
          onClick={() => handlePage(page + 1)}
          disabled={page === totalPages}
          title="Next page"
        >
          ›
        </button>
        <button
          className="page-btn"
          onClick={() => handlePage(totalPages)}
          disabled={page === totalPages}
          title="Last page"
        >
          »
        </button>
      </div>
    </div>
  )
}

function DrawRow({ draw }: { draw: DrawRecord }): React.ReactElement {
  return (
    <tr>
      <td className="td-date">{formatDate(draw.date)}</td>
      <td>
        <div className="td-balls">
          {draw.whiteBalls.map(n => (
            <MiniBall key={n} number={n} type="white" />
          ))}
        </div>
      </td>
      <td>
        <MiniBall number={draw.powerball} type="powerball" />
      </td>
      <td style={{ color: 'var(--text-muted)', fontSize: 'var(--font-size-sm)' }}>
        {draw.multiplier ? `${draw.multiplier}×` : '—'}
      </td>
    </tr>
  )
}

function getPageRange(current: number, total: number): (number | '...')[] {
  if (total <= 7) {
    return Array.from({ length: total }, (_, i) => i + 1)
  }

  const range: (number | '...')[] = []

  if (current <= 4) {
    range.push(1, 2, 3, 4, 5, '...', total)
  } else if (current >= total - 3) {
    range.push(1, '...', total - 4, total - 3, total - 2, total - 1, total)
  } else {
    range.push(1, '...', current - 1, current, current + 1, '...', total)
  }

  return range
}
