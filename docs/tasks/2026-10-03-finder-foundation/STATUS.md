# Finder foundation — status (updated by Claude only)

| Task | Owner | What | Status | Review |
|---|---|---|---|---|
| T00 | Claude | Domain contract: `core/` types, engine, repository interface, JSON schemas | done, committed 974e529 | — |
| T02 | Claude | Inventory/sales contract: `core/inventory.ts`, `core/csv.ts`, Sale/StockMovement types + schemas, InventoryRepository; tests `inventory.test.ts`, `csv.test.ts` | done, 40/40 green with the engine tests (scratch vitest), mutation-checked; uncommitted | — |
| GLM-01 | GLM | Next.js scaffold + vitest + `@core` alias | prompt ready | — |
| SPARK-01 | Spark | demo_v1 data → `data/*.json` converter | prompt ready | — |
| T01 | Claude | Engine unit tests `core/fitment-engine.test.ts` | written, 23/23 green in scratch vitest + mutation-checked; uncommitted; re-run in repo after GLM-01 | — |
| GLM-02 | GLM | JSON repository + API routes (makes/models/engines/match/old-code) | prompt ready; starts after GLM-01 + SPARK-01 are merged; Claude pre-installs zod+ajv | — |
| SPARK-02 | Spark | Data validator (schema, overlaps, refs, coverage) | prompt ready; starts after GLM-01 + SPARK-01 are merged | — |

Planned next: GLM-03 JSON InventoryRepository + sale/CSV admin routes (after GLM-02); SPARK-03 admin sale form (after auth exists).
Decided: price + remaining quantity are public; admin = max 2 people on ONE shared account (no roles).
Open (Tornike): hosting Firebase vs Cloudflare; case-code/polarity convention confirmed with shop; shop's own car↔battery table.
