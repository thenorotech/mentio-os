/**
 * The dashboard's accounts, server side only, stored in Postgres (Prisma,
 * prisma/schema.prisma). Each account signs in with its own email and
 * password and works on its own Mentio workspace through its own API key,
 * so keywords, channels, alerts and settings are per account. Passwords are
 * scrypt hashes; API keys are sealed with AES-256-GCM under a key derived
 * from AUTH_SECRET, so a database dump alone leaks neither. Without
 * DATABASE_URL the app is open and uses MENTIO_API_KEY.
 */
import { createCipheriv, createDecipheriv, createHash, randomBytes, scrypt, timingSafeEqual } from 'node:crypto';
import { promisify } from 'node:util';
import { cache } from 'react';
import { Prisma } from '@/generated/prisma/client';
import { databaseEnabled, db } from '@/lib/db';

if (typeof window !== 'undefined') {
  throw new Error('Este módulo solo se ejecuta en el servidor: las claves de API nunca deben llegar al navegador.');
}

/** What the session and the UI may know about an account: no key, no hash. */
export type AccountProfile = { id: string; name: string; email: string };

const PROFILE = { id: true, name: true, email: true } satisfies Prisma.AccountSelect;

/** Whether sign-in is on. Off, the app is open (fine on localhost only). */
export const accountsEnabled = databaseEnabled;

const normalizeEmail = (email: string) => email.trim().toLowerCase();

// Passwords

const derive = promisify(scrypt) as (password: string, salt: Buffer, keylen: number) => Promise<Buffer>;
const KEY_LENGTH = 64;

async function hashPassword(password: string): Promise<string> {
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

// API keys at rest

function sealingKey(): Buffer {
  const secret = process.env.AUTH_SECRET;
  if (!secret) throw new Error('AUTH_SECRET no está configurada.');
  return createHash('sha256').update(`agora-api-key-v1:${secret}`).digest();
}

function seal(plain: string): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', sealingKey(), iv);
  const data = Buffer.concat([cipher.update(plain, 'utf8'), cipher.final()]);
  return ['v1', iv, cipher.getAuthTag(), data].map((part) => (typeof part === 'string' ? part : part.toString('base64url'))).join(':');
}

function unseal(sealed: string): string {
  const [version, iv = '', tag = '', data = ''] = sealed.split(':');
  if (version !== 'v1') throw new Error('Clave de API con un formato desconocido.');
  const decipher = createDecipheriv('aes-256-gcm', sealingKey(), Buffer.from(iv, 'base64url'));
  decipher.setAuthTag(Buffer.from(tag, 'base64url'));
  return Buffer.concat([decipher.update(Buffer.from(data, 'base64url')), decipher.final()]).toString('utf8');
}

// Reads (memoized per request: auth() runs on every API call of a page)

export const accountById = cache(async (id: string | undefined): Promise<AccountProfile | null> =>
  id ? db().account.findUnique({ where: { id }, select: PROFILE }) : null,
);

/** The account's Mentio API key, or null when the account no longer exists. */
export const apiKeyFor = cache(async (id: string | undefined): Promise<string | null> => {
  if (!id) return null;
  const row = await db().account.findUnique({ where: { id }, select: { apiKey: true } });
  return row ? unseal(row.apiKey) : null;
});

/** The account for an email and password, or null. */
export async function verifyCredentials(email: string, password: string): Promise<AccountProfile | null> {
  const row = await db().account.findUnique({ where: { email: normalizeEmail(email) }, select: { ...PROFILE, passwordHash: true } });
  const ok = await matches(password, row?.passwordHash ?? DECOY);
  return row && ok ? { id: row.id, name: row.name, email: row.email } : null;
}

// Writes

export class EmailTakenError extends Error {}

export async function createAccount(input: { name: string; email: string; password: string; apiKey: string }): Promise<AccountProfile> {
  try {
    return await db().account.create({
      data: {
        name: input.name.trim(),
        email: normalizeEmail(input.email),
        passwordHash: await hashPassword(input.password),
        apiKey: seal(input.apiKey.trim()),
      },
      select: PROFILE,
    });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') throw new EmailTakenError();
    throw error;
  }
}
