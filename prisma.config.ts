/**
 * Prisma CLI config. The CLI does not read .env.local, so it is loaded here
 * when present; in production DATABASE_URL comes from the environment.
 */
import { defineConfig } from 'prisma/config';

for (const file of ['.env.local', '.env']) {
  try {
    process.loadEnvFile(file);
  } catch {
    // Missing file: the variables come from the environment.
  }
}

export default defineConfig({
  schema: 'prisma/schema.prisma',
  // Empty is fine for `prisma generate`; `db push` needs the real URL.
  datasource: { url: process.env.DATABASE_URL ?? '' },
});
