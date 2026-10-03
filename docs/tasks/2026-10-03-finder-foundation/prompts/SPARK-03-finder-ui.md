# SPARK-03 — customer finder UI on the real API

Read `/home/tornike/Work/car_accelerators/docs/tasks/2026-10-03-finder-foundation/00-COMMON-RULES.md` first. Task id: `SPARK-03`, slug `finder-ui`.
Start after SPARK-02 is done. Your base branch `feat/finder-foundation` contains the working public API (GLM-02 was built by Claude) — read `src/app/api/**` and `src/server/public-dto.ts` to see the exact response shapes.

## Goal
Replace the placeholder home page with the battery finder from `demo_v1/index.html` (section `#finder`, script around lines 1216–1330), but driven by the real API instead of the embedded `FITMENT`/`PRODUCTS` tables. ONLY the finder is in scope: no catalog, FAQ, hero, technology or contact sections yet.

## Files you may create/change (in your worktree)
`src/app/page.tsx`, `src/app/layout.tsx`, `src/app/globals.css`, `src/components/finder/**`, `src/lib/api-client.ts`, `src/lib/api-client.test.ts`, `public/**`. Nothing under `src/server/`, `src/app/api/`, `core/`, `data/`, `docs/`. No new dependencies (CSS in `globals.css` or CSS modules; no Tailwind, no UI kit). If the API is missing something you need, report it under "Contract problems" — do not edit it.

## UI behaviour (same flow as the demo)
1. Vehicle type tabs (car / van; truck and moto exist in the type but have no data yet — show the tabs only for types whose `makes` list is non-empty).
2. Selects in this order: **Year → Make → Model → Engine**. Year is a plain list (current year down to 1990). Make comes from `/api/vehicles/makes`, Model from `/api/vehicles/models`, Engine from `/api/vehicles/engines` **with the chosen year** (so only variants that cover that year appear). Changing an earlier select resets and reloads the later ones. Each dependent select is disabled until its parent is chosen.
3. Choosing an engine calls `/api/match?fitmentId=…` and renders the results, best first: product name, tech badge (SMF/EFB/AGM), the `spec` line (e.g. "L+, L3, 68Ah, 760A"), price in ₾ (`price: null` → "Ask for price"), stock: `quantity` when present ("12 in stock" / "Only 2 left" when ≤ 3 / "Out of stock" / "Order only" per `stock`), warranty in months. `tier: 'upgrade'` gets a visible "Upgrade" label with the reasons from `notes` in plain words (`tech-upgrade` → "better technology (AGM)", `higher-capacity` → "more capacity", `higher-cca` → "stronger cold start"). `notes: ['pinned']` shows nothing special.
4. Every result has a WhatsApp button prefilled with the car and battery (`https://wa.me/995555123456?text=…`, URL-encoded) and a call link (`tel:+995322550011`) — same numbers as the demo.
5. Second path "I have the old battery code": one input → `/api/old-code?code=…` (min 3 chars) → same result cards (these have no `tier`/`spec`; compute the spec line from the fields).
6. Always show the fitment disclaimer from the demo ("Fitment is always confirmed by our team before installation").
7. States: loading (skeleton or "Loading…" text per select/results), empty ("No match found — send us a photo of the old battery on WhatsApp"), error (API non-2xx or network → "Something went wrong, please try again" + retry button). Cancel/ignore stale responses when the user changes a select quickly (AbortController or a request counter).

## Design rules (this is Tornike's brand, keep it)
- LIGHT theme only: reuse the CSS custom properties and the look of the demo (concrete grey + white + amber, fonts Barlow Condensed / IBM Plex Sans / IBM Plex Mono / Noto Sans Georgian via `next/font/google`). Copy the relevant CSS from the demo's `<style>` block, do not invent a new look.
- Mobile-first: works at 360px wide, no horizontal scroll; tap targets ≥ 44px.
- Accessible: real `<label>`s, `aria-live="polite"` on the results region, visible focus ring, errors with `role="alert"`, keyboard operable tabs. No `#FFF` pure white (use the demo's off-white), no text under 12px.
- No emojis; reuse the demo's inline SVG icons if you need icons.

## Code rules
- Client component(s) under `src/components/finder/`; `page.tsx` stays a server component.
- All fetching goes through `src/lib/api-client.ts` (typed functions, one per endpoint, validating nothing fancy — just typed `fetch` + error on non-2xx). Types for responses are defined there by hand (do not import from `src/server`).
- Unit-test `api-client.ts` with vitest by stubbing `fetch` (success, non-2xx, query-string encoding of `"3 series"` and `"Citroën"`). No DOM/component tests needed.

## Acceptance (paste real output tails)
- `npm run lint`, `npm run typecheck`, `npm run test`, `npm run build` — all green (state the test count)
- `npm run dev` (use another port if 3000 is busy, stop the server afterwards by killing the exact PID, not `pkill`): `curl -s localhost:<port>/` returns HTML containing the finder heading.
- Walk the flow in a browser if you have one (car → 2015 → BMW → 3 series → F30 engine) and describe what you saw; if you have no browser, say so plainly — do not claim a visual check you did not do.
- `git status --short` — only allowed files.

Report: `/home/tornike/Work/car_accelerators/docs/tasks/2026-10-03-finder-foundation/reports/SPARK-03-finder-ui.md`
