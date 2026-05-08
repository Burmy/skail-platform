'use client'

import { useEffect, useState, useTransition, type ReactNode } from 'react'
import {
  CopyIcon,
  LinkIcon,
  RotateCwIcon,
  ShieldCheckIcon,
  Trash2Icon,
  UsersIcon,
} from 'lucide-react'

import {
  createShareLink,
  getShareState,
  revokeAccessGrant,
  revokeShareLink,
  updateAccessGrant,
} from '@/app/pages/share-actions'
import type { PageAccessLevel, PageShareScopeType } from '@/lib/pages/access'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'

type ShareState = {
  links: Array<{
    id: string
    link_type: string
    access_level: string
    created_at: string
    last_used_at: string | null
    revoked_at: string | null
  }>
  grants: Array<{
    id: string
    user_id: string
    access_level: string
    accepted_at: string | null
    revoked_at: string | null
  }>
  events: Array<{
    id: string
    event_type: string
    access_level: string | null
    created_at: string
  }>
}

const LEVEL_LABELS: Record<PageAccessLevel, string> = {
  view: 'Can view',
  edit: 'Can edit',
  manage: 'Can manage',
}

export function ShareDialog({
  workspaceId,
  scopeType,
  scopeId,
  trigger,
}: {
  workspaceId: string
  scopeType: PageShareScopeType
  scopeId: string
  trigger: ReactNode
}) {
  const [open, setOpen] = useState(false)
  const [state, setState] = useState<ShareState | null>(null)
  const [message, setMessage] = useState<string | null>(null)
  const [inviteLevel, setInviteLevel] = useState<PageAccessLevel>('edit')
  const [pending, startTransition] = useTransition()

  function load() {
    startTransition(async () => {
      const result = await getShareState({ workspaceId, scopeType, scopeId })
      if (result.ok && result.data) {
        setState(result.data)
        setMessage(null)
      } else if (!result.ok) {
        setMessage(result.error)
      }
    })
  }

  useEffect(() => {
    if (open) load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, workspaceId, scopeType, scopeId])

  function copyLink(linkType: 'invite' | 'public') {
    startTransition(async () => {
      const result = await createShareLink({
        workspaceId,
        scopeType,
        scopeId,
        linkType,
        accessLevel: linkType === 'public' ? 'view' : inviteLevel,
      })
      if (!result.ok || !result.data) {
        setMessage(result.ok ? 'Could not create link.' : result.error)
        return
      }
      await navigator.clipboard.writeText(result.data.url)
      setMessage(linkType === 'public' ? 'Public link copied.' : 'Invite link copied.')
      load()
    })
  }

  const activeLinks = state?.links.filter((link) => !link.revoked_at) ?? []
  const activeGrants = state?.grants.filter((grant) => !grant.revoked_at) ?? []

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Share {scopeType}</DialogTitle>
          <DialogDescription>
            Invite links grant page-scoped access. Public links are view-only.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <section className="rounded-lg border bg-card p-3">
            <div className="mb-3 flex items-center gap-2">
              <UsersIcon className="size-4 text-muted-foreground" />
              <div className="font-medium">Invite link</div>
              <Select
                value={inviteLevel}
                onValueChange={(value) => setInviteLevel(value as PageAccessLevel)}
              >
                <SelectTrigger className="ml-auto h-8 w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="view">Can view</SelectItem>
                  <SelectItem value="edit">Can edit</SelectItem>
                  <SelectItem value="manage">Can manage</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button
              type="button"
              className="w-full gap-2"
              disabled={pending}
              onClick={() => copyLink('invite')}
            >
              <CopyIcon className="size-4" />
              Copy invite link
            </Button>
          </section>

          <section className="rounded-lg border bg-card p-3">
            <div className="mb-3 flex items-center gap-2">
              <LinkIcon className="size-4 text-muted-foreground" />
              <div>
                <div className="font-medium">Public link</div>
                <p className="text-xs text-muted-foreground">
                  Anyone with the link can view and submit form blocks.
                </p>
              </div>
              <Badge variant="secondary" className="ml-auto">View only</Badge>
            </div>
            <Button
              type="button"
              variant="outline"
              className="w-full gap-2"
              disabled={pending}
              onClick={() => copyLink('public')}
            >
              <CopyIcon className="size-4" />
              Copy public link
            </Button>
          </section>

          <section className="space-y-2">
            <div className="flex items-center gap-2 text-sm font-medium">
              <ShieldCheckIcon className="size-4 text-muted-foreground" />
              People with access
            </div>
            {activeGrants.length === 0 ? (
              <p className="rounded-md border bg-muted/20 px-3 py-2 text-sm text-muted-foreground">
                No accepted invite links yet.
              </p>
            ) : (
              <div className="space-y-2">
                {activeGrants.map((grant) => (
                  <div
                    key={grant.id}
                    className="flex items-center gap-2 rounded-md border px-3 py-2 text-sm"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="truncate font-medium">{grant.user_id}</div>
                      <div className="text-xs text-muted-foreground">
                        {grant.accepted_at
                          ? `Accepted ${new Date(grant.accepted_at).toLocaleDateString()}`
                          : 'Access granted'}
                      </div>
                    </div>
                    <Select
                      value={grant.access_level}
                      onValueChange={(value) => {
                        startTransition(async () => {
                          await updateAccessGrant({
                            workspaceId,
                            scopeType,
                            scopeId,
                            grantId: grant.id,
                            accessLevel: value as PageAccessLevel,
                          })
                          load()
                        })
                      }}
                    >
                      <SelectTrigger className="h-8 w-32">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="view">Can view</SelectItem>
                        <SelectItem value="edit">Can edit</SelectItem>
                        <SelectItem value="manage">Can manage</SelectItem>
                      </SelectContent>
                    </Select>
                    <Button
                      type="button"
                      size="icon-sm"
                      variant="ghost"
                      aria-label="Revoke access"
                      onClick={() => {
                        startTransition(async () => {
                          await revokeAccessGrant({
                            workspaceId,
                            scopeType,
                            scopeId,
                            grantId: grant.id,
                          })
                          load()
                        })
                      }}
                    >
                      <Trash2Icon className="size-4" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </section>

          <section className="space-y-2">
            <div className="flex items-center gap-2 text-sm font-medium">
              <LinkIcon className="size-4 text-muted-foreground" />
              Active links
            </div>
            {activeLinks.length === 0 ? (
              <p className="rounded-md border bg-muted/20 px-3 py-2 text-sm text-muted-foreground">
                No active links.
              </p>
            ) : (
              <div className="space-y-2">
                {activeLinks.map((link) => {
                  const level = LEVEL_LABELS[link.access_level as PageAccessLevel] ?? link.access_level
                  return (
                    <div
                      key={link.id}
                      className="flex items-center gap-2 rounded-md border px-3 py-2 text-sm"
                    >
                      <Badge variant="secondary">
                        {link.link_type === 'public' ? 'Public' : 'Invite'}
                      </Badge>
                      <span className="text-muted-foreground">{level}</span>
                      <span className="ml-auto text-xs text-muted-foreground">
                        {new Date(link.created_at).toLocaleDateString()}
                      </span>
                      <Button
                        type="button"
                        size="icon-sm"
                        variant="ghost"
                        aria-label="Revoke link"
                        onClick={() => {
                          startTransition(async () => {
                            await revokeShareLink({
                              workspaceId,
                              scopeType,
                              scopeId,
                              linkId: link.id,
                            })
                            load()
                          })
                        }}
                      >
                        <Trash2Icon className="size-4" />
                      </Button>
                    </div>
                  )
                })}
              </div>
            )}
          </section>

          {state?.events.length ? (
            <section className="space-y-2">
              <div className="flex items-center gap-2 text-sm font-medium">
                <RotateCwIcon className="size-4 text-muted-foreground" />
                Recent activity
              </div>
              <div className="space-y-1">
                {state.events.slice(0, 5).map((event) => (
                  <div
                    key={event.id}
                    className="flex items-center justify-between rounded-md bg-muted/30 px-3 py-1.5 text-xs"
                  >
                    <span>{event.event_type.replaceAll('_', ' ')}</span>
                    <span className="text-muted-foreground">
                      {new Date(event.created_at).toLocaleString()}
                    </span>
                  </div>
                ))}
              </div>
            </section>
          ) : null}

          {message ? (
            <p className="rounded-md border bg-muted/20 px-3 py-2 text-sm text-muted-foreground">
              {message}
            </p>
          ) : null}
        </div>
      </DialogContent>
    </Dialog>
  )
}
