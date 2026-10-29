'use client';

/** A form whose action may hand back a one-time secret: shows it once, with copy and a warning. */
import { ArrowRight } from 'lucide-react';
import Link from 'next/link';
import { useActionState, type ReactNode } from 'react';
import { Notice } from '@/components/ui';
import { CopyButton, FormResult } from '@/components/ui/client';
import { InputGroup, InputGroupAddon, InputGroupInput } from '@/components/ui/input-group';
import type { SecretState } from './secret';

export function SecretForm({
  action,
  children,
  className,
  title = 'Cópiala ahora',
  warning = 'Se muestra una sola vez. Guárdala en un lugar seguro; no podrás volver a verla.',
}: {
  action: (state: SecretState, form: FormData) => Promise<SecretState>;
  children: ReactNode;
  className?: string;
  title?: string;
  warning?: string;
}) {
  const [state, formAction] = useActionState(action, null);
  return (
    <div>
      <form action={formAction} className={className}>
        {children}
        <FormResult state={state} />
      </form>
      {state?.secret ? <SecretBox secret={state.secret} title={title} warning={warning} href={state.href} /> : null}
    </div>
  );
}

function SecretBox({ secret, title, warning, href }: { secret: string; title: string; warning: string; href?: string }) {
  return (
    <Notice tone="warn" title={title} className="mt-4 motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-bottom-1 duration-200">
      <p>{warning}</p>
      <InputGroup className="mt-3 bg-background">
        <InputGroupInput readOnly value={secret} aria-label={title} className="font-mono text-xs" />
        <InputGroupAddon align="inline-end">
          <CopyButton text={secret} />
        </InputGroupAddon>
      </InputGroup>
      {href ? (
        <Link href={href} className="mt-3 inline-flex items-center gap-1 rounded-sm text-xs font-medium text-primary hover:underline focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-none">
          Ya la guardé, continuar <ArrowRight aria-hidden className="size-3.5" />
        </Link>
      ) : null}
    </Notice>
  );
}
