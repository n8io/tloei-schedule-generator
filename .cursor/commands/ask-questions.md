# Ask Questions (Plan Gaps & Ambiguities)

This command instructs the agent to analyze the plan or scope from the **current context** (your message, selection, or conversation), identify gaps and ambiguities, and ask **any and all** clarifying questions needed to remove them, using Cursor’s native question/answer mechanism. The agent asks one round of questions and then stops.

## Session behavior

- **Write-back permission**: Ask *“May I write our findings back to the plan?”* only until the user gives a clear **yes** or **no** for **this session**. Once the user has said **yes**, do **not** ask again for the rest of the session; treat write-back as confirmed and update the plan when findings are ready. If the user said **no**, do not ask again.
- **Completion signal**: Once all clarifying questions have been asked and there are no further gaps or ambiguities, the agent must reply with: **NO MORE QUESTIONS ✅**

## Execution Steps

1. **Gather context (only)**
   - Use **only** the current context: the user’s message, selected text, or the most recent conversation that describes the plan or scope.
   - Do **not** read or assume `PLAN.md`, `TASKS.md`, or any other file unless the user explicitly provided a path (e.g. “ask-questions for docs/ROADMAP.md”); in that case, use that file as the source.

2. **If a plan or plan file is in context: ask write-back once (unless already confirmed this session)**
   - If the context includes a plan (e.g. pasted plan, or an explicitly referenced file path that is a plan document), **before** asking any gap/ambiguity questions, ask the user **one** question via the native Q&A or chat: *“May I write our findings (resolved gaps and key decisions from our Q&A) back to the plan?”* If the plan is a file, name it (e.g. “back to `docs/ROADMAP.md`”). **Do not ask this again in the same session once the user has answered yes or no.**
   - If the user says **yes** → remember the plan file path (or “current plan in chat”) and **after the single round of Q&A is done** (step 7), update the plan with findings.
   - If the user says **no** or the context has no plan → do not write back to any file; proceed with gap/ambiguity questions only.

3. **Identify gaps**
   - **Missing details**: Areas where the plan says “planned”, “TBD”, “not yet implemented”, or leaves behavior unspecified.
   - **Missing boundaries**: Unclear scope (in/out of scope, limits, edge cases).
   - **Missing decisions**: Tech choices, API contracts, or business rules that are implied but not stated.
   - **Inconsistencies**: Contradictions within the provided context (or between context and an explicitly referenced file).

4. **Identify ambiguities**
   - **Multiple interpretations**: Wording that could mean different things to different implementers.
   - **Underspecified requirements**: “Support X” without acceptance criteria or examples.
   - **Unclear ownership**: Which layer (API / Domain / SPI) or which component is responsible.
   - **Unclear ordering**: Dependencies or sequence of work not explicit.

5. **Produce clarifying questions**
   - For each gap or ambiguity, write **one concrete question** the user can answer.
   - Group by theme (e.g. “User management”, “Notifications”, “API contracts”, “Performance”).
   - Phrase so a short answer reduces the gap or resolves the ambiguity.
   - Prefer questions with clear, short answers (Yes/No, “Use X”, “Scope is A and B only”).

6. **Ask via Cursor’s native Q&A**
   - **Use Cursor’s native clarifying-question mechanism** for each question: invoke the clarifying-question tool (or equivalent) once per question so they appear in the native Q&A UI.
   - The user answers in that UI; answers are then available to the agent as context for follow-up work.
   - In chat, add a **brief summary** (1–2 sentences) of what was analyzed and how many questions were asked. Do **not** duplicate the full question list in the chat message—the questions live in the native Q&A UI.
   - If no tool for native clarifying questions is available, fall back to a single chat message that lists the questions by theme and asks the user to answer in a reply.

7. **Stop after one round**
   - After asking all questions via step 6, stop. Do **not** re-run the analysis, do **not** ask follow-up rounds, and do **not** wait for “two consecutive checks.” One round of questions only.
   - **Before stopping**, if there are no more questions to ask (all gaps/ambiguities addressed or none found), reply with: **NO MORE QUESTIONS ✅**

8. **If the user chose to update the plan: write findings back**
   - **Do not** update the plan file during step 6. Write back **only once**, after the single round of Q&A is done (step 7).
   - If in step 2 the user said **yes** to writing findings back to the plan, update the plan file (or the plan document they referred to) with:
     - A short “Clarifications” or “Resolved gaps & decisions” section (or integrate into an existing section), summarizing key decisions and resolved gaps from the Q&A.
     - Do not duplicate the full plan; only add or update the findings so the plan stays the single source of truth.
   - If the user said **no** in step 2, or no plan was in context, skip this step.

## Expected Outcome

- If a plan is in context, the user is asked once (per session) whether findings may be written back to the plan; after yes/no, do not ask again.
- Each clarifying question is asked via Cursor’s native Q&A mechanism so the user can answer in the UI. Ask **all** questions needed to remove ambiguities in one round.
- The agent asks **one round** of questions and then stops (no re-checking, no follow-up rounds).
- When no more questions remain, the agent replies: **NO MORE QUESTIONS ✅**
- **After** the single round of Q&A is done, if the user agreed to update the plan, the plan file is updated with a clarifications / resolved-decisions section (or equivalent).
- A short summary in chat (what was analyzed, how many questions); full list lives in the native Q&A UI, not duplicated in chat.
- Questions are actionable: answering them removes gaps or resolves ambiguities; answers are available to the agent for later steps.
- No other implementation work: this command only produces and asks questions (and optionally updates the plan file); it does not change code or task status.

## Notes

- If the context is very specific or minimal, the single pass may yield 0–2 questions or “No major gaps or ambiguities found”; that is the only round—no re-checks. In that case still output **NO MORE QUESTIONS ✅** before stopping.
- If the environment does not provide a clarifying-question tool, output the questions in a single chat message by theme and ask the user to reply with answers; still only one round.
- Plan update (step 8) happens only once, after the single round of Q&A is done. Only if the user said yes in step 2.
- Write-back is asked at most once per session; once the user answers yes or no, do not ask again.