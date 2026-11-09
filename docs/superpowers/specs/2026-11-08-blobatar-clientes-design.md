# Blobatars para clientes — diseño

**Fecha:** 2026-11-08
**Estado:** propuesto (pendiente de aprobación)
**Rama:** `feature/HU-crm-a1-alta-en-dos-niveles`

## Intención

Hoy los clientes sin foto se dibujan con iniciales hechas a mano en cada pantalla. Queremos que
cada cliente sin foto tenga una cara propia, determinista y sin almacenamiento: un **blobatar**.
La foto cargada sigue teniendo prioridad absoluta; el blobatar solo reemplaza a las letras.

## Objetivos

- Un solo componente compartido decide la cara del cliente (foto o blobatar).
- La misma persona ve la misma cara en todas las superficies: lista, ficha, alta, CRM, agenda,
  WhatsApp, carné y check-in.
- Sin peticiones de red ni servicios externos: el blobatar se genera en proceso.
- Render estático (un `<img>`) por defecto, apto para listas largas.
- Cero cambios de esquema: no se guarda nada nuevo.

## No objetivos

- No tocar avatares de equipo, usuarios internos ni el super admin.
- No animar por defecto. El movimiento se evalúa después; si se usa, respeta
  `prefers-reduced-motion`.
- No cambiar formas, tamaños ni radios de los contenedores actuales.
- No reemplazar la subida de fotos ni su lógica.

## Enfoques considerados

| Enfoque | Ventajas | Coste | Decisión |
|---|---|---|---|
| **A. Paquete en proceso** (`blobatar` + `blobatar/uri`) | Sin red, determinista, estático = un `<img>`, funciona offline, no expone nombres a terceros | ~4.4 KB y una dependencia | **Elegido** |
| B. Endpoint `blobatar.dev/avatar/<nombre>` | Cero dependencias | Depende de un tercero, rate limit, filtra nombres, se rompe sin internet | Descartado |
| C. Generador sin adaptador React | Una dependencia | SVG generado a mano con `dangerouslySetInnerHTML`; sin ventaja real | Descartado |

## Decisiones

- **Semilla:** el nombre del cliente. Respaldo en este orden: correo, teléfono, id. Así la vista
  previa del alta muestra desde el primer momento la misma cara que quedará guardada.
  Dos clientes homónimos comparten cara; se acepta a cambio de coherencia y cero cambios de datos.
- **Foto primero:** si existe `photoId`/`photoUrl`, se renderiza igual que hoy.
- **Componente:** `CustomerAvatar` recibe la identidad (nombre + respaldos), la URL de foto y la
  clase del contenedor. Aplica la misma clase de caja que cada superficie ya usa.
- **Render en servidor:** se usa `blobatar/uri` (data URI) en vez de `@blobatar/react`, porque el
  adaptador de React usa hooks y obligaría a marcar cada avatar como componente cliente. Así el
  avatar sigue siendo un `<img>` estático y se renderiza en Server Components sin JavaScript extra.
- **Render:** estático en todas las superficies. Sin `motion.css` ni SVG inline.
- **Accesibilidad:** la cara es decorativa (`alt=""`, `aria-hidden`) porque el nombre siempre está
  junto a ella; no se añade texto alternativo duplicado.

## Alcance por archivo

- `components/atoms/customer-avatar.tsx` (nuevo): decisión foto/blobatar y semilla.
- `app/[tenant]/(app)/contactos/_components/customer-table.tsx`: `Face` y tarjetas archivadas.
- `app/[tenant]/(app)/contactos/[id]/_components/customer-header.tsx`: cabecera de la ficha.
- `app/[tenant]/(app)/contactos/[id]/_components/ficha/ficha-view.tsx`: identidad de 88 px.
- `app/[tenant]/(app)/contactos/[id]/carnet/page.tsx`: carné sin foto.
- `app/[tenant]/(app)/contactos/nuevo/_components/new-customer-form.tsx`: vista previa del alta.
- `app/[tenant]/(app)/crm/_components/pipeline/pipeline-ui.tsx` y `quick-create.tsx`: CRM.
- `components/organisms/whatsapp-composer.tsx`: conversaciones.
- `app/[tenant]/(app)/checkin/_components/checkin-station.tsx`: respaldo del socio sin foto.
- Storybook: historia del nuevo componente; las historias de clientes deben seguir compilando.

Fuera: `agenda-timeline` (solo existe en Storybook, sin datos reales), equipo/admin y registro
público (no muestran avatar).

## Verificación

- `initials()` deja de usarse en las superficies de cliente; se puede retirar el código muerto.
- Prueba unitaria de la derivación de semilla (nombre → correo → teléfono → id).
- `pnpm lint` y `tsc --noEmit` sin errores.
- Revisión visual en Storybook de Contactos, ficha y CRM con y sin foto.

## Pendiente para el constructor

- Ajuste fino del encuadre del blobatar dentro de cada contenedor (22 px a 88 px).
- Confirmar que ningún flujo dependía de las iniciales como texto.
