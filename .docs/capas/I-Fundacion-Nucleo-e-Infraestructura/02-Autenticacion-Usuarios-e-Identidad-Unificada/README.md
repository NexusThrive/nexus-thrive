---
id: I.02
capa: "I — FUNDACIÓN, NÚCLEO E INFRAESTRUCTURA"
titulo: "Autenticación, usuarios e identidad unificada"
type: subcapa
created: 2026-10-08
updated: 2026-10-08
tags: [capas, estructura, subcapa]
---

# I.02 — Autenticación, usuarios e identidad unificada

> Escalera de madurez de la subcapa **I.02**. N1–N4 provienen de `DesordenadoCapas.md`; N0, N5 y N6 son niveles de escalera (contenido por desarrollar).

> **Checks**: `- [x]` = funcionalidad ya implementada en la rama actual; `- [ ]` = pendiente. Técnico va separado del conceptual.

## N0 — Fundamento de identidad

> Nivel de escalera — contenido por desarrollar (la fuente no lo desglosa).


## N1 — Registro, inicio y cierre de sesión

#### Funcionalidad

- [x] Correo y contraseña
- [x] Recuperación de contraseña
- [x] Cierre de sesión
- [x] Reglas mínimas de contraseña

#### Técnico

- [x] Implementado en la rama actual (ver `git log` de cada feature)
- [ ] Definir arquitectura técnica y modelo de datos de este nivel
- [ ] Definir APIs/acciones, permisos y reglas de negocio

## N2 — Gestión completa de usuarios, perfiles y sesiones

#### Funcionalidad

- [ ] 2FA
- [ ] Inicio de sesión con Google y Microsoft.
- [ ] Código por WhatsApp o SMS
- [ ] Lista de sesiones activas
- [ ] Aviso por correo o WhatsApp
- [ ] Bloqueo temporal

#### Técnico

- [ ] Definir arquitectura técnica y modelo de datos de este nivel
- [ ] Definir APIs/acciones, permisos y reglas de negocio

## N3 — Integración de identidad entre módulos y tenants

#### Funcionalidad

- [ ] 2FA obligatorio por negocio o por rol
- [ ] Passkeys / WebAuthn
- [ ] SSO empresarial
- [ ] Políticas de sesión
- [ ] Restricciones de acceso
- [ ] Protección de la cuenta del SuperAdmin
- [ ] Alertas y registro de seguridad

#### Técnico

- [ ] Definir arquitectura técnica y modelo de datos de este nivel
- [ ] Definir APIs/acciones, permisos y reglas de negocio

## N4 — Automatización del ciclo de vida de usuarios

#### Funcionalidad

- [ ] Autenticación adaptativa
- [ ] Detección de robo de sesión y de credenciales filtradas
- [ ] Gestión de dispositivos
- [ ] Acceso de proveedores y soporte con acceso justo a tiempo
- [ ] Autenticación sin contraseña
- [ ] Autenticación de clientes finales
- [ ] Certificaciones y pruebas

#### Técnico

- [ ] Definir arquitectura técnica y modelo de datos de este nivel
- [ ] Definir APIs/acciones, permisos y reglas de negocio

## N5 — Detección de comportamientos anómalos y controles adaptativos

> Nivel de escalera — contenido por desarrollar (la fuente no lo desglosa).


## N6 — Identidad empresarial, SSO y federación de identidades

> Nivel de escalera — contenido por desarrollar (la fuente no lo desglosa).

