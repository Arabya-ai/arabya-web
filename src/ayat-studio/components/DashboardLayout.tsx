"use client";

import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@/ayat-studio/components/ui/sidebar";
import { AppSidebar } from "@/ayat-studio/components/AppSidebar";
import { Link } from "@/i18n/navigation";
import { IslamicBackdrop } from "@/ayat-studio/components/IslamicDecor";
import { Home } from "lucide-react";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <SidebarProvider
      defaultOpen
      className="ayat-studio-shell relative min-h-dvh w-full overflow-x-hidden"
    >
      <IslamicBackdrop />
      <AppSidebar />
      <SidebarInset className="relative z-0 min-w-0 max-w-full overflow-x-hidden bg-transparent">
        <header className="sticky top-0 z-30 flex h-14 shrink-0 items-center justify-between gap-3 border-b border-accent/10 bg-background/80 px-3 backdrop-blur-xl sm:px-4">
          <div className="flex min-w-0 items-center gap-2">
            <SidebarTrigger className="shrink-0 text-accent hover:bg-accent/10" />
            <span className="truncate text-xs tracking-widest text-accent/60">
              الاستوديو
            </span>
          </div>
          <Link
            href="/"
            className="flex shrink-0 items-center gap-2 text-xs text-muted-foreground transition-colors hover:text-accent"
          >
            <Home className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">عربية</span>
          </Link>
        </header>
        <div className="flex min-h-0 flex-1 flex-col overflow-x-hidden overflow-y-auto">
          <div className="relative mx-auto w-full max-w-[1600px] flex-1 animate-fade-in p-3 sm:p-4 md:p-5 lg:p-6">
            {children}
          </div>
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
