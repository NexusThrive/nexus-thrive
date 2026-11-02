# 15 · Flujo de adquisición, registro y activación

[← Índice](README.md) · Especificación para implementar «Assisted-first + Self-Service». **No es código.** Etiquetas: **[H]** hecho en el repo · **[A]** decidido por la dirección · **[C]** a confirmar · **[F]** futuro (no existe).

## 1. Principio [A]

Dos maneras de llegar, **un solo producto**. La implementación asistida prepara el negocio y lo entrega; después el cliente usa la misma experiencia que cualquiera. En esta etapa el autoservicio es «un completo reconocimiento del sistema»: **sin tarjeta** y con todo habilitado.

## 2. Decisiones tomadas [A]

| Tema | Decisión |
|---|---|
| Prueba | **15 días**, sin tarjeta |
| Qué incluye | Cuenta creada sin asistencia = **15 días del mejor plan** (`SIGNATURE`, el de mayor nivel [H: `PlanKey`]) |
| Visibilidad | Los días restantes se muestran **en la topbar** |
| Pago | Solo se pide tarjeta **cuando termina la prueba**; no antes |
| Mensaje | «15 días gratis · sin tarjeta» se repite en el pre-registro, el registro, el onboarding y la pantalla de creación (en lugar del tipo de plan) |
| Pre-registro | Datos básicos por ahora |
| Demo comercial | Formulario de **agendamiento**: datos completos (nombre, empresa, teléfono, correo) y selección de fecha. **Solo visual** por ahora; luego se conectará a n8n |
| Entrada a la app | En `app.nexusthrive.com.co` desaparece el *switch* de modo; se elige entre **«Ya estoy en Nexus»** y **«Soy nuevo»** |
| Animación | Se mejora la animación de **todos** los pasos del onboarding: una animación bien hecha por estado y continuidad entre ellos |

## 3. Recorrido de la ruta autoservicio

```
app.nexusthrive.com.co
  ├─ «Ya estoy en Nexus» ──► inicio de sesión ──► Inicio
  └─ «Soy nuevo» ──► 1 Pre-onboarding (presentación)
                     2 Pre-registro (datos básicos)
                     3 Registro (cuenta)
                     4 Onboarding (negocio)
                     5 Creación del espacio (animación)
                     6 «{Negocio} ya existe en Nexus» → Bienvenido a Nexus
                     7 «¡Te estábamos esperando!» (3 caminos)
                     8 Inicio, con los días de prueba en la topbar
```

| # | Pantalla | Qué hace | Estado hoy |
|---|---|---|---|
| 0 | **Selector de entrada** | Dos opciones claras; reemplaza al *switch* sin vida (`AuthModeSwitch`) | [H] existe el switch; [F] el selector |
| 1 | **Pre-onboarding** | Presenta Nexus en pocos pasos animados y lleva al pre-registro | [H] existe `IntroStory` (intro del onboarding); [F] como paso previo al registro |
| 2 | **Pre-registro** | Datos básicos + «15 días gratis · sin tarjeta» | [F] |
| 3 | **Registro** | Crear la cuenta (Clerk) | [H] |
| 4 | **Onboarding** | Perfil, negocio y confirmación; el paso «Acceso» deja de mostrar planes y muestra los 15 días | [H] pasos existentes; cambia el paso de plan |
| 5 | **Creación** | Animación «Creando tu negocio…» | [H] `CreationCinematic` |
| 6 | **Resultado + Bienvenida** | Se acorta la animación; aparece «{Negocio} ya existe en Nexus» y una pantalla **Bienvenido a Nexus**: descripción, botón **Continuar** y, debajo, la **mitad superior del dashboard con datos de ejemplo** y bordes redondeados (estilo de la landing) | [F] |
| 7 | **¡Te estábamos esperando!** | Tarjeta con tres caminos: Conocer Nexus · Configurar mi negocio · Empezar a trabajar | [F] |
| 8 | **Inicio con prueba** | Contador de días en la topbar | [F] |

### 3.1 Datos y reglas
- **Prueba [H→F]:** `Subscription` ya tiene `status = TRIAL`, `plan` y `currentPeriodEnd`: **no hace falta migración** para guardar «15 días del plan SIGNATURE». Hoy el onboarding crea `ESSENTIAL`; pasa a crear una suscripción `TRIAL` de 15 días.
- **Fin de la prueba [C]:** qué ocurre el día 16 (baja al plan gratuito `ESSENTIAL`, o se pide pago para continuar). La decisión anterior solo dice que entonces se pedirá tarjeta.
- **Códigos de acceso y tarjeta NFC [H]:** siguen funcionando; un negocio que entra con código conserva su plan acordado y **no** recibe la prueba.
- **Cuenta asistida:** no recibe la prueba de 15 días; lleva el plan acordado.
- **Captura de «ejemplo»:** el dashboard de la pantalla de bienvenida se compone con el componente real y datos ficticios, **rotulado como ejemplo**.

## 4. Formularios

| Formulario | Campos (propuesta) |
|---|---|
| **Pre-registro** [C] | Nombre · correo · tipo de negocio. Teléfono opcional |
| **Registro** | Los de la cuenta (correo y contraseña o proveedor) |
| **Onboarding** [H] | Perfil (persona o empresa) · nombre y datos básicos del negocio · rubro |
| **Demo (agendamiento)** | Nombre · empresa · correo · teléfono · fecha y hora · mensaje opcional |

**Demo solo visual [C, riesgo de honestidad]:** un formulario que parece enviarse y no hace nada contradice «datos reales o nada» (P3). Propuesta: mantenerlo detrás de una bandera apagada en producción hasta conectar n8n, o mostrar con claridad que la solicitud aún no se envía.

## 5. Animación del onboarding (todos los pasos)

Reglas: solo tokens de movimiento (`--d1`–`--d4`, curvas `--nx-ease-*`); un dueño por transición; sin librerías nuevas (GSAP ya existe); **movimiento reducido respetado**; ninguna animación es la única forma de entender el estado.

| Estado | Animación propuesta |
|---|---|
| Entrada al paso | Los elementos entran escalonados (`nx-rise`) |
| Cambio de paso | Salida breve del paso anterior y entrada del siguiente; el progreso avanza con continuidad |
| Foco y validación | Realce del campo, mensaje de error con entrada suave |
| Envío | Botón en estado «Guardando…» y transición a la siguiente pantalla sin parpadeo |
| Creación | La animación de la N, acortada; el cierre muestra «{Negocio} ya existe en Nexus» |
| Bienvenida | Aparición de la tarjeta, del botón **Continuar** y de la captura del dashboard |

**Continuidad:** el logo de la N y el fondo persisten entre pantallas (no se recargan), de modo que todo el onboarding se sienta una sola escena. Componentes existentes [H]: `IntroStory`, `OnboardingScene`, `PlanPicker`, `OnboardingReview`, `CreationCinematic`, `AccessStep`.

## 6. Fases de implementación

| Fase | Contenido | Depende de | Aceptación |
|---|---|---|---|
| **F1** Prueba de 15 días | El onboarding crea la suscripción `TRIAL` de 15 días del plan `SIGNATURE`; mensaje «15 días gratis · sin tarjeta» en el paso de acceso y la creación; indicador de días en la topbar | [C] fin de prueba | Una cuenta nueva autoservicio tiene `TRIAL` con fin a los 15 días y la topbar los muestra; una con código no |
| **F2** Entrada y pre-onboarding | Selector «Ya estoy en Nexus / Soy nuevo»; pre-onboarding; pre-registro básico con el mensaje de los 15 días | F1 | Desde `app.nexusthrive.com.co` se llega a cualquiera de los dos caminos; teclado, 320–1280 px y axe |
| **F3** Animación del onboarding | Una animación por estado y continuidad entre pasos (§5) | F2 | Sin saltos entre pasos; movimiento reducido respetado |
| **F4** Cierre del alta | Creación acortada, «{Negocio} ya existe en Nexus», **Bienvenido a Nexus** con dashboard de ejemplo, y «¡Te estábamos esperando!» con los tres caminos | F3 | Se ve una sola vez; cada camino llega a su destino |
| **F5** Demo (visual) | Formulario de agendamiento con fecha, sin envío real | [C] bandera | No promete un envío que no existe |
| **F6** Progreso de activación | «Primeros pasos» ampliado con hitos reales y primer valor | F4 | Cada paso se marca solo al ocurrir el hecho |
| **F7** Tours, ayuda, Academy, medición | Contenido y eventos | F6 | — |

**Orden:** F1 → F2 → F3 → F4 (que juntas entregan el flujo de registro mejorado) → F5 → F6 → F7. La entrega asistida en el Operations Center (etapas del cliente) queda fuera de esta tanda.

## 7. Pendientes

1. **[C]** Qué pasa al terminar los 15 días (plan gratuito `ESSENTIAL` o pago).
2. **[C]** Campos exactos del pre-registro.
3. **[C]** Cómo mostrar la demo sin engañar mientras no hay n8n.
4. **[C]** Dónde se muestra el contador en móvil (la topbar móvil es angosta).
5. **[PD]** Precios y límites definitivos del plan gratuito; Academy; Aha Moment por tipo de negocio.

## 8. Lo que no se promete

Precios, límites del plan gratuito, Academy, tours y medición no existen todavía. La captura del dashboard es un **ejemplo** con datos ficticios y debe decirlo.

## 9. Implementación (rama local, 2026-11-02) [H]

Rediseño desde cero del recorrido, con un concepto único: **THRIVE = crecer**. Una **línea de crecimiento** dorada en escalones (`GrowthLine`) vive al fondo de todas las pantallas y sube con el avance, del acceso a la creación del negocio. Pantalla única centrada, **una pregunta a la vez** (`JourneyFrame`); sin paneles divididos ni escenas decorativas.

| Pantalla | Qué hace | Archivo |
|---|---|---|
| Iniciar sesión | «Tu negocio sigue creciendo.», formulario de Clerk y, debajo, «¿Primera vez en Nexus? · 15 días gratis». Línea completa | `components/templates/auth-layout.tsx`, `onboarding/sign-in-form.tsx` |
| Registro conversacional (`/sign-up`) | 1) ¿Cómo te llamas? 2) ¿Qué negocio tienes? (avanza solo al elegir) 3) ¿Qué quieres tener en orden primero? (opcional) 4) Cuenta (Clerk con el nombre precargado). Las respuestas quedan arriba como un recibo; tocar una vuelve a esa pregunta | `onboarding/sign-up-journey.tsx` |
| Onboarding | Misma plantilla; la línea sigue subiendo. Si el registro ya respondió el foco, se salta la pregunta y precarga el rubro | `templates/onboarding-split.tsx`, `app/onboarding/_components/onboarding-wizard.tsx` |
| Creación | La N se traza al centro, las áreas elegidas se marcan como listas y la línea llega a la cima | `onboarding/creation-cinematic.tsx` |
| Bienvenida | La misma N viaja a su sitio, crece THRIVE letra a letra desde la base, botón Continuar y captura del Inicio (ejemplo, datos ficticios; oculta en móvil) | ídem |
| Primer ingreso | `?bienvenida=1` abre «¡Te estábamos esperando!» (una vez): Configurar · Conectar · **Explorar Nexus** = recorrido guiado por la interfaz real (menú, búsqueda, Crear, prueba, Inicio) | `onboarding/first-run-welcome.tsx`, `organisms/product-tour.tsx` |

**Decisiones provisionales [C]:** el pre-registro guarda solo nombre y rubro **en el navegador** (no se envía a ningún sistema; se borra al crear el negocio); el correo lo pide Clerk. El recorrido guiado no guarda si se completó (se ofrece solo en el primer ingreso). La demo comercial (formulario de agendamiento) sigue sin implementar.
