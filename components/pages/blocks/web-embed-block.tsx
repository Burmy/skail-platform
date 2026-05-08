'use client'

import { ExternalLinkIcon, LinkIcon } from 'lucide-react'
import { createReactBlockSpec } from '@blocknote/react'
import { defaultProps } from '@blocknote/core'

export const WebEmbedBlock = createReactBlockSpec(
  {
    type: 'web_embed',
    propSchema: {
      ...defaultProps,
      url: { default: '' },
      title: { default: '' },
      embedUrl: { default: '' },
      provider: { default: '' },
    },
    content: 'none',
  },
  {
    render: ({ block }) => <WebEmbedBlockRenderer block={block} />,
  },
)

function WebEmbedBlockRenderer({
  block,
}: {
  block: { props: Record<string, unknown> }
}) {
  const props = block.props as {
    url: string
    title: string
    embedUrl: string
    provider: string
  }

  if (!props.embedUrl) {
    return (
      <a
        href={props.url}
        target="_blank"
        rel="noopener noreferrer"
        className="my-1 inline-flex items-center gap-2 rounded-md border bg-card px-3 py-2 text-sm hover:bg-accent/30"
      >
        <LinkIcon className="size-3.5 text-muted-foreground" />
        {props.title || props.url || 'Unsupported embed'}
        <ExternalLinkIcon className="size-3.5 text-muted-foreground" />
      </a>
    )
  }

  return (
    <div className="my-2 overflow-hidden rounded-lg border bg-card">
      <div className="flex items-center justify-between gap-3 border-b px-3 py-2 text-xs text-muted-foreground">
        <span className="truncate">{props.title || props.provider || props.url}</span>
        <a
          href={props.url}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 hover:text-foreground"
        >
          Open
          <ExternalLinkIcon className="size-3" />
        </a>
      </div>
      <div className="aspect-video bg-muted/30">
        <iframe
          src={props.embedUrl}
          title={props.title || props.provider || 'Embedded content'}
          className="h-full w-full"
          loading="lazy"
          referrerPolicy="no-referrer-when-downgrade"
          sandbox="allow-scripts allow-same-origin allow-popups allow-presentation"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; fullscreen"
        />
      </div>
    </div>
  )
}
