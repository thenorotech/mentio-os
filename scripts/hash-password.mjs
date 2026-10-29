/**
 * Prints the scrypt hash of a password for AUTH_ACCOUNTS, in the format
 * src/lib/accounts.ts checks: `scrypt:<salt hex>:<hash hex>`.
 * Usage: npm run hash-password -- 'the password'
 */
import { randomBytes, scryptSync } from 'node:crypto';

const password = process.argv[2];
if (!password) {
  console.error("Uso: npm run hash-password -- 'tu contraseña'");
  process.exit(1);
}
const salt = randomBytes(16);
console.log(`scrypt:${salt.toString('hex')}:${scryptSync(password, salt, 64).toString('hex')}`);
