<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.

<!-- END:nextjs-agent-rules -->

## Scope filter for this file

- Apply this guidance only when editing `src/components/**` and `src/app/**/page.tsx`.
- For changes outside those paths, prioritize local file conventions and existing project rules.

## Function conventions for scoped files

- Follow `.cursor/rules/naming-conventions.mdc` for file and folder paths (`kebab-case` only).
- Prefer named function declarations and extracted handler functions over inline JSX lambdas.
- For callbacks that must return `void`, keep async work in a separate function and invoke it via a `void`-safe wrapper.
