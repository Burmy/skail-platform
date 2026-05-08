'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { BookmarkIcon, BookmarkPlusIcon, XIcon } from 'lucide-react'

import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import {
  applyFilterPreset,
  deleteFilterPreset,
  saveFilterPreset,
} from '@/app/databases/actions'
import type { FilterPreset, ViewFilter, ViewFilterGroup } from '@/lib/views/types'

export type FilterPresetsStripProps = {
  workspaceId: string
  viewId: string
  presets: FilterPreset[]
  activePresetId: string | null
  currentFilters: ViewFilter[]
  currentTree: ViewFilterGroup | null
}

export function FilterPresetsStrip(props: FilterPresetsStripProps) {
  const { workspaceId, viewId, presets, activePresetId, currentFilters, currentTree } = props
  const router = useRouter()
  const [, startTransition] = useTransition()
  const [name, setName] = useState('')
  const [open, setOpen] = useState(false)

  function apply(presetId: string | null) {
    startTransition(async () => {
      await applyFilterPreset({ workspaceId, viewId, presetId })
      router.refresh()
    })
  }

  function save() {
    const trimmed = name.trim()
    if (!trimmed) return
    startTransition(async () => {
      const result = await saveFilterPreset({
        workspaceId,
        viewId,
        name: trimmed,
        filters: currentFilters,
        filterTree: currentTree,
      })
      if (result.ok) {
        setName('')
        setOpen(false)
        router.refresh()
      }
    })
  }

  function remove(presetId: string) {
    startTransition(async () => {
      await deleteFilterPreset({ workspaceId, viewId, presetId })
      router.refresh()
    })
  }

  if (presets.length === 0 && currentFilters.length === 0 && !currentTree) return null

  return (
    <div className="flex items-center gap-1 overflow-x-auto px-3 py-1 border-b">
      {presets.map((preset) => {
        const active = preset.id === activePresetId
        return (
          <span
            key={preset.id}
            className={cn(
              'inline-flex items-center gap-0.5 rounded-full border px-2 py-0.5 text-xs transition-colors',
              active ? 'border-foreground bg-accent' : 'border-border text-muted-foreground hover:bg-accent/40',
            )}
          >
            <button
              type="button"
              onClick={() => apply(active ? null : preset.id)}
              className="inline-flex items-center gap-1"
            >
              <BookmarkIcon className="size-3" />
              <span>{preset.name}</span>
            </button>
            <button
              type="button"
              onClick={() => remove(preset.id)}
              className="ml-0.5 text-muted-foreground hover:text-destructive"
              aria-label={`Delete preset ${preset.name}`}
            >
              <XIcon className="size-2.5" />
            </button>
          </span>
        )
      })}
      {currentFilters.length > 0 || currentTree ? (
        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger asChild>
            <Button size="sm" variant="ghost" className="h-6 gap-1 text-xs">
              <BookmarkPlusIcon className="size-3" />
              Save current
            </Button>
          </PopoverTrigger>
          <PopoverContent align="start" className="w-72 p-3">
            <form
              onSubmit={(e) => {
                e.preventDefault()
                save()
              }}
              className="flex flex-col gap-2"
            >
              <label className="text-xs font-medium">Preset name</label>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Active customers"
                maxLength={80}
                autoFocus
              />
              <Button type="submit" size="sm" disabled={!name.trim()}>
                Save preset
              </Button>
            </form>
          </PopoverContent>
        </Popover>
      ) : null}
    </div>
  )
}
