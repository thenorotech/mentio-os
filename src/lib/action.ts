/**
 * How every write reports back. A server action takes the previous state and
 * the form, and returns a message the form shows inline: `ok` on success,
 * `error` with a localized message on failure, so the user gets clear
 * feedback next to the button instead of an error page.
 */
export type ActionState = { ok?: string; error?: string; at?: number } | null;

export function apiErrorMessage(status?: number): string {
  if (status === 401 || status === 403) return 'No tienes permiso para esta acción';
  if (status === 404) return 'No encontrado';
  if (status === 409) return 'Hay un conflicto con los datos actuales. Actualiza la página e inténtalo de nuevo';
  if (status === 400 || status === 422) return 'Revisa los datos';
  if (status === 429) return 'Demasiadas solicitudes, intenta en un momento';
  if (status !== undefined && status >= 500 && status < 600) return 'El servicio no está disponible, intenta más tarde';
  return 'No se pudo completar la solicitud. Intenta de nuevo más tarde';
}

export async function run(work: () => Promise<string | void>): Promise<ActionState> {
  try {
    const message = await work();
    return { ok: message || 'Guardado', at: Date.now() };
  } catch (error) {
    // redirect() and notFound() work by throwing; let them through.
    if (error && typeof error === 'object' && 'digest' in error && String((error as { digest: unknown }).digest).startsWith('NEXT_')) throw error;
    const status = error && typeof error === 'object' && 'apiStatus' in error
      ? Number((error as { apiStatus: unknown }).apiStatus)
      : undefined;
    if (Number.isFinite(status)) return { error: apiErrorMessage(status), at: Date.now() };
    const message = error instanceof Error ? error.message : 'Ocurrió un error inesperado.';
    if (/mentio|apify|https?:|\/v[12]\//i.test(message)) {
      console.error('Error interno en una acción', message);
      return { error: apiErrorMessage(), at: Date.now() };
    }
    return { error: message, at: Date.now() };
  }
}
