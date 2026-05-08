'use client'

import { useTransition } from 'react'
import { ArrowRightIcon } from 'lucide-react'

import { acceptInviteAndRedirect } from '@/app/pages/share-actions'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'

export function InviteAcceptCard({
  token,
  invitedBy,
  scopeLabel,
  workspaceName,
  accessLabel,
}: {
  token: string
  invitedBy: string
  scopeLabel: string
  workspaceName: string
  accessLabel: string
}) {
  const [pending, startTransition] = useTransition()

  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <CardTitle>You were invited to SKAIL</CardTitle>
        <CardDescription>
          {invitedBy} invited you to {accessLabel.toLowerCase()} &quot;{scopeLabel}&quot; in{' '}
          {workspaceName}.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <Button
          className="w-full gap-2"
          disabled={pending}
          onClick={() => {
            startTransition(async () => {
              await acceptInviteAndRedirect(token)
            })
          }}
        >
          Accept and open
          <ArrowRightIcon className="size-4" />
        </Button>
        <p className="text-center text-xs text-muted-foreground">
          You can leave this page if you do not want access right now.
        </p>
      </CardContent>
    </Card>
  )
}
