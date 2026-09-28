import 'server-only';
import { redirect } from 'next/navigation';
import { createSupabaseServerClient } from './supabase/server';

export type CurrentUser = { id: string; email: string | undefined };

export async function getCurrentUser(): Promise<CurrentUser | null> {
  const supabase = await createSupabaseServerClient();
  // getClaims verifies the JWT, unlike getSession which trusts the cookie.
  const { data, error } = await supabase.auth.getClaims();
  if (error || !data?.claims.sub) return null;
  return { id: data.claims.sub, email: data.claims.email };
}

export async function requireUser(): Promise<CurrentUser> {
  const user = await getCurrentUser();
  if (!user) redirect('/login');
  return user;
}
