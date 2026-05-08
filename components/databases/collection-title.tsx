'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { ArchiveIcon, MoreHorizontalIcon } from 'lucide-react'

import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { renameCollection } from '@/app/databases/actions'

export type CollectionTitleProps = {
  workspaceId: string
  collectionId: string
  initialName: string
  canManageSchema: boolean
  recordCount: number
  fieldCount: number
  onArchive?: () => void
}

export function CollectionTitle({
  workspaceId,
  collectionId,
  initialName,
  canManageSchema,
  recordCount,
  fieldCount,
  onArchive,
}: CollectionTitleProps) {
  const router = useRouter()
  const [name, setName] = useState(initialName)
  const [editing, setEditing] = useState(false)
  const [, startTransition] = useTransition()

  function commit(next: string) {
    if (next.trim() === '' || next === initialName) {
      setName(initialName)
      setEditing(false)
      return
    }
    startTransition(async () => {
      const formData = new FormData()
      formData.set('workspaceId', workspaceId)
      formData.set('collectionId', collectionId)
      formData.set('name', next.trim())
      await renameCollection({ status: 'idle' }, formData)
      setEditing(false)
      router.refresh()
    })
  }

  return (
    <div className="flex items-center gap-2">
      {canManageSchema && editing ? (
        <Input
          autoFocus
          value={name}
          onChange={(event) => setName(event.target.value)}
          onBlur={() => commit(name)}
          onKeyDown={(event) => {
            if (event.key === 'Enter') commit(name)
            if (event.key === 'Escape') {
              setName(initialName)
              setEditing(false)
            }
          }}
          className="h-8 max-w-md text-lg font-semibold"
        />
      ) : (
        <button
          type="button"
          onClick={() => canManageSchema && setEditing(true)}
          className={cn(
            'rounded-md px-1.5 py-0.5 text-lg font-semibold transition-colors',
            canManageSchema && 'hover:bg-accent/40',
            !canManageSchema && 'cursor-default',
          )}
          aria-label={canManageSchema ? 'Rename collection' : undefined}
        >
          {name}
        </button>
      )}
      <span className="text-xs text-muted-foreground">
        {recordCount} {recordCount === 1 ? 'record' : 'records'} - {fieldCount}{' '}
        {fieldCount === 1 ? 'property' : 'properties'}
      </span>
      {canManageSchema ? <CollectionMenu onArchive={onArchive} /> : null}
    </div>
  )
}

function CollectionMenu({ onArchive }: { onArchive?: () => void }) {
  const [open, setOpen] = useState(false)

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <Button size="icon" variant="ghost" className="size-7" aria-label="Collection menu">
          <MoreHorizontalIcon className="size-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start">
        <DropdownMenuItem
          onSelect={() => {
            setOpen(false)
            onArchive?.()
          }}
          className="text-destructive focus:text-destructive"
        >
          <ArchiveIcon className="size-3.5" />
          Archive collection
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
