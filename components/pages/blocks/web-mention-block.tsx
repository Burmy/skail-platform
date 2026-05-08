'use client'

import { ExternalLinkIcon, LinkIcon } from 'lucide-react'
import { createReactBlockSpec } from '@blocknote/react'
import { defaultProps } from '@blocknote/core'

export const WebMentionBlock = createReactBlockSpec(
  {
    type: 'web_mention',
    propSchema: {
      ...defaultProps,
      url: { default: '' },
      title: { default: '' },
      faviconUrl: { default: '' },
    },
    content: 'none',
  },
  {
    render: ({ block }) => <WebMentionBlockRenderer block={block} />,
  },
)

function WebMentionBlockRenderer({
  block,
}: {
  block: { props: Record<string, unknown> }
}) {
  const props = block.props as {
    url: string
    title: string
    faviconUrl: string
  }
  const hostname = hostnameFor(props.url)

  return (
    <a
      href={props.url}
      target="_blank"
      rel="noopener noreferrer"
      className="my-1 inline-flex max-w-full items-center gap-1.5 rounded-md border bg-card px-2 py-1 text-sm hover:bg-accent/40"
    >
      {props.faviconUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={props.faviconUrl}
          alt=""
          className="size-4 rounded"
          onError={(event) => {
            event.currentTarget.style.display = 'none'
          }}
        />
      ) : (
        <LinkIcon className="size-3.5 text-muted-foreground" />
      )}
      <span className="truncate">{props.title || hostname || props.url}</span>
      <ExternalLinkIcon className="size-3 text-muted-foreground" />
    </a>
  )
}

function hostnameFor(url: string) {
  try {
    return new URL(url).hostname
  } catch {
    return null
  }
}
