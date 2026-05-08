'use client'

import {
  useActionState,
  useMemo,
  useRef,
  useState,
  type ComponentType,
} from 'react'
import {
  AlertTriangle,
  Calendar,
  CheckSquare,
  CircleDot,
  Database,
  DollarSign,
  Hash,
  LinkIcon,
  ListChecks,
  Mail,
  MoreHorizontal,
  Paperclip,
  Phone,
  Plus,
  Save,
  Tags,
  Type,
  User,
} from 'lucide-react'

import {
  addFieldOption,
  createCollection,
  createField,
  createRecord,
  renameCollection,
  updateField,
  updateRecord,
  type PropertyActionState,
} from '@/app/databases/actions'
import {
  getRecordFieldValue,
  isOptionBackedType,
  isPropertyType,
  parseFieldOptions,
  PROPERTY_TYPE_META,
  PROPERTY_TYPES,
  type CollectionWithFieldsAndRecords,
  type PropertyType,
} from '@/lib/properties/types'
import type { CollectionField, Json } from '@/lib/supabase/database.types'
import { cn } from '@/lib/utils'
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
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Input } from '@/components/ui/input'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Textarea } from '@/components/ui/textarea'

const initialActionState: PropertyActionState = {
  status: 'idle',
}

const typeIcons: Record<PropertyType, ComponentType<{ className?: string }>> = {
  text: Type,
  long_text: Type,
  number: Hash,
  currency: DollarSign,
  select: ListChecks,
  multi_select: Tags,
  status: CircleDot,
  date: Calendar,
  checkbox: CheckSquare,
  url: LinkIcon,
  email: Mail,
  phone: Phone,
  file: Paperclip,
  person: User,
  relation: Database,
  formula_placeholder: Hash,
}

type PropertyEngineProps = {
  workspaceId: string
  collections: CollectionWithFieldsAndRecords[]
  canManageSchema: boolean
  canSeeSystemFields: boolean
}

function ActionMessage({ state }: { state: PropertyActionState }) {
  if (!state.message) {
    return null
  }

  return (
    <Alert variant={state.status === 'error' ? 'destructive' : 'default'}>
      <AlertDescription>{state.message}</AlertDescription>
    </Alert>
  )
}

function NativeSelect({
  className,
  ...props
}: React.ComponentProps<'select'>) {
  return (
    <select
      className={cn(
        'h-10 rounded-md border border-input bg-background px-3 text-sm outline-none transition-[color,box-shadow] focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50',
        className,
      )}
      {...props}
    />
  )
}

function jsonScalarToString(value: Json | undefined | null) {
  if (value === null || value === undefined) {
    return ''
  }

  if (
    typeof value === 'string' ||
    typeof value === 'number' ||
    typeof value === 'boolean'
  ) {
    return String(value)
  }

  return ''
}

function jsonArrayToStrings(value: Json | undefined | null) {
  if (!Array.isArray(value)) {
    return []
  }

  return value.flatMap((item) => (typeof item === 'string' ? [item] : []))
}

function TypeBadge({ fieldType }: { fieldType: string }) {
  if (!isPropertyType(fieldType)) {
    return <Badge variant="secondary">{fieldType}</Badge>
  }

  const Icon = typeIcons[fieldType]

  return (
    <Badge className="gap-1 font-normal" variant="secondary">
      <Icon className="size-3" />
      {PROPERTY_TYPE_META[fieldType].label}
    </Badge>
  )
}

export function PropertyEngine({
  workspaceId,
  collections,
  canManageSchema,
  canSeeSystemFields,
}: PropertyEngineProps) {
  const [selectedCollectionId, setSelectedCollectionId] = useState(
    collections[0]?.id ?? '',
  )
  const selectedCollection =
    collections.find((collection) => collection.id === selectedCollectionId) ??
    collections[0] ??
    null
  const [createCollectionState, createCollectionAction, isCreatingCollection] =
    useActionState(createCollection, initialActionState)
  const [renameState, renameAction, isRenaming] = useActionState(
    renameCollection,
    initialActionState,
  )
  const visibleRecordFields = useMemo(
    () =>
      selectedCollection?.fields.filter(
        (field) => !field.is_system && isPropertyType(field.field_type),
      ) ?? [],
    [selectedCollection],
  )

  return (
    <div className="flex min-h-[calc(100dvh-3.5rem)] flex-col lg:h-[calc(100dvh-3.5rem)] lg:min-h-0 lg:flex-row">
      <aside className="flex w-full shrink-0 flex-col border-b bg-card lg:w-72 lg:border-b-0 lg:border-r">
        <div className="border-b p-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-sm font-semibold">Collections</h2>
              <p className="text-xs text-muted-foreground">
                Workspace-scoped databases
              </p>
            </div>
            <Badge variant="outline">{collections.length}</Badge>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-3">
          {collections.length > 0 ? (
            <div className="space-y-1">
              {collections.map((collection) => (
                <button
                  className={cn(
                    'flex w-full items-center gap-3 rounded-md px-3 py-2 text-left text-sm transition-colors',
                    selectedCollection?.id === collection.id
                      ? 'bg-sidebar-accent text-sidebar-accent-foreground'
                      : 'text-muted-foreground hover:bg-sidebar-accent/50 hover:text-foreground',
                  )}
                  key={collection.id}
                  onClick={() => setSelectedCollectionId(collection.id)}
                >
                  <Database className="size-4 shrink-0" />
                  <span className="min-w-0 flex-1 truncate">
                    {collection.name}
                  </span>
                  <Badge className="font-mono text-[11px]" variant="secondary">
                    {collection.records.length}
                  </Badge>
                </button>
              ))}
            </div>
          ) : (
            <div className="rounded-md border border-dashed p-4 text-sm text-muted-foreground">
              No collections yet.
            </div>
          )}
        </div>

        {canManageSchema && (
          <form action={createCollectionAction} className="space-y-3 border-t p-4">
            <input name="workspaceId" type="hidden" value={workspaceId} />
            <Input
              aria-label="Collection name"
              name="name"
              placeholder="Collection name"
              required
            />
            <Textarea
              aria-label="Collection description"
              className="min-h-20"
              name="description"
              placeholder="Description"
            />
            <Button
              className="w-full"
              disabled={isCreatingCollection}
              type="submit"
            >
              <Plus data-icon="inline-start" />
              Create collection
            </Button>
            <ActionMessage state={createCollectionState} />
          </form>
        )}
      </aside>

      <section className="flex min-w-0 flex-1 flex-col">
        {selectedCollection ? (
          <>
            <div className="flex flex-col items-start justify-between gap-4 border-b bg-card p-4 md:flex-row md:items-center">
              <form
                action={renameAction}
                className="flex w-full min-w-0 flex-col gap-3 sm:flex-row md:flex-1"
              >
                <input name="workspaceId" type="hidden" value={workspaceId} />
                <input
                  name="collectionId"
                  type="hidden"
                  value={selectedCollection.id}
                />
                <Input
                  aria-label="Collection name"
                  className="max-w-md text-base font-semibold"
                  defaultValue={selectedCollection.name}
                  disabled={!canManageSchema}
                  name="name"
                  required
                />
                {canManageSchema && (
                  <Button disabled={isRenaming} type="submit" variant="outline">
                    <Save data-icon="inline-start" />
                    Save
                  </Button>
                )}
              </form>

              <div className="flex shrink-0 items-center gap-2">
                <Badge variant="outline">
                  {visibleRecordFields.length} fields
                </Badge>
                <Badge variant="outline">
                  {selectedCollection.records.length} records
                </Badge>
              </div>
            </div>
            <div className="border-b px-4 py-2">
              <ActionMessage state={renameState} />
            </div>

            <div className="grid min-h-0 flex-1 lg:grid-cols-[minmax(0,1fr)_360px]">
              <RecordEditor
                collection={selectedCollection}
                fields={visibleRecordFields}
                workspaceId={workspaceId}
              />
              <FieldEditorPanel
                canManageSchema={canManageSchema}
                canSeeSystemFields={canSeeSystemFields}
                collection={selectedCollection}
                workspaceId={workspaceId}
              />
            </div>
          </>
        ) : (
          <div className="flex flex-1 items-center justify-center p-8">
            <div className="max-w-md text-center">
              <Database className="mx-auto mb-4 size-10 text-muted-foreground" />
              <h2 className="text-lg font-semibold">Create a collection</h2>
              <p className="mt-2 text-sm text-muted-foreground">
                Collections define stable field IDs and hold workspace-scoped
                records.
              </p>
            </div>
          </div>
        )}
      </section>
    </div>
  )
}

function FieldEditorPanel({
  workspaceId,
  collection,
  canManageSchema,
  canSeeSystemFields,
}: {
  workspaceId: string
  collection: CollectionWithFieldsAndRecords
  canManageSchema: boolean
  canSeeSystemFields: boolean
}) {
  const [fieldType, setFieldType] = useState<PropertyType>('text')
  const [createFieldState, createFieldAction, isCreatingField] = useActionState(
    createField,
    initialActionState,
  )

  return (
    <aside className="min-h-0 border-t bg-card lg:border-l lg:border-t-0">
      <div className="border-b p-4">
        <h3 className="text-sm font-semibold">Fields</h3>
        <p className="text-xs text-muted-foreground">
          IDs stay stable when names change.
        </p>
      </div>

      <div className="h-full overflow-y-auto p-4 pb-24">
        {canManageSchema && (
          <form action={createFieldAction} className="mb-5 space-y-3">
            <input name="workspaceId" type="hidden" value={workspaceId} />
            <input name="collectionId" type="hidden" value={collection.id} />
            <Input name="name" placeholder="Field name" required />
            <NativeSelect
              name="fieldType"
              onChange={(event) =>
                setFieldType(event.target.value as PropertyType)
              }
              value={fieldType}
            >
              {PROPERTY_TYPES.map((type) => (
                <option key={type} value={type}>
                  {PROPERTY_TYPE_META[type].label}
                </option>
              ))}
            </NativeSelect>
            <Input
              name="semanticRole"
              placeholder="semantic_role, optional"
            />
            {isOptionBackedType(fieldType) && (
              <Textarea
                className="min-h-20"
                name="options"
                placeholder="Options, one per line"
              />
            )}
            <Button
              className="w-full"
              disabled={isCreatingField}
              type="submit"
            >
              <Plus data-icon="inline-start" />
              Add field
            </Button>
            <ActionMessage state={createFieldState} />
          </form>
        )}

        <div className="space-y-3">
          {collection.fields.map((field) => (
            <FieldEditor
              canManageSchema={canManageSchema}
              canSeeSystemFields={canSeeSystemFields}
              collectionId={collection.id}
              field={field}
              key={field.id}
              workspaceId={workspaceId}
            />
          ))}
        </div>
      </div>
    </aside>
  )
}

function FieldEditor({
  workspaceId,
  collectionId,
  field,
  canManageSchema,
  canSeeSystemFields,
}: {
  workspaceId: string
  collectionId: string
  field: CollectionField
  canManageSchema: boolean
  canSeeSystemFields: boolean
}) {
  const currentType = isPropertyType(field.field_type) ? field.field_type : 'text'
  const [fieldType, setFieldType] = useState<PropertyType>(currentType)
  const [updateFieldState, updateFieldAction, isUpdatingField] = useActionState(
    updateField,
    initialActionState,
  )
  const [addOptionState, addOptionAction, isAddingOption] = useActionState(
    addFieldOption,
    initialActionState,
  )
  const [warningOpen, setWarningOpen] = useState(false)
  const formRef = useRef<HTMLFormElement>(null)
  const confirmInputRef = useRef<HTMLInputElement>(null)
  const options = parseFieldOptions(field.options_json)
  const isLocked = Boolean(field.is_locked)

  if (field.is_system && !canSeeSystemFields) {
    return null
  }

  return (
    <div className="rounded-md border bg-background p-3">
      <form
        action={updateFieldAction}
        className="space-y-3"
        onSubmit={(event) => {
          if (
            fieldType !== currentType &&
            confirmInputRef.current?.value !== 'true'
          ) {
            event.preventDefault()
            setWarningOpen(true)
          }
        }}
        ref={formRef}
      >
        <input name="workspaceId" type="hidden" value={workspaceId} />
        <input name="collectionId" type="hidden" value={collectionId} />
        <input name="fieldId" type="hidden" value={field.id} />
        <input name="originalFieldType" type="hidden" value={currentType} />
        <input
          name="confirmTypeChange"
          ref={confirmInputRef}
          type="hidden"
          value="false"
        />

        <div className="flex items-start gap-2">
          <Input
            defaultValue={field.name}
            disabled={!canManageSchema || isLocked}
            name="name"
            required
          />
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                aria-label={`Show ${field.name} field details`}
                size="icon"
                type="button"
                variant="ghost"
              >
                <MoreHorizontal />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem disabled>
                ID: {field.id.slice(0, 8)}
              </DropdownMenuItem>
              {field.semantic_role && (
                <DropdownMenuItem disabled>
                  semantic_role: {field.semantic_role}
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        <div className="flex flex-wrap gap-2">
          <TypeBadge fieldType={fieldType} />
          {field.is_system && <Badge variant="outline">System</Badge>}
          {field.semantic_role && (
            <Badge variant="outline">{field.semantic_role}</Badge>
          )}
        </div>

        <NativeSelect
          className="w-full"
          disabled={!canManageSchema || isLocked}
          name="fieldType"
          onChange={(event) => {
            setFieldType(event.target.value as PropertyType)
            if (confirmInputRef.current) {
              confirmInputRef.current.value = 'false'
            }
          }}
          value={fieldType}
        >
          {PROPERTY_TYPES.map((type) => (
            <option key={type} value={type}>
              {PROPERTY_TYPE_META[type].label}
            </option>
          ))}
        </NativeSelect>

        <Input
          defaultValue={field.semantic_role ?? ''}
          disabled={!canManageSchema || isLocked}
          name="semanticRole"
          placeholder="semantic_role"
        />

        <label className="flex items-center gap-2 text-sm text-muted-foreground">
          <input
            defaultChecked={Boolean(field.is_required)}
            disabled={!canManageSchema || isLocked}
            name="isRequired"
            type="checkbox"
          />
          Required
        </label>

        {canManageSchema && !isLocked && (
          <Button disabled={isUpdatingField} size="sm" type="submit">
            <Save data-icon="inline-start" />
            Save field
          </Button>
        )}

        <ActionMessage state={updateFieldState} />
      </form>

      {isOptionBackedType(fieldType) && (
        <div className="mt-3 space-y-3 border-t pt-3">
          <div className="flex flex-wrap gap-2">
            {options.length > 0 ? (
              options.map((option) => (
                <Badge className="font-normal" key={option.id} variant="secondary">
                  {option.label}
                </Badge>
              ))
            ) : (
              <span className="text-xs text-muted-foreground">
                No options yet.
              </span>
            )}
          </div>
          {canManageSchema && !isLocked && (
            <form action={addOptionAction} className="flex gap-2">
              <input name="workspaceId" type="hidden" value={workspaceId} />
              <input name="collectionId" type="hidden" value={collectionId} />
              <input name="fieldId" type="hidden" value={field.id} />
              <Input
                aria-label={`Add option to ${field.name}`}
                name="optionLabel"
                placeholder="Add option"
              />
              <Button
                aria-label={`Add option to ${field.name}`}
                disabled={isAddingOption}
                size="icon"
                type="submit"
              >
                <Plus />
              </Button>
            </form>
          )}
          <ActionMessage state={addOptionState} />
        </div>
      )}

      <AlertDialog onOpenChange={setWarningOpen} open={warningOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="size-5 text-warning" />
              Change field type?
            </AlertDialogTitle>
            <AlertDialogDescription>
              Existing record values keep their stable field ID, but changing
              the type can make saved values render differently. Review affected
              records before using this in production.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (confirmInputRef.current) {
                  confirmInputRef.current.value = 'true'
                }

                formRef.current?.requestSubmit()
              }}
            >
              Confirm change
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

function RecordEditor({
  workspaceId,
  collection,
  fields,
}: {
  workspaceId: string
  collection: CollectionWithFieldsAndRecords
  fields: CollectionField[]
}) {
  return (
    <div className="min-w-0 overflow-auto p-4 lg:p-5">
      <div className="hidden">
        {collection.records.map((record) => (
          <form action={updateRecord} id={`record-form-${record.id}`} key={record.id}>
            <input name="workspaceId" type="hidden" value={workspaceId} />
            <input name="collectionId" type="hidden" value={collection.id} />
            <input name="recordId" type="hidden" value={record.id} />
          </form>
        ))}
      </div>
      <div className="rounded-md border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="min-w-56">Title</TableHead>
              {fields.map((field) => (
                <TableHead className="min-w-48" key={field.id}>
                  <div className="flex items-center gap-2">
                    <FieldIcon fieldType={field.field_type} />
                    <span>{field.name}</span>
                  </div>
                </TableHead>
              ))}
              <TableHead className="w-24">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {collection.records.map((record) => (
              <TableRow key={record.id}>
                <TableCell>
                  <Input
                    aria-label="Record title"
                    defaultValue={record.title ?? ''}
                    form={`record-form-${record.id}`}
                    name="title"
                  />
                </TableCell>
                {fields.map((field) => (
                  <TableCell key={field.id}>
                    <RecordFieldInput
                      field={field}
                      formId={`record-form-${record.id}`}
                      value={getRecordFieldValue(record, field.id)}
                    />
                  </TableCell>
                ))}
                <TableCell>
                  <Button
                    form={`record-form-${record.id}`}
                    size="sm"
                    type="submit"
                    variant="outline"
                  >
                    <Save data-icon="inline-start" />
                    Save
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>

        {collection.records.length === 0 && (
          <div className="border-t p-6 text-center text-sm text-muted-foreground">
            No records yet.
          </div>
        )}
      </div>

      <Dialog>
        <DialogTrigger asChild>
          <Button className="mt-4" variant="outline">
            <Plus data-icon="inline-start" />
            Add record
          </Button>
        </DialogTrigger>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Create record</DialogTitle>
            <DialogDescription>
              Values are stored by stable field ID, so field renames do not move
              data.
            </DialogDescription>
          </DialogHeader>
          <form action={createRecord} className="space-y-4">
            <input name="workspaceId" type="hidden" value={workspaceId} />
            <input name="collectionId" type="hidden" value={collection.id} />
            <div className="space-y-2">
              <label className="text-sm font-medium" htmlFor="record-title">
                Title
              </label>
              <Input id="record-title" name="title" placeholder="Untitled" />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              {fields.map((field) => (
                <div className="space-y-2" key={field.id}>
                  <label className="text-sm font-medium" htmlFor={field.id}>
                    {field.name}
                  </label>
                  <RecordFieldInput field={field} id={field.id} value={null} />
                </div>
              ))}
            </div>
            <Button type="submit">
              <Plus data-icon="inline-start" />
              Create record
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}

function FieldIcon({ fieldType }: { fieldType: string }) {
  if (!isPropertyType(fieldType)) {
    return <Type className="size-4 text-muted-foreground" />
  }

  const Icon = typeIcons[fieldType]

  return <Icon className="size-4 text-muted-foreground" />
}

function RecordFieldInput({
  field,
  value,
  id,
  formId,
}: {
  field: CollectionField
  value: Json | null
  id?: string
  formId?: string
}) {
  const name = `field:${field.id}`
  const fieldType = isPropertyType(field.field_type) ? field.field_type : 'text'
  const options = parseFieldOptions(field.options_json)
  const scalarValue = jsonScalarToString(value)

  if (fieldType === 'long_text') {
    return (
      <Textarea
        className="min-h-20"
        defaultValue={scalarValue}
        form={formId}
        id={id}
        name={name}
      />
    )
  }

  if (fieldType === 'number' || fieldType === 'currency') {
    return (
      <Input
        defaultValue={scalarValue}
        form={formId}
        id={id}
        name={name}
        step={fieldType === 'currency' ? '0.01' : 'any'}
        type="number"
      />
    )
  }

  if (fieldType === 'checkbox') {
    return (
      <label className="flex items-center gap-2 text-sm text-muted-foreground">
        <input
          defaultChecked={value === true}
          form={formId}
          id={id}
          name={name}
          type="checkbox"
        />
        Checked
      </label>
    )
  }

  if (fieldType === 'select' || fieldType === 'status') {
    return (
      <NativeSelect defaultValue={scalarValue} form={formId} id={id} name={name}>
        <option value="">None</option>
        {options.map((option) => (
          <option key={option.id} value={option.id}>
            {option.label}
          </option>
        ))}
      </NativeSelect>
    )
  }

  if (fieldType === 'multi_select') {
    const selectedValues = jsonArrayToStrings(value)

    return (
      <div className="flex flex-wrap gap-2">
        {options.length > 0 ? (
          options.map((option) => (
            <label
              className="flex items-center gap-2 rounded-md border px-2 py-1 text-xs"
              key={option.id}
            >
              <input
                defaultChecked={selectedValues.includes(option.id)}
                form={formId}
                name={name}
                type="checkbox"
                value={option.id}
              />
              {option.label}
            </label>
          ))
        ) : (
          <span className="text-xs text-muted-foreground">No options</span>
        )}
      </div>
    )
  }

  if (fieldType === 'date') {
    return (
      <Input
        defaultValue={scalarValue}
        form={formId}
        id={id}
        name={name}
        type="date"
      />
    )
  }

  if (fieldType === 'email') {
    return (
      <Input
        defaultValue={scalarValue}
        form={formId}
        id={id}
        name={name}
        type="email"
      />
    )
  }

  if (fieldType === 'url') {
    return (
      <Input
        defaultValue={scalarValue}
        form={formId}
        id={id}
        name={name}
        type="url"
      />
    )
  }

  if (fieldType === 'phone') {
    return (
      <Input
        defaultValue={scalarValue}
        form={formId}
        id={id}
        name={name}
        type="tel"
      />
    )
  }

  if (fieldType === 'formula_placeholder') {
    return (
      <Input
        disabled
        id={id}
        placeholder="Calculated later"
        readOnly
        value="Formula placeholder"
      />
    )
  }

  return <Input defaultValue={scalarValue} form={formId} id={id} name={name} />
}
