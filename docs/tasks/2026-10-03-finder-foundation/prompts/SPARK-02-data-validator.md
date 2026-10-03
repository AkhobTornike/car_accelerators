# SPARK-02 — data validator (schema + business checks + coverage)

Read `/home/tornike/Work/car_accelerators/docs/tasks/2026-10-03-finder-foundation/00-COMMON-RULES.md` first. Task id: `SPARK-02`, slug `data-validator`.
Your base branch `feat/finder-foundation` already contains the Next.js scaffold (GLM-01), `data/batteries.json` + `data/fitments.json` (SPARK-01) and the domain contract in `core/`. Claude pre-installs `ajv`: **do not touch `package.json` / `package-lock.json`** (Claude adds the script `validate:data` itself).

## Goal
One function that tells a human exactly what is wrong with the data, used by a CLI now and by the admin panel's import later.

## Files you may create (in your worktree)
`scripts/validate-data.ts`, `scripts/validate-data-cli.ts`, `scripts/validate-data.test.ts`. Nothing else.

## `scripts/validate-data.ts`
```ts
export interface Issue { level: 'error' | 'warning'; code: string; entity: 'battery' | 'fitment'; id: string; message: string }
export function validateData(batteries: unknown[], fitments: unknown[], extra?: { sales?: unknown[]; voids?: unknown[]; movements?: unknown[] }): Issue[]
```
`extra` is optional (those files do not exist yet). When given, validate sales against `core/schema/sale.schema.json` and movements against `core/schema/stock-movement.schema.json` the same way, and run the extra checks listed under "Inventory checks".
Pure function, no file access. Use `ajv` (draft-07, `allErrors: true`) with the two schemas in `core/schema/` (import the JSON files). One schema error = one `error` issue (`code: 'schema'`, message includes the JSON path and ajv message, entity `id` if readable else `"(index N)"`).
Business checks (run on rows that passed the schema; each failing row → issue):
- `duplicate-id` (error): same `id` twice in batteries, or twice in fitments.
- `bad-year-range` (error): `yearFrom > yearTo`.
- `year-overlap` (error): two fitments with identical (type, make, model, engine) whose year ranges overlap (touching at one shared year counts as overlap). Name both ids in the message.
- `unknown-battery-ref` (error): an id in `include` or `exclude` that does not exist in batteries.
- `include-exclude-conflict` (error): same id in both lists of one fitment.
- `duplicate-oem-code` (warning): the same normalised OEM code (uppercase, remove spaces/dashes/dots) on two different batteries.
- `quantity-stock-mismatch` (error): `stock` is `in` but `quantity` is `0`, or `stock` is `out` but `quantity > 0`. A battery without `quantity` is fine (unknown).
- `ah-window-empty` (error): `oem.ahMax` set and `< oem.ahMin`.
- `no-match` (warning): a fitment for which `matchBatteries(fitment, activeBatteries)` from `core/fitment-engine.ts` returns nothing — i.e. a customer would see an empty result. Import it with a `.ts` extension path.
Inventory checks (only when `extra` is given; tests use inline fixtures):
- `sale-total-mismatch` (error): `total` differs from `saleTotal(lines, discount)` of `core/inventory.ts` (tolerance 0.005).
- `sale-unknown-battery` (error): a sale line `batteryId` not in batteries.
- `void-unknown-sale` / `void-duplicate` (error): a void for a missing sale / two voids for one sale.
- `movement-unknown-battery` (error).
- `ledger-mismatch` (error): a battery that HAS movements whose `quantity` differs from the sum of its movement deltas (batteries without movements are skipped).
- `negative-running-stock` (error): replaying one battery's movements in `at` order ever drops below zero.
- `sale-without-movements` (error): a sale with no `kind: 'sale'` movement per line, matched by `saleId` + `batteryId`.

- `unverified` is NOT an issue (demo data is all unverified).

## `scripts/validate-data-cli.ts`
Reads `data/batteries.json` and `data/fitments.json` (path overridable by first CLI arg), prints issues grouped by level (errors first) in the form `[error] year-overlap fitment car-bmw-3-series-2: …`, then a summary line `N errors, M warnings, X batteries, Y fitments`. Exit code `1` if any error, else `0`. Runs with plain Node: `node --experimental-strip-types scripts/validate-data-cli.ts` (if your Node accepts it without the flag, fine — mention it in the report).

## Tests (`scripts/validate-data.test.ts`, vitest)
Small inline fixtures (a valid battery + fitment pair factory). One test per issue code above (fixture that triggers exactly that code, and a near-miss that does not — e.g. year ranges that are adjacent but not touching). Plus: schema failures (missing field, wrong enum, extra property). Plus ONE test that loads the real `data/*.json` and asserts there are **zero errors** (warnings are allowed; do not assert on their count).

## Acceptance (paste real output tails)
- `npx vitest run scripts` — all green (state the count)
- `npm run typecheck`, `npm run lint` — 0 errors
- `node --experimental-strip-types scripts/validate-data-cli.ts` on the real data — paste the full summary line and the first 15 issue lines. If it reports **errors in the real data**, do NOT edit the data: list them in the report, that is a finding.
- Mutation check: temporarily break one thing per code in a COPY of the data (in a temp folder, via the CLI path argument) and show that each is detected. Paste the results; remove the temp folder afterwards.
- `git status --short` — only the three allowed files

Report: `/home/tornike/Work/car_accelerators/docs/tasks/2026-10-03-finder-foundation/reports/SPARK-02-data-validator.md`
