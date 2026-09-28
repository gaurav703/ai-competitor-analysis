import { NextResponse, type NextRequest } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase/server';

// Email confirmation link lands here with a one-time code (PKCE flow).
export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get('code');
  const redirectTo = request.nextUrl.clone();
  redirectTo.search = '';

  if (code) {
    const supabase = await createSupabaseServerClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      redirectTo.pathname = '/dashboard';
      return NextResponse.redirect(redirectTo);
    }
  }

  redirectTo.pathname = '/login';
  return NextResponse.redirect(redirectTo);
}
