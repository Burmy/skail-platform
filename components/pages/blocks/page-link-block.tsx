'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { FileTextIcon } from 'lucide-react'
import { createReactBlockSpec } from '@blocknote/react'
import { defaultProps } from '@blocknote/core'

import { cn } from '@/lib/utils'

export const PageLinkBlock = createReactBlockSpec(
  {
    type: 'page_link',
    propSchema: {
      ...defaultProps,
      pageId: { default: '' },
      workspaceId: { default: '' },
    },
    content: 'none',
  },
  {
    render: ({ block }) => <PageLinkBlockRenderer block={block} />,
  },
)

function PageLinkBlockRenderer({
  block,
}: {
  block: { props: Record<string, unknown> }
}) {
  const props = block.props as { pageId: string; workspaceId: string }
  const [data, setData] = useState<{
    title: string
    icon: string | null
  } | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!props.pageId) return
    let cancelled = false
    fetch(
      `/api/pages/info?workspaceId=${encodeURIComponent(
        props.workspaceId,
      )}&pageId=${encodeURIComponent(props.pageId)}`,
    )
      .then((response) => response.json())
      .then((json) => {
        if (cancelled) return
        if (json.error) setError(json.error)
        else setData({ title: json.title, icon: json.icon ?? null })
      })
      .catch((fetchError) => !cancelled && setError(String(fetchError)))
    return () => {
      cancelled = true
    }
  }, [props.pageId, props.workspaceId])

  if (!props.pageId) {
    return (
      <span className="text-xs text-muted-foreground">
        Pick a page to link.
      </span>
    )
  }

  if (error) {
    return (
      <span className="text-xs text-destructive">Could not load page.</span>
    )
  }

  return (
    <Link
      href={`/p/${props.pageId}`}
      className={cn(
        'my-1 inline-flex items-center gap-1.5 rounded-md border bg-card px-2 py-1 text-sm hover:bg-accent/40',
      )}
    >
      {data?.icon ? (
        <span className="text-base leading-none">{data.icon}</span>
      ) : (
        <FileTextIcon className="size-3.5 text-muted-foreground" />
      )}
      <span className="truncate">{data?.title ?? 'Loading...'}</span>
    </Link>
  )
}
