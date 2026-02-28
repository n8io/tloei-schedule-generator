# Convert Plan to TASKS.md Format

This command converts a plan (from the current message, selection, or conversation) into a new file where the plan’s tasks are transposed into the same structure and format used by TASKS.md. Use it to turn an implementation plan or task list into a resumable, agent-friendly task document.

## Execution Steps

1. **Gather the plan**
   - Use the plan from: the user’s current message, the selected text, or the most recent conversation context that describes the plan.
   - If the user specified a file path (e.g. “convert PLAN.txt”), read that file as the plan.

2. **Infer structure from the plan**
   - **Title:** One-line title for the initiative (e.g. “Fault-tolerant availability fetch”).
   - **Purpose:** One short paragraph describing the goal and why it matters.
   - **Tasks:** List of concrete tasks. For each task infer:
     - Short task title (suitable for a table and anchor link).
     - Priority if mentioned (P0, P1, P2, P3); otherwise assign P1.
     - Goal, Where (files/areas), Change (bullets), Tests (how to verify).
   - **Ordering:** Decide task order from priorities and dependencies; number as Task 1, Task 2, …

3. **Produce a single Markdown file** in the **multi-agent safe** task-doc format (see `.cursor/rules/tasks-format-multi-agent.mdc`). Structure:
   - `# <Title>` then `**Purpose:**` paragraph, then `---`.
   - `## Resume checklist (30-second scan)` — 6 steps: (1) Open Progress tracker; find first task with ❌ (or pick by task number). (2) Read that task’s section and Learnings. (3) Skim **What we tried (this task)** in that section. (4) Implement; run tests. (5) Mark task ✅ in Progress row and in task section; add note. (6) Update **Last updated** and **What we tried (this task)** / **Learnings (this task)** only inside that task section.
   - `## For future agents: how to use this plan` — (1) Resume from Progress tracker (first ❌ or cherry-pick by task number). (2) Before coding, read Learnings and the task section. (3) Update only **your task’s** row and **your task’s** section (no global Last updated / What we tried / Learnings) so multiple agents can work concurrently.
   - `## Progress tracker` — table: `| Id | Task | Status | Notes |`. One row per task; Task = `[Task N title](#task-n-anchor)`, Status = ❌, Notes empty. **No** single `**Last updated:**` line under the table (use per-task section instead).
   - `## Learnings` — subsections: `### Architecture`, `### Key files`, `### Testing`, `### Decisions`. Fill from the plan; rarely edited during task work (agents add to **Learnings (this task)** in each task section).
   - **Task sections (multi-agent safe):** For each task, `## Task N (Px): <Title>` with **at the top:** `**Status:** ❌`, `**Notes:** —`, `**Last updated:** —`. Then **Goal**, **Where**, **Change** (bullets), **Tests**. Then **at the bottom:** `**What we tried (this task):**` (bullet “(None yet)” or empty), `**Learnings (this task):**` (optional). No **Completed** until done.
   - Omit or minimize global `## What we tried and failed`; per-task “What we tried (this task)” is the canonical place for failures.
   - `## Ordering summary` — table: `| Priority | Task | Description |`, one row per task.
   - Use `---` between major sections.

4. **Check for existing file and confirm overwrite**
   - Determine the output path: default `TASKS.md` in the project root, or the path the user specified (e.g. “save as docs/MY-PLAN.md”).
   - If a file already exists at that path:
     - Ask the user: “`TASKS.md` already exists. Overwrite it? (This will wipe the current file before transposing the plan.)”
     - If the user confirms overwrite (e.g. “yes”, “overwrite”, “replace”) → proceed to step 5 and write the file (full overwrite).
     - If the user declines (e.g. “no”, “don’t overwrite”, “keep it”) → do not write; tell them the file was left unchanged and offer to save to a different path if they want.
     - If the response is ambiguous → ask once more for a clear yes/no.
   - If no file exists at that path → proceed to step 5 without asking.

5. **Output the result**
   - Only write if: the target path had no existing file, or the user confirmed overwrite.
   - Write the full content to the file (overwriting any existing content when confirmed).
   - After writing, show the user the path and a one-line summary (e.g. “Created `TASKS.md` with 6 tasks and Progress tracker.” or “Overwrote `TASKS.md` with 6 tasks and Progress tracker.”).

## Format Reference

- **Multi-agent safe:** Each agent edits only their task’s row in the Progress tracker and their task’s section. Per-task: **Status**, **Notes**, **Last updated**, **What we tried (this task)**, **Learnings (this task)**. No global Last updated; no appending to global What we tried / Learnings. See `.cursor/rules/tasks-format-multi-agent.mdc`.
- **Progress tracker:** ❌ = not done, ✅ = done. Task cell: `[Task N: link text](#task-n-anchor)`.
- **Task anchors:** Use lowercase, hyphens for spaces, e.g. `#task-1-p0-isolate-event-fetch-per-resource`.
- **Learnings:** Global subsections: Architecture, Key files, Testing, Decisions. Per-task: **Learnings (this task)** inside each task section.
- **Ordering summary:** P0 first, then P1, P2, P3; same task order as Progress tracker.

## Expected Outcome

- A new Markdown file in the repo in the same format as TASKS.md (the plan’s tasks transposed into that structure).
- All tasks from the plan appear in the Progress tracker and as Task N sections.
- File is ready for agents (or humans) to resume work via “For future agents” and the Progress tracker.

## Notes

- If the plan has no clear tasks, infer 1–3 high-level tasks from the purpose and add a “Discover and break down remaining work” task if needed.
- Preserve any mermaid diagrams or “Current behavior” sections from the plan by placing them in appropriate task or standalone sections.