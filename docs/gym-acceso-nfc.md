# Control de acceso del gym · cómo funcionan las tarjetas

Resumen de las tres formas de entrar, del código de la tarjeta NFC y de por
qué el identificador **no** se cifra.

---

## 1. Los tres identificadores de un socio

El control de acceso (`/{negocio}/checkin`) busca al socio por **cualquiera**
de estos tres (`lib/business/gym-db.ts` → `findMemberByScan`):

| Identificador | Dónde está | Formato | Para qué sirve |
|---|---|---|---|
| **Código de socio** | `Customer.accessCode` | 8 caracteres del alfabeto `ABCDEFGHJKLMNPQRSTUVWXYZ23456789` (sin `0/O/1/I`) | El **QR** de la ficha y del carné |
| **UID de la tarjeta** | `Customer.nfcUid` | Hexadecimal, 6 a 32 caracteres (`04A1B2C3D4E5`), sin `:` | La **etiqueta NFC** física |
| **Documento** | `Customer.documentId` | Cédula | Cuando la persona escribe su documento |

## 2. Cómo leer en la puerta, según el teléfono

| Camino | Qué necesita | Dónde funciona |
|---|---|---|
| **QR con la cámara** | Solo la cámara del teléfono | **Todos**: Chrome, Edge, Safari (iPhone), Firefox. Si el navegador tiene `BarcodeDetector` (Chrome/Edge) decodifica nativo; si no (Safari, Firefox), decodifica con jsQR sobre la imagen de la cámara. |
| **Tarjeta NFC con el teléfono** | NFC del teléfono + Web NFC | **Solo Chrome con Android**. En iPhone y en Firefox **el botón no aparece**: la web de iOS no expone NFC. |
| **Escribir el código** | Nada | Todos: el código de socio, el serial de la tarjeta o el documento. |
| **Lector USB** | Nada (se comporta como teclado) | Todos: los lectores de QR y de tarjetas escriben el código en la casilla. |

Resumen: **el QR es el camino universal** (solo cámara), y el NFC es un extra
para quien tenga Chrome en Android.

### Qué código tiene que tener la tarjeta NFC

**Ninguno.** La etiqueta no lleva un código de NEXUS ni una URL: el sistema
lee el **número de serie del chip** (UID), que el fabricante graba en la
etiqueta. Tú solo lo lees y lo escribes en "Vincular".

- Etiquetas válidas: cualquier **NTAG213 / 215 / 216** (13,56 MHz). Cuestan
  muy poco y se venden como "sticker NFC" o "tarjeta NFC".
- El UID depende del chip: un NTAG213 suele traer 7 bytes
  (`04:A1:B2:C3:D4:E5`); el sistema lo guarda sin los `:` y en mayúsculas
  (`04A1B2C3D4E5`).
- **No escribas nada dentro de la etiqueta**: para NEXUS da igual el
  contenido; lo que importa es el serial.

### Cómo leer el serial

| Con el teléfono | Cómo |
|---|---|
| **Android + Chrome** | "Vincular" → **"Leer con este teléfono"** → acerca la etiqueta. También en el checkin: "Leer tarjeta con este teléfono". |
| **iPhone (cualquier navegador)** | No hay NFC web en iOS, así que el botón no aparece. Usa una app de NFC (TagInfo, NFC Tools, ChipInfo) → copia el **ID/serial** → pégalo en "Vincular". |
| **PC** | Lector NFC USB: se comporta como teclado y escribe el UID en la casilla. |

En la ficha → **Acceso al gimnasio → Vincular** → escribe el serial →
**Guardar tarjeta**. Dos socios no pueden tener la misma tarjeta (el sistema
lo avisa).

## 3. El QR: sí se puede compartir (y por eso conviene rotarlo)

El código de socio es un **identificador con una clave aleatoria de ~40
bits**: no se adivina probando (31⁸ ≈ 8,5 × 10¹¹ combinaciones), pero
**quien tenga una foto del carné puede entrar**. Por eso:

- El QR es como una tarjeta de delving: personal e intransferible.
- Si se pierde o se photographea, en la ficha hay **"Nuevo"**: genera otro
  código y el anterior deja de servir.
- La puerta muestra la **foto y el nombre** en grande: quien recibe es una
  persona, no un código.

### ¿Por qué no se cifra?

- **El UID de la NFC no se puede cifrar**: es el número público del chip. Una
  etiqueta NTAG común se puede clonar (escribir el mismo serial en otra
  etiqueta) sin ninguna dificultad. "Cifrar" el identificador no impediría
  eso: el lector lee lo que el chip responda. Contra el clonado juega la
  defensa del **proceso en la puerta** (foto, nombre, quién registra la
  entrada) y la **auditoría**.
- **El código de socio tampoco se puede cifrar sin romper la búsqueda**: si
  se guardara cifrado, el sistema no podría encontrar al socio escaneando el
  código (no puede buscar por un texto cifrado). La forma correcta de
  proteger un identificador que se busca es: que sea largo y aleatorio
  (ya lo es), que se pueda **rotar** (ya se puede) y que quede **registrado
  todo lo que pasa en la puerta** (esto es lo que se acaba de añadir).

## 4. Qué se registra en la puerta

Cada escaneo deja rastro en la tabla de asistencia:

- **Entradas permitidas y negadas**: con foto, método (QR / Tarjeta / Manual),
  hora y quién lo registró.
- **Códigos desconocidos** (nuevo): si lo escaneado no corresponde a nadie,
  ahora también queda guardado, con el texto escaneado. Antes se perdían, y
  no había forma de ver que alguien estaba probando códigos o clonando
  tarjetas. En el panel del gym sale como **"Códigos desconocidos"** en el
  contador de arriba.
- **Freno a la fuerza bruta**: quien más de 120 escaneos por minuto recibe
  "Demasiados escaneos seguidos".

## 5. Resolver problemas

| Síntoma | Causa | Solución |
|---|---|---|
| No aparece "Leer tarjeta con este teléfono" | El navegador no tiene Web NFC (iOS, Firefox) | Escribe el serial a mano (lo lees con una app de NFC) o usa el QR con la cámara |
| No aparece "Leer con la cámara" | El navegador no tiene cámara o el permiso está negado | Revisa el permiso de cámara del navegador; siempre puedes escribir el código |
| "El código de la tarjeta no es válido" | El serial no es hexadecimal de 6 a 32 caracteres | Copia el ID completo de la app de NFC |
| "Esa tarjeta ya es de {otro}" | El serial está vinculado a otro socio | Quítasela al otro socio o usas otra etiqueta |
| "No se encontró ningún socio con ese código" | El código no existe o el socio está inactivo | Revisa que la membresía esté activa |
