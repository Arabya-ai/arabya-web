"use client";

import { useEffect, useRef } from "react";
import { useSession } from "next-auth/react";
import {
  CLOUD_SYNC_EVENT,
  pullMergeAndPush,
  pushLocalOnly,
} from "@/lib/cloud-sync-client";

const SESSION_FLAG = "arabya-autosync-done";

/**
 * Silent background sync for signed-in users:
 * - once per browser tab session: pull → merge → push
 * - after local data changes: debounced push
 * - when returning to the tab: light push if dirty
 */
export function CloudAutoSync() {
  const { status } = useSession();
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const syncing = useRef(false);
  const dirty = useRef(false);

  useEffect(() => {
    if (status === "unauthenticated") {
      try {
        sessionStorage.removeItem(SESSION_FLAG);
      } catch {
        /* ignore */
      }
      return;
    }
    if (status !== "authenticated") return;

    let cancelled = false;

    async function run(kind: "full" | "push") {
      if (cancelled || syncing.current) {
        if (kind === "push") dirty.current = true;
        return;
      }
      syncing.current = true;
      try {
        if (kind === "full") {
          const result = await pullMergeAndPush();
          if (result.ok) sessionStorage.setItem(SESSION_FLAG, "1");
        } else {
          await pushLocalOnly();
        }
        dirty.current = false;
      } catch {
        /* keep local data; retry on next change */
      } finally {
        syncing.current = false;
        if (dirty.current) {
          dirty.current = false;
          schedulePush();
        }
      }
    }

    function schedulePush() {
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(() => {
        void run("push");
      }, 2000);
    }

    function onNeedSync() {
      schedulePush();
    }

    function onVisibility() {
      if (document.visibilityState === "visible" && dirty.current) {
        schedulePush();
      }
    }

    if (!sessionStorage.getItem(SESSION_FLAG)) {
      void run("full");
    }

    window.addEventListener(CLOUD_SYNC_EVENT, onNeedSync);
    document.addEventListener("visibilitychange", onVisibility);

    return () => {
      cancelled = true;
      if (timer.current) clearTimeout(timer.current);
      window.removeEventListener(CLOUD_SYNC_EVENT, onNeedSync);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [status]);

  return null;
}
