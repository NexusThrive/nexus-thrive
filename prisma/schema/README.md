# Contrato de datos por dominio

Prisma lee todos los `.prisma` de esta carpeta como **un solo esquema** (`prisma.config.ts`:
`contract: "prisma/schema/**/*.prisma"`). Dividirlo no cambia tablas: el `storageHash` y
`contract.json` son los mismos que con el archivo único.

## Convención

- La descripción de cada modelo o enum va **encima**, con `///`. Dentro de `{}` no hay comentarios:
  lo que explica cada campo se lista en el bloque «Campos:» o «Valores:» de arriba.
- Cada enum vive en el archivo del modelo que lo usa. Si lo usan dos archivos, en el del dueño
  (`TenantPlan` en `core/tenant`, `PaymentProvider` en `finance/payments`).
- Todo archivo empieza con `// use prisma-8`; Prisma lo exige.
- Un modelo nuevo va en el dominio que corresponda. Un rubro nuevo crea su carpeta en `industry/`.
- Dirección de dependencias entre dominios: `industry` → `business`/`finance` → `core`. Lo que está en
  `platform` es de Nexus como SaaS y no se consulta por `tenantId`.

## Mapa

| Carpeta | Para qué sirve | Archivos |
|---|---|---|
| `core/` | Organización, identidad y seguridad compartidas | `tenant`, `identity`, `team`, `parties`, `audit`, `files` |
| `platform/` | Operación global de Nexus como SaaS | `settings`, `crm`, `support`, `billing` |
| `business/` | Capacidades empresariales generales | `customers`, `catalog`, `inventory`, `sales`, `purchasing`, `pos`, `store`, `scheduling`, `inbox`, `benefits` |
| `finance/` | Dinero: pagos, caja, impuestos, contabilidad | `payments`, `cash`, `tax`, `payables`, `accounting` |
| `integrations/` | API, eventos y proveedores externos | `api`, `events`, `providers` |
| `experience/` | Presencia digital, sitio y reputación | `presence`, `site`, `reputation` |
| `industry/construction/` | Obras: APU, presupuesto, planificación, bitácora | `apu`, `quotes`, `projects`, `budget`, `planning`, `field-log` |
| `industry/gym/` | Gimnasio | `memberships` |
| `industry/museum/` | Museo | `ticketing` |
| `industry/tourism/` | Turismo | `tours` |
