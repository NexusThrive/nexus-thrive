---
title: C · Checklist de GYM
tags: [arquitectura, gym, checklist]
updated: 2026-10-25
---

# C · Checklist de GYM

Solo funciones **propias del gimnasio**. Lo común (cobros, inventario, contabilización, avisos) se lista como dependencia, no se repite. GYM **no es un módulo**: es un perfil (`VERTICAL_RECIPES`) que enciende `crm`, `bookings`, `memberships`, `inventory`, `finance`, `payments` y `whatsapp` (`.docs/distribucion-por-rubro.md` §4). Las filas `GYM-n` son etiquetas de esta tabla; **no reemplazan ningún identificador de capa**. Ninguna función del gimnasio tiene hoy subcapa propia: el mapa las ubica en XI como «de un rubro» (ver E-04).

| ID | Capacidad | Categoría | Estado verificado | Decisión | Dependencias (verificadas) | Evidencia | Criterio de aceptación |
|---|---|---|---|---|---|---|---|
| GYM-1 | Plan y alta de membresía con cobro inicial | C | Implementado, con prueba parcial | MANTENER | I.01 (el plan es un producto), IV.00 (socio = cliente), dinero (`money-service`) | `Membership` en `prisma/contract.prisma`; `lib/business/memberships-db.ts` (`createMembershipWithCharge`); `app/[tenant]/(app)/memberships`; `lib/business/money-service.integration.test.ts` (renovación y anulación) | Alta con y sin cobro probada de punta a punta; el cobro pasa solo por el servicio de dinero |
| GYM-2 | Renovación | C | Implementado, con prueba parcial | MANTENER | Igual que GYM-1 | `renewMembershipWithCharge`; prueba de renovación en `money-service.integration.test.ts` | Renovar desde la fecha de fin vigente y desde hoy si venció, con prueba de ambos casos |
| GYM-3 | Congelar, reactivar y cancelar | C | Implementado y probado | MANTENER | GYM-1 | `lib/business/gym-db.ts` (`freezeMembership`, `unfreezeMembership`, `cancelMembership`); `gym-db.integration.test.ts` («congelar corre el vencimiento… devuelve los días») | Mantener la prueba; falta probar la cancelación con motivo |
| GYM-4 | Control de acceso (QR, NFC, documento, manual) y asistencia | C | Implementado y probado | MANTENER | GYM-1; Customer con `accessCode`/`nfcUid` (ver E-02) | `Attendance`; `app/[tenant]/(app)/checkin`; `findMemberByScan`, `checkIn`, `recordUnknownScan`; `gym-db.integration.test.ts`, `qr-read.integration.test.ts`; `docs/gym-acceso-nfc.md` | Entradas permitidas, negadas y desconocidas registradas por organización; sin prueba en dispositivo físico (pendiente declarada) |
| GYM-5 | Vencimientos y por vencer | C | Implementado y probado | MANTENER | GYM-1; avisos (VI.08) | `expiringSoon`, `memberStatus`; `lib/dashboard/notifications.ts`; prueba «vencimientos: incluye al vencido reciente y excluye canceladas» | El aviso al socio sale por el servicio de avisos, no por un enlace manual (hoy es `whatsapp-reminder.tsx`) |
| GYM-6 | Recordatorio de renovación por WhatsApp | C | Implementado (enlace manual), sin prueba | RELLENAR | III.00, VI.08 | `app/[tenant]/(app)/memberships/_components/whatsapp-reminder.tsx` | Envío por el canal único de WhatsApp con registro de entrega y programación |
| GYM-7 | Ficha del socio con foto, medidas y plan | C | Implementado, con prueba | RELLENAR | IV.00 | `lib/business/customer-fields.ts`; `business.test.ts` («ficha del cliente por rubro»); `crm/[id]/page.tsx` | Los campos por rubro salen de la configuración y no de `vertical === "gym"` (ver E-03) |
| GYM-8 | Clases, cupos y reservas | C | Desconocido | PENDIENTE DE REVISIÓN | V.05; `bookings` | `Booking`, `lib/business/bookings-db.ts`; prueba de cupo en `business.test.ts` («choques… y cupo del servicio») | Definir si el cupo por clase es de V.05 (compartida) o propio del gimnasio |
| GYM-9 | Informe de asistencia y retención | C | Pendiente de definir | RELLENAR | IX.01, IX.03 | `attendanceBetween`, `attendanceCount` existen en `gym-db.ts`; no hay informe | Informe con métricas del catálogo de IX.01, exportable y programable |
| GYM-10 | Recuperación de inactivos y clase de prueba | C | Pendiente de definir | APLAZAR | IV.01, II.05 | Solo descrito en `.docs/fuentes/DesordenadoCapas.md` (embudo de gimnasio) | Se retoma con embudos (IV.01); baja urgencia, no bloquea operar |

**Requisitos del Core para que GYM funcione** (todos existen): aislamiento por organización, roles, auditoría, tercero único, catálogo, dinero, avisos. **Falta para estabilizarlo:** E-02, E-03 y la prueba de dispositivo físico del acceso.
