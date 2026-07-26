"use client";

import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@/ayat-studio/components/ui/sidebar";
import { AppSidebar } from "@/ayat-studio/components/AppSidebar";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <SidebarProvider
      defaultOpen
      className="ayat-studio-shell relative min-h-0 w-full overflow-x-hidden xl:min-h-[calc(100dvh-12rem)]"
    >
      <AppSidebar />
      <SidebarInset className="relative z-0 min-h-0 min-w-0 max-w-full overflow-x-hidden bg-transparent">
        {/* Static under site header — avoid sticky overlap with Arabya chrome */}
        <header className="relative z-10 flex h-12 shrink-0 items-center gap-3 border-b border-border/60 bg-card/70 px-3 backdrop-blur-xl sm:h-14 sm:px-4">
          <SidebarTrigger className="shrink-0 text-accent hover:bg-accent/10" />
          <span className="truncate text-xs tracking-widest text-muted-foreground">
            الاستوديو
          </span>
        </header>
        <div className="flex min-h-0 flex-1 flex-col overflow-x-hidden overflow-y-auto">
          <div className="relative mx-auto w-full max-w-[1600px] flex-1 animate-fade-in p-2.5 sm:p-4 md:p-5 lg:p-6">
            {children}
          </div>
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
