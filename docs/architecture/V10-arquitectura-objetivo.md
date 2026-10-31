# Arquitectura V10 de Nexus Thrive

## Por qué elegimos esta estructura y cómo permite escalar la plataforma

Estado: **documento de referencia** (2026-10-31). Describe la estructura a la que llega V10 y por qué se eligió. Qué parte ya está hecha y qué falta está en la §10; el plan para terminar, en [`V10-plan-de-cierre.md`](V10-plan-de-cierre.md). El diseño técnico detallado (reglas, matriz de dependencias, etapas M0–M8) sigue en [`V10-arquitectura-fisica.md`](V10-arquitectura-fisica.md) y las decisiones en [`V10-decisiones.md`](V10-decisiones.md).

---

## 1. Introducción

Nexus Thrive busca convertirse en un ecosistema tecnológico capaz de conectar la operación, los clientes, las finanzas y los procesos de diferentes tipos de negocios.

Para alcanzar esa visión no basta con desarrollar funcionalidades. También necesitamos una arquitectura que permita mantenerlas, ampliarlas y conectarlas sin que el crecimiento del producto provoque dependencias descontroladas.

Por esta razón se diseñó la arquitectura V10: una organización modular basada en responsabilidades, límites de dependencia y separación de conocimientos. Su propósito es establecer una base tecnológica que permita que Nexus crezca progresivamente, incorporando nuevas capacidades sin tener que reorganizar constantemente todo el sistema.

**La decisión principal fue organizar el código por responsabilidad arquitectónica y no solamente por tipo de archivo, tecnología o sector económico.**

---

## 2. ¿Por qué se escogió esta estructura?

La arquitectura anterior tenía responsabilidades distribuidas entre diferentes directorios. Algunas funcionalidades estaban separadas aunque dependían estrechamente entre sí, mientras que otras compartían carpetas a pesar de tener propósitos distintos. Esto podía generar varios problemas:

- Dificultad para identificar dónde debe desarrollarse una nueva funcionalidad.
- Dependencias entre módulos que deberían ser independientes.
- Conocimiento de sectores económicos disperso por diferentes partes del sistema.
- Dificultad para incorporar nuevas integraciones.
- Riesgo de que un cambio pequeño termine afectando funcionalidades no relacionadas.
- Mayor complejidad al mantener y probar el sistema.

Ejemplos reales que V10 ya corrigió: `lib/ops` y `lib/admin` mezclaban la operación interna de Nexus con funciones de los negocios (hoy son `lib/platform`); `lib/finance` reunía código puro, ayudas de pantalla y reglas contables bajo un solo nombre (hoy son `foundation/kernel`, `payment-input` y `domains/finance`); y el registro de puertos y sectores se hacía desde varios sitios (hoy solo `lib/runtime`).

V10 busca solucionar estos problemas mediante **nueve áreas arquitectónicas**. La estructura no pretende imponer una cantidad fija de módulos: las áreas establecen límites y responsabilidades; dentro de ellas, los módulos pueden crecer, dividirse, combinarse o evolucionar según las necesidades reales del producto.

---

## 3. Las nueve áreas

### 3.1. Foundation — Fundamentos

**Responsabilidad:** componentes fundamentales independientes de las reglas particulares de Nexus.

Contiene funciones reutilizables, utilidades puras, formatos, fechas, cantidades y mecanismos básicos. Ejemplos: el kernel financiero (vocabulario de pagos, series, antigüedad de cartera, análisis de montos), el formateo, las fechas de Bogotá, los errores y transacciones de base de datos, los límites.

**¿Por qué existe?** Porque las funcionalidades superiores necesitan fundamentos comunes sin obligar a que estos conozcan los módulos que los utilizan. Foundation no depende de ninguna otra área ni de la lógica de negocio.

### 3.2. Core — Núcleo de Nexus

**Responsabilidad:** las capacidades que permiten funcionar a la plataforma.

Incluye tenancy (organizaciones y alta), autenticación y autorización, auditoría, terceros (`parties`), archivos, sectores (sin código), capacidades y módulos, entitlements (planes y uso), eventos, operaciones, y la API y el MCP.

**¿Por qué existe?** Porque hay conceptos que deben ser compartidos por toda la plataforma. Un sistema de permisos no debería implementarse de manera distinta para cada sector: debe existir una base común que todos los módulos puedan utilizar. Core no conoce sectores específicos ni importa Business, Domains ni Platform.

### 3.3. Business — Capacidades empresariales

**Responsabilidad:** las funcionalidades operativas que los negocios utilizan para administrar sus actividades.

Incluye clientes, catálogo, ventas (documentos y dinero), agendamiento, inventario, compras, POS, tienda, intercambio de datos, crecimiento y presencia.

**¿Por qué existe?** Porque Nexus no debe construirse como un conjunto de aplicaciones independientes para cada industria. Un gimnasio, un restaurante y una empresa comercial necesitan clientes, ventas, inventario y administración. Business permite reutilizar esas capacidades sin duplicarlas por sector. Nunca importa Industry, Domains ni Integrations; habla con ellos por puertos.

### 3.4. Domains — Dominios especializados

**Responsabilidad:** áreas funcionales especializadas con reglas y complejidad propias.

El primer dominio organizado es **Finance**: `accounting`, `tax`, `receivables` y `payments`.

**¿Por qué existe?** Porque algunos dominios tienen suficiente complejidad y relaciones internas como para necesitar una organización propia. Esto evita que toda la lógica especializada termine acumulada dentro de Business o Core. Dentro de una familia los módulos se importan directamente; entre familias solo por contrato.

### 3.5. Integrations — Integraciones externas

**Responsabilidad:** conectar Nexus con proveedores, servicios y plataformas externas.

Incluye `providers` (pasarelas y mensajería), facturación electrónica (`einvoice`), Google y Maps. Implementan los puertos que Core y Business declaran.

**¿Por qué existe?** Porque los servicios externos pueden cambiar, desaparecer o ser sustituidos. Separar las integraciones permite que las funcionalidades de Nexus dependan menos de un proveedor específico: cambiar de pasarela de pagos no debería obligar a reconstruir las ventas.

*Nota:* hoy `lib/api` y `lib/mcp` están clasificadas aquí, pero solo dependen de Core y Foundation (medido); V10 las lleva a `core/api`, porque son la superficie pública de las operaciones y no un proveedor externo.

### 3.6. Industry — Adaptaciones por sector

**Responsabilidad:** las particularidades operativas de cada industria.

Hoy: `gym` y `museum` (ya bajo `industry/`) y `construction` (en `lib/construction`, pendiente de moverse). `restaurant` nace cuando se implemente, no antes.

**¿Por qué existe?** Porque los negocios comparten capacidades, pero no trabajan igual. Un gimnasio administra membresías; un museo, visitantes y actividades; una constructora, proyectos y presupuestos. Industry incorpora esas diferencias sin contaminar los módulos compartidos. Un sector no importa a otro, y nadie lo importa salvo `runtime` y `experience`.

### 3.7. Platform — Administración de Nexus

**Responsabilidad:** los servicios internos con los que se opera y administra Nexus como plataforma.

Incluye `admin`, `billing`, `support`, `crm`, `inbox`, `team`, `accounts`, `presence` y `benefits`.

**¿Por qué existe?** Porque Nexus también necesita administrar su propio ecosistema. Lo que usa el equipo que opera Nexus no debe confundirse con lo que usan los negocios clientes. Ningún módulo de `lib/` fuera de Platform, Experience y Runtime lo importa.

*Nota sobre el nombre `presence`:* existe `business/presence` (lo que cada negocio ve de su presencia digital) y `platform/presence` (la vista del Operations Center sobre esa misma función). Son dos lados de una misma función en áreas distintas, no un duplicado.

### 3.8. Experience — Experiencia e interfaces

**Responsabilidad:** la interacción y presentación del sistema.

Incluye navegación, dashboard, onboarding (el flujo y sus componentes), sitio, movimiento, hooks, fuentes y las ayudas de captura de pagos (`payment-input`). Las páginas de `app/` y los componentes de `components/` pertenecen a esta área.

**¿Por qué existe?** Porque la presentación de una funcionalidad no debe determinar dónde vive su lógica de negocio. Se pueden cambiar interfaces y navegación sin alterar las reglas internas de los módulos. Experience puede importar casi todo (salvo `runtime`), pero no contiene reglas de negocio propias.

### 3.9. Runtime — Composición y ejecución

**Responsabilidad:** conectar los componentes y registrar las implementaciones necesarias para ejecutar el sistema.

Contiene `ports.ts` (conecta cada puerto con su implementación), `operations.ts` (registro de operaciones), `sectors.ts` (registro de sectores) y `api-deps.ts`.

**¿Por qué existe?** Porque necesitamos un lugar controlado donde se conecten las dependencias. Los módulos definen sus responsabilidades y contratos; Runtime conecta las implementaciones. Así ningún módulo construye por su cuenta sus conexiones con el resto. Solo lo importan los puntos de entrada y las pruebas.

---

## 4. ¿Cómo se relacionan las áreas?

La arquitectura establece límites para que las dependencias no se conviertan en una red descontrolada. Principios:

1. Foundation no depende de ninguna otra área de Nexus.
2. Core da capacidades comunes sin conocer sectores específicos.
3. Business implementa capacidades reutilizables.
4. Domains contiene especializaciones con reglas propias.
5. Integrations encapsula conexiones externas.
6. Industry adapta las capacidades a cada sector.
7. Platform administra el ecosistema Nexus.
8. Experience organiza la presentación e interacción.
9. Runtime conecta las implementaciones y registra los componentes.

**No significa que todas las áreas puedan importar libremente de las demás.** Las dependencias permitidas están en `docs/architecture/layers.json` (matriz de `mayImport`) y las comprueba `pnpm check:layers` en cada verificación. Hoy el verificador escanea `lib/`; las páginas de `app/` quedan fuera de su alcance y se vigilan con pruebas puntuales (por ejemplo, la lista cerrada de referencias de los negocios a `platform`).

| Área | Puede importar |
|---|---|
| Foundation | nada |
| Core | Foundation |
| Business | Foundation, Core |
| Domains | Foundation, Core, Business |
| Integrations | Foundation, Core, Business, Domains |
| Industry | Foundation, Core, Business, Domains, Integrations (y a sí misma) |
| Platform | Foundation, Core, Business, Domains, Integrations |
| Experience | todas excepto Runtime |
| Runtime | todas |

---

## 5. ¿Por qué esta arquitectura es escalable?

La escalabilidad de V10 no depende únicamente de que el servidor procese más solicitudes. También depende de que el producto pueda incorporar funcionalidades, sectores, integraciones y personas sin incrementar descontroladamente la complejidad.

- **Funcional:** un módulo nuevo (por ejemplo, reservas) reutiliza clientes, calendario y capacidades compartidas en lugar de crear su propio sistema de clientes.
- **Por sectores:** al incorporar restaurantes, sus procesos particulares viven en `industry/restaurant`, reutilizando Business para clientes, ventas e inventario. Agregar un sector toca el sector y una línea en `runtime/sectors.ts`.
- **De integraciones:** un proveedor nuevo implementa un puerto existente y se conecta con una línea en `runtime/ports.ts`.
- **Del equipo:** una persona puede trabajar en inventario, otra en facturación y otra en integraciones, respetando contratos y límites, sin conocer todo el sistema.
- **De mantenimiento:** los cambios tienen un alcance identificable, las pruebas se concentran en módulos concretos, las dependencias se verifican automáticamente y los errores son más fáciles de localizar.
- **Tecnológica:** Nexus puede seguir siendo un monolito modular mientras convenga y separar servicios más adelante si hay una necesidad real.

**Escalar no significa crear microservicios desde el principio. Significa conservar la capacidad de evolucionar sin quedar atrapados por las decisiones iniciales.**

---

## 6. Una arquitectura abierta a la evolución

V10 no fija el número de módulos. Un módulo puede crecer, dividirse, combinarse, cambiar de área si cambia su responsabilidad, o retirarse. Esas decisiones deben responder a necesidades reales y no a una búsqueda estética de carpetas.

**Reglas de estilo que se mantienen:**

- No se crean directorios vacíos para funcionalidades que todavía no existen.
- No se crea una carpeta para un solo archivo salvo que haya una razón; con tres o más archivos relacionados, sí.
- La profundidad normal es `lib/<área>/<módulo>/<archivo>`; cuatro niveles solo en una familia como `domains/finance` o en un módulo que lo justifique.

---

## 7. ¿Por qué no construir una aplicación diferente para cada industria?

Porque eso generaría duplicación y dificultaría el mantenimiento. Si cada sector tuviera su propia implementación de clientes, ventas, inventario, permisos y usuarios, cualquier mejora tendría que repetirse en múltiples lugares.

V10 propone otra estrategia: **una plataforma común, capacidades reutilizables y adaptaciones específicas por sector.**

---

## 8. Resultado que buscamos

Al completar la consolidación de V10, Nexus debería contar con:

- Nueve áreas arquitectónicas con responsabilidades definidas.
- Módulos organizados por responsabilidad.
- Dependencias controladas y verificadas.
- Una separación clara entre plataforma, operación empresarial y experiencia.
- Sectores independientes de los módulos compartidos.
- Integraciones desacopladas mediante contratos.
- Un punto central de composición.
- Una estructura preparada para incorporar nuevas capacidades.

**La arquitectura debe facilitar el desarrollo del producto, no convertirse en un objetivo independiente.** Una vez terminada V10 dejamos de mover carpetas por motivos estéticos y nos concentramos en construir funcionalidades.

---

## 9. Conclusión

Elegimos V10 porque Nexus necesita una arquitectura que pueda acompañar su crecimiento desde una plataforma pequeña hasta un ecosistema empresarial con múltiples módulos, sectores e integraciones. No buscamos tener la mayor cantidad de carpetas, crear abstracciones innecesarias ni anticipar funcionalidades que todavía no existen. Buscamos límites claros, capacidades reutilizables, menos dependencias, y que cada parte evolucione sin comprometer a las demás.

Una sola plataforma. Múltiples capacidades. Diferentes industrias. Una arquitectura preparada para evolucionar.

**Nexus Thrive: Tu negocio. Un solo sistema.**

---

## 10. Estructura destino y estado actual

La estructura destino (propuesta del dueño, con los ajustes que se explican en [`V10-plan-de-cierre.md`](V10-plan-de-cierre.md) §5):

```
lib/
├── foundation/     kernel/ · dates/ · db/ · format · qr · rate-limit · ports …
├── core/           tenancy/ · auth/ · audit/ · parties/ · files/ · sectors/ · capabilities/
│                   entitlements/ · events/ · operations/ · api/
├── business/       customers/ · catalog/ · sales/ · scheduling/ · inventory/ · purchasing/
│                   pos/ · store/ · data-exchange/ · growth/ · presence/
├── domains/
│   └── finance/    accounting/ · tax/ · receivables/ · payments/
├── integrations/   providers/ · einvoice/ · google/ · maps/
├── industry/       gym/ · museum/ · construction/        (restaurant/ cuando exista)
├── platform/       admin/ · billing/ · support/ · crm/ · inbox/ · team/ · accounts/ · presence/ · benefits/
├── experience/     navigation/ · dashboard/ · onboarding/ · site/ · motion/ · hooks/ · payment-input/ · fonts
└── runtime/        ports.ts · operations.ts · sectors.ts · api-deps.ts
```

| Área | Estado (2026-10-31) |
|---|---|
| `runtime` | **Hecho** (M1) |
| `platform` | **Hecho** (M4: 9 módulos) |
| `domains` | **Hecho** (M5: `finance` con 4 módulos) |
| `business` | **Parcial.** Hechos `customers`, `catalog`, `sales`, `scheduling` (M3). Siguen en la raíz de `lib/`: `inventory`, `purchasing`, `pos`, `store`, `data-exchange`, `growth`, `presence` |
| `foundation` | **Parcial.** Hechos `kernel/` (M5), `countries`, `limits`. Siguen sueltos en la raíz: 16 archivos de producción (`format`, `plain-date`, `ports`, `qr`…) más `temporal.d.ts` |
| `core` | **Parcial.** Hecho `sectors/` (M2). Siguen en la raíz: `tenant`, `auth`, `plans`, `usage`, `events`, `operations`, `capabilities`, `functions`, `parties`, `files`; y `api`/`mcp` figuran como Integrations |
| `integrations` | **Clasificada, sin mover:** `providers`, `einvoice`, `google`, `maps` siguen en la raíz |
| `experience` | **Clasificada, sin mover:** `navigation`, `dashboard`, `onboarding`, `site`, `motion`, `hooks`, `payment-input`, `fonts` siguen en la raíz |
| `industry` | **Parcial.** `gym` y `museum` hechos; `construction` (39 archivos de producción) sigue en `lib/construction` |

Hoy `lib/` tiene **63 entradas en su raíz** (42 carpetas y 21 archivos sueltos); la meta es que contenga **solo las nueve áreas** (con las dos excepciones documentadas en el plan de cierre).
