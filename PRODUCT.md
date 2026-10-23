# PRODUCT.md — Qué es NEXUS y para quién

Resumen para decidir diseño. El detalle de producto está en
[docs/nexus-architecture/product-vision.md](docs/nexus-architecture/product-vision.md)
y la ruta en [.docs/README.md](.docs/README.md).

## Qué es

> **Simplifica tu vida financiera y empresarial en un solo sitio.**

NEXUS es el sistema operativo del negocio para pymes en Colombia: el lugar
donde el negocio vende, cobra, controla su caja e inventario, atiende a sus
clientes y se hace visible, con la forma de su rubro (gimnasio, museo,
constructora, comercio, servicios…).

## Tres superficies, tres propósitos

| Superficie | Quién | Para qué | Dónde |
|---|---|---|---|
| **Sitio público** | Visitantes | Entender qué es NEXUS y por qué sirve | `nexus-thrive-web` (Astro) → nexusthrive.com.co |
| **Espacio del negocio** | Dueño, administrador, cajero, staff | Operar el día: clientes, ventas, cobros, agenda, caja | `app/[tenant]/(app)` → `/{negocio}/…` |
| **Panel CEO (Operations Center)** | Equipo NEXUS | Operar la plataforma: cuentas, soporte, comercial, planes, facturación, auditoría | `app/admin` → `/admin/…` |
| **Centro de ayuda** | Usuarios de los negocios | Aprender a usar el producto real | `nexus-thrive-web` → `/help` |

Comparten marca; no comparten layout. El sitio comunica, la app opera y la
ayuda enseña.

## Para quién diseñamos

- **Dueña o dueño de una pyme** que usa el celular más que el computador, no
  es contador y no tiene tiempo de aprender un ERP. Quiere ver cómo va hoy y
  cobrar sin errores.
- **Cajero o staff** que hace la misma operación muchas veces al día (cobrar,
  registrar entrada, agendar): necesita rapidez, teclado y pocas decisiones.
- **Administrador** que configura módulos, equipo y permisos una vez.
- **Equipo NEXUS** que atiende muchas cuentas a la vez y necesita prioridades,
  no gráficos.

## Principios de producto

1. **Se adapta al rubro.** Términos, módulos y pantallas propias de cada
   rubro (`vertical-terms.ts`); por debajo, las mismas capacidades.
2. **La operación diaria primero.** La contabilidad y la factura salen de lo
   que el negocio ya registró.
3. **Datos reales o nada.** No se muestran cifras inventadas, controles que no
   funcionan ni módulos que no existen. Lo que no está listo no aparece.
4. **El mismo gesto para lo mismo.** Crear, editar, buscar, confirmar y anular
   se hacen igual en todos los módulos
   ([interaction-patterns.md](docs/design/interaction-patterns.md)).
5. **El dinero no se equivoca.** Sin cobros duplicados, con recibo, y anular
   deja rastro (`money-service.ts`, bitácora).
6. **Español de Colombia, claro y corto.** Tú, no usted. Verbos concretos
   ("Cobrar", "Anular venta"), no genéricos ("Enviar", "Aceptar").
7. **Accesible y usable con una mano.** WCAG 2.2 AA como base; hojas
   inferiores en el celular; objetivos táctiles cómodos.

## Restricciones

- Marca NEXUS y sus fuentes sin cambios (ver [DESIGN.md](DESIGN.md)).
- Next.js 16 + React 19 + Tailwind v4 + Radix; sin librerías de animación.
- Datos: nada en `app/` consulta la base directo; todo pasa por repositorios
  de `lib/` con `tenantId`, `can()`, `money-service` y `logTenantAction`
  ([docs/guias/nueva-funcionalidad.md](docs/guias/nueva-funcionalidad.md)).
- Permisos en el servidor; ocultar un botón es comodidad, no seguridad.
- Módulos apagados no muestran pantallas ni acciones (`modulesForRoute`).
- Capturas para la ayuda: solo de la app real con datos de demostración.
