---
name: nueva-funcionalidad
description: This skill should be used when the user proposes a new functionality, feature, change, or problem to solve in the product, and wants it turned into user stories for the backlog. Triggers include "nueva funcionalidad", "quiero agregar", "necesitamos que la app", "historia de usuario", "agregar al backlog", "llevar a la mesa de trabajo", "definir requerimientos", and "/nueva-funcionalidad". Coordinates the mesa de trabajo, Product Owner, Requirements Analyst and Project Manager agents in sequence.
argument-hint: "descripción de la funcionalidad o problema"
---

# Nueva funcionalidad: de la idea al backlog

Run the product pipeline for a new functionality. The pipeline has four stages, each owned by one agent. Run them in order. Do not skip a stage, because each stage depends on the output of the previous one.

The user's request is available as the argument, or in the conversation if no argument was given. If the request is empty or too vague to act on, ask one question with AskUserQuestion to get the core need, then continue.

## Stage 1: Mesa de trabajo (domain understanding)

Launch the `mesa-de-trabajo` agent with the user's request and the instruction to read the codebase of the current workspace.

Wait for it to finish. Confirm that `docs/product/contexto-dominio.md` exists in the workspace before continuing. If it does not exist, or the agent reports that the workspace has no application code, stop and tell the user what is missing. Ask for the repository path or a description of the domain.

## Stage 2: Product Owner (value and scope)

Launch the `product-owner` agent with:
- The original request.
- The path to the domain brief.

Wait for it to produce `docs/product/funcionalidades/<slug>.md`. If it asks the user a question that changes scope, relay the question with AskUserQuestion and pass the answer back before continuing.

## Stage 3: Requirements Analyst (user stories)

Launch the `requirements-analyst` agent with:
- The path to the feature definition.
- The path to the domain brief.

Wait for it to produce `docs/product/backlog/<slug>.md`. Relay any blocking question to the user, and pass the answer back.

## Stage 4: Project Manager (sequencing)

Launch the `project-manager` agent with the path to the backlog file and the instruction to update `docs/product/plan.md`.

Wait for it to finish.

## Final delivery

Summarize the result for the user in Spanish, in this order:

1. **Qué entendimos del dominio**: two or three sentences from the domain brief.
2. **Funcionalidad definida**: name, outcome and priority from the feature definition.
3. **Historias en el backlog**: total count, how many are ready, how many are blocked, and the IDs of the blocked stories with the question that unblocks each.
4. **Primeras historias a tomar**: the first three IDs from the plan.
5. **Archivos generados**: list the paths of every file written.

Keep the summary short. The files are the deliverable. Do not paste the full stories into chat unless the user asks.

## Notes for running the pipeline

- Each stage writes to `docs/product/` in the workspace. Do not write these files outside that folder.
- If the user asks to change a story later, route the change to the Requirements Analyst. If the change alters scope, route it to the Product Owner first.
- Reference material for the story format is in `references/formato-historia.md`. Read it only when the analyst needs to check the format.
