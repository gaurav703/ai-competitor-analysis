'use client';

import { useActionState, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Field } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { signIn, signUp, type AuthFormState } from './actions';

export function AuthForm() {
  const [mode, setMode] = useState<'signin' | 'signup'>('signin');
  const [signInState, signInAction, signInPending] = useActionState<AuthFormState, FormData>(
    signIn,
    undefined,
  );
  const [signUpState, signUpAction, signUpPending] = useActionState<AuthFormState, FormData>(
    signUp,
    undefined,
  );

  const isSignIn = mode === 'signin';
  const state = isSignIn ? signInState : signUpState;
  const pending = isSignIn ? signInPending : signUpPending;

  return (
    <Card className="w-full max-w-sm space-y-6">
      <div className="space-y-1">
        <h1 className="text-xl font-semibold">{isSignIn ? 'Log in' : 'Create your account'}</h1>
        <p className="text-sm text-muted">
          {isSignIn ? 'Welcome back.' : 'Start tracking your competitors.'}
        </p>
      </div>

      <form action={isSignIn ? signInAction : signUpAction} className="space-y-4">
        <Field label="Email" htmlFor="email" error={state?.fieldErrors?.email}>
          <Input id="email" name="email" type="email" autoComplete="email" required />
        </Field>
        <Field
          label="Password"
          htmlFor="password"
          error={state?.fieldErrors?.password}
          hint="At least 8 characters"
        >
          <Input
            id="password"
            name="password"
            type="password"
            autoComplete={isSignIn ? 'current-password' : 'new-password'}
            required
            minLength={8}
          />
        </Field>

        {state?.error ? <p className="text-sm text-danger">{state.error}</p> : null}
        {state?.message ? <p className="text-sm text-success">{state.message}</p> : null}

        <Button type="submit" className="w-full" disabled={pending}>
          {pending ? 'Please wait…' : isSignIn ? 'Log in' : 'Sign up'}
        </Button>
      </form>

      <p className="text-center text-sm text-muted">
        {isSignIn ? 'No account yet?' : 'Already have an account?'}{' '}
        <button
          type="button"
          className="font-medium text-foreground underline underline-offset-4"
          onClick={() => setMode(isSignIn ? 'signup' : 'signin')}
        >
          {isSignIn ? 'Sign up' : 'Log in'}
        </button>
      </p>
    </Card>
  );
}
