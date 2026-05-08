'use client'

import { useEffect, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { ArchiveIcon, RotateCcwIcon } from 'lucide-react'

import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Empty, EmptyDescription, EmptyHeader, EmptyTitle } from '@/components/ui/empty'
import { Skeleton } from '@/components/ui/skeleton'
import {
  restoreField,
  restoreRecord,
  restoreView,
} from '@/app/databases/actions'

export type ArchivedRecord = {
  id: string
  title: string | null
  archived_at: string | null
}

export type ArchivedField = {
  id: string
  name: string
  field_type: string
  archived_at: string | null
}

export type ArchivedView = {
  id: string
  name: string
  view_type: string
  archived_at: string | null
}

export type ArchiveDrawerProps = {
  workspaceId: string
  collectionId: string
  open: boolean
  onClose: () => void
}

export function ArchiveDrawer(props: ArchiveDrawerProps) {
  const { workspaceId, collectionId, open, onClose } = props
  const router = useRouter()
  const [, startTransition] = useTransition()
  const [loading, setLoading] = useState(false)
  const [data, setData] = useState<{
    records: ArchivedRecord[]
    fields: ArchivedField[]
    views: ArchivedView[]
  }>({ records: [], fields: [], views: [] })

  useEffect(() => {
    if (!open) return
    let cancelled = false
    setLoading(true)
    fetch(`/api/databases/archive?workspaceId=${workspaceId}&collectionId=${collectionId}`, {
      cache: 'no-store',
    })
      .then((res) => res.json())
      .then((json) => {
        if (cancelled) return
        setData(json)
        setLoading(false)
      })
      .catch(() => {
        if (cancelled) return
        setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [open, workspaceId, collectionId])

  function refresh() {
    fetch(`/api/databases/archive?workspaceId=${workspaceId}&collectionId=${collectionId}`, {
      cache: 'no-store',
    })
      .then((res) => res.json())
      .then(setData)
  }

  return (
    <Sheet open={open} onOpenChange={(o) => !o && onClose()}>
      <SheetContent side="right" className="flex w-[480px] flex-col gap-0 sm:max-w-md">
        <SheetHeader className="border-b px-4 py-3">
          <SheetTitle>Archive</SheetTitle>
          <SheetDescription>Restore archived records, properties, and views.</SheetDescription>
        </SheetHeader>
        <Tabs defaultValue="records" className="flex flex-1 flex-col overflow-hidden">
          <TabsList className="mx-4 mt-3">
            <TabsTrigger value="records">
              Records ({data.records.length})
            </TabsTrigger>
            <TabsTrigger value="fields">
              Properties ({data.fields.length})
            </TabsTrigger>
            <TabsTrigger value="views">
              Views ({data.views.length})
            </TabsTrigger>
          </TabsList>
          <div className="flex-1 overflow-y-auto px-4 py-3">
            {loading ? (
              <div className="flex flex-col gap-1.5">
                <Skeleton className="h-7" />
                <Skeleton className="h-7" />
                <Skeleton className="h-7" />
              </div>
            ) : (
              <>
                <TabsContent value="records">
                  {data.records.length === 0 ? (
                    <Empty>
                      <EmptyHeader>
                        <ArchiveIcon className="size-5 text-muted-foreground" />
                        <EmptyTitle>No archived records</EmptyTitle>
                        <EmptyDescription>
                          Records you archive will show up here.
                        </EmptyDescription>
                      </EmptyHeader>
                    </Empty>
                  ) : (
                    <ul className="flex flex-col gap-1">
                      {data.records.map((record) => (
                        <li
                          key={record.id}
                          className="flex items-center justify-between rounded-sm border px-2 py-1.5 text-sm"
                        >
                          <span className="truncate">{record.title || 'Untitled'}</span>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="gap-1"
                            onClick={() => {
                              startTransition(async () => {
                                await restoreRecord({ workspaceId, recordId: record.id })
                                refresh()
                                router.refresh()
                              })
                            }}
                          >
                            <RotateCcwIcon className="size-3.5" />
                            Restore
                          </Button>
                        </li>
                      ))}
                    </ul>
                  )}
                </TabsContent>
                <TabsContent value="fields">
                  {data.fields.length === 0 ? (
                    <Empty>
                      <EmptyHeader>
                        <ArchiveIcon className="size-5 text-muted-foreground" />
                        <EmptyTitle>No archived properties</EmptyTitle>
                        <EmptyDescription>
                          Properties you archive will show up here. Their values are preserved.
                        </EmptyDescription>
                      </EmptyHeader>
                    </Empty>
                  ) : (
                    <ul className="flex flex-col gap-1">
                      {data.fields.map((field) => (
                        <li
                          key={field.id}
                          className="flex items-center justify-between rounded-sm border px-2 py-1.5 text-sm"
                        >
                          <div className="flex flex-col">
                            <span className="truncate">{field.name}</span>
                            <span className="text-xs text-muted-foreground">{field.field_type}</span>
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="gap-1"
                            onClick={() => {
                              startTransition(async () => {
                                await restoreField({ workspaceId, fieldId: field.id })
                                refresh()
                                router.refresh()
                              })
                            }}
                          >
                            <RotateCcwIcon className="size-3.5" />
                            Restore
                          </Button>
                        </li>
                      ))}
                    </ul>
                  )}
                </TabsContent>
                <TabsContent value="views">
                  {data.views.length === 0 ? (
                    <Empty>
                      <EmptyHeader>
                        <ArchiveIcon className="size-5 text-muted-foreground" />
                        <EmptyTitle>No archived views</EmptyTitle>
                        <EmptyDescription>
                          Views you archive will show up here.
                        </EmptyDescription>
                      </EmptyHeader>
                    </Empty>
                  ) : (
                    <ul className="flex flex-col gap-1">
                      {data.views.map((view) => (
                        <li
                          key={view.id}
                          className="flex items-center justify-between rounded-sm border px-2 py-1.5 text-sm"
                        >
                          <div className="flex flex-col">
                            <span className="truncate">{view.name}</span>
                            <span className="text-xs text-muted-foreground">{view.view_type}</span>
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="gap-1"
                            onClick={() => {
                              startTransition(async () => {
                                await restoreView({ workspaceId, viewId: view.id })
                                refresh()
                                router.refresh()
                              })
                            }}
                          >
                            <RotateCcwIcon className="size-3.5" />
                            Restore
                          </Button>
                        </li>
                      ))}
                    </ul>
                  )}
                </TabsContent>
              </>
            )}
          </div>
        </Tabs>
      </SheetContent>
    </Sheet>
  )
}
