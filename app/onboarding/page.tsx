import { redirect } from "next/navigation";

/** Retired wizard links resolve through the authorized login destination. */
export default function RetiredOnboardingPage() {
  redirect("/auth/callback");
}
