'use client'

import {
  BlockNoteSchema,
  defaultBlockSpecs,
  type PartialBlock,
} from '@blocknote/core'
import { withMultiColumn } from '@blocknote/xl-multi-column'

import { DatabaseViewBlock } from './database-view-block'
import { PageLinkBlock } from './page-link-block'
import { WebBookmarkBlock } from './web-bookmark-block'
import { WebEmbedBlock } from './web-embed-block'
import { WebMentionBlock } from './web-mention-block'
import { PageFormBlock } from './page-form-block'

// Combined schema: BlockNote stock blocks + SKAIL custom blocks.
export const skailBlockSchema = withMultiColumn(BlockNoteSchema.create({
  blockSpecs: {
    ...defaultBlockSpecs,
    database_view: DatabaseViewBlock(),
    page_link: PageLinkBlock(),
    web_bookmark: WebBookmarkBlock(),
    web_embed: WebEmbedBlock(),
    web_mention: WebMentionBlock(),
    page_form: PageFormBlock(),
  },
}))

export type SkailEditor = typeof skailBlockSchema.BlockNoteEditor
export type SkailBlock = PartialBlock<typeof skailBlockSchema.blockSchema>
