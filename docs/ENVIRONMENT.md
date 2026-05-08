# Environment Variables

Do not commit real secret values. `.env` is ignored. `.env.example` should contain names and safe placeholders only.

If local QA credentials are temporarily listed under a `#login` comment, treat them as development-only test data. They are not runtime environment variables and should not be copied into production.

## App

| Variable | Required now | Used by | Purpose |
| --- | --- | --- | --- |
| `NEXT_PUBLIC_APP_URL` | Recommended | `app/auth/actions.ts` | Base URL for auth redirect fallback. Local default is `http://localhost:3000`. |
| `NEXT_PUBLIC_APP_NAME` | Optional | Mostly future/planned | App display name. Current UI is mostly hardcoded to SKAIL. |

## Supabase

| Variable | Required now | Used by | Purpose |
| --- | --- | --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | Yes | `lib/supabase/env.ts` | Supabase project URL. It is public because browser Supabase clients need it. |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Yes, preferred | `lib/supabase/env.ts` | Public browser/server Supabase key. |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Fallback | `lib/supabase/env.ts` | Legacy fallback if publishable key is not set. |
| `SUPABASE_SERVICE_ROLE_KEY` | Yes for current write flows | `lib/supabase/admin.ts`, server actions, AI apply | Server-only admin key. Required for workspace creation, most service-role writes, AI apply/undo, and signup auto-confirm. Never expose to frontend. |
| `SKAIL_AUTO_CONFIRM_SIGNUPS` | Optional | `app/auth/actions.ts` | If not `false`, signup can create confirmed users with the service role and immediately sign them in. |

Additional code path:

- `SKAIL_DEV_AUTO_CONFIRM_SIGNUPS` is checked by `app/auth/actions.ts` for backward compatibility, but is not listed in `.env.example`.

## Gemini / AI Builder

| Variable | Required now | Used by | Purpose |
| --- | --- | --- | --- |
| `GEMINI_API_KEY` | Required for `/api/ai-builder/chat` | `lib/ai-builder/gemini.ts` | Server-only key for Gemini API. |
| `AI_BUILDER_MODEL` | Optional | `lib/ai-builder/gemini.ts` | Model override. Defaults to `gemini-2.5-flash`; `models/` prefix is stripped if present. |

AI Builder calls Gemini only from backend route handlers. Do not add Gemini calls to Client Components.

## n8n

| Variable | Required now | Used by | Purpose |
| --- | --- | --- | --- |
| `N8N_WEBHOOK_BASE_URL` | Future/planned | Not currently used | Base URL for future n8n workflows. |
| `N8N_WEBHOOK_SECRET` | Future/planned | Not currently used | Secret for future signed webhook validation. |

Current state:

- `webhook_events` table exists.
- No n8n route handler is implemented yet.

## Google Drive Integration

| Variable | Required now | Used by | Purpose |
| --- | --- | --- | --- |
| `GOOGLE_CLIENT_ID` | Future/planned | Not currently used | OAuth client ID for future Google integration. |
| `GOOGLE_CLIENT_SECRET` | Future/planned | Not currently used | Server-only OAuth client secret. |
| `GOOGLE_DRIVE_PICKER_API_KEY` | Future/planned | Not currently used | Future Google Drive Picker key. Review browser exposure before use. |

## Email

| Variable | Required now | Used by | Purpose |
| --- | --- | --- | --- |
| `EMAIL_PROVIDER` | Future/planned | Not currently used | Provider identifier for future email sending. |
| `EMAIL_FROM_NAME` | Future/planned | Not currently used | Default email sender name. |
| `EMAIL_FROM_ADDRESS` | Future/planned | Not currently used | Default sender address. |
| `EMAIL_API_KEY` | Future/planned | Not currently used | Server-only provider API key. |

Current white-label email fields are stored per workspace in `workspaces.email_from_name` and `workspaces.email_from_address`, but no email sending integration is implemented.

## Security

| Variable | Required now | Used by | Purpose |
| --- | --- | --- | --- |
| `APP_ENCRYPTION_SECRET` | Future/planned | Not currently used | Intended for encrypting sensitive app data. |
| `AGENT_WEBHOOK_SIGNING_SECRET` | Future/planned | Not currently used | Intended for signing/verifying agent webhooks. |

## Local Development Setup

1. Copy `.env.example` to `.env`.
2. Fill Supabase URL and public key.
3. Add the real service role key for workspace creation and server writes.
4. Add `GEMINI_API_KEY` only if testing AI Builder.
5. Start the app with `npm run dev`.

## Vercel Setup Notes

Add the same variables in Vercel Project Settings -> Environment Variables.

Important:

- Use production/staging Supabase projects intentionally.
- Do not add server secrets with `NEXT_PUBLIC_`.
- `SUPABASE_SERVICE_ROLE_KEY`, `GEMINI_API_KEY`, future n8n/email/security keys must be server-only.

## Supabase Setup Notes

Required SQL order:

1. `sql/supabase_schema_v1.sql`
2. `sql/supabase_rls_v1.sql`
3. `sql/supabase_theme_styling_v1.sql`
4. `sql/supabase_ai_builder_v1.sql`
5. `sql/supabase_pages_engine_v1.sql`
6. `sql/supabase_page_sharing_v1.sql`
7. `sql/supabase_database_engine_v2.sql`
8. `sql/seed_templates_v1.sql`

Auth setup:

- If using normal email confirmation, configure Supabase Auth email settings and callback URL.
- If using SKAIL auto-confirm signup, set `SUPABASE_SERVICE_ROLE_KEY` and keep `SKAIL_AUTO_CONFIRM_SIGNUPS` unset or `true`.

## Security Reminders

- `.env` is ignored by Git.
- `.env.example` should never contain real values.
- Public Supabase keys are allowed in frontend; service role is not.
- Gemini, n8n, email, encryption, and webhook signing secrets are server-only.
