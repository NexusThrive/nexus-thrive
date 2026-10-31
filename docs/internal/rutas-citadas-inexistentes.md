# Rutas citadas en la wiki que ya no existen

Generado en la fase 4 (2026-10-31) con un recorrido de todas las rutas entre comillas invertidas (`lib/…`, `app/…`, `prisma/…`, `docs/…`…) en `docs/wiki/` y `docs/decisions/`. Entrada de trabajo de la **fase 5** (validación de la wiki): cada ruta se corrige, se explica como histórica (los ADR y `V10-decisiones.md` nombran a propósito rutas de antes) o se retira.

Los ADR de la serie `ingenieria` citan `scripts/*.py` y `tests/test_server.py` del motor Python retirado: es correcto como historia (ADR 0013).

```
citas 427 · inexistentes 103

docs/decisions/V10-decisiones.md (6)
  lib/benefits
  prisma/db
  lib/admin/catalogs.ts
  lib/admin
  lib/tenant/tenant-scope.test.ts
  lib/payment-input

docs/decisions/arquitectura/0001-monolito-modular.md (1)
  lib/solutions

docs/decisions/arquitectura/0003-registro-de-capacidades.md (2)
  lib/capabilities/registry.ts

docs/decisions/arquitectura/0006-servicio-de-dinero.md (1)
  lib/capabilities/money

docs/decisions/ingenieria/0001-nucleo-local-python.md (1)
  scripts/product-gate.py

docs/decisions/ingenieria/0005-puente-http-n8n.md (1)
  tests/test_server.py

docs/decisions/ingenieria/0007-reconstruccion-product-team.md (2)
  scripts/product-gate.py

docs/decisions/ingenieria/0013-subagentes-nativos-en-plugin.md (2)
  scripts/nexus-eng
  scripts/product-gate.py

docs/decisions/ingenieria/resumen.md (3)
  scripts/product-gate.py
  scripts/generate-agents.py
  scripts/sync-client-adapters.py

docs/wiki/02-producto/distribucion-por-rubro.md (4)
  lib/admin/catalogs.ts
  lib/capabilities/registry.ts
  lib/functions/suggestions.ts
  lib/functions/functions.ts

docs/wiki/02-producto/hoja-de-ruta.md (9)
  lib/ops
  lib/benefits
  lib/payment-input
  lib/finance
  lib/tax
  lib/accounting
  lib/receivables
  lib/payments
  lib/construction

docs/wiki/02-producto/vision-negocio-conectado.md (1)
  lib/presence/presence.ts

docs/wiki/03-arquitectura/arquitectura-objetivo.md (5)
  lib/ops
  lib/admin
  lib/finance
  lib/api
  lib/mcp

docs/wiki/03-arquitectura/guia-implementacion-lib.md (3)
  lib/helpers
  lib/misc
  tests/integration/…

docs/wiki/03-arquitectura/reglas-de-capas-e0.md (10)
  lib/construction
  lib/events
  lib/presence
  lib/capabilities/registry.ts
  lib/onboarding/validation.ts
  lib/plans/pricing.ts
  lib/navigation/quick-create.ts
  lib/plans/validators.test.ts

docs/wiki/03-arquitectura/reglas-dependencias.md (2)
  lib/core/tenancy/tenant-scope.test.ts

docs/wiki/04-modulos/capas/II-Visibilidad-Captacion-y-Presencia-Digital/01-SEO-Tecnico-y-Posicionamiento-Local/README.md (1)
  lib/site/site-db.ts

docs/wiki/04-modulos/capas/II-Visibilidad-Captacion-y-Presencia-Digital/02-Publicidad-Digital-y-Atribucion-Multicanal/README.md (2)
  lib/growth/growth-db.ts

docs/wiki/04-modulos/capas/III-Atencion-y-Comunicacion/04-Encuestas-de-Satisfaccion-y-Reputacion/README.md (2)
  lib/growth/growth-db.ts
  lib/growth/growth.ts

docs/wiki/04-modulos/capas/IX-Inteligencia-de-Negocio-Analitica-e-IA/01-Modelo-Semantico-y-Catalogo-de-Metricas/README.md (1)
  lib/business/permissions.ts

docs/wiki/04-modulos/capas/V-Ventas-Digitales-Comercio-y-Pagos/04-Comercio-Electronico/README.md (2)
  lib/store/store-db.ts
  lib/payments/intents-db.ts

docs/wiki/04-modulos/capas/VII-Caja-Menor-Finanzas-Operativas-y-Contabilidad/06-Presupuestos-y-Centros-de-Costo/README.md (2)
  prisma/contract.prisma
  lib/accounting/accounting-db.ts

docs/wiki/04-modulos/capas/X-Plataforma-SaaS-Gobernanza-y-Escalabilidad/00-Planes-Suscripciones-y-Control-de-Consumo/README.md (1)
  lib/benefits

docs/wiki/04-modulos/capas/XI-Especializacion-por-Vertical/00-Construccion-Presupuesto-y-Control-de-Obra/README.md (1)
  lib/business/permissions.ts

docs/wiki/04-modulos/documentacion-de-modulos.md (10)
  lib/business/money-service.ts
  lib/construction/apu-engine.ts
  lib/finance/cop-amount.ts
  lib/tenant/deletion.ts
  lib/construction/lean-engine.ts
  lib/motion/modal-morph.ts
  lib/construction/apu-importer/confidence-score.ts
  lib/construction/report-engine.ts
  lib/construction/budget.ts:233
  lib/construction/projects.ts:211

docs/wiki/04-modulos/gym-acceso-nfc.md (1)
  lib/business/gym-db.ts

docs/wiki/05-datos-y-base-de-datos/borrado-de-un-negocio.md (3)
  lib/tenant/deletion.integration.test.ts
  lib/tenant/deletion.ts

docs/wiki/05-datos-y-base-de-datos/dinero-y-decimales.md (9)
  lib/business/money-service.ts
  lib/finance/cop-amount.ts
  lib/finance/cop-amount.test.ts
  lib/construction/apu-engine.ts
  lib/construction/apu-engine.test.ts
  lib/format.ts
  lib/business/money-service.integration.test.ts
  lib/capabilities/money

docs/wiki/05-datos-y-base-de-datos/prisma-estructura.md (1)
  migrations/refs

docs/wiki/07-integraciones/api-mcp-webhooks.md (3)
  lib/capabilities/registry.ts
  lib/operations

docs/wiki/07-integraciones/n8n-en-casa.md (2)
  lib/events/n8n-templates.test.ts
  lib/events/endpoints.ts

docs/wiki/08-operacion-y-despliegue/clerk-produccion.md (1)
  lib/auth/session-email.ts

docs/wiki/08-operacion-y-despliegue/devops.md (1)
  prisma/contract.prisma

docs/wiki/09-desarrollo/equipo-ingenieria.md (1)
  docs/ingenieria/PAUSA

docs/wiki/09-desarrollo/nueva-funcionalidad.md (3)
  lib/core/capabilities/registry.test.ts
  prisma/contract.prisma
  lib/core/tenancy/tenant-scope.test.ts

docs/wiki/10-pruebas-y-calidad/pruebas.md (3)
  prisma/contract.prisma
  tests/unit/industry/museum/…
  tests/integration/core/tenancy/…
```
