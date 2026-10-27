# Flujo GitLab → GitHub

[← Guías](guias/README.md)

Cómo viaja un cambio desde tu máquina hasta los dos remotos. GitLab es el
repositorio oficial; GitHub es una copia de solo lectura que se actualiza sola
con cada push. Las ramas, el CI y el despliegue están en
[guias/devops.md](guias/devops.md); aquí solo se cubre la relación entre los dos
remotos.

---

## 1. La regla

> GitLab es la puerta de entrada. GitHub es el espejo.

Todo se empuja y se fusiona en GitLab. GitHub recibe commits, ramas y tags por
*push mirroring*, pero no se toca: ni push, ni merge, ni edición en la web.

| Remoto | URL | Uso |
|---|---|---|
| `origin` | `http://100.116.222.50:8929/nexusthrive/nexus-thrive.git` | fetch y push |
| `github` | `https://github.com/NexusThrive/nexus-thrive.git` | solo lectura (`no_push`) |

GitLab solo escucha en la tailnet (`100.116.222.50:8929`), no en Internet. Sin
Tailscale no hay push: GitHub ya no es la vía de respaldo.

---

## 2. El ciclo normal

```bash
cd ~/Github/organizations/NexusThrive/nexus-thrive

git switch main
git pull

git switch -c docs/mi-cambio
# ...trabajas...
git add -A
git commit -m "docs(guias): explica el cambio"

git push -u origin docs/mi-cambio
```

El push imprime el enlace del merge request:

```
http://100.116.222.50:8929/nexusthrive/nexus-thrive/-/merge_requests/new?merge_request[source_branch]=docs/mi-cambio
```

Se abre contra `main`, se revisa y se fusiona **en GitLab**. GitHub tiene el
merge en segundos: el espejo reacciona al propio merge.

```bash
git switch main && git pull
git branch -d docs/mi-cambio
```

Prefijos de rama: `fix/`, `feature/`, `hotfix/`, `refactor/`, `docs/`
([devops.md §2](guias/devops.md#2-ramas)). Commits en español, imperativo y con
alcance: `fix(caja): no cobra dos veces una factura`.

---

## 3. Lo que no se hace

| Acción | Qué pasa |
|---|---|
| `git push github` | Bloqueado a propósito (`no_push`) |
| Fusionar un PR en GitHub | El siguiente sync fuerza `main` desde GitLab y ese merge desaparece |
| Crear ramas en GitHub | Quedan huérfanas: el espejo solo empuja lo que existe en GitLab |
| Editar archivos en la web de GitHub | Se sobrescriben en el siguiente sync si la rama existe en GitLab |
| Abrir un PR en GitHub | No se convierte en MR; solo existiría la rama |

Los merge requests se abren en GitLab, no en GitHub.

---

## 4. Casos particulares

**Tags y versiones.** Se crean en GitLab y viajan solos:
`git tag v1.1 && git push origin v1.1`. El procedimiento completo está en
[VERSIONADO.md](VERSIONADO.md). Las *releases* con notas no se replican.

**Borrar una rama.** Si la rama ya estaba fusionada en `main`, desaparece
también en GitHub. Si no estaba fusionada, GitHub la conserva para no perder
trabajo; bórrala a mano en GitHub si la quieres fuera.

**Force push.** El espejo fuerza GitHub contra GitLab, así que un force push en
GitLab se propaga igual. Solo se usa en ramas propias, nunca en `main`.

**CI.** Los Actions de GitHub siguen corriendo con cada push espejado, pero el
resultado se ve en GitHub, no en el MR de GitLab. Hoy no hay checks en el MR.

**Vercel.** Sigue desplegando previews por push de rama, pero ya no comenta en
PRs porque no hay PRs. Producción se despliega con el merge en `main`.

---

## 5. Operar el espejo

El espejo es un *push mirror* del proyecto de GitLab:

- Estado y errores: GitLab → *Settings → Repository → Mirroring repositories*.
  El botón *Update now* fuerza una sincronización.
- Última sincronización correcta: se puede consultar en esa misma pantalla.
- El espejo empuja todas las ramas y tags, no solo `main`.

**Los merges también se espejan.** El espejo se dispara en el `PostReceive` de
cada push, y un merge pasa por el mismo hook: no hay que pulsar *Update now* ni
nada parecido. Un cambio puede tardar varios minutos, pero no por falta de
disparo: es el *backoff* de GitLab, que retrasa 5 minutos cualquier
sincronización pedida poco después de otra (`backoff_delay`, issue 580289). En
este proyecto está desactivado con el feature flag de ops
`remote_mirror_no_delay`, activo **solo para `nexusthrive/nexus-thrive`**, no
global. Medido en este equipo: un merge aparece en GitHub en 12 segundos.

Si una actualización de GitLab retira el flag, el espejo sigue funcionando pero
puede tardar hasta 5 minutos por cambio. El flag está definido en
`config/feature_flags/ops/remote_mirror_no_delay.yml` del código de GitLab.

**Vigilante de fallos.** El espejo es el único camino a GitHub, así que si queda
en `failed` (token caducado, error de red, push rechazado) GitHub se congela
hasta que alguien lo mira. Un timer de systemd de usuario revisa el estado cada
minuto y vuelve a pedir la sincronización cuando hace falta, como mucho una vez
cada 5 minutos. No sincroniza por cambios de refs: de eso ya se encarga GitLab.

| Pieza | Ruta |
|---|---|
| Script | `~/.local/bin/nexus-mirror-sync` (copia en `scripts/ops/nexus-mirror-sync`) |
| Servicio | `~/.config/systemd/user/nexus-mirror-sync.service` |
| Timer | `~/.config/systemd/user/nexus-mirror-sync.timer` |
| Token | `~/.secrets/gitlab-mirror-sync-token` (project access token, scope `api`) |

Comandos útiles:

```bash
systemctl --user list-timers nexus-mirror-sync.timer   # cuándo corre
journalctl --user -u nexus-mirror-sync -n 20           # qué hizo
FORCE=1 ~/.local/bin/nexus-mirror-sync                 # reintentar ahora
systemctl --user disable --now nexus-mirror-sync.timer # detenerlo
```

**Instalarlo en otra máquina.** Hace falta el token de proyecto (GitLab →
*Settings → Access tokens* → rol Maintainer, scope `api`), guardado en
`~/.secrets/gitlab-mirror-sync-token` con permisos `600`:

```bash
install -m 755 scripts/ops/nexus-mirror-sync ~/.local/bin/
mkdir -p ~/.config/systemd/user
cp scripts/ops/systemd/nexus-mirror-sync.* ~/.config/systemd/user/
systemctl --user daemon-reload
systemctl --user enable --now nexus-mirror-sync.timer
loginctl enable-linger "$USER"   # que arranque sin sesión abierta
```

**Credencial.** GitHub es privado, así que el espejo se autentica con un token
fine-grained limitado a `NexusThrive/nexus-thrive` con `Contents: Read and
write`. GitLab lo guarda cifrado (`encrypted_credentials`); en el equipo vive en
`~/.secrets/github-mirror-token` con permisos `600`.

**Rotarlo.** Si el token caduca o se filtra:

1. GitHub → *Settings → Developer settings → Personal access tokens →
   Fine-grained tokens* → regenerar.
2. Guardar el valor en `~/.secrets/github-mirror-token`.
3. Actualizar la credencial en el espejo (Settings → Mirroring repositories →
   editar usuario y contraseña: usuario `x-access-token`, contraseña el token).
4. *Update now* y comprobar que el estado queda en `finished`.

Si el espejo lleva tiempo en error, GitHub se queda atrás. El vigilante
reintenta cada 5 minutos, pero si el fallo es la credencial hay que rotarla.

**Dependabot.** En GitHub está desactivado a propósito: creaba ramas y PRs en el
espejo que no se pueden fusionar allí ni se pueden devolver a GitLab. Las alertas
de vulnerabilidad siguen activas; las actualizaciones de dependencias se hacen
desde GitLab (a mano hoy; Renovate cuando se monte).

---

## 6. Resumen

```bash
git switch -c fix/algo      # rama desde main
git commit -am "fix(...): ..."
git push -u origin fix/algo # solo GitLab
# MR en GitLab → merge
git switch main && git pull
```

GitHub se actualiza solo y no se toca. Una frase: **rama → commit → push a
`origin` → MR en GitLab → merge → pull**.
