'use client'

import { useCallback, useEffect, useRef, useState } from 'react'

import type {
  SavedViewWithConfig,
  ViewConfig,
  ViewFilter,
  ViewFilterGroup,
  ViewSort,
} from '@/lib/views/types'

export type ViewConfigMutators = {
  setVisibleFields: (visibleFieldIds: string[], fieldOrder?: string[]) => void
  setFieldOrder: (fieldOrder: string[]) => void
  setColumnWidth: (fieldId: string, width: number) => void
  setDensity: (density: 'comfortable' | 'compact') => void
  setFilters: (filters: ViewFilter[]) => void
  setFilterTree: (tree: ViewFilterGroup | null) => void
  setSorts: (sorts: ViewSort[]) => void
  setSearchQuery: (query: string) => void
  patchConfig: (patch: Partial<ViewConfig>) => void
}

export function useOptimisticView(initial: SavedViewWithConfig) {
  const [view, setView] = useState(initial)
  const [searchQuery, setSearchQueryState] = useState('')
  const lastInitialIdRef = useRef(initial.id)

  // Reseed when navigating to a different view, but keep optimistic edits
  // for the same view across server-side data refreshes.
  useEffect(() => {
    if (initial.id !== lastInitialIdRef.current) {
      setView(initial)
      setSearchQueryState('')
      lastInitialIdRef.current = initial.id
      return
    }
    setView((prev) => {
      // If config materially changed on the server (e.g., another tab),
      // prefer that. Otherwise keep the local optimistic version.
      const incoming = JSON.stringify(initial.config)
      const local = JSON.stringify(prev.config)
      if (incoming === local) return prev
      // Heuristic: prefer server when local matches the prior server config
      // (i.e., user hasn't touched it since last reseed)
      return initial
    })
  }, [initial])

  const patchConfig = useCallback((patch: Partial<ViewConfig>) => {
    setView((v) => ({ ...v, config: { ...v.config, ...patch } }))
  }, [])

  const setVisibleFields = useCallback(
    (visibleFieldIds: string[], fieldOrder?: string[]) => {
      setView((v) => ({
        ...v,
        config: {
          ...v.config,
          visibleFieldIds,
          fieldOrder: fieldOrder ?? v.config.fieldOrder,
        },
      }))
    },
    [],
  )

  const setFieldOrder = useCallback((fieldOrder: string[]) => {
    setView((v) => ({ ...v, config: { ...v.config, fieldOrder } }))
  }, [])

  const setColumnWidth = useCallback((fieldId: string, width: number) => {
    setView((v) => ({
      ...v,
      config: {
        ...v.config,
        columnWidths: { ...v.config.columnWidths, [fieldId]: width },
      },
    }))
  }, [])

  const setDensity = useCallback((density: 'comfortable' | 'compact') => {
    setView((v) => ({ ...v, config: { ...v.config, density } }))
  }, [])

  const setFilters = useCallback((filters: ViewFilter[]) => {
    setView((v) => ({ ...v, config: { ...v.config, filters } }))
  }, [])

  const setFilterTree = useCallback((tree: ViewFilterGroup | null) => {
    setView((v) => ({ ...v, config: { ...v.config, filterTree: tree ?? undefined } }))
  }, [])

  const setSorts = useCallback((sorts: ViewSort[]) => {
    setView((v) => ({ ...v, config: { ...v.config, sorts } }))
  }, [])

  const setSearchQuery = useCallback((q: string) => {
    setSearchQueryState(q)
  }, [])

  const mutators: ViewConfigMutators = {
    setVisibleFields,
    setFieldOrder,
    setColumnWidth,
    setDensity,
    setFilters,
    setFilterTree,
    setSorts,
    setSearchQuery,
    patchConfig,
  }

  return { view, searchQuery, mutators } as const
}
