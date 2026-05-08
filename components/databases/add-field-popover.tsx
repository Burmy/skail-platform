'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import {
  CalendarIcon,
  CheckSquareIcon,
  CircleDotIcon,
  DollarSignIcon,
  FileIcon,
  FunctionSquareIcon,
  HashIcon,
  LinkIcon,
  ListChecksIcon,
  MailIcon,
  MapPinIcon,
  PhoneIcon,
  PlusIcon,
  TextIcon,
  UserIcon,
  WrapTextIcon,
} from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { createField } from '@/app/databases/actions'
import { PROPERTY_TYPE_META, type PropertyType } from '@/lib/properties/types'

const TYPE_ICONS: Partial<Record<PropertyType, typeof TextIcon>> = {
  text: TextIcon,
  long_text: WrapTextIcon,
  number: HashIcon,
  currency: DollarSignIcon,
  select: CircleDotIcon,
  multi_select: ListChecksIcon,
  status: CircleDotIcon,
  date: CalendarIcon,
  checkbox: CheckSquareIcon,
  url: LinkIcon,
  email: MailIcon,
  phone: PhoneIcon,
  file: FileIcon,
  person: UserIcon,
  relation: LinkIcon,
  formula: FunctionSquareIcon,
  location: MapPinIcon,
}

const PICKABLE_TYPES: PropertyType[] = [
  'text',
  'long_text',
  'number',
  'currency',
  'select',
  'multi_select',
  'status',
  'date',
  'checkbox',
  'url',
  'email',
  'phone',
  'file',
  'person',
  'relation',
  'formula',
  'location',
]

export type AddFieldPopoverProps = {
  workspaceId: string
  collectionId: string
  align?: 'start' | 'end' | 'center'
}

export function AddFieldPopover(props: AddFieldPopoverProps) {
  const { workspaceId, collectionId, align = 'start' } = props
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [name, setName] = useState('')
  const [type, setType] = useState<PropertyType>('text')
  const [pending, startTransition] = useTransition()

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          size="icon"
          variant="ghost"
          className="size-7"
          aria-label="Add property"
        >
          <PlusIcon className="size-3.5" />
        </Button>
      </PopoverTrigger>
      <PopoverContent align={align} className="w-72 p-2.5">
        <form
          onSubmit={(e) => {
            e.preventDefault()
            const finalName = name.trim() || PROPERTY_TYPE_META[type].label
            // Close immediately so the popover doesn't hang while the server writes.
            setOpen(false)
            setName('')
            startTransition(async () => {
              const formData = new FormData()
              formData.set('workspaceId', workspaceId)
              formData.set('collectionId', collectionId)
              formData.set('name', finalName)
              formData.set('fieldType', type)
              formData.set('semanticRole', '')
              formData.set('options', '')
              const result = await createField({ status: 'idle' }, formData)
              if (result.status === 'success') {
                router.refresh()
              }
            })
          }}
          className="flex flex-col gap-2"
        >
          <div className="flex flex-col gap-1.5">
            <span className="text-xs font-medium text-muted-foreground">Type</span>
            <div className="grid max-h-56 grid-cols-2 gap-1 overflow-y-auto pr-1">
              {PICKABLE_TYPES.map((t) => {
                const Icon = TYPE_ICONS[t] ?? TextIcon
                return (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setType(t)}
                    className={
                      'flex items-center gap-1.5 rounded-sm px-1.5 py-1.5 text-left text-xs transition-colors ' +
                      (t === type
                        ? 'bg-accent'
                        : 'text-muted-foreground hover:bg-accent/40 hover:text-foreground')
                    }
                  >
                    <Icon className="size-3.5" />
                    <span>{PROPERTY_TYPE_META[t].label}</span>
                  </button>
                )
              })}
            </div>
          </div>
          <div className="flex flex-col gap-1">
            <label htmlFor="add-field-name" className="text-xs font-medium text-muted-foreground">
              Name
            </label>
            <Input
              id="add-field-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={PROPERTY_TYPE_META[type].label}
              maxLength={80}
              autoFocus
            />
          </div>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="ghost" size="sm" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" size="sm" disabled={pending}>
              {pending ? 'Adding…' : 'Add property'}
            </Button>
          </div>
        </form>
      </PopoverContent>
    </Popover>
  )
}
