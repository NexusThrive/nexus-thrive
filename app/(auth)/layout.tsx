import { AuthLayout } from "@/components/templates/auth-layout";
import { AuthMountFallback } from "@/components/molecules/auth-mount-fallback";

/** Layout compartido de /sign-in y /sign-up (URLs sin cambios). */
export default function AuthGroupLayout({ children }: { children: React.ReactNode }) {
  return (
    <AuthLayout>
      <AuthMountFallback>{children}</AuthMountFallback>
    </AuthLayout>
  );
}
