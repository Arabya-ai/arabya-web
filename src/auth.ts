import NextAuth from "next-auth";
import Google from "next-auth/providers/google";
import { fetchCloudRoleStatus } from "@/lib/cloud-sync";
import {
  mergeRoleWithEnvAdmin,
  resolveRoleFromEmail,
  type UserRole,
} from "@/lib/roles";

declare module "next-auth" {
  interface Session {
    user: {
      name?: string | null;
      email?: string | null;
      image?: string | null;
      role: UserRole;
    };
    error?: "Banned";
  }

  interface User {
    role?: UserRole;
  }
}

declare module "@auth/core/jwt" {
  interface JWT {
    role?: UserRole;
    roleFetchedAt?: number;
    banned?: boolean;
  }
}

function env(name: string): string | undefined {
  let value = process.env[name]?.trim();
  if (!value) return undefined;
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

const ROLE_REFRESH_MS = 5 * 60 * 1000;

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
    async signIn({ user }) {
      const email = user.email?.trim().toLowerCase();
      if (!email) return false;
      const status = await fetchCloudRoleStatus(email);
      if (status.banned) return "/login?error=banned";
      return true;
    },
    authorized({ auth: session, request }) {
      const path = request.nextUrl.pathname;
      if (session?.error === "Banned") return false;
      if (
        path.startsWith("/account") ||
        path.startsWith("/studio") ||
        path.startsWith("/admin")
      ) {
        return !!session?.user;
      }
      return true;
    },
    async jwt({ token, trigger }) {
      if (!token.email) {
        token.role = "user";
        token.banned = false;
        return token;
      }

      const email = String(token.email);
      const now = Date.now();
      const shouldRefresh =
        trigger === "signIn" ||
        trigger === "update" ||
        !token.roleFetchedAt ||
        now - Number(token.roleFetchedAt) > ROLE_REFRESH_MS;

      if (shouldRefresh) {
        const status = await fetchCloudRoleStatus(email);
        token.banned = status.banned;
        if (status.banned) {
          token.role = "user";
        } else {
          token.role = mergeRoleWithEnvAdmin(email, status.role);
        }
        token.roleFetchedAt = now;
      } else if (!token.role) {
        token.role = resolveRoleFromEmail(email);
      } else {
        token.role = mergeRoleWithEnvAdmin(email, token.role as UserRole);
      }

      return token;
    },
    session({ session, token }) {
      if (token.banned) {
        session.error = "Banned";
      }
      if (session.user) {
        session.user.role = (token.role as UserRole) || "user";
      }
      return session;
    },
  },
});
