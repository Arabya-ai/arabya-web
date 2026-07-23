import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { readFile } from "fs/promises";
import path from "path";
import { auth } from "@/auth";
import { DashboardShell } from "@/components/dashboard/DashboardShell";
import { canAccessStudio } from "@/lib/roles";

export const metadata: Metadata = {
  title: "طابور الجودة",
};

export const dynamic = "force-dynamic";

type QueueItem = {
  id: string;
  title: string;
  priority: string;
  surahHint: string;
  note: string;
};

async function loadQueue(): Promise<QueueItem[]> {
  try {
    const file = path.join(process.cwd(), "data", "studio", "quality-queue.json");
    const raw = await readFile(file, "utf8");
    const data = JSON.parse(raw) as QueueItem[];
    return Array.isArray(data) ? data : [];
  } catch {
    return [];
  }
}

export default async function StudioQueuePage() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  if (!canAccessStudio(session.user.role)) redirect("/account");
  const items = await loadQueue();

  return (
    <DashboardShell
      area="studio"
      role={session.user.role}
      kicker="استوديو عربية"
      title="طابور الجودة"
      userName={session.user.name}
      userImage={session.user.image}
    >
      <div className="dash-stack">
        {items.map((item) => (
          <article key={item.id} className="dash-card">
            <p className="dash-kicker">أولوية: {item.priority}</p>
            <h2>{item.title}</h2>
            <p className="dash-muted">{item.surahHint}</p>
            <p>{item.note}</p>
          </article>
        ))}
        {items.length === 0 ? (
          <p className="dash-muted">الطابور فارغ حاليًا.</p>
        ) : null}
      </div>
    </DashboardShell>
  );
}
