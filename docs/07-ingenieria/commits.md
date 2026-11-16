# Commits

## Propósito y alcance

Hacer legible el historial de cada cambio. Los commits nuevos siguen Conventional Commits en inglés: `type(scope): summary`.

Tipos habituales: feat, fix, docs, refactor, test, perf, build, ci y chore. El alcance identifica el área real del monolito, por ejemplo `docs`, `core` o `inventory`. Usa un resumen imperativo y explica el motivo o la validación cuando haga falta.

Ejemplo: `docs: consolidate monolith documentation into numbered sections`.

No reescribir commits antiguos para traducirlos. No saltar hooks ni reescribir historia compartida. Una rama corresponde a una HU y sus commits permiten revisar el cambio en el [PR](pull-requests.md).
