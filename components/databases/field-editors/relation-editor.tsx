'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { CheckIcon, LinkIcon } from 'lucide-react'

import { cn } from '@/lib/utils'
import { Input } from '@/components/ui/input'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { Badge } from '@/components/ui/badge'
import { linkRecords, unlinkRecords } from '@/app/databases/actions'

export type RelationEditorProps = {
  workspaceId: string
  recordId: string
  fieldId: string
  isReadOnly?: boolean
  className?: string
  suppressRefresh?: boolean
}

type Record = { id: string; title: string | null }

export function RelationEditor({
  workspaceId,
  recordId,
  fieldId,
  isReadOnly,
  className,
  suppressRefresh = false,
}: RelationEditorProps) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState('')
  const [linked, setLinked] = useState<Record[]>([])
  const [candidates, setCandidates] = useState<Record[]>([])
  const [relationId, setRelationId] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [pending, setPending] = useState(false)

  async function refresh(query: string) {
    setLoading(true)
    setErrorMessage(null)
    try {
      const r = await fetch(
        `/api/databases/relations?workspaceId=${workspaceId}&sourceFieldId=${fieldId}&sourceRecordId=${recordId}&q=${encodeURIComponent(query)}`,
      )
      const j = await r.json()
      if (!r.ok) {
        throw new Error(j.error ?? 'Could not load relation.')
      }
      setRelationId(j.relationId)
      setLinked(j.linked ?? [])
      setCandidates(j.candidates ?? [])
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : 'Could not load relation.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (open) void refresh(search)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  useEffect(() => {
    if (!open) return
    const id = setTimeout(() => void refresh(search), 250)
    return () => clearTimeout(id)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search])

  const linkedSet = useMemo(() => new Set(linked.map((r) => r.id)), [linked])

  async function toggle(record: Record) {
    if (!relationId) return
    setPending(true)
    try {
      if (linkedSet.has(record.id)) {
        const result = await unlinkRecords({
          workspaceId,
          relationId,
          sourceRecordId: recordId,
          targetRecordIds: [record.id],
        })
        if (!result.ok) throw new Error(result.error)
        setLinked((current) => current.filter((r) => r.id !== record.id))
      } else {
        const result = await linkRecords({
          workspaceId,
          relationId,
          sourceRecordId: recordId,
          targetRecordIds: [record.id],
        })
        if (!result.ok) throw new Error(result.error)
        setLinked((current) => [...current, record])
      }
      if (!suppressRefresh) router.refresh()
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : 'Could not update link.')
    } finally {
      setPending(false)
    }
  }

  return (
    <div className={cn('relative w-full', className)}>
      <Popover open={open} onOpenChange={(o) => !isReadOnly && setOpen(o)}>
        <PopoverTrigger asChild>
          <button
            type="button"
            disabled={isReadOnly}
            className="flex h-7 w-full flex-wrap items-center gap-1 rounded-sm px-1.5 text-left text-sm hover:bg-accent/40 focus:bg-accent/40 focus:outline-none"
          >
            {linked.length === 0 ? (
              <span className="inline-flex items-center gap-1 text-muted-foreground">
                <LinkIcon className="size-3.5" />
              </span>
            ) : (
              linked.map((rec) => (
                <Badge key={rec.id} variant="secondary" className="font-normal">
                  {rec.title ?? 'Untitled'}
                </Badge>
              ))
            )}
          </button>
        </PopoverTrigger>
        <PopoverContent align="start" className="w-80 p-2">
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Find a record…"
            className="mb-2 h-7 text-xs"
          />
          {errorMessage ? (
            <p className="px-2 py-1 text-xs text-destructive">{errorMessage}</p>
          ) : null}
          {loading ? (
            <p className="px-2 py-3 text-xs text-muted-foreground">Loading…</p>
          ) : (
            <ul className="flex max-h-64 flex-col gap-0.5 overflow-y-auto">
              {candidates.length === 0 ? (
                <li className="px-2 py-3 text-xs text-muted-foreground">No matches.</li>
              ) : (
                candidates.map((record) => {
                  const checked = linkedSet.has(record.id)
                  return (
                    <li key={record.id}>
                      <button
                        type="button"
                        disabled={pending}
                        onClick={() => toggle(record)}
                        className="flex w-full items-center justify-between rounded-sm px-2 py-1.5 text-left text-sm hover:bg-accent/60"
                      >
                        <span className="truncate">{record.title ?? 'Untitled'}</span>
                        {checked ? <CheckIcon className="size-3.5" /> : null}
                      </button>
                    </li>
                  )
                })
              )}
            </ul>
          )}
        </PopoverContent>
      </Popover>
    </div>
  )
}
