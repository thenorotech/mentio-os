/**
 * The dashboard's accounts, server side only. Each account signs in with its
 * own email and password and works on its own Mentio workspace through its
 * own API key, so keywords, channels, alerts and settings are per account.
 * They live in AUTH_ACCOUNTS (a JSON array, see .env.example): there is still
 * no database. Without AUTH_ACCOUNTS the app is open and uses MENTIO_API_KEY.
 * Passwords are scrypt hashes (`npm run hash-password`), never plain text.
 */
import { randomBytes, scrypt, timingSafeEqual } from 'node:crypto';
import { promisify } from 'node:util';

if (typeof window !== 'undefined') {
  throw new Error('Este módulo solo se ejecuta en el servidor: las claves de API nunca deben llegar al navegador.');
}

export type Account = {
  id: string;
  name: string;
  email: string;
  /** `scrypt:<salt hex>:<hash hex>` */
  password: string;
  apiKey: string;
};

/** What the session and the UI may know about an account: no key, no hash. */
export type AccountProfile = Pick<Account, 'id' | 'name' | 'email'>;

const derive = promisify(scrypt) as (password: string, salt: Buffer, keylen: number) => Promise<Buffer>;
const KEY_LENGTH = 64;

const text = (value: unknown) => (typeof value === 'string' ? value.trim() : '');

function parse(raw: string): Account[] {
  let list: unknown;
  try {
    list = JSON.parse(raw);
  } catch {
    throw new Error('AUTH_ACCOUNTS no es JSON válido.');
  }
  if (!Array.isArray(list)) throw new Error('AUTH_ACCOUNTS debe ser un arreglo de cuentas.');
  const accounts = list.map((entry: unknown, index): Account => {
    const item = (entry ?? {}) as Record<string, unknown>;
    const account: Account = {
      id: text(item.id),
      name: text(item.name) || text(item.email),
      email: text(item.email).toLowerCase(),
      password: text(item.password),
      apiKey: text(item.apiKey),
    };
    if (!account.id || !account.email || !account.apiKey || !account.password.startsWith('scrypt:')) {
      throw new Error(`AUTH_ACCOUNTS[${index}] necesita id, email, apiKey y password (un hash de npm run hash-password).`);
    }
    return account;
  });
  const ids = new Set(accounts.map((a) => a.id));
  const emails = new Set(accounts.map((a) => a.email));
  if (ids.size !== accounts.length || emails.size !== accounts.length) {
    throw new Error('AUTH_ACCOUNTS repite un id o un email.');
  }
  return accounts;
}

let cache: { raw: string; accounts: Account[] } | undefined;

function accounts(): Account[] {
  const raw = process.env.AUTH_ACCOUNTS?.trim() ?? '';
  if (cache?.raw !== raw) cache = { raw, accounts: raw ? parse(raw) : [] };
  return cache.accounts;
}

/** Whether sign-in is on. Off, the app is open (fine on localhost only). */
export const accountsEnabled = () => accounts().length > 0;

export const accountById = (id: string | undefined) => (id ? accounts().find((a) => a.id === id) : undefined);

export const profile = ({ id, name, email }: Account): AccountProfile => ({ id, name, email });

export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16);
  const hash = await derive(password, salt, KEY_LENGTH);
  return `scrypt:${salt.toString('hex')}:${hash.toString('hex')}`;
}

async function matches(password: string, stored: string): Promise<boolean> {
  const [, saltHex = '', hashHex = ''] = stored.split(':');
  const expected = Buffer.from(hashHex, 'hex');
  if (expected.length !== KEY_LENGTH) return false;
  const given = await derive(password, Buffer.from(saltHex, 'hex'), KEY_LENGTH);
  return timingSafeEqual(given, expected);
}

/** A dummy hash, so an unknown email costs the same time as a wrong password. */
const DECOY = `scrypt:${'00'.repeat(16)}:${'00'.repeat(KEY_LENGTH)}`;

/** The account for an email and password, or null. */
export async function verifyCredentials(email: string, password: string): Promise<Account | null> {
  const account = accounts().find((a) => a.email === email.trim().toLowerCase());
  const ok = await matches(password, account?.password ?? DECOY);
  return account && ok ? account : null;
}
