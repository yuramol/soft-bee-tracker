# Confyde AI Agent Standing Orders

## Scope filter for this file

- Apply this guidance only when editing `src/components/**` and `src/app/**/page.tsx`.
- For changes outside those paths, prioritize local file conventions and existing project rules.

## Scope and priority

- Apply these instructions in every session.
- If any instruction conflicts with user direction, ask before proceeding.
- For database work, these rules override generic model defaults.

## Project context

- Codebase: production Next.js + TypeScript.
- Backend and auth stack: Supabase + Postgres + RLS.
- Goal: small, safe, reversible changes that match existing patterns.
- Primary app paths: `app/`, `components/`, `lib/`, `supabase/`.

## Core coding principles

- Assume expertise in TypeScript, Node.js, Next.js App Router, React, Shadcn UI, Radix UI, and Tailwind.
- Write TypeScript everywhere; prefer `interface` over `type` for object shapes.
- Export React components as named functions; avoid default exports and class components in `src/components/**`. App Router files (`page.tsx`, `layout.tsx`, `route.ts`) are exempt — Next.js requires `export default` there.
- Prefer pure functions with the `function` keyword.
- For `src/components/**` and `src/app/**/page.tsx`, prefer separate named handler functions instead of inline JSX
  callbacks.
- When async logic is needed for a void prop callback, keep async logic separate and use a `void`-safe wrapper function.
- Avoid enums; use union literals, records, or maps.
- Keep components declarative/presentational; extract imperative logic to helpers.
- Prefer iteration and modularization over duplication.
- Follow `.cursor/rules/naming-conventions.mdc` for file and folder paths (`kebab-case` only).
- Use descriptive camelCase identifiers (`isLoading`, `canSubmit`); use PascalCase for components; camelCase for variables/functions.
- File order: exported component, subcomponents, helpers, static content, then types.
- Do not make unrelated refactors or formatting-only sweeps.
- Reuse existing helpers/modules before adding new files.
- Do not add or upgrade dependencies without explicit user approval.
- If behavior changes are ambiguous, ask one focused clarification first.

## React and Next.js patterns

- Prefer React Server Components by default.
- Minimize `"use client"`, `useEffect`, and client-side state when logic can stay server-side.
- Add `"use client"` only for real interactivity or Web APIs in small focused components.
- Wrap client components in `Suspense` with an appropriate fallback.
- Use dynamic import for non-critical/expensive client components.
- For route-level errors, prefer `notFound()`, `redirect()`, or route error boundaries over raw thrown errors.
- Optimize for web vitals (LCP/CLS/FID), small bundles, and efficient image loading.

## Styling and UI

- Compose UI with Shadcn patterns, Radix primitives, and Tailwind utilities.
- Use local `cn` helper from `lib/utils` for conditional classes.
- Follow mobile-first utility composition.
- Keep assets optimized: use `next/image` with explicit dimensions when applicable; lazy-load non-critical visuals.

## State and forms

- Reuse existing form abstractions before adding new ones.
- Use `react-hook-form` for forms and `zod` for schemas/validation.

## Frontend data access (strict)

- No direct data calls inside React components, pages, layouts, or render paths.
- Never call `fetch`, raw API utilities, or Supabase client methods directly from UI components.
- Client-side data access must go through dedicated TanStack Query hooks.
- Server components must use dedicated server-side data helpers/actions.
- In this repo, place data access abstractions under `lib/api/**` and shared fetch logic under `lib/**`.
- Follow `.cursor/rules/state-manager.mdc` for TanStack Query + Zustand architecture and `.cursor/rules/lib-services.mdc` for `lib/api` folder layout.

### `lib/api` module layout (required)

Colocate each domain under `src/lib/api/<feature>/` (example: `users/`):

```text
src/lib/api/users/
  index.ts       # barrel — re-export public API only
  queries.ts     # query key factory, pure fetch helpers, useQuery hooks
  mutations.ts   # pure write helpers, useMutation hooks
  types.ts       # optional — request/response interfaces
  mappers.ts     # optional — DB row ↔ domain mapping
```

- **`index.ts`**: components import from `@/lib/api/users` only — no deep paths.
- **`queries.ts`**: `userKeys`, async read helpers, `use*` query hooks (`'use client'` when hooks are present).
- **`mutations.ts`**: async write helpers, `use*` mutation hooks, cache invalidation, `sonner` error toasts.
- Pure helpers must not import React; hooks are thin wrappers around helpers.
- Throw `{ message, statusCode? } satisfies ApiError` from helpers (`src/types/api-error.ts`).

## Supabase client and auth SSR (strict)

- Never create an ad hoc Supabase client.
- Always use `lib/supabase/client` and `lib/supabase/server`.
- Use `@supabase/ssr` patterns only; do not use `@supabase/auth-helpers-nextjs`.
- For cookie adapters, use `getAll` and `setAll`; do not use `get`/`set`/`remove` adapter shape.
- In auth middleware, keep token refresh flow intact and preserve returned response cookies.

## Supabase migrations and types (strict)

- New migration files must live in `supabase/migrations/`.
- Migration filename must use 14-digit timestamp format: `YYYYMMDDHHmmss_description.sql` (UTC).
- Do not use shortened date prefixes without `HHmmss`.
- Write SQL in lowercase unless quoting requires otherwise.
- Include a migration header comment (purpose, affected objects, special risks).
- For destructive statements (`drop`, `alter`, `truncate`), add explicit safety comments.
- New tables must enable RLS.
- After creating/modifying migrations, regenerate DB types: `yarn sb:db:types` (writes `src/types/supabase-schema.ts`).
- Never use `as any` on Supabase `.from()` table names; regenerate types first.
- Avoid `any` for query results; use generated `Database` table `Row`/`Insert`/`Update` types.

## Supabase query organization

- Keep Supabase query helpers under `lib/api/**` and related Supabase helpers under `lib/supabase/**`.
- Export and reuse query/mutation helpers instead of re-implementing table access in feature components.
- Follow the `lib/api/<feature>/` split: `index.ts` (barrel), `queries.ts` (reads + `useQuery` hooks), `mutations.ts` (writes + `useMutation` hooks). See `.cursor/rules/lib-services.mdc` and `.cursor/rules/state-manager.mdc`.

## AG Grid rules

- Always import AG Grid from modules (`ag-grid-community`, `ag-grid-enterprise`, `ag-grid-react`); never load via CDN or
  global script.
- Register modules once at app startup in `providers.tsx`: `ModuleRegistry.registerModules([AllEnterpriseModule])` from
  `ag-grid-enterprise` (includes Community); set `LicenseManager` when `NEXT_PUBLIC_AG_GRID_LICENSE_KEY` is provided.
- Use the `<AgGridReact>` React component; never call the imperative `agGrid.createGrid()` API.
- Obtain `GridApi` exclusively via the `onGridReady` callback and store it in a `useRef`, not `useState`.
- Use the new Theming API (`themeQuartz` from `ag-grid-community`); do not use `theme: 'legacy'` in `GridOptions`.
- Do NOT import legacy AG Grid CSS files (`ag-grid.css`, `ag-theme-quartz.css`) — the new Theming API injects its own
  styles. Do not add `<link>` tags in layout either.
- Column definitions and `defaultColDef` must be defined outside JSX (as `useMemo` or module-level constants) to prevent
  unnecessary re-renders.
- Use function components for all cell renderers and editors; class-based `ICellRendererComp`/`ICellEditorComp` are not used in this codebase.
- Use typed AG Grid generics (`GridApi<T>`, `IRowNode<T>`, `ICellRendererParams<T>`) throughout; do not use `any` or
  hand-rolled interface shims.

## RLS policy rules (strict)

- Every table in API-exposed schemas must have RLS enabled.
- Each table must include restrictive policy `"require secure session"` with:
  - `as restrictive for all`
  - `using ((select private.is_secure()))`
  - `with check ((select private.is_secure()))`
- For normal access control, do not use `for all`; create separate policies for `select`, `insert`, `update`, `delete`.
- Split policies by role (`anon` and `authenticated`) when behavior differs.
- Use `auth.uid()` (often as `(select auth.uid())`), never `current_user`.
- Operator requirements:
  - `select`: `using` only
  - `insert`: `with check` only
  - `update`: `using` + `with check`
  - `delete`: `using` only
- Include concise rationale comments for non-trivial policy logic.

## Postgres function rules

- Default to `security invoker`.
- Use `security definer` only when required and explain why.
- Always set `set search_path = '';` in function definitions.
- Fully qualify all object names in SQL/PLpgSQL bodies.
- Prefer explicit input/output types and `immutable`/`stable` when valid.
- For updated timestamps, reuse `public.trigger_set_updated_at`; do not create duplicate updated-at trigger functions.

## LLM type safety (project-wide)

- Do not use `any` or `unknown` in project code.
- Prefer explicit interfaces, unions, generics, and narrowing.
- If `any` or `unknown` is unavoidable, add a short inline justification comment.
- `any`/`unknown` are allowed in unit tests when they improve test ergonomics/readability.

## Safety and approval boundaries

- Ask for approval before changing database schema, auth flow, RLS model, or security-sensitive code.
- Never execute destructive DB or git operations without explicit confirmation.
- Never commit secrets, tokens, or credential-like values.

## Verification and delivery

- Run the smallest relevant checks (`eslint`, targeted tests, or typecheck) after changes.
- If checks are not run, state exactly which checks were skipped and why.
- Summaries must include what changed, why, and any residual risk.
