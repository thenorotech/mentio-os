/**
 * The setup guide on the home page: the whole guide while there is no
 * candidate, a one-line reminder until every step is done. Rendered in a
 * Suspense boundary so Apify never holds the page; a failed read hides it.
 */
import { loadSetupSignals } from '@/app/(dashboard)/guia/data';
import { SetupGuide, SetupStrip } from '@/components/onboarding/setup-guide';

export async function HomeSetup({ full = false }: { full?: boolean }) {
  const signals = await loadSetupSignals().catch((error: unknown) => {
    console.error('No se pudo leer el estado de la guía de configuración', error);
    return null;
  });
  if (!signals) return null;
  return full ? <SetupGuide signals={signals} /> : <SetupStrip signals={signals} />;
}
