import { cn } from "@/lib/utils";

/**
 * Skeleton de marca: el brillo cruza con el ángulo de la N (skew -24°),
 * en vez del pulso genérico de Tailwind.
 */
function Skeleton({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="skeleton"
      className={cn("nx-sk", className)}
      {...props}
    />
  );
}

export { Skeleton };
