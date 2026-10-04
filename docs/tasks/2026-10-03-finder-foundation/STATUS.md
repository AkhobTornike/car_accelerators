# Finder foundation — status (updated by Claude only)

| Task | Owner | What | Status | Review |
|---|---|---|---|---|
| SPARK-01 | Spark | demo_v1 data → `data/*.json` converter | done; verified (schema 0 errors, idempotent, 8 + 169 rows); committed d88dfed | reviewed |
| T00 | Claude | Domain contract: `core/` types, engine, repository interface, JSON schemas | done, committed 974e529 | — |
| T02 | Claude | Inventory/sales contract: `core/inventory.ts`, `core/csv.ts`, Sale/StockMovement types + schemas, InventoryRepository; tests `inventory.test.ts`, `csv.test.ts` | done, mutation-checked; committed 7bbb586 | — |
| GLM-01 | GLM → Claude | Next.js scaffold + vitest + `@core` alias | done by Claude (GLM hit its limit before starting); committed d88dfed | reviewed |
| T01 | Claude | Engine unit tests `core/fitment-engine.test.ts` | 23 tests, mutation-checked; committed 7bbb586 | — |
| GLM-02 | Claude | JSON repository + 5 public API routes (`src/server`, `src/app/api`) | done by Claude, 84 tests green, leak test mutation-checked, live curl on real data OK; uncommitted | reviewed |
| GLM-03 | Claude | Inventory on JSON (`json-inventory.ts`: sale, void, receive, adjust, lists), admin API under `/api/admin/*` (token guard, fail-closed, lockout), 3 CSV exports, `checkCustomer` | done; 132 tests green; auth + validation mutation-checked; live smoke on a data copy OK; uncommitted | reviewed |
| SPARK-02 | Spark | Data validator (schema, overlaps, refs, inventory checks) + `npm run validate:data` | done; verified by Claude (24 own tests, 164 total, real data 0 errors, cross-checked on sales/movements written by the inventory repo); Claude added the npm script | reviewed |
| GLM-04 | Claude | Firestore backend (`firestore-repository.ts`, shared contract suite, seed script) + Firebase admin login (`admin-auth.ts`, ADMIN_EMAILS) + `GET /api/admin/batteries`; Firebase project amperage-90dfc, Firestore europe-west3, Google sign-in, web app amper-admin | done; committed d6beaa2, bf171f8; batteries route uncommitted | reviewed |
| SPARK-04 | Spark | Admin screens (login, sale form, sales list/void, stock, CSV export) at `/m/<ADMIN_PATH>/` | prompt ready; starts from the commit that adds the batteries route + firebase package | — |
| GLM-05 | GLM | `listActiveBatteries()` (cached), `getPublicCatalog()`, `GET /api/catalog`, robots.txt + sitemap | done; verified by Claude (210 tests, emulators 26/26, mutation, real Firestore read); merged via PR | reviewed |
| SPARK-05 | Spark | Full website: all demo_v1 sections on the real stack (catalogue from the API, "not sure" via WhatsApp, SEO/JSON-LD); needs GLM-05 merged | prompt ready; after GLM-05 | — |
| SPARK-03 | Spark | Customer finder UI on the real API | done; verified by Claude (140 tests, lint, typecheck, build; walked the flow in a real browser). Claude fixed: removed the misleading "from" price label, single-column spec rows on phones (overlap seen at 390px; fix not re-verified visually); files copied into main checkout, Spark worktree untouched | reviewed |

Planned next: SPARK-04 admin UI (sale form, stock, exports) once real admin login exists; real admin auth (Firebase) replaces the interim `ADMIN_API_TOKEN` guard; ADMIN path secrecy + noindex.
Decided: price + remaining quantity are public; admin = max 2 people on ONE shared account (no roles).
Open (Tornike): hosting Firebase vs Cloudflare; case-code/polarity convention confirmed with shop; shop's own car↔battery table.
