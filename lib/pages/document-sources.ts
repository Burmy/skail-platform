import type { Json } from '@/lib/supabase/database.types'

type DatabaseBlockProps = {
  sourceType?: unknown
  sourceId?: unknown
  collectionId?: unknown
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value)
}

function blockReferencesSource(
  value: unknown,
  collectionId: string,
  viewId?: string | null,
): boolean {
  if (!isRecord(value)) return false

  const type = value.type
  const props = isRecord(value.props) ? (value.props as DatabaseBlockProps) : null

  if (type === 'database_view' && props) {
    const blockCollectionId =
      typeof props.collectionId === 'string' ? props.collectionId : null
    const blockSourceId =
      typeof props.sourceId === 'string' ? props.sourceId : null
    const blockSourceType =
      typeof props.sourceType === 'string' ? props.sourceType : null

    if (blockCollectionId === collectionId) {
      if (!viewId) return true
      if (blockSourceType === 'view' && blockSourceId === viewId) return true
    }
  }

  for (const child of Object.values(value)) {
    if (Array.isArray(child)) {
      if (child.some((item) => blockReferencesSource(item, collectionId, viewId))) {
        return true
      }
      continue
    }

    if (isRecord(child) && blockReferencesSource(child, collectionId, viewId)) {
      return true
    }
  }

  return false
}

export function pageDocumentReferencesSource(
  contentJson: Json | unknown,
  collectionId: string,
  viewId?: string | null,
) {
  return blockReferencesSource(contentJson, collectionId, viewId)
}
