'use server';

import { redirect } from 'next/navigation';
import { z } from 'zod';
import { publicEnv } from '@/lib/env';
import { createSupabaseServerClient } from '@/lib/supabase/server';

export type AuthFormState =
  | {
      error?: string;
      message?: string;
      fieldErrors?: { email?: string | undefined; password?: string | undefined };
    }
  | undefined;

const credentialsSchema = z.object({
  email: z.email('Enter a valid email'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
});

function parseCredentials(formData: FormData) {
  return credentialsSchema.safeParse({
    email: formData.get('email'),
    password: formData.get('password'),
  });
}

function toFieldErrors(error: z.ZodError<z.infer<typeof credentialsSchema>>) {
  const { fieldErrors } = z.flattenError(error);
  return { email: fieldErrors.email?.[0], password: fieldErrors.password?.[0] };
}

export async function signIn(_prev: AuthFormState, formData: FormData): Promise<AuthFormState> {
  const parsed = parseCredentials(formData);
  if (!parsed.success) return { fieldErrors: toFieldErrors(parsed.error) };

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.signInWithPassword(parsed.data);
  if (error) return { error: error.message };

  redirect('/dashboard');
}

export async function signUp(_prev: AuthFormState, formData: FormData): Promise<AuthFormState> {
  const parsed = parseCredentials(formData);
  if (!parsed.success) return { fieldErrors: toFieldErrors(parsed.error) };

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.auth.signUp({
    ...parsed.data,
    options: { emailRedirectTo: `${publicEnv().NEXT_PUBLIC_APP_URL}/auth/callback` },
  });
  if (error) return { error: error.message };

  // With email confirmation on (Supabase default), there is no session until the link is clicked.
  if (!data.session) {
    return { message: 'Check your email to confirm your account, then log in.' };
  }
  redirect('/workspaces/new');
}

export async function signOut(): Promise<void> {
  const supabase = await createSupabaseServerClient();
  await supabase.auth.signOut();
  redirect('/login');
}
