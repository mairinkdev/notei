# Contributing to Notei

## Before submitting a PR

1. Run `npm run check:comments` — the project disallows comments in code (`//`, `/* */`, TODO, FIXME).
2. Run `npm run typecheck` — TypeScript must pass with no emit.
3. Run `npm run lint` — ESLint must pass.
4. Run `npm run test` — unit tests must pass.
5. If possible, run `npm run tauri:build` to ensure the desktop app builds.

## Conventions

- **No comments in code** — Keep the codebase comment-free; document non-obvious decisions in the README or [docs/decision-records.md](docs/decision-records.md).
- **TypeScript** — Strict mode; avoid `any`.
- **Clean architecture** — Prefer small functions, clear names, and the existing structure (app, components, features, lib, strings).

## Branch and PR

- Branch from `main`.
- Use clear, focused commits.
- Open a PR with a short description; reference issues when relevant.
