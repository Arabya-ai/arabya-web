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
      className="ayat-studio-shell relative flex h-full min-h-0 w-full flex-1 overflow-hidden"
    >
      <AppSidebar />
      <SidebarInset className="relative z-0 flex min-h-0 min-w-0 max-w-full flex-col overflow-hidden bg-transparent">
        <header className="relative z-10 flex h-10 shrink-0 items-center gap-3 border-b border-border/60 bg-card/70 px-3 backdrop-blur-xl sm:h-11 sm:px-4">
          <SidebarTrigger className="shrink-0 text-accent hover:bg-accent/10" />
          <span className="truncate text-xs tracking-widest text-muted-foreground">
            الاستوديو
          </span>
        </header>
        <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
          <div className="relative mx-auto flex h-full min-h-0 w-full max-w-[1800px] flex-1 animate-fade-in p-2 sm:p-3 lg:p-3">
            {children}
          </div>
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
