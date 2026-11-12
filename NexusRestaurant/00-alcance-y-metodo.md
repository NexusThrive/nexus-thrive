# 00 · Alcance y método

## Autorización

- Cuenta **propia** del equipo de Nexus en Colega Menus (prueba gratuita de 14
  días, vence el 2026-11-08). Se usó como lo haría cualquier usuario.
- Objetivo: entender cómo funciona el producto para decidir el diseño del rubro
  restaurante en Nexus.

## Qué se hizo

1. Lectura de lo público: landing, funciones, precios, login, signup, demo y
   las 40+ páginas de `/soporte`.
2. Recorrido autenticado del panel `/app` con Playwright (Chromium headless):
   71 pantallas visitadas por `GET`, cada una en escritorio y móvil.
3. Apertura de los menús que solo listan opciones: selector de restaurante,
   cuenta, prueba gratis, «Primeros pasos», «Agregar herramienta/módulo»,
   búsqueda global y menú móvil.
4. Registro de las llamadas `fetch/xhr` del navegador: método, ruta, estado,
   tipo de contenido y **solo las claves** de las respuestas JSON.

## Qué no se hizo (a propósito)

| No se hizo | Motivo |
|---|---|
| Crear cuentas con correos o teléfonos temporales | Es burlar la verificación del servicio y sus términos; el onboarding se documentó desde la cuenta propia y el soporte público |
| Pulsar crear, guardar, eliminar, importar, invitar o cerrar sesión | Solo lectura: no se cambió ningún dato de la cuenta |
| Fuzzing, fuerza bruta, rutas de otros clientes, otros tenants | Fuera de alcance; la cuenta es la única superficie probada |
| Clonar HTML, CSS, fuentes, imágenes o marca | Es contenido protegido de un tercero; Nexus tiene su propio sistema de diseño (`DESIGN.md`) |
| Invocar sus Server Actions por cuenta propia | Son una interfaz privada, sin contrato ni garantía |
| Herramientas de terceros (websnap, Wappalyzer…) | Playwright, ya presente en Nexus, bastó; menos superficie y sin dependencias nuevas |

## Límites de lo documentado

- Lo del asistente `/app/setup` se vio **solo hasta el paso 1** (la cuenta ya lo
  había contestado y quedó preseleccionada una opción). Los pasos 2–4 vienen del
  soporte público (`/soporte/primeros-pasos`), no de capturas.
- La cuenta está en prueba: ve todas las funciones, pero muchos módulos
  aparecen **vacíos** o con «datos de ejemplo». Los estados con datos reales
  (pedido en curso, corte de caja) vienen del soporte, no de una captura.
- No se inspeccionaron cuerpos de las *Server Actions* ni cabeceras de
  petición: que sean Server Actions es **inferido** de `POST` + `text/x-component`
  a la ruta de la propia página.
- Notificaciones: el botón no se pudo abrir (selector no coincidió); su
  contenido queda sin documentar.
- El producto cambia (v1.167.0): esto es una foto del 2026-10-30.

## Higiene de credenciales

- La cookie de sesión se pasó por variable de entorno y **no** aparece en este
  directorio (se verificó con `grep`).
- Dato para el equipo: la cookie quedó en el historial del chat. Conviene
  **cerrar esa sesión** desde la cuenta (o cambiar la contraseña) al terminar.
- Los datos personales de la cuenta (perfil, horarios con nombres) se excluyeron
  de capturas y JSON.

## Cómo repetirlo

```bash
cd NexusRestaurant/herramientas
# La ruta de playwright se resuelve desde node_modules del repositorio.
SESSION_COOKIE='<valor>' node recorrer-panel.mjs ./salida
SESSION_COOKIE='<valor>' node recorrer-menus.mjs ./salida
```

El nombre de la cookie de sesión es `__Secure-better-auth.session_token`
(no `better-auth.session_token`: con ese nombre la sesión no se reconoce).
