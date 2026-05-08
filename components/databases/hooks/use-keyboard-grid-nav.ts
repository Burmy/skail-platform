'use client'

import { useEffect } from 'react'

export type DatabaseShortcutHandlers = {
  onNewRecord?: () => void
  onOpenSearch?: () => void
  onOpenArchive?: () => void
  onOpenFocusedRow?: () => void
  isInputActive?: () => boolean
}

function isInputElement(target: EventTarget | null) {
  if (!(target instanceof HTMLElement)) return false
  if (target.isContentEditable) return true
  const tag = target.tagName
  return tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT'
}

// Global keyboard shortcuts for the databases workspace.
// cmd/ctrl + k → focus search
// n → new record (if not typing)
// e → open focused row in side-sheet
// cmd/ctrl + shift + a → open archive drawer
export function useDatabaseShortcuts(handlers: DatabaseShortcutHandlers) {
  useEffect(() => {
    function handle(e: KeyboardEvent) {
      const meta = e.metaKey || e.ctrlKey
      const key = e.key.toLowerCase()

      if (meta && key === 'k') {
        e.preventDefault()
        handlers.onOpenSearch?.()
        return
      }
      if (meta && e.shiftKey && key === 'a') {
        e.preventDefault()
        handlers.onOpenArchive?.()
        return
      }

      // Single-key shortcuts only fire when not typing in an input.
      if (isInputElement(e.target)) return
      if (handlers.isInputActive?.()) return

      if (key === 'n') {
        e.preventDefault()
        handlers.onNewRecord?.()
      } else if (key === 'e') {
        e.preventDefault()
        handlers.onOpenFocusedRow?.()
      }
    }

    window.addEventListener('keydown', handle)
    return () => window.removeEventListener('keydown', handle)
  }, [handlers])
}

export type GridNavOptions = {
  rowCount: number
  colCount: number
  onMove: (row: number, col: number) => void
  active: { row: number; col: number } | null
}

// Lightweight cell navigation: arrow keys move the active cell coordinate.
// Consumers track focus separately; this hook only routes intent.
export function useGridArrowKeys(options: GridNavOptions) {
  useEffect(() => {
    function handle(e: KeyboardEvent) {
      if (!options.active) return
      if (isInputElement(e.target)) return
      const { row, col } = options.active
      if (e.key === 'ArrowDown') {
        e.preventDefault()
        options.onMove(Math.min(row + 1, options.rowCount - 1), col)
      } else if (e.key === 'ArrowUp') {
        e.preventDefault()
        options.onMove(Math.max(row - 1, 0), col)
      } else if (e.key === 'ArrowRight') {
        e.preventDefault()
        options.onMove(row, Math.min(col + 1, options.colCount - 1))
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault()
        options.onMove(row, Math.max(col - 1, 0))
      }
    }
    window.addEventListener('keydown', handle)
    return () => window.removeEventListener('keydown', handle)
  }, [options])
}
