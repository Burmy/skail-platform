'use client'

import { useEffect, useMemo, useState } from 'react'
import { CheckIcon, UserIcon, XIcon } from 'lucide-react'

import { cn } from '@/lib/utils'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Input } from '@/components/ui/input'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { useCellAutosave } from '../hooks/use-cell-autosave'
import type { Json } from '@/lib/supabase/database.types'

export type PersonEditorProps = {
  workspaceId: string
  initial: Json | null
  onSave: (next: unknown, clientRequestId: string) => Promise<{ ok: boolean; error?: string }>
  isReadOnly?: boolean
  className?: string
}

type Member = {
  user_id: string
  email: string | null
  display_name: string | null
  status: string
}

function readPersons(value: Json | null): string[] {
  if (Array.isArray(value)) {
    return value.flatMap((v) => (typeof v === 'string' ? [v] : []))
  }
  if (typeof value === 'string') return [value]
  return []
}

function initials(member: Member) {
  const name = member.display_name ?? member.email ?? 'U'
  const parts = name.trim().split(/\s+/).slice(0, 2)
  return parts.map((p) => p[0]?.toUpperCase() ?? '').join('') || 'U'
}

export function PersonEditor({
  workspaceId,
  initial,
  onSave,
  isReadOnly,
  className,
}: PersonEditorProps) {
  const initialList = readPersons(initial)
  const autosave = useCellAutosave<string[]>(initialList, { onSave, immediate: true })
  const [open, setOpen] = useState(false)
  const [members, setMembers] = useState<Member[]>([])
  const [filter, setFilter] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!open || members.length > 0) return
    setLoading(true)
    fetch(`/api/databases/members?workspaceId=${workspaceId}`)
      .then((r) => r.json())
      .then((j) => setMembers(j.members ?? []))
      .catch(() => setMembers([]))
      .finally(() => setLoading(false))
  }, [open, workspaceId, members.length])

  const memberById = useMemo(() => new Map(members.map((m) => [m.user_id, m])), [members])
  const visible = useMemo(
    () =>
      members.filter((m) => {
        const f = filter.trim().toLowerCase()
        if (!f) return true
        return (
          m.display_name?.toLowerCase().includes(f) ||
          m.email?.toLowerCase().includes(f)
        )
      }),
    [members, filter],
  )

  function toggle(id: string) {
    const next = autosave.value.includes(id)
      ? autosave.value.filter((x) => x !== id)
      : [...autosave.value, id]
    autosave.change(next)
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
            {autosave.value.length === 0 ? (
              <span className="inline-flex items-center gap-1 text-muted-foreground">
                <UserIcon className="size-3.5" />
              </span>
            ) : (
              autosave.value.map((id) => {
                const member = memberById.get(id)
                return (
                  <span
                    key={id}
                    className={cn(
                      'inline-flex items-center gap-1 rounded-full bg-accent/60 px-1.5 py-0.5 text-xs',
                      !member && 'text-muted-foreground',
                    )}
                    title={member?.display_name ?? member?.email ?? 'Removed user'}
                  >
                    <Avatar className="size-4 text-[10px]">
                      <AvatarFallback>{member ? initials(member) : '·'}</AvatarFallback>
                    </Avatar>
                    <span className="truncate">
                      {member?.display_name ?? member?.email ?? 'Removed user'}
                    </span>
                  </span>
                )
              })
            )}
          </button>
        </PopoverTrigger>
        <PopoverContent align="start" className="w-72 p-2">
          <Input
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            placeholder="Search members…"
            className="mb-2 h-7 text-xs"
          />
          {loading ? (
            <p className="px-2 py-3 text-xs text-muted-foreground">Loading…</p>
          ) : visible.length === 0 ? (
            <p className="px-2 py-3 text-xs text-muted-foreground">No members.</p>
          ) : (
            <ul className="flex max-h-64 flex-col gap-0.5 overflow-y-auto">
              {visible.map((member) => {
                const checked = autosave.value.includes(member.user_id)
                return (
                  <li key={member.user_id}>
                    <button
                      type="button"
                      onClick={() => toggle(member.user_id)}
                      className={cn(
                        'flex w-full items-center justify-between gap-2 rounded-sm px-2 py-1.5 text-left text-sm hover:bg-accent/60',
                        member.status !== 'active' && 'opacity-60',
                      )}
                    >
                      <div className="flex items-center gap-2">
                        <Avatar className="size-5 text-[10px]">
                          <AvatarFallback>{initials(member)}</AvatarFallback>
                        </Avatar>
                        <div className="flex flex-col">
                          <span className="text-sm">
                            {member.display_name ?? member.email ?? 'Member'}
                          </span>
                          {member.email && member.email !== member.display_name ? (
                            <span className="text-xs text-muted-foreground">{member.email}</span>
                          ) : null}
                        </div>
                      </div>
                      {checked ? <CheckIcon className="size-3.5" /> : null}
                    </button>
                  </li>
                )
              })}
            </ul>
          )}
        </PopoverContent>
      </Popover>
    </div>
  )
}
