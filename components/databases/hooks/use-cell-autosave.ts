'use client'

import { useCallback, useEffect, useRef, useState } from 'react'

import { newClientRequestId } from '@/lib/databases/realtime'

export type AutosaveState = 'idle' | 'saving' | 'saved' | 'error'

export type AutosaveOptions = {
  debounceMs?: number
  onSave: (value: unknown, clientRequestId: string) => Promise<{ ok: boolean; error?: string }>
  onPersistedChange?: (value: unknown) => void
  immediate?: boolean
}

// Per-cell autosave with debounce + commit-on-blur + retry.
export function useCellAutosave<T>(initial: T, options: AutosaveOptions) {
  const { debounceMs = 600, onSave, onPersistedChange, immediate } = options
  const [value, setValue] = useState<T>(initial)
  const [state, setState] = useState<AutosaveState>('idle')
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const lastSavedRef = useRef<unknown>(initial)
  const inFlightIdRef = useRef<string | null>(null)
  const valueRef = useRef<T>(initial)

  useEffect(() => {
    valueRef.current = value
  }, [value])

  // External (realtime) updates: caller can call setValueExternal to apply foreign edits.
  const setValueExternal = useCallback((next: T) => {
    setValue(next)
    lastSavedRef.current = next
    setState('idle')
  }, [])

  const flush = useCallback(async () => {
    if (timerRef.current) {
      clearTimeout(timerRef.current)
      timerRef.current = null
    }
    const next = valueRef.current
    if (Object.is(next, lastSavedRef.current)) {
      setState('idle')
      return { ok: true }
    }
    setState('saving')
    setErrorMessage(null)
    const id = newClientRequestId()
    inFlightIdRef.current = id
    const result = await onSave(next, id)
    if (inFlightIdRef.current !== id) {
      // Another save started after this one — ignore the older response.
      return { ok: result.ok }
    }
    if (result.ok) {
      lastSavedRef.current = next
      setState('saved')
      onPersistedChange?.(next)
      window.setTimeout(() => {
        if (inFlightIdRef.current === id) setState('idle')
      }, 1500)
    } else {
      setState('error')
      setErrorMessage(result.error ?? 'Save failed.')
    }
    return result
  }, [onSave, onPersistedChange])

  const change = useCallback(
    (next: T) => {
      setValue(next)
      if (immediate) {
        if (timerRef.current) clearTimeout(timerRef.current)
        timerRef.current = setTimeout(() => void flush(), 0)
      } else {
        if (timerRef.current) clearTimeout(timerRef.current)
        timerRef.current = setTimeout(() => void flush(), debounceMs)
      }
    },
    [debounceMs, flush, immediate],
  )

  const blur = useCallback(() => {
    void flush()
  }, [flush])

  const retry = useCallback(() => {
    void flush()
  }, [flush])

  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current)
    }
  }, [])

  return {
    value,
    state,
    errorMessage,
    change,
    blur,
    retry,
    setValueExternal,
    flush,
  }
}
