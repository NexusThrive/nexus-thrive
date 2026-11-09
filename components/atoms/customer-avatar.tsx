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
