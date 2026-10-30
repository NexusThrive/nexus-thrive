---
name: ciclo-sprint
description: This skill should be used when the user wants the agents to build the backlog autonomously during a sprint, from design through CI, pull request review and merge into the sprint branch, with the human only supervising. Triggers include "ciclo de sprint", "ejecuta el sprint", "trabaja el backlog", "ciclo de ingeniería", "sprint autónomo", "/ciclo-sprint", and "arranca el sprint SNN". Requires a backlog and plan created by nueva-funcionalidad.
argument-hint: "NN del sprint, por ejemplo 01, y opcionalmente historias separadas por coma"
---

# Ciclo de sprint autónomo

Run the engineering loop for one sprint. The loop takes the next ready story from `docs/product/plan.md`, designs it, implements it, verifies it, reviews it, merges it into `sprint/S<nn>`, and moves to the next one. The human supervises through the sprint report and the pause switch. The human does not approve each story.

Read `references/reglas-ramas.md` before starting. Its rules are hard: never bypass them.

## Preconditions

Stop and tell the user what is missing if any of these fail:

1. `docs/product/plan.md` exists and lists at least one story that is ready (not marked "Bloqueada").
2. The workspace is a git repository with a remote, and `gh auth status` succeeds.
3. `.product-team/ci.json` exists. If not, copy `templates/ci.json.example` from the plugin into `.product-team/ci.json` and tell the user which commands it uses, so they can adjust them.
4. `.github/workflows/ci.yml` exists. If not, copy `templates/.github/workflows/ci.yml` there.
5. The sprint branch `sprint/S<nn>` exists. If not, create it from `main`, push it, and then check it out.

If any step creates files in the repository, commit them in a single setup commit on a branch named `chore/HU-setup-ciclo-sprint-01`, with a PR to `sprint/S<nn>`. Wait for CI to pass before starting stories.

## Pause switch

Before each story, check whether the file `docs/ingenieria/PAUSA` exists. If it exists, stop the loop, write the current state to the sprint report, and tell the user the loop is paused. The human stops the loop by creating that file and resumes it by deleting it. Never delete it yourself.

## Loop

For each story in order from the plan (respecting dependencies, and skipping blocked ones):

1. **Select.** Take the first story that is ready (not "Bloqueada") and whose dependencies are already merged. Record the selection in the sprint report.
2. **Design.** Run the `arquitecto` agent. Its output is `docs/ingenieria/diseno/<story-id>.md`. If it marks the story as blocked, mark it blocked and go to step 1.
3. **Implement.** Read the "Tipo de trabajo" field of the design note and route the story:
   - `backend` -> run the `desarrollador-junior` agent.
   - `frontend` or `mixto` -> run the `desarrollador-frontend` agent.
   The developer creates the task branch, writes tests, implements, runs the gate, commits, pushes and opens a PR to `sprint/S<nn>`. If a developer escalates a question, answer it from the design note or the domain brief when possible; otherwise record it as a blocker. Never let the developer guess.
4. **Verify.** Run the `control-calidad` agent on the branch. Its verdict must be APROBADA.
5. **Review.** Run the `revisor-pr` agent (Senior profile) on the PR. The reviewer must never be the agent that wrote the code. Its verdict must be APROBADO.
6. **Merge.** Check that every CI check is green (`gh pr checks <n>`). Then run `gh pr merge <n> --squash --delete-branch`. Never merge with a failing check, a pending check, or a CHANGES verdict.
7. **Update.** Mark the story as "terminada" in the backlog file. Update the plan so dependent stories become ready. Update the sprint report.
8. Go back to step 1.

### Retries and escalation

Each stage can fail. Track attempts per story:

- If the developer's gate fails, the developer may fix it and retry. **Maximum 3 attempts** for the whole implementation.
- If QA or the reviewer requests changes, send the findings back to the developer. This counts as an attempt.
- After 3 failed attempts, or if a stage reports a blocker, mark the story as **bloqueada**, record the reason and the last failing output in the sprint report, and continue with the next story that does not depend on it.
- Never retry by changing the acceptance criteria, lowering coverage, or skipping a check.

### What the human sees

After every merge or blocker, update `docs/ingenieria/sprint-<nn>/reporte.md` with:

```markdown
# Reporte del sprint S<nn>

Estado: EN CURSO / PAUSADO / COMPLETADO

| Historia | Estado | PR | Intentos | Nota |
| --- | --- | --- | --- | --- |
| HU-exportar-reportes-01 | terminada | #12 | 1 | |
| HU-exportar-reportes-02 | bloqueada | #13 | 3 | Gate falla en cobertura (62%) |

Última actualización: <fecha y hora>
```

## Sprint end

When no story remains that can be started, or all remaining stories are blocked:

1. Set the report state to COMPLETADO.
2. Open a PR from `sprint/S<nn>` to `main` with the report as its body. Name the branch and the PR as promotion. Do not merge it.
3. Tell the user the promotion PR is ready and summarize the report in chat: stories done, stories blocked and why, and the promotion PR link.

The promotion to `main` is the only step that requires a human decision.

## Hard rules for this loop

- Never push to `main` or `sprint/*` directly.
- Never merge a PR without APROBADO from `revisor-pr`, APROBADA from `control-calidad`, and green checks.
- Never use `--no-verify`, `--force` or any flag that skips hooks or checks.
- Never edit acceptance criteria during the loop. Only the Requirements Analyst can change them, and only with the user.
- Never run more than one story at a time in the same working tree. Stories are sequential within a sprint.
- If the pause file appears mid-story, finish the current stage, do not start the next one, and report.
