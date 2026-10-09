---
id: IX
titulo: "INTELIGENCIA DE NEGOCIO, ANALÍTICA E IA"
type: capa
subcapas: 6
created: 2026-10-08
updated: 2026-10-08
tags: [capas, estructura, capa]
---

# IX. INTELIGENCIA DE NEGOCIO, ANALÍTICA E IA

> Capa **IX** con **6 subcapas**. Cada subcapa tiene su escalera de madurez N0–N6; los diagramas se derivan de estos README (nodo = nivel, enlaces = integraciones).

## Núcleo compartido (base de la capa)

* **Capa de datos unificada**: una vista consolidada de ventas, reservas, pagos, clientes, tareas, nómina e inventario, separada de la base operativa para que los reportes pesados no frenen la app (réplica de lectura o almacén analítico).
* **Modelo semántico / catálogo de métricas**: una sola definición de “venta”, “cliente activo”, “ocupación” o “margen”. Si cada dashboard calcula “venta” a su manera, los números nunca coinciden.
* **Eventos y cronología del cliente**: cada interacción, compra o ticket queda como evento con fecha, canal y origen.
* **Aislamiento multi-tenant**: cada negocio ve solo sus datos; el SuperAdmin ve agregados sin mezclar información de clientes.
* **Permisos sobre datos**: quién ve qué métrica, qué sede y qué columnas (el margen y los salarios son permisos aparte).
* **Calidad de datos**: validaciones, deduplicación de clientes y marcas de “dato incompleto”.
* **Motor de notificaciones** compartido con las otras capas (WhatsApp, correo, app).
* **Registro inmutable de eventos del sistema**, que alimenta la bitácora de auditoría.

## Subcapas

| id | Subcapa | Escalera |
| --- | --- | --- |
| IX.00 | [Dashboards y analítica operativa](00-Dashboards-y-Analitica-Operativa/README.md) | N0 · N1 · N2 · N3 · N4 · N5 · N6 |
| IX.01 | [Modelo semántico y catálogo de métricas](01-Modelo-Semantico-y-Catalogo-de-Metricas/README.md) | N0 · N1 · N2 · N3 · N4 · N5 · N6 |
| IX.02 | [Analítica de clientes y comportamiento comercial](02-Analitica-de-Clientes-y-Comportamiento-Comercial/README.md) | N0 · N1 · N2 · N3 · N4 · N5 · N6 |
| IX.03 | [Reportes automáticos y resúmenes ejecutivos](03-Reportes-Automaticos-y-Resumenes-Ejecutivos/README.md) | N0 · N1 · N2 · N3 · N4 · N5 · N6 |
| IX.04 | [Copiloto de inteligencia artificial](04-Copiloto-de-Inteligencia-Artificial/README.md) | N0 · N1 · N2 · N3 · N4 · N5 · N6 |
| IX.05 | [Detección de anomalías y alertas tempranas](05-Deteccion-de-Anomalias-y-Alertas-Tempranas/README.md) | N0 · N1 · N2 · N3 · N4 · N5 · N6 |

## Integraciones de esta capa

| Área | Integraciones típicas |
| --- | --- |
| Datos y BI | Postgres con réplica de lectura, BigQuery, ClickHouse, dbt, Metabase, Looker Studio, Power BI |
| Entrega de reportes | WhatsApp Cloud API, correo (Resend, SendGrid), notificaciones push |
| Marketing y anuncios | Meta Ads, Google Ads, GA4, Search Console (para CAC y atribución) |
| IA | Claude, OpenAI, almacenes de vectores (pgvector), voz a texto |
| Seguridad y registro | SIEM (Datadog, Splunk, Elastic), almacenamiento WORM (S3 Object Lock), Sentry |
| Monitoreo | Uptime, métricas de infraestructura, alertas de costos |
| Contabilidad | Siigo, Alegra, World Office (conciliación de cifras) |
| Interno | Todas las capas anteriores: CRM, ventas, pagos, reservas, operación, personas |

## Cosas críticas que se suelen olvidar

* **Los números deben cuadrar con los de los módulos**: si el dashboard dice una venta distinta a la del módulo de ventas, nadie volverá a confiar. Define las métricas una sola vez y pruébalas contra casos reales.
* **No hagas analítica sobre la base operativa**: los reportes pesados la ralentizan. Usa una réplica de lectura o precálculos desde el principio.
* **Atribución desde el primer contacto**: si no guardaste el origen del cliente cuando llegó, el CAC y la rentabilidad por canal no se pueden reconstruir después.
* **LTV y CAC sin costos completos engañan**: un canal puede parecer barato y dejar clientes poco rentables. Incluye comisiones de canal, descuentos y costos de atención.
* **Tamaño de muestra**: un negocio pequeño con 40 clientes no tiene datos para predicciones; muestra tendencias simples y evita modelos que aparenten una precisión que no existe.
* **La IA puede equivocarse con números**: haz que calcule con consultas reales a la base (no que “adivine”), muestra la fuente de cada cifra y permite ver el detalle. Una respuesta incorrecta sobre ventas o caja destruye la confianza.
* **La IA respeta permisos**: un empleado que pregunta “¿cuánto gana el gerente?” no debe recibir respuesta. Los permisos se aplican a los datos antes de que lleguen al modelo.
* **Privacidad de los datos enviados a modelos externos**: define qué sale de tu infraestructura, con qué contrato de proveedor y con qué minimización (habeas data). Evita enviar datos sensibles innecesarios.
* **Fatiga de alertas**: demasiadas alertas se ignoran todas. Empieza con pocas, de alto valor, y mide cuántas se atienden.
* **Anomalía no es fraude**: una alerta es una pregunta, no una acusación. Redacta los avisos con cuidado, sobre todo los que involucran a empleados.
* **Bitácora que no se puede alterar**: si cualquier administrador puede borrar el registro, no sirve para auditoría. Hazla de solo escritura desde el diseño.
* **Costo de almacenamiento y retención**: la bitácora y los eventos crecen sin parar. Define políticas de retención y archivo por tipo de dato.
* **Reportes por WhatsApp tienen costo y reglas**: usan plantillas aprobadas y ventanas de conversación; decide quién asume el costo y respeta el consentimiento.
* **Datos de varios negocios**: los benchmarks entre clientes solo funcionan con datos anonimizados y agregados, con consentimiento expreso en los términos de la plataforma.
* **Zona horaria y corte de día**: “ventas de hoy” depende de la zona horaria del negocio y del cierre de caja. Un error ahí rompe la confianza en todo.

## Qué lanzaría primero

1. **Núcleo: eventos limpios, catálogo de métricas y bitácora de auditoría básica** (se hace desde el inicio; después cuesta mucho).
2. **Dashboard de inicio por negocio** con 8 a 10 KPI bien definidos y comparación con el periodo anterior.
3. **Resumen diario por WhatsApp o correo al dueño**: es el primer “wow” y es poco esfuerzo.
4. **Alertas por reglas simples** (caja baja, pagos vencidos, leads sin respuesta, stock mínimo).
5. **Dashboards por vertical** (hotel, gimnasio, turismo, construcción).
6. **Asistente de IA para consultas** sobre ventas, reservas y caja, con permisos, solo lectura y mostrando la fuente de cada cifra.
7. **Analítica de clientes**: origen, recompra, RFM y rentabilidad por canal (LTV y CAC cuando ya tengas datos de inversión).
8. **Bitácora completa con valores anteriores y nuevos, y vista para auditor.**
9. **Constructor de reportes y detección de anomalías** (gastos duplicados, descuentos atípicos, anulaciones).
10. **Agentes de IA con acciones, modelos predictivos, benchmarks entre negocios y certificaciones de seguridad**, cuando haya volumen de datos y clientes que lo justifiquen.

---

_Fuente: `DesordenadoCapas.md` (capa `Datos`) + `EstructuraCapasImplementacion.md`._