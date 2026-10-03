# SPARK-01 report
Status: done
Worktree: /home/tornike/Work/car_accelerators-wt/SPARK-01   Branch: task/SPARK-01-demo-data
## What I did (files created/changed)
- `scripts/convert-demo.mjs` (new): slices `demo_v1/index.html` from `const PRODUCTS=` to the `/* tiny event log */` marker, runs that block in `node:vm` (defines nothing extra; `EN` comes from the block), re-exports `PRODUCTS`/`FITMENT` via `globalThis`, maps them to the domain contract, writes `data/batteries.json` + `data/fitments.json` (2-space pretty print, trailing newline, `mkdir -p data`). Slug via NFD-strip + lowercase + `[^a-z0-9]+` → `-`; collision suffix `-2`, `-3`… (never triggered on current data).
- `data/batteries.json` (new): 8 batteries.
- `data/fitments.json` (new): 169 fitments.
- Nothing else touched; everything uncommitted.

## Acceptance checks (command → output tail, one block each)
`node scripts/convert-demo.mjs` (worktree root):
```
batteries: 8
fitments: 169
fitments car: 149 (23 makes)
fitments van: 20 (9 makes)
```
Matches the expected numbers exactly (8 batteries; 169 = 149 car + 20 van; 23 distinct car makes).

Idempotency — `md5sum data/*.json && node scripts/convert-demo.mjs && md5sum data/*.json`:
```
50a747cf99e12a6430c8f091d1155b2a  data/batteries.json
c43ec48a34f56c794eced684aff87dcc  data/fitments.json
batteries: 8
fitments: 169
fitments car: 149 (23 makes)
fitments van: 20 (9 makes)
50a747cf99e12a6430c8f091d1155b2a  data/batteries.json
c43ec48a34f56c794eced684aff87dcc  data/fitments.json
```
Byte-identical across runs (`git diff --stat` empty; files are untracked so no diff output).

One-off inline validation (`node -e`, no file added):
```
fitment ids unique: true
includes all exist: true
yearFrom<=yearTo: true
no overlapping year ranges: true
non-ascii fitment ids: []
```
No offenders in any check — nothing to list, nothing hand-fixed.

`git status --short --untracked-files=all` (worktree):
```
?? data/batteries.json
?? data/fitments.json
?? scripts/convert-demo.mjs
```
Only the three allowed files. (Plain `git status --short` collapses these to `?? data/` + `?? scripts/`; no other changes exist.)

## Deviations from the task (and why)
- `const` declarations inside `vm.runInContext` do not land on the context object, so the script appends two `globalThis.__PRODUCTS/__FITMENT` assignments to the evaluated source to read the values out. No extra definitions (no `EN` stub, no browser); semantics unchanged.
- Slug collisions are guarded with a deterministic `-2`/`-3` suffix loop. Not triggered by current data (all 169 ids unique on first pass), purely defensive to satisfy "must be unique".
- Console output format: one line per count (`batteries: 8`, `fitments: 169`, `fitments car: 149 (23 makes)`, `fitments van: 20 (9 makes)`), covering batteries / total / per-type / distinct-makes-per-type as required.

## Contract problems / open questions
- None. All 8 batteries satisfy `battery.schema.json` shapes (tech `SMF HD` → `SMF`, `DEEP-CYCLE` kept for `d105`); every fitment `oem` carries `caseCode` so the schema `anyOf` is met. No `core/` change needed.
- Note: every demo battery has `term: 'L+'`, so all 169 fitment `oem.polarity` values are `L+` — correct per the mapping, but real data entry should confirm the convention per `core/types.ts`.

## Not done
- Nothing. All acceptance checks pass.
