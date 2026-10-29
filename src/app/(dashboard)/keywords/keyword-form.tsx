/**
 * One form for creating and editing a keyword. Every field of the create and
 * update calls is here; the term is fixed once the keyword exists.
 */
import type { Group, Keyword } from '@mentio-dev/sdk';
import { Card, Checkbox, Field, Input, PlatformPicker, Segmented, Select, SwitchRow, Textarea, TokenInput } from '@/components/ui';
import { ActionForm, SubmitButton } from '@/components/ui/client';
import { InfoTip } from '@/components/info-tip';
import { date, platformName, REVIEW_PLATFORMS, SEARCH_PLATFORMS } from '@/lib/format';
import { createKeywordAction, updateKeywordAction } from './actions';
import { KIND_LABELS, KINDS, sourceKey, takesCountries, takesLanguage } from './shared';

const KIND_HINTS: Record<string, string> = {
  brand: 'La persona que representa a tu campaña. Ejemplo: María López.',
  competitor: 'Una persona de otra campaña para comparar la conversación. Ejemplo: José Pérez.',
  topic: 'Un asunto de agenda que no se refiere a una persona. Ejemplo: seguridad o movilidad.',
};

export function KeywordForm({ keyword, groups }: { keyword?: Keyword; groups: Group[] }) {
  const editing = Boolean(keyword);
  const defaultGroup = groups.find((g) => g.isDefault)?.id ?? '';
  const cap = keyword?.cap ? (keyword.cap.welcome ? keyword.cap.own : keyword.cap.mentions) : null;
  const matching = keyword?.matching;
  // The keyword's own group always appears, so saving never moves it by accident.
  const groupOptions = groups.map((g) => [g.id, g.isDefault ? `${g.name} (predeterminada)` : g.name] as const);
  if (keyword && !groups.some((g) => g.id === keyword.group.id)) groupOptions.unshift([keyword.group.id, keyword.group.name]);

  return (
    <ActionForm action={editing ? updateKeywordAction : createKeywordAction} className="space-y-6">
      {keyword ? <input type="hidden" name="id" value={keyword.id} /> : null}

      <Card index={1} title="Candidato o tema" hint="Elige si vas a monitorear a la persona de tu campaña, a un adversario o un tema de agenda." description="Qué se monitorea y en qué campaña.">
        <div className="grid gap-4 @lg:grid-cols-2">
          {keyword ? (
            <Field label="Término" hint="No puedes cambiar un término después de crearlo.">
              <Input value={keyword.term} readOnly disabled />
            </Field>
          ) : (
            <Field label="Término" hint="Se busca como una frase exacta.">
              <Input name="term" required minLength={2} maxLength={80} placeholder="Nombre del candidato, apodo, adversario o tema de agenda" />
            </Field>
          )}
          <Field group label={<span className="inline-flex items-center gap-1">Tipo <InfoTip text="Candidato: persona de tu campaña. Adversario: persona de otra campaña. Tema: asunto de agenda, como seguridad." /></span>}>
            <Segmented
              name="kind"
              defaultValue={keyword?.kind ?? 'brand'}
              options={KINDS.map((k) => ({ value: k, label: KIND_LABELS[k], description: KIND_HINTS[k] }))}
            />
            <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
              <span>Ver ejemplo y definición:</span>
              <span className="inline-flex items-center gap-1">Candidato <InfoTip term="candidato" /></span>
              <span className="inline-flex items-center gap-1">Adversario <InfoTip term="adversario" /></span>
              <span className="inline-flex items-center gap-1">Tema <InfoTip term="tema" /></span>
            </div>
          </Field>
          <Field label={<span className="inline-flex items-center gap-1">Campaña <InfoTip term="campaña" /></span>} hint="Puedes monitorear un término una vez por campaña.">
            <Select name="groupId" defaultValue={keyword?.group.id ?? defaultGroup} options={groupOptions} />
          </Field>
          <Field label="Límite mensual de menciones" hint="Por mes calendario. Déjalo vacío para no fijar un límite.">
            <Input name="cap" type="number" min={1} max={1000000} defaultValue={cap ?? ''} placeholder="Sin límite" />
          </Field>
        </div>
        <Field className="mt-4" label="Contexto para clasificar menciones" hint="Aclara a quién o qué se refiere el término y qué conversación debe ignorarse. Para un apodo, escribe “Variante de: <término principal>” y conserva el mismo tipo y campaña.">
          <Textarea name="context" rows={2} maxLength={300} defaultValue={keyword?.context ?? ''} placeholder="María López es nuestra candidata; ignora menciones a otras personas con el mismo nombre." />
        </Field>
      </Card>

      <Card index={2} title="Plataformas" description="Dónde se busca el término.">
        <div className="grid gap-4">
          <PlatformPicker name="platforms" options={SEARCH_PLATFORMS} defaultValue={keyword?.platforms ?? null} labels={Object.fromEntries(SEARCH_PLATFORMS.map((p) => [p, platformName(p)]))} />
          <SwitchRow name="reviewsOnly" defaultChecked={keyword?.platforms?.length === 0} label="Solo reseñas" hint="No busques el término en plataformas; recopila únicamente las páginas de reseñas indicadas abajo." />
        </div>
      </Card>

      <Card index={3} title="Reglas de coincidencia" description="Se revisan antes de guardar una mención. Las publicaciones descartadas no se guardan.">
        <div className="grid gap-4 @lg:grid-cols-2">
          <Field label="Términos requeridos" hint="La publicación también debe incluir estos términos.">
            <TokenInput name="requiredTerms" defaultValue={matching?.requiredTerms} placeholder="candidatura, propuesta… presiona Enter" />
          </Field>
          <Field group label="Coincidencia de términos requeridos">
            <Segmented
              name="requiredMode"
              defaultValue={matching?.requiredMode ?? 'any'}
              options={[
                { value: 'any', label: 'Cualquiera', description: 'Basta con que aparezca un término requerido.' },
                { value: 'all', label: 'Todos', description: 'Deben aparecer todos los términos requeridos.' },
              ]}
            />
          </Field>
          <Field label="Términos excluidos" hint="La mención se descarta si aparece alguno. Usa * como comodín: *bot.">
            <TokenInput name="excludedTerms" defaultValue={matching?.excludedTerms} placeholder="empleo, vacante… presiona Enter" />
          </Field>
          <Field label="Autores excluidos" hint="Enlaces, @usuarios o nombres de cuentas.">
            <TokenInput name="excludedAuthors" defaultValue={matching?.excludedAuthors} splitOnComma={false} placeholder="@cuenta_falsa… presiona Enter" />
          </Field>
        </div>
        <div className="mt-4">
          <SwitchRow name="caseSensitive" defaultChecked={matching?.caseSensitive ?? false} label="Distinguir mayúsculas y minúsculas" hint="El término debe aparecer tal como lo escribiste: RAG, no rag." />
        </div>
      </Card>

      <Card
        index={4}
        title="Páginas de reseñas"
        description="Cada reseña de una página conectada se registra como mención. Al agregar una página se recuperan gratis los últimos 30 días."
      >
        {keyword && keyword.reviewSources.length > 0 ? (
          <ul aria-label="Páginas conectadas" className="mb-5 divide-y rounded-lg border">
            {keyword.reviewSources.map((src) => {
              const key = sourceKey(src);
              return (
                <li key={key} className="space-y-2 p-3 text-sm">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="min-w-0">
                      <span className="font-medium">{platformName(src.platform)}</span>{' '}
                      <a href={src.url} target="_blank" rel="noreferrer" className="rounded-sm break-all text-primary hover:underline focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-none">{src.id}</a>
                      <span className="ml-2 text-xs text-muted-foreground">desde {date(src.connectedAt)}</span>
                    </div>
                    <div className="text-destructive">
                      <Checkbox name="removeSource" value={key} label="Eliminar" />
                    </div>
                  </div>
                  {takesCountries(src.platform) || takesLanguage(src.platform) ? (
                    <div className="grid gap-2 @lg:grid-cols-2">
                      {takesCountries(src.platform) ? (
                        <Field label="Países" hint="Códigos de dos letras separados por comas.">
                          <Input name={`${key}.countries`} defaultValue={src.countries.join(', ')} />
                        </Field>
                      ) : null}
                      {takesLanguage(src.platform) ? (
                        <Field label="Idioma">
                          <Input name={`${key}.language`} defaultValue={src.language ?? ''} placeholder="es" />
                        </Field>
                      ) : null}
                    </div>
                  ) : null}
                </li>
              );
            })}
          </ul>
        ) : null}
        <p className="mb-3 text-sm font-medium text-foreground">
          {keyword?.reviewSources.length ? 'Conectar otra página' : 'Conectar una página'} <span className="font-normal text-muted-foreground">(opcional)</span>
        </p>
        <div className="grid gap-4 @lg:grid-cols-2">
          <Field className="@lg:col-span-2" label="Enlace" hint="Una app de App Store o Google Play, una página de Trustpilot o un lugar de Google Maps (también sirve un enlace maps.app.goo.gl).">
            <Input name="rsUrl" type="text" inputMode="url" placeholder="https://apps.apple.com/mx/app/ejemplo/id123456789" />
          </Field>
          <Field label="O elige la plataforma" hint="Indícala si agregas un identificador en lugar de un enlace.">
            <Select name="rsPlatform" placeholder="Detectar del enlace" options={REVIEW_PLATFORMS.map((p) => [p, platformName(p)] as const)} />
          </Field>
          <Field label="Y el identificador" hint="App Store: los dígitos después de id. Google Play: el nombre del paquete. Trustpilot: el dominio. Google Maps: el ID del lugar.">
            <Input name="rsId" placeholder="ejemplo.mx" />
          </Field>
          <Field label="Países" hint="Solo para App Store y Google Play; hasta 20, separados por comas. Predeterminado: el del enlace o México.">
            <Input name="rsCountries" placeholder="mx, us, es" />
          </Field>
          <Field label="Idioma" hint="Solo para Google Play. Predeterminado: el del enlace o español.">
            <Input name="rsLanguage" placeholder="es" />
          </Field>
        </div>
      </Card>

      <div data-slot="form-actions" className="flex items-center justify-between gap-3 border-t pt-4">
        <span className="text-xs text-pretty text-muted-foreground">{editing ? null : 'Un término nuevo recupera de inmediato los últimos 30 días.'}</span>
        <SubmitButton>{editing ? 'Guardar cambios' : 'Agregar término'}</SubmitButton>
      </div>
    </ActionForm>
  );
}
