/** A run's normalized items as CSV, one row per post, article or search result. */
import { getRun } from '@/lib/apify';
import { interactions, isSourceKey, type ScrapedItem } from '@/lib/scraping/sources';
import { runItems } from '@/app/(dashboard)/redes/data';

export const dynamic = 'force-dynamic';

const COLUMNS: Array<[string, (i: ScrapedItem) => string | number | null]> = [
  ['fuente', (i) => i.source],
  ['tipo', (i) => i.kind],
  ['id', (i) => i.id],
  ['url', (i) => i.url],
  ['fecha', (i) => i.publishedAt],
  ['autor', (i) => i.author],
  ['seguidores', (i) => i.authorFollowers],
  ['titulo', (i) => i.title],
  ['texto', (i) => i.text],
  ['likes', (i) => i.likes],
  ['comentarios', (i) => i.comments],
  ['compartidos', (i) => i.shares],
  ['vistas', (i) => i.views],
  ['interacciones', (i) => interactions(i)],
  ['hashtags', (i) => i.hashtags.join(' ')],
  ['medio_o_dominio', (i) => i.outlet],
  ['busqueda', (i) => i.query],
  ['posicion', (i) => i.position],
];

/** Quoted when needed; a leading =, +, - or @ is defused so a spreadsheet never runs it as a formula. */
const cell = (value: string | number | null) => {
  if (value === null) return '';
  const text = String(value).replace(/^[=+\-@]/, "'$&");
  return /[",\n\r]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
};

export async function GET(_: Request, { params }: { params: Promise<{ source: string; id: string }> }) {
  const { source, id } = await params;
  const run = isSourceKey(source) ? await getRun(source, id) : null;
  if (!run) return new Response('No encontrado', { status: 404 });
  const items = await runItems(run, 10_000);
  const csv = [COLUMNS.map(([name]) => name).join(','), ...items.map((i) => COLUMNS.map(([, get]) => cell(get(i))).join(','))].join('\n');
  return new Response(`﻿${csv}\n`, {
    headers: { 'content-type': 'text/csv; charset=utf-8', 'content-disposition': `attachment; filename="agora-${source}-${run.id}.csv"` },
  });
}
