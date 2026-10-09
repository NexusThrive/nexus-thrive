---
id: V.00
capa: "V — VENTAS DIGITALES, COMERCIO Y PAGOS"
titulo: "Pasarelas de pago e integraciones financieras"
type: subcapa
created: 2026-10-08
updated: 2026-10-08
tags: [capas, estructura, subcapa]
---

# V.00 — Pasarelas de pago e integraciones financieras

> Escalera de madurez de la subcapa **V.00**. N1–N4 provienen de `DesordenadoCapas.md`; N0, N5 y N6 son niveles de escalera (contenido por desarrollar).

> **Checks**: `- [x]` = funcionalidad ya implementada en la rama actual; `- [ ]` = pendiente. Técnico va separado del conceptual.

## N0 — Fundamento de pagos, proveedores y estados

> Nivel de escalera — contenido por desarrollar (la fuente no lo desglosa).


## N1 — Integración con una pasarela de pago

#### Funcionalidad

- [ ] Una pasarela (Wompi o la que elijas) conectada
- [ ] Pago con tarjeta, PSE y Nequi desde un checkout alojado por la pasarela.
- [ ] Confirmación de pago por webhook y estado visible en la orden.

#### Técnico

- [ ] Definir arquitectura técnica y modelo de datos de este nivel
- [ ] Definir APIs/acciones, permisos y reglas de negocio

## N2 — Gestión de transacciones, errores y conciliación básica

#### Funcionalidad

- [ ] Varias pasarelas
- [ ] Métodos locales completos
- [ ] Reembolsos totales y parciales
- [ ] Pagos parciales y depósitos
- [ ] Conciliación diaria
- [ ] Cuotas y pagos en moneda extranjera según la pasarela.

#### Técnico

- [ ] Definir arquitectura técnica y modelo de datos de este nivel
- [ ] Definir APIs/acciones, permisos y reglas de negocio

## N3 — Integración con múltiples proveedores y módulos

#### Funcionalidad

- [ ] Enrutamiento entre pasarelas
- [ ] Registro de comisiones
- [ ] Gestión de contracargos
- [ ] Reintentos de cobros fallidos
- [ ] Pagos divididos
- [ ] Límites y aprobaciones
- [ ] Reportes de aprobación

#### Técnico

- [ ] Definir arquitectura técnica y modelo de datos de este nivel
- [ ] Definir APIs/acciones, permisos y reglas de negocio

## N4 — Webhooks, reintentos y conciliación automatizada

#### Funcionalidad

- [ ] Modelo de plataforma de pagos
- [ ] Pagos a terceros y dispersión
- [ ] Tokenización de tarjeta
- [ ] Antifraude con reglas e IA
- [ ] Billetera interna y saldo a favor.
- [ ] Conciliación automática con el banco
- [ ] Otros rieles

#### Técnico

- [ ] Definir arquitectura técnica y modelo de datos de este nivel
- [ ] Definir APIs/acciones, permisos y reglas de negocio

## N5 — Detección de anomalías y optimización de pagos

> Nivel de escalera — contenido por desarrollar (la fuente no lo desglosa).


## N6 — Orquestación de pagos empresarial y resiliencia

> Nivel de escalera — contenido por desarrollar (la fuente no lo desglosa).

