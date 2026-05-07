import type { Json } from '@/lib/supabase/database.types'

export function toJson(value: unknown): Json {
  return JSON.parse(JSON.stringify(value)) as Json
}

export function objectValue(value: unknown) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return {}
  }

  return value as Record<string, unknown>
}

export function stringValue(
  object: Record<string, unknown>,
  keys: string[],
  fallback = '',
) {
  for (const key of keys) {
    const value = object[key]

    if (typeof value === 'string' && value.trim() !== '') {
      return value.trim()
    }
  }

  return fallback
}

export function booleanValue(object: Record<string, unknown>, key: string) {
  return object[key] === true
}

export function stringList(value: unknown) {
  if (!Array.isArray(value)) {
    return []
  }

  return value.flatMap((item) => {
    if (typeof item === 'string' && item.trim()) {
      return [item.trim()]
    }

    if (item && typeof item === 'object' && !Array.isArray(item)) {
      const label = (item as Record<string, unknown>).label

      return typeof label === 'string' && label.trim() ? [label.trim()] : []
    }

    return []
  })
}
