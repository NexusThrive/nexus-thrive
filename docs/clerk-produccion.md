# Clerk en producción · app.nexusthrive.com.co

Guía para dejar el acceso (login) funcionando en el dominio propio. Es el
punto que más se olvida al cambiar de dominio: **Clerk no "registra" el
dominio solo con añadirlo**; hay tres cosas que deben coincidir.

---

## 1. Cómo funciona por dentro

El login no es HTML de nuestra app: Clerk lo monta en el navegador.

```
navegador → https://<host-de-Clerk>/npm/@clerk/clerk-js@6/dist/clerk.browser.js
          → el script monta el formulario dentro de <SignIn />
```

Ese **host de Clerk** sale de la *Publishable Key* (`pk_live_…`): está
codificado dentro de la key. Si ese host no responde, la página carga pero
**el formulario no aparece** (columna en blanco). Es el síntoma clásico.

La *Publishable Key* de producción **cambia cuando cambias el dominio** de la
instancia. Por eso, tras cambiar el dominio en Clerk, hay que volver a poner
la key nueva en el hosting.

---

## 2. Los tres puntos que deben coincidir

| # | Dónde | Qué |
|---|-------|-----|
| 1 | **Dashboard de Clerk** → Dominios | El dominio de la app (`app.nexusthrive.com.co`) registrado **y verificado** (el check en verde). |
| 2 | **Dashboard de Clerk** → API Keys | La **Publishable Key de producción** (`pk_live_…`) y el **Secret Key** (`sk_live_…`) copiados al hosting. |
| 3 | **DNS** | El CNAME del Frontend API apuntando al host que pide Clerk. |

### El CNAME en un dominio con subdominio

Como la app vive en `app.nexusthrive.com.co` y el **raíz `nexusthrive.com.co`
es el landing (otro repo)**, el CNAME de Clerk va **en el subdominio**, no en
el raíz:

```
clerk.app.nexusthrive.com.co  CNAME  frontend-api.clerk.services
```

Eso es exactamente lo que Clerk pide en *Domains → DNS Configuration*. El
CNAME **no** se pone en `nexusthrive.com.co`: el landing no usa Clerk y no
debe tocar ese registro.

> Si en el dashboard el CNAME aparece con otro nombre de host (por ejemplo
> `clerk.nexusthrive.com.co`), usa **el que te muestre el dashboard**: ese es
> el que Clerk valida. El importantísimo es que resuelva al host de la
> Frontend API y que la instancia lo reconozca.

Además, en **Dashboard de Clerk → Allowed origins** (o *Allowed URLs*) deben
estar los orígenes reales de la app, por ejemplo:

- `https://app.nexusthrive.com.co`
- `http://localhost:3001` (para desarrollo)

Y en **Redirect URLs**: `/sign-in`, `/sign-up`, `https://app.nexusthrive.com.co/auth/callback`.

> Si el dominio no está en *Allowed origins*, Clerk monta el formulario pero
> al enviarlo responde "origin not allowed".

---

## 3. Diagnóstico rápido

```bash
# 1. ¿A qué host de Clerk apunta la app? (debe salir en el HTML)
curl -s https://app.nexusthrive.com.co/sign-in | grep -o 'clerk\.browser\.js'

# 2. ¿Ese host responde?
curl -sI https://<host-de-Clerk>/npm/@clerk/clerk-js@6/dist/clerk.browser.js

# 3. ¿El CNAME del subdominio resuelve a la FAPI?
dig +short clerk.app.nexusthrive.com.co
#   -> frontend-api.clerk.services  (o worker.clerkprod-cloudflare.net)

# 4. ¿Clerk reconoce la instancia en ese host?
curl -s https://clerk.app.nexusthrive.com.co/v1/client | head -c 120
#   -> {"response":{"object":"client",...}}   (si dice host_invalid, la key no corresponde)

# 5. ¿La página responde y a dónde manda?
curl -s -o /dev/null -w '%{http_code} -> %{redirect_url}\n' https://app.nexusthrive.com.co/
```

| Síntoma | Causa | Arreglo |
|---|---|---|
| Columna derecha vacía, sin error | El script de ClerkJS no baja (host inalcanzable) | Key de producción nueva + DNS del FAPI |
| "origin not allowed" | El dominio no está en *Allowed origins* | Añadirlo en el dashboard |
| "host_invalid" al pedir `/v1/client` | La Publishable Key no corresponde a esa instancia | Copiar la key nueva de *API Keys* |
| Redirige en loop | `NEXT_PUBLIC_CLERK_SIGN_IN_URL` mal apuntada | Debe ser una ruta (`/sign-in`) |
| "Session token missing" | Secret key de desarrollo en producción | `CLERK_SECRET_KEY=sk_live_…` |

---

## 4. Plan B: proxy de la Frontend API

Si el host de Clerk no es alcanzable desde tu red (firewall del hosting, DNS
corporativo, certificado pendiente) o si quieres **no depender de la key
nueva**, se puede servir el script **desde el propio dominio**:

1. En el Dashboard de Clerk → Dominios → Frontend API → *Set proxy
   configuration* → `https://app.nexusthrive.com.co/__clerk`.
2. En el hosting (Vercel), añadir `NEXT_PUBLIC_CLERK_PROXY_URL=/__clerk`.
3. Redesplegar.

El middleware (`proxy.ts`) ya lo soporta: cuando esa variable existe, Clerk
manda el proxy de la Frontend API en `/__clerk`. **Probado en local**: el
login se monta completo y el script se pide a
`{base}/__clerk/npm/@clerk/clerk-js@6/dist/clerk.browser.js`.

Con el proxy, la Publishable Key puede seguir siendo la que tengas puesta:
el SDK deriva la URL del proxy desde la petición.

---

## 5. Red de seguridad en la app

`components/molecules/auth-mount-fallback.tsx` vigila que Clerk monte el
formulario. Si tras 6 s no aparece, el usuario ve un aviso con "Reintentar"
y "Escríbenos" en lugar de una columna en blanco. Se puede quitar cuando el
dominio esté estable.
