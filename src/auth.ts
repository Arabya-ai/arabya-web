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

const googleConfigured = Boolean(
  process.env.AUTH_GOOGLE_ID && process.env.AUTH_GOOGLE_SECRET,
);

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: googleConfigured
    ? [
        Google({
          clientId: process.env.AUTH_GOOGLE_ID!,
          clientSecret: process.env.AUTH_GOOGLE_SECRET!,
        }),
      ]
    : [],
  trustHost: true,
  pages: {
    signIn: "/login",
  },
  callbacks: {
    authorized({ auth: session, request }) {
      const path = request.nextUrl.pathname;
      if (path.startsWith("/account") || path.startsWith("/studio") || path.startsWith("/admin")) {
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

export function isGoogleAuthConfigured(): boolean {
  return googleConfigured;
}
