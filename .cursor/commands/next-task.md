# Next Task

This command instructs the agent to work on a task from a task-doc file (same format as TASKS.md). The agent must follow the Progress tracker and task-doc format, and may only mark the task done after implementation, tests written and passing, and no remaining lint issues. When done, the agent updates only **that task’s** row in the Progress tracker and **that task’s section** (see multi-agent format below).

**Optional task number:** The user may pass an optional task number (e.g. “next task 3” or “next task 5”). If provided, work on that task (Id = “Task N”). If not provided, work on the next highest-priority task (first ❌ or 🚧 in the Progress tracker).

## Execution Steps

1. **Locate the task-doc file**
   - Default: `TASKS.md` in the project root.
   - If the user specified a path (e.g. “from TASKS-api-v2.md”), use that file instead.

2. **Identify the task to work on**
   - Open the **Progress tracker** table (columns: Id | Task | Status | Notes).
   - **If the user provided a task number N:** Find the row where Id is “Task N”. If that row has Status ✅, report that the task is already done and stop. Otherwise, that row is the task to work on.
   - **If no task number was provided:** Find the first row where Status is ❌ or 🚧 (not done). If Status is 🚧, that task is already in progress—continue with it. Otherwise that row is the next task. Do not skip tasks; order follows the table.
   - If every row has ✅ (and no task number was given): report that all tasks are complete and stop.

3. **Mark the task in progress**
   - Immediately update only this task’s row and section: set **Status** to 🚧 (in progress) in the Progress tracker and in the task section (`**Status:** 🚧`). This signals that work has started and avoids another agent picking the same task.

4. **Before coding**
   - Read that task’s full section (e.g. `## Task N (Px): <Title>`) for **Goal**, **Where**, **Change**, **Tests**.
   - Read **Learnings** and **What we tried and failed** to avoid repeating mistakes.

5. **Implement the task**
   - Implement the changes described under **Goal** / **Where** / **Change**.
   - Add or update tests as specified under **Tests** (and in Learnings – Testing). Run the relevant tests; for a single file use `pnpm --filter api exec vitest run path/to/file.test.ts`, or pass vitest args after `--` (e.g. `pnpm --filter api test -- path/to/file --run` or `pnpm --filter api test -- -t "pattern" --run`) and fix until they pass.

6. **Definition of done (all must be satisfied before marking done)**
   - Task is implemented as specified in the task section.
   - Tests are written/updated and **all relevant tests pass**. Run the subset for the app you changed (single file: `pnpm --filter api exec vitest run <path>`, or `pnpm --filter api test -- <path-or-pattern> --run`); use full `pnpm test` only when the task or pre-commit requires the entire suite.
   - **No remaining lint issues:** run `pnpm run format` then `pnpm run lint`; fix any failures until both pass.
   - Only after all three are true, proceed to step 7.

7. **Update the task-doc file (multi-agent safe: only this task’s row and section)**
   - **Progress tracker:** Update only the row for this task (Status 🚧 → ✅, Notes one-line summary). Do not edit other rows or a global “Last updated” line.
   - **This task’s section only:** Update the `## Task N ...` section for this task:
     - **Status:** set to ✅ (and **Notes**, **Last updated:** date at top of section if the doc uses that format).
     - **What we tried (this task):** if you hit a dead end, add one bullet: “**What we tried:** … **Why it failed:** … **What we did instead:** …”
     - **Learnings (this task):** add file locations, test commands, gotchas that help the next agent for this task.
     - Optionally **Completed:** subsection describing what was implemented.
   - Do **not** edit global **Last updated**, global **What we tried and failed**, or global **Learnings** when completing a task (so multiple agents can work concurrently without merge conflicts). See `.cursor/rules/tasks-format-multi-agent.mdc` for the full format.

## Progress Format (must match the task-doc)

- **Progress tracker table:** Header row is `| Id | Task | Status | Notes |`. Each task row: Id = “Task N”, Task = `[link text](#task-n-anchor)`, Status = ❌, 🚧, or ✅, Notes = short note or empty. Update only your task’s row.
- **Status values:** ❌ (not done), 🚧 (in progress), ✅ (done). When starting work, set the task to 🚧; when done, set to ✅.
- **Multi-agent:** Prefer per-task **Status** / **Notes** / **Last updated** and **What we tried (this task)** / **Learnings (this task)** inside the task section; do not edit global Last updated or global What we tried / Learnings. See `.cursor/rules/tasks-format-multi-agent.mdc`.

## Expected Outcome

- The chosen task (by optional task number, or else the first ❌ or 🚧 in the Progress tracker) is implemented, tested, and lint-clean.
- The task-doc file is updated: that task’s row and section only (Status, Notes, **What we tried (this task)**, **Learnings (this task)**, **Completed**); no global Last updated / What we tried / Learnings edited.
- The repo is left in a clean state: format and lint run and passing, tests passing.

## Notes

- Run format before lint (per project rules): `pnpm run format` then `pnpm run lint`.
- **Test targeting:** Always run tests for a single app. To run **only one test file**, use `pnpm --filter api exec vitest run <path>` (e.g. `pnpm --filter api exec vitest run scripts/postman.test.ts`). Otherwise use `pnpm --filter api test -- <vitest-args>` or `pnpm --filter admin test -- <vitest-args>` (path, `-t "name"`, `--run` go after `--`). Do not run root `pnpm test` when only one app or one test file is needed (root runs both API and admin). See root `package.json` and `.cursor/rules/testing.mdc`.
- Use the task section and Learnings to decide which tests to run. After changes, run at least the relevant subset (e.g. `pnpm --filter api exec vitest run path/to/file.test.ts` or `pnpm --filter api test -- availability --run`); run full suite only if appropriate before marking done.
- If the task cannot be completed in one session (e.g. blocked or partial), do **not** mark it ✅. Leave Status as 🚧 and add a note in the task section or in **Last updated** explaining what’s left (e.g. “Task 4 in progress; tests pending”).