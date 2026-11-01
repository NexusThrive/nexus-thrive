# Documentación de módulos: qué conviene trasladar a `docs/architecture/`

Estado: **solo identificación**. No se movió ni se borró ningún comentario de `lib/`. Los comentarios locales que explican
una operación interna se conservan donde están.

## Qué se midió

- 114 archivos de `lib/` abren con un bloque de documentación de módulo; solo 9 tienen 10 líneas con texto o más y ninguno llega a 20 líneas.
- 63 bloques de comentario tienen 9 o más líneas seguidas; casi todos son documentación de una función concreta (por ejemplo `budget.ts:233`, `projects.ts:211`) y explican un paso interno.
- Conclusión: la documentación de módulos es **corta y está pegada al código que describe**. No hay una masa de documentación que trasladar.

## Criterio

Se traslada (copiando un resumen, sin quitar el comentario del código) solo lo que cumple las tres:
1. Describe una **regla o convención que cruza varios módulos**, no un detalle de uno.
2. Un lector necesita entenderla **sin abrir el código**.
3. Hoy no está en `docs/`.

## Candidatos

Entre paréntesis, líneas del bloque de comentario (incluidas las vacías).

| Archivo | Qué explica | ¿Trasladar? | Destino sugerido |
|---|---|---|---|
| `lib/business/money-service.ts` (14 líneas) | Un cobro son varias escrituras que pasan todas o ninguna | Resumen, **sí**: cruza caja, recibos, stock y documentos. Ya cita ADR-0006 y DATA-01 | Nota «Dinero» en `docs/architecture/` que enlace al ADR |
| `lib/construction/apu-engine.ts` (14) + `lib/finance/cop-amount.ts` (16) | Los `Decimal` llegan como texto desde el driver de Prisma 8; los montos se normalizan sin pasar por `number` | **Sí**, en una sola nota: es una convención técnica que afecta a todo cálculo con dinero | La misma nota «Dinero y decimales» |
| `lib/tenant/deletion.ts` (19) | Qué borra el borrado de raíz de un negocio y qué no es reversible | **Sí**: es una política de datos, útil para quien opere o audite | Nota «Borrado de un negocio» |
| `lib/construction/lean-engine.ts` (19) | Semana relativa (1..6) frente a semana ISO-8601 en Bogotá | **Sí, pero en `docs/construction/`**, no en architecture: es convención de un rubro | `docs/construction/` |
| `lib/motion/modal-morph.ts` (16) | Efecto de apertura de modales | No: ya está en `docs/design/movimiento.md` | — |
| `lib/construction/apu-importer/confidence-score.ts`, `master-pack-plan.ts`, `master-pack-import.ts` (12–17) | Fórmula y pasos del importador | No: describen el algoritmo y deben quedar junto a él | — |
| `lib/construction/report-engine.ts` (15) | Qué consolida el motor de informes | No: se lee mejor junto al código | — |
| `lib/construction/budget.ts:233`, `lib/construction/projects.ts:211` | Comentarios de función interna | No: son locales | — |

## Notas creadas

Resumen con enlaces al código; los comentarios originales de `lib/` se conservan sin cambios.

1. [`dinero-y-decimales.md`](dinero-y-decimales.md): servicio de dinero, texto/`BigInt` para decimales y montos en COP.
2. [`borrado-de-un-negocio.md`](borrado-de-un-negocio.md): qué borra, qué no y cómo se mantiene la lista de tablas.
3. [`../construction/convencion-semanas-lean.md`](../construction/convencion-semanas-lean.md): semana relativa frente a semana ISO.

Todo lo demás se queda en el código.
