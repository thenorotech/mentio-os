/**
 * The sign-in gate (src/auth.ts): with AUTH_ACCOUNTS set, every page, server
 * action and export needs a session; without one a request goes to /login
 * and comes back where it started. Without AUTH_ACCOUNTS the app is open.
 */
import { NextResponse, type NextFetchEvent, type NextRequest } from 'next/server';
import { auth } from '@/auth';
import { accountsEnabled } from '@/lib/accounts';

const gate = auth((request) => {
  if (request.auth) return NextResponse.next();
  const login = new URL('/login', request.url);
  const back = request.nextUrl.pathname + request.nextUrl.search;
  if (back !== '/') login.searchParams.set('next', back);
  return NextResponse.redirect(login);
});

export function proxy(request: NextRequest, event: NextFetchEvent) {
  return accountsEnabled() ? gate(request, event) : NextResponse.next();
}

export const config = {
  // Everything but the login page, Auth.js's own routes and Next's static files.
  matcher: ['/((?!login|api/auth|_next/static|_next/image|favicon.ico|.*\\.(?:png|svg|jpg|ico|webp)$).*)'],
};
