# 03 · Onboarding

El onboarding de Colega Menus **no es un tour**: es una cadena de decisiones
cortas que **arma el producto** (módulos activados, menú de ejemplo, lista de
tareas) y termina cuando el menú está publicado y el QR impreso.

> Evidencia: el asistente `/app/setup` y la guía de 7 pasos se **observaron** en
> la cuenta propia; el registro, los pasos 2–4 del asistente, el recorrido de
> bienvenida y las reglas vienen de `/soporte/primeros-pasos` (**Soporte**).
> No se crearon cuentas nuevas (ver 00).

## Recorrido completo

```
 1 Cuenta ─► 2 Correo ─► 3 Restaurante ─► 4 Elige tus herramientas ─► 5 Panel
 (signup)   (enlace 1h)  (Google Maps)    (cuestionario 4 pasos)      (tour + cohete)
```

| # | Paso | Qué pide | Qué pasa por detrás |
|---|---|---|---|
| 1 | **Crear cuenta** (`/signup`) | Nombre, teléfono, correo, contraseña (≥10), código de quien recomendó (opcional) | Si llegó por un enlace de recomendación o distribuidor, el código viene puesto y se muestra «Te atiende: …» |
| 2 | **Confirmar correo** | Abrir un enlace que **caduca en 1 hora** | Sin confirmar no se entra; se reenvía el enlace |
| 3 | **Crear restaurante** («¡Te damos la bienvenida!») | Buscar el negocio en **Google Maps** o escribirlo a mano | Se separa «Restaurante (Sucursal)» solo; se muestra «Así quedará el enlace de tu menú» (**permanente**) |
| 4 | **Elige tus herramientas** (`/app/setup`) | 4 pasos, ver abajo | Activa módulos según las respuestas |
| 5 | **Primera visita** | Tour de 6 pantallas, configuración del menú en 2 pasos | Menú de ejemplo cargado; guía «Primeros pasos» |

Al crear el restaurante ocurre **todo de una vez** (**Soporte**): se crea la
Cuenta, el restaurante con su menú de marca y su primera sucursal; la sucursal
hereda de Google dirección, teléfono, web y horario por día, con su lugar ligado
(«Cómo llegar» y reseñas); se carga un **menú de ejemplo**; empieza la prueba
gratis (14 días, 30 si hubo recomendación; sin tarjeta).

## El asistente «Elige tus herramientas» (`/app/setup`)

Barra de progreso de 4 pasos, **cada paso se guarda al avanzar**; si se deja a
medias, el panel ofrece «Termina de armar tu panel → Continuar». Siempre hay
**«Omitir por ahora»** (entra con todo activado). Captura:
`capturas/escritorio/setup.png`.

| Paso | Pregunta | Cómo se contesta | Evidencia |
|---|---|---|---|
| 1 · Tu negocio | ¿Qué tipo de negocio tienes? «Lo usamos como punto de partida. Podrás cambiar todo después.» | **Una**: Taquería · Pizzería · Desayunos y brunch · Comida rápida · Restaurante con servicio a mesa · Cafetería o panadería · Bar · Dark kitchen · Cadena o varias sucursales · Otro | **Observado** |
| 2 · Cómo vendes | ¿Cómo vendes? | **Varias**: mostrador · mesa · para recoger · WhatsApp/teléfono · tienda en línea propia · plataformas de delivery · kiosco. Opcional: ¿con qué sistema cobras hoy? (ninguno, Soft Restaurant, Wansoft, Parrot, El Cheff, Fudo, Loyverse, otro) | **Soporte** |
| 3 · Qué quieres mejorar | ¿Qué quieres mejorar primero? | **Hasta 2**: pedidos más rápidos · inventario y costos · más pedidos digitales · clientes que regresen · entender ventas y ganancias · varias sucursales | **Soporte** |
| 4 · Tu panel | Te recomendamos este panel | Herramientas en **Esenciales · Recomendadas · Para más adelante**, cada una con el porqué. Salidas: *Usar esta configuración* · *Personalizar* · *Omitir* | **Soporte** |

Detalles de diseño que vale copiar:

- Si se buscó el negocio en Google, los pasos 1 y 2 **llegan contestados** con lo
  que Google sugiere; la persona solo confirma.
- **Dependencias explicadas, no ocultas**: al activar «Mesas» se activan Caja y
  Comandera, y la pantalla lo dice.
- «Menú digital» y «Mi negocio» **siempre** están activos.
- Lo no activado **no se pierde**: se agrega luego (`+ Agregar nueva herramienta`).
- Si declara un sistema anterior, el equipo contacta para ofrecer ayuda con la
  **mudanza**, y la guía añade tres pasos de migración (menú e insumos,
  clientes con puntos/saldo, historial de ventas) que se marcan solos.

## Primera visita al panel (**Soporte**)

1. **Recorrido de bienvenida**, 6 pantallas: Tus menús · Categorías y productos ·
   Personalización · Sucursales y QR · Ve tu menú como tus clientes ·
   Suscripción y pagos. «Siguiente/Atrás/Saltar»; **una vez por persona**.
2. **Configura tu menú en 2 pasos** (solo el Admin): (a) ¿menú también en inglés
   y funciones de IA? Sí/No; (b) cómo empezar: *Importar con IA* (PDF o foto,
   recomendado) · *Usar el de ejemplo* · *Empezar de cero*.
3. **Banner «Estás viendo datos de ejemplo»** mientras exista el menú de
   muestra, con *Importar mi menú con IA* y *Borrar datos de ejemplo*. Borrarlo
   quita menú, categorías y productos de ejemplo de **todas** las sucursales
   (las etiquetas se quedan) y es **recuperable 30 días**.

## La guía «Primeros pasos» (el cohete)

Botón en el topbar con el avance («N de 7»). **Observado** abierto en la cuenta
(`capturas/menus/topbar_cohete_primeros_pasos.png`). Cada paso **se marca solo**
cuando el sistema detecta el hecho; no hay casillas manuales.

| # | Paso | Se marca cuando… | Botón → destino |
|---|---|---|---|
| 1 | Sube tu logo y elige tus colores | Hay logo o cambió el color principal | Personalizar → `/app/appearance` |
| 2 | Crea o importa tu menú | Hay **≥5 platillos propios** (no de ejemplo) | Importar con IA → `/app/menus/import` |
| 3 | Agrega fotos a tus platillos | **≥5 platillos** con foto | Subir fotos → `/app/menus/photos` |
| 4 | Completa los datos de tu sucursal | Dirección, WhatsApp o teléfono, y horario | Completar datos → `/app/branches?abrir=datos` |
| 5 | Revisa tu menú como lo verán tus clientes | Se abre la vista previa | Ver vista previa → `/app/preview` |
| 6 | Activa tu menú | Cuenta en prueba o con plan activo | Activar |
| 7 | Descarga e imprime tu QR | Se descarga el QR de la sucursal | Descargar QR → `/app/branches?abrir=qr` |

Se puede minimizar, «Ya no mostrar», y algunos pasos traen video corto. Al
terminar: «¡Listo! Completaste tus primeros pasos» y el cohete desaparece.

## Acceso posterior (**Soporte**)

| Tema | Regla |
|---|---|
| Inicio de sesión | Correo + contraseña; redirige al panel que corresponda (restaurante, anfitrión, distribuidor, Colega Cards) |
| Intentos fallidos | Espera de unos minutos tras errores seguidos |
| 2FA | Código de 6 dígitos y códigos de respaldo de un solo uso; **obligatorio para su equipo interno**, aún no ofrecido a usuarios de restaurante |
| Varios restaurantes | Pantalla «Elige un restaurante»; luego selector arriba a la izquierda |
| Invitación al equipo | Correo con rol; **vale 7 días**; «Reenviar invitación»; si es primera vez, «Crea tu contraseña» (≥10) |
| Olvidé mi contraseña | Enlace de **1 hora**; respuesta idéntica exista o no la cuenta |
| Cuenta sin restaurantes | Pantalla propia; restaurante eliminado se recupera **30 días** |

## Lecciones para el onboarding de Nexus

1. **Una sola pregunta por pantalla**, con opciones grandes, y salida
   «Omitir por ahora» siempre visible.
2. **Precontestar** desde una fuente externa (aquí Google; en Nexus, NIT/RUT o
   Cámara de Comercio) y pedir solo confirmación.
3. **Activar módulos por respuestas** con las dependencias dichas en voz alta;
   nunca esconder lo que existe (coincide con la regla de Nexus de
   `distribucion-por-rubro.md`: «una función apagada se descubre, no se oculta»).
4. **Contenido de ejemplo reversible** (30 días) en vez de pantallas vacías.
5. **Checklist que se completa solo**, con umbrales objetivos (≥5 platillos) y
   cada paso enlazado a la pantalla exacta.
6. **Migración como ciudadana de primera**: elegir el sistema anterior cambia la
   guía.
7. Cuatro estados siempre presentes (carga, error, éxito, vacío): el vacío aquí
   es el banner de ejemplo + «Lo que puedes lograr».
