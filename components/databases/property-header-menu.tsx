'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import {
  ArchiveIcon,
  ArrowDownAZIcon,
  ArrowUpAZIcon,
  ChevronDownIcon,
  EyeOffIcon,
  PencilIcon,
  TypeIcon,
} from 'lucide-react'

import { cn } from '@/lib/utils'
import { Input } from '@/components/ui/input'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
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
import {
  archiveField,
  updateField,
  updateViewFieldLayout,
  updateViewSorts,
} from '@/app/databases/actions'
import {
  PROPERTY_TYPES,
  PROPERTY_TYPE_META,
  type PropertyType,
} from '@/lib/properties/types'
import type { CollectionFieldWithType } from '@/lib/databases/queries'
import type { ViewConfig, ViewSort } from '@/lib/views/types'

export type PropertyHeaderMenuProps = {
  workspaceId: string
  viewId: string
  field: CollectionFieldWithType
  viewConfig: ViewConfig
  canManageSchema: boolean
  onStartRename?: () => void
  onArchiveField?: (field: CollectionFieldWithType) => void
}

export function PropertyHeaderMenu(props: PropertyHeaderMenuProps) {
  const {
    workspaceId,
    viewId,
    field,
    viewConfig,
    canManageSchema,
    onStartRename,
    onArchiveField,
  } = props
  const router = useRouter()
  const [, startTransition] = useTransition()
  const [renameOpen, setRenameOpen] = useState(false)
  const [name, setName] = useState(field.name)
  const [typeChangeTarget, setTypeChangeTarget] = useState<PropertyType | null>(null)
  const [archiveConfirm, setArchiveConfirm] = useState(false)
  const [typePickerOpen, setTypePickerOpen] = useState(false)

  const isLocked = field.is_locked
  const isTitle = field.semantic_role === 'title'
  const sortDirection = viewConfig.sorts.find((s) => s.fieldId === field.id)?.direction ?? null

  function handleSort(direction: 'asc' | 'desc') {
    const filtered = viewConfig.sorts.filter((s) => s.fieldId !== field.id)
    const next: ViewSort[] = [
      ...filtered,
      { id: crypto.randomUUID(), fieldId: field.id, direction },
    ]
    startTransition(async () => {
      await updateViewSorts({ workspaceId, viewId, sorts: next })
      router.refresh()
    })
  }

  function handleHide() {
    const nextVisible = viewConfig.visibleFieldIds.filter((id) => id !== field.id)
    startTransition(async () => {
      await updateViewFieldLayout({
        workspaceId,
        viewId,
        visibleFieldIds: nextVisible,
        fieldOrder: viewConfig.fieldOrder,
      })
      router.refresh()
    })
  }

  function handleRename() {
    if (name.trim() === '' || name === field.name) {
      setRenameOpen(false)
      setName(field.name)
      return
    }
    startTransition(async () => {
      const formData = new FormData()
      formData.set('workspaceId', workspaceId)
      formData.set('collectionId', field.collection_id!)
      formData.set('fieldId', field.id)
      formData.set('name', name.trim())
      formData.set('fieldType', field.field_type)
      formData.set('originalFieldType', field.field_type)
      formData.set('confirmTypeChange', 'false')
      formData.set('semanticRole', field.semantic_role ?? '')
      formData.set('isRequired', field.is_required ? 'on' : 'off')
      await updateField({ status: 'idle' }, formData)
      setRenameOpen(false)
      router.refresh()
    })
  }

  function handleTypeChange(targetType: PropertyType) {
    startTransition(async () => {
      const formData = new FormData()
      formData.set('workspaceId', workspaceId)
      formData.set('collectionId', field.collection_id!)
      formData.set('fieldId', field.id)
      formData.set('name', field.name)
      formData.set('fieldType', targetType)
      formData.set('originalFieldType', field.field_type)
      formData.set('confirmTypeChange', 'true')
      formData.set('semanticRole', field.semantic_role ?? '')
      formData.set('isRequired', field.is_required ? 'on' : 'off')
      await updateField({ status: 'idle' }, formData)
      setTypeChangeTarget(null)
      router.refresh()
    })
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            type="button"
            className={cn(
              'inline-flex h-6 items-center gap-1 rounded-sm px-1 text-left text-xs font-medium text-muted-foreground transition-colors hover:bg-accent/40 hover:text-foreground',
            )}
          >
            {sortDirection === 'asc' ? (
              <ArrowUpAZIcon className="size-3" />
            ) : sortDirection === 'desc' ? (
              <ArrowDownAZIcon className="size-3" />
            ) : null}
            <ChevronDownIcon className="size-3" />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-56">
          <DropdownMenuLabel className="text-xs uppercase tracking-wide text-muted-foreground">
            {field.name}
          </DropdownMenuLabel>
          {canManageSchema && !isLocked ? (
            <DropdownMenuItem
              onSelect={(e) => {
                e.preventDefault()
                if (onStartRename) {
                  onStartRename()
                } else {
                  setRenameOpen(true)
                }
              }}
            >
              <PencilIcon className="size-3.5" />
              Rename
            </DropdownMenuItem>
          ) : null}
          {canManageSchema && !isLocked && !isTitle ? (
            <DropdownMenuItem
              onSelect={(e) => {
                e.preventDefault()
                setTypePickerOpen(true)
              }}
            >
              <TypeIcon className="size-3.5" />
              Change type
              <span className="ml-auto text-xs text-muted-foreground">
                {PROPERTY_TYPE_META[field.field_type as PropertyType]?.label ??
                  field.field_type}
              </span>
            </DropdownMenuItem>
          ) : null}
          <DropdownMenuSeparator />
          <DropdownMenuItem onSelect={() => handleSort('asc')}>
            <ArrowUpAZIcon className="size-3.5" />
            Sort ascending
          </DropdownMenuItem>
          <DropdownMenuItem onSelect={() => handleSort('desc')}>
            <ArrowDownAZIcon className="size-3.5" />
            Sort descending
          </DropdownMenuItem>
          {!isTitle ? (
            <DropdownMenuItem onSelect={handleHide}>
              <EyeOffIcon className="size-3.5" />
              Hide in view
            </DropdownMenuItem>
          ) : null}
          {canManageSchema && !isLocked && !isTitle ? (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                className="text-destructive focus:text-destructive"
                onSelect={(e) => {
                  e.preventDefault()
                  if (onArchiveField) {
                    onArchiveField(field)
                    return
                  }
                  setArchiveConfirm(true)
                }}
              >
                <ArchiveIcon className="size-3.5" />
                Archive property
              </DropdownMenuItem>
            </>
          ) : null}
        </DropdownMenuContent>
      </DropdownMenu>

      {typePickerOpen ? (
        <div
          role="dialog"
          aria-label="Change property type"
          className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/30 p-4"
          onClick={(e) => {
            if (e.target === e.currentTarget) setTypePickerOpen(false)
          }}
        >
          <div className="w-full max-w-md rounded-md border bg-popover p-3 shadow-lg">
            <div className="flex items-center justify-between gap-2">
              <span className="text-sm font-medium">Change property type</span>
              <button
                type="button"
                onClick={() => setTypePickerOpen(false)}
                className="text-xs text-muted-foreground hover:text-foreground"
              >
                Close
              </button>
            </div>
            <div className="mt-3 grid grid-cols-2 gap-1 max-h-[60vh] overflow-y-auto">
              {PROPERTY_TYPES.filter((t) => t !== 'formula_placeholder').map(
                (t) => {
                  const isCurrent = t === field.field_type
                  return (
                    <button
                      key={t}
                      type="button"
                      disabled={isCurrent}
                      className={cn(
                        'flex flex-col items-start gap-0.5 rounded-md border px-2 py-2 text-left text-sm transition-colors',
                        isCurrent
                          ? 'border-foreground bg-accent'
                          : 'border-border hover:bg-accent/50',
                      )}
                      onClick={() => {
                        setTypePickerOpen(false)
                        setTypeChangeTarget(t)
                      }}
                    >
                      <span className="font-medium">
                        {PROPERTY_TYPE_META[t].label}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {PROPERTY_TYPE_META[t].description}
                      </span>
                      {isCurrent ? (
                        <span className="text-[10px] uppercase tracking-wide text-muted-foreground">
                          current
                        </span>
                      ) : null}
                    </button>
                  )
                },
              )}
            </div>
          </div>
        </div>
      ) : null}

      {renameOpen && !onStartRename ? (
        <div
          className="fixed left-1/2 top-1/3 z-50 w-72 -translate-x-1/2 rounded-md border bg-popover p-2 shadow-lg"
          role="dialog"
        >
          <div className="flex flex-col gap-2">
            <Input
              autoFocus
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={80}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleRename()
                if (e.key === 'Escape') {
                  setRenameOpen(false)
                  setName(field.name)
                }
              }}
              onBlur={handleRename}
            />
          </div>
        </div>
      ) : null}

      <AlertDialog
        open={typeChangeTarget !== null}
        onOpenChange={(o) => !o && setTypeChangeTarget(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              Change type to {typeChangeTarget ? PROPERTY_TYPE_META[typeChangeTarget].label : ''}?
            </AlertDialogTitle>
            <AlertDialogDescription>
              Existing values may not display correctly under the new type. The change is
              reversible — you can change the type back at any time.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault()
                if (typeChangeTarget) handleTypeChange(typeChangeTarget)
              }}
            >
              Change type
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={archiveConfirm} onOpenChange={setArchiveConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Archive this property?</AlertDialogTitle>
            <AlertDialogDescription>
              The column will disappear from views. Existing values are preserved and the
              property can be restored from the archive drawer.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault()
                startTransition(async () => {
                  await archiveField({ workspaceId, fieldId: field.id })
                  setArchiveConfirm(false)
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
