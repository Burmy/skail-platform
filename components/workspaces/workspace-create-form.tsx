'use client'

import { useActionState } from 'react'
import { Building2, Globe2, Plus } from 'lucide-react'

import type { WorkspaceActionState } from '@/app/workspaces/actions'
import { createWorkspace } from '@/app/workspaces/actions'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
} from '@/components/ui/field'
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from '@/components/ui/input-group'

const initialState: WorkspaceActionState = {
  status: 'idle',
}

export function WorkspaceCreateForm() {
  const [state, formAction, isPending] = useActionState(
    createWorkspace,
    initialState,
  )

  return (
    <Card>
      <CardHeader>
        <CardTitle>Create a workspace</CardTitle>
        <CardDescription>
          This workspace becomes the tenant boundary for data, members, and
          white-label settings.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form action={formAction} className="flex flex-col gap-6">
          {state.status === 'error' && state.message && (
            <Alert variant="destructive">
              <AlertDescription>{state.message}</AlertDescription>
            </Alert>
          )}

          <FieldGroup>
            <Field>
              <FieldLabel htmlFor="name">Workspace name</FieldLabel>
              <InputGroup>
                <InputGroupAddon>
                  <Building2 />
                </InputGroupAddon>
                <InputGroupInput
                  autoComplete="organization"
                  id="name"
                  name="name"
                  placeholder="Acme Client Portal"
                  required
                />
              </InputGroup>
            </Field>

            <Field>
              <FieldLabel htmlFor="portalSubdomain">Portal subdomain</FieldLabel>
              <InputGroup>
                <InputGroupAddon>
                  <Globe2 />
                </InputGroupAddon>
                <InputGroupInput
                  id="portalSubdomain"
                  name="portalSubdomain"
                  placeholder="acme"
                />
                <InputGroupAddon align="inline-end">.skail.app</InputGroupAddon>
              </InputGroup>
              <FieldDescription>
                Optional now. Use lowercase letters, numbers, and hyphens.
              </FieldDescription>
            </Field>
          </FieldGroup>

          <Button disabled={isPending} size="lg" type="submit">
            <Plus data-icon="inline-start" />
            {isPending ? 'Creating workspace' : 'Create workspace'}
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}
