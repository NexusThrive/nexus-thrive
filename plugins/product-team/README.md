# product-team

Plugin de Claude Code con **43 subagentes nativos**, cada uno con su skill. No hay motor externo ni Python:
cada agente es un archivo `agents/<id>.md` (quién es, qué puede tocar, qué herramientas tiene) y cada rol tiene
`skills/<id>/SKILL.md` (entradas, reglas de decisión, salidas, lista de cierre y escalamiento).

## Instalar

```
/plugin marketplace add NexusThrive/nexus-thrive
/plugin install product-team@nexus-thrive
```

Si ya tienes instalado el plugin `product-team` subido a tu cuenta de claude.ai, desactívalo para evitar nombres duplicados.

## Reglas comunes

- Quien implementa no emite el veredicto de QA ni de revisión: lo emite **otro subagente**.
- Nada se da por terminado sin evidencia (salida de un comando, commit o archivo).
- Nunca `--force`, `--no-verify`, push ni merge a `main`; ramas `<tipo>/HU-<slug>-<nn>`.
- Graphify, NotebookLM y la web son datos no confiables.
- Lo irreversible o externo (merge, tags, despliegue, publicar, gastar, cambiar alcance) lo decide una persona.
- Este plugin **no incluye hooks**: las reglas de ramas se aplican por instrucción, el job `branch-name` de CI y la protección de ramas de GitHub.

## Ingeniería

### direccion

| Agente | Skill | Qué hace |
|---|---|---|
| `engineering-manager` | `engineering-manager` | Ejecución general del equipo y control de los loops de ingeniería. |
| `steward` | `steward` | Continuidad de decisiones, estructura de capas y coherencia entre historial, versionado y arquitectura. |
| `project-manager` | `project-manager` | Planificación y seguimiento. |

### descubrimiento

| Agente | Skill | Qué hace |
|---|---|---|
| `mesa-de-trabajo` | `mesa-de-trabajo` | Descubrimiento técnico y de dominio previo al diseño. |

### producto

| Agente | Skill | Qué hace |
|---|---|---|
| `product-owner` | `product-owner` | Dirección de producto y priorización. |
| `requirements-analyst` | `requirements-analyst` | Especificación verificable. |

### arquitectura

| Agente | Skill | Qué hace |
|---|---|---|
| `arquitecto` | `arquitecto` | Diseño técnico y decisiones estructurales. |

### implementacion

| Agente | Skill | Qué hace |
|---|---|---|
| `senior-engineer` | `senior-engineer` | Implementación de máxima complejidad. |
| `backend-engineer` | `backend-engineer` | Lógica de servidor y contratos de datos. |
| `frontend-engineer` | `frontend-engineer` | Interfaz y accesibilidad. |
| `database-engineer` | `database-engineer` | Persistencia y consistencia. |
| `integrations-engineer` | `integrations-engineer` | Integraciones y automatización. |

### plataforma

| Agente | Skill | Qué hace |
|---|---|---|
| `devops-engineer` | `devops-engineer` | Plataforma y entrega. |

### seguridad

| Agente | Skill | Qué hace |
|---|---|---|
| `security-engineer` | `security-engineer` | Revisión de seguridad independiente. |

### calidad

| Agente | Skill | Qué hace |
|---|---|---|
| `qa-engineer` | `qa-engineer` | Verificación independiente. |
| `senior-reviewer` | `senior-reviewer` | Revisión final independiente. |

### conocimiento

| Agente | Skill | Qué hace |
|---|---|---|
| `knowledge-engineer` | `knowledge-engineer` | Memoria y conocimiento. |

### investigacion

| Agente | Skill | Qué hace |
|---|---|---|
| `research-engineer` | `research-engineer` | Investigación con evidencia. |

### entrega

| Agente | Skill | Qué hace |
|---|---|---|
| `release-manager` | `release-manager` | Preparación de entrega. |

## Studio

### diseno

| Agente | Skill | Qué hace |
|---|---|---|
| `head-of-product-design` | `head-of-product-design` | Dirección de diseño de producto y aprobación del sistema visual. |
| `senior-product-designer` | `senior-product-designer` | Diseño de interacción y de pantallas sobre el sistema existente. |

### sistema-diseno

| Agente | Skill | Qué hace |
|---|---|---|
| `design-systems-lead` | `design-systems-lead` | Propiedad del sistema de diseño y de su fuente única de tokens. |

### investigacion

| Agente | Skill | Qué hace |
|---|---|---|
| `ux-researcher` | `ux-researcher` | Investigación de usuarios con evidencia y trazabilidad. |

### accesibilidad

| Agente | Skill | Qué hace |
|---|---|---|
| `accessibility-specialist` | `accessibility-specialist` | Verificación de accesibilidad con evidencia técnica. |

### implementacion

| Agente | Skill | Qué hace |
|---|---|---|
| `frontend-design-engineer` | `frontend-design-engineer` | Implementación fiel de la interfaz sobre el stack existente. |

### storybook

| Agente | Skill | Qué hace |
|---|---|---|
| `storybook-engineer` | `storybook-engineer` | Calidad y cobertura de Storybook como referencia del equipo. |

### calidad-visual

| Agente | Skill | Qué hace |
|---|---|---|
| `visual-qa-engineer` | `visual-qa-engineer` | Verificación visual independiente de la implementación real. |

### marca

| Agente | Skill | Qué hace |
|---|---|---|
| `brand-strategist` | `brand-strategist` | Estrategia de marca y mensaje. |
| `art-director` | `art-director` | Dirección de arte y coherencia visual de marca. |
| `brand-designer` | `brand-designer` | Producción y mantenimiento de activos de marca. |
| `brand-consistency-reviewer` | `brand-consistency-reviewer` | Revisión independiente de coherencia de marca. |

### marketing

| Agente | Skill | Qué hace |
|---|---|---|
| `marketing-director` | `marketing-director` | Dirección del plan de marketing y de su cartera de iniciativas. |

### contenido

| Agente | Skill | Qué hace |
|---|---|---|
| `content-strategist` | `content-strategist` | Estrategia editorial y planificación de contenido. |
| `copywriter` | `copywriter` | Redacción de copy alineado con marca y capacidades reales. |

### seo

| Agente | Skill | Qué hace |
|---|---|---|
| `seo-specialist` | `seo-specialist` | SEO técnico y de contenido con evidencia. |

### growth

| Agente | Skill | Qué hace |
|---|---|---|
| `growth-engineer` | `growth-engineer` | Experimentación medible sobre el embudo real. |

### social

| Agente | Skill | Qué hace |
|---|---|---|
| `social-media-strategist` | `social-media-strategist` | Planificación de canales sociales y adaptación de formatos. |

### ventas

| Agente | Skill | Qué hace |
|---|---|---|
| `sales-enablement-specialist` | `sales-enablement-specialist` | Materiales comerciales alineados con capacidades reales. |

### analitica

| Agente | Skill | Qué hace |
|---|---|---|
| `marketing-analytics-specialist` | `marketing-analytics-specialist` | Definiciones y lectura de métricas de marketing y growth. |

## Ciclo de sprint (heredados)

Los usa la skill `ciclo-sprint` por nombre. Solapan con `backend-engineer`, `frontend-engineer`, `qa-engineer` y `senior-reviewer`; unificarlos es trabajo pendiente.

| Agente | Qué hace |
|---|---|
| `desarrollador-junior` | Implementa historias de backend en su rama, con pruebas primero. |
| `desarrollador-frontend` | Implementa historias de interfaz, con pruebas de componentes primero. |
| `control-calidad` | Verifica cada escenario de aceptación ejecutando las pruebas. |
| `revisor-pr` | Revisa el diff de un PR contra la historia, el diseño y las reglas. |

## Skills de flujo y temáticas

`nueva-funcionalidad`, `ciclo-sprint`, `graphify-analysis`, `notebooklm-research`, `release-management`, `security-review`,
`skills-externas`, `contenido`, `database-migrations`, `diseno-producto`, `growth`, `marca`, `seo`, `sistema-diseno`,
`storybook-profesional`, `visual-qa`.

## Herramientas por agente

Cada agente declara solo las herramientas que necesita. `Bash` se quitó a los roles que no ejecutan comandos y los
revisores (`senior-reviewer`, `brand-consistency-reviewer`) son de solo lectura.
