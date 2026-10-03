# GLM-02 — JSON repository + public API routes

Read `/home/tornike/Work/car_accelerators/docs/tasks/2026-10-03-finder-foundation/00-COMMON-RULES.md` first. Task id: `GLM-02`, slug `repository-api`.
Your base branch `feat/finder-foundation` already contains the Next.js scaffold (GLM-01), `data/batteries.json` + `data/fitments.json` (SPARK-01) and the domain contract in `core/`. Claude pre-installs `zod` and `ajv`: **do not touch `package.json` / `package-lock.json`**.

## Goal
Implement `ReadRepository` and `WriteRepository` from `core/repository.ts` on top of the JSON files, and expose the read side as a small, hardened public API. The fitment matching itself already exists — call `matchBatteries` from `@core/fitment-engine`, do not reimplement it.

## Files you may create/change (in your worktree)
`src/server/**`, `src/app/api/**`, tests next to them (`*.test.ts`), `.env.example` (add `DATA_DIR`). Nothing else. `core/` is read-only; if the interface blocks you, report it under "Contract problems".

## Part A — repository (`src/server/json-repository.ts`)
- `createJsonRepository(dataDir: string): ReadRepository & WriteRepository`. Reads `batteries.json` and `fitments.json`, keeps them in memory, reloads when the file mtime changes. A missing/invalid file → throw a clear error, never return partial data.
- `getMakes/getModels/getEngines`: distinct, sorted (`localeCompare`), only for the requested vehicle type. `getEngines` with `year` returns only variants where `yearInRange` is true; each option = `{ fitmentId, label: engine, yearFrom, yearTo }`.
- `findBatteriesForFitment(id)`: `matchBatteries(fitment, activeBatteries)`; unknown id → `[]`.
- `findByOldCode(code)`: normalise (trim, uppercase, remove spaces/dashes/dots) both sides; exact match against `oemCodes`; active batteries only.
- Write side: validate nothing here beyond the TypeScript types (validation is SPARK-02's job); `upsert*`/`delete*` write the JSON file atomically (write temp file in the same folder, then rename), and append a `ChangeEntry` (`before`/`after`) to `changes.json`. Serialise writes (one at a time) so concurrent calls cannot lose updates. Pretty-print with 2 spaces and a final newline.
- `src/server/repository.ts`: `getRepository()` — module singleton using `process.env.DATA_DIR ?? <cwd>/data`, plus `setRepositoryForTests(repo | null)`.

The inventory/sales side (`InventoryRepository` in `core/repository.ts`, `core/inventory.ts`, `core/csv.ts`) is NOT part of this task — a later task builds it on your repository. Keep the file layer reusable: one small internal helper for "read JSON collection / write collection atomically under the write lock" that other collections (`sales.json`, `sale-voids.json`, `movements.json`) can use later.

## Part B — API (App Router route handlers, all GET, JSON)
| Route | Query | Returns |
|---|---|---|
| `/api/vehicles/makes` | `type` | `{ makes: string[] }` |
| `/api/vehicles/models` | `type`, `make` | `{ models: string[] }` |
| `/api/vehicles/engines` | `type`, `make`, `model`, optional `year` | `{ engines: EngineOption[] }` |
| `/api/match` | `fitmentId` | `{ results: PublicMatch[] }` |
| `/api/old-code` | `code` | `{ results: PublicBattery[] }` |

- Validate every query param with `zod`: `type` ∈ `car|van|truck|moto`; `make`/`model` 1–60 chars, no control characters; `year` integer 1950–2100; `fitmentId` matches `^[a-z0-9][a-z0-9-]{0,79}$`; `code` 3–40 chars. Unknown extra params are ignored. Invalid → `400 { error: 'invalid_request' }` (no zod internals in the response).
- `PublicBattery` = `{ id, name, brand, tech, ah, cca, polarity, caseCode, dimsMm, warrantyMonths, price, stock, quantity }` (`quantity` omitted when unknown; price and quantity ARE public — Tornike's decision). `PublicMatch` = `PublicBattery & { tier, spec, notes }`. **Never** return `costPrice`, `oemCodes`, `include`/`exclude`, `source`, `verified`, or the OEM spec of a fitment. Define the DTO mapping in `src/server/public-dto.ts` as an explicit pick (not a spread).
- Success: `200` with `Cache-Control: public, max-age=300`. Unknown vehicle/fitment → `200` with an empty list (no 404, no hint whether a make exists). Unexpected error → `500 { error: 'server_error' }`, log server-side only.
- There must be NO route that lists batteries or fitments. Do not add `/api/batteries`, `/api/fitments`, `/api/export` or similar.

## Tests (vitest, `src/server/**/*.test.ts`, `src/app/api/**/*.test.ts`)
Use a temp folder with tiny fixture JSON written by the test (3 batteries, 3 fitments incl. a van and a start-stop car); do not depend on the real `data/`. Cover: distinct+sorted lists; year filter inclusive edges; match returns tier-ordered results; old-code normalisation (`"0 092-s50.080"` finds the battery); inactive battery never returned; write side persists, appends a change entry, and two parallel `upsertBattery` calls both survive; each route returns 400 on bad input; response bodies never contain the strings `costPrice`, `oemCodes`, `include`, `verified`, `source`. Call route handlers directly (`GET(new Request(url))`).

## Acceptance (paste real output tails)
- `npm run test` — all green (state the count)
- `npm run typecheck`, `npm run lint` — 0 errors
- `npm run build` — succeeds
- With `npm run dev` and the real `data/`: `curl` one example for each of the 5 routes (e.g. type=car&make=BMW …) and paste the first lines of each response; also `curl -i` one 400 case.
- `git status --short` — only allowed files

Report: `/home/tornike/Work/car_accelerators/docs/tasks/2026-10-03-finder-foundation/reports/GLM-02-repository-api.md`
