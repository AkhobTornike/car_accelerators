# Finder foundation — status (updated by Claude only)

| Task | Owner | What | Status | Review |
|---|---|---|---|---|
| T00 | Claude | Domain contract: `core/` types, engine, repository interface, JSON schemas | done (engine tests pending GLM-01 vitest) | — |
| GLM-01 | GLM | Next.js scaffold + vitest + `@core` alias | prompt ready | — |
| SPARK-01 | Spark | demo_v1 data → `data/*.json` converter | prompt ready | — |
| T01 | Claude | Engine unit tests (after GLM-01 lands) | blocked on GLM-01 | — |
| GLM-02 | GLM | JSON repository + API routes (makes/models/engines/match/old-code) | planned | — |
| SPARK-02 | Spark | Schema validator script + overlap checks | planned (needs GLM-01 for ajv) | — |

Open decisions (Tornike): price/stock on the site vs "call us"; admin single user vs roles; hosting Firebase vs Cloudflare; case-code/polarity convention confirmed with shop.
