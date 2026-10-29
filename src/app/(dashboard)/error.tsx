'use client';

/** A loading failure lands here instead of a blank page: shadcn's Alert, with a retry. */
import { CircleAlert, RotateCcw } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';

export default function ErrorPage({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div className="mx-auto w-full max-w-2xl pt-10">
      <h1 className="sr-only">Error al cargar</h1>
      <Alert variant="destructive" className="px-4 py-3">
        <CircleAlert aria-hidden />
        <AlertTitle>No pudimos cargar los datos de la campaña</AlertTitle>
        <AlertDescription>
          <p>Ocurrió un problema temporal al consultar la información. Inténtalo de nuevo en unos momentos.</p>
          {error.digest ? <p className="font-mono text-xs text-muted-foreground">Referencia: {error.digest}</p> : null}
          <div className="mt-3">
            <Button variant="outline" size="sm" onClick={reset}>
              <RotateCcw aria-hidden /> Intentar de nuevo
            </Button>
          </div>
        </AlertDescription>
      </Alert>
    </div>
  );
}
