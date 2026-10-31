import type { Metadata } from "next";
import { SignIn } from "@clerk/nextjs";
import { clerkAppearance } from "@/lib/core/auth/clerk-appearance";

export const metadata: Metadata = { title: "Iniciar sesión · NEXUS THRIVE" };

export default function SignInPage() {
  return (
    <SignIn
      path="/sign-in"
      routing="path"
      signUpUrl="/sign-up"
      fallbackRedirectUrl="/auth/callback"
      appearance={clerkAppearance}
    />
  );
}
