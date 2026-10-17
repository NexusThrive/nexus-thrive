# Nexus

Plataforma multi-negocio (SaaS) para pymes en Colombia: CRM, finanzas, membresías, reservas y verticales especializadas. La vertical de construcción cubre el ciclo completo de una obra: catálogo APU, presupuesto, cotización al cliente, planificación Lean, bitácora, avance e informes.

## Stack

- Next.js 16 (App Router, Turbopack) y React 19
- Prisma 8 (`@prisma/orm-postgres`) sobre PostgreSQL
- Clerk (autenticación) y Vercel Blob (subida de archivos grandes)
- Vitest (tests unitarios y de integración)

## Puesta en marcha

```bash
pnpm install
cp .env.example .env   # o crea .env con las variables de abajo
pnpm prisma db migrate --db "$DATABASE_URL"
pnpm dev
```

Variables de entorno:

| Variable | Uso |
| --- | --- |
| `DATABASE_URL` | PostgreSQL de la aplicación |
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`, `CLERK_SECRET_KEY` | Clerk |
| `BLOB_READ_WRITE_TOKEN` | Vercel Blob (solo servidor; los tokens de subida se emiten en `/api/blob-upload`) |
| `DEV_ALLOWED_ORIGINS` | Hosts extra del dev server separados por coma (Tailscale, LAN) |
| `TEST_DATABASE_URL` | Base aparte para los tests de integración |

## Verificación

```bash
pnpm exec tsc --noEmit
pnpm lint
pnpm test
DATABASE_URL=$TEST_DATABASE_URL pnpm test:integration
pnpm build
```

El CI (`.github/workflows/ci.yml`) ejecuta todo esto sobre un Postgres efímero. El test `lib/apu-importer/master-pack*.file*.test.ts` verifica un pack APU real si se le pasa `MASTER_PACK_FILE=/ruta/al/archivo.xlsx`.

## Vertical de construcción

Una obra es el contenedor de todo; fuera de ella solo existe el catálogo APU.

| Menú | Ruta | Contenido |
| --- | --- | --- |
| Obras | `/{negocio}/projects` | Listado y contenedor de la obra: Ficha · Presupuestador · Cotizaciones · Planificador Lean · Bitácora y campo · Informes |
| Cotizaciones | `/{negocio}/quotes` | Una carpeta por obra con sus versiones y seguimientos |
| Catálogo APU | `/{negocio}/catalog` | Actividades APU (con auxiliares y capítulos) e insumos con foto; importador en `/catalog/import` |

Flujo:

1. **Catálogo.** Se importa el libro APU completo (ACTIVIDADES, APU, APU AUXILIARES, MATERIALES, CAPITULOS) con las fotos de los insumos. Cada línea se guarda tal como viene en el archivo y cada APU se verifica contra su costo directo. Reimportar actualiza sin borrar nada: las líneas manuales y las fotos se conservan, y los cambios de precio quedan en el historial.
2. **Presupuesto.** La obra importa actividades del catálogo; su composición se copia (los precios quedan congelados en la obra).
3. **Cotización.** Emitir una versión congela una revisión del presupuesto. Una versión nueva reemplaza la anterior. Cuando el cliente aprueba, la obra queda contratada: se crea la línea base (Informe Cero) y el presupuesto se bloquea.
4. **Ejecución.** Planificación Lean (lookahead, compromisos, PPC, CNC), bitácora con fotos y actas de avance por partida. La primera acta pasa la obra a En ejecución.
5. **Informes.** Informe Cero, informe semanal con valor ganado y avance físico, BOM en CSV y presupuesto en Excel.

El código vive en `lib/construction/*` (capa de datos por dominio), `lib/apu-importer/*` (importador) y `app/[tenant]/(app)/{projects,quotes,catalog}`.
