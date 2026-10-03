# GLM-01 — Next.js scaffold + test tooling

Read `/home/tornike/Work/car_accelerators/docs/tasks/2026-10-03-finder-foundation/00-COMMON-RULES.md` first. Task id: `GLM-01`, slug `scaffold`.

## Goal
Turn the repo into a Next.js (App Router, TypeScript) project that can import the domain contract in `core/`, with working lint, typecheck, build and test scripts. No features yet.

## Files you may create/change (in your worktree)
`package.json`, `package-lock.json`, `tsconfig.json`, `next.config.ts`, `eslint.config.mjs`, `vitest.config.ts`, `.gitignore`, `.env.example`, `src/**`, `public/**`, `README.md`.
Do NOT touch `core/`, `docs/`, `demo_v1/`, `PLAN.md`.

## Steps
1. In your worktree root (it already has `core/`, `docs/`, `demo_v1/`, `PLAN.md`): scaffold with the latest stable Next.js: TypeScript, App Router, `src/` directory, ESLint, **no Tailwind**, npm, import alias `@/*` → `src/*`. `create-next-app` refuses a non-empty folder — scaffold into a temp folder outside the repo and copy the files in (never overwrite the four protected paths above).
2. Add path alias `@core/*` → `core/*` in `tsconfig.json`. `core/*.ts` files import each other with `.ts` extensions, so enable `allowImportingTsExtensions` (Next already uses `noEmit`). Make sure `next build` and `tsc --noEmit` both accept `core/`.
3. Add `vitest` (devDependency) with `vitest.config.ts`: node environment, alias `@core` and `@`, `include: ['core/**/*.test.ts', 'src/**/*.test.ts', 'scripts/**/*.test.ts']`. Do NOT use globals — tests import from `vitest`.
4. `package.json` scripts: `dev`, `build`, `start`, `lint`, `typecheck` (`tsc --noEmit`), `test` (`vitest run`).
5. Prove the alias works with ONE test `src/smoke.test.ts` that imports `specLine` from `@core/fitment-engine` and asserts `specLine({...a battery}) === 'R+, L2, 60Ah, 540A'` (build the battery object inline; type it as `Battery` from `@core/types`).
6. Add `src/app/api/health/route.ts` returning `{ ok: true }` (GET). Replace the default home page with a one-line placeholder "AMPER.GE — finder coming soon" (no styling work; the real UI is ported later from `demo_v1/index.html`).
7. `.env.example` with a single commented line, no values. `README.md`: 10 lines max — how to install, run, test.
8. Node 22 and npm 10 are installed. Do not add Docker, CI, Prettier or any other tooling.

## Acceptance (run all, paste real output tails)
- `npm install` succeeds
- `npm run lint` — 0 errors
- `npm run typecheck` — 0 errors
- `npm run test` — 1 passed
- `npm run build` — succeeds
- `npm run dev` then `curl -s localhost:3000/api/health` → `{"ok":true}` (stop the server after)
- `git status --short` in your worktree lists only the allowed files (paste it)

Report: `/home/tornike/Work/car_accelerators/docs/tasks/2026-10-03-finder-foundation/reports/GLM-01-scaffold.md`
