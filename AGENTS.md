<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.

<!-- END:nextjs-agent-rules -->

## Project context and commands

- Stack: Next.js 16, React 19, TypeScript 6, Supabase, TanStack Query, Zustand 5, and Vitest.
- Package manager: Yarn 4.
- Run unit tests with `yarn test`.
- Run targeted ESLint for touched files before broader validation; the repository may contain unrelated legacy formatting findings.

## Data and state architecture

- Keep Supabase access in `src/lib/api/<entity>/queries.ts` and `mutations.ts`; UI code must not call Supabase directly.
- Export each domain's public contract through `src/lib/api/<entity>/index.ts`.
- Zustand-backed domains keep typed stores beside their API files under `src/lib/api/<entity>/`.
- Keep independent async operations in independent stores (for example, project loading and project creation); do not share one `isLoading` or `error` lifecycle between unrelated operations.
- Keep entities separate: `projects` and `project-rates` must not share a store or domain types.
- Do not duplicate the same server data in both TanStack Query and Zustand. Follow the state owner already selected for that domain.

## Scope filter for frontend conventions

- Apply the function conventions below only when editing `src/components/**` and `src/app/**/page.tsx`.
- For changes outside those paths, prioritize local file conventions and existing project rules.

## Function conventions for scoped files

- Follow `.cursor/rules/naming-conventions.mdc` for file and folder paths (`kebab-case` only).
- Prefer named function declarations and extracted handler functions over inline JSX lambdas.
- For callbacks that must return `void`, keep async work in a separate function and invoke it via a `void`-safe wrapper.
