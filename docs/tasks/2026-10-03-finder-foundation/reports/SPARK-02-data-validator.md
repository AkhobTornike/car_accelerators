# SPARK-02 report
Status: done
Worktree: /home/tornike/Work/car_accelerators-wt/SPARK-02   Branch: task/SPARK-02-data-validator
## What I did (files created/changed)
- `scripts/validate-data.ts` (new): pure `validateData(batteries, fitments, extra?) → Issue[]`, no file access. ajv (draft-07 default, `allErrors: true`, `date-time` format via `Date.parse`) over the four `core/schema/*.json` files; one schema error = one `error` issue (`code: 'schema'`, message = ajv path + message, id or `(index N)`). Business checks run on schema-valid rows, in task order: `duplicate-id`, `bad-year-range`, `year-overlap` (touching counts, both ids named), `unknown-battery-ref`, `include-exclude-conflict`, `duplicate-oem-code` (warning, normalised uppercase minus spaces/dashes/dots), `quantity-stock-mismatch`, `ah-window-empty`, `no-match` (warning, via `matchBatteries` from `../core/fitment-engine.ts`, `.ts` extension path). Inventory checks only when `extra` is given: `sale-total-mismatch` (tolerance 0.005), `sale-unknown-battery`, `void-unknown-sale` / `void-duplicate`, `movement-unknown-battery`, `ledger-mismatch` (batteries without movements skipped), `negative-running-stock` (`at`-ordered replay from zero), `sale-without-movements` (matched by `saleId` + `batteryId`). `unverified` is not an issue.
- `scripts/validate-data-cli.ts` (new): reads `<dir>/batteries.json` + `<dir>/fitments.json` (`dir` = first CLI arg, default `data` under cwd), prints errors then warnings as `[error] year-overlap fitment car-bmw-3-series-2: …`, summary `N errors, M warnings, X batteries, Y fitments`, exit 1 on any error else 0. Runs with plain Node: `node --experimental-strip-types scripts/validate-data-cli.ts` (flag required on this Node v22.23.2).
- `scripts/validate-data.test.ts` (new): 24 tests — inline battery/fitment/sale/movement/void factories; one test per each of the 18 codes (trigger + near-miss, e.g. touching vs adjacent year ranges); schema failures (missing field, wrong enum, extra property, bad sale, zero-delta movement); one real-data test asserting zero errors.
- Nothing else touched; everything uncommitted. `package.json` untouched (no `validate:data` script — that is Claude's part).

## Acceptance checks (command → output tail, one block each)
`npx vitest run scripts` → `Test Files 1 passed (1) / Tests 24 passed (24)`; full `npm run test` → `Test Files 7 passed (7) / Tests 108 passed (108)`.
`npm run typecheck` → `next typegen && tsc --noEmit`, "Types generated successfully", 0 errors. `npm run lint` → clean, exit 0.
CLI on real data (`node --experimental-strip-types scripts/validate-data-cli.ts`):
```
0 errors, 0 warnings, 8 batteries, 169 fitments
```
(no issue lines at all; exit 0 — data not touched).
Mutation check (copy of `data/` per code in `/tmp/mut-*`, CLI path arg, temp folders removed afterwards):
```
schema: [error] schema battery s44: / must have required property 'name' (1 errors, 25 warnings, exit=1)
duplicate-id: [error] duplicate-id battery s44: duplicate battery id "s44" (2 rows) (36 errors, exit=1)
bad-year-range: [error] bad-year-range fitment car-audi-a3-1: … yearFrom 2020 > yearTo 2010 (exit=1)
year-overlap: [error] year-overlap fitment car-audi-a3-1: fitments "car-audi-a3-1" [2008-2012] and "car-audi-a3-2" [2012-2017] overlap (exit=1)
unknown-battery-ref: [error] unknown-battery-ref fitment car-audi-a3-1: … unknown battery "ghost-1" in include (exit=1)
include-exclude-conflict: [error] include-exclude-conflict fitment car-audi-a3-1: … battery "s60" is in both include and exclude (exit=1)
duplicate-oem-code: [warning] duplicate-oem-code battery s44: oem code "544059036" is also on batteries "s60" (0 errors, 2 warnings, exit=0)
quantity-stock-mismatch: [error] quantity-stock-mismatch battery s44: … stock "in" disagrees with quantity 0 (exit=1)
ah-window-empty: [error] ah-window-empty fitment car-audi-a3-1: … oem.ahMax 59 < oem.ahMin 60 (exit=1)
no-match: [warning] no-match fitment car-audi-a3-1: … no battery matches — a customer would see an empty result (0 errors, 1 warnings, exit=0)
```
All 10 CLI-reachable codes detected. The 8 inventory codes have no CLI input (the CLI reads only batteries/fitments) and are covered by the unit tests above instead.
`git status --short --untracked-files=all` (worktree):
```
?? scripts/validate-data-cli.ts
?? scripts/validate-data.test.ts
?? scripts/validate-data.ts
```
Only the three allowed files.

## Deviations from the task (and why)
- Schemas are loaded with `createRequire`, not `import` syntax: bare `.json` imports fail under strip-types (`ERR_IMPORT_ATTRIBUTE_MISSING`) and this Node's strip-types rejects `with { type: 'json' }` attributes — verified empirically. Same files, same content.
- `saleTotal` is mirrored locally (3 lines) instead of imported from `core/inventory.ts`: that module uses parameter properties, which strip-types cannot parse, so importing it breaks the plain-Node CLI (verified: `ERR_UNSUPPORTED_TYPESCRIPT_SYNTAX`). A test pins equivalence against the real `coreSaleTotal` (accepts its exact output, flags +0.01). `matchBatteries` IS imported from `core/fitment-engine.ts` as specified (that module is erasable-safe).
- Existence lookups (battery ids for refs, sale ids for voids) use all rows carrying a string id, not only schema-valid rows: a reference points at a row, validity is reported separately as a schema issue. All other business checks use valid rows only.
- Inventory issues reuse `entity: 'battery'` (the `Issue` interface allows only `battery` | `fitment`); the message always names the real record (`sale "s1": …`, `void for missing sale …`). `ledger-mismatch` also fires when a battery has movements but no numeric `quantity` (unknown ≠ ledger sum); `negative-running-stock` only replays movements of known batteries.
- Mutation cascades are correct, not bugs: breaking `s44`'s schema also yields 25 `no-match` warnings (its pinned fitments lose their only match); renaming `s60` yields 35 follow-on `unknown-battery-ref` errors. Warnings alone exit 0, per spec.

## Contract problems / open questions
- None. Schemas, `matchBatteries`, and `saleTotal` semantics all support the checks; no `core/` change needed. One structural note for whoever wires `validate:data`: the CLI needs the strip-types flag on Node 22 (`node --experimental-strip-types scripts/validate-data-cli.ts`).

## Not done
- Nothing. All acceptance checks pass; real data validates with zero errors and zero warnings.
