'use client'

import { useEffect, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { LayoutTemplateIcon, SaveIcon } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  applyDashboardTemplate,
  listDashboardTemplates,
  saveDashboardTemplate,
} from '@/app/databases/actions'
import type { DashboardBlock } from '@/lib/views/types'

export type DashboardTemplatesPopoverProps = {
  workspaceId: string
  viewId: string
  currentBlocks: DashboardBlock[]
}

type Template = {
  id: string
  name: string
  description: string | null
  blocks: DashboardBlock[]
}

export function DashboardTemplatesPopover(props: DashboardTemplatesPopoverProps) {
  const { workspaceId, viewId, currentBlocks } = props
  const router = useRouter()
  const [, startTransition] = useTransition()
  const [open, setOpen] = useState(false)
  const [templates, setTemplates] = useState<Template[]>([])
  const [loading, setLoading] = useState(false)
  const [saveName, setSaveName] = useState('')
  const [saveDescription, setSaveDescription] = useState('')

  async function refresh() {
    setLoading(true)
    const result = await listDashboardTemplates({ workspaceId })
    setLoading(false)
    if (result.ok && result.data) {
      setTemplates(result.data.templates)
    }
  }

  useEffect(() => {
    if (open) void refresh()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  function applyTemplate(template: Template) {
    startTransition(async () => {
      await applyDashboardTemplate({
        workspaceId,
        viewId,
        inlineBlocks: template.blocks,
      })
      setOpen(false)
      router.refresh()
    })
  }

  function saveCurrent() {
    const trimmed = saveName.trim()
    if (!trimmed) return
    startTransition(async () => {
      const result = await saveDashboardTemplate({
        workspaceId,
        name: trimmed,
        description: saveDescription.trim() || undefined,
        blocks: currentBlocks,
      })
      if (result.ok) {
        setSaveName('')
        setSaveDescription('')
        await refresh()
      }
    })
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button size="sm" variant="ghost" className="gap-1">
          <LayoutTemplateIcon className="size-3.5" />
          <span className="text-xs">Templates</span>
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80 p-2">
        <Tabs defaultValue="apply">
          <TabsList className="w-full">
            <TabsTrigger value="apply" className="flex-1">
              Apply
            </TabsTrigger>
            <TabsTrigger value="save" className="flex-1">
              Save current
            </TabsTrigger>
          </TabsList>
          <TabsContent value="apply" className="mt-2">
            {loading ? (
              <p className="px-2 py-3 text-xs text-muted-foreground">Loading…</p>
            ) : templates.length === 0 ? (
              <p className="px-2 py-3 text-xs text-muted-foreground">
                No templates yet. Switch to “Save current” to create one.
              </p>
            ) : (
              <ul className="flex max-h-64 flex-col gap-1 overflow-y-auto">
                {templates.map((template) => (
                  <li
                    key={template.id}
                    className="flex items-center justify-between gap-2 rounded-sm border px-2 py-1.5"
                  >
                    <div className="flex flex-col">
                      <span className="text-sm font-medium">{template.name}</span>
                      {template.description ? (
                        <span className="text-xs text-muted-foreground">
                          {template.description}
                        </span>
                      ) : null}
                      <span className="text-[10px] text-muted-foreground">
                        {template.blocks.length} block
                        {template.blocks.length === 1 ? '' : 's'}
                      </span>
                    </div>
                    <Button size="sm" onClick={() => applyTemplate(template)}>
                      Apply
                    </Button>
                  </li>
                ))}
              </ul>
            )}
          </TabsContent>
          <TabsContent value="save" className="mt-2">
            <div className="flex flex-col gap-2">
              <label className="text-xs font-medium">Template name</label>
              <Input
                value={saveName}
                onChange={(e) => setSaveName(e.target.value)}
                placeholder="e.g. Sales overview"
                maxLength={80}
              />
              <label className="text-xs font-medium">Description (optional)</label>
              <Textarea
                value={saveDescription}
                onChange={(e) => setSaveDescription(e.target.value)}
                rows={2}
                maxLength={400}
              />
              <Button size="sm" onClick={saveCurrent} disabled={!saveName.trim()} className="gap-1.5">
                <SaveIcon className="size-3.5" />
                Save template
              </Button>
            </div>
          </TabsContent>
        </Tabs>
      </PopoverContent>
    </Popover>
  )
}
