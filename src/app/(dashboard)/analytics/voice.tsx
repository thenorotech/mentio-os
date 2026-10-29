import Link from 'next/link';
import { ChartColumn, Megaphone } from 'lucide-react';
import { Badge, CHART_COLORS, Card, EmptyState, LinkButton, OTHER_COLOR, SectionHeading, Table, td, TableCell, TableRow } from '@/components/ui';
import { InfoTip } from '@/components/info-tip';
import { compact } from '@/lib/format';
import { GLOSSARY } from '@/lib/glossary';
import { mentio, unwrap } from '@/lib/mentio';
import { AnalyticsEmpty, Delta, ShareBar } from './charts';
import { keywordName, mentionsHref, type WindowQuery } from './window';

/** Your candidate keywords against the opposition's keywords. */
export async function ShareOfVoice({ query }: { query: WindowQuery }) {
  const report = unwrap(await mentio().getShareOfVoice({ query: { ...query, compare: true } }));
  const link = (keywordId: string) => mentionsHref(report.window, query, { keywordIds: keywordId });
  const ranked = report.data.filter((r) => r.share !== null);
  const topics = report.data.filter((r) => r.share === null);
  const totalCandidateMentions = ranked.reduce((sum, row) => sum + row.matched, 0);

  // Each series keeps a palette color; past the palette the rest fold into "Otros" so no two terms share a color.
  const shares = ranked.map((r) => ({ label: keywordName(r.keyword), value: r.share ?? 0, href: link(r.keyword.id) as string | undefined }));
  const fits = shares.length <= CHART_COLORS.length;
  const kept = fits ? shares : shares.slice(0, CHART_COLORS.length - 1);
  const items = kept.map((s, i) => ({ ...s, color: CHART_COLORS[i] }));
  if (!fits) items.push({ label: 'Otros', value: shares.slice(kept.length).reduce((sum, s) => sum + s.value, 0), href: undefined, color: OTHER_COLOR });

  if (report.data.length === 0) {
    return <EmptyState icon={ChartColumn} title="No hay menciones en este periodo." example="Al seguir a “María López” y “José Pérez”, aquí verás qué parte de la conversación recibe cada uno." action={<LinkButton href="/keywords/new" variant="primary">Agregar términos a la campaña</LinkButton>}>La participación de voz compara las menciones de candidatos y adversarios durante el periodo elegido.</EmptyState>;
  }

  return (
    <div className="flex flex-col gap-6">
      <Card
        index={0}
        title="Participación de voz"
        hint={GLOSSARY['participación de voz'].definition}
        description="Proporción de menciones de candidatos y adversarios; los temas de agenda se muestran aparte en la tabla. Clasifica cada término en Candidatos y temas."
      >
        {ranked.length && totalCandidateMentions ? (
          <ShareBar items={items} />
        ) : (
          <AnalyticsEmpty
            title="Aún no hay menciones para comparar"
            example="Registra a “María López” como candidata y a “José Pérez” como adversario para comparar la conversación."
            action={{ href: '/keywords/new', label: 'Agregar candidato o adversario' }}
          />
        )}
      </Card>

      <section aria-labelledby="voice-terms" className="flex flex-col gap-4">
        <SectionHeading id="voice-terms" icon={Megaphone} title="Detalle por término" description="Menciones, cambio frente al periodo anterior, relevancia, tono e intención de cada término monitoreado." />
        <Table head={[
          <span className="inline-flex items-center gap-1">Término monitoreado <InfoTip text="Candidato, adversario o tema que la campaña decidió seguir." /></span>,
          <span className="inline-flex items-center gap-1">Tipo <InfoTip text="Indica si el término es de tu candidato, de un adversario o de un tema de agenda." /></span>,
          <span className="inline-flex items-center gap-1">Participación <InfoTip term="participación de voz" /></span>,
          <span className="inline-flex items-center gap-1">Menciones <InfoTip term="menciones" /></span>,
          <span className="inline-flex items-center gap-1">Cambio <InfoTip text="Variación de menciones frente al periodo anterior." /></span>,
          <span className="inline-flex items-center gap-1">Relevantes <InfoTip term="relevancia" /></span>,
          <span className="inline-flex items-center gap-1">Negativas <InfoTip term="sentimiento o tono" /></span>,
          <span className="inline-flex items-center gap-1">Intención de apoyo <InfoTip term="intención" /></span>,
        ]}>
          {[...ranked, ...topics].map((r) => (
            <TableRow key={r.keyword.id}>
              <TableCell className={td}>
                <Link href={link(r.keyword.id)} className="font-medium hover:underline">{keywordName(r.keyword)}</Link>
              </TableCell>
              <TableCell className={td}>
                <Badge tone={r.keyword.kind === 'brand' ? 'accent' : r.keyword.kind === 'competitor' ? 'warn' : 'neutral'}>{{ brand: 'Candidato', competitor: 'Adversario', topic: 'Tema' }[r.keyword.kind]}</Badge>
              </TableCell>
              <TableCell className={`${td} tabular-nums`}>{r.share === null ? <span className="text-muted-foreground">—</span> : `${r.share.toFixed(1)}%`}</TableCell>
              <TableCell className={`${td} tabular-nums`}>{compact(r.matched)}</TableCell>
              <TableCell className={`${td} text-xs whitespace-nowrap`}><Delta current={r.matched} previous={r.previous?.matched} short /></TableCell>
              <TableCell className={`${td} tabular-nums`}>{compact(r.relevant)}</TableCell>
              <TableCell className={`${td} tabular-nums`}>{compact(r.negative)}</TableCell>
              <TableCell className={`${td} tabular-nums`}>{compact(r.buyIntent)}</TableCell>
            </TableRow>
          ))}
        </Table>
      </section>
    </div>
  );
}
