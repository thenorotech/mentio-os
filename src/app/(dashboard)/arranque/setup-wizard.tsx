'use client';

import { useEffect, useRef, useState, type KeyboardEvent } from 'react';
import { ArrowLeft, ArrowRight, Check, Info, Plus, X } from 'lucide-react';
import { Field, Input, TokenInput, cx } from '@/components/ui';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter, CardHeader } from '@/components/ui/card';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { SubmitButton } from '@/components/ui/client';
import { entity } from '@/entity.config';

const STEPS = [
  { label: 'La entidad', hint: 'El nombre oficial y las formas en que la gente la menciona.' },
  { label: 'Referentes', hint: 'Opcional: otras dependencias u operadores con los que compararla.' },
  { label: 'Temas', hint: 'De qué asuntos quieres seguir la conversación.' },
] as const;

const SUGGESTED_TOPICS = entity.topics;

type CompetitorRow = { id: number; name: string };

export function SetupWizard() {
  const [step, setStep] = useState(0);
  const [entityName, setEntityName] = useState(entity.name);
  const [competitors, setCompetitors] = useState<CompetitorRow[]>([{ id: 1, name: '' }]);
  const [campaignName, setCampaignName] = useState(entity.shortName);
  const [selectedTopics, setSelectedTopics] = useState<string[]>([...entity.topics]);
  const [stepError, setStepError] = useState('');
  const percent = Math.round(((step + 1) / STEPS.length) * 100);
  const isLast = step === STEPS.length - 1;

  // On a step change, focus moves to the step's title so a screen reader
  // announces where the person is (never on the first render).
  const titleRef = useRef<HTMLHeadingElement>(null);
  const firstRender = useRef(true);
  useEffect(() => {
    if (firstRender.current) {
      firstRender.current = false;
      return;
    }
    titleRef.current?.focus();
  }, [step]);

  function next() {
    setStepError('');
    if (step === 0 && !entityName.trim()) {
      setStepError('Escribe el nombre de la entidad para continuar.');
      return;
    }
    setStep((current) => Math.min(current + 1, STEPS.length - 1));
  }

  function back() {
    setStepError('');
    setStep((current) => Math.max(current - 1, 0));
  }

  /** Enter in a field before the last step continues instead of sending the half-filled form. */
  function onKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (isLast || event.key !== 'Enter' || event.defaultPrevented) return;
    if (!(event.target instanceof HTMLInputElement)) return;
    event.preventDefault();
    next();
  }

  function addCompetitor() {
    if (competitors.length >= 10) return;
    setCompetitors((current) => [...current, { id: Math.max(0, ...current.map((item) => item.id)) + 1, name: '' }]);
  }

  function removeCompetitor(id: number) {
    setCompetitors((current) => current.filter((item) => item.id !== id));
  }

  function updateCompetitor(id: number, name: string) {
    setCompetitors((current) => current.map((item) => (item.id === id ? { ...item, name } : item)));
  }

  return (
    <div className="grid gap-4" onKeyDown={onKeyDown}>
      <nav aria-label="Pasos del asistente">
        <ol className="grid grid-cols-3 gap-2">
          {STEPS.map((item, index) => {
            const done = index < step;
            const current = index === step;
            return (
              <li key={item.label} aria-current={current ? 'step' : undefined} className="grid gap-2">
                <span aria-hidden className={cx('h-1 rounded-full transition-colors duration-300', done || current ? 'bg-primary' : 'bg-muted')} />
                <span className={cx('flex min-w-0 items-center gap-2 text-xs', current ? 'font-medium text-foreground' : 'text-muted-foreground')}>
                  <span
                    aria-hidden
                    className={cx(
                      'grid size-5 shrink-0 place-items-center rounded-full border text-[11px] tabular-nums transition-colors',
                      done ? 'border-primary bg-primary text-primary-foreground' : current ? 'border-primary text-primary' : 'border-border',
                    )}
                  >
                    {done ? <Check className="size-3" /> : index + 1}
                  </span>
                  <span className="truncate @max-md:sr-only">{item.label}</span>
                  <span className="sr-only">{done ? ' (completado)' : current ? ' (paso actual)' : ''}</span>
                </span>
              </li>
            );
          })}
        </ol>
      </nav>

      <Card className="gap-0 py-0">
        <CardHeader className="gap-1 border-b py-4">
          <p className="text-[11px] font-medium tracking-wide text-muted-foreground uppercase tabular-nums">
            Paso {step + 1} de {STEPS.length}
          </p>
          <h2 ref={titleRef} tabIndex={-1} className="rounded-sm text-base font-semibold focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-none">
            {STEPS[step].label}
          </h2>
          <p className="text-sm text-pretty text-muted-foreground">{STEPS[step].hint}</p>
          <div
            role="progressbar"
            aria-label="Progreso del asistente"
            aria-valuemin={1}
            aria-valuemax={STEPS.length}
            aria-valuenow={step + 1}
            aria-valuetext={`Paso ${step + 1} de ${STEPS.length}: ${STEPS[step].label}`}
            className="sr-only"
          >
            {percent}%
          </div>
        </CardHeader>

        <CardContent className="py-5">
          <section hidden={step !== 0} aria-labelledby="entity-step-title" className="grid gap-5">
            <h3 id="entity-step-title" className="sr-only">Datos de la entidad</h3>
            <Field label="Nombre oficial">
              <Input name="entityName" value={entityName} onChange={(event) => setEntityName(event.target.value)} placeholder={`Ej. ${entity.name}`} />
            </Field>
            <Field label="Siglas y variantes" hint="Presiona Enter después de cada nombre. Cada variante se seguirá como un término propio.">
              <TokenInput name="brandVariants" defaultValue={entity.aliases} placeholder="Ej. Puentes Fronterizos, FPFCH" max={20} />
            </Field>
            <Field label="Nombre del monitoreo (opcional)" hint={`Si lo dejas vacío, usaremos “${entityName.trim() || 'la entidad'}”.`}>
              <Input name="campaignName" value={campaignName} onChange={(event) => setCampaignName(event.target.value)} placeholder={`Ej. ${entity.shortName}`} />
            </Field>
          </section>

          <section hidden={step !== 1} aria-labelledby="competitors-step-title" className="grid gap-3">
            <h3 id="competitors-step-title" className="sr-only">Referentes</h3>
            <ul className="grid gap-3">
              {competitors.map((competitor, index) => (
                <li key={competitor.id} className="grid gap-4 rounded-lg border bg-muted/20 p-4">
                  <input type="hidden" name="competitorIds" value={competitor.id} />
                  <div className="flex min-h-7 items-center justify-between gap-3">
                    <p className="text-sm font-medium">Referente {index + 1}</p>
                    {competitors.length > 1 ? (
                      <Button type="button" variant="ghost" size="icon-sm" aria-label={`Quitar referente ${index + 1}${competitor.name.trim() ? `: ${competitor.name.trim()}` : ''}`} onClick={() => removeCompetitor(competitor.id)}>
                        <X aria-hidden="true" />
                      </Button>
                    ) : null}
                  </div>
                  <div className="grid gap-4 @xl:grid-cols-2">
                    <Field label="Nombre">
                      <Input name={`competitorName_${competitor.id}`} value={competitor.name} onChange={(event) => updateCompetitor(competitor.id, event.target.value)} placeholder="Ej. Aduana de Ciudad Juárez" />
                    </Field>
                    <Field label="Apodos y variantes">
                      <TokenInput name={`competitorVariants_${competitor.id}`} placeholder="Ej. ANAM Juárez" max={10} />
                    </Field>
                  </div>
                </li>
              ))}
            </ul>
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
              <Button type="button" variant="outline" size="sm" onClick={addCompetitor} disabled={competitors.length >= 10}>
                <Plus aria-hidden="true" /> Agregar referente
              </Button>
              <p className="text-xs text-muted-foreground tabular-nums">{competitors.length} de 10 referentes</p>
            </div>
          </section>

          <section hidden={step !== 2} aria-labelledby="topics-step-title" className="grid gap-5">
            <h3 id="topics-step-title" className="sr-only">Temas de conversación</h3>
            <Field label="Temas sugeridos" hint="Elige los que quieras seguir; también puedes añadir otros abajo." group>
              <ToggleGroup
                multiple
                spacing={1.5}
                value={selectedTopics}
                onValueChange={(next) => setSelectedTopics(next)}
                aria-label="Temas sugeridos"
                className="flex-wrap"
              >
                {SUGGESTED_TOPICS.map((topic) => (
                  <ToggleGroupItem key={topic} value={topic} variant="outline" className="h-8 px-3 text-xs font-normal data-pressed:border-primary/40 data-pressed:bg-brand-soft data-pressed:text-primary">
                    {topic}
                  </ToggleGroupItem>
                ))}
              </ToggleGroup>
            </Field>
            {selectedTopics.map((topic) => <input key={topic} type="hidden" name="suggestedTopics" value={topic} />)}
            <Field label="Otros temas" hint="Opcional. Puedes escribir varios y presionar Enter después de cada uno.">
              <TokenInput name="freeTopics" placeholder="Ej. Puente Lerdo" max={20} />
            </Field>
            <p className="flex items-start gap-2 rounded-lg bg-muted/60 px-3 py-2.5 text-xs text-pretty text-muted-foreground">
              <Info aria-hidden className="mt-px size-3.5 shrink-0" />
              Al terminar crearemos un monitoreo con la entidad, sus referentes y los temas que elegiste. Cada nombre o variante será un término de seguimiento.
            </p>
          </section>

          {stepError ? <p role="alert" className="mt-4 text-sm text-destructive">{stepError}</p> : null}
        </CardContent>

        <CardFooter className="justify-between gap-3 bg-muted/30 py-3">
          {step > 0 ? (
            <Button type="button" variant="ghost" onClick={back}>
              <ArrowLeft aria-hidden="true" /> Volver
            </Button>
          ) : <span />}
          {isLast ? (
            <SubmitButton>Crear mi tablero</SubmitButton>
          ) : (
            <Button type="button" onClick={next}>
              Continuar <ArrowRight aria-hidden="true" />
            </Button>
          )}
        </CardFooter>
      </Card>
    </div>
  );
}
