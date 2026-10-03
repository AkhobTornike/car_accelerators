# SPARK-01 — convert the demo_v1 data into real data files

Read `/home/tornike/Work/car_accelerators/docs/tasks/2026-10-03-finder-foundation/00-COMMON-RULES.md` first. Task id: `SPARK-01`, slug `demo-data`.

## Goal
`demo_v1/index.html` has the fitment tree and the products hard-coded in JavaScript (`const PRODUCTS=[...]`, `function EN(...)`, `const FITMENT={...}` around lines 981–1220). Write a one-shot converter that turns them into JSON files matching the domain contract, so the real app has seed data.

## Files you may create (in your worktree)
`scripts/convert-demo.mjs`, `data/batteries.json`, `data/fitments.json`. Nothing else. No npm dependencies (plain Node 22, `node:fs`, `node:vm`).
Read-only inputs: `demo_v1/index.html`, `core/types.ts`, `core/schema/battery.schema.json`, `core/schema/fitment.schema.json`.

## How
Extract the source text from `const PRODUCTS=` up to the end of the `FITMENT` object, run it inside `node:vm` (define nothing extra — `EN` is defined in that block), read `PRODUCTS` and `FITMENT` from the context. Do not hand-copy data and do not load the whole HTML in a browser.

### Battery mapping (`PRODUCTS[i]` → `Battery`)
| demo | contract |
|---|---|
| `id` | `id` |
| — | `brand: "AMPER"` |
| `name` | `name` |
| `cat`: `smf`/`efb`/`agm` → `car`; `truck` → `truck`; `moto` → `moto`; `deep` → `deep` | `segment` |
| `tech`: `SMF HD` → `SMF`; others unchanged | `tech` |
| `v` | `voltage` |
| `ah`, `cca` | `ah`, `cca` |
| `term` | `polarity` (`L+`/`R+`) |
| `size` | `caseCode` |
| `dims` `"207×175×190"` | `dimsMm {l,w,h}` (numbers) |
| `warr` | `warrantyMonths` |
| `price` | `price` |
| `stock` | `stock` |
| `oem` | `oemCodes` |
| — | `active: true` |
Drop `fmt`. Do not add `terminal`/`holdDown`/`images`.

### Fitment mapping (`FITMENT[type][make][model][k]` = `{e, p, f, t}` → `Fitment`)
- `id`: slug of `${type}-${make}-${model}-${k+1}` — lowercase, ASCII only (transliterate `ë`/`é`/`ö` etc. to plain letters), non-alphanumerics → `-`, collapsed. Must be unique across all rows.
- `type`, `make`, `model` from the keys (`type` is `car` or `van` in the demo — keep it as is); `engine` = `e`; `yearFrom` = `f`; `yearTo` = `t`.
- `startStop` = `e` contains "start-stop" (case-insensitive).
- `oem`: take the FIRST product id in `p` as the reference battery: `ahMin` = its `ah`, `ccaMin` = its `cca`, `polarity` = its polarity, `caseCode` = its `caseCode`, `techMin` = its tech if that is `SMF`/`EFB`/`AGM`, else `SMF`. If the row is `startStop` and `techMin` would be `SMF`, set `EFB`.
- `include` = ALL product ids in `p` (the demo's own pairing, pinned).
- `source: "demo"`, `verified: false`.
Keep the order of the demo (type → make → model → engine).

### Output
Pretty-printed JSON (2 spaces), a final newline, arrays of objects. The script must be idempotent (running it twice gives byte-identical files) and print: number of batteries, number of fitments, number per type, number of distinct makes per type.

## Acceptance (run all, paste real output tails)
- `node scripts/convert-demo.mjs` → prints counts. Expected from the demo: 8 batteries; fitments total must be 169 (149 `car` + 20 `van`) and there are 23 distinct car makes — if your numbers differ, say so and explain.
- Run it a second time, `git diff --stat` / `md5sum data/*.json` before and after → identical.
- A one-off check (inline `node -e`, do not add a file) that: all fitment ids are unique; every id in every `include` exists in `batteries.json`; every `yearFrom <= yearTo`; no two rows with the same (type, make, model, engine) have overlapping year ranges. Paste the result (list the offenders if any — do NOT fix the data by hand, report them).
- `git status --short` lists only the three allowed files.

Report: `/home/tornike/Work/car_accelerators/docs/tasks/2026-10-03-finder-foundation/reports/SPARK-01-demo-data.md`
