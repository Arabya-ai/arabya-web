import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import Google from "next-auth/providers/google";
import { fetchCloudRoleStatus } from "@/lib/cloud-sync";
import {
  E2E_AUTH_PROVIDER_ID,
  E2E_DEFAULT_EMAIL,
  isE2eAuthEnabled,
} from "@/lib/e2e-auth";
import {
  mergeRoleWithEnvAdmin,
  resolveRoleFromEmail,
  type UserRole,
} from "@/lib/roles";
import { resolveUserPlan, type UserPlan } from "@/lib/plans";

declare module "next-auth" {
  interface Session {
    user: {
      name?: string | null;
      email?: string | null;
      image?: string | null;
      role: UserRole;
      plan: UserPlan;
    };
    error?: "Banned";
  }

  interface User {
    role?: UserRole;
    plan?: UserPlan;
  }
}

declare module "@auth/core/jwt" {
  interface JWT {
    role?: UserRole;
    plan?: UserPlan;
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

const googleReady = isGoogleAuthConfigured();
const e2eReady = isE2eAuthEnabled();

export const { handlers, auth, signIn, signOut } = NextAuth({
  // Auth.js requires a secret; missing one makes every /api/auth/* return 500
  // and the browser shows ClientFetchError. Prefer AUTH_SECRET from env.
  secret:
    env("AUTH_SECRET") ||
    (process.env.NODE_ENV !== "production"
      ? "arabya-local-dev-only-not-for-production"
      : undefined),
  providers: [
    ...(googleReady
      ? [
          Google({
            clientId: env("AUTH_GOOGLE_ID")!,
            clientSecret: env("AUTH_GOOGLE_SECRET")!,
          }),
        ]
      : []),
    ...(e2eReady
      ? [
          Credentials({
            id: E2E_AUTH_PROVIDER_ID,
            name: "E2E",
            credentials: {
              email: { label: "Email", type: "email" },
            },
            async authorize(credentials) {
              if (!isE2eAuthEnabled()) return null;
              const email = String(credentials?.email || "")
                .trim()
                .toLowerCase();
              if (!email || !email.includes("@")) return null;
              return {
                id: email,
                email,
                name: email === E2E_DEFAULT_EMAIL ? "E2E Tester" : email,
              };
            },
          }),
        ]
      : []),
  ],
  // Credentials JWT sessions (E2E) — Google still uses JWT strategy by default.
  session: { strategy: "jwt" },
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
      const bare =
        path === "/en" || path.startsWith("/en/")
          ? path.slice(3) || "/"
          : path;
      if (session?.error === "Banned") return false;
      if (
        bare.startsWith("/account") ||
        bare.startsWith("/studio") ||
        bare.startsWith("/admin") ||
        bare.startsWith("/create")
      ) {
        return !!session?.user;
      }
      return true;
    },
    async jwt({ token, trigger }) {
      if (!token.email) {
        token.role = "member";
        token.plan = "free";
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
        if (status.unreachable) {
          // Keep prior banned/role when Worker is down — never clear a ban on error.
          if (!token.role) {
            token.role = resolveRoleFromEmail(email);
          } else {
            token.role = mergeRoleWithEnvAdmin(email, token.role as UserRole);
          }
        } else {
          token.banned = status.banned;
          if (status.banned) {
            token.role = "member";
          } else {
            token.role = mergeRoleWithEnvAdmin(email, status.role);
          }
          token.roleFetchedAt = now;
        }
      } else if (!token.role) {
        token.role = resolveRoleFromEmail(email);
      } else {
        token.role = mergeRoleWithEnvAdmin(email, token.role as UserRole);
      }

      token.plan = resolveUserPlan({
        email,
        role: token.role as UserRole,
      });

      return token;
    },
    session({ session, token }) {
      if (token.banned) {
        session.error = "Banned";
      }
      if (session.user) {
        session.user.role = (token.role as UserRole) || "member";
        session.user.plan = (token.plan as UserPlan) || "free";
      }
      return session;
    },
  },
});
