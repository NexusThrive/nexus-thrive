# Estructura del repositorio

## Alcance

Mapa del monolito Next.js y de sus fuentes responsables, actualizado durante la consolidación documental del 16 de noviembre de 2026.

```text
nexus-thrive/
├── app/          Rutas App Router, acciones de servidor y adaptadores HTTP
├── components/   Componentes de interfaz
├── lib/          Implementación en nueve áreas V10
├── prisma/       Contrato por dominio y cliente de datos
├── migrations/   Historial de migraciones del proyecto
├── tests/        Unitarias, integración, arquitectura y fixtures
├── e2e/          Pruebas de navegador
├── scripts/      Verificadores y utilidades
├── docs/         Índice principal y diez secciones numeradas
├── packages/     Paquete operativo de marca y diseño
├── plugins/      Agentes y skills de product-team
├── public/       Recursos estáticos
└── eslint/       Reglas propias
```

| Tema | Ubicación | Fuente responsable |
| --- | --- | --- |
| Rutas y adaptadores | app/ | [Reglas de seguridad](../06-reglas/autenticacion-permisos-y-aislamiento.md) |
| Componentes y Storybook | components/ y packages/brand/docs/storybook/ | [Experiencia](../03-experiencia/README.md) |
| Lógica del monolito | lib/foundation, core, business, domains, integrations, industry, platform, experience y runtime | [Mapa de módulos](dominios/mapa-de-areas-y-modulos.md) y [dependencias](../06-reglas/reglas-dependencias.md) |
| Datos y migraciones | prisma/schema/, prisma/db.ts y migrations/ | [Modelo de datos](modelo-de-datos/README.md) |
| Verificación | tests/, e2e/ y scripts/ | [Pruebas](../07-ingenieria/testing.md) |
| Controles de arquitectura | docs/02-arquitectura/controles/ | [Controles](controles/README.md) |
| SQL de producción y diagnóstico | docs/08-operaciones/ | [Operaciones](../08-operaciones/README.md) |
| Documentación | docs/README.md y 00-identidad hasta 09-historico | [Índice principal](../README.md) |
| Equipo de ingeniería | plugins/product-team/ | [Equipo](../07-ingenieria/equipo-ingenieria.md) |

## Entradas de la raíz

README.md presenta el producto; CONTRIBUTING.md y AGENTS.md orientan contribuciones y agentes; CLAUDE.md conserva instrucciones de ese cliente; CHANGELOG.md registra versiones. La marca, PRODUCT.md y DESIGN.md viven en packages/brand/docs, enlazados desde experiencia, sin copias en la raíz.

El contenido generado, las dependencias instaladas y los respaldos locales se rigen por .gitignore. Los secretos reales no deben incorporarse a nuevos commits.
