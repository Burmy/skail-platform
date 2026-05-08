'use client'

import { useEffect, useState } from 'react'
import { ExternalLinkIcon, LinkIcon } from 'lucide-react'
import { createReactBlockSpec } from '@blocknote/react'
import { defaultProps } from '@blocknote/core'

import { Input } from '@/components/ui/input'

export const WebBookmarkBlock = createReactBlockSpec(
  {
    type: 'web_bookmark',
    propSchema: {
      ...defaultProps,
      url: { default: '' },
      title: { default: '' },
      description: { default: '' },
      imageUrl: { default: '' },
      faviconUrl: { default: '' },
      siteName: { default: '' },
    },
    content: 'none',
  },
  {
    render: ({ block, editor }) => (
      <WebBookmarkBlockRenderer block={block} editor={editor} />
    ),
  },
)

function WebBookmarkBlockRenderer({
  block,
  editor,
}: {
  block: unknown
  editor: unknown
}) {
  const blockRef = block as { props: Record<string, unknown> }
  const editorApi = editor as {
    updateBlock: (
      block: unknown,
      update: { props: Record<string, unknown> },
    ) => void
  }
  const props = blockRef.props as {
    url: string
    title: string
    description: string
    imageUrl: string
    faviconUrl: string
    siteName: string
  }
  const [editing, setEditing] = useState(!props.url)
  const [draft, setDraft] = useState(props.url)
  const [hostname, setHostname] = useState<string | null>(null)

  useEffect(() => {
    if (!props.url) return
    try {
      setHostname(new URL(props.url).hostname)
    } catch {
      setHostname(null)
    }
  }, [props.url])

  function commit() {
    const trimmed = draft.trim()
    if (!trimmed) {
      setEditing(false)
      return
    }

    let normalized = trimmed
    if (!/^https?:\/\//i.test(normalized)) {
      normalized = `https://${normalized}`
    }

    let title = props.title
    try {
      title = new URL(normalized).hostname
    } catch {
      // Keep the existing title when the URL cannot be parsed yet.
    }

    editorApi.updateBlock(block, {
      props: { ...blockRef.props, url: normalized, title },
    })
    setEditing(false)
  }

  if (editing) {
    return (
      <div className="my-1 flex items-center gap-2 rounded-md border bg-card p-2">
        <LinkIcon className="size-3.5 text-muted-foreground" />
        <Input
          autoFocus
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          onBlur={commit}
          onKeyDown={(event) => {
            if (event.key === 'Enter') {
              event.preventDefault()
              commit()
            }
            if (event.key === 'Escape') setEditing(false)
          }}
          placeholder="Paste a URL"
          className="h-7 text-sm"
        />
      </div>
    )
  }

  return (
    <a
      href={props.url}
      target="_blank"
      rel="noopener noreferrer"
      className="my-1 flex items-center gap-3 rounded-md border bg-card p-3 transition-colors hover:bg-accent/30"
    >
      {props.imageUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={props.imageUrl}
          alt=""
          className="h-20 w-32 shrink-0 rounded-md object-cover"
          onError={(event) => {
            event.currentTarget.style.display = 'none'
          }}
        />
      ) : hostname ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={props.faviconUrl || `https://www.google.com/s2/favicons?domain=${hostname}&sz=64`}
          alt=""
          className="size-6 rounded"
          onError={(event) => {
            event.currentTarget.style.display = 'none'
          }}
        />
      ) : (
        <LinkIcon className="size-4 text-muted-foreground" />
      )}
      <span className="flex min-w-0 flex-col text-sm">
        <span className="font-medium">{props.title || hostname || props.url}</span>
        {props.description ? (
          <span className="line-clamp-2 text-xs text-muted-foreground">
            {props.description}
          </span>
        ) : null}
        <span className="truncate text-[11px] text-muted-foreground">
          {props.siteName || props.url}
        </span>
      </span>
      <ExternalLinkIcon className="ml-auto size-3.5 text-muted-foreground" />
    </a>
  )
}
