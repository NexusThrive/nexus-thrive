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
      fallbackRedirectUrl="/"
      appearance={clerkAppearance}
    />
  );
}
