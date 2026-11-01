# Auditoría de la documentación y mapa de migración

Estado: **fase 1 (inventario) y fase 2 (diseño) terminadas. No se movió ni borró ningún archivo.**
Fecha: 2026-10-31. Mapa archivo por archivo: [`mapa-migracion.tsv`](mapa-migracion.tsv).

## 1. Qué hay hoy

524 archivos `.md`/`.mdx` versionados. 249 son herramientas de agentes (`plugins/` 101, `.agents/` 82, `.claude/` 66) y quedan **fuera de alcance**. Los 275 restantes son documentación del proyecto, repartida en **tres sitios sin criterio**:

| Ubicación | Archivos | Problema |
|---|---|---|
| `.docs/` | 105 (90 son `capas/`) | Carpeta oculta, convive con `docs/`; su README enlaza a `docs/` y viceversa |
| `docs/` | 140 en 14 subcarpetas | Mezcla manual vigente, informes de etapa (`construction/`, `architecture/V10-*`, `E*-resultados`) y auditorías de octubre previas a V10 |
| raíz | 9 | `DESIGN`, `PRODUCT`, `REDISENO-NEXUS` e `IDEAS-…` sueltos |

Hallazgos:

- **Duplicados con contenido contradictorio.** `docs/nexus-architecture/` (22–23 oct) describe una arquitectura anterior a V10; `docs/architecture/` (V10) y `.docs/hoja-de-ruta-implementacion.md` hablan de rutas que ya no existen. Tres «hojas de ruta»: `.docs/hoja-de-ruta-implementacion.md`, `docs/architecture/hoja-de-ruta.md` y `docs/nexus-architecture/roadmap.md`, más `docs/PENDIENTES.md` y `SIGUIENTE-PASO.md`.
- **Dos sistemas de decisiones:** `docs/ingenieria/adr/` (13) y `docs/nexus-architecture/decisions/` (6), más `docs/architecture/V10-decisiones.md` y `docs/ingenieria/arquitectura/decisions.md`.
- **Informes de etapa mezclados con manuales:** 62 archivos son evidencias fechadas (construction 22, V10/E-etapas 22, nexus-architecture 15…). Sirven como historia, no como manual.
- **Documentación muerta:** `docs/ingenieria/archivo/motor-python/` (9 archivos, motor retirado por el ADR 0013).
- **Enlaces:** 1 176 enlaces `.md` internos; 13 archivos de código/config y 29 comentarios de `lib/`/`app/` citan rutas de `docs/` o `.docs/`.
- **Archivos que no son Markdown pero dependen de su ruta** (no se mueven): `docs/architecture/layers.json` y `exceptions.json` (los lee `check-layers` y ~25 pruebas), `docs/prod-sql/*.sql` (`check-prod-sql`), `docs/n8n/plantillas/*.json`, `docs/ci/migrar-produccion.yml`, `docs/ingenieria/herramientas/registro.json`, `docs/knowledge/catalog/sources.json`, `docs/diagrams/*.mmd`, y `.docs/sql/*.sql` (leídos por `scripts/capas-*.mjs`).

## 2. Destino propuesto

Fuente única: **`docs/wiki/`**, publicable en la Wiki de GitHub.

```
README.md  CHANGELOG.md  CLAUDE.md  AGENTS.md  CONTRIBUTING.md     ← raíz, se conservan
docs/
├── README.md                    índice: dónde vive cada cosa
├── wiki/                        el manual vigente («cómo funciona Nexus hoy»)
│   ├── Home.md  _Sidebar.md
│   ├── 01-inicio/               qué es Nexus, instalación, primer día
│   ├── 02-producto/             visión, capacidades, rubros, hoja de ruta
│   ├── 03-arquitectura/         9 áreas de lib/, reglas de dependencias, diagramas
│   ├── 04-modulos/              módulos + capas/ (las 11 capas, 70 subcapas)
│   ├── 05-datos-y-base-de-datos/  Prisma, tenancy, dinero, borrado, borradores SQL
│   ├── 06-seguridad-y-permisos/   auth, RBAC, aislamiento por negocio
│   ├── 07-integraciones/        API/MCP/webhooks, pagos, DIAN, n8n
│   ├── 08-operacion-y-despliegue/ entornos, Clerk, prod-sql, backups
│   ├── 09-desarrollo/           convenciones, nueva funcionalidad, equipo de ingeniería
│   ├── 10-pruebas-y-calidad/    unitarias, integración, E2E, arquitectura
│   ├── 11-glosario/
│   └── assets/                  imágenes y diagramas Mermaid
├── decisions/                   ADR unificados y numerados (un solo sistema)
├── internal/                    auditorías y estado; historico/ = informes fechados
└── (archivos de máquina que no se mueven: architecture/layers.json, prod-sql/*.sql, …)
```

**No se mueven (decisión tuya):** `DESIGN.md`, `PRODUCT.md`, `REDISENO-NEXUS.md`, `docs/design/`, `docs/brand/`, `packages/brand/`, `components/docs/*.mdx` (Storybook). Se estructurarán después con el sistema de diseño. `docs/marketing/` (5) queda también diferido por ser adyacente a la marca; es una decisión abierta (§5).

## 3. Resultado del mapa

| Acción | Archivos | Significado |
|---|---|---|
| mover | 150 | A su sección de la wiki (90 son las capas, con su estructura) o a `docs/decisions/` |
| fusionar | 5 | Varios documentos pre-V10 se reescriben en uno, contra el código actual |
| revisar | 13 | Leer y decidir vigencia antes de trasladar (ideas, pendientes, producto) |
| archivar | 62 | A `docs/internal/historico/`, con un índice; no entran en la wiki |
| eliminar | 10 | Motor Python retirado (9) y `docs/guias/README.md` (lo reemplaza el índice) |
| diferido | 28 | Marca y diseño: no se tocan |
| conservar | 7 | Raíz, plantilla de PR y README de Prisma |

## 4. Plan por fases (cada una = un commit verificado)

1. **Esqueleto:** `docs/wiki/` con `Home`, `_Sidebar` e índices vacíos de sección; `docs/README.md`. Prueba que falle si hay un `.md` huérfano fuera de las zonas permitidas.
2. **Mover lo vigente** con `git mv` y un script que reescribe los enlaces relativos (falla si un destino no existe), más las 29 citas en comentarios y los 13 archivos de código/config. Incluye las capas.
3. **Archivar y eliminar** (histórico con índice; motor Python fuera).
4. **Reescribir lo que miente:** arquitectura pre-V10 → páginas nuevas de `03-arquitectura` y `04-modulos` contra el código actual; una sola hoja de ruta; ADR unificados. Aquí entran las imágenes (diagramas Mermaid incrustados) y los fragmentos de código.
5. **Mantenimiento:** prueba de arquitectura que valida enlaces rotos, y una regla en la plantilla de PR («¿cambia la estructura? actualiza la wiki»). Script `scripts/wiki-sync.mjs` que publica `docs/wiki/` en el repositorio de la Wiki de GitHub (sin automatizar en CI hasta probar permisos; el token de `gh` no sube workflows).
6. **CLAUDE.md** reducido a reglas esenciales y enlace a la wiki.

Controles: antes/después, recuento de enlaces resueltos = 100 %, `pnpm verify` verde, `check:layers` intacto, ningún archivo de máquina movido.

## 5. Decisiones abiertas

1. `docs/marketing/` (5 archivos): ¿se queda con marca y diseño o entra en `02-producto`?
2. `layers.json` y `exceptions.json`: se dejan en `docs/architecture/` (cero riesgo, recomendado) o se mueven y se actualizan ~25 pruebas.
3. Motor Python (`docs/ingenieria/archivo/`): ¿eliminar (queda en git) o archivar?
4. Los 62 informes históricos: ¿`docs/internal/historico/` (recomendado) o eliminarlos también?
