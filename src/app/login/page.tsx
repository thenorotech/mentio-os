import { redirect } from 'next/navigation';
import { brand } from '@/brand.config';
import { BrandMark } from '@/components/app-sidebar';
import { Field, Input } from '@/components/ui';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ActionForm, SubmitButton } from '@/components/ui/client';
import { passwordProtected } from '@/lib/session';
import { one, type SearchParams } from '@/lib/params';
import { signIn } from './actions';

export const metadata = { title: 'Entrar' };
// Reads DASHBOARD_PASSWORD per request, never at build time.
export const dynamic = 'force-dynamic';

/** The password page, when DASHBOARD_PASSWORD is set. */
export default async function Login({ searchParams }: { searchParams: Promise<SearchParams> }) {
  if (!passwordProtected()) redirect('/');
  const next = one(await searchParams, 'next') ?? '/';
  return (
    <main className="relative flex min-h-svh items-center justify-center overflow-hidden bg-muted/40 p-4">
      {/* A dotted grid fading out from the center, lit by the brand: depth without motion. */}
      <div aria-hidden className="pointer-events-none absolute inset-0 bg-[radial-gradient(var(--border)_1px,transparent_1px)] [background-size:18px_18px] [mask-image:radial-gradient(ellipse_at_center,black_30%,transparent_70%)]" />
      <div aria-hidden className="pointer-events-none absolute top-1/2 left-1/2 size-[36rem] -translate-x-1/2 -translate-y-1/2 rounded-full bg-primary/10 blur-3xl" />
      <Card className="relative w-full max-w-sm shadow-md fill-mode-both duration-300 ease-out motion-safe:animate-in motion-safe:fade-in motion-safe:zoom-in-95">
        <CardHeader className="items-center text-center">
          <BrandMark className="mx-auto mb-2 size-10 rounded-xl text-base shadow-sm" />
          <CardTitle className="text-lg font-semibold tracking-tight">Entrar a {brand.name}</CardTitle>
          <CardDescription>Escribe la contraseña del panel.</CardDescription>
        </CardHeader>
        <CardContent>
          <ActionForm action={signIn} className="grid gap-4">
            <input type="hidden" name="next" value={next} />
            <Field label="Contraseña">
              <Input type="password" name="password" required autoFocus autoComplete="current-password" />
            </Field>
            <SubmitButton>Entrar</SubmitButton>
          </ActionForm>
        </CardContent>
      </Card>
    </main>
  );
}
