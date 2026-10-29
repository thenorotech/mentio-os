import { FileQuestion } from 'lucide-react';
import { EmptyState, LinkButton } from '@/components/ui';

/** A link to something that does not exist (or no longer does): say so, and the way back. */
export default function NotFound() {
  return (
    <div className="mx-auto w-full max-w-2xl pt-10">
      <h1 className="sr-only">Página no encontrada</h1>
      <EmptyState
        icon={FileQuestion}
        title="No encontramos lo que buscas"
        action={
          <div className="flex flex-wrap justify-center gap-2">
            <LinkButton href="/" variant="primary">Volver al resumen</LinkButton>
            <LinkButton href="/mentions">Ir a menciones</LinkButton>
          </div>
        }
      >
        La página o el registro no existe, o se eliminó. Revisa el enlace o vuelve al resumen de la campaña.
      </EmptyState>
    </div>
  );
}
