# V10 — Resultados del cierre, por etapa

Informe acumulado de las etapas del [plan de cierre](V10-plan-de-cierre.md). Cada etapa añade una sección: un commit principal, una verificación completa y los problemas encontrados. Decisiones asociadas: [`V10-decisiones.md`](V10-decisiones.md) §8. Rama local `chore/HU-esquema-prisma-modular-01`, sin push, PR, merge ni despliegue.

## Avance hacia la meta

| Etapa | Estado | Commit |
|---|---|---|
| I · integrations | **Hecha** | `d406c29` |
| B · business | **Hecha** (con excepción temporal documentada) | ver §2 |
| N · construction | Pendiente de autorización | — |
| X · experience | Pendiente | — |
| C · core | Pendiente | — |
| F · foundation | Pendiente | — |
| Z · remate | Pendiente | — |

La raíz de `lib/` pasó de 66 entradas (inicio de M5) a 53 tras la etapa B (32 carpetas y 21 archivos). La meta es: las nueve áreas y los dos archivos documentados `utils.ts` y `cn.ts`.

## 1. Etapa I · integrations (`d406c29`)

`lib/providers`, `lib/einvoice`, `lib/google` y `lib/maps` → `lib/integrations/<módulo>`.

| | |
|---|---|
| Archivos movidos | 26 (16 de producción y 10 pruebas), con `git mv` |
| Archivos con referencias reescritas | 19 (29 alias, 36 relativas, 1 literal) |
| Capas | Se retiran 4 unidades de `layers.json`; el área se deduce de la ruta |
| Pruebas nuevas | `tests/architecture/v10-integrations.test.ts` (7); ajustes en `tenant-scope` (`PLATFORM_FILES`) y en la prueba de `payments` |
| Exportaciones | 68 de 16 archivos, idénticas |
| Verificación | `pnpm verify` verde; unitarias 118 archivos y 1 793; integración 66 archivos y 413; contrato idéntico; copia limpia con 0 errores de `tsc`; 4 mutaciones detectadas |
| Problemas | Ninguno |

## 2. Etapa B · business

`lib/inventory`, `lib/purchasing`, `lib/pos`, `lib/store`, `lib/data-exchange`, `lib/growth` y `lib/presence` → `lib/business/<módulo>`. Con esto `lib/business/` tiene los once módulos del diseño: `catalog`, `customers`, `data-exchange`, `growth`, `inventory`, `pos`, `presence`, `purchasing`, `sales`, `scheduling`, `store`.

| | |
|---|---|
| Archivos movidos | 58 (35 de producción y 23 pruebas), con `git mv` |
| Archivos con referencias reescritas | 80 (114 alias, 65 relativas, 12 literales) |
| Capas | Se retiran 8 unidades de `layers.json` (las 7 carpetas y la unidad `lib/business`, redundante): el área se deduce de la ruta |
| Aislamiento por negocio | Las 5 excepciones de `tenant-scope.test.ts` de estos módulos (`presence`, `growth`, `store`) siguen con su ruta nueva; ninguna carpeta se añadió a las exclusiones |
| Pruebas | `tests/architecture/v10-business-completo.test.ts` (20 pruebas: los once módulos, carpetas de origen inexistentes, área por ruta, sin unidades viejas); en `v10-business.test.ts`, la lista de módulos de M3 ampliada a once y la prueba de ciclos con la excepción puntual (más una prueba que fija las cuatro dependencias exactas); `v10-platform.test.ts` ya no enumera `lib/data-exchange` |
| Exportaciones | 241 de 35 archivos, idénticas |
| Verificación | `pnpm verify` verde; unitarias 119 archivos y 1 814 (base de la etapa 1 793); integración 66 archivos y 413; contrato (15 operaciones + OpenAPI) idéntico; Prisma y migraciones sin cambios; `check:layers`: 290 archivos, 0 violaciones, 0 excepciones, 3 ciclos de tipos |

### Excepción temporal: ciclo `inventory ⇄ sales`

Al juntar los módulos aparece un ciclo entre módulos que la prueba de M3 («los módulos de business no forman ciclos entre sí») rechazó. El dueño aceptó la **excepción temporal y puntual** (opción A): ver [`V10-decisiones.md`](V10-decisiones.md) §8.1. Resumen: cuatro dependencias exactas (tres `inventory → sales`, de valor y de tipo, y una `sales → inventory` de valor); ya identificada en M3; **deuda arquitectónica pendiente, no una solución**; la prueba permite solo ese par y exige que sus dependencias sean exactamente esas.

### Problemas encontrados

1. **Contradicción con el diseño (P-1):** el ciclo anterior. Se documentó y se detuvo la etapa hasta recibir la decisión.
2. **Expresiones regulares con rutas** dentro de `v10-finance.test.ts` (`data-exchange/table`, `store/store-settle`): el codemod no reescribe rutas dentro de una cadena que es una expresión regular; se corrigieron a mano y las pruebas las habrían delatado si no.
3. **Error propio:** ejecuté un `git stash` por equivocación durante un análisis. Lo detecté de inmediato y restauré con `git stash pop --index`; se comprobó que el stash quedó vacío y que el árbol conservaba los 58 renombrados y todos los cambios.
