"use client";

import dynamic from "next/dynamic";

const StudyAssistant = dynamic(
  () => import("@/components/StudyAssistant").then((m) => m.StudyAssistant),
  { ssr: false },
);
const ReadingHabitCard = dynamic(
  () =>
    import("@/components/ReadingHabitCard").then((m) => m.ReadingHabitCard),
  { ssr: false },
);
const PrayerTimesCard = dynamic(
  () => import("@/components/PrayerTimesCard").then((m) => m.PrayerTimesCard),
  { ssr: false },
);
const AsmaAlHusnaCard = dynamic(
  () => import("@/components/AsmaAlHusnaCard").then((m) => m.AsmaAlHusnaCard),
  { ssr: false },
);
const HomeServicesSection = dynamic(
  () =>
    import("@/components/HomeServicesSection").then((m) => m.HomeServicesSection),
  { ssr: false },
);

/** Below-fold home widgets — keep LCP free of their JS/network. */
export function HomeDeferredWidgets() {
  return (
    <>
      <StudyAssistant />
      <ReadingHabitCard />
      <PrayerTimesCard />
      <AsmaAlHusnaCard />
      <HomeServicesSection />
    </>
  );
}
