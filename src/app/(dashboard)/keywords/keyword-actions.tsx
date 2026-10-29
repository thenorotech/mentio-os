/** Pause or resume, and delete: the two quick actions on a keyword. */
import type { Keyword } from '@mentio-dev/sdk';
import { ActionForm, SubmitButton } from '@/components/ui/client';
import { deleteKeywordAction, setMutedAction } from './actions';

export function KeywordActions({ keyword, backToList = false, size = 'sm' }: { keyword: Pick<Keyword, 'id' | 'term' | 'muted'>; backToList?: boolean; size?: 'sm' | 'md' }) {
  return (
    <div role="group" aria-label={`Acciones de ${keyword.term}`} className="flex flex-wrap items-start justify-end gap-1.5">
      <ActionForm action={setMutedAction}>
        <input type="hidden" name="id" value={keyword.id} />
        <input type="hidden" name="muted" value={keyword.muted ? 'false' : 'true'} />
        <SubmitButton variant="secondary" size={size}>{keyword.muted ? 'Reanudar' : 'Pausar'}</SubmitButton>
      </ActionForm>
      <ActionForm action={deleteKeywordAction}>
        <input type="hidden" name="id" value={keyword.id} />
        {backToList ? <input type="hidden" name="backToList" value="true" /> : null}
        <SubmitButton variant="danger" size={size} confirm={`¿Eliminar "${keyword.term}"? Se detendrá el monitoreo y se quitarán sus menciones de este espacio de trabajo.`}>
          Eliminar
        </SubmitButton>
      </ActionForm>
    </div>
  );
}
