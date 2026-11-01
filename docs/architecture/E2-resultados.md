# E2 — Lo mal ubicado, en su sitio: resultados

Ejecutado en la rama local `chore/HU-esquema-prisma-modular-01`, sin push ni PR. Parte de [`E1-resultados.md`](E1-resultados.md) (64 → 51 excepciones).

## Qué cambió

| Paso | Cambio | Resuelve |
|---|---|---|
| E2.1 | El tipo de transacción de la base pasa a Foundation (`lib/db-transaction.ts`); `money-service` conserva `MoneyTx` como alias y el outbox de eventos deja de importar de Business | EX-019 |
| E2.2 | `permissions.ts`, `roles.ts` y su prueba pasan de `lib/business/` a `lib/auth/` (renombrados al 100 %, 62 archivos con imports nuevos) | EX-004, 005, 023, 030, 031, 039, 040 |
| E2.3 | `team-db.ts` (equipo, invitaciones, asientos) pasa a `lib/tenant/` | EX-056, 058 |
| E2.4 | `lib/files` deja de depender de la plataforma de NEXUS: las funciones reciben `staffAccess` (obligatorio) y las rutas pasan `staffCanViewAccounts` | EX-020 |
| E2.5 | Gimnasio (`gym`, `gym-db`, `memberships*`, `enrollment-db`) a `lib/industry/gym/` y museo a `lib/industry/museum/` | EX-011 |
| E2.6 | `escapeLike` con una sola definición (`lib/admin/db.ts` importaba una copia) | — |
| — | `pnpm verify`: el paso unitario corre sin base de datos, como el CI | — |

`layers.json` clasifica cada industria por carpeta. Business ya no contiene código de ningún rubro.

### Control de acceso a archivos (E2.4)

Es la única inversión con efecto de seguridad. Antes `stored-files` llamaba a `getStaffContext` si quien pedía no era miembro; ahora quien llama aporta `staffAccess`, que solo se evalúa en ese caso.
El parámetro es obligatorio: olvidarlo no compila, y la prueba de integración (7 casos) cubre miembro, miembro desactivado, miembro de otro negocio, desconocido y equipo NEXUS autorizado.
Se comprobó con una mutación (la compuerta deja pasar a todos): 4 casos fallan.

## Excepciones: 51 → 39

Retiradas exactamente 12, ninguna modificada ni añadida; eran **todas** las de la etapa E2. Ya no queda ninguna excepción R1 ni R2 (nadie importa una industria desde fuera y las industrias no se importan entre sí).

| Etapa | Antes de E2 | Ahora |
|---|---|---|
| E2 | 12 | **0** |
| E3 | 8 | 8 |
| E5 | 17 | 17 |
| E7 | 4 | 4 |
| E9 | 4 | 4 |
| V | 6 | 6 |
| **Total** | **51** | **39** |

## Hallazgo fuera de alcance

Un defecto real e independiente de E2: los documentos comerciales se fechan en UTC. Ver [`hallazgo-fechas-utc-en-asientos.md`](hallazgo-fechas-utc-en-asientos.md). **No se corrigió dentro de E2**: se corrigió en un PR funcional independiente (fechas), que en la pila va antes que este.

## Pruebas

- Integración (base PostgreSQL 17 desechable), a la misma hora y antes frente a después de E2: 58 archivos / 343 pruebas con 1 fallo → 59 archivos / 350 pruebas con **el mismo** 1 fallo (el defecto anterior). Las 7 nuevas son las de `lib/files`.
- Nuevas: `tests/architecture/e2-reubicaciones.test.ts` (22), `tests/integration/files/stored-files.integration.test.ts` (7) y un caso más en `verify-script.test.ts`.
- Dependencias circulares: los mismos 4 ciclos de solo tipos que antes de E1 y 0 de valores; `money-service ⇄ events/outbox ⇄ stock-service` quedó en `money-service ⇄ stock-service`.

## Lo que queda

- **Decidir:** qué hacer con los asientos ya escritos antes de la corrección de fechas (arriba); no se corrigen automáticamente.
- **Decidir:** si `lib/construction` también pasa a `lib/industry/construction/`. No lo hace E2: son ~56 archivos y ~100 importadores, y la etapa E2 no lo incluía.
- Excepciones restantes: E3 (operaciones y suscriptores por dominio, 8), E5 (Business → Finance por eventos, 17), E7 (puertos de proveedores, 4), E9 (tipos de interfaz, 4) y V (vocabulario por rubro, 6).
- `lib/tenant/db.ts` sigue siendo grande: conserva clientes, pagos, reservas, gastos y finanzas.
