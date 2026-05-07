import 'server-only'

import {
  AI_BUILDER_JSON_CONTRACT,
  normalizeAiBuilderPlan,
} from '@/lib/ai-builder/contract'

type GeminiResponse = {
  candidates?: Array<{
    content?: {
      parts?: Array<{
        text?: string
      }>
    }
  }>
  error?: {
    message?: string
  }
}

type JsonSchema = {
  type?: string
  enum?: readonly string[]
  required?: readonly string[]
  properties?: Record<string, JsonSchema>
  items?: JsonSchema
}

function getGeminiModel() {
  return (
    process.env.AI_BUILDER_MODEL?.trim().replace(/^models\//, '') ||
    'gemini-2.5-flash'
  )
}

function geminiSchemaType(type: string | undefined) {
  switch (type) {
    case 'object':
      return 'OBJECT'
    case 'array':
      return 'ARRAY'
    case 'string':
      return 'STRING'
    case 'boolean':
      return 'BOOLEAN'
    case 'number':
      return 'NUMBER'
    case 'integer':
      return 'INTEGER'
    default:
      return undefined
  }
}

function toGeminiResponseSchema(schema: JsonSchema): Record<string, unknown> {
  const converted: Record<string, unknown> = {}
  const type = geminiSchemaType(schema.type)

  if (type) {
    converted.type = type
  }

  if (schema.enum) {
    converted.enum = schema.enum
  }

  if (schema.required) {
    converted.required = schema.required
  }

  if (schema.properties) {
    converted.properties = Object.fromEntries(
      Object.entries(schema.properties).map(([key, value]) => [
        key,
        toGeminiResponseSchema(value),
      ]),
    )
  }

  if (schema.items) {
    converted.items = toGeminiResponseSchema(schema.items)
  }

  return converted
}

function buildPrompt({
  userPrompt,
  context,
  retryFeedback,
}: {
  userPrompt: string
  context: unknown
  retryFeedback?: string
}) {
  return [
    'You are SKAIL AI Builder.',
    'Return only JSON matching the provided schema.',
    'Use stable backend IDs from context when updating existing objects.',
    'Do not invent destructive delete actions. Do not include custom CSS or JavaScript.',
    'Every tenant-owned change must be scoped to the provided workspace.',
    'Prefer additive changes: create pages, collections, fields, views, and widgets.',
    'Never output empty change objects like {}.',
    'A useful project tracker response should create one collection with named fields, then create views/pages/widgets that reference that collection by collection_name.',
    retryFeedback ? `Previous response was rejected: ${retryFeedback}` : '',
    'JSON contract:',
    JSON.stringify(AI_BUILDER_JSON_CONTRACT),
    '',
    'Supported action item shapes:',
    '- pages_to_create: { "title": string, "icon": string }',
    '- pages_to_update: { "id": string, "title": string, "icon": string }',
    '- collections_to_create: { "name": string, "description": string, "icon": string, "fields": [{ "name": string, "field_type": string, "semantic_role": string, "options": string[] }] }',
    '- fields_to_create: { "collection_id": string, "collection_name": string, "name": string, "field_type": string, "semantic_role": string, "options": string[] }',
    '- fields_to_update: { "id": string, "collection_id": string, "name": string, "field_type": string, "semantic_role": string, "options": string[] }',
    '- views_to_create: { "collection_id": string, "collection_name": string, "name": string, "view_type": "table|kanban|calendar|dashboard" }',
    '- widgets_to_create: { "page_id": string, "page_title": string, "widget_type": string, "title": string, "data_source_type": "none|collection|view", "collection_id": string, "collection_name": string, "view_id": string, "view_name": string, "config": object }',
    'If a required field for kanban/calendar does not exist, include the needed field in fields_to_create before the view.',
    '',
    'Workspace context:',
    JSON.stringify(context),
    '',
    'User prompt:',
    userPrompt,
  ].join('\n')
}

function parseGeminiText(response: GeminiResponse) {
  const text =
    response.candidates?.[0]?.content?.parts
      ?.map((part) => part.text ?? '')
      .join('')
      .trim() ?? ''

  if (!text) {
    throw new Error('Gemini returned an empty response.')
  }

  return text
}

export async function generateAiBuilderPlan({
  prompt,
  context,
}: {
  prompt: string
  context: unknown
}) {
  const apiKey = process.env.GEMINI_API_KEY?.trim()

  if (!apiKey) {
    throw new Error('Missing GEMINI_API_KEY.')
  }

  const model = getGeminiModel()
  let lastError: Error | null = null

  for (let attempt = 0; attempt < 2; attempt += 1) {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-goog-api-key': apiKey,
        },
        body: JSON.stringify({
          contents: [
            {
              role: 'user',
              parts: [
                {
                  text: buildPrompt({
                    userPrompt: prompt,
                    context,
                    retryFeedback: attempt > 0 ? lastError?.message : undefined,
                  }),
                },
              ],
            },
          ],
          generationConfig: {
            temperature: attempt > 0 ? 0.1 : 0.2,
            responseMimeType: 'application/json',
            responseSchema: toGeminiResponseSchema(AI_BUILDER_JSON_CONTRACT),
          },
        }),
      },
    )

    const payload = (await response.json()) as GeminiResponse

    if (!response.ok) {
      throw new Error(payload.error?.message ?? 'Gemini request failed.')
    }

    const text = parseGeminiText(payload)

    try {
      return normalizeAiBuilderPlan(JSON.parse(text))
    } catch (parseError) {
      lastError =
        parseError instanceof Error
          ? parseError
          : new Error('Gemini returned invalid AI Builder JSON.')
    }
  }

  throw new Error(
    lastError
      ? `Gemini returned invalid AI Builder JSON: ${lastError.message}`
      : 'Gemini returned invalid AI Builder JSON.',
  )
}
