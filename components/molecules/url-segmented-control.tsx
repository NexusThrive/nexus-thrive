"use client";

import { useOptimistic, useTransition } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { SegmentedControl, type SegmentedOption } from "@/components/molecules/segmented-control";
import { cn } from "@/lib/utils";

/**
 * SegmentedControl cuyo valor vive en la URL (`?param=valor`): el servidor
 * vuelve a calcular con el nuevo periodo o filtro. La pastilla se mueve al
 * instante y el contenido se atenúa mientras llega la respuesta.
 */
export function UrlSegmentedControl<T extends string>({
  param,
  value,
  options,
  ariaLabel,
  defaultValue,
  className,
}: {
  param: string;
  value: T;
  options: readonly SegmentedOption<T>[];
  ariaLabel: string;
  /** Valor que no se escribe en la URL (la deja limpia). */
  defaultValue?: T;
  className?: string;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [pending, startTransition] = useTransition();
  const [shown, setShown] = useOptimistic(value);

  return (
    <SegmentedControl
      ariaLabel={ariaLabel}
      value={shown}
      options={options}
      className={cn(pending && "opacity-70", className)}
      onChange={(next) => {
        const params = new URLSearchParams(searchParams);
        if (next === defaultValue) params.delete(param);
        else params.set(param, next);
        startTransition(() => {
          setShown(next);
          router.replace(params.size ? `${pathname}?${params}` : pathname, { scroll: false });
        });
      }}
    />
  );
}
