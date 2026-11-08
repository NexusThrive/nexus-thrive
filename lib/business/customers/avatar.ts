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
