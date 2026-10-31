# Instalación y primer día

Para desarrolladores y administradores técnicos que ponen Nexus a funcionar por primera vez.

## Requisitos

| Herramienta | Versión de referencia |
|---|---|
| Node.js | 24 (la de desarrollo actual es 24.x) |
| pnpm | 12.x (fijada en `packageManager` de `package.json`) |
| PostgreSQL | 17 (con la extensión `pg_trgm`) |
| Cuenta de Clerk | Para autenticación (ver [Clerk en producción](../08-operacion-y-despliegue/clerk-produccion.md)) |

## Puesta en marcha

```bash
pnpm install
cp .env.example .env            # completa las variables (ver abajo)
pnpm prisma db migrate --db "$DATABASE_URL"
pnpm dev                        # http://localhost:3000
```

Variables mínimas en `.env`: `DATABASE_URL`, `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`, `CLERK_SECRET_KEY` y `NEXT_PUBLIC_APP_URL`. El resto (WhatsApp, Resend, Blob, `RECEIPT_LINK_SECRET`) degrada con elegancia si falta; `.env.example` lista todas y `.env.produccion` explica cuáles son obligatorias en producción.

> Las pruebas de integración **nunca** deben apuntar a tu base de desarrollo: usan una base aparte con `TEST_DATABASE_URL`. Ver [Pruebas](../10-pruebas-y-calidad/pruebas.md).

## Comandos del día a día

| Comando | Para qué |
|---|---|
| `pnpm dev` | Servidor de desarrollo |
| `pnpm lint` · `pnpm exec tsc --noEmit` | Estilo y tipos |
| `pnpm check:layers` | Reglas de dependencias entre capas de `lib/` |
| `pnpm test` | Pruebas unitarias y de arquitectura (`tests/`) |
| `pnpm test:integration` | Pruebas con base de datos (necesita `TEST_DATABASE_URL`) |
| `pnpm test:e2e` | Storybook + Playwright (accesibilidad con axe) |
| `pnpm verify` | Todo lo que corre el CI, de principio a fin |
| `pnpm storybook` | Catálogo de componentes en el puerto 6006 |

## Tu primer cambio

1. Lee la [guía de implementación de `lib/`](../03-arquitectura/guia-implementacion-lib.md) para saber en qué área va tu código.
2. Sigue [Nueva funcionalidad](../09-desarrollo/nueva-funcionalidad.md).
3. Si tocas datos, lee [Prisma: estructura](../05-datos-y-base-de-datos/prisma-estructura.md).
4. Antes de abrir el PR: `pnpm verify` en verde y la plantilla de PR completa.

## Si eres un agente de IA

Lee primero `CLAUDE.md` y `AGENTS.md` en la raíz: contienen las reglas obligatorias (diseño, datos, equipo de ingeniería). Después, [Arquitectura](../03-arquitectura/README.md) y [Seguridad](../06-seguridad-y-permisos/README.md). No modifiques Prisma, migraciones ni contratos públicos sin una instrucción explícita.
