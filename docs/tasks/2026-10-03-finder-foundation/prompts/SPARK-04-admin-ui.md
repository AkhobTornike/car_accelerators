# SPARK-04 — admin screens: login, sales form, sales list, stock, CSV export

Read `/home/tornike/Work/car_accelerators/docs/tasks/2026-10-03-finder-foundation/00-COMMON-RULES.md` first. Task id: `SPARK-04`, slug `admin-ui`.
Your base branch `feat/finder-foundation` has the admin API (`src/app/api/admin/**`), the Firebase admin login on the server, and the `firebase` npm package already installed. Read `src/app/api/admin/**/route.ts`, `src/server/admin-schemas.ts` (the exact request bodies) and `core/types.ts` (Sale, Battery, StockMovement) before you start. The shopkeepers who use this are Georgian — **all visible text in Georgian**, kept in ONE file `src/components/admin/labels.ts` so it can be changed later.

## Goal
A small back-office for the shop: sign in with Google, record a sale in as few taps as possible, see and void sales, receive/adjust stock, download CSV. Used by 1–2 people, low volume — simple and clear beats clever.

## Files you may create/change (in your worktree)
`src/app/m/[slug]/**`, `src/components/admin/**`, `src/lib/firebase-client.ts`, `src/lib/admin-api.ts`, `src/lib/admin-api.test.ts`, `src/app/globals.css` (append admin styles at the end, do not edit existing rules). Nothing under `src/server/`, `src/app/api/`, `core/`, `data/`, `docs/`, `package.json` (no new dependencies). If the API lacks something, say so under "Contract problems".

## Access and login
- Screens live at `/m/<slug>/`. A server-side check compares `<slug>` with `process.env.ADMIN_PATH`; if `ADMIN_PATH` is unset or different → `notFound()` (a real 404, same page as any unknown URL). The pages must send `robots: noindex, nofollow`.
- Client-side login with the Firebase web SDK (`firebase/app`, `firebase/auth`): `signInWithPopup` + `GoogleAuthProvider`, `onAuthStateChanged`. Config from `NEXT_PUBLIC_FIREBASE_API_KEY`, `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN`, `NEXT_PUBLIC_FIREBASE_PROJECT_ID`, `NEXT_PUBLIC_FIREBASE_APP_ID` (values are in `.env.example`; copy that file to `.env.local` in your worktree — it is gitignored). Initialise Firebase lazily in `src/lib/firebase-client.ts` and never on the server.
- Signed out: one screen with the shop name and a "Sign in with Google" button. Signed in: header with the email and a sign-out button.
- `src/lib/admin-api.ts`: `adminFetch(path, init)` adds `Authorization: Bearer <await user.getIdToken()>`; typed helpers for each endpoint; on `401` the UI shows "this account is not allowed" with a sign-out button; on `429` "too many attempts, try later"; on `422`/`400` show the `details` strings from the response next to the form (they never contain customer data); on network/`500` a generic retry message.

## Screens (tabs: Sales · New sale · Stock · Export)
**New sale — the "easy fill" form (the most important screen).**
- Battery picker: a search box that filters the list from `GET /api/admin/batteries` by name / Ah / CCA / case code; each option shows name, spec line and remaining quantity; sold-out batteries are shown but disabled. Choosing one fills **qty = 1** and **unit price = battery.price** (editable). "Add another battery" adds a line (max 10 in the UI); lines can be removed.
- Customer: first name, last name, **one field** "ID number or IBAN" (if after removing spaces it matches `GE` + 2 digits + 2 letters + 16 digits → send as `iban` (upper-case); if 9 or 11 digits → `idNumber`; otherwise show an inline error and do not submit), phone (optional).
- Discount (₾, default 0), payment method (cash / transfer / card, default cash), note (optional). The live total (`sum(qty×unitPrice) − discount`) is shown and must match what the server returns.
- Submit → `POST /api/admin/sales`. On success show a confirmation panel (sale id, total, customer name, items) and a "New sale" button that clears the form and keeps the focus on the battery search. On `422` show the details and keep everything typed. Disable the submit button while the request runs (no double submits).
- Keyboard friendly: logical tab order, Enter in a text field never submits by accident, `autocomplete="off"` on customer fields.

**Sales.** Table of sales (default: last 30 days; from/to date inputs → `GET /api/admin/sales?from=&to=`), newest first: date/time (Tbilisi time, `Asia/Tbilisi`), customer, items summary, total, payment, status. Voided sales are marked and greyed, with the reason. A "Void" action opens an inline reason field → `POST /api/admin/sales/<id>/void`; after success reload the list. Never offer edit or delete of a sale.

**Stock.** Table from `GET /api/admin/batteries`: name, tech, spec, quantity (highlight ≤ 3 and 0), stock status, price, cost price. Actions per row: "Receive" (qty ≥ 1, optional unit cost, note → `POST /api/admin/stock/receive`) and "Count" (counted quantity ≥ 0, note → `POST /api/admin/stock/adjust`); reload after success. Show `409 no_change` as "quantity is already that".

**Export.** Three buttons (sales, stock, movements) → fetch `GET /api/admin/export/<kind>` with the auth header, take the blob, save it with the filename from `Content-Disposition` (plain `<a href>` cannot send the header). Sales/movements get the same optional from/to dates.

## Design rules
LIGHT theme, reuse the look of the customer finder (`src/app/globals.css` variables, fonts already loaded in `layout.tsx`: Barlow Condensed, IBM Plex Sans/Mono, Noto Sans Georgian — Georgian text must render in Noto Sans Georgian). Works on a laptop and a phone (360px wide, no horizontal page scroll; tables become stacked cards on phones). Tap targets ≥ 44px, real `<label>`s, visible focus ring, errors with `role="alert"`, status changes with `aria-live="polite"`, no text under 12px, no emojis, no pure `#FFF`. Money as `1 234.50 ₾`. Loading, empty and error states for every list.

## Tests and checks
- Unit tests for `src/lib/admin-api.ts` with a stubbed `fetch` and stubbed token getter: adds the Bearer header, builds query strings, maps 401/429/422/500 to distinct errors, filename parsing from `Content-Disposition`. Also unit tests for the pure helpers you write: ID-number-or-IBAN detection, money formatting, sale total.
- Acceptance (paste real output tails): `npm run lint`, `npm run typecheck`, `npm run test`, `npm run build` all green.
- Local run: create a temp copy of the data (`cp -r data /tmp/amper-admin-data`), then `DATA_DIR=/tmp/amper-admin-data ADMIN_PATH=test-slug-12345 ADMIN_API_TOKEN=local-token-0123456789-abcdefg npm run dev -- --port 3104`. Check with curl: `/m/test-slug-12345` → 200 and contains the Georgian login text; `/m/wrong` → 404; the 404 body is identical to `/anything-else`. Stop the server by its exact PID (never `pkill`).
- You cannot sign in with Google in a script, so the logged-in screens cannot be verified by you — **say so plainly in the report** and list which parts are untested (Claude will click through them in a real browser). Do not add any login bypass to the UI code.
- `git status --short` — only the allowed files.

Report: `/home/tornike/Work/car_accelerators/docs/tasks/2026-10-03-finder-foundation/reports/SPARK-04-admin-ui.md`
