/**
 * Sign-in (Auth.js v5): email and password against AUTH_ACCOUNTS
 * (src/lib/accounts.ts). The session is a signed, encrypted JWT cookie that
 * carries only the account id; the API key is looked up on the server on
 * every request, so removing an account from AUTH_ACCOUNTS signs it out.
 */
import NextAuth, { type DefaultSession } from 'next-auth';
import Credentials from 'next-auth/providers/credentials';
import { accountById, profile, verifyCredentials, type AccountProfile } from '@/lib/accounts';

declare module 'next-auth' {
  interface Session {
    user: { id: string } & DefaultSession['user'];
  }
}

export const SESSION_MAX_AGE = 60 * 60 * 24 * 30;

export const { handlers, auth, signIn, signOut } = NextAuth({
  trustHost: true,
  session: { strategy: 'jwt', maxAge: SESSION_MAX_AGE },
  pages: { signIn: '/login' },
  providers: [
    Credentials({
      credentials: { email: { type: 'email' }, password: { type: 'password' } },
      async authorize(credentials) {
        const email = typeof credentials.email === 'string' ? credentials.email : '';
        const password = typeof credentials.password === 'string' ? credentials.password : '';
        if (!email || !password) return null;
        const account = await verifyCredentials(email, password);
        return account ? profile(account) : null;
      },
    }),
  ],
  callbacks: {
    // token.sub is the account id (Auth.js copies user.id into it at sign-in).
    jwt: ({ token }) => (accountById(token.sub) ? token : null),
    session: ({ session, token }) => ({ ...session, user: { ...session.user, id: token.sub ?? '' } }),
  },
});

/** The signed-in account, without its key or hash; null when signed out or removed. */
export async function currentAccount(): Promise<AccountProfile | null> {
  const account = accountById((await auth())?.user?.id);
  return account ? profile(account) : null;
}
