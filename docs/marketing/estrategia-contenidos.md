# Estrategia de contenidos — NEXUS Thrive

- **Estado:** propuesta operativa. No hay campañas publicadas ni resultados
  medidos.
- **Base:** capacidades reales del producto
  (`docs/nexus-architecture/product-vision.md`) y Brand Book
  (`docs/brand/brand-book.md`).

## 1. Objetivo

Que una pyme colombiana entienda, en una pieza, **qué problema del día
resuelve NEXUS y qué no resuelve todavía**. El contenido prepara la decisión de
compra; no la sustituye con promesas.

Objetivos medibles (a instrumentar antes de afirmar resultados):

- Solicitudes de demo o registro atribuibles a contenido.
- Activación: negocios que completan onboarding y registran su primera venta.
- Soporte: consultas repetidas que el contenido reduce.

## 2. Públicos

| Público | Dolor | Qué consume |
|---|---|---|
| Dueña/dueño de pyme | «No sé cómo va el día; cobro con cuaderno y WhatsApp» | Casos de operación, comparativas honestas, precio claro |
| Cajero/staff | «La caja se demora y me equivoco» | Guías de un minuto, atajos, videos cortos |
| Administrador | «Configurar módulos y permisos es confuso» | Guías de configuración, checklists |
| Prospecto técnico (aliado/contador) | «¿Se integra con lo que uso?» | Documentación de capacidades e integraciones reales |

## 3. Pilares editoriales

1. **Operación del día** — caja, cobros, inventario, turnos. Es el pilar
   principal: hay producto real detrás.
2. **Por rubro** — gimnasio, museo, constructora, comercio, servicios. Solo se
   publica el rubro con recetas reales (`VERTICAL_RECIPES`).
3. **Colombia práctica** — NIT, DIAN, pesos, WhatsApp, medios de pago locales.
   La facturación electrónica se trata como **plan**, no como función.
4. **Decisiones de negocio** — cómo elegir software, qué preguntar, cuándo
   cambiar. Contenido útil sin atacar competidores por nombre.
5. **Transparencia de producto** — qué está disponible, qué es parcial y qué
   falta, tomado del mapa de capacidades.

## 4. Formatos y canales

| Formato | Canal | Frecuencia propuesta | Requisito |
|---|---|---|---|
| Guía paso a paso | Centro de ayuda | continua, según soporte | capturas reales |
| Artículo de operación | Blog de la landing (otro repo) | 2 al mes | fuente y ejemplo real |
| Video corto | Redes | 2 al mes | grabado sobre producto real |
| Ficha de rubro | Web y ventas | 1 por rubro validado | receta real, no supuestos |
| Correo de producto | Base de usuarios | mensual | consentimiento y baja |
| Comparativa honesta | Web | trimestral | criterios públicos y verificables |

**Nota de alcance:** la landing y el blog viven en `nexusthrive.com.co`, otro
repositorio. Aquí se producen briefs, borradores y verificación; publicar allí
exige su propio flujo y autorización.

## 5. Flujo obligatorio de una pieza

```text
Investigación → brief → borrador → revisión de marca → verificación factual
→ aprobación humana → publicación autorizada → medición
```

Ninguna etapa se salta. La verificación factual comprueba cada cifra, cliente,
capacidad e integración contra el repositorio o una fuente declarada.

### Brief mínimo

- Objetivo y métrica asociada.
- Público y problema.
- Canal, formato y fecha objetivo.
- Mensaje principal, CTA y siguiente paso.
- Fuentes y afirmaciones a verificar.
- Capacidad del producto implicada (disponible / parcial / plan).
- Responsable, revisor y estado.

## 6. Calendario de arranque (sin fechas inventadas)

| Prioridad | Pieza | Motivo |
|---|---|---|
| 1 | «Cómo cerrar la caja del día sin descuadres» | Dolor diario con producto real |
| 2 | «Qué puede y qué no puede hacer NEXUS hoy» | Transparencia; evita expectativas falsas |
| 3 | «Checklist para registrar tu negocio y cobrar la primera venta» | Activación |
| 4 | Ficha de rubro del primer vertical validado | Segmentación real |
| 5 | «Preguntas para elegir software de negocio en Colombia» | Intención de compra |

Las fechas se fijan cuando exista responsable y capacidad de publicación.

## 7. Reglas de contenido

- No se inventan clientes, testimonios, cifras ni estudios.
- No se promete facturación DIAN, pagos en línea ni mensajería automática
  mientras estén en estado «falta» o «parcial».
- No se genera contenido masivo para posicionar.
- No se usa la marca de un competidor para confundir.
- Todo dato de terceros lleva enlace y fecha.
- Una pieza sin métrica debe declarar su objetivo (reputación, soporte) y aun
  así registrarse.

## 8. Medición

Definiciones y límites en [`medicion.md`](medicion.md). Hoy **no hay analítica
instalada**: no se puede afirmar ningún resultado de contenido.
