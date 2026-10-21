# Ideas e implementaciones importantes

Lista de lo que **falta o conviene hacer**, ordenada por prioridad. Cada punto
dice qué es, por qué importa y cómo quedaría. Lo que ya está hecho no está
aquí: eso vive en el [CHANGELOG](CHANGELOG.md).

---

## 1. Invitación al equipo por correo (lo primero)

**Qué pasa hoy:** el Propietario crea la ficha del integrante en
*Operaciones Center → Equipo* con su correo y su rol. Después le dice por
WhatsApp "entra con ese correo". Si la persona se registra con otra cuenta
(Google en vez de correo, o un segundo registro), el enlace falla y termina
creando un negocio por error. Nada avisa de eso.

**Qué debería pasar:** al invitar, NEXUS le manda un correo a ese endereço con
un enlace de un solo uso (`/invitacion/{token}`) que:
1. valida el token y lo consume (no se puede reutilizar);
2. crea o abre la cuenta de Clerk con **ese** correo;
3. deja a la persona ya vinculada a la ficha del equipo y la lleva al panel.

Así el alta deja de depender de que la persona recuerde con qué cuenta se
registró, y el equipo se puede auditar ("invitó / se vinculó / entró").

**Cómo hacerlo:**
- Falta `RESEND_API_KEY` + `INBOX_EMAIL_FROM` en producción (o usar el
  webhook de Clerk para el envío).
- Tabla `StaffInvite` (token, correo, rol, expira, usado) → o reutilizar
  `BenefitCode` con `kind = 'PAID'`… no: mejor una tabla propia, porque el
  flujo es distinto (no da acceso, da de alta una cuenta).
- Acción de servidor `acceptStaffInviteAction(token)`: valida, vincula la ficha
  por correo y redirige a `/auth/callback`.
- Botón "Copiar invitación" en el panel de equipo, para enviarlo a mano por
  WhatsApp si el correo no llega.
- Mientras tanto, el botón **"Desvincular cuenta"** (ya implementado) resuelve
  a mano el caso de la cuenta duplicada.

**Es medible:** hoy el enlace por correo es silencioso; con la invitación, cada
alta queda con estado (invitado, vinculado,entró) y nadie cae por error en el
onboarding.

---

## 2. Que el equipo de NEXUS no sea cliente de sí mismo

**Qué pasa hoy:** el equipo trabaja en el panel (`/admin`). Si además quiere
usar NEXUS para su propio negocio, hoy el onboarding lo bloquea (decisión
del 20 de octubre: el correo del equipo va siempre al panel).

**Idea:** separar los dos papeles con un rol o un distintivo: "soy del equipo de
NEXUS y quiero mi negocio aquí". Que sea una decisión consciente, no una
consecuencia de que el correo esté en la tabla de equipo.

---

## 3. Wompi: cobro real de los planes

**Qué pasa hoy:** el piloto cobra a mano (confirmación por WhatsApp) y NEXUS
emite un código de acceso con los días pagados. Funciona, pero cada venta es
manual.

**Qué falta:** checkout con tarjeta/PSE/Nequi (Wompi), webhook que confirme el
cobro y active el plan solo. Variables: `WOMPI_PUBLIC_KEY`,
`WOMPI_INTEGRITY_SECRET`, `WOMPI_EVENTS_SECRET`.

**Con eso:** el código "de pago" deja de ser manual y el panel de equipo puede
dejar de emitir códigos a mano.

---

## 4. Que la persona vea de dónde viene su acceso

Ahora el onboarding no dice nada de por qué tiene un plan gratis o de pago. Con
el modelo de dos tipos de código, la ficha del negocio podría mostrar:
"Acceso de cortesía hasta el 12 de noviembre" o "Plan pagado (30 días) hasta
el 12 de noviembre", con un enlace a "hablar con NEXUS".

Es la mitad de la confianza: la persona entiende que su acceso tiene fecha.

---

## 5. Avisos al equipo: accesos que se vencen, cuentas duplicadas, intentos raros

**Qué pasa hoy:** el panel *Accesos* y la asistencia muestran lo que pasó, pero
nadie recibe un aviso. Debería llegar un resumen (por WhatsApp o correo) de:
- códigos de acceso que se usaron;
- socios con membresía por vencer;
- intentos de escaneo con códigos desconocidos (ya se registran, falta el
  aviso);
- integrantes que se vincularon por correo.

---

## 6. Rotación y revocación de las tarjetas NFC

Hoy la tarjeta es el número de serie del chip: se puede clonar escribiendo el
mismo serial en otra etiqueta. Las NTAG con memoria protegida (Ultralight EV1,
NTAG 424 DNA) suben el listón, y se podría además registrar el "estado" de
cada etiqueta (activa, reportada, dada de baja) y mostrarlo en la ficha del
socio.

---

## 7. El QR del carné, con rotación

El código de socio es un identificador aleatorio de 8 caracteres: no se adivina,
pero se puede copiar. Podría ser de un solo uso por día (como los códigos de
acceso de losotestICKET), o rotar cada cierto tiempo, sin perder la
comodidad del carné impreso.

---

## 8. El panel de equipo, más claro

Hoy el equipo ve una lista de personas. Faltaría: quién linked su cuenta, quién
entró por última vez, quién está en pausa y por qué, y un historial de cambios
(rol, activación, vinculación).

---

## 9. Decisiones de negocio que siguen abiertas

- **Tramo de clientes en Essential**: hoy suma su precio también al plan
  gratuito (con 500 clientes cuesta $10). ¿Essential no lo paga?
- **Moneda**: la app usa USD y el público es colombiano. ¿Se pasa a COP?
- **Precios finales** de los planes y de las webs profesionales.
- **QR fijo `ELITE30`**: hoy es ilimitado y se puede pausar. Si se filtra,
  ¿se pausa y se emite otro, o se cambia a un uso por persona?
