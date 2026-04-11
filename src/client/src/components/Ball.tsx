import React from 'react'

type BallProps = {
  number: number
  type: 'white' | 'powerball'
  dropping?: boolean
  dropIndex?: number
  hidden?: boolean
}

export function Ball({ number, type, dropping = false, dropIndex = 0, hidden = false }: BallProps): React.ReactElement {
  if (hidden) {
    return (
      <div
        className="ball ball-hidden"
        style={{ opacity: 0 }}
        aria-hidden="true"
      />
    )
  }

  const animClass = dropping
    ? type === 'powerball'
      ? 'ball-dropping-powerball'
      : 'ball-dropping'
    : ''

  const delay = dropping ? dropIndex * 400 : 0

  return (
    <div
      className={`ball ball-${type === 'powerball' ? 'powerball' : 'white'} ${animClass}`}
      style={dropping ? { animationDelay: `${delay}ms` } : undefined}
      aria-label={`${type === 'powerball' ? 'Powerball' : 'Ball'} ${number}`}
    >
      {number}
    </div>
  )
}

type MiniBallProps = {
  number: number
  type: 'white' | 'powerball'
}

export function MiniBall({ number, type }: MiniBallProps): React.ReactElement {
  return (
    <div
      className={`mini-ball mini-ball-${type === 'powerball' ? 'powerball' : 'white'}`}
      title={`${type === 'powerball' ? 'Powerball' : 'Ball'} ${number}`}
    >
      {number}
    </div>
  )
}
