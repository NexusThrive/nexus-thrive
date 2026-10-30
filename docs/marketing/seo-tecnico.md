# SEO técnico — auditoría de rutas reales

- **Fecha:** 2026-10-25
- **Alcance:** esta aplicación (`nexus-thrive`). La landing pública vive en
  otro repositorio (`nexusthrive.com.co`) y **no** se auditó aquí.
- **Regla:** solo se auditan rutas implementadas. Este documento no promete
  posiciones, tráfico ni indexación.

## 1. Método

1. Se enumeraron las rutas reales desde `app/` (`page.tsx`).
2. Se revisaron metadatos, `robots`, `sitemap` y rutas con token en el código.
3. No se ejecutó un crawl contra producción ni se consultó Search Console:
   **no hay credenciales ni datos disponibles**. Cualquier conclusión sobre
   impresiones, clics o posiciones queda fuera de este documento.

## 2. Hallazgos

| # | Hallazgo | Evidencia | Severidad | Estado |
|---|---|---|---|---|
| 1 | No existía `robots.txt` generado | ausencia de `app/robots.ts`/`robots.txt` | alta | corregido (`app/robots.ts`) |
| 2 | No existía sitemap | ausencia de `app/sitemap.ts`/`sitemap.xml` | alta | corregido (`app/sitemap.ts`) |
| 3 | Descripción raíz genérica («plataforma de gestión de negocios») | `app/layout.tsx` | media | corregido: describe la propuesta real |
| 4 | Sin `metadataBase`, las URLs canónicas/OG dependían del host | `app/layout.tsx` | media | corregido con `NEXT_PUBLIC_APP_URL` y respaldo de producción |
| 5 | Rutas privadas no declaradas como no indexables | `/admin`, `/[tenant]`, `/r/`, `/c/`, `/pay/`, `/encuesta/`, `/invitacion/` | alta | mitigado en `robots.txt`; las páginas además exigen sesión o token |
| 6 | El título raíz no describe la página de inicio | `app/page.tsx` sin `metadata` propia | baja | pendiente: definir mensaje de la home antes de cambiarlo |
| 7 | Sin datos estructurados (schema.org) | no hay JSON-LD | baja | pendiente: solo si aporta y es correcto |
| 8 | Sin métricas de rendimiento medidas | no hay instrumentación ni Lighthouse registrado | media | pendiente: requiere entorno y decisión de herramienta |
| 9 | Sin analítica instalada | búsqueda de `gtag`/`posthog`/`plausible` sin resultados | alta para medir | bloqueado: no hay fuente de datos |

## 3. Rutas públicas y su intención

| Ruta | Intención | Indexable | Nota |
|---|---|---|---|
| `/` | Marca / propuesta | sí | falta metadata específica (hallazgo 6) |
| `/pricing` | Precio y planes | sí | título propio correcto |
| `/sign-in`, `/sign-up` | Acceso | no | excluidas en `robots.txt` |
| `/onboarding` | Alta de negocio | no | excluida |
| `/admin/**` | Operación interna | no | excluida y protegida por sesión/rol |
| `/[tenant]/**` | Operación del negocio | no | datos privados; el layout exige membresía |
| `/c/[code]`, `/r/[token]`, `/pay/[reference]`, `/encuesta/[token]`, `/invitacion/[token]` | Enlaces de un solo uso | no | excluidas y con token |

## 4. Verificación

```bash
# El proyecto debe compilar; los archivos son route handlers de metadata.
pnpm exec tsc --noEmit

# En ejecución local:
curl -s http://localhost:3000/robots.txt
curl -s http://localhost:3000/sitemap.xml
```

Criterio de aceptación: `robots.txt` incluye `Sitemap:` y las rutas privadas;
`sitemap.xml` contiene solo `/` y `/pricing`.

## 5. Limitaciones declaradas

- No hay acceso a Google Search Console, Bing Webmaster Tools ni a datos de
  producción.
- La landing (`nexusthrive.com.co`) pertenece a otro repositorio: su SEO no se
  evalúa aquí.
- No se midió Core Web Vitals; no se afirma que el rendimiento sea bueno.
- La indexación efectiva depende de despliegue, dominio y configuración de
  Vercel, que no se verificaron en este entorno.

## 6. Siguientes pasos

1. Definir el mensaje y título de `/` (Product Owner + Copywriter).
2. Decidir si se publica contenido educativo en este repo o en la landing.
3. Instrumentar analítica con consentimiento antes de afirmar cualquier
   resultado orgánico.
4. Cuando exista Search Console: registrar consultas, páginas y clics reales,
   y comparar contra este documento.
