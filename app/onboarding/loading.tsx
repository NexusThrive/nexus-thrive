import { EyeTracker } from "@/components/atoms/eye-tracker";
import { Skeleton } from "@/components/atoms/skeleton";
import auth from "@/components/templates/auth-layout.module.css";
import styles from "@/components/templates/onboarding-split.module.css";

/**
 * Carga del onboarding (aparece mientras el servidor resuelve la sesión y lo que ya se escribió): la misma forma de la pantalla —el cuadro de
 * AURI y el del formulario— con sus bloques en esqueleto, sin ningún texto de «Cargando…».
 */
export default function OnboardingLoading() {
  return (
    <div role="status" aria-label="Preparando tu negocio" className={`${auth.page} relative isolate flex min-h-dvh flex-col items-center justify-center overflow-hidden px-2 py-2 sm:px-6 sm:py-4 lg:h-dvh`}>
      <span className={auth.backdrop} aria-hidden="true">
        <i className={auth.blobA} />
        <i className={auth.blobB} />
        <i className={auth.blobC} />
      </span>
      <div className={`${auth.shell} lg:flex-[0_1_880px]`}>
        <div aria-hidden="true" className="grid h-full min-h-[calc(100dvh-16px)] gap-4 lg:min-h-0 lg:grid-cols-[minmax(0,0.92fr)_minmax(0,1.08fr)]">
          <div className={`${styles.stage} hidden items-center gap-5 lg:flex`}>
            <span className={styles.fx}>
              <i className={styles.blobA} />
              <i className={styles.blobB} />
              <i className={styles.dots} />
            </span>
            <EyeTracker fit decorative front poke={false} size={96} shape="Ball" eyeScale={1.2} />
            <Skeleton className="h-[72px] w-full max-w-[420px] rounded-3xl" />
            <Skeleton className="mt-auto h-[260px] w-full max-w-[420px] rounded-[28px]" />
          </div>
          <div className={`${styles.form} gap-6 p-5 sm:p-8`}>
            <div className="grid gap-2">
              <Skeleton className="h-3 w-40 rounded-full" />
              <div className="flex gap-1.5">
                {[0, 1, 2, 3, 4].map((i) => (
                  <Skeleton key={i} className="h-1.5 flex-1 rounded-full" />
                ))}
              </div>
            </div>
            <div className="grid gap-2">
              <Skeleton className="h-8 w-3/4 rounded-full" />
              <Skeleton className="h-4 w-full max-w-[420px] rounded-full" />
            </div>
            <div className="grid flex-1 content-start gap-3">
              <Skeleton className="h-24 w-full rounded-3xl" />
              <Skeleton className="h-24 w-full rounded-3xl" />
            </div>
            <Skeleton className="ml-auto h-12 w-44 rounded-full" />
          </div>
        </div>
      </div>
    </div>
  );
}
