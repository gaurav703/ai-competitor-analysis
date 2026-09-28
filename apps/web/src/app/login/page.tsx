import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/auth';
import { AuthForm } from './auth-form';

export default async function LoginPage() {
  if (await getCurrentUser()) redirect('/dashboard');

  return (
    <main className="flex min-h-screen items-center justify-center px-4">
      <AuthForm />
    </main>
  );
}
