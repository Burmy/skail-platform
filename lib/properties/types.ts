import type { Collection, CollectionField, CollectionRecord, Json } from '@/lib/supabase/database.types'

export const PROPERTY_TYPES = [
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
  'formula_placeholder',
] as const

export type PropertyType = (typeof PROPERTY_TYPES)[number]

export const TEXT_SHAPED_TYPES: readonly PropertyType[] = [
  'text',
  'long_text',
  'url',
  'email',
  'phone',
] as const

export function isTextShapedType(value: PropertyType) {
  return TEXT_SHAPED_TYPES.includes(value)
}

export function normalizePropertyType(value: PropertyType): PropertyType {
  return value === 'formula_placeholder' ? 'formula' : value
}

export type FieldOption = {
  id: string
  label: string
  color?: string
}

export type FieldOptionsJson = {
  options?: FieldOption[]
}

export type RecordValueJson = {
  value?: Json
}

export type CollectionRecordWithValues = CollectionRecord & {
  values: Record<string, Json>
}

export type CollectionWithFieldsAndRecords = Collection & {
  fields: CollectionField[]
  records: CollectionRecordWithValues[]
}

export const PROPERTY_TYPE_META: Record<
  PropertyType,
  {
    label: string
    description: string
    optionBacked?: boolean
  }
> = {
  text: {
    label: 'Text',
    description: 'Short plain text.',
  },
  long_text: {
    label: 'Long text',
    description: 'Paragraph notes or descriptions.',
  },
  number: {
    label: 'Number',
    description: 'Numeric values without currency formatting.',
  },
  currency: {
    label: 'Currency',
    description: 'Money amounts stored as numbers.',
  },
  select: {
    label: 'Select',
    description: 'Single choice from configured options.',
    optionBacked: true,
  },
  multi_select: {
    label: 'Multi-select',
    description: 'Multiple choices from configured options.',
    optionBacked: true,
  },
  status: {
    label: 'Status',
    description: 'Single workflow status option.',
    optionBacked: true,
  },
  date: {
    label: 'Date',
    description: 'Calendar date.',
  },
  checkbox: {
    label: 'Checkbox',
    description: 'True or false value.',
  },
  url: {
    label: 'URL',
    description: 'Website or document link.',
  },
  email: {
    label: 'Email',
    description: 'Email address.',
  },
  phone: {
    label: 'Phone',
    description: 'Phone number.',
  },
  file: {
    label: 'File',
    description: 'File reference placeholder for V1.',
  },
  person: {
    label: 'Person',
    description: 'Workspace person reference placeholder for V1.',
  },
  relation: {
    label: 'Relation',
    description: 'Related record reference placeholder for V1.',
  },
  formula: {
    label: 'Formula',
    description: 'Calculated value derived from other fields.',
  },
  location: {
    label: 'Location',
    description: 'Address with latitude and longitude.',
  },
  formula_placeholder: {
    label: 'Formula placeholder',
    description: 'Legacy slot; treated as formula at runtime.',
  },
}

export type LocationValue = {
  address: string
  lat: number
  lng: number
  provider?: 'osm'
}

export type FileValueItem = {
  id: string
  source: 'upload' | 'external_link'
  filename: string
  mimeType?: string
  sizeBytes?: number
  storagePath?: string
  externalUrl?: string
}

export type CellOptimisticState = {
  fieldId: string
  state: 'idle' | 'saving' | 'saved' | 'error'
  clientRequestId: string
  errorMessage?: string
}

export type CollectionRecordWithSaveState = CollectionRecordWithValues & {
  optimisticState?: CellOptimisticState[]
}

export const OPTION_BACKED_TYPES = PROPERTY_TYPES.filter(
  (type) => PROPERTY_TYPE_META[type].optionBacked,
)

export function isPropertyType(value: string): value is PropertyType {
  return PROPERTY_TYPES.includes(value as PropertyType)
}

export function isOptionBackedType(value: string) {
  return OPTION_BACKED_TYPES.includes(value as PropertyType)
}

export function parseFieldOptions(optionsJson: Json | null): FieldOption[] {
  if (!optionsJson || typeof optionsJson !== 'object' || Array.isArray(optionsJson)) {
    return []
  }

  const maybeOptions = optionsJson.options

  if (!Array.isArray(maybeOptions)) {
    return []
  }

  return maybeOptions.flatMap((option) => {
    if (!option || typeof option !== 'object' || Array.isArray(option)) {
      return []
    }

    const id = option.id
    const label = option.label
    const color = option.color

    if (typeof id !== 'string' || typeof label !== 'string') {
      return []
    }

    return [
      {
        id,
        label,
        color: typeof color === 'string' ? color : undefined,
      },
    ]
  })
}

export function buildFieldOptions(labels: string[]): FieldOptionsJson {
  const seen = new Set<string>()
  const options = labels.flatMap((label) => {
    const trimmedLabel = label.trim()
    const key = trimmedLabel.toLowerCase()

    if (!trimmedLabel || seen.has(key)) {
      return []
    }

    seen.add(key)

    return [
      {
        id: crypto.randomUUID(),
        label: trimmedLabel,
      },
    ]
  })

  return { options }
}

export function getRecordFieldValue(
  record: CollectionRecordWithValues,
  fieldId: string,
) {
  const value = record.values[fieldId]

  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return null
  }

  return value.value ?? null
}
