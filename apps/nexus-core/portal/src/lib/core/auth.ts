import type { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/core/prisma";

/**
 * Auth del portal Nexus — Credentials (email + password) con sesión JWT.
 *
 * DECISIÓN (vault: arquitectura de acceso y producto):
 *  - La identidad es GLOBAL: Member (email único) es la persona.
 *  - Un email puede ser miembro de VARIAS orgs → "Mis negocios".
 *  - El `scope` del member (USER | CEO) abre la consola global en el futuro.
 *  - Sin OAuth por ahora: un solo origen de identidad para el demo/prospectos.
 */
export const authOptions: NextAuthOptions = {
  session: { strategy: "jwt" },
  pages: { signIn: "/login" },
  providers: [
    CredentialsProvider({
      name: "Email y contraseña",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Contraseña", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null;

        // login por identidad: una persona puede pertenecer a varias orgs —
        // solo las membresías CON contraseña son credenciales válidas.
        const member = await prisma.member.findFirst({
          where: { email: credentials.email.toLowerCase().trim(), passwordHash: { not: null } },
          orderBy: { createdAt: "desc" },
        });

        if (!member || !member.passwordHash || !member.activo) return null;

        const ok = await bcrypt.compare(credentials.password, member.passwordHash);
        if (!ok) return null;

        return {
          id: member.id,
          name: member.nombre,
          email: member.email,
          scope: member.scope,
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.scope = (user as { scope?: "USER" | "CEO" }).scope ?? "USER";
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user && token.sub) {
        session.user.id = token.sub;
        (session.user as { scope?: string }).scope = (token.scope as string) ?? "USER";
      }
      return session;
    },
  },
};