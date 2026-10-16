import { AuthLayout } from "@/components/templates/auth-layout";

/** Layout compartido de /sign-in y /sign-up (URLs sin cambios). */
export default function AuthGroupLayout({ children }: { children: React.ReactNode }) {
  return <AuthLayout>{children}</AuthLayout>;
}
