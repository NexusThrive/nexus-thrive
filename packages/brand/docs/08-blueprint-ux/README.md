# Blueprint de experiencia UI/UX de Nexus Thrive

**Estado:** documentación consolidada + implementación aplicada en la rama local `feature/HU-sistema-experiencia-01` (ver `14`) · **no publicado en `main`** (PD-08) · fecha: 2026-11-01. Glosario **aprobado** (PD-03).
**Alcance:** exclusivamente la experiencia general de la plataforma. Los sistemas especializados por industria (restaurante, gimnasio, turismo…) son un **proyecto posterior** y no forman parte de este blueprint ni dependen de él.

> **Idea rectora (aprobada):** Nexus no es una colección de módulos bonitos; es un sistema conectado que entiende cómo funciona un negocio. El Design System hace que todo se vea y se comporte igual; la arquitectura funcional hace que todo se conecte; la experiencia empresarial hace que el cliente entienda el valor.

## Cómo leerlo

1. Empieza por **`01`**: la filosofía (los principios que justifican cada decisión) y el **registro único de decisiones** (aprobadas, dirección aprobada, propuestas, pendientes e hipótesis).
2. Los documentos **`02` a `12`** desarrollan cada área y **citan** los identificadores de `01`.
3. **`13`** recoge la validación, las cifras re-medidas y las limitaciones reales.
4. `historico/` conserva los blueprints anteriores **sin modificar**.

## Índice

| Doc | Contenido | Área del alcance |
|---|---|---|
| [01 · Filosofía y decisiones](01-filosofia-y-decisiones.md) | Principios D/P/B/S, regla del porqué, 47 decisiones, 12 pendientes, 17 hipótesis | Todas |
| [02 · Auditoría de la experiencia actual](02-auditoria-experiencia-actual.md) | Qué está bien, qué está duplicado, puntuación de coherencia por módulo | Auditoría, coherencia |
| [03 · Fundamentos visuales](03-fundamentos-visuales.md) | Tokens, tipografía, color, densidad, movimiento | Design System, tokens, densidad |
| [04 · Navegación, búsqueda y actividad](04-navegacion-shell-busqueda-y-actividad.md) | Arquitectura de información, sidebar, topbar, búsqueda, notificaciones | Navegación, búsqueda, actividad |
| [05 · Dashboard y visualización](05-dashboard-y-visualizacion.md) | Jerarquía del Inicio, indicadores, gráficos | Dashboard |
| [06 · UX Writing y glosario](06-ux-writing-y-glosario.md) | Voz, glosario, verbos, estados, mensajes | UX Writing |
| [07 · Responsive y multidispositivo](07-responsive-y-multidispositivo.md) | Viewports, tareas por dispositivo, patrones adaptativos | Responsive |
| [08 · Accesibilidad](08-accesibilidad.md) | Reglas por patrón, estado medido, verificación | Accesibilidad |
| [09 · Roles, permisos y estados de acceso](09-roles-permisos-y-estados-de-acceso.md) | Matriz, tratamiento único de «sin permiso», experiencia por rol | Roles y permisos |
| [10 · Experiencia de integraciones](10-experiencia-de-integraciones.md) | Ficha «Conexión», honestidad de madurez, importar/exportar | Integraciones |
| [11 · Componentes, patrones y plantillas](11-componentes-patrones-y-plantillas.md) | Escala de siete niveles, tabla/lista, formularios, plantillas | Componentes, patrones, plantillas |
| [12 · Contrato de módulo y hoja de ruta](12-contrato-de-modulo-y-hoja-de-ruta.md) | Once requisitos, oleadas por módulo, fases con dependencias | Coherencia entre módulos, plan |
| [13 · Validación final y limitaciones](13-validacion-final-y-limitaciones.md) | Comprobaciones, cifras, cambios documentales pendientes | Validación |
| [14 · Registro de implementación](14-registro-de-implementacion.md) | Qué se implementó tras aprobar el glosario, qué falta y qué decisiones se tomaron | Implementación |
| [15 · Flujo de adquisición y activación](15-flujo-de-adquisicion-y-activacion.md) | Recorrido Assisted-first + Self-Service, bienvenida, onboarding progresivo y fases F1–F7 | Experiencia de registro |
| [`herramientas/validar-docs.py`](herramientas/validar-docs.py) | Validador de consistencia (solo lectura) | — |
| [`historico/`](historico/) | Blueprints v1, v2 (superado) y v3 base | Referencia |

## Clasificación de decisiones (resumen)

| Etiqueta | Significa | Cantidad |
|---|---|---|
| **A** · Aprobada | Decisión explícita de la dirección del proyecto | 13 |
| **D** · Dirección aprobada | Aprobada como dirección; el detalle de implementación necesita autorización específica | 17 |
| **N** · Propuesta nueva | Surge de esta auditoría; **no es decisión** hasta aprobarla | 17 |
| **PD** · Pendiente | Requiere decisión (PD-03, el glosario, ya está aprobado) | 12 |
| **H** · Hipótesis | Sin verificar; no se usa como base de una decisión | 17 |

Ninguna propuesta, pendiente ni hipótesis se ha convertido en decisión aprobada.

## Relación con la documentación vigente

Este blueprint **no sustituye** a los documentos del sistema; los cita y propone actualizarlos cuando se implemente cada fase:

| Documento vigente | Relación |
|---|---|
| [`03-sistema/DESIGN.md`](../03-sistema/DESIGN.md) | Sistema vigente (tokens, componentes). Se actualiza al implementar |
| [`03-sistema/SYSTEM-DESIGN.md`](../03-sistema/SYSTEM-DESIGN.md) | Origen de los principios D1–D8 y de las sensaciones S1–S5 |
| [`03-sistema/inventario-patrones.md`](../03-sistema/inventario-patrones.md) | Línea base medida; se re-midió el 2026-11-01 |
| [`03-sistema/decisiones-nexus-design-system.md`](../03-sistema/decisiones-nexus-design-system.md) | Decisiones 1–3 y principio 08 (aprobadas); aquí son DR-02, DR-07, DR-12 |
| [`02-producto/PRODUCT.md`](../02-producto/PRODUCT.md) | Origen de los principios P1–P7 |
| [`01-marca/guia-de-tono.md`](../01-marca/guia-de-tono.md) | Base de `06`; no se reescribe |
| [`04-patrones/accessibility.md`](../04-patrones/accessibility.md) | Base de `08`; ver `13` §5 para ajustes pendientes |

## Qué no hace este blueprint

- No modifica código, ramas ni PR; no fusiona, despliega ni elimina.
- No define procesos operativos de ninguna industria.
- No crea capas arquitectónicas nuevas.
- No promete integraciones que no existen.
- No afirma que una prueba pasó si no se ejecutó.

## Cómo se mantiene

1. Una decisión nueva entra como **N** con el siguiente ID (`01` §7).
2. Pasa a **A** solo con aprobación explícita.
3. Antes de publicar cambios, se ejecuta `python3 -I herramientas/validar-docs.py .` desde esta carpeta.
4. Las cifras de `02` y `12` se re-miden con `pnpm design:inventory` y con la puntuación de `02` §3 cada vez que se cierra una oleada.
