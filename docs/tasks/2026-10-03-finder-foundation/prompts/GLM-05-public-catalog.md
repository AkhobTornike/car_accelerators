# GLM-05 — public catalogue endpoint, cached active-battery read, robots/sitemap

Read `/home/tornike/Work/car_accelerators/docs/tasks/2026-10-03-finder-foundation/00-COMMON-RULES.md` first. Task id: `GLM-05`, slug `public-catalog`.

## Why
The full website (SPARK-05) needs a product catalogue page. Today the only way to read all batteries is `WriteRepository.listBatteries()`, which is admin-only and uncached — on Firestore every call would read every battery document (the free plan allows 50 000 reads/day). We need a cached, public-safe read.

## Files you may create/change (in your worktree)
`core/repository.ts` (ONE added method, nothing else), `src/server/json-repository.ts`, `src/server/firestore-repository.ts`, `src/server/repository-contract.ts`, `src/server/catalog.ts` (new), `src/server/catalog.test.ts` (new), `src/server/public-dto.ts` (only if needed), `src/app/api/catalog/route.ts` (new), `src/app/api/api.test.ts`, `src/app/robots.ts` (new), `src/app/sitemap.ts` (new), `.env.example` (add `SITE_URL`). Nothing else.

## Part A — repository method
Add to `ReadRepository` in `core/repository.ts`:
```ts
/** Active batteries only, cheap to call often (cached on Firestore). Public-safe filtering is the caller's job (see public-dto). */
listActiveBatteries(): Promise<Battery[]>;
```
- JSON implementation: the active rows of `batteries.json`.
- Firestore implementation: reuse the existing in-memory cached `batteries()` (TTL cache that is cleared by this process's own writes) and filter `active`. It must NOT issue a new Firestore query per call.
- Add contract tests in `src/server/repository-contract.ts` (they run for both backends): inactive batteries are excluded; a battery edited via `upsertBattery` is reflected immediately in the next `listActiveBatteries()`; result is a stable order (sort by `segment`, then `tech`, then `ah`, then `id`).
- Any test double that implements `ReadRepository` must still type-check (grep for them).

## Part B — catalogue for pages and API
- `src/server/catalog.ts`: `export async function getPublicCatalog(): Promise<PublicBattery[]>` = `getRepository().listActiveBatteries()` mapped with the existing explicit-pick `toPublicBattery`. Pages (server components) will call this directly, no HTTP hop. Also export `type PublicBattery` (re-export).
- `GET /api/catalog` → `{ batteries: PublicBattery[] }`, `Cache-Control: public, max-age=300`. Optional filters, validated with `zod` like the other public routes (unknown params ignored, bad values → `400 {error:'invalid_request'}`): `segment` ∈ `car|truck|moto|deep`, `tech` ∈ `SMF|EFB|AGM|DEEP-CYCLE`. Same generic 500 handling as the other routes (use `handle()` from `src/server/http.ts`).
- Privacy tests (copy the style of the existing leak test in `src/app/api/api.test.ts`): the response never contains `costPrice`, `oemCodes`, `active`, `verified`, `source`, even when the stored battery has them set to distinctive values; inactive batteries never appear; `quantity` is present only when known.

## Part C — robots and sitemap
- `src/app/robots.ts`: allow `/`, **disallow `/api/` and `/m/`** (the admin lives under `/m/<secret>/`), and point to `${SITE_URL}/sitemap.xml`.
- `src/app/sitemap.ts`: the home page only for now, plus the anchors are NOT urls — do not add `#...` entries.
- `SITE_URL` from env (default `http://localhost:3000`), documented in `.env.example`.

## Acceptance (paste real output tails)
- `npm run lint`, `npm run typecheck`, `npm run test` (state the count), `npm run build` — all green
- `npm run test:emulators` — the contract suite incl. the new tests passes on Firestore too (needs Java; it starts the emulator itself). If you cannot run it, say so plainly.
- Mutation check: temporarily remove the `active` filter from the Firestore `listActiveBatteries` and show the new contract test failing; restore it.
- `curl` against `npm run dev` (use port 3105; stop the server by its exact PID, never `pkill`): `/api/catalog`, `/api/catalog?tech=AGM`, `/api/catalog?tech=nope` (400), `/robots.txt`, `/sitemap.xml` — paste the first lines.
- `git status --short` — only allowed files

Report: `/home/tornike/Work/car_accelerators/docs/tasks/2026-10-03-finder-foundation/reports/GLM-05-public-catalog.md`
