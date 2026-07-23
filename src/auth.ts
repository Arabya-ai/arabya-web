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

function env(name: string): string | undefined {
  let value = process.env[name]?.trim();
  if (!value) return undefined;
  // Vercel/UI paste sometimes wraps values in quotes
  if (
    (value.startsWith('"') && value.endsWith('"')) ||
    (value.startsWith("'") && value.endsWith("'"))
  ) {
    value = value.slice(1, -1).trim();
  }
  return value || undefined;
}

/** True when Google OAuth env vars are present at runtime. */
export function isGoogleAuthConfigured(): boolean {
  return Boolean(env("AUTH_GOOGLE_ID") && env("AUTH_GOOGLE_SECRET"));
}

/** Safe diagnostics for the owner (no secrets). */
export function getAuthEnvDiagnostics() {
  const googleId = env("AUTH_GOOGLE_ID") ?? "";
  return {
    hasSecret: Boolean(env("AUTH_SECRET")),
    hasGoogleId: Boolean(googleId),
    hasGoogleSecret: Boolean(env("AUTH_GOOGLE_SECRET")),
    authUrl: env("AUTH_URL") ?? "(غير مضبوط — مقبول)",
    googleIdTail: googleId ? googleId.slice(-28) : "(فارغ)",
  };
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  secret: env("AUTH_SECRET"),
  providers: [
    Google({
      clientId: env("AUTH_GOOGLE_ID"),
      clientSecret: env("AUTH_GOOGLE_SECRET"),
    }),
  ],
  trustHost: true,
  pages: {
    signIn: "/login",
    error: "/login",
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
