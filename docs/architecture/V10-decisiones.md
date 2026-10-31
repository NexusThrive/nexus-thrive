# V10 — Correspondencia definitiva de decisiones

Reconcilia la numeración **D-V10-1…9 del diseño** ([`V10-arquitectura-fisica.md`](V10-arquitectura-fisica.md) §8) con la de **las autorizaciones** (2026-10-31) y con las decisiones **P-1…P-13** de [`V10-revision-post-M0-M2.md`](V10-revision-post-M0-M2.md) §9.
No altera ni reinterpreta ninguna decisión ya aprobada: solo dice cuál es cuál. Los informes históricos no se modifican.

## 1. Las dos numeraciones

La primera autorización aprobó "D-V10-1 a D-V10-9" con otro enunciado en 3, 4, 6, 7 y 8. Se conservan **ambas** numeraciones y se les da un nombre propio para no confundirlas: **D** = autorización, **Q** = pregunta abierta del diseño.

| Autorización (D) | Enunciado aprobado | Corresponde en el diseño a… |
|---|---|---|
| D-V10-1 | Sustituye a D-1; reorganización física incremental | Diseño D-V10-1 (igual) |
| D-V10-2 | Modelo de áreas, módulos y sectores | Diseño D-V10-2 (los nombres y el número de áreas: 9) y §2 |
| D-V10-3 | Reglas de dependencia entre áreas | Diseño §4 (en el diseño, "D-V10-3" era otra pregunta: Q-3) |
| D-V10-4 | Separación terminología / capacidades / procesos | Diseño §3 (en el diseño, "D-V10-4" era otra pregunta: Q-4) |
| D-V10-5 | Sector desconocido = general | Diseño D-V10-5 (igual) |
| D-V10-6 | Criterios crear/dividir/fusionar/reubicar/retirar | Diseño §5 (en el diseño, "D-V10-6" era el enum: Q-6) |
| D-V10-7 | Registro explícito de sectores | Diseño §3.4 y M2 (en el diseño, "D-V10-7" era presence/growth/benefits: Q-7) |
| D-V10-8 | Estructura física objetivo y migración incremental | Diseño §6–7 (en el diseño, "D-V10-8" eran las extensiones: Q-8) |
| D-V10-9 | Acceso a funciones de socios por módulo activo, respetando permisos | Diseño D-V10-9 (igual) |

## 2. Preguntas del diseño y su resolución

| Pregunta (diseño) | Resolución | Fundamento | Alcance en M3 |
|---|---|---|---|
| **Q-3** Nivel de anidación de `domains/finance` | **`domains/finance/<módulo>`** (cuatro niveles solo en esa familia) | Es la recomendación del diseño y la forma de la estructura objetivo aprobada por D-V10-8; la familia encapsula la regla «entre familias solo por contrato» | Ninguno: `domains` no tiene archivos (se materializa en M5) |
| **Q-4** ¿`money-service` pasa a Finance? | **No.** Queda en `business/sales` | **P-2** (aprobada) | Sí: M3 lo ubica en `business/sales` |
| **Q-6** Enum `Vertical` | **Mantener el enum durante M7**; la opción B (texto + FK a `VerticalSetting`) queda como dirección futura sujeta a la etapa Prisma | **P-6** (aprobada) | Ninguno |
| **Q-7** `presence`, `growth`, `benefits` | `presence` y `growth` **se quedan en `business`** (aún no existe un segundo módulo de análisis que justifique un dominio); `benefits` **pasará a `platform`** (programa comercial de Nexus) | Recomendación del diseño; no hay decisión nueva | Ninguno: se confirma en M4 (benefits) |
| **Q-8** `extensions/` | **No se introduce.** El paquete de sector ya cubre la extensión de primera mano | Recomendación del diseño; `extensions/` no pasa el test de área nueva (§4.3) | Ninguno |
| **Q-1/Q-2** | Resueltas por D-V10-1 y D-V10-2 | — | — |

No se crea ningún área ni módulo vacío por estas resoluciones. Las que no afectan a M3 (Q-3, Q-7, Q-8) quedan como **decisión futura documentada**, a confirmar en la etapa que las use (M4/M5).

## 3. Estado de las decisiones P-1…P-13 (autorización de M3)

| P | Decisión | Estado |
|---|---|---|
| P-1 | Fusionar `documents` y `money` en `business/sales` | Aprobada; se ejecuta en M3 |
| P-2 | `money-service` en `business/sales` | Aprobada; M3 |
| P-3 | `countries.ts` → Foundation; `inventory.ts` → Inventory, commits separados | Aprobada; M3 |
| P-4 | Actualizar las rutas de tres pruebas de arquitectura sin cambiar sus aserciones | Aprobada; M3 |
| P-5 | Diseño de `SectorView` | Aprobada; **se implementa en M7, no ahora** |
| P-6 | Enum durante M7; opción B futura | Aprobada |
| P-7 | Permisos `members.*` con los roles actuales | Aprobada; **se implementa en M7** |
| P-8 | Dirección de D-V10-9, condicionada a la comprobación de solo lectura sobre una copia | Aprobada con condición; **M7** |
| P-9 | M6c-a: no modificar los contratos de auditoría | Aprobada |
| P-10 | Corregir la unidad huérfana y detectar unidades inexistentes | Aprobada; **hecho al inicio de M3** |
| P-11 | Posponer la composición de suscriptores | Aprobada; fuera de M3 |
| P-12 | Actualizar documentación antigua en una pasada independiente | Aprobada; fuera de M3 |
| P-13 | No integrar `integracion/local-revision` durante M3 | Aprobada |
