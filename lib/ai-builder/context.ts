import 'server-only'

import { getLayoutBuilderData } from '@/lib/layout/queries'
import { parseFieldOptions } from '@/lib/properties/types'
import { APPROVED_THEME_STYLE_SCHEMA } from '@/lib/theme/types'

export type AiBuilderWorkspaceContext = Awaited<
  ReturnType<typeof getAiBuilderWorkspaceContext>
>

export async function getAiBuilderWorkspaceContext(workspaceId: string) {
  const data = await getLayoutBuilderData(workspaceId)

  if (!data) {
    return null
  }

  return {
    workspace: {
      id: data.workspace.id,
      name: data.workspace.name,
      brand_name: data.workspace.brand_name,
      white_label_level: data.workspace.white_label_level,
    },
    user: {
      email: data.userEmail,
      role_key: data.roleKey,
    },
    collections: data.collections.map((collection) => ({
      id: collection.id,
      name: collection.name,
      description: collection.description,
      fields: collection.fields
        .filter((field) => !field.is_system)
        .map((field) => ({
          id: field.id,
          name: field.name,
          field_type: field.field_type,
          semantic_role: field.semantic_role,
          options: parseFieldOptions(field.options_json).map((option) => ({
            id: option.id,
            label: option.label,
          })),
        })),
      record_count: collection.records.length,
    })),
    views: data.views.map((view) => ({
      id: view.id,
      collection_id: view.collection_id,
      name: view.name,
      view_type: view.view_type,
      config: view.config,
    })),
    pages: data.pages.map((page) => ({
      id: page.id,
      title: page.title,
      widgets: page.widgets.map((widget) => ({
        id: widget.id,
        title: widget.title,
        widget_type: widget.widget_type,
        data_source_type: widget.data_source_type,
        data_source_id: widget.data_source_id,
      })),
    })),
    allowed_property_types: [
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
      'formula_placeholder',
    ],
    allowed_view_types: ['table', 'kanban', 'calendar', 'dashboard'],
    allowed_widget_types: [
      'text',
      'heading',
      'table',
      'kanban',
      'calendar',
      'kpi_card',
      'file_links',
      'embed',
      'activity_feed',
    ],
    style_schema: APPROVED_THEME_STYLE_SCHEMA,
  }
}
