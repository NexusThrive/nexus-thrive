---
id: VIII
titulo: "TALENTO HUMANO Y ADMINISTRACIÓN DEL EQUIPO"
type: capa
subcapas: 8
created: 2026-10-08
updated: 2026-10-08
tags: [capas, estructura, capa]
---

# VIII. TALENTO HUMANO Y ADMINISTRACIÓN DEL EQUIPO

> Capa **VIII** con **8 subcapas**. Cada subcapa tiene su escalera de madurez N0–N6; los diagramas se derivan de estos README (nodo = nivel, enlaces = integraciones).

## Núcleo compartido (base de la capa)

* **Ficha única del empleado**: datos personales, documentos, contrato vigente, cargo, sede, jefe directo, banco, EPS, pensión, caja de compensación y cesantías. Es un tercero más del núcleo, con el rol “empleado”.
* **Estructura organizacional**: negocios, sedes, áreas, cargos, equipos y jerarquía (quién reporta a quién).
* **Historial laboral**: ingreso, cambios de cargo y salario, novedades, sanciones, retiro. Nada se borra.
* **Calendario laboral**: festivos, turnos, vacaciones, incapacidades y permisos en una sola vista.
* **Roles y permisos finos**: el jefe ve a su equipo, RR. HH. ve todo, el empleado ve lo suyo, y **el salario es un permiso aparte**.
* **Portal del empleado** (autogestión) y app móvil.
* **Datos sensibles protegidos**: cifrado, acceso auditado y consentimiento (habeas data, Ley 1581); la biometría y la salud son datos sensibles.
* **Notificaciones** por WhatsApp, correo y app, y **bitácora de auditoría** de cada cambio.
* **Conexión con finanzas, caja, proyectos, obra y reservas**: el costo de personal se carga a la obra, sede o centro de costo.

## Subcapas

| id | Subcapa | Escalera |
| --- | --- | --- |
| VIII.00 | [Expediente del empleado y contratos](00-Expediente-del-Empleado-y-Contratos/README.md) | N0 · N1 · N2 · N3 · N4 · N5 · N6 |
| VIII.01 | [Reclutamiento y selección](01-Reclutamiento-y-Seleccion/README.md) | N0 · N1 · N2 · N3 · N4 · N5 · N6 |
| VIII.02 | [Asistencia, horarios y turnos](02-Asistencia-Horarios-y-Turnos/README.md) | N0 · N1 · N2 · N3 · N4 · N5 · N6 |
| VIII.03 | [Nómina electrónica y prestaciones sociales](03-Nomina-Electronica-y-Prestaciones-Sociales/README.md) | N0 · N1 · N2 · N3 · N4 · N5 · N6 |
| VIII.04 | [Portal del empleado y autogestión](04-Portal-del-Empleado-y-Autogestion/README.md) | N0 · N1 · N2 · N3 · N4 · N5 · N6 |
| VIII.05 | [Formación, inducción y certificaciones](05-Formacion-Induccion-y-Certificaciones/README.md) | N0 · N1 · N2 · N3 · N4 · N5 · N6 |
| VIII.06 | [Comunicación interna del equipo](06-Comunicacion-Interna-del-Equipo/README.md) | N0 · N1 · N2 · N3 · N4 · N5 · N6 |
| VIII.07 | [Evaluación de desempeño y compensación laboral](07-Evaluacion-de-Desempeno-y-Compensacion-Laboral/README.md) | N0 · N1 · N2 · N3 · N4 · N5 · N6 |

## Integraciones de esta capa

| Área | Integraciones típicas |
| --- | --- |
| Nómina y DIAN | Proveedor tecnológico de nómina electrónica (Alegra, Siigo, Factus, Dataico), operadores PILA (Aportes en Línea, Mi Planilla, SOI) |
| Contabilidad | Siigo, Alegra, World Office |
| Bancos | Archivos de dispersión (Bancolombia, Davivienda, otros) y pagos por API |
| Reloj y acceso | Lectores biométricos (ZKTeco, Hikvision), cerraduras inteligentes, QR |
| Mapas | Google Maps (geocercas) |
| Selección | Computrabajo, Indeed, LinkedIn, Magneto, correo y WhatsApp |
| Videollamada | Meet, Zoom, Teams |
| Capacitación | Contenido propio, YouTube/Vimeo (privado), SCORM, certificados verificables |
| Comunicación | WhatsApp Cloud API, Slack, Teams, correo, notificaciones push |
| Firma | Certicámara, Olimpia, firma propia con evidencia |
| IA | Claude, OpenAI, voz a texto |
| Interno | CRM, ventas, reservas, obra, proyectos, finanzas, caja menor, documentos |

## Cosas críticas que se suelen olvidar

* **La nómina es riesgo legal puro**: un error en prestaciones, aportes o retención genera reclamaciones y sanciones. Valora **integrar un proveedor** (Siigo, Alegra, Factus) en vez de construirla desde cero, o ponla como módulo premium con validación de un contador.
* **La ley laboral cambia**: la reforma laboral reciente movió recargos nocturnos y dominicales, y el salario mínimo cambia cada año. Haz que las reglas sean **parámetros editables con vigencia**, no código fijo, y verifícalas con un abogado laboral o contador.
* **Datos sensibles**: huella, rostro, salud, sindicato y datos de menores o familiares exigen consentimiento explícito, finalidad clara y seguridad reforzada (Ley 1581). Minimiza lo que guardas.
* **Biometría y geolocalización**: informa al empleado qué se mide y cuándo; rastrear fuera del horario laboral es un problema legal y de confianza.
* **Salario como permiso aparte**: un jefe de sede no debería ver el salario de su par ni el de su superior. Es de lo primero que genera conflictos si se hace mal.
* **Retención de datos**: define cuánto tiempo se conservan hojas de vida, contratos, nóminas y registros de asistencia (los plazos legales son largos) y cómo se eliminan los de candidatos descartados.
* **Contratistas vs. empleados**: tratar como “prestador” a quien cumple horario y órdenes genera riesgo de contrato realidad. El sistema debería avisar cuando un contratista se comporta como empleado.
* **Marcación sin internet**: en obra, tours y zonas rurales no hay señal. Sin offline, el control de asistencia no funciona.
* **Fraude de asistencia**: ubicación falsa, “marcar por otro” y fotos repetidas. Combina geocerca, foto, prueba de vida y revisión de patrones.
* **IA en selección y evaluación**: puede reproducir sesgos. Que sugiera, que decida un humano, y guarda trazabilidad.
* **Comisiones disputadas**: la causa número uno de conflictos. Reglas escritas, cálculo transparente, historial de ajustes y aprobación antes de pagar.
* **Costos de WhatsApp y de IA**: recordatorios a toda la plantilla y tutores IA consumen; límites por plan.
* **Adopción**: el personal operativo suele no tener correo ni usar apps complejas. Prioriza WhatsApp, interfaces muy simples y acceso por QR.

## Qué lanzaría primero

1. **Núcleo: ficha de empleado, estructura, permisos (con salario protegido) y portal básico.**
2. **Contratos con plantilla y firma, vacaciones, permisos y vencimientos** (RR. HH. nivel 1 y 2 sin nómina).
3. **Marcación por celular con geocerca y turnos** (control de horarios nivel 2): lo que más se pide en hoteles, gimnasios y obras.
4. **Comunicación interna simple**: anuncios con confirmación de lectura, canales y avisos por WhatsApp.
5. **Comisiones desde el CRM y las reservas** (nivel 2), con reporte transparente para cada vendedor o guía.
6. **Onboarding con checklist y reclutamiento básico** con página de vacantes.
7. **Capacitaciones obligatorias con vigencia** (SG-SST y las propias de cada vertical) y certificados.
8. **Nómina**: primero **exportar horas y novedades** a Siigo, Alegra o un proveedor; después, liquidación propia si hay demanda.
9. **Evaluaciones de desempeño y LMS completo.**
10. **Planificación de turnos con IA, matriz de talento y compensación avanzada**, cuando ya tengas datos reales de ocupación, ventas y asistencia.

---

_Fuente: `DesordenadoCapas.md` (capa `Personas`) + `EstructuraCapasImplementacion.md`._