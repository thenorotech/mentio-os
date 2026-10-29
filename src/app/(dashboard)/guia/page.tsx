import { SetupGuide } from '@/components/onboarding/setup-guide';
import { PageHeader } from '@/components/ui';
import { loadSetupSignals } from './data';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Guía de configuración' };

/** Where every tracked phrase, profile, event and alert is configured, in the order to set them up. */
export default async function Guia() {
  const signals = await loadSetupSignals();
  return (
    <div className="mx-auto grid max-w-3xl">
      <PageHeader title="Guía de configuración" description="Lo que Ágora rastrea en internet y dónde se configura cada cosa: frases, perfiles, eventos y avisos." />
      <SetupGuide signals={signals} />
    </div>
  );
}
