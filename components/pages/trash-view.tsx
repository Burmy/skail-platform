'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { FileTextIcon, RotateCcwIcon, Trash2Icon } from 'lucide-react'

import { Button } from '@/components/ui/button'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { archivePage, hardDeletePage, restorePage } from '@/app/pages/actions'
import type { TrashedPage } from '@/lib/pages/queries'

const PURGE_DAYS = 30

export function TrashView({
  workspaceId,
  initialItems,
}: {
  workspaceId: string
  initialItems: TrashedPage[]
}) {
  const router = useRouter()
  const [items, setItems] = useState(initialItems)
  const [confirmDelete, setConfirmDelete] = useState<TrashedPage | null>(null)
  const [, startTransition] = useTransition()

  function handleRestore(id: string) {
    startTransition(async () => {
      const result = await restorePage({ workspaceId, pageId: id })
      if (result.ok) {
        setItems((prev) => prev.filter((x) => x.id !== id))
        router.refresh()
      }
    })
  }

  function handleHardDelete(id: string) {
    startTransition(async () => {
      const result = await hardDeletePage({ workspaceId, pageId: id })
      if (result.ok) {
        setItems((prev) => prev.filter((x) => x.id !== id))
        setConfirmDelete(null)
        router.refresh()
      }
    })
  }

  return (
    <div className="mx-auto max-w-4xl px-6 py-8">
      <header className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight">Trash</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Archived pages are kept for {PURGE_DAYS} days, then deleted permanently.
        </p>
      </header>

      {items.length === 0 ? (
        <div className="rounded-md border border-dashed bg-muted/20 px-4 py-12 text-center">
          <Trash2Icon className="mx-auto size-8 text-muted-foreground" />
          <p className="mt-2 text-sm font-medium">Trash is empty</p>
          <p className="text-xs text-muted-foreground">
            Archived pages will appear here for 30 days.
          </p>
        </div>
      ) : (
        <ul className="divide-y rounded-md border bg-card">
          {items.map((item) => {
            const archivedAt = item.archived_at
              ? new Date(item.archived_at)
              : null
            const remainingDays = archivedAt
              ? Math.max(
                  0,
                  PURGE_DAYS -
                    Math.floor(
                      (Date.now() - archivedAt.getTime()) / (1000 * 60 * 60 * 24),
                    ),
                )
              : null
            return (
              <li
                key={item.id}
                className="flex items-center gap-3 px-4 py-3 text-sm"
              >
                {item.icon ? (
                  <span className="text-base">{item.icon}</span>
                ) : (
                  <FileTextIcon className="size-4 text-muted-foreground" />
                )}
                <span className="flex-1 truncate">
                  {item.title || 'Untitled'}
                </span>
                {remainingDays !== null ? (
                  <span className="text-[11px] text-muted-foreground">
                    {remainingDays} {remainingDays === 1 ? 'day' : 'days'} left
                  </span>
                ) : null}
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => handleRestore(item.id)}
                  className="gap-1"
                >
                  <RotateCcwIcon className="size-3.5" />
                  Restore
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => setConfirmDelete(item)}
                  className="gap-1 text-destructive"
                >
                  <Trash2Icon className="size-3.5" />
                  Delete
                </Button>
              </li>
            )
          })}
        </ul>
      )}

      <AlertDialog
        open={confirmDelete !== null}
        onOpenChange={(o) => !o && setConfirmDelete(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete forever?</AlertDialogTitle>
            <AlertDialogDescription>
              This permanently deletes &ldquo;{confirmDelete?.title || 'Untitled'}
              &rdquo; and any subpages under it. This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault()
                if (confirmDelete) handleHardDelete(confirmDelete.id)
              }}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete forever
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

// archivePage isn't actually called from the trash view (only restore + hard
// delete) — re-exporting keeps the import alive for future controls without
// triggering an unused-import lint.
export const _archivePageReference = archivePage
