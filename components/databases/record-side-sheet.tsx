'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { ArchiveIcon, RotateCcwIcon } from 'lucide-react'

import { Button } from '@/components/ui/button'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet'
import { Input } from '@/components/ui/input'
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
import { archiveRecord, restoreRecord, updateRecordField, updateRecordTitle } from '@/app/databases/actions'
import type { CollectionRecordWithValues, PropertyType } from '@/lib/properties/types'
import type { CollectionFieldWithType } from '@/lib/databases/queries'

import { FieldCell } from './field-cell'
import { useCellAutosave } from './hooks/use-cell-autosave'

export type RecordSideSheetProps = {
  workspaceId: string
  open: boolean
  onClose: () => void
  record: CollectionRecordWithValues | null
  fields: CollectionFieldWithType[]
  titleFieldId: string | null
  onArchiveRecord?: (record: CollectionRecordWithValues) => void
  readOnly?: boolean
  pageId?: string
}

export function RecordSideSheet(props: RecordSideSheetProps) {
  const {
    workspaceId,
    open,
    onClose,
    record,
    fields,
    titleFieldId,
    onArchiveRecord,
    readOnly = false,
    pageId,
  } = props
  const router = useRouter()
  const [archiveConfirm, setArchiveConfirm] = useState(false)
  const [, startTransition] = useTransition()

  if (!record) {
    return (
      <Sheet open={open} onOpenChange={(o) => !o && onClose()}>
        <SheetContent side="right" className="w-[480px] sm:max-w-md">
          <SheetHeader>
            <SheetTitle>No record selected</SheetTitle>
          </SheetHeader>
        </SheetContent>
      </Sheet>
    )
  }

  return (
    <>
      <Sheet open={open} onOpenChange={(o) => !o && onClose()}>
        <SheetContent side="right" className="flex w-[520px] flex-col gap-0 sm:max-w-lg">
          <SheetHeader className="border-b px-4 py-3">
            <RecordTitleEditor
              workspaceId={workspaceId}
              recordId={record.id}
              initial={record.title ?? 'Untitled'}
              onPersisted={() => router.refresh()}
              readOnly={readOnly}
              pageId={pageId}
            />
            <SheetDescription className="sr-only">Edit record properties</SheetDescription>
          </SheetHeader>
          <div className="flex-1 overflow-y-auto px-4 py-3">
            <ul className="flex flex-col gap-2">
              {fields
                .filter((f) => f.id !== titleFieldId)
                .map((field) => (
                  <li key={field.id} className="grid grid-cols-[160px_1fr] items-start gap-2">
                    <span className="pt-1.5 text-xs font-medium text-muted-foreground">
                      {field.name}
                    </span>
                    <FieldCell
                      workspaceId={workspaceId}
                      field={field}
                      record={record}
                      allFields={fields}
                      onSave={async (fieldId, value, clientRequestId) => {
                        const result = await updateRecordField({
                          workspaceId,
                          recordId: record.id,
                          fieldId,
                          value,
                          clientRequestId,
                          pageId,
                        })
                        return { ok: result.ok, error: result.ok ? undefined : result.error }
                      }}
                      isReadOnly={readOnly}
                    />
                  </li>
                ))}
            </ul>
          </div>
          {!readOnly ? (
          <div className="border-t px-4 py-3">
            {record.archived_at ? (
              <Button
                variant="outline"
                size="sm"
                className="gap-1.5"
                onClick={() => {
                  startTransition(async () => {
                    await restoreRecord({ workspaceId, recordId: record.id })
                    router.refresh()
                  })
                }}
              >
                <RotateCcwIcon className="size-3.5" />
                Restore record
              </Button>
            ) : (
              <Button
                variant="outline"
                size="sm"
                className="gap-1.5 text-destructive hover:text-destructive"
                onClick={() => {
                  onClose()
                  if (onArchiveRecord) {
                    onArchiveRecord(record)
                    return
                  }
                  setArchiveConfirm(true)
                }}
              >
                <ArchiveIcon className="size-3.5" />
                Archive record
              </Button>
            )}
          </div>
          ) : null}
        </SheetContent>
      </Sheet>

      <AlertDialog open={archiveConfirm} onOpenChange={setArchiveConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Archive this record?</AlertDialogTitle>
            <AlertDialogDescription>
              The record will be hidden from the table. You can restore it from the archive
              drawer.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault()
                startTransition(async () => {
                  await archiveRecord({ workspaceId, recordId: record.id })
                  setArchiveConfirm(false)
                  onClose()
                  router.refresh()
                })
              }}
            >
              Archive
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}

function RecordTitleEditor({
  workspaceId,
  recordId,
  initial,
  onPersisted,
  readOnly = false,
  pageId,
}: {
  workspaceId: string
  recordId: string
  initial: string
  onPersisted?: () => void
  readOnly?: boolean
  pageId?: string
}) {
  const autosave = useCellAutosave<string>(initial, {
    onSave: async (next, clientRequestId) => {
      if (readOnly) {
        return { ok: false, error: 'This record is read-only.' }
      }

      const result = await updateRecordTitle({
        workspaceId,
        recordId,
        title: typeof next === 'string' ? next : '',
        clientRequestId,
        pageId,
      })
      return { ok: result.ok, error: result.ok ? undefined : result.error }
    },
    onPersistedChange: () => onPersisted?.(),
  })

  return (
    <div className="flex items-center gap-2">
      <Input
        value={autosave.value}
        onChange={(e) => autosave.change(e.target.value)}
        onBlur={autosave.blur}
        readOnly={readOnly}
        className="border-0 bg-transparent px-0 text-lg font-semibold shadow-none focus-visible:ring-0"
        placeholder="Untitled"
      />
    </div>
  )
}

export function useRecordSideSheet() {
  const [openRecordId, setOpenRecordId] = useState<string | null>(null)
  return {
    openRecordId,
    open: (id: string) => setOpenRecordId(id),
    close: () => setOpenRecordId(null),
  }
}
