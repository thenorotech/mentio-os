import { redirect } from 'next/navigation';
import { brand } from '@/brand.config';
import { BrandMark } from '@/components/app-sidebar';
import { Field, Input } from '@/components/ui';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ActionForm, SubmitButton } from '@/components/ui/client';
import { accountsEnabled } from '@/lib/accounts';
import { one, type SearchParams } from '@/lib/params';
import { signIn } from './actions';

export const metadata = { title: 'Entrar' };
// Reads AUTH_ACCOUNTS per request, never at build time.
export const dynamic = 'force-dynamic';

/** The sign-in page, when AUTH_ACCOUNTS is set. Each account opens its own workspace. */
export default async function Login({ searchParams }: { searchParams: Promise<SearchParams> }) {
  if (!accountsEnabled()) redirect('/');
  const next = one(await searchParams, 'next') ?? '/';
  return (
    <main className="flex min-h-screen items-center justify-center bg-muted/40 p-4">
      <Card className="w-full max-w-sm">
        <CardHeader className="items-center text-center">
          <BrandMark className="mx-auto mb-2 size-9 text-base" />
          <CardTitle className="text-lg">Entrar a {brand.name}</CardTitle>
          <CardDescription>Entra con tu cuenta para ver tu espacio de trabajo.</CardDescription>
        </CardHeader>
        <CardContent>
          <ActionForm action={signIn} className="grid gap-4">
            <input type="hidden" name="next" value={next} />
            <Field label="Correo">
              <Input type="email" name="email" required autoFocus autoComplete="username" />
            </Field>
            <Field label="Contraseña">
              <Input type="password" name="password" required autoComplete="current-password" />
            </Field>
            <SubmitButton>Entrar</SubmitButton>
          </ActionForm>
        </CardContent>
      </Card>
    </main>
  );
}
