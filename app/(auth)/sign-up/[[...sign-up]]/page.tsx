import type { Metadata } from "next";
import { SignUp } from "@clerk/nextjs";
import { clerkAppearance } from "@/lib/auth/clerk-appearance";

export const metadata: Metadata = { title: "Crear cuenta · NEXUS THRIVE" };

export default function SignUpPage() {
  return (
    <SignUp
      path="/sign-up"
      routing="path"
      signInUrl="/sign-in"
      // Tras registrarse, la decisión de destino se toma en UNA sola puerta
      // (/auth/callback): equipo de NEXUS → panel; invitación de negocio → su
      // negocio; nuevo → onboarding. Antes se iba a "/" y el proxy lo
      // devolvía al formulario de acceso (donde era fácil crear una segunda
      // cuenta y terminar en el onboarding por error).
      fallbackRedirectUrl="/auth/callback"
      appearance={clerkAppearance}
    />
  );
}
