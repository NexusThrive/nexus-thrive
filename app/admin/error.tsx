"use client";

import Link from "next/link";
import { useEffect } from "react";
import { buttonVariants } from "@/components/atoms/button-variants";
import { ErrorState } from "@/components/molecules/error-state";

/** Error de una pantalla del Operations Center (DR-09). Hereda el layout de `/admin`. */
export default function AdminError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);
  return (
    <ErrorState
      onRetry={reset}
      reference={error.digest}
      action={
        <Link href="/admin" className={buttonVariants({ variant: "outline" })}>
          Ir al panel
        </Link>
      }
    />
  );
}
