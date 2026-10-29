'use server';

import { AuthError } from 'next-auth';
import { redirect } from 'next/navigation';
import { signIn as authSignIn, signOut as authSignOut } from '@/auth';
import type { ActionState } from '@/lib/action';
import { accountsEnabled } from '@/lib/accounts';

/** Only a path on this site, so the login can never redirect elsewhere. */
const safeNext = (value: FormDataEntryValue | null) => {
  const next = typeof value === 'string' ? value : '';
  return next.startsWith('/') && !next.startsWith('//') ? next : '/';
};

export async function signIn(_state: ActionState, form: FormData): Promise<ActionState> {
  if (!accountsEnabled()) redirect('/');
  try {
    await authSignIn('credentials', {
      email: String(form.get('email') ?? ''),
      password: String(form.get('password') ?? ''),
      redirectTo: safeNext(form.get('next')),
    });
  } catch (error) {
    // A success is a redirect, thrown too: only Auth.js's own errors stop here.
    if (error instanceof AuthError) return { error: 'El correo o la contraseña no son correctos.', at: Date.now() };
    throw error;
  }
  return { at: Date.now() };
}

/** Signs out; switching account is signing out and in with another one. */
export async function signOut() {
  await authSignOut({ redirectTo: '/login' });
}
