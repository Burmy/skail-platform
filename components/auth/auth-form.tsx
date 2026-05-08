'use client'

import { useActionState, useState } from 'react'
import Link from 'next/link'
import { Eye, EyeOff, Lock, LogIn, Mail, UserPlus } from 'lucide-react'

import type { AuthActionState } from '@/app/auth/actions'
import { login, signup } from '@/app/auth/actions'
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
  InputGroupButton,
  InputGroupInput,
} from '@/components/ui/input-group'

type AuthFormProps = {
  mode: 'login' | 'signup'
  nextPath?: string
  message?: string
}

const initialState: AuthActionState = {
  status: 'idle',
}

export function AuthForm({ mode, nextPath = '/', message }: AuthFormProps) {
  const action = mode === 'login' ? login : signup
  const [state, formAction, isPending] = useActionState(action, initialState)
  const [showPassword, setShowPassword] = useState(false)
  const isSignup = mode === 'signup'

  return (
    <Card className="border-border/80 bg-card/95">
      <CardHeader>
        <CardTitle>{isSignup ? 'Create your account' : 'Sign in'}</CardTitle>
        <CardDescription>
          {isSignup
            ? 'Start a SKAIL workspace with email and password.'
            : 'Use your SKAIL account to continue.'}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form action={formAction} className="flex flex-col gap-6">
          <input name="next" type="hidden" value={nextPath} />

          {(message || state.message) && (
            <Alert variant={state.status === 'error' ? 'destructive' : 'default'}>
              <AlertDescription>{state.message ?? message}</AlertDescription>
            </Alert>
          )}

          <FieldGroup>
            <Field>
              <FieldLabel htmlFor="email">Email</FieldLabel>
              <InputGroup>
                <InputGroupAddon>
                  <Mail />
                </InputGroupAddon>
                <InputGroupInput
                  autoComplete="email"
                  id="email"
                  name="email"
                  placeholder="you@company.com"
                  required
                  type="email"
                />
              </InputGroup>
            </Field>

            <Field>
              <FieldLabel htmlFor="password">Password</FieldLabel>
              <InputGroup>
                <InputGroupAddon>
                  <Lock />
                </InputGroupAddon>
                <InputGroupInput
                  autoComplete={isSignup ? 'new-password' : 'current-password'}
                  id="password"
                  minLength={isSignup ? 8 : undefined}
                  name="password"
                  placeholder="Enter your password"
                  required
                  type={showPassword ? 'text' : 'password'}
                />
                <InputGroupAddon align="inline-end">
                  <InputGroupButton
                    aria-label={
                      showPassword ? 'Hide password' : 'Show password'
                    }
                    onClick={() => setShowPassword((current) => !current)}
                    size="icon-xs"
                  >
                    {showPassword ? <EyeOff /> : <Eye />}
                  </InputGroupButton>
                </InputGroupAddon>
              </InputGroup>
              {isSignup && (
                <FieldDescription>
                  Use at least 8 characters.
                </FieldDescription>
              )}
            </Field>
          </FieldGroup>

          <Button disabled={isPending} size="lg" type="submit">
            {isSignup ? (
              <UserPlus data-icon="inline-start" />
            ) : (
              <LogIn data-icon="inline-start" />
            )}
            {isPending
              ? isSignup
                ? 'Creating account'
                : 'Signing in'
              : isSignup
                ? 'Create account'
                : 'Sign in'}
          </Button>

          <p className="text-muted-foreground text-center text-sm">
            {isSignup ? 'Already have an account?' : 'Need an account?'}{' '}
            <Link
              className="text-foreground font-medium underline underline-offset-4"
              href={isSignup ? '/login' : '/signup'}
            >
              {isSignup ? 'Sign in' : 'Create one'}
            </Link>
          </p>
        </form>
      </CardContent>
    </Card>
  )
}
