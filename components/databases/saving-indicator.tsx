'use client'

import { CheckIcon, LoaderIcon, AlertCircleIcon } from 'lucide-react'

import { cn } from '@/lib/utils'

export type GlobalSaveState = 'idle' | 'saving' | 'saved' | 'error'

export function SavingIndicator({
  state,
  className,
}: {
  state: GlobalSaveState
  className?: string
}) {
  if (state === 'idle') return null
  return (
    <div
      className={cn(
        'inline-flex items-center gap-1.5 text-xs text-muted-foreground',
        state === 'error' && 'text-destructive',
        className,
      )}
      role="status"
      aria-live="polite"
    >
      {state === 'saving' && (
        <>
          <LoaderIcon className="size-3 animate-spin" aria-hidden />
          <span>Saving…</span>
        </>
      )}
      {state === 'saved' && (
        <>
          <CheckIcon className="size-3" aria-hidden />
          <span>Saved</span>
        </>
      )}
      {state === 'error' && (
        <>
          <AlertCircleIcon className="size-3" aria-hidden />
          <span>Save failed</span>
        </>
      )}
    </div>
  )
}
