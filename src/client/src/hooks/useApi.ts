/**
 * API hooks for fetching Powerball data from the Bun server
 */

import { useState, useEffect, useCallback } from 'react'
import type { StatsFile, DrawsFile, RefreshResponse } from '../types.js'

type LoadState<T> = {
  data: T | null
  loading: boolean
  error: string | null
}

export function useStats(): LoadState<StatsFile> & { refetch: () => Promise<void> } {
  const [state, setState] = useState<LoadState<StatsFile>>({
    data: null,
    loading: true,
    error: null,
  })

  const fetch_ = useCallback(async () => {
    setState(prev => ({ ...prev, loading: true, error: null }))
    try {
      const res = await fetch('/api/stats')
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const data: StatsFile = await res.json()
      setState({ data, loading: false, error: null })
    } catch (err) {
      setState({ data: null, loading: false, error: String(err) })
    }
  }, [])

  useEffect(() => { fetch_() }, [fetch_])

  return { ...state, refetch: fetch_ }
}

export function useDraws(): LoadState<DrawsFile> & { refetch: () => Promise<void> } {
  const [state, setState] = useState<LoadState<DrawsFile>>({
    data: null,
    loading: true,
    error: null,
  })

  const fetch_ = useCallback(async () => {
    setState(prev => ({ ...prev, loading: true, error: null }))
    try {
      const res = await fetch('/api/draws')
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const data: DrawsFile = await res.json()
      setState({ data, loading: false, error: null })
    } catch (err) {
      setState({ data: null, loading: false, error: String(err) })
    }
  }, [])

  useEffect(() => { fetch_() }, [fetch_])

  return { ...state, refetch: fetch_ }
}

export async function callRefresh(): Promise<RefreshResponse> {
  const res = await fetch('/api/refresh', { method: 'POST' })
  if (!res.ok) throw new Error(`HTTP ${res.status}: ${await res.text()}`)
  return res.json() as Promise<RefreshResponse>
}
