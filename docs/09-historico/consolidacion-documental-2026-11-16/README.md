# Consolidación documental · 16 de noviembre de 2026

## Alcance y resultado

La documentación del monolito Next.js se organiza en diez secciones, con docs/README.md como entrada. Se retiraron los árboles documentales anteriores, la infraestructura de GitHub Wiki, los directorios de Superpowers, las guías y plantillas n8n y los informes repetidos aprobados. El código de integración n8n permanece.

El histórico conserva siete antecedentes de seguridad, dinero y recuperación. Los 22 ADR mantienen sus identificadores y decisiones; doce documentos REVIEW conservan su contenido y su incertidumbre. El diseño mantiene una sola fuente operativa en packages/brand/docs.

Los 72 SQL de producción se trasladaron sin cambiar sus bytes a 08-operaciones/sql-produccion. El manifiesto scripts/prod-data.txt conserva sus tres entradas y su orden. Los controles de arquitectura y catálogos útiles también se trasladaron con actualización de consumidores. El marcador de pausa es docs/07-ingenieria/PAUSA. No se ejecutaron migraciones ni operaciones de producción.

## Trazabilidad

El [mapa de migración](mapa-migracion.tsv) registra origen, clase, destino final, acción y SHA-256 original. Las retiradas adicionales corresponden a la reducción de 102 archivos históricos aprobada y a las instrucciones posteriores de retirar herramientas y carpetas antiguas. Los originales se recuperan en Git desde c7f9bc89b38bef37a26dcdeeb8bcc4c1df6898ad, sin reescribir historia.

- [Huellas de los ADR originales](adr-integrity.json).
- [Huellas de artefactos operativos](operational-integrity.json).
- [Documentos REVIEW conservados](review-records.json).

Las huellas son evidencia de esta migración. Las pruebas permanentes protegen las decisiones aceptadas y los SQL históricos, permitiendo que las propuestas y los catálogos operativos evolucionen por el procedimiento correspondiente.

## Verificaciones ejecutadas

| Comprobación | Resultado |
| --- | --- |
| docs:check | 517 documentos, 1419 enlaces locales; cero errores nuevos y cero páginas canónicas huérfanas |
| Línea base externa | Diez enlaces inexistentes anteriores en skills Prisma de terceros; se enumeran, no se presentan como resueltos |
| Suite sin base de datos | 171 archivos y 2477 pruebas aprobados; 88 archivos y 521 pruebas omitidos por sus requisitos |
| Pruebas focales finales | Cuatro archivos y 49 pruebas aprobados, incluyendo preservación e idempotencia de generadores |
| Typecheck | Aprobado |
| Lint global | Cero errores; 37 advertencias en código no alterado por esta limpieza |
| Controles de capas | Sin dependencias nuevas ni excepciones abiertas |
| Sintaxis Bash | Scripts de SQL, migración y release válidos |
| Equivalencia de aplicación | Once archivos de producción tienen idéntica salida AST de TypeScript al excluir comentarios |
| Integridad | 72 SQL de producción, 22 ADR y doce REVIEW comprobados |
| Revisión independiente | Aprobada; hallazgos documentales corregidos |

La primera ejecución de la suite detectó una ruta de diagnóstico formada con segmentos; se corrigió y la segunda ejecución completa pasó. La sincronización de Wiki y la prueba exclusiva de plantillas n8n se retiraron con sus fuentes.

No se ejecutaron localmente integración sobre PostgreSQL, build ni E2E. El PR y la CI registran por separado los resultados remotos; no se declara que hayan pasado sin evidencia. El CODEOWNERS no versionado concurrente se excluye de este cambio. Engram no está disponible en esta sesión; este informe conserva el contexto de cierre.
