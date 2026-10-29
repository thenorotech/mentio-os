# Security

## Reporting a vulnerability

Report it privately through GitHub: **Security → Report a vulnerability** on this repository, with the details and, if you can, the steps to reproduce. Please do not open a public issue for a security problem.

## How this app handles secrets

- API keys are read on the server only (`src/lib/mentio.ts`, `src/lib/accounts.ts`). Pages render on the server, writes are server actions and exports are route handlers, so no key reaches the browser.
- Set `DATABASE_URL` and `AUTH_SECRET` on any deployment that is not your own machine. Each account signs in with its own email and password and works on its own workspace with its own key. Passwords are scrypt hashes, API keys are sealed with AES-256-GCM under a key derived from `AUTH_SECRET`, and the session cookie carries only the account id. Without them, whoever can open the app acts with `MENTIO_API_KEY`'s workspace.
- A read-only key (`scope: read`) gives a dashboard that cannot change anything: every write is refused by the API.
