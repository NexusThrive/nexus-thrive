# Glosario

| Término | Significado en Nexus |
|---|---|
| **Negocio / tenant** | La empresa cliente. Todo dato de negocio lleva su `tenantId`. |
| **Slug** | La dirección corta del negocio en la URL (`/{slug}/…`). |
| **Membresía** | Relación persona–negocio con un rol. No es la membresía de un gimnasio. |
| **Socio / cliente (`Customer`)** | Persona o empresa que compra o se inscribe en un negocio; se enlaza al tercero único. |
| **Tercero (`Party`)** | Persona o empresa única que puede tener varios roles (cliente, proveedor, empleado). |
| **Rubro / vertical / industria** | Tipo de negocio (construcción, gimnasio, museo, turismo). Es un perfil sobre un sistema único, no una frontera. |
| **Área** | Una de las nueve carpetas de `lib/`: `foundation`, `core`, `business`, `domains`, `integrations`, `industry`, `platform`, `experience`, `runtime`. |
| **Capa (de producto)** | Una de las 11 capas de capacidades de la guía de construcción, con 70 subcapas y escalera de madurez N0–N6. No confundir con las áreas de `lib/`. |
| **Contrato (Prisma)** | El modelo de datos escrito en `prisma/schema/**/*.prisma` y su versión compilada (`contract.json`). |
| **Operación** | Acción de negocio declarada una vez (módulo, permiso, esquema, riesgo, eventos) de la que salen pantalla, API y herramienta MCP. |
| **MCP** | Protocolo por el que un agente de IA usa las operaciones de Nexus como herramientas. |
| **Puerto / adaptador** | Interfaz que un módulo declara para algo que no puede importar (pagos, DIAN, WhatsApp) y su implementación concreta. |
| **`money-service`** | Único servicio que mueve dinero; transaccional y probado con concurrencia. |
| **APU** | Análisis de precios unitarios del módulo de construcción. |
| **AIU** | Administración, imprevistos y utilidad: porcentajes del presupuesto de obra. |
| **Lean / Last Planner** | Método de planificación semanal del módulo de construcción. |
| **ADR** | Registro de una decisión técnica (qué, por qué, alternativas, consecuencias). |
| **Steward** | Agente que mantiene el estado de las capas con evidencia. |
| **N0–N6** | Escalera de madurez de cada subcapa, de «descrita» a «operando». |
