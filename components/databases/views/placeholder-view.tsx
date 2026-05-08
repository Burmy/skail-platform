'use client'

import { LayersIcon } from 'lucide-react'

import { Empty, EmptyDescription, EmptyHeader, EmptyTitle } from '@/components/ui/empty'
import type { SavedViewType } from '@/lib/views/types'
import { VIEW_TYPE_META } from '@/lib/views/types'

const PHASE_BY_TYPE: Record<SavedViewType, string> = {
  table: 'Available now',
  kanban: 'Phase 2',
  gallery: 'Phase 2',
  list: 'Phase 2',
  calendar: 'Phase 2',
  timeline: 'Phase 2',
  chart: 'Phase 2',
  dashboard: 'Phase 2',
  map: 'Phase 3',
  form: 'Phase 2',
}

export function PlaceholderView({ viewType }: { viewType: SavedViewType }) {
  const meta = VIEW_TYPE_META[viewType]
  const phase = PHASE_BY_TYPE[viewType]
  return (
    <div className="flex h-full items-center justify-center p-8">
      <Empty>
        <EmptyHeader>
          <LayersIcon className="size-6 text-muted-foreground" />
          <EmptyTitle>{meta.label} view</EmptyTitle>
          <EmptyDescription>
            {meta.description} Lands in {phase}. Switch to a Table view to keep editing.
          </EmptyDescription>
        </EmptyHeader>
      </Empty>
    </div>
  )
}
