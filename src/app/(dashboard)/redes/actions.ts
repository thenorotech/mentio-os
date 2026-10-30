'use server';

import { revalidatePath } from 'next/cache';
import { run, type ActionState } from '@/lib/action';
import { abortRun, getRun, searchLocale, startRun } from '@/lib/apify';
import { int, lines, list, str } from '@/lib/form';
import { SOURCES, SOURCE_KEYS, isSourceKey } from '@/lib/scraping/sources';

const MAX_TARGETS = 20;
const MAX_LIMIT = 500;

/** Starts one Apify run per chosen source with the same targets (no source chosen means every source). */
export async function startScrapeAction(_: ActionState, form: FormData): Promise<ActionState> {
  return run(async () => {
    const chosen = list(form, 'sources').filter(isSourceKey);
    const sources = chosen.length ? chosen : [...SOURCE_KEYS];
    const targets = [...new Set(lines(form, 'targets'))].slice(0, MAX_TARGETS);
    if (targets.length === 0) throw new Error('Agrega al menos una cuenta, hashtag, término o URL.');
    const limit = Math.min(MAX_LIMIT, Math.max(1, int(form, 'limit') ?? 50));
    const days = int(form, 'days');
    const scrape = { targets, limit, days: days && days > 0 ? Math.min(days, 365) : null, ...searchLocale() };

    // Each source gets only the targets its actor takes (no search terms as Instagram profiles); one with none is skipped.
    const plan = sources.map((s) => ({ source: s, targets: targets.filter(SOURCES[s].accepts) })).filter((p) => p.targets.length);
    const skipped = sources.filter((s) => !plan.some((p) => p.source === s)).map((s) => SOURCES[s].label);
    if (plan.length === 0) throw new Error('Ninguna fuente elegida acepta estos objetivos: usa @cuentas o #hashtags para redes y texto para Google y Noticias.');

    const settled = await Promise.allSettled(plan.map((p) => startRun(p.source, { ...scrape, targets: p.targets })));
    const started = plan.filter((_, i) => settled[i].status === 'fulfilled').map((p) => SOURCES[p.source].label);
    const failed = plan.filter((_, i) => settled[i].status === 'rejected').map((p) => SOURCES[p.source].label);
    revalidatePath('/redes');
    revalidatePath('/redes/recolecciones');
    if (started.length === 0) throw new Error(`No se pudo iniciar en ${failed.join(', ')}. Inténtalo de nuevo más tarde.`);
    const notes = [failed.length ? `falló en ${failed.join(', ')}` : '', skipped.length ? `${skipped.join(', ')} sin objetivos compatibles` : ''].filter(Boolean);
    return `Recolección iniciada en ${started.join(', ')}${notes.length ? `; ${notes.join('; ')}` : ''}. Los resultados aparecen al terminar.`;
  });
}

export async function abortScrapeAction(_: ActionState, form: FormData): Promise<ActionState> {
  return run(async () => {
    const source = str(form, 'source');
    const id = str(form, 'id');
    // Only a run of the source in the URL may be stopped.
    const current = isSourceKey(source) ? await getRun(source, id) : null;
    if (!current) throw new Error('No encontrado');
    await abortRun(current.id);
    revalidatePath('/redes/recolecciones');
    revalidatePath(`/redes/recolecciones/${source}/${id}`);
    return 'Recolección detenida';
  });
}
