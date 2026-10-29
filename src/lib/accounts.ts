/**
 * The dashboard's accounts, server side only, stored in Postgres (Prisma,
 * prisma/schema.prisma). Each account signs in with its own email and
 * password; every account works on the one Mentio workspace of
 * MENTIO_API_KEY, which never leaves the env. Passwords are scrypt hashes.
 * Without DATABASE_URL the app is open.
 */
import { randomBytes, scrypt, timingSafeEqual } from 'node:crypto';
import { promisify } from 'node:util';
import { cache } from 'react';
import { Prisma } from '@/generated/prisma/client';
import { databaseEnabled, db } from '@/lib/db';

if (typeof window !== 'undefined') {
  throw new Error('Este módulo solo se ejecuta en el servidor: las contraseñas nunca deben llegar al navegador.');
}

/** What the session and the UI may know about an account: no hash. */
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

// Reads (memoized per request: auth() runs on every API call of a page)

export const accountById = cache(async (id: string | undefined): Promise<AccountProfile | null> =>
  id ? db().account.findUnique({ where: { id }, select: PROFILE }) : null,
);

/** The account for an email and password, or null. */
export async function verifyCredentials(email: string, password: string): Promise<AccountProfile | null> {
  const row = await db().account.findUnique({ where: { email: normalizeEmail(email) }, select: { ...PROFILE, passwordHash: true } });
  const ok = await matches(password, row?.passwordHash ?? DECOY);
  return row && ok ? { id: row.id, name: row.name, email: row.email } : null;
}

// Writes

export class EmailTakenError extends Error {}

export async function createAccount(input: { name: string; email: string; password: string }): Promise<AccountProfile> {
  try {
    return await db().account.create({
      data: {
        name: input.name.trim(),
        email: normalizeEmail(input.email),
        passwordHash: await hashPassword(input.password),
      },
      select: PROFILE,
    });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') throw new EmailTakenError();
    throw error;
  }
}
