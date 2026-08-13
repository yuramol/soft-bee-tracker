# Codex Working Rules

## Project context

- Stack: Next.js 16, React 19, TypeScript 6, Supabase, TanStack Query, Zustand 5, and Vitest.
- Use Yarn 4 commands; run unit tests with `yarn test`.
- Keep Supabase reads/writes under `src/lib/api/<entity>/` and export public contracts from that domain's `index.ts`.

## State and data access

- UI components must consume domain hooks/stores and must not call Supabase or `fetch` directly.
- Use the state owner already established for a domain: TanStack Query or Zustand; never duplicate the same remote data in both.
- Keep Zustand stores separated by entity.
- Keep independent get/create operations in separate stores so their loading and error states do not interfere.
- Keep pure reads in `queries.ts`, pure writes in `mutations.ts`, row mapping in `mappers.ts`, and domain contracts in `types.ts`.
- Normalize async failures to `ApiError` and preserve the Supabase response status.
- Add or update Vitest coverage for store success, failure, and overlapping-request behavior.

## Scope filter for frontend conventions

- Apply the coding conventions below only when editing `src/components/**` and `src/app/**/page.tsx`.
- For changes outside those paths, prioritize local file conventions and existing project rules.

## Coding standards

- Follow `.cursor/rules/naming-conventions.mdc` for file and folder paths (`kebab-case` only).
- Use TypeScript and prefer `interface` for object shapes.
- Use PascalCase for components; camelCase for variables/functions.
- Export React components as named functions; avoid default exports and class components.
- For `src/components/**` and `src/app/**/page.tsx`, prefer separate named handler functions over inline lambdas in JSX props.
- When a prop expects `() => void` but work is async, keep async logic in a separate function and call it via a `void`-safe wrapper callback.
- Keep components declarative; move imperative logic to helpers.
- Avoid `any` and `unknown` in project code unless there is a brief inline justification.
- Do not run unrelated refactors or formatting-only sweeps.

## Safety

- Ask before changing auth, security-sensitive behavior, or database schema.
- Never commit secrets or credential-like values.
