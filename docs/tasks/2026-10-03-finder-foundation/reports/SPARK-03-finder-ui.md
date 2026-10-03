# SPARK-03 report
Status: done
Worktree: /home/tornike/Work/car_accelerators-wt/SPARK-03   Branch: task/SPARK-03-finder-ui
## What I did (files created/changed)
- `src/lib/api-client.ts` (new): hand-defined response types (`PublicBattery`, `PublicMatch`, `EngineOption`, … — no imports from `src/server`), one typed `fetch` function per endpoint (`getMakes`, `getModels`, `getEngines`, `getMatches`, `searchByOldCode`), `ApiError` with `status` on non-2xx, optional `AbortSignal`, `URLSearchParams` encoding.
- `src/lib/api-client.test.ts` (new): 8 tests — success paths, `+`/UTF-8 query encoding (`3 series`, `Citroën`), non-2xx throws.
- `src/components/finder/Finder.tsx` (new, client): search-method tabs (By vehicle / By battery code, arrow-key operable) + demo SVG sprite (`i-car`, `i-search`, `i-wa`, `i-phone`, `i-info`).
- `src/components/finder/VehiclePane.tsx` (new, client): vehicle-type tabs rendered only for types with non-empty `makes` (all four probed on mount), Year → Make → Model → Engine selects (year list = current year → 1990, engines fetched with chosen year), engine choice auto-calls `/api/match`, AbortController + request counter against stale responses.
- `src/components/finder/CodePane.tsx` (new, client): input + submit (min 3 chars, Enter works) → `/api/old-code` → same cards, spec computed as `polarity, caseCode, Ah, CCA`.
- `src/components/finder/Results.tsx` + `ResultCard.tsx` (new): `aria-live="polite"` region; loading text; empty ("No match found — send us a photo of the old battery on WhatsApp" + WhatsApp button); error + Retry; cards with name, tech badge, `spec`, price in ₾ (`null` → "Ask for price"), stock line from `quantity` ("N in stock" / "Only N left" ≤ 3 / "Out of stock" / "Order only"), warranty months, "Upgrade" label with plain-word notes, WhatsApp (`wa.me/995555123456`, URL-encoded car + battery) and `tel:+995322550011` buttons.
- `src/app/page.tsx` (changed, still a server component): `#finder` section, "Battery finder" eyebrow + "Find the right battery" heading, always-visible fitment disclaimer.
- `src/app/layout.tsx` (changed): Barlow Condensed / IBM Plex Sans / IBM Plex Mono / Noto Sans Georgian via `next/font/google` (latin + georgian subsets).
- `src/app/globals.css` (changed): LIGHT theme only, copied from the demo `<style>` block (`:root` vars, buttons, tabs, fields, results, pills, tech badge). Nothing under `src/server/`, `src/app/api/`, `core/`, `data/`, `docs/` touched; no new dependencies.
- Per `AGENTS.md` I read the bundled Next docs first (`client-side-data-fetching`, `use-client`, `font` guides): plain `fetch` in a client component is a supported pattern, no data library added.

## Acceptance checks (command → output tail, one block each)
`npm run test`:
```
Test Files  7 passed (7)
     Tests  92 passed (92)
```
`npm run lint` → clean, no output. `npm run typecheck` → `next typegen && tsc --noEmit`, "Types generated successfully", no errors.
`npm run build`:
```
✓ Compiled successfully in 10.1s
Route (app)
┌ ○ /
├ ○ /_not-found
├ ƒ /api/health
├ ƒ /api/match
├ ƒ /api/old-code
├ ƒ /api/vehicles/engines
├ ƒ /api/vehicles/makes
└ ƒ /api/vehicles/models
```
`npm run dev -- --port 3103` (port 3000/3001 were free; used 3103), then curl:
```
home:200
{"makes":["Audi","BMW","Citroën",…(23 makes)…,"Volvo"]}
{"engines":[{"fitmentId":"car-bmw-3-series-2","label":"F30 · 316i–320i · start-stop","yearFrom":2012,"yearTo":2019}]}
{"results":[{"id":"a68","name":"AMPER A68",…,"tech":"AGM",…,"spec":"L+, L3, 68Ah, 760A","notes":["pinned"]}]}
```
i.e. the full demo walk (car → 2015 → BMW → 3 series → F30 engine → match) verified against the real API. Home HTML contains: `Battery finder`, `Find the right battery`, `id="finder"`, `By vehicle`, `By battery code`, `Fitment is always confirmed by our team before installation.` Server stopped afterwards by exact PIDs (`kill 163506`, then the orphaned children `kill 163519 163531` — plain `kill`, no `pkill`); port 3103 confirmed closed (`curl` → `000`).
Browser walk: I have no browser available, so no visual check — the flow above is API-verified only, no pixel claims.
`git status --short --untracked-files=all` (worktree):
```
M src/app/globals.css
M src/app/layout.tsx
M src/app/page.tsx
?? src/components/finder/CodePane.tsx
?? src/components/finder/Finder.tsx
?? src/components/finder/ResultCard.tsx
?? src/components/finder/Results.tsx
?? src/components/finder/VehiclePane.tsx
?? src/lib/api-client.test.ts
?? src/lib/api-client.ts
```
Only allowed files.

## Deviations from the task (and why)
- Started before SPARK-02 is done (you redirected me to SPARK-03 mid-SPARK-02). No dependency conflict: the UI only needs the API + data, both present on the base. My untouched SPARK-02 worktree (`../car_accelerators-wt/SPARK-02`, no files created) is still there if needed.
- `tech-upgrade` note renders as "better technology (EFB/AGM…)" using the battery's own tech instead of the literal "better technology (AGM)" — the literal string is wrong for EFB batteries.
- Demo CSS text below 12px (10–11px labels, pills, badges) bumped to 12px and `.btn-sm` 40px → 44px, per the task's own accessibility rules; look otherwise unchanged.
- Result cards drop the demo's generated battery SVG (`.rrender` column) — grid adapted to `1fr auto`; icons still come from the demo sprite.
- No "Not sure — send a photo" tab: out of scope (only two paths specified); the empty state links to WhatsApp instead.
- Test asserts `model=3+series`: `URLSearchParams` encodes spaces as `+`, which the API decodes identically to `%20` (verified live above with `%20`).

## Contract problems / open questions
- None — the API had everything the UI needs (`fitmentId` per engine option, `quantity`/`tier`/`spec`/`notes` on matches, normalised old-code search). No `src/server` or `core` change required.
- Note: with real data only `car` + `van` type tabs render (`truck`/`moto` have no fitments yet), exactly as specified.

## Not done
- Nothing. All acceptance checks pass; no visual browser check (no browser available).
