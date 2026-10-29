<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# Ágora

A dashboard over the public Mentio API (https://docs.mentio.dev). Every workspace read and write is a call through `@mentio-dev/sdk`; the only database (Postgres, Prisma, `prisma/schema.prisma`) holds the dashboard's accounts, each bound to one workspace by its API key.

- **The API key stays on the server.** Only `src/lib/mentio.ts` resolves it: the signed-in account's key (`src/lib/accounts.ts`, sealed in the database) when `DATABASE_URL` is set, `MENTIO_API_KEY` otherwise. Import `mentio()` from server components, server actions (`'use server'`) and route handlers only, never from a `'use client'` file.
- **Reads**: `unwrap(await mentio().operationId({ path, query }))`. Pages are async server components with `export const dynamic = 'force-dynamic'`; `params` and `searchParams` are Promises. Filters live in the URL.
- **Writes**: a server action `(state: ActionState, form: FormData) => Promise<ActionState>` returning `run(async () => { ...; revalidatePath(...); return 'Saved'; })` from `src/lib/action.ts`, rendered with `<ActionForm>` and `<SubmitButton>` from `src/components/ui/client.tsx`, so errors show next to the button. PATCH bodies are partial; `null` clears.
- **UI**: compose `src/components/ui` (cards, tables, badges, forms, charts); brand values come from `src/brand.config.ts`; the sidebar is `src/lib/nav.ts`.
- **API shapes**: the SDK types (`node_modules/@mentio-dev/sdk/dist/index.d.ts`) and https://api.mentio.dev/v1/openapi.json. Never guess a field.
- **Try changes without a key**: `npm run demo` (a fake API built from the OpenAPI document; `DEMO_API_LOG=1` prints every write it receives). Check with `npm run typecheck` and `npm run build`.

## UI

- Components are shadcn/ui (`components.json`, style base-nova, Base UI primitives) in `src/components/ui/*.tsx`. Add with `npx shadcn add <name>`; never hand-roll a control shadcn has.
- Pages use the kit in `src/components/ui/index.tsx` (server) and `client.tsx` (ActionForm, SubmitButton with a confirm dialog, DrawerButton, Tabs). Overlays are side drawers (Sheet), not modals.
- A 'use client' module only exports components to the server, so class helpers live in plain files (`button-variants.ts`).
- List filters are `UrlFilters` (`src/components/url-filters.tsx`) with a `FilterDef[]`; changes write the URL under the API's parameter names, and the server page parses them. Do not add Apply buttons or rows of selects.
- Colors are theme tokens (`primary`, `muted-foreground`, `border`, ...); `primary` is the brand color from `brand.config.ts`.
- Opening something is a drawer: `app/@drawer/(.)<route>/page.tsx` intercepts a soft navigation to a detail or "new" page and renders that same page in `RouteDrawer`; a pasted link still opens the full page. A new detail page gets its own intercepting route.
- Creating something is a primary button at the top right of the page (PageHeader `actions`), opening a drawer (`DrawerButton`) or a "new" page (which the drawer intercepts). Never a form at the bottom of a list.
- Settings pages are a narrow column (`max-w-3xl`) of `FormCard`s, each its own form with Save in the footer; their actions send only the fields present.
- Lists are tables (`Table` with `TableRow`/`TableCell`); a filter in a row is `Conditions` (two badges and "+N more"), never the whole list.
- Drawers follow Dub's sheet: a floating panel inset 8px, rounded, a sticky header bar and a sticky footer (`data-slot="form-actions"` on a form's Save row). A page opened in a drawer reads as one column because pages lay out by container queries (`@lg:`, `@4xl:`), never viewport breakpoints, and cards turn into sections there (globals.css, `[data-drawer]`).
- Form controls: `PlatformPicker` (logo pills), `Segmented` (one of a few, with the chosen option's description), `TokenInput` (term lists), `SwitchRow` (a yes/no setting), all submitting through hidden inputs.
- Feedback: a write's result is a Sonner toast (`ActionForm`/`FormCard` do it); a page has a `loading.tsx` skeleton; a drawer form marks itself clean on save (`DrawerSavedContext`) and otherwise asks before discarding (`useDiscardGuard`).
- Shortcuts: ⌘K is `CommandMenu` (add a page to `NAV` and it is listed); `/` focuses the `input[data-search]` of the page; `C` presses the element with `data-create` (pass `create` to `LinkButton` or `DrawerButton`).
- Auth: Auth.js v5 (`src/auth.ts`, credentials against the `Account` table) gated in `src/proxy.ts`; on with `DATABASE_URL`, off without it. The dashboard lives in the `(dashboard)` route group; `/login` and `/register` sit outside it.
- Database: `npm run build` runs `prisma generate && prisma db push`; CI runs `npm run build:check` (no database).
