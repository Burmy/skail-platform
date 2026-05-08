import { notFound } from 'next/navigation'

import { resolvePublicForm } from '@/lib/databases/forms'
import { PublicFormView } from '@/components/databases/views/public-form-view'

export const dynamic = 'force-dynamic'

type PublicFormPageProps = {
  params: Promise<{ slug: string }>
}

export default async function PublicFormPage({ params }: PublicFormPageProps) {
  const { slug } = await params
  const resolution = await resolvePublicForm(slug)
  if (!resolution || !resolution.config) notFound()

  return (
    <main className="min-h-screen bg-background">
      <PublicFormView
        data={{
          slug,
          workspaceName: resolution.workspaceName,
          config: {
            title: resolution.config.title,
            description: resolution.config.description,
            includedFieldIds: resolution.config.includedFieldIds,
            requiredFieldIds: resolution.config.requiredFieldIds,
            submitButtonText: resolution.config.submitButtonText,
            successMessage: resolution.config.successMessage,
            redirectUrl: resolution.config.redirectUrl,
          },
          fields: resolution.fields,
        }}
      />
    </main>
  )
}
