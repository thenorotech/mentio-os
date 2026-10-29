/**
 * The API client, server side only. The API key is resolved here and
 * nowhere else: the signed-in account's key (src/lib/accounts.ts) when
 * DATABASE_URL is set, MENTIO_API_KEY otherwise. It is looked up on every
 * request, so one client serves every account. Pages and server actions
 * import `mentio()`, and nothing that imports this file can be bundled for
 * the browser (the `typeof window` check fails loudly if it ever is).
 */
import { createMentio } from '@mentio-dev/sdk';
import { auth } from '@/auth';
import { apiErrorMessage } from '@/lib/action';
import { accountsEnabled, apiKeyFor } from '@/lib/accounts';

if (typeof window !== 'undefined') {
  throw new Error('Este módulo solo se ejecuta en el servidor: la clave de API nunca debe llegar al navegador.');
}

async function apiKey(): Promise<string> {
  if (accountsEnabled()) {
    const key = await apiKeyFor((await auth())?.user?.id);
    if (!key) throw new Error('Tu sesión terminó. Vuelve a entrar.');
    return key;
  }
  const key = process.env.MENTIO_API_KEY;
  if (!key) {
    throw new Error('La clave de API no está configurada. Copia .env.example a .env.local y agrega tu clave.');
  }
  return key;
}

let client: ReturnType<typeof createMentio> | undefined;

export function mentio() {
  if (client) return client;
  // The placeholder key is never sent: `auth` below replaces it per request.
  client = createMentio({ apiKey: '', ...(process.env.MENTIO_API_URL ? { baseUrl: process.env.MENTIO_API_URL } : {}) });
  client.client.setConfig({ auth: apiKey });
  return client;
}

/** The SDK never throws on a non-2xx; this turns an error body into one. */
export function reportApiError(status: number | undefined, original: unknown) {
  console.error('Error del servicio de datos', { status, error: original });
}

export function unwrap<T>(result: { data?: T; error?: unknown; response?: Response }): T {
  if (result.error !== undefined || result.data === undefined) {
    const body = result.error as { error?: { code?: string; message?: string } } | undefined;
    const status = result.response?.status;
    const original = body?.error?.message ?? result.error ?? 'Respuesta vacía del servicio';
    reportApiError(status, original);
    const error = new Error(apiErrorMessage(status)) as Error & { apiStatus?: number };
    if (status !== undefined) error.apiStatus = status;
    throw error;
  }
  return result.data;
}

/** The workspace name a key opens, or null when the API refuses the key. */
export async function workspaceForKey(key: string): Promise<string | null> {
  const probe = createMentio({ apiKey: key, ...(process.env.MENTIO_API_URL ? { baseUrl: process.env.MENTIO_API_URL } : {}) });
  const result = await probe.whoami().catch(() => null);
  return result?.data?.workspace.name ?? null;
}
