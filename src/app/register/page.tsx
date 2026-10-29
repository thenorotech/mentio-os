import Link from 'next/link';
import { redirect } from 'next/navigation';
import { brand } from '@/brand.config';
import { BrandMark } from '@/components/app-sidebar';
import { Field, Input } from '@/components/ui';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ActionForm, SubmitButton } from '@/components/ui/client';
import { accountsEnabled } from '@/lib/accounts';
import { register } from './actions';

export const metadata = { title: 'Crear cuenta' };
// Reads DATABASE_URL per request, never at build time.
export const dynamic = 'force-dynamic';

/** Sign-up: an account and the Mentio key of the workspace it opens. */
export default function Register() {
  if (!accountsEnabled()) redirect('/');
  return (
    <main className="flex min-h-screen items-center justify-center bg-muted/40 p-4">
      <Card className="w-full max-w-sm">
        <CardHeader className="items-center text-center">
          <BrandMark className="mx-auto mb-2 size-9 text-base" />
          <CardTitle className="text-lg">Crear cuenta en {brand.name}</CardTitle>
          <CardDescription>Tu cuenta abre el espacio de trabajo de tu clave de Mentio, con su propia configuración.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4">
          <ActionForm action={register} className="grid gap-4">
            <Field label="Nombre">
              <Input name="name" required autoFocus autoComplete="name" />
            </Field>
            <Field label="Correo">
              <Input type="email" name="email" required autoComplete="username" />
            </Field>
            <Field label="Contraseña" hint="Al menos 8 caracteres.">
              <Input type="password" name="password" required minLength={8} autoComplete="new-password" />
            </Field>
            <Field label="Clave de API de Mentio" hint="En Mentio: Ajustes, Claves de API. Se guarda cifrada.">
              <Input type="password" name="apiKey" required autoComplete="off" placeholder="mk_live_..." />
            </Field>
            <SubmitButton>Crear cuenta</SubmitButton>
          </ActionForm>
          <p className="text-center text-sm text-muted-foreground">
            ¿Ya tienes cuenta?{' '}
            <Link href="/login" className="font-medium text-foreground underline-offset-4 hover:underline">
              Entrar
            </Link>
          </p>
        </CardContent>
      </Card>
    </main>
  );
}
