# GLM-05 report

Status: done
Worktree: /home/tornike/Work/car_accelerators-wt/GLM-05   Branch: task/GLM-05-public-catalog

## What I did (files created/changed)

- `core/repository.ts` — ONE method added to `ReadRepository`: `listActiveBatteries(): Promise<Battery[]>` with the doc comment from the task. Nothing else touched.
- `src/server/json-repository.ts` — `listActiveBatteries()`: active rows of `batteries.json`, sorted with a `catalogueOrder` comparator (segment → tech → ah → id).
- `src/server/firestore-repository.ts` — `listActiveBatteries()`: reuses the existing TTL-cached `batteries()` (invalidated by this process's own writes via `invalidate()`), filters `active` in memory, same sort. No extra Firestore query per call. (`filter()` already copies, so `.sort()` never mutates the cached array.)
- `src/server/repository-contract.ts` — new `active catalogue` contract block, runs against BOTH backends: (1) active only + stable order by segment, tech, ah, id; (2) upsert visible immediately (deactivate → gone, edit → new price, back active).
- `src/server/catalog.ts` (new) — `getPublicCatalog(): Promise<PublicBattery[]>` = `getRepository().listActiveBatteries()` mapped with the existing explicit-pick `toPublicBattery`; re-exports `type PublicBattery`.
- `src/server/catalog.test.ts` (new) — asserts the exact public key set (no private fields), active only, catalogue order, `quantity` present only when known.
- `src/app/api/catalog/route.ts` (new) — `GET` → `{ batteries: PublicBattery[] }` through `handle()` (so `Cache-Control: public, max-age=300` + generic 500 + unknown params ignored). Filters `segment` ∈ car|truck|moto|deep and `tech` ∈ SMF|EFB|AGM|DEEP-CYCLE via zod; bad values → `400 {error:'invalid_request'}`.
- `src/app/api/api.test.ts` — new `catalogue endpoint` describe: order + cache header, filters, unknown-params ignored, 400 table, and a privacy test in the style of the existing leak test (distinctive `costPrice`/`oemCodes` on stored rows; asserts body never contains `costPrice`, `77777`, `oemCodes`, `QQ 888`, `DEAD 001`, `active`, `verified`, `source`; inactive battery never appears; `quantity` present only when known).
- `src/server/public-dto.ts` — added ONE field, `segment`, to `toPublicBattery` (see Deviations).
- `src/app/robots.ts` (new) — UA `*`: allow `/`, disallow `/api/` and `/m/`, sitemap `${SITE_URL}/sitemap.xml`.
- `src/app/sitemap.ts` (new) — home page only, no `#...` entries.
- `.env.example` — added commented `# SITE_URL=https://amper.ge` with a note (default `http://localhost:3000`).

Both robots.ts and sitemap.ts were written after checking the actual Next.js 16.3.8 docs in `node_modules/next/dist/docs/` (`MetadataRoute.Robots` / `MetadataRoute.Sitemap` — same conventions as expected).

## Acceptance checks (command → output tail, one block each)

### `npm run lint`
```
> amper-finder@0.1.0 lint
> eslint
```
0 errors, no output.

### `npm run typecheck`
```
> next typegen && tsc --noEmit
Generating route types...
✓ Types generated successfully
```
0 errors.

### `npm run test` — 210 passed
```
 Test Files  14 passed | 2 skipped (16)
      Tests  210 passed | 2 skipped (212)
```
(2 skipped = the Firestore emulator files, by design; they run below.)

### `npm run build`
```
├ ƒ /api/admin/stock/receive
├ ƒ /api/catalog
├ ƒ /api/health
├ ƒ /api/match
├ ƒ /api/old-code
├ ƒ /api/vehicles/engines
├ ƒ /api/vehicles/makes
├ ƒ /api/vehicles/models
├ ○ /robots.txt
└ ○ /sitemap.xml

○  (Static)   prerendered as static content
ƒ  (Dynamic)  server-rendered on demand
```

### `npm run test:emulators` — contract suite incl. the new tests passes on Firestore
```
✔  firestore: Firestore Emulator was started in standard edition.
 Test Files  2 passed (2)
      Tests  26 passed (26)
✔  Script exited successfully (code 0)
```
(Java 25 present; emulator started itself.)

### Mutation check (remove `active` filter from Firestore `listActiveBatteries` → new contract tests fail → restored)
```
       × listActiveBatteries: active only, stable order by segment, tech, ah, id 281ms
       × listActiveBatteries sees an upsert immediately: deactivate, edit, reactivate 221ms
 Test Files  1 failed | 1 passed (2)
      Tests  2 failed | 24 passed (26)
AssertionError: expected [ 'e70', 'a-car', 'old', 's60', …(4) ] to deeply equal [ 'e70', 'a-car', 's60', 'unk', …(3) ]
```
(the inactive `old` battery leaks in — exactly what the filter prevents). Restored the filter; re-run: `Test Files 2 passed (2), Tests 26 passed (26)`.

### curl against `npm run dev` on port 3105 (server stopped by its exact PID 204320, verified `stopped`)
```
=== /api/catalog ===
{"batteries":[{"id":"a68","name":"AMPER A68","brand":"AMPER","segment":"car","tech":"AGM","ah":68,"cca":760,"polarity":"L+","caseCode":"L3",...,"stock":"in"},{"id":"e70",...},{"id":"s44",...
=== /api/catalog?tech=AGM ===
{"batteries":[{"id":"a68","name":"AMPER A68",...,"tech":"AGM",...},{"id":"m12","name":"AMPER M12","brand":"AMPER","segment":"moto","tech":"AGM","ah":12,"cca":210,...
=== /api/catalog?tech=nope ===
{"error":"invalid_request"} [400]
=== /robots.txt ===
User-Agent: *
Allow: /
Disallow: /api/
Disallow: /m/

Sitemap: http://localhost:3000/sitemap.xml
=== /sitemap.xml ===
<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
<url>
<loc>http://localhost:3000</loc>
<lastmod>2026-10-04T20:00:17.310Z</lastmod>
<changefreq>weekly</changefreq>
<priority>1</priority>
</url>
</urlset>
```
Plus: `curl -sI /api/catalog` → `cache-control: public, max-age=300`.

### `git status --short`
```
 M .env.example
 M core/repository.ts
 M src/app/api/api.test.ts
 M src/server/firestore-repository.ts
 M src/server/json-repository.ts
 M src/server/public-dto.ts
 M src/server/repository-contract.ts
?? src/app/api/catalog/
?? src/app/robots.ts
?? src/app/sitemap.ts
?? src/server/catalog.test.ts
?? src/server/catalog.ts
```
Only allowed files. Everything left uncommitted.

## Deviations from the task (and why)

- `src/server/public-dto.ts` — the task said "(only if needed)": it was needed. `toPublicBattery` did not include `segment`, so the `?segment=` filter (and any catalogue page grouping) had nothing to filter on. Added exactly one picked field, `segment: b.segment`, keeping the explicit-pick style. This also adds `segment` to `/api/match` responses — public info, harmless, and consistent with the catalogue.
- `listActiveBatteries` sorts in BOTH implementations (the task only fixes the order in the contract tests). Sorting is what makes the order a contract property rather than backend accident.
- Test expectations in my first draft assumed a seed battery that only exists in the contract fixtures (`unk`); fixed the tests, no production change involved.

## Contract problems / open questions

- None blocking. Note: `toPublicBattery` exposes `stock` already; the catalogue page (SPARK-05) may also want `images` later — not needed now, not added.

## Not done

- Nothing from the task. Not committed (per common rules — review + Tornike's approval pending).
