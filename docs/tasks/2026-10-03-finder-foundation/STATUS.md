# Finder foundation — status (updated by Claude only)

| Task | Owner | What | Status | Review |
|---|---|---|---|---|
| SPARK-01 | Spark | demo_v1 data → `data/*.json` converter | done; verified (schema 0 errors, idempotent, 8 + 169 rows); committed d88dfed | reviewed |
| T00 | Claude | Domain contract: `core/` types, engine, repository interface, JSON schemas | done, committed 974e529 | — |
| T02 | Claude | Inventory/sales contract: `core/inventory.ts`, `core/csv.ts`, Sale/StockMovement types + schemas, InventoryRepository; tests `inventory.test.ts`, `csv.test.ts` | done, mutation-checked; committed 7bbb586 | — |
| GLM-01 | GLM → Claude | Next.js scaffold + vitest + `@core` alias | done by Claude (GLM hit its limit before starting); committed d88dfed | reviewed |
| T01 | Claude | Engine unit tests `core/fitment-engine.test.ts` | 23 tests, mutation-checked; committed 7bbb586 | — |
| GLM-02 | Claude | JSON repository + 5 public API routes (`src/server`, `src/app/api`) | done by Claude, 84 tests green, leak test mutation-checked, live curl on real data OK; uncommitted | reviewed |
| SPARK-02 | Spark | Data validator (schema, overlaps, refs, inventory checks) | prompt ready, waiting for Tornike to paste the line | — |
| SPARK-03 | Spark | Customer finder UI on the real API | prompt ready; after SPARK-02 | — |

Planned next: GLM-03 (Claude or GLM) JSON InventoryRepository + sale/CSV admin routes; SPARK-04 admin sale form (after auth exists).
Decided: price + remaining quantity are public; admin = max 2 people on ONE shared account (no roles).
Open (Tornike): hosting Firebase vs Cloudflare; case-code/polarity convention confirmed with shop; shop's own car↔battery table.
