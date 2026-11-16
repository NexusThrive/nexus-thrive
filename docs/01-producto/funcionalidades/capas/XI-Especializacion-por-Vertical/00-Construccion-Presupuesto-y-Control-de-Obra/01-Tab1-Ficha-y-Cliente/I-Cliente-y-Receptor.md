---
id: XI.00.I
capa_padre: XI.00
tab: 1
dominio: "Cliente & Receptor"
rama: "feature/construction-apu-engine"
escalera: "N0 · N1 · N2 · N3 · N4"
estado: borrador
created: 2026-10-10
updated: 2026-10-10
tags: [capas, construccion, cliente, receptor, partes, interventoria]
---

# Capa I — Cliente & Receptor

> Tab 1 · Ficha, Cliente & Encabezado. Dominio: identificación de las **partes** de una operación (cliente, contratante, propietario, receptor, responsables, interventoría) y **contextualización** de la obra. No es un formulario de datos personales: es el **contrato conceptual** entre el CRM y la obra.

---

## 01. Rol, contexto y responsabilidad

Actúa como **Senior Software Architect, Senior Full-Stack Engineer y Domain Architect** especializado en sistemas multi-tenant (Next.js App Router, TypeScript, Prisma, PostgreSQL, SaaS).

Responsabilidad: implementar el dominio **Cliente & Receptor** evitando tratarlo como un formulario plano, respetando la arquitectura existente y sin duplicar el CRM.

**Reglas fundamentales:**

1. No asumir que modelos/servicios existen como se describen. **Inspeccionar el repo primero.**
2. Reutilizar `Customer` y servicios existentes cuando sean adecuados.
3. **No duplicar entidades del CRM** para representar información de una obra.
4. No introducir abstracciones sin justificar.
5. No inventar campos, estados, relaciones ni integraciones ficticias.
6. No marcar una capacidad como lista si solo existe su representación visual.
7. No declarar compilación/prueba/migración exitosa sin ejecutarla.

---

## 02. Dominio, problema y objetivo funcional

### Problema

En construcción, **cliente comercial, contratante, propietario del inmueble, destinatario de la oferta, responsable de pago y responsables técnicos pueden ser personas u organizaciones distintas**. La ubicación fiscal del cliente **no** es la ubicación física de la obra. La interventoría necesita responsables, alcance y facultades de aprobación explícitas.

### Objetivo

Permitir: buscar/seleccionar terceros del CRM · registrar nuevos · identificar personas naturales/jurídicas · gestionar identificación tributaria y contractual · **separar domicilio fiscal y ubicación de obra** · definir roles por operación · registrar contactos comerciales/financieros/técnicos · identificar interventoría/supervisión · gestionar documentación · validar según etapa · preparar la transición **cotización → proyecto** · mantener trazabilidad.

### Límite funcional

**No** absorbe: motor de APU, presupuesto y cálculos tributarios avanzados (capa III), contratos completos, planificación Lean (capa V), bitácora (VII), finanzas, facturación electrónica, portal del cliente, verificación externa de identidad. Cuando algo de esto se necesite, se define su **relación conceptual** y, solo si se justifica, una integración preparada.

---

## 03. Fase cero — auditoría obligatoria del repositorio

Inspeccionar y reportar: rama/estado Git · rutas `quotes`/`crm` · contrato Prisma y migraciones · modelo `Customer` y relaciones · `Tenant` y aislamiento · entidades de cotización/proyecto/terceros · servicios de acceso a datos · auth/permisos · server actions/validaciones · componentes UI (formularios, selectores, diálogos, tablas, notificaciones) · sistema visual · pruebas/scripts.

**Entregable:** plan con — estado actual del dominio · modelos/componentes reutilizables · carencias · riesgos de integridad/seguridad · archivos previstos · entidades nuevas realmente necesarias · dependencias/bloqueos · orden de ejecución · criterios de aceptación verificables.

---

## 04. Contrato conceptual del dominio

El diseño **distingue** información maestra, contextual y asignaciones de responsabilidad:

| Naturaleza | Qué es | Quién es la fuente |
| --- | --- | --- |
| **Maestro** | El tercero del CRM: tipo, nombre legal/comercial, identificación, contacto, direcciones, estado | `Customer` (CRM) |
| **Contextual** | La relación del tercero **en la operación**: rol(es), confirmación, datos para la documentación comercial | Entidades nuevas de esta capa |
| **Asignación** | Quién desempeña qué función (contactos, responsables, interventoría) | Entidades nuevas de esta capa |
| **Histórico** | Lo congelado en un documento emitido | Snapshot al emitir (sección 09) |

**Reglas:**
- La información maestra **no se duplica** automáticamente en cada cotización.
- Un mismo tercero puede desempeñar **varios roles** (no forzar uno por persona).
- Representante legal ≠ contacto comercial ≠ responsable de pagos.
- Ubicación de obra ≠ domicilio fiscal.
- **Registrar una persona ≠ asignarle una función ≠ autorizarla** a decidir.

---

## 05. Multi-tenant, autorización y seguridad

- **Aislamiento por tenant:** toda operación dentro del tenant autenticado; no confiar en `tenantId` del formulario; no permitir seleccionar registros de otro tenant; comprobar pertenencia de clientes, contactos, proyectos y documentos vinculados; usar el servicio de acceso a datos existente (no crear uno paralelo).
- **Autorización por operación** (≠ autenticación): consultar terceros · crear clientes · modificar maestro · vincular a cotización · asignar contactos/responsables · registrar interventoría · consultar documentación sensible · aprobar asignaciones.
- **Protección:** validar en servidor · normalizar identificadores · no registrar documentos completos en logs · proteger adjuntos · no exponer datos personales en errores · no presentar validaciones locales como verificaciones oficiales.

---

## 06. Escalamiento N0–N4

### N0 — Fundamento del dominio
Integración con el tercero maestro · diferenciación cliente vs. contexto · roles comerciales/contractuales · separación domicilio fiscal / ubicación de obra · contactos y responsables · estados esenciales · aislamiento multi-tenant · reglas de pertenencia y consistencia.
**Entregable:** fundamento de datos y relaciones validado contra la arquitectura existente.

### N1 — Baseline operativo (V1 / BETA)
Selector de terceros · búsqueda de clientes · creación rápida (si está permitida) · visualización/confirmación de datos · identificación tributaria básica · domicilio fiscal · ubicación de obra · roles principales · contacto principal · estado de completitud · vinculación con la cotización/proyecto.
**Criterio de aceptación:** un usuario autorizado selecciona un cliente, confirma sus datos, identifica el sitio y guarda la relación **sin crear duplicados ni perder información**.

### N2 — Gestión integral
Múltiples contactos por función · varios roles por tercero · interventoría y responsables técnicos · documentos · **detección de duplicados** (con revisión humana, sin fusionar automáticamente) · normalización · seguimiento de cambios · estados de confirmación/completitud · datos pendientes · historial de asignaciones.

### N3 — Control, auditoría y gobierno
Historial de cambios · registro de asignaciones/desasignaciones · aprobaciones por autoridad y alcance · vigencia de designaciones · validación de consistencia · visibilidad por permisos · resumen de datos faltantes antes de formalizar · registro de quién confirmó y cuándo · control de cambios a datos usados en documentos formales · seguimiento de pendientes.

### N4 — Madurez estratégica
Portal de autogestión · consulta autorizada de cotizaciones/documentos · revisión/aprobación de ofertas · avance fotográfico · seguimiento de pendientes · indicadores de completitud · segmentación · alertas por reglas · asistencia para detectar faltantes · integraciones externas de verificación (cuando existan). **La IA sugiere; no aprueba** identidades, contratos ni decisiones reservadas.

---

## 07. Contrato de experiencia de usuario

Secciones del formulario: 1) Cliente del CRM · 2) Identificación tributaria/contractual · 3) Roles de la operación · 4) Ubicación de la obra · 5) Contactos y responsables · 6) Interventoría y supervisión · 7) Documentación · 8) Revisión y confirmación.

**Estados obligatorios:** default · loading · empty · error · success · disabled · partial. *(No simular cargas ni respuestas.)*

**Comportamiento:** búsqueda ≠ creación · selección muestra datos relevantes · editar maestro respeta permisos · datos de obra no sobrescriben dirección fiscal · errores señalan campo/operación · validaciones de servidor se reflejan en UI · guardar/continuar respeta estados · accesible y responsive.

---

## 08. Lógica de negocio y operaciones

Operaciones: buscar terceros del tenant · consultar ficha · crear tercero · vincular a cotización/proyecto · actualizar contexto · asignar/retirar contactos · registrar responsables técnicos · registrar/actualizar interventoría · consultar/actualizar ubicación · consultar completitud · registrar cambios relevantes · consultar documentos autorizados.

Validaciones: tercero existe y pertenece al tenant · proyecto/cotización en ámbito autorizado · campos obligatorios por etapa · compatibilidad tipoPersona ↔ tipoDoc · DV del NIT · evitar asignaciones contradictorias · borrar asignación no destruye historial · responsables/documentos atados a la operación correcta · informar faltantes antes de oferta formal.
**Validar un campo ≠ verificar oficialmente su contenido.**

---

## 09. Integridad, historial y consistencia documental

Política explícita para cambios posteriores a formalización: nombre/razón social · identificación · direcciones · contactos · reasignaciones de interventoría · contratante · ubicación · cambios post-oferta.

- **No** copiar indiscriminadamente todo el CRM en cada entidad.
- **No** permitir que una modificación posterior altere silenciosamente un documento histórico.
- Distinguir: 1) maestro actual · 2) contextual · 3) histórico en documentos · 4) asignaciones vigentes vs. anteriores.
- Ajustarse al versionado/historial existente.

---

## 10. Estrategia de implementación

- **A — Diagnóstico y diseño:** auditar repo, mapear relaciones, detectar duplicidades, definir alcance real N0–N1, documentar decisiones, presentar plan.
- **B — Fundamento:** ajustar entidades/relaciones, validaciones, aislamiento, migraciones según flujo real, verificar consistencia.
- **C — Baseline funcional:** selector de terceros, consulta/confirmación, identificación básica, ubicación, roles, vínculo con cotización/proyecto.
- **D — Operaciones y estados:** server actions, validaciones, errores/permisos, estados de UI, persistencia real.
- **E — Verificación:** checks disponibles, relaciones, aislamiento entre tenants, operaciones autorizadas/no autorizadas, integridad, regresiones.
- **F — Informe y siguiente nivel:** documentar, limitaciones, deuda, plan de madurez, condiciones para N2.

---

## 11. Criterios de aceptación

**Dominio** — tercero maestro reutilizado · roles comerciales/contractuales diferenciables · dirección fiscal ≠ ubicación obra · contactos por función · interventoría distingue designación/alcance/autoridad · datos incompletos representables sin inventar.

**Seguridad** — operaciones en el tenant correcto · IDs del cliente no saltan autorización · no se consultan/vinculan terceros de otro tenant · documentos sensibles respetan permisos.

**Integridad** — sin referencias huérfanas · cambios según política de historial · cotizaciones no sobrescriben maestro · modificaciones no alteran documentos históricos · validaciones en servidor.

**Interfaz** — estados loading/empty/error/success reales · errores claros · acciones deshabilitadas por condiciones reales · integración con componentes existentes · sin botones sin comportamiento ni datos ficticios.

**Verificación técnica** — ejecutar los scripts reales del `package.json`: tsc · lint · tests · `prisma validate`/`generate` · build · migraciones. No sustituir el flujo de migración por comandos de otra versión de Prisma. No debilitar lint ni borrar tests para "pasar".

---

## 12. Informe final obligatorio

A) Diagnóstico inicial · B) Plan ejecutado (desviaciones y motivos) · C) Archivos modificados (responsabilidad + motivo) · D) Dominio resultante (reutilizadas/nuevas, relaciones, validaciones, aislamiento/autorización) · E) Funcionalidades (completada y verificada / implementada no verificada / parcial / pendiente) · F) Verificación (comando · resultado real · errores · estado) · G) Riesgos y limitaciones · H) Próxima fase.

---

## 13. Instrucción final de ejecución

Inspeccionar repo/Git → presentar plan concreto → implementar el alcance autorizado por fases, preservando cambios existentes, respetando el multi-tenant y verificando cada incremento. **Priorizar coherencia funcional sobre cantidad de archivos.**

---

## 14. Entidades & Campos

> Naturaleza: **contextual** (salvo donde se indique). Todas llevan `tenantId`. Reutilizan `Customer` como maestro. Dependen de `Project` (aún no existe — ver dependencias).

### Entidad: `ProjectParty` — partes de la operación

**Concepto:** asigna un tercero del CRM a una obra desempeñando un **rol** en la operación.
**Naturaleza:** contextual (asignación). **¿Nueva?** Sí.

**Campos**

| campo | tipo | req | default | descripción |
| --- | --- | --- | --- | --- |
| id | uuid | ✓ | — | PK |
| tenantId | uuid | ✓ | — | aislamiento |
| projectId | uuid | ✓ | — | obra/cotización (FK `Project`) |
| customerId | uuid | ✓ | — | tercero maestro (FK `Customer`) |
| role | enum `PartyRole` | ✓ | — | rol en la operación |
| isPrimary | bool | ✓ | false | contacto principal para el rol |
| confirmationStatus | enum `DataStatus` | ✓ | PENDIENTE | estado de confirmación |
| notes | text | — | null | observaciones |
| createdBy | uuid | ✓ | — | usuario |
| createdAt / updatedAt | datetime | ✓ | now | auditoría |

`PartyRole`: `CLIENTE_SOLICITANTE · CONTRATANTE · PROPIETARIO_INMUEBLE · DESTINATARIO_OFERTA · RESPONSABLE_PAGO · REPRESENTANTE_AUTORIZADO`
`DataStatus`: `PENDIENTE · CONFIRMADO · OBSERVADO`

**Relaciones:** `ProjectParty` N—1 `Project`, N—1 `Customer`, 1—N `PartyContact`, 1—N `PartyDocument`.
**Reglas:** un tercero puede tener varios roles (una fila por rol); `isPrimary` único por `(projectId, role)`; no borrar si hay documentos históricos que lo referencian.
**Índices/unicidad:** `(tenantId, projectId, customerId, role)` único.
**APIs:** crear · listar por proyecto/rol · cambiar confirmación · retirar (soft).
**Permisos:** ver (miembro de obra) · crear/editar (Líder/Residente) · aprobar (admin/tenant).
**Integraciones:** CRM (`Customer`), capa IV (roles de obra), capa IX/XI (encabezado de informes).

### Entidad: `PartyContact` — contactos por función

**Concepto:** persona de contacto asociada a una operación bajo una función específica.
**Naturaleza:** contextual. **¿Nueva?** Sí.

**Campos**

| campo | tipo | req | default | descripción |
| --- | --- | --- | --- | --- |
| id | uuid | ✓ | — | PK |
| tenantId | uuid | ✓ | — | aislamiento |
| projectId | uuid | ✓ | — | obra |
| projectPartyId | uuid | — | null | parte relacionada (si aplica) |
| function | enum `ContactFunction` | ✓ | — | función |
| name | string | ✓ | — | nombre |
| position | string | — | null | cargo |
| email | string | — | null | correo |
| phone | string | — | null | teléfono |
| customerId | uuid | — | null | si el contacto es a su vez un tercero |
| isPrimary | bool | ✓ | false | principal de la función |
| createdAt / updatedAt | datetime | ✓ | now | auditoría |

`ContactFunction`: `COMERCIAL · FINANCIERO · TECNICO · ACCESO_SITIO · REPRESENTANTE_CONTRATANTE · RESPONSABLE_PAGOS`

**Relaciones:** `PartyContact` N—1 `Project`, N—1 `ProjectParty` (opcional), N—1 `Customer` (opcional).
**Reglas:** no exigir `customerId` (un contacto puede no ser tercero); si una persona desempeña varios roles, una fila por función sin duplicar identidad.
**Índices:** `(tenantId, projectId, function)`.
**APIs:** asignar · retirar · marcar principal.
**Permisos:** ver (miembro) · editar (Líder/Residente).

### Entidad: `TaxIdentity` — identificación tributaria y contractual

**Concepto:** datos fiscales/contractuales del receptor. **Decisión abierta:** puede vivir en `Customer` (si ya tiene los campos) o como `CustomerTaxProfile` 1—1. Evaluar contra `Customer` antes de crear.
**Naturaleza:** maestro/contextual (evaluar). **¿Nueva?** A confirmar.

**Campos**

| campo | tipo | req | default | descripción |
| --- | --- | --- | --- | --- |
| tipoPersona | enum `PersonType` | ✓ | — | NATURAL / JURIDICA |
| tipoDoc | enum `DocType` | ✓ | — | NIT / CC / CE / PASAPORTE |
| numeroDoc | string | ✓ | — | número de identificación |
| digitoVerificacion | string | — | null | DV del NIT |
| razonSocial | string | ✓ | — | razón social / nombre legal |
| direccionFiscal | string | — | null | domicilio fiscal |
| municipioFiscal / departamentoFiscal / pais | string | — | null | ubicación fiscal |
| emailFacturacion | string | — | null | facturación |
| representanteLegal | string | — | null | nombre |
| estadoValidacion | enum `DataStatus` | ✓ | PENDIENTE | validación |

**Reglas:** tipoPersona ↔ tipoDoc compatibles; DV solo si NIT; representante legal ≠ contacto comercial.
**Nota:** el maestro no se copia a cada cotización; los documentos formales congelan su propio snapshot (sección 09).

### Entidad: `ProjectSite` — ubicación de la obra

**Concepto:** ubicación física de ejecución (≠ domicilio fiscal). Puede quedar **pendiente/aproximada** en cotización preliminar.
**Naturaleza:** contextual. **¿Nueva?** Sí.

**Campos**

| campo | tipo | req | default | descripción |
| --- | --- | --- | --- | --- |
| id | uuid | ✓ | — | PK |
| tenantId | uuid | ✓ | — | aislamiento |
| projectId | uuid | ✓ | — | obra |
| nombreObra | string | ✓ | — | nombre de la obra |
| tipoProyecto | string | — | null | tipo |
| direccion | string | — | null | dirección física |
| pais / departamento / municipio | string | — | null | ubicación |
| barrio / referencia | string | — | null | referencia geográfica |
| lote / torre / unidad | string | — | null | identificador del sitio |
| indicacionesAcceso | text | — | null | acceso |
| restriccionesIngreso | text | — | null | restricciones |
| horarioAutorizado | string | — | null | horario |
| condicionesLogisticas | text | — | null | logística |
| lat / lng | decimal | — | null | georref. (opcional) |
| confirmationStatus | enum `DataStatus` | ✓ | PENDIENTE | confirmación |

**Relaciones:** `ProjectSite` N—1 `Project` (1—1 típico), 1—N `PartyDocument` (fotos/documentos de sitio).
**Reglas:** no sobrescribir la dirección fiscal del tercero; permitir estado incompleto en borrador.

### Entidad: `Interventoria` — interventoría y supervisión

**Concepto:** designación de interventoría/supervisión, su **alcance** y **autoridad**. **No presuponer su existencia.**
**Naturaleza:** contextual (asignación). **¿Nueva?** Sí.

**Campos**

| campo | tipo | req | default | descripción |
| --- | --- | --- | --- | --- |
| id | uuid | ✓ | — | PK |
| tenantId | uuid | ✓ | — | aislamiento |
| projectId | uuid | ✓ | — | obra |
| hasInterventoria | bool | ✓ | false | ¿existe? |
| designationStatus | enum `DataStatus` | ✓ | PENDIENTE | estado de designación |
| supervisionType | string | — | null | tipo de supervisión |
| empresaCustomerId | uuid | — | null | empresa responsable (FK `Customer`) |
| professionalName | string | — | null | profesional designado |
| profession / specialty | string | — | null | profesión/especialidad |
| professionalLicense | string | — | null | matrícula/acreditación |
| contactEmail / contactPhone | string | — | null | contacto |
| scope | text | — | null | alcance de funciones |
| approvalAuthority | bool | ✓ | false | ¿puede aprobar? |
| validFrom / validTo | date | — | null | vigencia |
| createdAt / updatedAt | datetime | ✓ | now | auditoría |

**Relaciones:** `Interventoria` N—1 `Project`, N—1 `Customer` (empresa, opcional), 1—N `PartyDocument` (designación).
**Reglas:** distinguir **designar** (registrar) de **autorizar** (facultad de aprobar); vigencia controlada.

### Entidad: `PartyDocument` — documentación complementaria

**Concepto:** documentos de las partes/sitio/interventoría. **Reutiliza el motor documental (VI.03)**; nunca guardar binarios en campos arbitrarios ni exponer por enlace público.
**Naturaleza:** contextual (con enlace a histórico). **¿Nueva?** Sí (referencia, no almacenamiento).

**Campos**

| campo | tipo | req | default | descripción |
| --- | --- | --- | --- | --- |
| id | uuid | ✓ | — | PK |
| tenantId | uuid | ✓ | — | aislamiento |
| projectId | uuid | ✓ | — | obra |
| subjectType | enum `DocSubject` | ✓ | — | PARTY / SITE / INTERVENTORIA / CONSTRUCTORA |
| subjectId | uuid | ✓ | — | entidad referida |
| docType | enum `DocType` | ✓ | — | RUT / CAMARA_COMERCIO / CEDULA / CERT_PROFESIONAL / DESIGNACION_INTERVENTORIA / AUTORIZACION_REPRESENTANTE / FOTO_UBICACION |
| fileRef | string | ✓ | — | referencia al motor documental (VI.03) |
| status | enum `DataStatus` | ✓ | PENDIENTE | estado |
| expiresAt | date | — | null | vencimiento |
| uploadedBy | uuid | ✓ | — | usuario |
| createdAt | datetime | ✓ | now | auditoría |

**Relaciones:** polimórfica por `subjectType`+`subjectId`; N—1 `Project`; enlace al documento real en VI.03.

### Grafo de la capa I

```
Customer (CRM, maestro)
   │
   └──< ProjectParty (rol en la operación) >── Project (contenedor)
              │                                   │
              ├──< PartyContact (por función)      ├── ProjectSite (1—1)
              └──< PartyDocument                   ├── Interventoria (0..1)
                                                   └── TaxIdentity (reutiliza Customer)
```
**Snapshot histórico:** al emitir un documento formal (Informe Cero, propuesta, acta — capas IX/XI/XII), se **congela** la información de las partes usada. Definir si es `PartySnapshot` o el versionado documental de VI.03.

### Dependencias

- **`Project`** (no existe aún en Prisma): prerrequisito del contenedor y de `projectId` en todas estas entidades. Definir su creación con la capa III/contenedor antes de N1.
- **`Customer`**: verificar campos disponibles antes de crear `TaxIdentity`.
- **VI.03 (documental):** reutilizar para `PartyDocument`.

### Decisiones abiertas

1. ¿`TaxIdentity` vive en `Customer` (extender) o como perfil 1—1?
2. ¿Ubicación de obra (`ProjectSite`) es capa I o capa II? *(inferido que II podría ser Ubicación.)*
3. ¿Snapshot de partes = entidad propia o versionado documental existente?
4. ¿`ProjectParty` permite un tercero sin `Customer` (alta rápida)? ¿O se obliga a crear el maestro primero?
