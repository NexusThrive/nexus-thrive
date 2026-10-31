# E7 — Los dominios no dependen de los adaptadores de proveedores: resultados

Ejecutado en la rama local `chore/HU-esquema-prisma-modular-01`, sin push ni PR, a partir de [`E5-resultados.md`](E5-resultados.md)
(14 excepciones). **Las 4 excepciones de E7 quedan resueltas: 14 → 10** (quedan E9 4, V 6).

## Qué cambió

Se reutilizó el mecanismo de puertos de E5 (`lib/ports.ts` + raíz de composición `lib/runtime/ports.ts`): cada dominio declara lo que necesita
y la composición lo conecta con el adaptador real. Tres puertos nuevos:

| Puerto | Declarado por | Lo implementa | Resuelve |
|---|---|---|---|
| `fiscal-queue` (`lib/business/fiscal-port.ts`) | Business | `enqueueFiscal` de facturación electrónica | EX-008 (`documents-db` → `einvoice-db`) |
| `payment-checkout` (`lib/payments/checkout-port.ts`) | Finance (cobros) | Wompi: descifra credenciales y arma el enlace del checkout | EX-033 y EX-034 (`intents-db` → `providers/connections` y `providers/wompi`) |
| `google-listing` (`lib/presence/listing-port.ts`) | Business (presencia) | `listingView` de Google, reducido a conectada / estado / coincidencias | EX-035 (`pillars-db` → `google-db`) |

## Reglas que se conservaron

- **Misma transacción.** La cola fiscal se escribe dentro de la transacción de la venta, como antes, y nunca la rechaza: si la facturación
  electrónica está apagada, no hace nada. Si el puerto lanza, se deshace el documento.
- **El dominio no conoce al proveedor.** `intents-db` ya no sabe de Wompi ni de cifrado de credenciales: pasa la conexión guardada y la referencia;
  el adaptador decide si la pasarela tiene checkout alojado (hoy solo Wompi) y devuelve `null` si no. Si el adaptador falla, el cobro queda sin enlace, igual que antes.
- **La presencia no conoce a Google.** Solo recibe tres datos (conectada, estado, coincidencias de nombre, dirección y teléfono).
- **Falla cerrado.** Sin el puerto conectado, la operación falla con `PortNotProvidedError`; la prueba de arquitectura exige que todo puerto declarado quede conectado.
- No se tocó la lógica de los adaptadores (`providers/`, `einvoice/`, `google/`), ni modelos, migraciones, RLS, ledger ni contratos públicos.

## Validación

`pnpm verify` en verde (capas 10/10, 0 nuevas; lint 0 errores; pruebas unitarias; integración sobre base desechable; build). Suite de las áreas afectadas:
103 archivos / 1 285 pruebas. Pruebas nuevas: 11 de integración en `tests/integration/business/puertos-integraciones.integration.test.ts`.
Contrato Prisma sin cambios (`git diff` vacío en `prisma/` y `migrations/`; guardián SQL: sin cambio de tablas). Ciclos: 4 de solo tipos, 0 de valores.

## Pendiente

E9 (4 excepciones de tipos de interfaz fuera de Core/Platform) y V (6 comparaciones de rubro en código); migración de las 151 pruebas; `lib/construction`;
`tenant/db.ts` grande; decisión de push/PR.
