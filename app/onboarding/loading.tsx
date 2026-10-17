import { NLoader } from "@/components/atoms/n-loader";

/**
 * Carga del onboarding (aparece durante la navegación a /onboarding
 * mientras el servidor resuelve sesión y prefill).
 */
export default function OnboardingLoading() {
  return (
    <div className="grid min-h-screen place-items-center bg-background font-sans">
      <div className="flex flex-col items-center gap-3">
        <NLoader size={32} className="text-foreground" />
        <p className="text-sm text-muted-foreground">Preparando tu negocio…</p>
      </div>
    </div>
  );
}