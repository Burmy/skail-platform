import { z } from 'zod'

const actionFieldSchema = {
  type: 'object',
  required: ['name', 'field_type'],
  properties: {
    name: { type: 'string' },
    field_type: {
      type: 'string',
      enum: [
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
    },
    semantic_role: { type: 'string' },
    options: {
      type: 'array',
      items: { type: 'string' },
    },
  },
} as const

export const AI_BUILDER_JSON_CONTRACT = {
  type: 'object',
  required: [
    'intent',
    'summary',
    'risk_level',
    'changes',
    'requires_confirmation',
  ],
  properties: {
    intent: {
      type: 'string',
    },
    summary: {
      type: 'string',
    },
    risk_level: {
      type: 'string',
      enum: ['low', 'medium', 'high'],
    },
    requires_confirmation: {
      type: 'boolean',
    },
    changes: {
      type: 'object',
      properties: {
        pages_to_create: {
          type: 'array',
          items: {
            type: 'object',
            required: ['title'],
            properties: {
              title: { type: 'string' },
              icon: { type: 'string' },
            },
          },
        },
        pages_to_update: {
          type: 'array',
          items: {
            type: 'object',
            required: ['id', 'title'],
            properties: {
              id: { type: 'string' },
              title: { type: 'string' },
              icon: { type: 'string' },
            },
          },
        },
        collections_to_create: {
          type: 'array',
          items: {
            type: 'object',
            required: ['name', 'fields'],
            properties: {
              name: { type: 'string' },
              description: { type: 'string' },
              icon: { type: 'string' },
              fields: {
                type: 'array',
                items: actionFieldSchema,
              },
            },
          },
        },
        fields_to_create: {
          type: 'array',
          items: {
            type: 'object',
            required: ['collection_name', 'name', 'field_type'],
            properties: {
              collection_id: { type: 'string' },
              collection_name: { type: 'string' },
              name: { type: 'string' },
              field_type: actionFieldSchema.properties.field_type,
              semantic_role: { type: 'string' },
              options: {
                type: 'array',
                items: { type: 'string' },
              },
            },
          },
        },
        fields_to_update: {
          type: 'array',
          items: {
            type: 'object',
            required: ['id', 'name', 'field_type'],
            properties: {
              id: { type: 'string' },
              collection_id: { type: 'string' },
              name: { type: 'string' },
              field_type: actionFieldSchema.properties.field_type,
              semantic_role: { type: 'string' },
              options: {
                type: 'array',
                items: { type: 'string' },
              },
            },
          },
        },
        views_to_create: {
          type: 'array',
          items: {
            type: 'object',
            required: ['collection_name', 'name', 'view_type'],
            properties: {
              collection_id: { type: 'string' },
              collection_name: { type: 'string' },
              name: { type: 'string' },
              view_type: {
                type: 'string',
                enum: ['table', 'kanban', 'calendar', 'dashboard'],
              },
            },
          },
        },
        widgets_to_create: {
          type: 'array',
          items: {
            type: 'object',
            required: ['page_title', 'widget_type', 'title', 'data_source_type'],
            properties: {
              page_id: { type: 'string' },
              page_title: { type: 'string' },
              widget_type: {
                type: 'string',
                enum: [
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
              },
              title: { type: 'string' },
              data_source_type: {
                type: 'string',
                enum: ['none', 'collection', 'view'],
              },
              collection_id: { type: 'string' },
              collection_name: { type: 'string' },
              view_id: { type: 'string' },
              view_name: { type: 'string' },
              config: {
                type: 'object',
                properties: {
                  content: { type: 'string' },
                  metricLabel: { type: 'string' },
                  url: { type: 'string' },
                },
              },
            },
          },
        },
        layout_changes: {
          type: 'array',
          items: {
            type: 'object',
            required: ['description'],
            properties: {
              description: { type: 'string' },
            },
          },
        },
      },
    },
    warnings: {
      type: 'array',
      items: {
        type: 'string',
      },
    },
    questions: {
      type: 'array',
      items: {
        type: 'string',
      },
    },
  },
} as const

const looseActionObject = z.record(z.unknown())
const nonEmptyActionObject = looseActionObject.refine(
  (value) =>
    Object.values(value).some((item) => {
      if (typeof item === 'string') {
        return item.trim().length > 0
      }

      if (Array.isArray(item)) {
        return item.length > 0
      }

      return item !== null && item !== undefined
    }),
  'AI Builder returned an empty change object.',
)

export const aiBuilderPlanSchema = z.object({
  intent: z.string().trim().min(1).max(160),
  summary: z.string().trim().min(1).max(1200),
  risk_level: z.enum(['low', 'medium', 'high']),
  requires_confirmation: z.boolean(),
  changes: z
    .object({
      pages_to_create: z.array(nonEmptyActionObject).default([]),
      pages_to_update: z.array(nonEmptyActionObject).default([]),
      collections_to_create: z.array(nonEmptyActionObject).default([]),
      fields_to_create: z.array(nonEmptyActionObject).default([]),
      fields_to_update: z.array(nonEmptyActionObject).default([]),
      views_to_create: z.array(nonEmptyActionObject).default([]),
      widgets_to_create: z.array(nonEmptyActionObject).default([]),
      layout_changes: z.array(nonEmptyActionObject).default([]),
      archives: z.array(nonEmptyActionObject).default([]),
      restores: z.array(nonEmptyActionObject).default([]),
      relations_to_create: z.array(nonEmptyActionObject).default([]),
      record_links: z.array(nonEmptyActionObject).default([]),
      formulas_to_set: z.array(nonEmptyActionObject).default([]),
      files_to_attach: z.array(nonEmptyActionObject).default([]),
      locations_to_set: z.array(nonEmptyActionObject).default([]),
      view_layout_changes: z.array(nonEmptyActionObject).default([]),
      dashboard_blocks_to_add: z.array(nonEmptyActionObject).default([]),
    })
    .passthrough(),
  warnings: z.array(z.string()).default([]),
  questions: z.array(z.string()).default([]),
})

export type AiBuilderPlan = z.infer<typeof aiBuilderPlanSchema>

function hasString(value: unknown) {
  return typeof value === 'string' && value.trim().length > 0
}

function hasNamedField(value: unknown) {
  return (
    typeof value === 'object' &&
    value !== null &&
    hasString((value as Record<string, unknown>).name)
  )
}

function hasValidCollectionCreate(action: Record<string, unknown>) {
  return (
    hasString(action.name) &&
    Array.isArray(action.fields) &&
    action.fields.some(hasNamedField)
  )
}

function hasValidPageCreate(action: Record<string, unknown>) {
  return hasString(action.title) || hasString(action.name)
}

function hasValidUpdate(action: Record<string, unknown>) {
  return hasString(action.id)
}

function hasValidFieldCreate(action: Record<string, unknown>) {
  return (
    hasString(action.name) &&
    (hasString(action.collection_id) || hasString(action.collection_name))
  )
}

function hasValidViewCreate(action: Record<string, unknown>) {
  return (
    hasString(action.name) &&
    (hasString(action.collection_id) || hasString(action.collection_name))
  )
}

function hasValidWidgetCreate(action: Record<string, unknown>) {
  return (
    (hasString(action.title) || hasString(action.widget_type)) &&
    (hasString(action.page_id) || hasString(action.page_title))
  )
}

export function validateActionablePlan(plan: AiBuilderPlan) {
  const invalidChanges = [
    ...plan.changes.collections_to_create.filter(
      (action) => !hasValidCollectionCreate(action),
    ),
    ...plan.changes.pages_to_create.filter((action) => !hasValidPageCreate(action)),
    ...plan.changes.pages_to_update.filter((action) => !hasValidUpdate(action)),
    ...plan.changes.fields_to_create.filter(
      (action) => !hasValidFieldCreate(action),
    ),
    ...plan.changes.fields_to_update.filter((action) => !hasValidUpdate(action)),
    ...plan.changes.views_to_create.filter((action) => !hasValidViewCreate(action)),
    ...plan.changes.widgets_to_create.filter(
      (action) => !hasValidWidgetCreate(action),
    ),
  ]

  if (invalidChanges.length > 0) {
    throw new Error(
      'AI Builder returned incomplete change objects. Try again with concrete names for collections, fields, views, and pages.',
    )
  }

  if (planChangeCount(plan) === 0 && plan.questions.length === 0) {
    throw new Error('AI Builder returned no changes or clarifying questions.')
  }
}

export function normalizeAiBuilderPlan(value: unknown): AiBuilderPlan {
  const plan = aiBuilderPlanSchema.parse(value)
  const hasPotentiallyDestructiveChanges =
    plan.changes.pages_to_update.length > 0 ||
    plan.changes.fields_to_update.length > 0 ||
    plan.changes.layout_changes.length > 0 ||
    plan.changes.archives.length > 0

  const normalizedPlan = {
    ...plan,
    risk_level: hasPotentiallyDestructiveChanges ? 'high' : plan.risk_level,
    requires_confirmation: true,
    changes: {
      pages_to_create: plan.changes.pages_to_create,
      pages_to_update: plan.changes.pages_to_update,
      collections_to_create: plan.changes.collections_to_create,
      fields_to_create: plan.changes.fields_to_create,
      fields_to_update: plan.changes.fields_to_update,
      views_to_create: plan.changes.views_to_create,
      widgets_to_create: plan.changes.widgets_to_create,
      layout_changes: plan.changes.layout_changes,
      archives: plan.changes.archives,
      restores: plan.changes.restores,
      relations_to_create: plan.changes.relations_to_create,
      record_links: plan.changes.record_links,
      formulas_to_set: plan.changes.formulas_to_set,
      files_to_attach: plan.changes.files_to_attach,
      locations_to_set: plan.changes.locations_to_set,
      view_layout_changes: plan.changes.view_layout_changes,
      dashboard_blocks_to_add: plan.changes.dashboard_blocks_to_add,
    },
    warnings: hasPotentiallyDestructiveChanges
      ? [
          ...plan.warnings,
          'Updates are held as a preview and require confirmation before apply.',
        ]
      : plan.warnings,
  }

  validateActionablePlan(normalizedPlan)

  return normalizedPlan
}

export function planChangeCount(plan: AiBuilderPlan) {
  return (
    plan.changes.pages_to_create.length +
    plan.changes.pages_to_update.length +
    plan.changes.collections_to_create.length +
    plan.changes.fields_to_create.length +
    plan.changes.fields_to_update.length +
    plan.changes.views_to_create.length +
    plan.changes.widgets_to_create.length +
    plan.changes.layout_changes.length +
    plan.changes.archives.length +
    plan.changes.restores.length +
    plan.changes.relations_to_create.length +
    plan.changes.record_links.length +
    plan.changes.formulas_to_set.length +
    plan.changes.files_to_attach.length +
    plan.changes.locations_to_set.length +
    plan.changes.view_layout_changes.length +
    plan.changes.dashboard_blocks_to_add.length
  )
}
