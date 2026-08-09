"use client";

import dynamic from "next/dynamic";

const ServiceWorkerRegister = dynamic(
  () =>
    import("@/components/ServiceWorkerRegister").then(
      (m) => m.ServiceWorkerRegister,
    ),
  { ssr: false },
);

const InstallAppPrompt = dynamic(
  () =>
    import("@/components/InstallAppPrompt").then((m) => m.InstallAppPrompt),
  { ssr: false },
);

const CloudAutoSync = dynamic(
  () => import("@/components/CloudAutoSync").then((m) => m.CloudAutoSync),
  { ssr: false },
);

/** Non-critical chrome: load after hydration so LCP/FCP stay free. */
export function DeferredChrome() {
  return (
    <>
      <ServiceWorkerRegister />
      <InstallAppPrompt />
      <CloudAutoSync />
    </>
  );
}
