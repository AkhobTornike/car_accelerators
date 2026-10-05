# Common rules — read before ANY task in this folder

Project: AMPER.GE battery finder (car batteries, Georgia). Plan: `/home/tornike/Work/car_accelerators/PLAN.md`.
Manager/reviewer: Claude. Decisions: Tornike. You are a helper (GLM or Spark).

## Where things are (absolute paths, main checkout)
- Main checkout: `/home/tornike/Work/car_accelerators` (Claude's; its branch changes). DO NOT edit files here, DO NOT run `git checkout`/`switch`/`stash`/`reset` here.
- Tasks: `/home/tornike/Work/car_accelerators/docs/tasks/2026-10-03-finder-foundation/prompts/`
- Reports: `/home/tornike/Work/car_accelerators/docs/tasks/2026-10-03-finder-foundation/reports/` (write the report HERE, in the MAIN checkout, not in your worktree)
- Domain contract (READ-ONLY for you): `core/types.ts`, `core/fitment-engine.ts`, `core/repository.ts`, `core/schema/*.json`

## Workflow
1. Make your own worktree (the folder `/home/tornike/Work/car_accelerators-wt/` may not exist yet — create it):
   `git -C /home/tornike/Work/car_accelerators fetch origin && git -C /home/tornike/Work/car_accelerators worktree add --no-track -b task/<TASK-ID>-<slug> /home/tornike/Work/car_accelerators-wt/<TASK-ID> origin/main`
   (`main` on GitHub is the base now; the old branch `feat/finder-foundation` is only history. If a task says it needs another task merged first, check `git log origin/main` for it and stop with a report if it is missing.)
2. Work ONLY inside that worktree. Touch only the files your task lists under "Files you may create/change".
3. Leave everything UNCOMMITTED. No `git add`, no `git commit`, no `git push`, no PR. Claude reviews and Tornike approves commits.
4. Never change anything in `core/` (domain contract), `docs/`, `demo_v1/`, `PLAN.md` — unless your task explicitly lists a `core/` file under "Files you may create/change". If you think the contract is wrong, say so in the report under "Contract problems" — do not "fix" it.
5. Run every check listed in "Acceptance" and paste the real command + the real output tail into the report. "Looks fine" is not accepted. If something fails or you could not do it, say that plainly.
6. Write the report to the reports path named in your task. If you only answered in chat, the work counts as NOT finished.

## Report format (`reports/<TASK-ID>-<slug>.md`)
```
# <TASK-ID> report
Status: done | partial | blocked
Worktree: <abs path>   Branch: <name>
## What I did (files created/changed)
## Acceptance checks (command → output tail, one block each)
## Deviations from the task (and why)
## Contract problems / open questions
## Not done
```

## House style
- TypeScript strict, ES modules, 2-space indent, single quotes, semicolons.
- No new dependencies beyond those the task names. No comments that restate the code.
- Georgian text in files stays Georgian; code identifiers are English.
- Never print or commit secrets. No `.env` files with real values.
