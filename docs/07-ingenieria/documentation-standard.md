# Estándar de documentación

## Propósito y alcance

Mantener una fuente por tema, con propósito, alcance, evidencia e índice. Aplica a la documentación del monolito; los documentos de herramientas conservan sus entradas obligatorias.

## Responsabilidad de una página

Explica una pregunta o concepto. Comprueba primero si una fuente existente ya lo cubre. Usa párrafos claros, enlaces relativos y términos del [glosario](../00-identidad/glosario.md). Distingue lo aceptado, propuesto, implementado y verificado. No conviertas resultados de otra fecha en evidencia actual.

Cada carpeta con documentos tiene un README que explica su responsabilidad y permite llegar a sus páginas. Los índices enlazan; no copian sus contenidos. La entrada es [docs/README.md](../README.md). El diseño se edita en [packages/brand](../../packages/brand/README.md), no se replica aquí.

## Clasificación y mantenimiento

| Clase | Tratamiento |
| --- | --- |
| CANONICAL | Fuente responsable de un tema |
| MERGE | Consolidar información equivalente antes de retirar el original |
| HISTORICAL | Conservar evidencia fechada en 09-historico |
| OBSOLETE | Retirar solo con contenido preservado y eliminación aprobada |
| OPERATIONAL | Preservar entradas consumidas por código o herramientas |
| REVIEW | Conservar íntegramente y marcar la incertidumbre; no eliminar |

Un cambio de módulos, permisos, tablas o comandos actualiza su fuente en el mismo PR. Las propuestas se guardan en carpetas `propuestas/` o backlog; el [histórico](../09-historico/README.md) no es manual vigente. Las decisiones aceptadas no se reescriben: se propone un ADR posterior usando la [plantilla](../05-decisiones/plantilla.md).

## Fuentes comprobadas por pruebas

La [matriz de permisos](../06-reglas/matriz-de-permisos.md) se contrasta con BUSINESS_PERMISSIONS; el [mapa de áreas](../02-arquitectura/dominios/mapa-de-areas-y-modulos.md), con lib/; el [catálogo de pruebas de arquitectura](calidad/pruebas-de-arquitectura.md), con tests/architecture. Los índices y enlaces se validan mediante `pnpm docs:check` y las pruebas documentales.

## Añadir o mover contenido

1. Identifica la fuente canónica y evita una página paralela.
2. Actualiza el contenido, el README de su carpeta y las referencias afectadas.
3. Preserva IDs de ADR, fechas, responsables y evidencia. En cambios estructurales conserva un mapa origen → destino.
4. Comprueba enlaces, anclas, consumidores y navegación desde docs/README.md.
5. Ejecuta `pnpm docs:check`, las pruebas documentales y las verificaciones pertinentes; registra fallos previos por separado.

La antigua sincronización con GitHub Wiki se retiró por indicación del dueño. No se generan Home, barras laterales ni copias publicables. Las menciones históricas describen el mecanismo anterior y no autorizan ejecutarlo.
