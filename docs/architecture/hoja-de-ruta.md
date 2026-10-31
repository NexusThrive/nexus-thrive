# Hoja de ruta: lo que queda después de E3

Estado al cierre de E3 (rama local `chore/HU-esquema-prisma-modular-01`, sin push ni PR). Las **31 excepciones** de arquitectura que siguen abiertas están en
[`exceptions.json`](exceptions.json); todo lo demás, en esta lista.

## 1. Excepciones de arquitectura abiertas (31)

| Punto | Excep. | De qué trata |
|---|---|---|
| **E5** | 17 | Business hacia Finance por **eventos de dominio**: contabilizar, calcular impuestos y cartera sin que Business llame a Finance directamente (`documents-db`, `money-service`, `invoices-db`, `stock-service`, `purchases-db`, `store-db`, `pillars-db`, `admin/db`, `tenant/db`). Toca dinero y contabilidad: la más delicada |
| **E7** | 4 | **Puertos y adaptadores** de proveedores: que pagos, facturación electrónica y Google dependan de un puerto y no de Wompi, del proveedor fiscal o de Google |
| **E9** | 4 | **Tipos de interfaz** fuera de Core y Platform (`onboarding/types`, `tenant-nav`) |
| **V** | 6 | **Vocabulario y capacidades por rubro** en `VERTICAL_RECIPES`, sin comparar `vertical === "gym"` en el código (ficha del cliente, compras, registro de capacidades y menú «Crear») |

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

- **Mover `lib/construction/` a `lib/industry/construction/`** (~56 archivos y ~100 importadores): etapa independiente, sin decidir.
- **`lib/tenant/db.ts` sigue grande:** conserva clientes, pagos, reservas, gastos y finanzas, que la regla de capas no ve.
- La ficha 360° consulta al gimnasio aunque su módulo esté inactivo (mismo comportamiento de antes; se puede omitir).
- 4 ciclos de dependencias de solo tipos.

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
