/**
 * Skeleton de carga del onboarding (aparece durante la navegación a /onboarding
 * mientras el servidor resuelve sesión y prefill).
 */
export default function OnboardingLoading() {
  return (
    <div className="grid min-h-screen place-items-center bg-slate-50 font-sans">
      <div className="flex flex-col items-center gap-3">
        <div className="size-8 animate-pulse rounded-full bg-amber-500/30" />
        <div className="h-4 w-48 animate-pulse rounded bg-slate-200" />
        <div className="h-4 w-64 animate-pulse rounded bg-slate-100" />
      </div>
    </div>
  );
}