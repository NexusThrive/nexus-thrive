# Reglas duras de ramas

Estas reglas las aplican tres capas: las reglas de este documento (que el agente aplica por instrucción; este plugin no incluye hook local), el job `branch-name` de CI y la protección de ramas en GitHub. Un agente no puede saltarse ninguna.

## Patrón de rama de tarea

```
<tipo>/HU-<slug>-<nn>
```

- `tipo`: `feature`, `fix`, `chore` o `hotfix`.
- `slug`: minúsculas, números y guiones. Igual al slug de la funcionalidad.
- `nn`: número de la historia dentro de la funcionalidad, dos dígitos.

Regex aplicada en todas las capas:

```
^(feature|fix|chore|hotfix)/HU-[a-z0-9]+(-[a-z0-9]+)*-[0-9]{2}$
```

Ejemplos válidos: `feature/HU-exportar-reportes-01`, `fix/HU-cancelar-suscripcion-03`.
Inválidos: `Feature/HU-exportar`, `mi-rama`, `feature/exportar-reportes`, `feature/HU-exportar-reportes-1`.

## Rama de sprint

```
sprint/S<nn>
```

Ejemplo: `sprint/S01`. Es la rama de integración del sprint. Las ramas de tarea salen de ella y los PR de tarea apuntan a ella. Nunca se hace push directo a `sprint/*`.

## Rama principal

`main` solo recibe merges desde `sprint/*` mediante un PR de promoción. Ese PR lo abre el agente, pero lo aprueba y fusiona una persona.

## Flujo de ramas

```
main
 └── sprint/S01                    (integración del sprint)
      ├── feature/HU-exportar-reportes-01   -> PR a sprint/S01
      └── feature/HU-exportar-reportes-02   -> PR a sprint/S01
```

## Qué bloquea cada capa

| Capa | Momento | Qué bloquea |
| --- | --- | --- |
| `guard_git.py` (hook PreToolUse) | Antes de `git checkout -b`, `git switch -c`, `git branch` o `git push` | Crear o empujar ramas que no cumplan el patrón |
| `commit-gate` (hook PreToolUse) | Antes de `git commit` | Commit en `main` o en `sprint/*` directamente |
| Job `branch-name` de CI | En cada PR | PR cuyo origen no cumple el patrón o cuyo destino no es `sprint/*` (salvo promoción) |
| Protección de ramas en GitHub | En cada merge | Merge sin checks verdes, o push directo a `main` y `sprint/*` |
