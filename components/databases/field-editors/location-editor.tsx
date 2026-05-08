'use client'

import { useState } from 'react'
import { MapPinIcon, Loader2Icon } from 'lucide-react'

import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { useCellAutosave } from '../hooks/use-cell-autosave'
import type { LocationValue } from '@/lib/properties/types'
import type { Json } from '@/lib/supabase/database.types'

export type LocationEditorProps = {
  initial: Json | null
  onSave: (next: unknown, clientRequestId: string) => Promise<{ ok: boolean; error?: string }>
  isReadOnly?: boolean
  className?: string
}

function readLocation(value: Json | null): LocationValue | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null
  const obj = value as Record<string, unknown>
  if (
    typeof obj.address !== 'string' ||
    typeof obj.lat !== 'number' ||
    typeof obj.lng !== 'number'
  ) {
    return null
  }
  return {
    address: obj.address,
    lat: obj.lat,
    lng: obj.lng,
    provider: obj.provider === 'osm' ? 'osm' : undefined,
  }
}

export function LocationEditor({
  initial,
  onSave,
  isReadOnly,
  className,
}: LocationEditorProps) {
  const initialValue = readLocation(initial)
  const autosave = useCellAutosave<LocationValue | null>(initialValue, { onSave, immediate: true })
  const [open, setOpen] = useState(false)
  const [draftAddress, setDraftAddress] = useState(initialValue?.address ?? '')
  const [latStr, setLatStr] = useState(initialValue?.lat != null ? String(initialValue.lat) : '')
  const [lngStr, setLngStr] = useState(initialValue?.lng != null ? String(initialValue.lng) : '')
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function geocode() {
    if (!draftAddress.trim()) return
    setPending(true)
    setError(null)
    try {
      const response = await fetch(`/api/databases/geocode?q=${encodeURIComponent(draftAddress)}`)
      const json = await response.json()
      if (!response.ok) throw new Error(json.error ?? 'Geocode failed')
      const r = json.result as { address: string; lat: number; lng: number; provider?: 'osm' } | null
      if (!r) throw new Error('No match found.')
      setLatStr(String(r.lat))
      setLngStr(String(r.lng))
      setDraftAddress(r.address)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Geocode failed')
    } finally {
      setPending(false)
    }
  }

  function commit() {
    const lat = Number(latStr)
    const lng = Number(lngStr)
    if (!Number.isFinite(lat) || !Number.isFinite(lng) || draftAddress.trim() === '') {
      setError('Address, lat, and lng are required.')
      return
    }
    autosave.change({ address: draftAddress.trim(), lat, lng, provider: 'osm' })
    setOpen(false)
  }

  function clear() {
    autosave.change(null)
    setDraftAddress('')
    setLatStr('')
    setLngStr('')
    setOpen(false)
  }

  const display = autosave.value
  return (
    <div className={cn('relative w-full', className)}>
      <Popover open={open} onOpenChange={(o) => !isReadOnly && setOpen(o)}>
        <PopoverTrigger asChild>
          <button
            type="button"
            disabled={isReadOnly}
            className="flex h-7 w-full items-center gap-1 rounded-sm px-1.5 text-left text-sm hover:bg-accent/40 focus:bg-accent/40 focus:outline-none"
          >
            <MapPinIcon className="size-3.5 shrink-0 text-muted-foreground" />
            <span className={cn('truncate', !display && 'text-muted-foreground')}>
              {display ? display.address : '—'}
            </span>
          </button>
        </PopoverTrigger>
        <PopoverContent align="start" className="w-80 p-3">
          <div className="space-y-2">
            <label className="text-xs font-medium">Address</label>
            <div className="flex gap-1.5">
              <Input
                value={draftAddress}
                onChange={(e) => setDraftAddress(e.target.value)}
                placeholder="123 Main St, City"
                className="h-7 text-xs"
              />
              <Button type="button" size="sm" variant="outline" onClick={geocode} disabled={pending}>
                {pending ? <Loader2Icon className="size-3 animate-spin" /> : 'Find'}
              </Button>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-xs text-muted-foreground">Latitude</label>
                <Input
                  value={latStr}
                  onChange={(e) => setLatStr(e.target.value)}
                  className="h-7 text-xs tabular-nums"
                />
              </div>
              <div>
                <label className="text-xs text-muted-foreground">Longitude</label>
                <Input
                  value={lngStr}
                  onChange={(e) => setLngStr(e.target.value)}
                  className="h-7 text-xs tabular-nums"
                />
              </div>
            </div>
            {error ? <p className="text-xs text-destructive">{error}</p> : null}
            <div className="flex justify-between pt-1">
              <Button type="button" variant="ghost" size="sm" onClick={clear}>
                Clear
              </Button>
              <Button type="button" size="sm" onClick={commit}>
                Save
              </Button>
            </div>
          </div>
        </PopoverContent>
      </Popover>
    </div>
  )
}
