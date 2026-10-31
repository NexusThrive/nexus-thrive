# NEXUS THRIVE V2 — Auditoría y modularización del esquema Prisma

Fecha: 2026-10-30 · Solo auditoría y diseño. No se modificó el esquema, ni migraciones, ni la base de datos.
Las pruebas se hicieron en una **copia** en el scratchpad (`proto/`), con el repo intacto.

## 1. Capacidades reales de la versión (verificadas, no supuestas)

| Pregunta | Resultado | Cómo se comprobó |
|---|---|---|
| Versión | `prisma 8.0.0-rc.20`, `@prisma/orm-postgres 8.0.0-rc.14` (candidatas, no estables) | `package.json`, `node_modules` |
| ¿Admite esquema en varios archivos? | **Sí.** `contract:` acepta un glob (`prisma/schema/*.prisma`). El proveedor PSL toma `inputs: [glob]` | Código de `contract-psl__provider.mjs` + emit real |
| ¿El resultado es idéntico? | **Sí.** Partí los 118 modelos y 32 enums en 8 archivos: `storageHash` = `191a1245…03007`, igual al del repo, y `contract.json` idéntico byte a byte | `prisma contract emit` en la copia |
| ¿Exige relación inversa en el otro modelo? | **No.** Quité `memberships`, `quotes`, `projects` de `Customer`: emit correcto y mismo `storageHash` | Emit en la copia |
| Dónde cae `contract.json` | Se deriva del prefijo del glob (`prisma/schema/`). Hay que fijarlo con la opción `output` para que `prisma/db.ts` siga importándolo desde `prisma/` | Código; **[VALIDAR]** en el paso real |
| Cada archivo necesita `// use prisma-8` en la primera línea | Sí (si no, `PSL_NO_OPTED_IN_SCHEMA_FILES`) | Notas de la versión rc.12 |
| Migraciones | Se planifican contra el hash del contrato, no contra archivos. Dividir archivos sin cambiar el contrato **no genera migración** | `migration-model.md` + hash idéntico |
| RLS | `@@rls` en cada modelo (ya presente) y bloques `policy_select/insert/update/delete` por modelo. Prisma 8 **migra las políticas pero no los GRANT** | `references/supabase.md` |
| Esquemas Postgres (`namespace`) | Existen, pero mover tablas a otro esquema es destructivo | `contract.md` |

**Hallazgo lateral:** `migrations/app/refs/*.json` apunta a `691a1768…`, no a `191a1245…` (el contrato actual). No sé si es una referencia sin avanzar o si hay cambios sin migrar. **[VALIDAR]** antes de cualquier trabajo real; no lo toqué.

## 2. Estado actual del esquema

- `prisma/contract.prisma`: 3 408 líneas, **118 modelos, 32 enums**, un solo archivo. Un único esquema Postgres (`public`).
- 97 modelos tienen `tenantId`; 21 no.
- Todos con `@@rls` (sin políticas, ver auditoría anterior H3).
- `Tenant` tiene **136 campos y 97 relaciones inversas**: es el centro de todo.

### Modelos sin `tenantId` (21), clasificados

| Tipo | Modelos | Comentario |
|---|---|---|
| Hijo de un padre con tenant (aceptable) | `ApuActivityComposition`, `QuoteItem`, `InvoiceLine`, `InboxMessage`, `LeadActivity`, `TicketMessage`, `ChargeEvidence`, `ProjectHeader` | El aislamiento depende de que se consulte siempre a través del padre. Con RLS futura necesitan política por join o copiar `tenantId` |
| Globales de plataforma | `Tenant`, `PlanSetting`, `ModuleSetting`, `VerticalSetting`, `CustomerTierSetting`, `BillingPolicy`, `AccountLimit` | Correcto que no lo lleven |
| **Por revisar** | `AuditLog`, `StaffRole`, `StaffInvite`, `StaffMember`, `BenefitCode`, `DismissedNotification` | Parecen ser de un negocio pero no tienen `tenantId`. **[VALIDAR]** si cuelgan de otro modelo con tenant. Candidatos a riesgo de fuga |

## 3. Propuesta de dominios (a partir de los modelos reales)

| Archivo propuesto | Modelos | N.º |
|---|---|---|
| `enums.prisma` | todos los enums transversales | 32 |
| `core.prisma` | Tenant, TenantModule, User, TenantInvite, StaffRole/Invite/Member, TenantContact, AuditLog, Attachment, DismissedNotification, AccountLimit, **Party, PartyRole**, UsageCounter | 15 |
| `platform.prisma` (global de Nexus) | PlanSetting, ModuleSetting, VerticalSetting, CustomerTierSetting, Lead, LeadActivity, SupportTicket, TicketMessage, Subscription, Charge, ChargeEvidence, BillingPolicy | 12 |
| `business.prisma` | Customer, CustomerNote, Product*, PriceList*, Booking, Invoice/Line, PurchaseOrder/Line, Warehouse, Stock*, PosTerminal, StoreOrder/Line, Inbox*, SatisfactionSurvey, Benefit* | 27 |
| `finance.prisma` | Payment, Expense, Cash*, TaxRate, NumberingResolution, SupplierInvoice/Payment, PaymentIntent/Refund, ReconciliationRun, Account, AccountingPeriod/Rule, CostCenter, Journal*, FiscalDocument | 19 |
| `integrations.prisma` | ApiKey, ApiRequestLog, IdempotencyRecord, OutboxEvent, Webhook*, ExternalConnection, ProviderEvent | 8 |
| `industry/construction.prisma` | Apu*, Quote, QuoteItem, ProjectFollowUp, Project*, Budget*, ProjectPlan, Lookahead, WeeklyCommitment, FieldLog* | 24 |
| `industry/gym.prisma` | Membership, Attendance | 2 |
| `industry/museum-tourism.prisma` | TicketSale, Departure, TourBooking | 3 |
| `experience.prisma` | Presence*, SiteConfig, GoogleListing, TrackedLink, ContactLead, Review | 8 |

Ningún modelo quedó sin clasificar. Esto es una clasificación **por responsabilidad** y no cambia nombres de tablas ni de modelos.
Automation e Insights no tienen modelos propios: viven en `integrations` (Outbox, Webhook) y en lecturas de otros dominios. No creo archivos vacíos.

## 4. Relaciones entre dominios (FK reales, sin contar `Tenant`)

| Arista | Cantidad | Detalle | Juicio |
|---|---|---|---|
| business → core | 3 | Customer→Party, CustomerNote→User, PurchaseOrder→Party | Correcto |
| finance → business | 2 | Payment→Customer, SupplierInvoice→PurchaseOrder | Correcto |
| finance → core | 1 | SupplierInvoice→Party | Correcto |
| industry-construction → business | 2 | Quote→Customer, Project→Customer | Correcto (Industry usa Business) |
| industry-gym → business | 1 | Membership→Customer | Correcto |
| **finance → industry-gym** | 1 | **Payment→Membership** (`membershipId`) | **Viola la dirección: Finance depende de un rubro** |

- **Ciclos entre dominios: ninguno.** El esquema ya tiene una dirección de dependencias sana; solo `Payment.membershipId` la rompe.
- `Payment` ya tiene el patrón correcto: `sourceType` + `sourceId` (MEMBERSHIP, INVOICE, TOUR_BOOKING, TICKET_SALE, PROJECT, SALE). `membershipId` es un FK duplicado de ese patrón.
- **Relaciones inversas Business → Industry:** `Customer` declara `memberships`, `quotes`, `projects`. Como Prisma 8 no las exige (probado), se pueden quitar sin tocar la base de datos. Cambia el **grafo de navegación del ORM** (`include`), no el SQL.
- Enums compartidos entre dominios: `TenantPlan` (core/business) y `PaymentProvider` (core/finance). Se quedan en `enums.prisma`.

## 5. Modelos que mezclan responsabilidades

| Modelo | Mezcla | Recomendación |
|---|---|---|
| **`Tenant`** (136 campos) | Identidad + ubicación/contacto + plan/cobro SaaS + CRM interno de Nexus (`accountStage`, `accountManagerId`) + flags (`einvoiceEnabled`, `accountingEnabled`) + `costingMethod` (contabilidad/construcción) + `settings` JSON | **No dividir ahora.** Separarlo es un cambio de datos con 97 relaciones. Documentar el campo→dominio y evaluar `TenantProfile`/`TenantBilling` en una fase posterior con migración propia |
| **`Customer`** | Cliente de negocio (Business) + `accessCode`, `nfcUid` (control de acceso del gimnasio) | Los campos de acceso son de Industry/gym. Moverlos exige migración de datos: diferir |
| **`Payment`** | Finanzas + `membershipId` (gym) | Eliminar el FK de gym cuando todo use `sourceType/sourceId` (fase de datos, no ahora) |
| `Quote` | Cotización de construcción (con APU) | Está bien en Industry. Si la agencia de servicios necesita cotizar, hace falta una cotización **general** en Business (ver auditoría de arquitectura E5) |
| `Product` (36 campos), `Invoice` (32) | Grandes pero cohesivos | Sin acción |

## 6. Globales frente a organizacionales

| Tipo | Modelos |
|---|---|
| Global de Nexus (no pertenece a un negocio) | Tenant, Plan/Module/Vertical/CustomerTier Setting, BillingPolicy, AccountLimit, y la contabilidad del propio SaaS: Lead, SupportTicket, Subscription, Charge… |
| Organizacional | los otros 97 con `tenantId` |
| De sucursal | **No existe** (ningún modelo `Branch`/`Location`). Es un hueco para el escenario «múltiples sucursales» |

Recomendación de nombre: llamar al archivo `platform.prisma` y declarar en su cabecera que **no** se consulta con `tenantId`: es la parte que solo el panel de Nexus debería tocar.

## 7. Estructura de carpetas propuesta

```
prisma/
├── schema/
│   ├── enums.prisma
│   ├── core.prisma
│   ├── platform.prisma
│   ├── business.prisma
│   ├── finance.prisma
│   ├── integrations.prisma
│   ├── experience.prisma
│   └── industry/
│       ├── construction.prisma
│       ├── gym.prisma
│       └── museum-tourism.prisma     (restaurant.prisma llegará aquí)
├── contract.json  contract.d.ts  db.ts      (se quedan donde están, con `output`)
```
`prisma.config.ts`: `contract: "prisma/schema/**/*.prisma"` y `output: "prisma"`. **[VALIDAR]** que un glob recursivo y `output` funcionan juntos (probé `*.prisma` plano).
Esto **no** impone nombres: salió de los modelos reales. Si los rubros nuevos son pocos, `industry/` puede ser un solo archivo por rubro, como arriba.

## 8. Impacto de la reorganización

| Área | Impacto | Nivel |
|---|---|---|
| Base de datos | Ninguno: mismo `storageHash` | Nulo |
| Migraciones | Ninguna nueva. Historial intacto (70 migraciones, baseline incluido) | Nulo |
| Cliente/tipos generados | `contract.json` idéntico: `contract.d.ts` y `db.ts` no cambian | Nulo si se fija `output` |
| Consultas y servicios | Sin cambios. Solo cambiarían si se **quitan relaciones inversas** (sec. 4) | Nulo (dividir) / Medio (quitar inversas) |
| Políticas RLS | `@@rls` va por modelo y se conserva al mover el modelo | Nulo |
| Herramientas | Cualquier script que lea `prisma/contract.prisma` (CI, `scripts/`, docs, `postinstall`) | **[VALIDAR]** con `grep` |
| Revisión de PR | Diffs más pequeños y por dominio; posible `CODEOWNERS` por archivo | Beneficio |
| Prisma RC | Una RC puede cambiar el comportamiento de globs | Riesgo bajo; el hash lo detecta |

## 9. Plan de migración incremental

Todas las etapas de **dividir** son sin cambios de datos y se validan con el mismo criterio: *`prisma contract emit` produce el mismo `storageHash` y `contract.json` idéntico*.

| Etapa | Qué | Criterio de aceptación | Riesgo |
|---|---|---|---|
| **P0** | Resolver el hallazgo de la ref `691a…` frente a `191a…` y localizar quién lee `contract.prisma` (`grep`) | Informe | Nulo |
| **P1** | Dividir el archivo **sin renombrar nada**: mover modelos por dominio a `prisma/schema/*.prisma`, `output` fijo | Mismo hash; `tsc`, `vitest` e integración verdes; `git diff` solo mueve bloques | Bajo |
| **P2** | Guardia en CI: prueba que lee los archivos y falla si (a) Business/Finance/Core tienen FK hacia un archivo de `industry/`, (b) un modelo nuevo de negocio no tiene `tenantId` (lista de excepciones = las 21 de la sec. 2) | Prueba verde; `Payment→Membership` en la lista de excepciones con fecha | Bajo |
| **P3** | Quitar relaciones inversas Business→Industry de `Customer` (y las que correspondan) | Mismo `storageHash`; tipos y pruebas verdes tras ajustar `include` | Medio |
| **P4** | Auditar los 6 modelos «por revisar» sin `tenantId` y las pruebas de acceso cruzado | Informe y pruebas | Bajo |
| **P5** | **Cambios de datos** (requieren tu autorización y SQL en `docs/prod-sql` con respaldo): `Payment.membershipId` → solo `sourceType/sourceId`; `Customer.accessCode/nfcUid` → gym; evaluar partir `Tenant`; modelo de sucursal | Migración probada en base de prueba | Alto |
| **P6** | Políticas RLS reales con `@@rls` + `policy_*` + `GRANT` manuales (Prisma no los autoriza) | Autorización explícita; primero base de prueba | Alto |

## 10. Riesgos y decisiones

1. **Prisma 8 RC**: comportamiento de globs/`output` puede variar entre RC. Mitigación: bloquear versión (ya está en lockfile) y criterio de hash en CI.
2. **Resolución de conflictos de merge**: dividir mientras hay PR abiertos que tocan `contract.prisma` genera conflictos. Hacer P1 en una ventana sin PR de esquema abiertos.
3. **Documentación** (`.docs`, ADR, skills) que cita `prisma/contract.prisma`: actualizar rutas.
4. **No usar `namespace`/esquemas Postgres separados** por dominio: renombraría tablas, destructivo, sin beneficio hoy.

**Decisiones que necesito de ti:**
- **DP-1** ¿Autorizas P0 y P1 (dividir el archivo, sin cambios de datos)? Es reversible y verificable por hash.
- **DP-2** ¿Nombres de archivo: `platform` (global de Nexus) y `industry/<rubro>`?
- **DP-3** ¿Se quitan las relaciones inversas Business→Industry (P3) o prefieres conservarlas?
- **DP-4** Los cambios de la etapa P5 y P6 siguen **sin** autorización hasta que lo indiques.
