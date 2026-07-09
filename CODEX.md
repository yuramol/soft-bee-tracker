# Codex Working Rules

## Scope filter for this file

- Apply this guidance only when editing `src/components/**` and `src/app/**/page.tsx`.
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
