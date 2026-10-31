# Hoja de ruta: lo que queda después de E3

Estado al cierre de E3 (rama local `chore/HU-esquema-prisma-modular-01`, sin push ni PR). Las **31 excepciones** de arquitectura que siguen abiertas están en
[`exceptions.json`](exceptions.json); todo lo demás, en esta lista.

## 1. Excepciones de arquitectura abiertas (31)

| Punto | Excep. | De qué trata |
|---|---|---|
| **E5** ✅ | 0 (era 17) | Business hacia Finance por **eventos de dominio**: contabilizar, calcular impuestos y cartera sin que Business llame a Finance directamente (`documents-db`, `money-service`, `invoices-db`, `stock-service`, `purchases-db`, `store-db`, `pillars-db`, `admin/db`, `tenant/db`). Toca dinero y contabilidad: la más delicada | Resuelta con puertos: ver [`E5-resultados.md`](E5-resultados.md).
| **E7** ✅ | 0 (era 4) | **Puertos y adaptadores** de proveedores: que pagos, facturación electrónica y Google dependan de un puerto y no de Wompi, del proveedor fiscal o de Google | Resuelta con puertos: ver [`E7-resultados.md`](E7-resultados.md).
| **E9** ✅ | 0 (era 4) | **Tipos de interfaz** fuera de Core y Platform (`onboarding/types`, `tenant-nav`) | Ver [`E9-V-resultados.md`](E9-V-resultados.md).
| **V** ✅ | 0 (era 6) | **Vocabulario y capacidades por rubro** en `VERTICAL_RECIPES`, sin comparar `vertical === "gym"` en el código (ficha del cliente, compras, registro de capacidades y menú «Crear») | Ver [`E9-V-resultados.md`](E9-V-resultados.md).

## 2. Documentación del código en `lib/` (pedido nuevo)

Reordenar la documentación para que **el módulo se describa arriba del archivo y cada función tenga su descripción**, y que los comentarios que hoy están dentro de las funciones suban a la descripción
de la función. Ya está hecho en el esquema de Prisma (40 archivos); falta el código.

Medición aproximada (heurística, 272 archivos de producción en `lib/`):

| Qué | Cantidad |
|---|---|
| Archivos sin descripción de módulo arriba | 113 |
| Funciones exportadas | 1 097 |
| …de las cuales **sin descripción** | 401 |
| Comentarios dentro de funciones | 197, en 59 archivos |

**Cuidado con el alcance:** el dueño ya decidió una vez conservar los comentarios locales que explican una operación interna y no hacer una extracción masiva. Este punto se sumó por tu pedido; antes de empezar hay que
confirmar si se **agrega** la descripción que falta (bajo riesgo) y qué hacer con los comentarios internos (moverlos arriba puede perder el contexto del paso que explican). Se haría por carpeta, con
`tsc` y las pruebas en verde en cada paso, y sin tocar el código.

## 3. Pruebas

- **Migrar las 151 pruebas** de `lib/` a `tests/` (`unit/` e `integration/`), en 6 olas ([`plan-migracion-tests.md`](plan-migracion-tests.md)). Ya hay 15 archivos de prueba en `tests/`.
- **Pruebas de integración en CI:** el script ya las corre por patrón (63 archivos y 385 pruebas al cierre de E3). Falta el fixture sintético de `master-pack-import.file` ([requisitos](auditoria-pruebas-integracion.md)).
- El CI de GitHub no puede recibir cambios de `ci.yml` con el token actual; el script ya basta, pero conviene un paso propio en el workflow.

## 4. Estructura del código

- **V10 · arquitectura física extensible de `lib/`** — diseño: [`V10-arquitectura-fisica.md`](V10-arquitectura-fisica.md); decisiones: [`V10-decisiones.md`](V10-decisiones.md). Informes: [M0–M2](V10-M0-M2-resultados.md), [revisión previa a M3](V10-revision-post-M0-M2.md), [M3](V10-M3-resultados.md), [M4](V10-M4-resultados.md), [M5](V10-M5-resultados.md).
  - **Implementado:** M0 (verificador), M1 (`lib/runtime`), M2 (sectores en Core), M3 (`lib/business` en módulos), **M4 (`lib/platform` con nueve módulos; `lib/ops` y `lib/benefits` ya no existen)** y **M5 (`lib/domains/finance/{tax,accounting,receivables,payments}`, `lib/foundation/kernel` con cuatro módulos puros y `lib/payment-input`; `lib/finance`, `lib/tax`, `lib/accounting`, `lib/receivables` y `lib/payments` ya no existen)**.
  - **Aprobado, no implementado:** D-V10-9 (acceso de socios por módulo activo), `SectorView`, permisos `members.*` y la comprobación previa de solo lectura (todo en M7); la pasada documental sobre rutas antiguas (P-12); la composición de suscriptores (P-11, pospuesta).
  - **Opción futura sin autorizar:** mover `createTenant` a Core. **Cerrado en M4:** las tres referencias de `app/[tenant]` a `platform/benefits/benefits-db` se mantienen (opción A) y el criterio de aceptación del diseño quedó aclarado.
  - **Pendiente de autorización:** M6, M7 y M8.
  - **Plan de cierre aprobado y en ejecución:** [`V10-plan-de-cierre.md`](V10-plan-de-cierre.md) (meta, etapas I·B·N·X·C·F·Z; decisiones E-1 a E-9 aprobadas), [`V10-arquitectura-objetivo.md`](V10-arquitectura-objetivo.md) (por qué esta estructura) y [`V10-cierre-resultados.md`](V10-cierre-resultados.md) (resultados por etapa). **Hechas: I (integrations), B (business), N (construction), X (experience) y C (core).** Pendientes: F y Z.
  - **Deuda arquitectónica registrada (no es solución definitiva):** ciclo entre módulos `inventory ⇄ sales` (cuatro dependencias exactas, de valor y de tipo), identificado en M3 y aceptado como excepción temporal y puntual en la etapa B; la prueba permite solo ese par. Resolverlo requiere un análisis propio. Detalle en [`V10-decisiones.md`](V10-decisiones.md) §8.1.
  - **Sin etapa definida, pendiente de diseño y aprobación:** mover físicamente a `core/`, `business/`, `integrations/`, `experience/` y `foundation/` las carpetas y archivos sueltos que hoy siguen en la raíz de `lib/` (63 entradas; ya están clasificados en `layers.json`). Lista completa en [`V10-M5-resultados.md`](V10-M5-resultados.md) §9.4.
- **Limitación conocida del historial de M4:** nueve commits intermedios (`0de8609`…`0116c51`) no compilan por separado; `ac71d60` los corrige y el historial se conserva. Para `git bisect` hay que saltarlos y para revertir `benefits` o `team` hay que incluir el fragmento de `ac71d60`: detalle en [`V10-M4-resultados.md`](V10-M4-resultados.md) §14.1.
- **Trabajo independiente fuera de V10 (registrado, no iniciado):** auditoría de aislamiento por negocio (límites de `tenant-scope.test.ts`, consultas sin `tenantId` excluidas en el panel) y revisión de las guardas de `app/admin`. Alcance anotado en [`V10-decisiones.md`](V10-decisiones.md) §6.
- **`lib/construction/` → `lib/industry/construction/`: hecho** en la etapa N de V10 (57 archivos); ver [`V10-cierre-resultados.md`](V10-cierre-resultados.md).
- **`lib/tenant/db.ts` sigue grande:** conserva clientes, pagos, reservas, gastos y finanzas, que la regla de capas no ve.
- La ficha 360° consulta al gimnasio aunque su módulo esté inactivo (mismo comportamiento de antes; se puede omitir).
- 3 ciclos de dependencias de solo tipos (tope 3; antes de M2 eran 4).

## 5. Base de datos (Prisma): sin autorizar

| | Qué |
|---|---|
| P3 | Quitar las relaciones inversas Business → Industry |
| P4 | Auditar los 6 modelos sin `tenantId` (`AuditLog`, `StaffRole`, `StaffInvite`, `StaffMember`, `BenefitCode`, `DismissedNotification`) |
| P5 | Cambios de datos: `Payment.membershipId`, `Customer.accessCode`/`nfcUid` al gimnasio, dividir `Tenant` (136 campos), modelo de sucursal |
| P6 | RLS real con políticas por negocio |

## 6. Datos históricos

- **Asientos contables fechados en UTC:** la causa está corregida. Los históricos solo tienen un [SQL de diagnóstico de solo lectura](../diagnostico/2026-10-31-fechas-utc-documentos.sql); cada caso lo decide la contabilidad. Falta ejecutarlo contra una copia con autorización.

## 7. Producto

- **Restaurante** sobre la estructura nueva (decisiones D1–D6 aprobadas; historias de la fase 0 pendientes).
- **Varios sectores por negocio** (hoy un negocio tiene un solo rubro) y **capacidades generales** de Proyectos y Agenda para negocios sin rubro (agencia de servicios).
- **Proveedor de facturación electrónica:** elegir y construir el primer adaptador (Alegra, Siigo u otro), tras validar sus condiciones de uso.

## 8. Heredados del repositorio

7 criterios del Steward sin llenar (`docs/ingenieria/steward/criterios.md`), aceptar o rechazar los ADR 0012 y 0013, 70 casillas `[x]` sin nota «hecho» y 2 ambiguas en V/02,
NotebookLM diferido, decidir si se reescribe el historial para quitar `.tools/` (~195 MB) y unificar 4 agentes heredados.

## 9. Entrega

Todo el trabajo (P0/P1, E0 a E3, correcciones) está en **commits locales**. Falta decidir cuándo y cómo publicarlo: push, PR(s) y su orden.
