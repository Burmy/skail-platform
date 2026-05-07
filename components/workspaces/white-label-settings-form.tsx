'use client'

import { useActionState, useState } from 'react'
import { Building2, Globe2, Image, Mail, Save } from 'lucide-react'

import type { WorkspaceActionState } from '@/app/workspaces/actions'
import { updateWorkspaceSettings } from '@/app/workspaces/actions'
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
  FieldContent,
  FieldDescription,
  FieldGroup,
  FieldLabel,
  FieldSet,
} from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from '@/components/ui/input-group'
import { Switch } from '@/components/ui/switch'
import type { Workspace } from '@/lib/supabase/database.types'

type WhiteLabelSettingsFormProps = {
  workspace: Workspace
}

const initialState: WorkspaceActionState = {
  status: 'idle',
}

export function WhiteLabelSettingsForm({
  workspace,
}: WhiteLabelSettingsFormProps) {
  const [state, formAction, isPending] = useActionState(
    updateWorkspaceSettings,
    initialState,
  )
  const [accentColor, setAccentColor] = useState(
    workspace.accent_color ?? '#7c3aed',
  )
  const [hideBranding, setHideBranding] = useState(
    Boolean(workspace.hide_skail_branding),
  )

  return (
    <form action={formAction} className="flex flex-col gap-6">
      <input name="workspaceId" type="hidden" value={workspace.id} />
      <input
        name="hideSkailBranding"
        type="hidden"
        value={hideBranding ? 'on' : 'off'}
      />

      {state.message && (
        <Alert variant={state.status === 'error' ? 'destructive' : 'default'}>
          <AlertDescription>{state.message}</AlertDescription>
        </Alert>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Workspace identity</CardTitle>
          <CardDescription>
            Stable IDs stay internal. These user-facing names can change.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <FieldGroup>
            <Field>
              <FieldLabel htmlFor="name">Workspace name</FieldLabel>
              <InputGroup>
                <InputGroupAddon>
                  <Building2 />
                </InputGroupAddon>
                <InputGroupInput
                  defaultValue={workspace.name}
                  id="name"
                  name="name"
                  required
                />
              </InputGroup>
            </Field>

            <Field>
              <FieldLabel htmlFor="whiteLabelLevel">
                White-label level
              </FieldLabel>
              <Input
                defaultValue={workspace.white_label_level ?? 2}
                id="whiteLabelLevel"
                max={2}
                min={0}
                name="whiteLabelLevel"
                required
                type="number"
              />
              <FieldDescription>
                Level 2 enables branded portal identity, domains, and email
                sender settings.
              </FieldDescription>
            </Field>
          </FieldGroup>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Branding</CardTitle>
          <CardDescription>
            These settings drive the client-facing portal experience.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <FieldGroup>
            <Field>
              <FieldLabel htmlFor="brandName">Brand name</FieldLabel>
              <InputGroup>
                <InputGroupAddon>
                  <Building2 />
                </InputGroupAddon>
                <InputGroupInput
                  defaultValue={workspace.brand_name ?? ''}
                  id="brandName"
                  name="brandName"
                  placeholder={workspace.name}
                />
              </InputGroup>
            </Field>

            <Field>
              <FieldLabel htmlFor="brandLogoUrl">Logo URL</FieldLabel>
              <InputGroup>
                <InputGroupAddon>
                  <Image />
                </InputGroupAddon>
                <InputGroupInput
                  defaultValue={workspace.brand_logo_url ?? ''}
                  id="brandLogoUrl"
                  name="brandLogoUrl"
                  placeholder="https://cdn.example.com/logo.png"
                  type="url"
                />
              </InputGroup>
            </Field>

            <Field>
              <FieldLabel htmlFor="accentColor">Accent color</FieldLabel>
              <div className="flex items-center gap-3">
                <Input
                  aria-label="Accent color picker"
                  className="size-10 shrink-0 p-1"
                  onChange={(event) => setAccentColor(event.target.value)}
                  type="color"
                  value={accentColor}
                />
                <Input
                  className="font-mono"
                  id="accentColor"
                  name="accentColor"
                  onChange={(event) => setAccentColor(event.target.value)}
                  pattern="^#[0-9a-fA-F]{6}$"
                  required
                  value={accentColor}
                />
              </div>
            </Field>

            <Field orientation="horizontal">
              <Switch
                checked={hideBranding}
                id="hideSkailBrandingSwitch"
                onCheckedChange={setHideBranding}
              />
              <FieldContent>
                <FieldLabel htmlFor="hideSkailBrandingSwitch">
                  Hide SKAIL branding
                </FieldLabel>
                <FieldDescription>
                  Removes SKAIL branding from client-facing portal surfaces.
                </FieldDescription>
              </FieldContent>
            </Field>
          </FieldGroup>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Portal access</CardTitle>
          <CardDescription>
            Configure the hosted subdomain and optional custom domain.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <FieldGroup>
            <Field>
              <FieldLabel htmlFor="portalSubdomain">Portal subdomain</FieldLabel>
              <InputGroup>
                <InputGroupAddon>
                  <Globe2 />
                </InputGroupAddon>
                <InputGroupInput
                  defaultValue={workspace.portal_subdomain ?? ''}
                  id="portalSubdomain"
                  name="portalSubdomain"
                  placeholder="acme"
                />
                <InputGroupAddon align="inline-end">.skail.app</InputGroupAddon>
              </InputGroup>
            </Field>

            <Field>
              <FieldLabel htmlFor="customDomain">Custom domain</FieldLabel>
              <InputGroup>
                <InputGroupAddon>
                  <Globe2 />
                </InputGroupAddon>
                <InputGroupInput
                  defaultValue={workspace.custom_domain ?? ''}
                  id="customDomain"
                  name="customDomain"
                  placeholder="portal.example.com"
                />
              </InputGroup>
              <FieldDescription>
                Enter the domain only, without protocol.
              </FieldDescription>
            </Field>
          </FieldGroup>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Email identity</CardTitle>
          <CardDescription>
            Sender settings for branded client-facing notifications.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <FieldSet>
            <Field>
              <FieldLabel htmlFor="emailFromName">From name</FieldLabel>
              <InputGroup>
                <InputGroupAddon>
                  <Mail />
                </InputGroupAddon>
                <InputGroupInput
                  defaultValue={workspace.email_from_name ?? ''}
                  id="emailFromName"
                  name="emailFromName"
                  placeholder={workspace.brand_name ?? workspace.name}
                />
              </InputGroup>
            </Field>

            <Field>
              <FieldLabel htmlFor="emailFromAddress">From address</FieldLabel>
              <InputGroup>
                <InputGroupAddon>
                  <Mail />
                </InputGroupAddon>
                <InputGroupInput
                  defaultValue={workspace.email_from_address ?? ''}
                  id="emailFromAddress"
                  name="emailFromAddress"
                  placeholder="hello@example.com"
                  type="email"
                />
              </InputGroup>
            </Field>
          </FieldSet>
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button disabled={isPending} type="submit">
          <Save data-icon="inline-start" />
          {isPending ? 'Saving settings' : 'Save settings'}
        </Button>
      </div>
    </form>
  )
}
