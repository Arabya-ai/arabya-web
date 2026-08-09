"use client";

import { SessionProvider } from "next-auth/react";
import type { ReactNode } from "react";

/** Light session client: no polling / focus refetch on every tab focus. */
export function AuthSessionProvider({ children }: { children: ReactNode }) {
  return (
    <SessionProvider refetchOnWindowFocus={false} refetchInterval={0}>
      {children}
    </SessionProvider>
  );
}
