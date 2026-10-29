/**
 * The Prisma client, server side only, one per process (and one across hot
 * reloads in development). Only src/lib/accounts.ts uses it.
 */
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '@/generated/prisma/client';

if (typeof window !== 'undefined') {
  throw new Error('Este módulo solo se ejecuta en el servidor.');
}

const globalForDb = globalThis as unknown as { db?: PrismaClient };

export const databaseEnabled = () => Boolean(process.env.DATABASE_URL);

export function db(): PrismaClient {
  if (globalForDb.db) return globalForDb.db;
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error('DATABASE_URL no está configurada.');
  const client = new PrismaClient({ adapter: new PrismaPg({ connectionString: url }) });
  globalForDb.db = client;
  return client;
}
