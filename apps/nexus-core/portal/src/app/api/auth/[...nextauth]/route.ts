import NextAuth from "next-auth";
import { authOptions } from "@/lib/core/auth";

const handler = NextAuth(authOptions);

export { handler as GET, handler as POST };