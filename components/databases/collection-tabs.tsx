'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { DatabaseIcon, PlusIcon } from 'lucide-react'

import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Textarea } from '@/components/ui/textarea'
import { createCollection } from '@/app/databases/actions'
import type { Collection } from '@/lib/supabase/database.types'

export type CollectionTabsProps = {
  workspaceId: string
  collections: Collection[]
  activeCollectionId: string | null
  canManageSchema: boolean
}

export function CollectionTabs({
  workspaceId,
  collections,
  activeCollectionId,
  canManageSchema,
}: CollectionTabsProps) {
  return (
    <div className="flex items-center gap-1 overflow-x-auto border-b bg-sidebar/40 px-3 py-1.5">
      {collections.length === 0 ? (
        <span className="px-2 py-1 text-xs text-muted-foreground">
          No collections yet.
        </span>
      ) : (
        collections.map((collection) => {
          const isActive = collection.id === activeCollectionId
          return (
            <Link
              key={collection.id}
              href={`/databases/${collection.id}?workspace_id=${workspaceId}`}
              className={cn(
                'flex shrink-0 items-center gap-1.5 rounded-md px-2.5 py-1.5 text-sm transition-colors',
                isActive
                  ? 'bg-background font-medium text-foreground shadow-xs'
                  : 'text-muted-foreground hover:bg-accent/50 hover:text-foreground',
              )}
            >
              <DatabaseIcon className="size-3.5" />
              <span className="truncate max-w-[14rem]">{collection.name}</span>
            </Link>
          )
        })
      )}
      {canManageSchema ? (
        <CreateCollectionDialog workspaceId={workspaceId} />
      ) : null}
    </div>
  )
}

function CreateCollectionDialog({ workspaceId }: { workspaceId: string }) {
  const [open, setOpen] = useState(false)
  const [pending, setPending] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const router = useRouter()

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          size="sm"
          variant="ghost"
          className="ml-1 h-7 gap-1 px-2 text-xs"
          aria-label="Create collection"
        >
          <PlusIcon className="size-3.5" />
          New collection
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>New collection</DialogTitle>
          <DialogDescription>
            Collections are workspace databases. You can add fields and views after creating.
          </DialogDescription>
        </DialogHeader>
        <form
          action={async (formData) => {
            setPending(true)
            setErrorMessage(null)
            const result = await createCollection({ status: 'idle' }, formData)
            setPending(false)
            if (result.status === 'success') {
              setOpen(false)
              router.refresh()
            } else if (result.status === 'error') {
              setErrorMessage(result.message ?? 'Could not create collection.')
            }
          }}
          className="flex flex-col gap-3"
        >
          <input type="hidden" name="workspaceId" value={workspaceId} />
          <div className="flex flex-col gap-1">
            <label htmlFor="collection-name" className="text-sm font-medium">
              Name
            </label>
            <Input id="collection-name" name="name" placeholder="e.g. Customers" required maxLength={80} />
          </div>
          <div className="flex flex-col gap-1">
            <label htmlFor="collection-description" className="text-sm font-medium">
              Description (optional)
            </label>
            <Textarea
              id="collection-description"
              name="description"
              placeholder="What is this collection for?"
              rows={2}
              maxLength={240}
            />
          </div>
          {errorMessage ? (
            <p className="text-sm text-destructive">{errorMessage}</p>
          ) : null}
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={pending}>
              {pending ? 'Creating…' : 'Create'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
