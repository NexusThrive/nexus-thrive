# Blobatars para clientes — plan de implementación

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Que cada cliente sin foto muestre un blobatar determinista en todas las superficies donde aparece, conservando la foto cuando exista.

**Architecture:** Un helper puro en `lib/business/customers/avatar.ts` deriva la semilla y decide entre foto y blobatar; `customerFace()` produce el `src` definitivo usando `blobatar/uri` (data URI, sin red). Un único componente `CustomerAvatar` pinta un `<img>` estático y decorativo, de modo que funciona igual en Server y Client Components. Cada superficie conserva sus tamaños, radios y contenedores actuales.

**Tech Stack:** Next.js 16.3.8, React 19.2.8, TypeScript 5, `blobatar@^2.7.0` (entrada `blobatar/uri`), Vitest 5, Storybook 10.

**Spec:** `docs/superpowers/specs/2026-11-08-blobatar-clientes-design.md`

## Global Constraints

- Instalar solo `blobatar@^2.7.0`; **no** instalar `@blobatar/react`, no usar `blobatar.dev` ni ninguna petición de red.
- Semilla en este orden exacto: nombre → correo → teléfono → id → `"cliente"`; el nombre se recorta, se colapsa el espacio interno y se pasa a minúsculas.
- La foto cargada siempre gana sobre el blobatar.
- Render estático: un solo `<img>`; sin SVG inline, sin `motion.css`, sin animación.
- La cara es decorativa: `alt=""` y `aria-hidden="true"`; el nombre siempre está escrito junto a ella.
- No cambiar formas, tamaños ni radios de los contenedores existentes.
- Cero cambios de esquema o de datos persistidos.
- Fuera de alcance: avatares de equipo/usuarios internos (`Initials` de responsables), `agenda-timeline`, registro público y `app/admin/equipo`.
- Comentarios y textos de interfaz en español, con el estilo del repositorio.

## Review Focus

1. **Identidad completamente vacía** (vista previa del alta sin nombre ni contactos): debe renderizar una cara válida, nunca un `src` roto ni una excepción. Lo fija `customerFace({})` en la tarea 1.
2. **Nombre que solo difiere en mayúsculas, tildes conservadas o espacios**: misma cara, para que la vista previa no cambie al guardar. Lo fija la prueba de normalización de la tarea 1.
3. **Foto presente con nombre vacío o ausente**: la foto debe ganar igualmente. Lo fija `customerFace({}, "/api/files/foto-1")` en la tarea 1.
4. **Homónimos y nombres distintos**: los homónimos comparten cara (decisión aceptada) y nombres distintos no. Lo fijan las pruebas de determinismo de la tarea 1.
5. **Nombre muy largo, emoji o solo espacios**: el data URI debe seguir siendo válido y determinista sin lanzar. Lo fija la prueba de entradas extremas de la tarea 1.

---

## Estructura de archivos

| Archivo | Responsabilidad |
|---|---|
| `lib/business/customers/avatar.ts` (nuevo) | Semilla normalizada y decisión foto/blobatar. Sin React. |
| `components/atoms/customer-avatar.tsx` (nuevo) | `<img>` decorativo con la cara ya resuelta. |
| `components/atoms/customer-avatar.stories.tsx` (nuevo) | Estados sin foto, con foto y variedad determinista. |
| `tests/unit/business/customer-avatar.test.ts` (nuevo) | Semilla, prioridad de foto y determinismo. |
| Superficies de Contactos, CRM, WhatsApp y check-in | Sustituir iniciales locales por `CustomerAvatar`. |

---

### Task 1: Dependencia, semilla y decisión de cara

**Files:**
- Modify: `package.json`, `pnpm-lock.yaml` (vía `pnpm add`)
- Create: `lib/business/customers/avatar.ts`
- Test: `tests/unit/business/customer-avatar.test.ts`

**Interfaces:**
- Consumes: `blobatarUri(name: string, opts?: BlobatarOptions): string` de `blobatar/uri`.
- Produces:
  - `type AvatarIdentity = { name?: string | null; email?: string | null; phone?: string | null; id?: string | null }`
  - `type CustomerFace = { kind: "photo" | "blobatar"; src: string }`
  - `avatarSeed(identity: AvatarIdentity): string`
  - `customerFace(identity: AvatarIdentity, photoUrl?: string | null): CustomerFace`

- [ ] **Step 1: Instalar la dependencia**

Run: `pnpm add blobatar@^2.7.0`
Expected: `package.json` incluye `"blobatar": "^2.7.0"` en `dependencies` y `pnpm-lock.yaml` queda actualizado.

- [ ] **Step 2: Escribir la prueba que falla**

```ts
import { describe, expect, it } from "vitest";
import { avatarSeed, customerFace } from "@/lib/business/customers/avatar";

const DATA_URI = /^data:image\/svg\+xml,/;

describe("semilla del avatar de cliente", () => {
  it("normaliza el nombre: recorta, colapsa espacios y pasa a minúsculas", () => {
    expect(avatarSeed({ name: "  María   Pérez  " })).toBe("maría pérez");
  });

  it("usa nombre → correo → teléfono → id y cae en «cliente»", () => {
    expect(avatarSeed({ name: "", email: "MARIA@CORREO.COM" })).toBe("maria@correo.com");
    expect(avatarSeed({ name: " ", phone: "300 123 4567" })).toBe("300 123 4567");
    expect(avatarSeed({ id: "cus_123" })).toBe("cus_123");
    expect(avatarSeed({})).toBe("cliente");
  });

  it("da la misma cara a nombres que solo difieren en mayúsculas o espacios", () => {
    expect(customerFace({ name: "María Pérez" }).src).toBe(customerFace({ name: " maría   pérez " }).src);
  });

  it("da caras distintas a nombres distintos y la misma a homónimos", () => {
    expect(customerFace({ name: "María" }).src).not.toBe(customerFace({ name: "Laura" }).src);
    expect(customerFace({ name: "María" }).src).toBe(customerFace({ name: "María", id: "otro" }).src);
  });

  it("prefiere la foto aunque no haya nombre", () => {
    expect(customerFace({}, "/api/files/foto-1")).toEqual({ kind: "photo", src: "/api/files/foto-1" });
  });

  it("genera un data URI válido sin foto, incluso con nombres largos o vacíos", () => {
    expect(customerFace({ name: "María" }).kind).toBe("blobatar");
    for (const identity of [{}, { name: "x".repeat(500) }, { name: "👩‍🦰 Ana" }]) {
      expect(customerFace(identity).src).toMatch(DATA_URI);
    }
  });
});
```

- [ ] **Step 3: Ejecutar la prueba y verificar que falla**

Run: `pnpm test tests/unit/business/customer-avatar.test.ts`
Expected: FAIL; no se puede resolver `@/lib/business/customers/avatar`.

- [ ] **Step 4: Implementar el helper**

```ts
import { blobatarUri } from "blobatar/uri";

/** Datos mínimos para identificar a un cliente aunque falte alguno. */
export type AvatarIdentity = {
  name?: string | null;
  email?: string | null;
  phone?: string | null;
  id?: string | null;
};

export type CustomerFace = { kind: "photo" | "blobatar"; src: string };

/** Semilla estable: nombre normalizado → correo → teléfono → id → «cliente». */
export function avatarSeed(identity: AvatarIdentity): string {
  for (const value of [identity.name, identity.email, identity.phone, identity.id]) {
    const seed = value?.trim().toLocaleLowerCase("es").replace(/\s+/g, " ");
    if (seed) return seed;
  }
  return "cliente";
}

/** La foto manda; sin foto, un blobatar determinista a partir de la identidad. */
export function customerFace(identity: AvatarIdentity, photoUrl?: string | null): CustomerFace {
  return photoUrl
    ? { kind: "photo", src: photoUrl }
    : { kind: "blobatar", src: blobatarUri(avatarSeed(identity)) };
}
```

- [ ] **Step 5: Ejecutar la prueba y verificar que pasa**

Run: `pnpm test tests/unit/business/customer-avatar.test.ts`
Expected: PASS, 6 pruebas.

- [ ] **Step 6: Commit**

```bash
git add package.json pnpm-lock.yaml lib/business/customers/avatar.ts tests/unit/business/customer-avatar.test.ts
git commit -m "feat(clientes): semilla y cara determinista con blobatar"
```

---

### Task 2: Componente `CustomerAvatar` e historia de Storybook

**Files:**
- Create: `components/atoms/customer-avatar.tsx`
- Create: `components/atoms/customer-avatar.stories.tsx`

**Interfaces:**
- Consumes: `AvatarIdentity`, `customerFace` de `@/lib/business/customers/avatar`; `cn` de `@/lib/utils`.
- Produces: `CustomerAvatar({ identity, photoUrl, className }: { identity: AvatarIdentity; photoUrl?: string | null; className?: string })`.

- [ ] **Step 1: Crear el componente**

```tsx
import { type AvatarIdentity, customerFace } from "@/lib/business/customers/avatar";
import { cn } from "@/lib/utils";

/**
 * Cara del cliente: su foto si existe; si no, un blobatar determinista.
 * Es decorativa porque el nombre siempre está escrito al lado.
 */
export function CustomerAvatar({
  identity,
  photoUrl = null,
  className,
}: {
  identity: AvatarIdentity;
  photoUrl?: string | null;
  className?: string;
}) {
  const face = customerFace(identity, photoUrl);
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={face.src} alt="" aria-hidden="true" draggable={false} className={cn("shrink-0 object-cover", className)} />
  );
}
```

Sin `"use client"`: no usa hooks y debe poder renderizarse desde Server Components.

- [ ] **Step 2: Crear la historia**

```tsx
import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { CustomerAvatar } from "./customer-avatar";

const meta = {
  title: "Átomos/CustomerAvatar",
  component: CustomerAvatar,
} satisfies Meta<typeof CustomerAvatar>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Sin foto: la cara se deriva del nombre. */
export const SinFoto: Story = {
  args: { identity: { name: "María Pérez" }, className: "size-14 rounded-md" },
};

/** Con foto: la imagen cargada tiene prioridad. */
export const ConFoto: Story = {
  args: { identity: { name: "María Pérez" }, photoUrl: "/icons/apple-touch-icon.png", className: "size-14 rounded-md" },
};

/** Misma identidad, misma cara; identidades distintas, caras distintas. */
export const Deterministas: Story = {
  render: () => (
    <div className="flex items-end gap-3">
      {["María Pérez", "Laura Gómez", "Sofía Díaz", "María Pérez"].map((name, i) => (
        <CustomerAvatar key={i} identity={{ name }} className="size-14 rounded-md" />
      ))}
    </div>
  ),
};
```

- [ ] **Step 3: Verificar tipos y Storybook**

Run: `pnpm exec tsc --noEmit`
Expected: sin errores.

Run: `pnpm build-storybook`
Expected: compila y genera `storybook-static` sin errores.

- [ ] **Step 4: Commit**

```bash
git add components/atoms/customer-avatar.tsx components/atoms/customer-avatar.stories.tsx
git commit -m "feat(clientes): componente CustomerAvatar con foto o blobatar"
```

---

### Task 3: Contactos — lista, cabecera de ficha e identidad de 88 px

**Files:**
- Modify: `app/[tenant]/(app)/contactos/_components/customer-table.tsx` (`Face` ~47-56; `initialsOf` ~76-79; tarjeta archivada ~471-473)
- Modify: `app/[tenant]/(app)/contactos/[id]/_components/customer-header.tsx` (avatar ~50-56; `initialsOf` ~114-121)
- Modify: `app/[tenant]/(app)/contactos/[id]/_components/ficha/ficha-view.tsx` (`initials` ~58; identidad ~96-101)

**Interfaces:**
- Consumes: `CustomerAvatar` de `@/components/atoms/customer-avatar`.
- Produces: ninguna interfaz nueva.

- [ ] **Step 1: Sustituir la cara de la tabla**

En `customer-table.tsx`, importa `CustomerAvatar` y reemplaza el cuerpo de `Face` por:

```tsx
function Face({ row, className }: { row: CustomerRow; className: string }) {
  return (
    <CustomerAvatar
      identity={{ name: row.name, id: row.id }}
      photoUrl={row.photoId ? `/api/files/${row.photoId}` : null}
      className={className}
    />
  );
}
```

Elimina la función local `initialsOf`. En la tarjeta archivada de móvil, conserva el contenedor y sustituye su contenido:

```tsx
<span className="flex h-10 w-10 shrink-0 overflow-hidden rounded-sm bg-accent-subtle">
  <CustomerAvatar identity={{ name: row.name, id: row.id }} photoUrl={row.photoId ? `/api/files/${row.photoId}` : null} className="size-full" />
</span>
```

- [ ] **Step 2: Sustituir la cabecera de la ficha**

En `customer-header.tsx`, importa `CustomerAvatar`, reemplaza el bloque `photoId ? <img …/> : <span …>{initialsOf(…)}</span>` por una sola llamada y elimina `initialsOf`:

```tsx
<CustomerAvatar
  identity={{ name: customer.name, id: customer.id }}
  photoUrl={photoId ? `/api/files/${photoId}` : null}
  className="size-14 rounded-sm sm:size-16"
/>
```

- [ ] **Step 3: Sustituir la identidad de 88 px**

En `ficha-view.tsx`, importa `CustomerAvatar`, elimina la constante `initials` y deja el contenedor con la cara dentro:

```tsx
<span className="grid size-[88px] shrink-0 place-items-center overflow-hidden rounded-[22px] bg-accent-subtle">
  <CustomerAvatar identity={{ name: customer.name, id: customer.id }} photoUrl={customer.photoUrl} className="size-full" />
</span>
```

- [ ] **Step 4: Verificar tipos y lint**

Run: `pnpm exec tsc --noEmit`
Expected: sin errores.

Run: `pnpm exec eslint "app/[tenant]/(app)/contactos/_components/customer-table.tsx" "app/[tenant]/(app)/contactos/[id]/_components/customer-header.tsx" "app/[tenant]/(app)/contactos/[id]/_components/ficha/ficha-view.tsx"`
Expected: sin errores.

- [ ] **Step 5: Commit**

```bash
git add "app/[tenant]/(app)/contactos/_components/customer-table.tsx" "app/[tenant]/(app)/contactos/[id]/_components/customer-header.tsx" "app/[tenant]/(app)/contactos/[id]/_components/ficha/ficha-view.tsx"
git commit -m "feat(clientes): blobatar en lista y ficha de contactos"
```

---

### Task 4: Carné, vista previa del alta y retiro de `initials`

**Files:**
- Modify: `app/[tenant]/(app)/contactos/[id]/carnet/page.tsx` (~32-35)
- Modify: `app/[tenant]/(app)/contactos/nuevo/_components/new-customer-form.tsx` (import ~15-25; vista previa ~442-448)
- Modify: `lib/business/customers/new-customer.ts` (`initials` ~95-99)
- Modify: `tests/unit/business/new-customer.test.ts` (import y expectativas de `initials`)

**Interfaces:**
- Consumes: `CustomerAvatar`.
- Produces: ninguna interfaz nueva; desaparece `initials(name: string): string`.

- [ ] **Step 1: Carné con cara siempre visible**

En `carnet/page.tsx`, importa `CustomerAvatar` y reemplaza el condicional de la foto por:

```tsx
<CustomerAvatar
  identity={{ name: customer.name, id: customer.id }}
  photoUrl={customer.photoId ? `/api/files/${customer.photoId}` : null}
  className="size-[22mm] rounded-md"
/>
```

- [ ] **Step 2: Vista previa del alta**

En `new-customer-form.tsx`, elimina `initials` del import de `new-customer` e importa `CustomerAvatar`. Dentro del contenedor de 52 px deja:

```tsx
{photo ? (
  // eslint-disable-next-line @next/next/no-img-element
  <img src={photo.url} alt="" className="size-full object-cover" />
) : (
  <CustomerAvatar identity={{ name: previewName, email: v.email, phone: v.phone }} className="size-full" />
)}
```

Conserva el `<span>` contenedor con `size-[52px]`, `overflow-hidden` y `rounded-[14px]`.

- [ ] **Step 3: Retirar `initials` del módulo y su prueba**

Elimina la función `initials` de `lib/business/customers/new-customer.ts`. En `tests/unit/business/new-customer.test.ts`, quita `initials` del import y las tres expectativas asociadas; deja el resto de la prueba intacta.

- [ ] **Step 4: Verificar la prueba existente y los tipos**

Run: `pnpm test tests/unit/business/new-customer.test.ts`
Expected: PASS.

Run: `pnpm exec tsc --noEmit`
Expected: sin errores.

- [ ] **Step 5: Commit**

```bash
git add "app/[tenant]/(app)/contactos/[id]/carnet/page.tsx" "app/[tenant]/(app)/contactos/nuevo/_components/new-customer-form.tsx" lib/business/customers/new-customer.ts tests/unit/business/new-customer.test.ts
git commit -m "feat(clientes): blobatar en carné y vista previa del alta"
```

---

### Task 5: CRM — tarjetas, detalle y selector de cliente

**Files:**
- Modify: `app/[tenant]/(app)/crm/_components/pipeline/board.tsx` (import ~29; cliente ~42)
- Modify: `app/[tenant]/(app)/crm/oportunidades/[id]/_components/opportunity-detail.tsx` (import ~34; cliente ~362)
- Modify: `app/[tenant]/(app)/crm/_components/pipeline/quick-create.tsx` (import ~11; opción existente ~195-199)

**Interfaces:**
- Consumes: `CustomerAvatar`; los datos ya disponibles son `{ id, name }` en tarjetas y `{ id, name, email, phone }` en el detalle.
- Produces: ninguna interfaz nueva. `Initials` sigue existiendo para responsables.

- [ ] **Step 1: Tarjeta del tablero**

En `board.tsx`, importa `CustomerAvatar` y cambia solo el avatar del cliente; **no toques** el `<Initials>` del responsable:

```tsx
<CustomerAvatar identity={card.customer} className="size-5 rounded-md" />
```

- [ ] **Step 2: Detalle de la oportunidad**

En `opportunity-detail.tsx`, importa `CustomerAvatar` y cambia el avatar del cliente de 28 px; el del responsable conserva `Initials`:

```tsx
<CustomerAvatar identity={o.customer} className="size-7 rounded-lg" />
```

- [ ] **Step 3: Selector de la creación rápida**

En `quick-create.tsx`, importa `CustomerAvatar`, elimina `initialsOf` del import de `pipeline` y reemplaza el contenido del contenedor de 26 px:

```tsx
<span aria-hidden="true" className={cn("grid size-[26px] shrink-0 place-items-center overflow-hidden rounded-md", i === 0 ? "bg-accent-subtle" : "bg-surface-muted")}>
  <CustomerAvatar identity={opt.customer} className="size-full" />
</span>
```

- [ ] **Step 4: Verificar tipos y lint**

Run: `pnpm exec tsc --noEmit`
Expected: sin errores.

Run: `pnpm exec eslint "app/[tenant]/(app)/crm/_components/pipeline/board.tsx" "app/[tenant]/(app)/crm/oportunidades/[id]/_components/opportunity-detail.tsx" "app/[tenant]/(app)/crm/_components/pipeline/quick-create.tsx"`
Expected: sin errores.

- [ ] **Step 5: Commit**

```bash
git add "app/[tenant]/(app)/crm/_components/pipeline/board.tsx" "app/[tenant]/(app)/crm/oportunidades/[id]/_components/opportunity-detail.tsx" "app/[tenant]/(app)/crm/_components/pipeline/quick-create.tsx"
git commit -m "feat(crm): blobatar en tarjetas, detalle y selector de cliente"
```

---

### Task 6: WhatsApp y check-in

**Files:**
- Modify: `components/organisms/whatsapp-composer.tsx` (`initials` local ~24; lista ~118; cabecera ~138)
- Modify: `app/[tenant]/(app)/checkin/_components/checkin-station.tsx` (`Photo` ~17-21; usos ~122, ~152, ~183)

**Interfaces:**
- Consumes: `CustomerAvatar`; `WhatsAppContact = { id, name, phone }`; `MemberCard` y `AttendanceRow` ya tienen `id`/`customerId`, `name` y `photoId`.
- Produces: `Photo({ id, name, photoId, className })` interna del check-in; no se exporta.

- [ ] **Step 1: Conversaciones de WhatsApp**

En `whatsapp-composer.tsx`, importa `CustomerAvatar`, elimina la constante local `initials` y sustituye ambos avatares de 34 px:

```tsx
<CustomerAvatar identity={c} className="size-[34px] rounded-md" />
```

```tsx
<CustomerAvatar identity={current} className="size-[34px] rounded-md" />
```

- [ ] **Step 2: Check-in con nombre e identidad**

En `checkin-station.tsx`, elimina `UserRound` del import de `lucide-react`, importa `CustomerAvatar` y reemplaza `Photo` por:

```tsx
function Photo({ id, name, photoId, className }: { id: string; name: string; photoId: string | null; className?: string }) {
  return (
    <CustomerAvatar
      identity={{ name, id }}
      photoUrl={photoId ? `/api/files/${photoId}` : null}
      className={cn(className, "object-cover")}
    />
  );
}
```

Actualiza los tres usos:

```tsx
<Photo id={result.member.id} name={result.member.name} photoId={result.member.photoId} className="size-28 rounded-xl" />
<Photo id={m.id} name={m.name} photoId={m.photoId} className="size-9 rounded-full" />
<Photo id={e.customerId} name={e.name} photoId={e.photoId} className="size-9 rounded-full" />
```

- [ ] **Step 3: Verificar tipos y lint**

Run: `pnpm exec tsc --noEmit`
Expected: sin errores.

Run: `pnpm exec eslint components/organisms/whatsapp-composer.tsx "app/[tenant]/(app)/checkin/_components/checkin-station.tsx"`
Expected: sin errores.

- [ ] **Step 4: Commit**

```bash
git add components/organisms/whatsapp-composer.tsx "app/[tenant]/(app)/checkin/_components/checkin-station.tsx"
git commit -m "feat(clientes): blobatar en WhatsApp y check-in"
```

---

### Task 7: Verificación final y documentación

**Files:**
- Verify: todos los anteriores
- Add: `docs/superpowers/specs/2026-11-08-blobatar-clientes-design.md`, `docs/superpowers/plans/2026-11-08-blobatar-clientes.md`

**Interfaces:**
- Consumes: todo lo anterior.
- Produces: rama verificada y documentación versionada.

- [ ] **Step 1: Confirmar que no quedan iniciales de cliente**

Run: `rg -n "initialsOf|initials\(" "app/[tenant]/(app)/contactos" "app/[tenant]/(app)/crm/_components/pipeline/quick-create.tsx" components/organisms/whatsapp-composer.tsx "app/[tenant]/(app)/checkin"`
Expected: sin coincidencias. (`Initials` y `initialsOf` de `pipeline-ui.tsx` pueden seguir existiendo para responsables.)

- [ ] **Step 2: Ejecutar toda la suite**

Run: `pnpm test`
Expected: PASS.

- [ ] **Step 3: Tipos, lint y Storybook**

Run: `pnpm exec tsc --noEmit`
Expected: sin errores.

Run: `pnpm lint`
Expected: sin errores.

Run: `pnpm build-storybook`
Expected: compila sin errores; las historias de Contactos, ficha y CRM siguen funcionando.

- [ ] **Step 4: Revisión visual mínima**

En Storybook, revisa `Átomos/CustomerAvatar` y las historias de Contactos, ficha y CRM:
- Sin foto: se ve una cara, no letras ni un hueco.
- Con foto: se ve la foto.
- Tamaños de 20, 22, 26, 34, 52, 56, 88 px y 22 mm conservan su radio y encuadre.
- Misma persona = misma cara entre lista, ficha y CRM.

- [ ] **Step 5: Commit de la documentación**

```bash
git add docs/superpowers/specs/2026-11-08-blobatar-clientes-design.md docs/superpowers/plans/2026-11-08-blobatar-clientes.md
git commit -m "docs(clientes): diseño y plan de blobatars"
```
