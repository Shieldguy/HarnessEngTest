import React from 'react'

type Props = {
  message?: string
  size?: 'sm' | 'md'
}

export function LoadingSpinner({ message, size = 'md' }: Props): React.ReactElement {
  const spinnerSize = size === 'sm' ? 14 : 18
  return (
    <div className="loading-state">
      <div
        className="spinner"
        style={{ width: spinnerSize, height: spinnerSize }}
        role="status"
        aria-label="Loading"
      />
      {message && <span>{message}</span>}
    </div>
  )
}
