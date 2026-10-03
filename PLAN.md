# AMPER.GE — Real battery finder: plan (agreed 2026-10-01)

Status: PAUSED until the client's Google account is available (needed for Firebase project / Auth).
demo_v1 (static, pushed on branch `demo-v1`) stays as the visual base.

## Stack (decided)
- Next.js (SSR/SEO) + Firebase: Firestore, Auth, App Hosting (Blaze plan, needs a card; real cost ~0).
- Hosting alternative if Firebase is rejected: Cloudflare (Next.js via OpenNext, free incl. commercial).
- NOT Vercel Hobby (non-commercial terms) and NOT Angular (SEO/weight).

## Core principle: data never goes to the browser
- Firestore rules deny ALL client reads/writes. Only Next.js server routes (Admin SDK) touch data.
- Public API returns only matching batteries for a full combo (make+model+engine+year); no list endpoints that rebuild the whole DB.
- Anti-scrape: per-IP rate limit, Turnstile / App Check, short cache (~5 min), watermarked images. Full prevention is impossible; goal = make bulk download costly.

## Matching logic (lookup + rules, not a formula)
Fitment record per car variant: make, model, engine, years[from,to], oem{ah_min, cca_min, polarity, case(L2/L3...), terminals/hold-down, tech, start_stop}.
Battery passes only if:
- polarity exact, case/dimensions exact (±2mm), terminal+hold-down type exact
- Ah >= OEM min and <= +25%; CCA >= OEM min
- start-stop car -> only EFB/AGM
Ranking: exact OEM -> upgrade (higher CCA/Ah, AGM instead of standard) -> price ascending. Each result shows the reason ("R+, L2, 60Ah, 540A").
Risks: mid-year variants, EU vs US/JP/KR imports, hybrids (12V aux battery), data accuracy.
Fallbacks when no match: old battery code lookup, VIN, photo of label -> WhatsApp check. Always show fitment disclaimer.

## Admin panel (separate frontend)
- Secret path (e.g. /m-<random>/, from env, noindex, 404 on /admin etc.) = obscurity only.
- Real protection: Firebase Auth (Google login + 2FA) or Cloudflare Access; server-side token check on every write API; login attempt limits.
- Features: add/edit battery (photo, Ah, CCA, polarity, size, tech), inline price + stock edit, fitment editor (car -> batteries), CSV/Excel import, change history (who/when/what).
- Open question: one admin or several (roles)?

## Phases
1. Data model + JSON Schema + validation (ids exist, years don't overlap)
2. Next.js API routes (makes/models/engines/batteries/old-code lookup), input whitelist, strict CORS
3. Anti-scraping (rate limit, Turnstile/App Check, cache)
4. Client frontend: reuse demo_v1 UI, replace embedded DB with API calls, loading/empty states
5. Admin frontend + auth
6. Data entry — longest part; start with common GE-market makes (Toyota, Mercedes, BMW, Opel, VW, Ford, Hyundai, Kia). Ask the shop for their own car<->battery table (Excel/notes) first.
7. Deploy (Firebase App Hosting), tests (fitment logic, scrape-attempt script, Lighthouse/a11y)

## Open decisions
- Hosting: Firebase App Hosting (leaning yes) vs Cloudflare
- Admin: single user vs roles
- Show price/stock on site, or "call/WhatsApp" only
- Data source: does the shop provide a table?
