import NextAuth from "next-auth";
import Google from "next-auth/providers/google";
import { resolveRoleFromEmail, type UserRole } from "@/lib/roles";

declare module "next-auth" {
  interface Session {
    user: {
      name?: string | null;
      email?: string | null;
      image?: string | null;
      role: UserRole;
    };
  }

  interface User {
    role?: UserRole;
  }
}

declare module "@auth/core/jwt" {
  interface JWT {
    role?: UserRole;
  }
}

/**
 * Read at call-time (not module init) so Vercel runtime env is respected
 * after variables are added and the deployment is rebuilt.
 */
export function isGoogleAuthConfigured(): boolean {
  const id = process.env["AUTH_GOOGLE_ID"];
  const secret = process.env["AUTH_GOOGLE_SECRET"];
  return Boolean(id && secret);
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  // Always register Google; Auth.js uses AUTH_GOOGLE_ID / AUTH_GOOGLE_SECRET.
  providers: [Google],
  trustHost: true,
  pages: {
    signIn: "/login",
  },
  callbacks: {
    authorized({ auth: session, request }) {
      const path = request.nextUrl.pathname;
      if (
        path.startsWith("/account") ||
        path.startsWith("/studio") ||
        path.startsWith("/admin")
      ) {
        return !!session?.user;
      }
      return true;
    },
    jwt({ token }) {
      if (token.email) {
        token.role = resolveRoleFromEmail(String(token.email));
      }
      return token;
    },
    session({ session, token }) {
      if (session.user) {
        session.user.role = (token.role as UserRole) || "user";
      }
      return session;
    },
  },
});
