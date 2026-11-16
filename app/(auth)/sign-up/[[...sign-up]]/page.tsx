import type { Metadata } from "next";
import { SignUp } from "@clerk/nextjs";
import { clerkAppearance } from "@/lib/core/auth/clerk-appearance";
import { redirect } from "next/navigation";

export const metadata: Metadata = { title: "Crear cuenta · NEXUS THRIVE" };

export default async function SignUpPage({ searchParams }: { searchParams: Promise<{ __clerk_ticket?: string }> }) {
  const { __clerk_ticket: ticket } = await searchParams;
  // Clerk validates the ticket; Invite-only must also be enabled in its dashboard.
  if (!ticket) redirect("/sign-in");
  return (
    <SignUp
      path="/sign-up"
      routing="path"
      signInUrl="/sign-in"
      forceRedirectUrl="/auth/callback"
      fallbackRedirectUrl="/auth/callback"
      appearance={clerkAppearance}
    />
  );
}
