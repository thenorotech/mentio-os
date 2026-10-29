'use server';

import { AuthError } from 'next-auth';
import { redirect } from 'next/navigation';
import { signIn } from '@/auth';
import type { ActionState } from '@/lib/action';
import { EmailTakenError, accountsEnabled, createAccount } from '@/lib/accounts';

const field = (form: FormData, name: string) => String(form.get(name) ?? '').trim();

const fail = (error: string): ActionState => ({ error, at: Date.now() });

/** Creates an account, then signs it in. */
export async function register(_state: ActionState, form: FormData): Promise<ActionState> {
  if (!accountsEnabled()) redirect('/');
  const name = field(form, 'name');
  const email = field(form, 'email');
  const password = String(form.get('password') ?? '');
  if (!name || !email) return fail('Completa todos los campos.');
  if (password.length < 8) return fail('La contraseña necesita al menos 8 caracteres.');
  try {
    await createAccount({ name, email, password });
  } catch (error) {
    if (error instanceof EmailTakenError) return fail('Ya existe una cuenta con ese correo.');
    throw error;
  }
  try {
    await signIn('credentials', { email, password, redirectTo: '/' });
  } catch (error) {
    // A success is a redirect, thrown too: only Auth.js's own errors stop here.
    if (error instanceof AuthError) redirect('/login');
    throw error;
  }
  return { at: Date.now() };
}
